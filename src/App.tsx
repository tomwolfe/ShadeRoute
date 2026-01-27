import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Navigation, Info, Menu, X } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SearchInput } from './components/SearchInput';
import { Map } from './components/Map';
import type { GeocodeResult } from './services/nominatim';
import { reverseGeocode } from './services/nominatim';
import { fetchCameras } from './services/overpass';
import type { Camera } from './services/overpass';
import { getRoute } from './services/graphhopper';
import { getORSRoute } from './services/openrouteservice';
import type { StealthMode } from './services/graphhopper';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateBBox, bboxToArray, calculateDistance } from './utils';
import { getStoredApiKeys, storeApiKeys } from './services/apiKeys';
import { countCamerasNearRoute, calculateStealthScore } from './utils/risk';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type RoutingEngine = 'graphhopper' | 'openrouteservice';

interface RouteData {
  coordinates: [number, number][];
  distance: number;
  time: number;
  instructions: Array<{ text: string; distance: number; time: number }>;
  cameraCount: number;
  stealthScore: number;
}

const App: React.FC = () => {
  const [start, setStart] = useState<GeocodeResult | null>(null);
  const [end, setEnd] = useState<GeocodeResult | null>(null);
  const [mode, setMode] = useState<StealthMode>('balanced');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [stealthRoute, setStealthRoute] = useState<RouteData | null>(null);
  const [fastestRoute, setFastestRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const storedKeys = getStoredApiKeys();
  const [ghApiKey, setGhApiKey] = useState(storedKeys.gh_api_key || '');
  const [orsApiKey, setOrsApiKey] = useState(storedKeys.ors_api_key || '');
  const [engine, setEngine] = useState<RoutingEngine>(storedKeys.routing_engine || 'graphhopper');
  const lastFetchedCenter = React.useRef<{ lat: number, lon: number } | null>(null);
  const lastFetchedCameras = React.useRef<Camera[]>([]);

  useEffect(() => {
    const autoFetchCameras = async () => {
      if (start && end) {
        const sLat = parseFloat(start.lat);
        const sLon = parseFloat(start.lon);
        const eLat = parseFloat(end.lat);
        const eLon = parseFloat(end.lon);
        
        const centerLat = (sLat + eLat) / 2;
        const centerLon = (sLon + eLon) / 2;

        if (lastFetchedCenter.current) {
          const dist = calculateDistance(
            centerLat, centerLon, 
            lastFetchedCenter.current.lat, lastFetchedCenter.current.lon
          );
          if (dist < 5) return; // 5km threshold
        }

        setCameraLoading(true);
        try {
          const bbox = calculateBBox(sLat, sLon, eLat, eLon);
          const fetched = await fetchCameras(bboxToArray(bbox));
          setCameras(fetched);
          lastFetchedCameras.current = fetched;
          lastFetchedCenter.current = { lat: centerLat, lon: centerLon };
        } catch (err) {
          console.error('Auto-fetch cameras failed:', err);
        } finally {
          setCameraLoading(false);
        }
      }
    };

    const timer = setTimeout(autoFetchCameras, 500);
    return () => clearTimeout(timer);
  }, [start, end]);

  const handleRoute = async () => {
    if (!start || !end) return;
    setError(null);
    
    if (engine === 'graphhopper' && !ghApiKey) {
      setError('Please enter a GraphHopper API Key.');
      return;
    }
    if (engine === 'openrouteservice' && !orsApiKey) {
      setError('Please enter an OpenRouteService API Key.');
      return;
    }
    
    storeApiKeys({
      gh_api_key: ghApiKey,
      ors_api_key: orsApiKey,
      routing_engine: engine
    });

    setLoading(true);
    try {
      const sLat = parseFloat(start.lat);
      const sLon = parseFloat(start.lon);
      const eLat = parseFloat(end.lat);
      const eLon = parseFloat(end.lon);

      let currentCameras = cameras.length > 0 ? cameras : lastFetchedCameras.current;
      if (currentCameras.length === 0) {
        setCameraLoading(true);
        const bbox = calculateBBox(sLat, sLon, eLat, eLon);
        currentCameras = await fetchCameras(bboxToArray(bbox));
        setCameras(currentCameras);
        lastFetchedCameras.current = currentCameras;
        setCameraLoading(false);
      }

      const fetchRoute = async (m: StealthMode): Promise<RouteData> => {
        if (engine === 'graphhopper') {
          const response = await getRoute([sLat, sLon], [eLat, eLon], currentCameras, m, ghApiKey);
          const path = response.paths[0];
          const coords = path.points.coordinates.map(c => [c[1], c[0]] as [number, number]);
          const camCount = countCamerasNearRoute(coords, currentCameras);
          return {
            coordinates: coords,
            distance: path.distance,
            time: path.time,
            instructions: path.instructions,
            cameraCount: camCount,
            stealthScore: calculateStealthScore(camCount)
          };
        } else {
          const result = await getORSRoute([sLat, sLon], [eLat, eLon], currentCameras, m, orsApiKey);
          const camCount = countCamerasNearRoute(result.coordinates, currentCameras);
          return {
            ...result,
            cameraCount: camCount,
            stealthScore: calculateStealthScore(camCount)
          };
        }
      };

      // Fetch both for comparison
      const [stealthRes, fastestRes] = await Promise.all([
        fetchRoute(mode),
        fetchRoute('speed')
      ]);

      setStealthRoute(stealthRes);
      setFastestRoute(fastestRes);

    } catch (error: unknown) {
      let message = 'Routing failed';
      if (error instanceof Error) message = error.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (m: number) => (m / 1609.34).toFixed(1) + ' miles';
  const formatTime = (ms: number) => Math.round(ms / 60000) + ' min';

  const handleMapClick = async (lat: number, lon: number) => {
    const result = await reverseGeocode(lat, lon);
    if (result) {
      if (!start) {
        setStart(result);
      } else {
        setEnd(result);
      }
    }
  };

  const getPenalty = () => {
    if (!stealthRoute || !fastestRoute) return null;
    const timeDiff = stealthRoute.time - fastestRoute.time;
    if (timeDiff <= 0) return null;
    return Math.round(timeDiff / 60000);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white overflow-hidden relative font-sans">
      <Analytics />
      
      {/* Toast Error */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <ShieldAlert size={18} />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:bg-white/20 rounded-full p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Mobile Header */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 flex justify-between items-center md:hidden bg-gray-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-500" size={24} />
          <h1 className="text-xl font-bold tracking-tight text-white">ShadeRoute</h1>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-gray-800 rounded-lg">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar / Controls */}
      <div className={cn(
        "absolute md:relative z-30 h-full w-full md:w-96 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="hidden md:flex items-center gap-3 mb-8">
            <Shield className="text-blue-500" size={32} />
            <h1 className="text-2xl font-bold tracking-tight">ShadeRoute</h1>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <SearchInput 
                label="START LOCATION"
                placeholder="Enter start address..." 
                onSelect={setStart}
                value={start?.display_name || ''}
              />
              {start && (
                <button 
                  onClick={() => { setStart(null); setStealthRoute(null); setFastestRoute(null); }}
                  className="absolute right-2 top-7 p-1 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="relative group">
              <SearchInput 
                label="DESTINATION"
                placeholder="Enter destination..." 
                onSelect={setEnd}
                value={end?.display_name || ''}
              />
              {end && (
                <button 
                  onClick={() => { setEnd(null); setStealthRoute(null); setFastestRoute(null); }}
                  className="absolute right-2 top-7 p-1 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="space-y-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Routing Provider</label>
                {cameraLoading && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-blue-400 font-medium">Updating cameras...</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {(['graphhopper', 'openrouteservice'] as RoutingEngine[]).map((e) => (
                  <button
                    key={e}
                    onClick={() => setEngine(e)}
                    className={cn(
                      "flex-1 py-2 px-1 rounded-lg text-[10px] font-bold uppercase transition-all border",
                      engine === e 
                        ? "bg-blue-600/20 border-blue-500 text-blue-400" 
                        : "bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {e === 'graphhopper' ? 'GraphHopper' : 'OpenRouteService'}
                  </button>
                ))}
              </div>

              {engine === 'graphhopper' ? (
                <div className="space-y-1">
                  <label className="block text-[10px] font-medium text-gray-500 ml-1 uppercase">GraphHopper API Key</label>
                  <input
                    type="password"
                    value={ghApiKey}
                    onChange={(e) => setGhApiKey(e.target.value)}
                    placeholder="Enter GH API Key..."
                    className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors text-xs"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[10px] font-medium text-gray-500 ml-1 uppercase">ORS API Key</label>
                  <input
                    type="password"
                    value={orsApiKey}
                    onChange={(e) => setOrsApiKey(e.target.value)}
                    placeholder="Enter ORS API Key..."
                    className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors text-xs"
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-400 ml-1">STEALTH INTENSITY</label>
              <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
                {(['speed', 'balanced', 'stealth'] as StealthMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                      mode === m ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-200"
                    )}
                  >
                    {m === 'speed' && <Navigation size={14} />}
                    {m === 'balanced' && <ShieldAlert size={14} />}
                    {m === 'stealth' && <ShieldCheck size={14} />}
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRoute}
              disabled={!start || !end || loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Navigation size={18} />
                  Calculate Routes
                </>
              )}
            </button>

            {stealthRoute && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Score Panel */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <div className={cn(
                    "p-4 flex items-center justify-between",
                    stealthRoute.stealthScore > 80 ? "bg-green-600/10" : 
                    stealthRoute.stealthScore > 50 ? "bg-yellow-600/10" : "bg-red-600/10"
                  )}>
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase">Stealth Score</h3>
                      <p className={cn(
                        "text-2xl font-black",
                        stealthRoute.stealthScore > 80 ? "text-green-400" : 
                        stealthRoute.stealthScore > 50 ? "text-yellow-400" : "text-red-400"
                      )}>{stealthRoute.stealthScore}/100</p>
                    </div>
                    <div className="text-right">
                      <h3 className="text-xs font-bold text-gray-400 uppercase">Cameras Avoided</h3>
                      <p className="text-xl font-bold">{stealthRoute.cameraCount}</p>
                    </div>
                  </div>
                  
                  {getPenalty() && (
                    <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700 flex items-center gap-2 text-[10px] text-gray-400">
                      <Info size={12} className="text-blue-400" />
                      <span>Stealth Penalty: +{getPenalty()} min compared to fastest route.</span>
                    </div>
                  )}
                </div>

                {/* Route Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase">Distance</span>
                    <span className="text-sm font-bold">{formatDistance(stealthRoute.distance)}</span>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase">Duration</span>
                    <span className="text-sm font-bold">{formatTime(stealthRoute.time)}</span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase px-1">Turn-by-Turn</h3>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-xl max-h-64 overflow-y-auto custom-scrollbar">
                    {stealthRoute.instructions.map((inst, idx) => (
                      <div key={idx} className="p-3 border-b border-gray-700/50 last:border-0 flex gap-3 items-start hover:bg-gray-800 transition-colors">
                        <div className="mt-0.5 p-1 bg-gray-900 rounded text-blue-400">
                          <Navigation size={12} className={cn(idx === 0 && "rotate-0")} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs text-gray-200 leading-tight">{inst.text}</p>
                          <p className="text-[10px] text-gray-500 font-medium">
                            {inst.distance > 0 ? `${(inst.distance * 0.000621371).toFixed(2)} mi` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <Info size={18} className="text-blue-400 shrink-0" />
            <p className="text-[10px] text-gray-400 leading-relaxed">
              ShadeRoute identifies surveillance clusters using OSM & DeFlock data. Always prioritize safety and legal compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Map Display */}
      <div className="flex-1 relative z-10">
        <Map 
          center={[37.7749, -122.4194]} 
          zoom={12} 
          cameras={cameras} 
          stealthRoute={stealthRoute?.coordinates || null}
          fastestRoute={fastestRoute?.coordinates || null}
          startPoint={start ? [parseFloat(start.lat), parseFloat(start.lon)] : null}
          endPoint={end ? [parseFloat(end.lat), parseFloat(end.lon)] : null}
          onMapClick={handleMapClick}
        />
      </div>
    </div>
  );
};

export default App;