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

  const response = await axios.post('https://overpass-api.de/api/interpreter', query);
  
  return response.data.elements.map((el: any) => ({
    id: el.id,
    lat: el.lat || (el.center && el.center.lat),
    lon: el.lon || (el.center && el.center.lon),
    tags: el.tags || {},
  }));
}
