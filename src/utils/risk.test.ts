import { describe, it, expect } from 'vitest';
import { countCamerasNearRoute, calculateStealthScore } from './risk';
import type { Camera } from '../services/overpass';

describe('risk utilities', () => {
  describe('countCamerasNearRoute', () => {
    const mockCameras: Camera[] = [
      { id: 1, lat: 0, lon: 0, tags: {} },
      { id: 2, lat: 1, lon: 1, tags: {} },
      { id: 3, lat: 0.5, lon: 0.5, tags: {} },
    ];

    it('should return 0 for empty route or cameras', () => {
      expect(countCamerasNearRoute([], mockCameras)).toBe(0);
      expect(countCamerasNearRoute([[0, 0]], [])).toBe(0);
    });

    it('should count cameras within the radius', () => {
      // Point (0,0) is exactly on camera 1
      const route: [number, number][] = [[0, 0]];
      expect(countCamerasNearRoute(route, mockCameras, 0.05)).toBe(1);
    });

    it('should not double count cameras', () => {
      const route: [number, number][] = [[0, 0], [0, 0.0001], [0.0001, 0]];
      expect(countCamerasNearRoute(route, mockCameras, 0.05)).toBe(1);
    });

    it('should count multiple cameras along a route', () => {
      const route: [number, number][] = [[0, 0], [0.5, 0.5]];
      expect(countCamerasNearRoute(route, mockCameras, 0.05)).toBe(2);
    });

    it('should respect the radius', () => {
      // (0,0) to (0.1, 0.1) is about 15.7km
      // (1,1) to (0.1, 0.1) is about 140km
      const route: [number, number][] = [[0.1, 0.1]];
      expect(countCamerasNearRoute(route, mockCameras, 5)).toBe(0);
      expect(countCamerasNearRoute(route, mockCameras, 20)).toBe(1);
      expect(countCamerasNearRoute(route, mockCameras, 200)).toBe(3);
    });
  });

  describe('calculateStealthScore', () => {
    it('should return 100 for 0 cameras', () => {
      expect(calculateStealthScore(0, 1000)).toBe(100);
    });

    it('should return 100 if distance is 0', () => {
      expect(calculateStealthScore(5, 0)).toBe(100);
    });

    it('should calculate score based on density', () => {
      // 1 camera in 1km = 10 cameras/km -> 90 score
      expect(calculateStealthScore(1, 1000)).toBe(90);
      // 10 cameras in 1km = 100 cameras/km -> 0 score
      expect(calculateStealthScore(10, 1000)).toBe(0);
      // 1 camera in 10km = 0.1 cameras/km -> 99 score
      expect(calculateStealthScore(1, 10000)).toBe(99);
      // 5 cameras in 5km = 1 camera/km -> 90 score
      expect(calculateStealthScore(5, 5000)).toBe(90);
    });

    it('should not return less than 0', () => {
      expect(calculateStealthScore(100, 1000)).toBe(0);
    });
  });
});
