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

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult | null> {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon,
        format: 'json',
      },
      headers: {
        'User-Agent': 'ShadeRoute-App',
      },
    });
    if (response.data) {
      return {
        display_name: response.data.display_name,
        lat: response.data.lat,
        lon: response.data.lon,
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}
