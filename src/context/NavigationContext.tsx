import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { GeocodeResult } from '../services/nominatim';

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
  ghBaseUrl: string;
  setGhBaseUrl: (url: string) => void;
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
  const [sessionOnlyKeys, setSessionOnlyKeys] = useState(true);
  const [showFastestRoute, setShowFastestRoute] = useState(true);
  
  const [ghApiKey, setGhApiKey] = useState(storedKeys.gh_api_key || '');
  const [orsApiKey, setOrsApiKey] = useState(storedKeys.ors_api_key || '');
  const [ghBaseUrl, setGhBaseUrl] = useState(storedKeys.gh_base_url || 'https://graphhopper.com/api/1');

  // Persist start/end to sessionStorage instead of URL
  useEffect(() => {
    if (start) {
      sessionStorage.setItem('shaderoute_start', JSON.stringify(start));
    } else {
      sessionStorage.removeItem('shaderoute_start');
    }
    if (end) {
      sessionStorage.setItem('shaderoute_end', JSON.stringify(end));
    } else {
      sessionStorage.removeItem('shaderoute_end');
    }
  }, [start, end]);

  // Load start/end from sessionStorage on mount
  useEffect(() => {
    const storedStart = sessionStorage.getItem('shaderoute_start');
    const storedEnd = sessionStorage.getItem('shaderoute_end');
    
    if (storedStart) {
      const parsedStart = JSON.parse(storedStart);
      setStart(parsedStart);
    }
    if (storedEnd) {
      const parsedEnd = JSON.parse(storedEnd);
      setEnd(parsedEnd);
    }
  }, []);

  const clearAllData = useCallback(() => {
    localStorage.clear();
    sessionStorage.removeItem('shaderoute_start');
    sessionStorage.removeItem('shaderoute_end');
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
    storeApiKeys({
      gh_api_key: ghApiKey,
      ors_api_key: orsApiKey,
      routing_engine: engine,
      gh_base_url: ghBaseUrl
    }, !sessionOnlyKeys);
  }, [ghApiKey, orsApiKey, engine, ghBaseUrl, sessionOnlyKeys]);

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
      ghBaseUrl, setGhBaseUrl,
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
