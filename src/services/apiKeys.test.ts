/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStoredApiKeys, storeApiKeys, clearStoredApiKeys, type ApiKeyStorage } from './apiKeys';

// Mock storage

const createMockStorage = () => {

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

};



const localStorageMock = createMockStorage();

const sessionStorageMock = createMockStorage();



Object.defineProperty(window, 'localStorage', { value: localStorageMock });

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });



describe('apiKeys service', () => {

  beforeEach(() => {

    localStorage.clear();

    sessionStorage.clear();

  });



  afterEach(() => {

    localStorage.clear();

    sessionStorage.clear();

  });



  describe('storeApiKeys', () => {

    it('should store API keys in sessionStorage by default', () => {

      const keys: Partial<ApiKeyStorage> = {

        gh_api_key: 'test-gh-key',

        ors_api_key: 'test-ors-key',

        routing_engine: 'openrouteservice'

      };



      storeApiKeys(keys);



      expect(sessionStorage.getItem('shaderoute_api_key_gh')).toBe('test-gh-key');

      expect(localStorage.getItem('shaderoute_api_key_gh')).toBe(null);

    });



    it('should store API keys in localStorage when persistent is true', () => {

      const keys: Partial<ApiKeyStorage> = {

        gh_api_key: 'test-gh-key'

      };



      storeApiKeys(keys, true);



      expect(localStorage.getItem('shaderoute_api_key_gh')).toBe('test-gh-key');

      expect(sessionStorage.getItem('shaderoute_api_key_gh')).toBe(null);

    });

  });



  describe('getStoredApiKeys', () => {

    it('should retrieve keys from either storage', () => {

      localStorage.setItem('shaderoute_api_key_gh', 'stored-gh-key');

      sessionStorage.setItem('shaderoute_api_key_ors', 'session-ors-key');



      const result = getStoredApiKeys();



      expect(result.gh_api_key).toBe('stored-gh-key');

      expect(result.ors_api_key).toBe('session-ors-key');

    });



    it('should return empty object when no keys are stored', () => {

      const result = getStoredApiKeys();

      expect(result).toEqual({});

    });

  });



  describe('clearStoredApiKeys', () => {

    it('should clear both storages', () => {

      localStorage.setItem('shaderoute_api_key_gh', 'test-key');

      sessionStorage.setItem('shaderoute_api_key_gh', 'test-key');



      clearStoredApiKeys();



      expect(localStorage.getItem('shaderoute_api_key_gh')).toBe(null);

      expect(sessionStorage.getItem('shaderoute_api_key_gh')).toBe(null);

    });

  });

});
