import axios from 'axios';
import type { Camera } from './overpass';

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
    };
  }>;
}

export type StealthMode = 'speed' | 'balanced' | 'stealth';

export async function getORSRoute(
  start: [number, number],
  end: [number, number],
  cameras: Camera[],
  mode: StealthMode,
  apiKey: string
): Promise<{ coordinates: [number, number][]; distance: number; time: number }> {
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
    // Limit cameras to avoid huge request bodies
    const relevantCameras = cameras.slice(0, 50);
    
    // ORS avoid_polygons works by completely avoiding the area
    // For 'balanced' we might want smaller areas, for 'stealth' larger
    const offset = mode === 'balanced' ? 0.0004 : 0.0008;

    avoidPolygons.coordinates = relevantCameras.map(cam => [[
      [cam.lon - offset, cam.lat - offset],
      [cam.lon + offset, cam.lat - offset],
      [cam.lon + offset, cam.lat + offset],
      [cam.lon - offset, cam.lat + offset],
      [cam.lon - offset, cam.lat - offset]
    ]]);
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
  // ORS supports avoid_features: ["highways", "tollways", "ferries", "fords"]
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

  return {
    coordinates: (feature.geometry.coordinates as [number, number][]).map((c) => [c[1], c[0]]),
    distance: feature.properties.summary.distance as number,
    time: (feature.properties.summary.duration as number) * 1000 // Convert to ms
  };
}
