import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getORSRoute } from '../ors';
import axios from 'axios';
import type { Camera } from '../overpass';
import { calculateDistance } from '../../utils';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('ORS service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStart: [number, number] = [37.7749, -122.4194]; // [lat, lon]
  const mockEnd: [number, number] = [37.7833, -122.4167];   // [lat, lon]
  const mockApiKey = 'test-api-key';

  it('should generate a closed ring with 17 points (16 steps + closure)', async () => {
    const alprCamera: Camera = {
      id: 1,
      lat: 37.775,
      lon: -122.42,
      tags: { 'surveillance:type': 'ALPR' }
    };

    mockedAxios.post.mockResolvedValue({
      data: {
        features: [{
          geometry: { coordinates: [[-122.4194, 37.7749], [-122.4167, 37.7833]], type: 'LineString' },
          properties: { summary: { distance: 1000, duration: 60 } }
        }]
      }
    });

    await getORSRoute(mockStart, mockEnd, [alprCamera], 'stealth', mockApiKey);

    const callBody = mockedAxios.post.mock.calls[0][1];
    const avoidPolygons = callBody.options.avoid_polygons;
    
    // Check first camera's polygon
    const polygon = avoidPolygons.coordinates[0][0];
    
    // Circle polygon with default 16 steps produces 17 points (closed ring)
    expect(polygon).toHaveLength(17);
    expect(polygon[0]).toEqual(polygon[16]); // ring closes
  });

  it('should generate circle points at the specified radius from center', async () => {
    const standardCamera: Camera = {
      id: 2,
      lat: 37.775,
      lon: -122.42,
      tags: { 'surveillance:type': 'indoor' }
    };

    mockedAxios.post.mockResolvedValue({
      data: {
        features: [{
          geometry: { coordinates: [[-122.4194, 37.7749], [-122.4167, 37.7833]], type: 'LineString' },
          properties: { summary: { distance: 1000, duration: 60 } }
        }]
      }
    });

    await getORSRoute(mockStart, mockEnd, [standardCamera], 'stealth', mockApiKey);

    const callBody = mockedAxios.post.mock.calls[0][1];
    const avoidPolygons = callBody.options.avoid_polygons;
    
    const polygon = avoidPolygons.coordinates[0][0];
    const centerLat = standardCamera.lat;
    const centerLon = standardCamera.lon;
    
// Check a point on the ring is approximately the radius distance from center
    // Use point at index 4 (90° from starting angle)
    // polygon is [lon, lat] from circlePolygon, calculateDistance expects (lat, lon)
    const testLon = polygon[4][0];
    const testLat = polygon[4][1];
    const dist = calculateDistance(centerLat, centerLon, testLat, testLon);
    
    // calculateDistance returns km, convert to meters
    const distMeters = dist * 1000;
    // 65m radius should have distance within ~5m tolerance
    expect(distMeters).toBeCloseTo(65, -1); // within ~5m
  });

  it('should send coordinates in [longitude, latitude] format', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        features: [{
          geometry: { coordinates: [[-122.4194, 37.7749], [-122.4167, 37.7833]], type: 'LineString' },
          properties: { summary: { distance: 1000, duration: 60 } }
        }]
      }
    });

    await getORSRoute(mockStart, mockEnd, [], 'speed', mockApiKey);

    const callBody = mockedAxios.post.mock.calls[0][1];
    
    // start: [lat, lon] -> ORS: [lon, lat]
    expect(callBody.coordinates[0]).toEqual([mockStart[1], mockStart[0]]);
    expect(callBody.coordinates[1]).toEqual([mockEnd[1], mockEnd[0]]);
  });

  it('should strictly follow MultiPolygon GeoJSON nesting [[[[lon, lat], ...]]]]', async () => {
    const camera: Camera = {
      id: 3,
      lat: 37.775,
      lon: -122.42,
      tags: {}
    };

    mockedAxios.post.mockResolvedValue({
      data: {
        features: [{
          geometry: { coordinates: [[-122.4194, 37.7749], [-122.4167, 37.7833]], type: 'LineString' },
          properties: { summary: { distance: 1000, duration: 60 } }
        }]
      }
    });

    await getORSRoute(mockStart, mockEnd, [camera], 'stealth', mockApiKey);

    const callBody = mockedAxios.post.mock.calls[0][1];
    const avoidPolygons = callBody.options.avoid_polygons;

    expect(avoidPolygons.type).toBe('MultiPolygon');
    // MultiPolygon.coordinates is number[][][][]
    expect(Array.isArray(avoidPolygons.coordinates)).toBe(true); // Polygons
    expect(Array.isArray(avoidPolygons.coordinates[0])).toBe(true); // Rings in first Polygon
    expect(Array.isArray(avoidPolygons.coordinates[0][0])).toBe(true); // Positions in first Ring
    expect(Array.isArray(avoidPolygons.coordinates[0][0][0])).toBe(true); // [lon, lat]
    expect(avoidPolygons.coordinates[0][0][0]).toHaveLength(2);
  });

  it('should handle camera with missing tags object gracefully', async () => {
    const camera = {
      id: 4,
      lat: 37.775,
      lon: -122.42
    } as any as Camera;

    mockedAxios.post.mockResolvedValue({
      data: {
        features: [{
          geometry: { coordinates: [[-122.4194, 37.7749]], type: 'Point' },
          properties: { summary: { distance: 100, duration: 10 } }
        }]
      }
    });

    // Should not throw
    await expect(getORSRoute(mockStart, mockEnd, [camera], 'stealth', mockApiKey)).resolves.toBeDefined();
  });

  it('should throw error when no route is found', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        features: []
      }
    });

    await expect(getORSRoute(mockStart, mockEnd, [], 'speed', mockApiKey))
      .rejects.toThrow('No route found from OpenRouteService');
  });

  it('should throw error on invalid response format', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        features: [{}]
      }
    });

    await expect(getORSRoute(mockStart, mockEnd, [], 'speed', mockApiKey))
      .rejects.toThrow('Invalid response format from OpenRouteService');
  });

  it('should correctly parse instructions from segments and steps', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        features: [{
          geometry: { coordinates: [[-122.41, 37.77], [-122.42, 37.78]], type: 'LineString' },
          properties: {
            summary: { distance: 1000, duration: 60 },
            segments: [{
              steps: [
                { instruction: 'Go straight', distance: 600, duration: 40 },
                { instruction: 'Turn left', distance: 400, duration: 20 }
              ]
            }]
          }
        }]
      }
    });

    const result = await getORSRoute(mockStart, mockEnd, [], 'speed', mockApiKey);

    expect(result.instructions).toHaveLength(2);
    expect(result.instructions[0].text).toBe('Go straight');
    expect(result.instructions[1].text).toBe('Turn left');
    expect(result.time).toBe(60000);
  });

  it('should handle stealth mode and avoid highways', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        features: [{
          geometry: { coordinates: [[-122.41, 37.77]], type: 'Point' },
          properties: { summary: { distance: 100, duration: 10 } }
        }]
      }
    });

    await getORSRoute(mockStart, mockEnd, [], 'stealth', mockApiKey);

    const callBody = mockedAxios.post.mock.calls[0][1];
    expect(callBody.options.avoid_features).toContain('highways');
  });
});