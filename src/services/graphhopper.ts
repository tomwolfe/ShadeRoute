import axios from 'axios';

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
  cameras: any[],
  mode: StealthMode,
  apiKey: string
): Promise<RouteResponse> {
  const features: any[] = [];
  const priorityStatements: any[] = [];

  if (mode !== 'speed' && cameras.length > 0) {
    const priorityFactor = mode === 'balanced' ? 0.1 : 0.01;
    
    cameras.forEach((cam, index) => {
      const areaId = `camera_${index}`;
      const offset = 0.0006;
      
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
    priorityStatements.push({
      if: "road_class == TRUNK || road_class == PRIMARY",
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

  const response = await axios.post(
    `https://graphhopper.com/api/1/route?key=${apiKey}`,
    {
      points: [
        [start[1], start[0]],
        [end[1], end[0]]
      ],
      profile: 'car',
      locale: 'en',
      points_encoded: false,
      elevation: false,
      instructions: true,
      custom_model: priorityStatements.length > 0 ? customModel : undefined
    }
  );

  return response.data;
}
