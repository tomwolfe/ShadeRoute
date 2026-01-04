import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Navigation, Info, ExternalLink, Menu, X } from 'lucide-react';
import { SearchInput } from './components/SearchInput';
import { Map } from './components/Map';
import type { GeocodeResult } from './services/nominatim';
import { reverseGeocode } from './services/nominatim';
import { fetchCameras } from './services/overpass';
import type { Camera } from './services/overpass';
import { getRoute } from './services/graphhopper';
import { getORSRoute } from './services/openrouteservice';
import type { StealthMode, RouteResponse } from './services/graphhopper';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculateBBox, bboxToArray } from './utils';
import { getStoredApiKeys, storeApiKeys } from './services/apiKeys';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type RoutingEngine = 'graphhopper' | 'openrouteservice';

const App: React.FC = () => {
  const [start, setStart] = useState<GeocodeResult | null>(null);
  const [end, setEnd] = useState<GeocodeResult | null>(null);
  const [mode, setMode] = useState<StealthMode>('balanced');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; time: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const storedKeys = getStoredApiKeys();
  const [ghApiKey, setGhApiKey] = useState(storedKeys.gh_api_key || '');
  const [orsApiKey, setOrsApiKey] = useState(storedKeys.ors_api_key || '');
  const [engine, setEngine] = useState<RoutingEngine>(storedKeys.routing_engine || 'graphhopper');
  const lastFetchedBBox = React.useRef<string>('');
  const lastFetchedCameras = React.useRef<Camera[]>([]);

  useEffect(() => {
    const autoFetchCameras = async () => {
      if (start && end) {
        const bbox = calculateBBox(
          parseFloat(start.lat),
          parseFloat(start.lon),
          parseFloat(end.lat),
          parseFloat(end.lon)
        );
        const bboxString = JSON.stringify(bbox);

        if (bboxString === lastFetchedBBox.current) return;
        lastFetchedBBox.current = bboxString;

        try {
          const fetched = await fetchCameras(bboxToArray(bbox));
          setCameras(fetched);
          lastFetchedCameras.current = fetched; // Cache the fetched cameras
        } catch (err) {
          console.error('Auto-fetch cameras failed:', err);
        }
      }
    };

    // Debounce the camera fetching to avoid too many requests
    const timer = setTimeout(autoFetchCameras, 300);
    return () => clearTimeout(timer);
  }, [start, end]);

  const handleRoute = async () => {
    if (!start || !end) return;
    
    if (engine === 'graphhopper' && !ghApiKey) {
      alert('Please enter a GraphHopper API Key.');
      return;
    }
    if (engine === 'openrouteservice' && !orsApiKey) {
      alert('Please enter an OpenRouteService API Key.');
      return;
    }
    
    storeApiKeys({
      gh_api_key: ghApiKey,
      ors_api_key: orsApiKey,
      routing_engine: engine
    });

    setLoading(true);
    try {
      console.log(`Starting route calculation using ${engine}...`);
      const sLat = parseFloat(start.lat);
      const sLon = parseFloat(start.lon);
      const eLat = parseFloat(end.lat);
      const eLon = parseFloat(end.lon);

      // Use cached cameras if available, otherwise fetch new ones
      let currentCameras = cameras.length > 0 ? cameras : lastFetchedCameras.current;
      if (currentCameras.length === 0) {
        const bbox = calculateBBox(sLat, sLon, eLat, eLon);
        currentCameras = await fetchCameras(bboxToArray(bbox));
        setCameras(currentCameras);
        lastFetchedCameras.current = currentCameras; // Update cache
      }

      if (engine === 'graphhopper') {
        const response: RouteResponse = await getRoute(
          [sLat, sLon],
          [eLat, eLon],
          currentCameras,
          mode,
          ghApiKey
        );

        if (response.paths && response.paths.length > 0) {
          const path = response.paths[0];
          const coords = path.points.coordinates.map(c => [c[1], c[0]] as [number, number]);
          setRoute(coords);
          setRouteInfo({
            distance: path.distance,
            time: path.time,
          });
        }
      } else {
        const result = await getORSRoute(
          [sLat, sLon],
          [eLat, eLon],
          currentCameras,
          mode,
          orsApiKey
        );
        setRoute(result.coordinates);
        setRouteInfo({
          distance: result.distance,
          time: result.time,
        });
      }
    } catch (error: unknown) {
      console.error('Routing failed details:', error);

      // Type guard to check if error is an Axios error
      let message = 'Unknown error';
      if (error instanceof Error) {
        message = error.message;

        // Check if it's an Axios error with response data
        if ('response' in error && typeof error.response === 'object' && error.response !== null && 'data' in error.response && typeof error.response.data === 'object' && error.response.data !== null) {
          const responseData = error.response.data as { message?: string };
          if (responseData.message) {
            message = responseData.message;
          }
        }
      }

      if (engine === 'graphhopper' && message.includes('flexible mode')) {
        message = "GraphHopper Free tier does not support 'Balanced' or 'Stealth' modes. Please use 'Speed' mode, upgrade your GraphHopper plan, or switch to OpenRouteService.";
      }

      alert(`Routing failed: ${message}`);
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

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white overflow-hidden relative font-sans">
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
        <div className="p-6 flex-1 overflow-y-auto">
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
                  onClick={() => { setStart(null); setRoute(null); setRouteInfo(null); }}
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
                  onClick={() => { setEnd(null); setRoute(null); setRouteInfo(null); }}
                  className="absolute right-2 top-7 p-1 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="space-y-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Routing Provider</label>
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
                  <p className="text-[9px] text-gray-600 px-1">
                    Free tier: 'Speed' mode only.
                  </p>
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
                  <p className="text-[9px] text-gray-600 px-1">
                    Free tier supports all modes. Get at <a href="https://openrouteservice.org" target="_blank" className="text-blue-500 hover:underline">openrouteservice.org</a>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-400 ml-1">ROUTE PRIORITY</label>
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
              <p className="text-[10px] text-gray-500 px-1 leading-relaxed">
                {mode === 'speed' && "Standard fastest route. No ALPR avoidance."}
                {mode === 'balanced' && "Avoids direct camera hits with moderate travel time increases."}
                {mode === 'stealth' && "Maximum avoidance. Penalizes major roads with known surveillance."}
              </p>
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
                  Calculate Stealth Route
                </>
              )}
            </button>

            {routeInfo && (
              <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center text-sm border-b border-blue-900/30 pb-2">
                  <span className="text-blue-300 font-medium">Distance</span>
                  <span className="text-white font-bold">{formatDistance(routeInfo.distance)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-blue-900/30 pb-2">
                  <span className="text-blue-300 font-medium">Est. Time</span>
                  <span className="text-white font-bold">{formatTime(routeInfo.time)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-300 font-medium">Cameras in Area</span>
                  <span className="text-white font-bold">{cameras.length} spotted</span>
                </div>
                <div className="mt-2 pt-2 bg-blue-500/10 rounded-lg p-2 text-[10px] text-blue-200 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-400" />
                  Route optimized to avoid detection.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <Info size={18} className="text-blue-400 shrink-0" />
            <p className="text-[10px] text-gray-400">
              ShadeRoute uses OpenStreetMap data from the DeFlock community to identify ALPR locations.
            </p>
          </div>
          <a 
            href="https://deflock.me" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors group"
          >
            Report new camera to DeFlock
            <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>

      {/* Map Display */}
      <div className="flex-1 relative z-10">
        <Map 
          center={[37.7749, -122.4194]} 
          zoom={12} 
          cameras={cameras} 
          route={route}
          startPoint={start ? [parseFloat(start.lat), parseFloat(start.lon)] : null}
          endPoint={end ? [parseFloat(end.lat), parseFloat(end.lon)] : null}
          onMapClick={handleMapClick}
        />
      </div>
    </div>
  );
};

export default App;