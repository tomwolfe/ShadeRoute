export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateBBox(startLat: number, startLon: number, endLat: number, endLon: number, padding = 0.05): BBox {
  return {
    south: Math.min(startLat, endLat) - padding,
    north: Math.max(startLat, endLat) + padding,
    west: Math.min(startLon, endLon) - padding,
    east: Math.max(startLon, endLon) + padding,
  };
}

export function bboxToArray(bbox: BBox): [number, number, number, number] {
  return [bbox.south, bbox.west, bbox.north, bbox.east];
}
