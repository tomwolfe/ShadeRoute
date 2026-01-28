import { useCallback } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { getRoute } from '../services/graphhopper';
import { getORSRoute } from '../services/openrouteservice';
import { countCamerasNearRoute, calculateStealthScore } from '../utils/risk';
import type { Camera } from '../services/overpass';
import type { StealthMode } from '../services/graphhopper';

export const useRouting = () => {
  const {
    start, end, engine, ghApiKey, orsApiKey, mode,
    setStealthRoute, setFastestRoute, setLoading, setError
  } = useNavigation();

  const calculateRoute = useCallback(async (cameras: Camera[]) => {
    if (!start || !end) return;

    if (engine === 'graphhopper' && !ghApiKey) {
      setError('Please enter a GraphHopper API Key.');
      return;
    }
    if (engine === 'openrouteservice' && !orsApiKey) {
      setError('Please enter an OpenRouteService API Key.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sLat = parseFloat(start.lat);
      const sLon = parseFloat(start.lon);
      const eLat = parseFloat(end.lat);
      const eLon = parseFloat(end.lon);

      const fetchRoute = async (m: StealthMode) => {
        if (engine === 'graphhopper') {
          const response = await getRoute([sLat, sLon], [eLat, eLon], cameras, m, ghApiKey);
          const path = response.paths[0];
          const coords = path.points.coordinates.map(c => [c[1], c[0]] as [number, number]);
          const camCount = countCamerasNearRoute(coords, cameras);
          return {
            coordinates: coords,
            distance: path.distance,
            time: path.time,
            instructions: path.instructions,
            cameraCount: camCount,
            stealthScore: calculateStealthScore(camCount, path.distance)
          };
        } else {
          const result = await getORSRoute([sLat, sLon], [eLat, eLon], cameras, m, orsApiKey);
          const camCount = countCamerasNearRoute(result.coordinates, cameras);
          return {
            ...result,
            cameraCount: camCount,
            stealthScore: calculateStealthScore(camCount, result.distance)
          };
        }
      };

      const [stealthRes, fastestRes] = await Promise.all([
        fetchRoute(mode),
        fetchRoute('speed')
      ]);

      setStealthRoute(stealthRes);
      setFastestRoute(fastestRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Routing failed');
    } finally {
      setLoading(false);
    }
  }, [start, end, engine, ghApiKey, orsApiKey, mode, setStealthRoute, setFastestRoute, setLoading, setError]);

  return { calculateRoute };
};