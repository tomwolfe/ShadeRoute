import axios from 'axios';
import type { Camera } from './overpass';
import { circlePolygon } from '../utils/geo';
import { clusterCameras } from '../utils/cluster';

export interface RoutePath {
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
  instructions: Array<{
    text: string;
    distance: number;
    time: number;
  }>;
}

export interface RouteResponse {
  paths: RoutePath[];
}

export type StealthMode = 'speed' | 'balanced' | 'stealth';

// Define types for GraphHopper API request
interface GraphHopperFeature {
  type: string;
  id: string;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: Record<string, unknown>;
}

interface GraphHopperPriorityStatement {
  if: string;
  multiply_by: number;
}

interface GraphHopperCustomModel {
  priority: GraphHopperPriorityStatement[];
  areas?: {
    type: string;
    features: GraphHopperFeature[];
  };
}

interface GraphHopperRequestBody {
  points: [number, number][];
  profile: string;
  locale: string;
  points_encoded: boolean;
  elevation: boolean;
  instructions: boolean;
  'ch.disable'?: boolean;
  custom_model?: GraphHopperCustomModel;
}

export async function getRoute(
  start: [number, number],
  end: [number, number],
  cameras: Camera[],
  mode: StealthMode,
  apiKey: string,
  ghBaseUrl: string = 'https://graphhopper.com/api/1'
): Promise<RouteResponse> {
  const features: GraphHopperFeature[] = [];
  const priorityStatements: GraphHopperPriorityStatement[] = [];

  if (mode !== 'speed' && cameras.length > 0) {
    const clusteredCameras = clusterCameras(cameras);
    clusteredCameras.forEach((cam, index) => {
      const areaId = `camera_${index}`;
      
      const isALPR = 
        cam.tags['surveillance:type']?.toLowerCase().includes('alpr') ||
        cam.tags['surveillance:type']?.toLowerCase().includes('lpr') ||
        cam.tags['camera:type']?.toLowerCase().includes('alpr') ||
        cam.tags['camera:type']?.toLowerCase().includes('lpr');

      const radius = isALPR ? 130 : 65;
      const polygon = circlePolygon(cam.lat, cam.lon, radius);

      features.push({
        type: 'Feature',
        id: areaId,
        geometry: {
          type: 'Polygon',
          coordinates: [polygon]
        },
        properties: {}
      });

      const multiplier = isALPR ? 0.01 : 0.5;

      priorityStatements.push({
        if: `in_${areaId}`,
        multiply_by: multiplier
      });
    });
  }

  if (mode === 'stealth') {
    // Aggressively penalize major roads where ALPRs are most likely
    priorityStatements.push({
      if: "road_class == MOTORWAY || road_class == TRUNK",
      multiply_by: 0.01
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

  const customModel: GraphHopperCustomModel = {
    priority: priorityStatements
  };

  if (features.length > 0) {
    customModel.areas = {
      type: 'FeatureCollection',
      features: features
    };
  }

  const requestBody: GraphHopperRequestBody = {
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
    `${ghBaseUrl}`,
    requestBody,
    {
      headers: {
        'X-API-Key': apiKey
      }
    }
  );

  return response.data;
}
