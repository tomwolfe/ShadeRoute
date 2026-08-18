export function circlePolygon(
  centerLat: number,
  centerLon: number,
  radiusMeters: number,
  steps: number = 16
): [number, number][] {
  const R = 6378137;
  const radiusRadians = radiusMeters / R;

  const ring: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const latDelta = Math.asin(Math.sin(centerLat * Math.PI / 180) * Math.cos(radiusRadians) + Math.cos(centerLat * Math.PI / 180) * Math.sin(radiusRadians) * Math.cos(theta));
    const lonDelta = Math.atan2(Math.sin(theta) * Math.sin(radiusRadians) * Math.cos(centerLat * Math.PI / 180), Math.cos(radiusRadians) - Math.sin(centerLat * Math.PI / 180) * Math.sin(latDelta));

    const lat = latDelta * 180 / Math.PI;
    let lon = centerLon + lonDelta * 180 / Math.PI;
    lon = (lon + 540) % 360 - 180;

    ring.push([lon, lat]);
  }

  return ring;
}