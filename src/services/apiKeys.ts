// Secure API key management service
// In a real application, API keys should not be stored in localStorage
// This is a placeholder for better security practices

const API_KEY_STORAGE_PREFIX = 'shaderoute_api_key_';

export interface ApiKeyStorage {
  gh_api_key: string;
  ors_api_key: string;
  routing_engine: 'graphhopper' | 'openrouteservice';
}

// Get stored API keys
export function getStoredApiKeys(): Partial<ApiKeyStorage> {
  try {
    const ghKey = localStorage.getItem(`${API_KEY_STORAGE_PREFIX}gh`) || '';
    const orsKey = localStorage.getItem(`${API_KEY_STORAGE_PREFIX}ors`) || '';
    const engine = localStorage.getItem(`${API_KEY_STORAGE_PREFIX}engine`) as 'graphhopper' | 'openrouteservice' | null;
    
    return {
      gh_api_key: ghKey,
      ors_api_key: orsKey,
      routing_engine: engine || undefined
    };
  } catch (error) {
    console.error('Error retrieving API keys from storage:', error);
    return {};
  }
}

// Store API keys
export function storeApiKeys(keys: Partial<ApiKeyStorage>): void {
  try {
    if (keys.gh_api_key !== undefined) {
      localStorage.setItem(`${API_KEY_STORAGE_PREFIX}gh`, keys.gh_api_key);
    }
    if (keys.ors_api_key !== undefined) {
      localStorage.setItem(`${API_KEY_STORAGE_PREFIX}ors`, keys.ors_api_key);
    }
    if (keys.routing_engine !== undefined) {
      localStorage.setItem(`${API_KEY_STORAGE_PREFIX}engine`, keys.routing_engine);
    }
  } catch (error) {
    console.error('Error storing API keys to storage:', error);
  }
}

// Clear stored API keys
export function clearStoredApiKeys(): void {
  try {
    localStorage.removeItem(`${API_KEY_STORAGE_PREFIX}gh`);
    localStorage.removeItem(`${API_KEY_STORAGE_PREFIX}ors`);
    localStorage.removeItem(`${API_KEY_STORAGE_PREFIX}engine`);
  } catch (error) {
    console.error('Error clearing API keys from storage:', error);
  }
}