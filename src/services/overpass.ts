import axios from 'axios';

export interface Camera {
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    brand?: string;
    'surveillance:type'?: string;
    'surveillance:kind'?: string;
    [key: string]: string | undefined;
  };
}

// Define types for Overpass API response
interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export async function fetchCameras(bbox: [number, number, number, number]): Promise<Camera[]> {
  const [south, west, north, east] = bbox;

  // Limit bounding box size to avoid overwhelming Overpass
  const latDiff = Math.abs(north - south);
  const lonDiff = Math.abs(east - west);

  if (latDiff > 5 || lonDiff > 5) {
    console.warn('Bounding box too large, skipping camera fetch');
    return [];
  }

  // Further limit for performance - if area is too large, reduce the query
  const areaSize = latDiff * lonDiff;
  let timeout = 25;
  if (areaSize > 2) {
    timeout = 45; // Allow more time for larger areas
  } else if (areaSize > 0.5) {
    timeout = 35;
  }

  const query = `
    [out:json][timeout:${timeout}];
    (
      node["man_made"="surveillance"](${south},${west},${north},${east});
      node["camera:type"~"alpr|lpr|number_plate",i](${south},${west},${north},${east});
      node["surveillance:type"~"alpr|lpr|number_plate",i](${south},${west},${north},${east});
      node["surveillance:kind"~"alpr|lpr|number_plate",i](${south},${west},${north},${east});
    );
    out body center;
  `;

  const params = new URLSearchParams();
  params.append('data', query);

  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: timeout * 1000 + 5000 // Add 5s buffer to timeout
    });

    if (!response.data || !response.data.elements) return [];

    const overpassData = response.data as OverpassResponse;

    // Process elements with better error handling
    const cameras: Camera[] = [];
    for (const el of overpassData.elements) {
      // Validate coordinates exist
      const lat = el.lat || (el.center && el.center.lat);
      const lon = el.lon || (el.center && el.center.lon);

      if (lat !== undefined && lon !== undefined) {
        cameras.push({
          id: el.id,
          lat,
          lon,
          tags: el.tags || {},
        });
      }
    }

    return cameras;
  } catch (error) {
    if (axios.isCancel(error)) {
      console.warn('Overpass request cancelled due to timeout');
    } else {
      console.error('Overpass fetch failed:', error);
    }
    return []; // Return empty instead of throwing to allow routing to continue
  }
}
