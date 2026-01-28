import type { Camera } from '../services/overpass';
import { calculateDistance } from '../utils';

/**
 * Calculates the number of cameras within a certain distance (radius) of a route.
 * @param route Array of [lat, lon] coordinates
 * @param cameras Array of cameras
 * @param radius Distance in kilometers (default 0.05km = 50m)
 */
export function countCamerasNearRoute(
  route: [number, number][],
  cameras: Camera[],
  radiusKm: number = 0.05
): number {
  if (route.length === 0 || cameras.length === 0) return 0;

  const spottedCameraIds = new Set<number>();

  // For performance, we don't check every point if the route is long
  // We check points at roughly 25m intervals
  const samplingInterval = 1; // Check every point for now as they are usually close enough
  
  for (let i = 0; i < route.length; i += samplingInterval) {
    const [lat, lon] = route[i];
    
    for (const cam of cameras) {
      if (spottedCameraIds.has(cam.id)) continue;
      
      const dist = calculateDistance(lat, lon, cam.lat, cam.lon);
      if (dist <= radiusKm) {
        spottedCameraIds.add(cam.id);
      }
    }
  }

  return spottedCameraIds.size;
}

/**
 * Calculates a "Stealth Score" from 0-100 based on camera density.
 * 100 is perfectly stealthy (0 cameras), lower is worse.
 * @param cameraCount Number of cameras near the route
 * @param distanceMeters Route distance in meters
 */
export function calculateStealthScore(cameraCount: number, distanceMeters: number): number {
  if (cameraCount === 0 || distanceMeters === 0) return 100;
  
  const distanceKm = distanceMeters / 1000;
  const camerasPerKm = cameraCount / distanceKm;
  
  // 10 cameras per km results in a score of 0
  // 1 camera per km results in a score of 90
  return Math.max(0, Math.round(100 - (camerasPerKm * 10)));
}
