// Secure API key management service
// In a real application, API keys should not be stored in localStorage
// This is a placeholder for better security practices

const API_KEY_STORAGE_PREFIX = 'shaderoute_api_key_';

export interface ApiKeyStorage {
  gh_api_key: string;
  ors_api_key: string;
  routing_engine: 'graphhopper' | 'openrouteservice';
  gh_base_url: string;
}

// Get stored API keys from both localStorage and sessionStorage
export function getStoredApiKeys(): Partial<ApiKeyStorage> {
  try {
    const get = (key: string) => localStorage.getItem(key) || sessionStorage.getItem(key);
    
    const ghKey = get(`${API_KEY_STORAGE_PREFIX}gh`);
    const orsKey = get(`${API_KEY_STORAGE_PREFIX}ors`);
    const engine = get(`${API_KEY_STORAGE_PREFIX}engine`) as 'graphhopper' | 'openrouteservice' | null;
    const ghBaseUrl = get(`${API_KEY_STORAGE_PREFIX}gh_base_url`);

    const result: Partial<ApiKeyStorage> = {};
    if (ghKey !== null) result.gh_api_key = ghKey;
    if (orsKey !== null) result.ors_api_key = orsKey;
    if (engine !== null) result.routing_engine = engine;
    if (ghBaseUrl !== null) result.gh_base_url = ghBaseUrl;
    
    return result;
  } catch (error) {
    console.error('Error retrieving API keys from storage:', error);
    return {};
  }
}

// Store API keys with optional persistence
export function storeApiKeys(keys: Partial<ApiKeyStorage>, persistent: boolean = false): void {
  try {
    const storage = persistent ? localStorage : sessionStorage;
    const otherStorage = persistent ? sessionStorage : localStorage;

    if (keys.gh_api_key !== undefined) {
      storage.setItem(`${API_KEY_STORAGE_PREFIX}gh`, keys.gh_api_key);
      otherStorage.removeItem(`${API_KEY_STORAGE_PREFIX}gh`);
    }
    if (keys.ors_api_key !== undefined) {
      storage.setItem(`${API_KEY_STORAGE_PREFIX}ors`, keys.ors_api_key);
      otherStorage.removeItem(`${API_KEY_STORAGE_PREFIX}ors`);
    }
    if (keys.routing_engine !== undefined) {
      storage.setItem(`${API_KEY_STORAGE_PREFIX}engine`, keys.routing_engine);
      otherStorage.removeItem(`${API_KEY_STORAGE_PREFIX}engine`);
    }
    if (keys.gh_base_url !== undefined) {
      storage.setItem(`${API_KEY_STORAGE_PREFIX}gh_base_url`, keys.gh_base_url);
      otherStorage.removeItem(`${API_KEY_STORAGE_PREFIX}gh_base_url`);
    }
  } catch (error) {
    console.error('Error storing API keys to storage:', error);
  }
}

// Clear all stored API keys
export function clearStoredApiKeys(): void {
  try {
    localStorage.removeItem(`${API_KEY_STORAGE_PREFIX}gh`);
    localStorage.removeItem(`${API_KEY_STORAGE_PREFIX}ors`);
    localStorage.removeItem(`${API_KEY_STORAGE_PREFIX}engine`);
    sessionStorage.removeItem(`${API_KEY_STORAGE_PREFIX}gh`);
    sessionStorage.removeItem(`${API_KEY_STORAGE_PREFIX}ors`);
    sessionStorage.removeItem(`${API_KEY_STORAGE_PREFIX}engine`);
    localStorage.removeItem(`${API_KEY_STORAGE_PREFIX}gh_base_url`);
    sessionStorage.removeItem(`${API_KEY_STORAGE_PREFIX}gh_base_url`);
  } catch (error) {
    console.error('Error clearing API keys from storage:', error);
  }
}