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
  const areas: any = {};
  const priorityStatements: any[] = [];

  if (mode !== 'speed') {
    // Balanced: priority 0.1 (10x cost), Stealth: priority 0.01 (100x cost)
    const priorityFactor = mode === 'balanced' ? "0.1" : "0.01";
    
    cameras.forEach((cam, index) => {
      const areaId = `camera_${index}`;
      const offset = 0.0006; // Approx 50-60m
      areas[areaId] = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [cam.lon - offset, cam.lat - offset],
            [cam.lon + offset, cam.lat - offset],
            [cam.lon + offset, cam.lat + offset],
            [cam.lon - offset, cam.lat + offset],
            [cam.lon - offset, cam.lat - offset]
          ]]
        }
      };

      priorityStatements.push({
        if: `in_${areaId}`,
        multiply_by: priorityFactor
      });
    });

    if (mode === 'stealth') {
      // Also penalize major roads generally
      priorityStatements.push({
        if: "road_class == TRUNK || road_class == PRIMARY",
        multiply_by: "0.5"
      });
    }
  }

  const customModel = {
    priority: priorityStatements,
    areas: areas
  };

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
      custom_model: mode === 'speed' ? undefined : customModel
    }
  );

  return response.data;
}
