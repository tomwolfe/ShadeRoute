export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
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
