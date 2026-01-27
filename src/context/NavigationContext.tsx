import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { GeocodeResult } from '../services/nominatim';
import { reverseGeocode } from '../services/nominatim';
import type { StealthMode } from '../services/graphhopper';
import { getStoredApiKeys, storeApiKeys } from '../services/apiKeys';

type RoutingEngine = 'graphhopper' | 'openrouteservice';

interface RouteData {
  coordinates: [number, number][];
  distance: number;
  time: number;
  instructions: Array<{ text: string; distance: number; time: number }>;
  cameraCount: number;
  stealthScore: number;
}

interface NavigationContextType {
  start: GeocodeResult | null;
  setStart: (res: GeocodeResult | null) => void;
  end: GeocodeResult | null;
  setEnd: (res: GeocodeResult | null) => void;
  mode: StealthMode;
  setMode: (mode: StealthMode) => void;
  engine: RoutingEngine;
  setEngine: (engine: RoutingEngine) => void;
  stealthRoute: RouteData | null;
  setStealthRoute: (route: RouteData | null) => void;
  fastestRoute: RouteData | null;
  setFastestRoute: (route: RouteData | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  cameraLoading: boolean;
  setCameraLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  ghApiKey: string;
  setGhApiKey: (key: string) => void;
  orsApiKey: string;
  setOrsApiKey: (key: string) => void;
  sessionOnlyKeys: boolean;
  setSessionOnlyKeys: (val: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  showFastestRoute: boolean;
  setShowFastestRoute: (val: boolean) => void;
  clearAllData: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const storedKeys = getStoredApiKeys();
  const [start, setStart] = useState<GeocodeResult | null>(null);
  const [end, setEnd] = useState<GeocodeResult | null>(null);
  const [mode, setMode] = useState<StealthMode>('balanced');
  const [engine, setEngine] = useState<RoutingEngine>(storedKeys.routing_engine || 'graphhopper');
  const [stealthRoute, setStealthRoute] = useState<RouteData | null>(null);
  const [fastestRoute, setFastestRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionOnlyKeys, setSessionOnlyKeys] = useState(false);
  const [showFastestRoute, setShowFastestRoute] = useState(true);
  
  const [ghApiKey, setGhApiKey] = useState(storedKeys.gh_api_key || '');
  const [orsApiKey, setOrsApiKey] = useState(storedKeys.ors_api_key || '');

  // Handle URL state sync
  useEffect(() => {
    const loadFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const startParam = params.get('start');
      const endParam = params.get('end');
      
      if (startParam) {
        const [lat, lon] = startParam.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lon)) {
          const res = await reverseGeocode(lat, lon);
          if (res) setStart(res);
        }
      }
      if (endParam) {
        const [lat, lon] = endParam.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lon)) {
          const res = await reverseGeocode(lat, lon);
          if (res) setEnd(res);
        }
      }
    };
    loadFromUrl();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (start) params.set('start', `${start.lat},${start.lon}`);
    else params.delete('start');
    if (end) params.set('end', `${end.lat},${end.lon}`);
    else params.delete('end');
    
    const newRelativePathQuery = window.location.pathname + '?' + params.toString();
    window.history.pushState(null, '', newRelativePathQuery);
  }, [start, end]);

  const clearAllData = useCallback(() => {
    localStorage.clear();
    setStart(null);
    setEnd(null);
    setStealthRoute(null);
    setFastestRoute(null);
    setGhApiKey('');
    setOrsApiKey('');
    setError(null);
    window.history.pushState(null, '', window.location.pathname);
  }, []);

  useEffect(() => {
    if (!sessionOnlyKeys) {
      storeApiKeys({
        gh_api_key: ghApiKey,
        ors_api_key: orsApiKey,
        routing_engine: engine
      });
    }
  }, [ghApiKey, orsApiKey, engine, sessionOnlyKeys]);

  return (
    <NavigationContext.Provider value={{
      start, setStart,
      end, setEnd,
      mode, setMode,
      engine, setEngine,
      stealthRoute, setStealthRoute,
      fastestRoute, setFastestRoute,
      loading, setLoading,
      cameraLoading, setCameraLoading,
      error, setError,
      ghApiKey, setGhApiKey,
      orsApiKey, setOrsApiKey,
      sessionOnlyKeys, setSessionOnlyKeys,
      sidebarOpen, setSidebarOpen,
      showFastestRoute, setShowFastestRoute,
      clearAllData
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
