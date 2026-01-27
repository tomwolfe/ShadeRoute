import { useState, useCallback, useRef } from 'react';
import { fetchCameras } from '../services/overpass';
import type { Camera } from '../services/overpass';
import { calculateBBox, bboxToArray } from '../utils';

type BBox = [number, number, number, number]; // [south, west, north, east]

export const useCameras = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedBBoxes = useRef<BBox[]>([]);
  const cameraMap = useRef<Map<number, Camera>>(new Map());

  const isContained = (small: BBox, big: BBox) => {
    return small[0] >= big[0] && small[1] >= big[1] && 
           small[2] <= big[2] && small[3] <= big[3];
  };

  const getCamerasForRoute = useCallback(async (startLat: number, startLon: number, endLat: number, endLon: number) => {
    const currentBBox = calculateBBox(startLat, startLon, endLat, endLon);
    const bboxArr = bboxToArray(currentBBox);

    // Check if this BBox is already covered
    const isCovered = fetchedBBoxes.current.some(bbox => isContained(bboxArr, bbox));
    
    if (isCovered && cameraMap.current.size > 0) {
      return Array.from(cameraMap.current.values());
    }

    setLoading(true);
    try {
      // Buffer the BBox slightly to reduce future fetches
      const bufferedBBox: BBox = [
        bboxArr[0] - 0.02,
        bboxArr[1] - 0.02,
        bboxArr[2] + 0.02,
        bboxArr[3] + 0.02
      ];

      const newCameras = await fetchCameras(bufferedBBox);
      
      // Update our map of unique cameras
      newCameras.forEach(cam => {
        cameraMap.current.set(cam.id, cam);
      });

      fetchedBBoxes.current.push(bufferedBBox);
      const allCameras = Array.from(cameraMap.current.values());
      setCameras(allCameras);
      return allCameras;
    } catch (err) {
      console.error('Failed to fetch cameras:', err);
      return Array.from(cameraMap.current.values());
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    fetchedBBoxes.current = [];
    cameraMap.current.clear();
    setCameras([]);
  }, []);

  return {
    cameras,
    loading,
    getCamerasForRoute,
    clearCache
  };
};
