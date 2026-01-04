import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Navigation, Info, ExternalLink, Menu, X } from 'lucide-react';
import { SearchInput } from './components/SearchInput';
import { Map } from './components/Map';
import type { GeocodeResult } from './services/nominatim';
import { fetchCameras } from './services/overpass';
import type { Camera } from './services/overpass';
import { getRoute } from './services/graphhopper';
import type { StealthMode, RouteResponse } from './services/graphhopper';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const App: React.FC = () => {
  const [start, setStart] = useState<GeocodeResult | null>(null);
  const [end, setEnd] = useState<GeocodeResult | null>(null);
  const [mode, setMode] = useState<StealthMode>('balanced');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; time: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gh_api_key') || '');

  const handleRoute = async () => {
    if (!start || !end) return;
    if (!apiKey) {
      alert('Please enter a GraphHopper API Key in the settings.');
      return;
    }
    
    localStorage.setItem('gh_api_key', apiKey);

    setLoading(true);
    try {
      console.log('Starting route calculation...');
      const sLat = parseFloat(start.lat);
      const sLon = parseFloat(start.lon);
      const eLat = parseFloat(end.lat);
      const eLon = parseFloat(end.lon);
      
      const south = Math.min(sLat, eLat) - 0.05;
      const north = Math.max(sLat, eLat) + 0.05;
      const west = Math.min(sLon, eLon) - 0.05;
      const east = Math.max(sLon, eLon) + 0.05;

      console.log('Fetching cameras from Overpass...');
      const fetchedCameras = await fetchCameras([south, west, north, east]);
      console.log(`Fetched ${fetchedCameras.length} cameras.`);
      setCameras(fetchedCameras);

      console.log('Requesting route from GraphHopper with mode:', mode);
      const response: RouteResponse = await getRoute(
        [sLat, sLon],
        [eLat, eLon],
        fetchedCameras.slice(0, 50), // Limit to 50 cameras to avoid exceeding area limits
        mode,
        apiKey
      );
      console.log('GraphHopper response received:', response);

      if (response.paths && response.paths.length > 0) {
        const path = response.paths[0];
        const coords = path.points.coordinates.map(c => [c[1], c[0]] as [number, number]);
        setRoute(coords);
        setRouteInfo({
          distance: path.distance,
          time: path.time,
        });
      }
    } catch (error: any) {
      console.error('Routing failed details:', error);
      const message = error.response?.data?.message || error.message || 'Unknown error';
      alert(`Routing failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (m: number) => (m / 1609.34).toFixed(1) + ' miles';
  const formatTime = (ms: number) => Math.round(ms / 60000) + ' min';

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
            <SearchInput 
              label="START LOCATION"
              placeholder="Enter start address..." 
              onSelect={setStart} 
            />
            <SearchInput 
              label="DESTINATION"
              placeholder="Enter destination..." 
              onSelect={setEnd} 
            />

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-400 ml-1 uppercase">GraphHopper API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API Key..."
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
              <p className="text-[10px] text-gray-500 px-1">
                Required for routing. Get one at <a href="https://graphhopper.com/dashboard" target="_blank" className="text-blue-500 hover:underline">graphhopper.com</a>
              </p>
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
              <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-4 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-300 font-medium">Distance</span>
                  <span className="text-white font-bold">{formatDistance(routeInfo.distance)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-300 font-medium">Est. Time</span>
                  <span className="text-white font-bold">{formatTime(routeInfo.time)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-300 font-medium">Cameras Avoided</span>
                  <span className="text-white font-bold">{cameras.length} spotted</span>
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
        />
      </div>
    </div>
  );
};

export default App;