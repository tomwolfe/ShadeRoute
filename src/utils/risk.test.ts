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
      expect(calculateStealthScore(0)).toBe(100);
    });

    it('should decrease score as camera count increases', () => {
      expect(calculateStealthScore(1)).toBe(95);
      expect(calculateStealthScore(10)).toBe(50);
      expect(calculateStealthScore(20)).toBe(0);
      expect(calculateStealthScore(100)).toBe(0);
    });
  });
});
