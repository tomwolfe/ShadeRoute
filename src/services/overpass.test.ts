import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCameras } from './overpass';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('overpass service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchCameras', () => {
    it('should return empty array when bounding box is too large', async () => {
      const result = await fetchCameras([1, 1, 10, 10]); // Large bbox (more than 5 degrees)
      
      expect(result).toEqual([]);
    });

    it('should return cameras from successful API response', async () => {
      const mockResponse = {
        data: {
          elements: [
            {
              id: 123,
              lat: 37.7749,
              lon: -122.4194,
              tags: { 'surveillance:type': 'ALPR' }
            },
            {
              id: 456,
              lat: 34.0522,
              lon: -118.2437,
              tags: { brand: 'Fakescape' }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await fetchCameras([37.0, -123.0, 38.0, -122.0]);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://overpass-api.de/api/interpreter',
        expect.any(String), // URLSearchParams string
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 123,
        lat: 37.7749,
        lon: -122.4194,
        tags: { 'surveillance:type': 'ALPR' }
      });
    });

    it('should handle API response with center coordinates', async () => {
      const mockResponse = {
        data: {
          elements: [
            {
              id: 789,
              center: { lat: 40.7128, lon: -74.0060 },
              tags: { name: 'Test Camera' }
            }
          ]
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await fetchCameras([37.0, -123.0, 38.0, -122.0]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 789,
        lat: 40.7128,
        lon: -74.0060,
        tags: { name: 'Test Camera' }
      });
    });

    it('should return empty array when API returns no elements', async () => {
      const mockResponse = {
        data: {
          elements: []
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await fetchCameras([37.0, -123.0, 38.0, -122.0]);

      expect(result).toEqual([]);
    });

    it('should return empty array when API returns no data', async () => {
      const mockResponse = {
        data: null
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await fetchCameras([37.0, -123.0, 38.0, -122.0]);

      expect(result).toEqual([]);
    });
  });
});