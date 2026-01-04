import { describe, it, expect } from 'vitest';
import { calculateBBox, bboxToArray, type BBox } from './utils';

describe('utils', () => {
  describe('calculateBBox', () => {
    it('should calculate bounding box with default padding', () => {
      const result: BBox = calculateBBox(37.7749, -122.4194, 34.0522, -118.2437);
      
      expect(result.south).toBeCloseTo(34.0522 - 0.05);
      expect(result.west).toBeCloseTo(-122.4194 - 0.05);
      expect(result.north).toBeCloseTo(37.7749 + 0.05);
      expect(result.east).toBeCloseTo(-118.2437 + 0.05);
    });

    it('should calculate bounding box with custom padding', () => {
      const result: BBox = calculateBBox(37.7749, -122.4194, 34.0522, -118.2437, 0.1);
      
      expect(result.south).toBeCloseTo(34.0522 - 0.1);
      expect(result.west).toBeCloseTo(-122.4194 - 0.1);
      expect(result.north).toBeCloseTo(37.7749 + 0.1);
      expect(result.east).toBeCloseTo(-118.2437 + 0.1);
    });

    it('should handle reversed coordinates correctly', () => {
      // Test when end coordinates are smaller than start
      const result: BBox = calculateBBox(34.0522, -118.2437, 37.7749, -122.4194);
      
      expect(result.south).toBeLessThan(result.north);
      expect(result.west).toBeLessThan(result.east);
      expect(result.south).toBeCloseTo(34.0522 - 0.05);
      expect(result.west).toBeCloseTo(-122.4194 - 0.05);
      expect(result.north).toBeCloseTo(37.7749 + 0.05);
      expect(result.east).toBeCloseTo(-118.2437 + 0.05);
    });
  });

  describe('bboxToArray', () => {
    it('should convert BBox to array in correct order', () => {
      const bbox: BBox = {
        south: 34.0022,
        west: -122.4694,
        north: 37.8249,
        east: -118.1937
      };
      
      const result: [number, number, number, number] = bboxToArray(bbox);
      
      expect(result).toEqual([34.0022, -122.4694, 37.8249, -118.1937]);
      expect(result[0]).toBe(bbox.south);
      expect(result[1]).toBe(bbox.west);
      expect(result[2]).toBe(bbox.north);
      expect(result[3]).toBe(bbox.east);
    });
  });
});