import type { Camera } from '../services/overpass';

export function clusterCameras(
  cameras: Camera[],
  radiusKm: number = 0.03
): Camera[] {
  if (cameras.length <= 1) return cameras;

  const clustered: Camera[] = [];
  const used = new Set<number>();

  for (let i = 0; i < cameras.length; i++) {
    if (used.has(i)) continue;

    const camI = cameras[i];
    used.add(i);

    const clusterCams: Camera[] = [camI];

    for (let j = i + 1; j < cameras.length; j++) {
      if (used.has(j)) continue;

      const camJ = cameras[j];
      const dist = calculateDistance(camI.lat, camI.lon, camJ.lat, camJ.lon);

      if (dist <= radiusKm) {
        used.add(j);
        clusterCams.push(camJ);
      }
    }

    // Compute centroid of clustered cameras
    const centroidLat = clusterCams.reduce((sum, c) => sum + c.lat, 0) / clusterCams.length;
    const centroidLon = clusterCams.reduce((sum, c) => sum + c.lon, 0) / clusterCams.length;

    // Use the first camera's tags, but could be enhanced to merge tags
    const representative = {
      id: -clusterCams.length,
      lat: centroidLat,
      lon: centroidLon,
      tags: camI.tags,
    };

    clustered.push(representative);
  }

  return clustered;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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