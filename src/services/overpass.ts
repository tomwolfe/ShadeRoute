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
    [key: string]: any;
  };
}

export async function fetchCameras(bbox: [number, number, number, number]): Promise<Camera[]> {
  const [south, west, north, east] = bbox;
  
  // Limit bounding box size to avoid overwhelming Overpass
  if (Math.abs(north - south) > 1 || Math.abs(east - west) > 1) {
    console.warn('Bounding box too large, skipping camera fetch');
    return [];
  }

  const query = `
    [out:json][timeout:25];
    (
      node["man_made"="surveillance"]["surveillance:type"="ALPR"](${south},${west},${north},${east});
      node["man_made"="surveillance"]["surveillance:kind"="lpr"](${south},${west},${north},${east});
      way["man_made"="surveillance"]["surveillance:type"="ALPR"](${south},${west},${north},${east});
      way["man_made"="surveillance"]["surveillance:kind"="lpr"](${south},${west},${north},${east});
    );
    out body center;
  `;

  const params = new URLSearchParams();
  params.append('data', query);

  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (!response.data || !response.data.elements) return [];

    return response.data.elements.map((el: any) => ({
      id: el.id,
      lat: el.lat || (el.center && el.center.lat),
      lon: el.lon || (el.center && el.center.lon),
      tags: el.tags || {},
    }));
  } catch (error) {
    console.error('Overpass fetch failed:', error);
    return []; // Return empty instead of throwing to allow routing to continue
  }
}
