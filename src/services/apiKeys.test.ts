/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStoredApiKeys, storeApiKeys, clearStoredApiKeys, type ApiKeyStorage } from './apiKeys';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('apiKeys service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('storeApiKeys', () => {
    it('should store API keys in localStorage with correct prefixes', () => {
      const keys: Partial<ApiKeyStorage> = {
        gh_api_key: 'test-gh-key',
        ors_api_key: 'test-ors-key',
        routing_engine: 'openrouteservice'
      };

      storeApiKeys(keys);

      expect(localStorage.getItem('shaderoute_api_key_gh')).toBe('test-gh-key');
      expect(localStorage.getItem('shaderoute_api_key_ors')).toBe('test-ors-key');
      expect(localStorage.getItem('shaderoute_api_key_engine')).toBe('openrouteservice');
    });

    it('should store only provided keys', () => {
      const keys: Partial<ApiKeyStorage> = {
        gh_api_key: 'test-gh-key'
      };

      storeApiKeys(keys);

      expect(localStorage.getItem('shaderoute_api_key_gh')).toBe('test-gh-key');
      expect(localStorage.getItem('shaderoute_api_key_ors')).toBe(null);
      expect(localStorage.getItem('shaderoute_api_key_engine')).toBe(null);
    });
  });

  describe('getStoredApiKeys', () => {
    it('should retrieve stored API keys', () => {
      localStorage.setItem('shaderoute_api_key_gh', 'stored-gh-key');
      localStorage.setItem('shaderoute_api_key_ors', 'stored-ors-key');
      localStorage.setItem('shaderoute_api_key_engine', 'graphhopper');

      const result = getStoredApiKeys();

      expect(result.gh_api_key).toBe('stored-gh-key');
      expect(result.ors_api_key).toBe('stored-ors-key');
      expect(result.routing_engine).toBe('graphhopper');
    });

    it('should return empty object when no keys are stored', () => {
      const result = getStoredApiKeys();

      expect(result).toEqual({});
    });

    it('should handle missing keys gracefully', () => {
      localStorage.setItem('shaderoute_api_key_gh', 'stored-gh-key');
      // Missing other keys

      const result = getStoredApiKeys();

      expect(result.gh_api_key).toBe('stored-gh-key');
      expect(result.ors_api_key).toBeUndefined();
      expect(result.routing_engine).toBeUndefined();
    });
  });

  describe('clearStoredApiKeys', () => {
    it('should clear all stored API keys', () => {
      localStorage.setItem('shaderoute_api_key_gh', 'test-key');
      localStorage.setItem('shaderoute_api_key_ors', 'test-key');
      localStorage.setItem('shaderoute_api_key_engine', 'graphhopper');

      clearStoredApiKeys();

      expect(localStorage.getItem('shaderoute_api_key_gh')).toBe(null);
      expect(localStorage.getItem('shaderoute_api_key_ors')).toBe(null);
      expect(localStorage.getItem('shaderoute_api_key_engine')).toBe(null);
    });
  });
});