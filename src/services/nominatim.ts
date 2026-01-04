import axios from 'axios';

export interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
}

export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  if (!query) return [];
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      q: query,
      format: 'json',
      addressdetails: 1,
      limit: 5,
    },
    headers: {
      'User-Agent': 'ShadeRoute-App',
    },
  });
  return response.data;
}
