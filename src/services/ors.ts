import axios from 'axios';
import type { Camera } from './overpass';
import { circlePolygon } from '../utils/geo';
import { clusterCameras } from '../utils/cluster';

export interface ORSInstruction {
  text: string;
  distance: number;
  time: number;
}

export interface ORSRouteResult {
  coordinates: [number, number][];
  distance: number;
  time: number;
  instructions: ORSInstruction[];
}

export interface ORSResponse {
  features: Array<{
    geometry: {
      coordinates: [number, number][];
      type: string;
    };
    properties: {
      summary: {
        distance: number;
        duration: number;
      };
      segments: Array<{
        steps: Array<{
          instruction: string;
          distance: number;
          duration: number;
        }>;
      }>;
    };
  }>;
}

export type StealthMode = 'speed' | 'balanced' | 'stealth';

export async function getORSRoute(
  start: [number, number], // [lat, lon]
  end: [number, number],   // [lat, lon]
  cameras: Camera[],
  mode: StealthMode,
  apiKey: string
): Promise<ORSRouteResult> {
  // ORS expects [[lon, lat], [lon, lat]]
  const coordinates = [
    [start[1], start[0]],
    [end[1], end[0]]
  ];

  const avoidPolygons: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  } = {
    type: 'MultiPolygon',
    coordinates: []
  };

  if (mode !== 'speed' && cameras.length > 0) {
    const clusteredCameras = clusterCameras(cameras);
    avoidPolygons.coordinates = clusteredCameras.map(cam => {
      const isALPR = 
        (cam.tags && 'surveillance:type' in cam.tags && cam.tags['surveillance:type']?.toLowerCase().includes('alpr')) ||
        (cam.tags && 'surveillance:type' in cam.tags && cam.tags['surveillance:type']?.toLowerCase().includes('lpr')) ||
        (cam.tags && 'camera:type' in cam.tags && cam.tags['camera:type']?.toLowerCase().includes('alpr')) ||
        (cam.tags && 'camera:type' in cam.tags && cam.tags['camera:type']?.toLowerCase().includes('lpr')) ||
        (cam.tags && 'surveillance:kind' in cam.tags && cam.tags['surveillance:kind']?.toLowerCase().includes('alpr')) ||
        (cam.tags && 'surveillance:kind' in cam.tags && cam.tags['surveillance:kind']?.toLowerCase().includes('lpr'));

      const radius = isALPR ? 130 : 65;
      const polygon = circlePolygon(cam.lat, cam.lon, radius);

      // MultiPolygon coordinates: Array of Polygons, each Polygon is an array of Rings
      // Each Ring is an array of [lon, lat]
      return [polygon];
    });
  }

  interface ORSOptions {
    avoid_polygons?: typeof avoidPolygons;
    avoid_features?: string[];
  }

  const body: {
    coordinates: number[][];
    preference: string;
    options?: ORSOptions;
  } = {
    coordinates: coordinates,
    preference: 'fastest',
  };

  if (avoidPolygons.coordinates.length > 0) {
    body.options = {
      avoid_polygons: avoidPolygons
    };
  }

  // If stealth mode, we also want to avoid certain road classes if possible
  if (mode === 'stealth') {
    if (!body.options) body.options = {};
    body.options.avoid_features = ["highways"];
  }

  const response = await axios.post(
    `https://api.openrouteservice.org/v2/directions/driving-car/geojson`,
    body,
    {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.data || !response.data.features || response.data.features.length === 0) {
    throw new Error('No route found from OpenRouteService');
  }

  const feature = response.data.features[0];
  if (!feature || !feature.geometry || !feature.properties || !feature.properties.summary) {
    throw new Error('Invalid response format from OpenRouteService');
  }

  const instructions: ORSInstruction[] = [];
  if (feature.properties.segments) {
    feature.properties.segments.forEach((segment: any) => {
      if (segment.steps) {
        segment.steps.forEach((step: any) => {
          instructions.push({
            text: step.instruction,
            distance: step.distance,
            time: step.duration * 1000
          });
        });
      }
    });
  }

  return {
    coordinates: (feature.geometry.coordinates as [number, number][]).map((c) => [c[1], c[0]]),
    distance: feature.properties.summary.distance as number,
    time: (feature.properties.summary.duration as number) * 1000, // Convert to ms
    instructions
  };
}
