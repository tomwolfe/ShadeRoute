import axios from 'axios';
import type { Camera } from './overpass';

export interface RouteResponse {
  paths: Array<{
    distance: number;
    weight: number;
    time: number;
    points: {
      coordinates: [number, number][];
      type: string;
    };
    snapped_waypoints: {
      coordinates: [number, number][];
      type: string;
    };
  }>;
}

export type StealthMode = 'speed' | 'balanced' | 'stealth';

export async function getRoute(
  start: [number, number],
  end: [number, number],
  cameras: Camera[],
  mode: StealthMode,
  apiKey: string
): Promise<RouteResponse> {
  const features: any[] = [];
  const priorityStatements: any[] = [];

  // Limit cameras to avoid huge request bodies, but take up to 100
  const relevantCameras = cameras.slice(0, 100);

  if (mode !== 'speed' && relevantCameras.length > 0) {
    const priorityFactor = mode === 'balanced' ? 0.1 : 0.01;
    
    relevantCameras.forEach((cam, index) => {
      const areaId = `camera_${index}`;
      // Increase offset slightly to 0.0008 (~80-90m) for better avoidance coverage
      const offset = 0.0008;
      
      features.push({
        type: 'Feature',
        id: areaId,
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [cam.lon - offset, cam.lat - offset],
            [cam.lon + offset, cam.lat - offset],
            [cam.lon + offset, cam.lat + offset],
            [cam.lon - offset, cam.lat + offset],
            [cam.lon - offset, cam.lat - offset]
          ]]
        },
        properties: {}
      });

      priorityStatements.push({
        if: `in_${areaId}`,
        multiply_by: priorityFactor
      });
    });
  }

  if (mode === 'stealth') {
    // Aggressively penalize major roads where ALPRs are most likely but maybe not tagged
    priorityStatements.push({
      if: "road_class == MOTORWAY || road_class == TRUNK",
      multiply_by: 0.1
    });
    priorityStatements.push({
      if: "road_class == PRIMARY",
      multiply_by: 0.3
    });
    priorityStatements.push({
      if: "road_class == SECONDARY",
      multiply_by: 0.7
    });
  } else if (mode === 'balanced') {
    priorityStatements.push({
      if: "road_class == MOTORWAY || road_class == TRUNK",
      multiply_by: 0.5
    });
  }

  const customModel: any = {
    priority: priorityStatements
  };

  if (features.length > 0) {
    customModel.areas = {
      type: 'FeatureCollection',
      features: features
    };
  }

  const requestBody: any = {
    points: [
      [start[1], start[0]],
      [end[1], end[0]]
    ],
    profile: 'car',
    locale: 'en',
    points_encoded: false,
    elevation: false,
    instructions: true,
  };

  if (priorityStatements.length > 0) {
    requestBody['ch.disable'] = true;
    requestBody.custom_model = customModel;
  }

  const response = await axios.post(
    `https://graphhopper.com/api/1/route?key=${apiKey}`,
    requestBody
  );

  return response.data;
}
