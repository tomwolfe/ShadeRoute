import React, { useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Navigation, Info, Menu, X, Trash2, Eye, EyeOff } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SearchInput } from './components/SearchInput';
import { Map } from './components/Map';
import { reverseGeocode } from './services/nominatim';
import type { StealthMode } from './services/graphhopper';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigation } from './context/NavigationContext';
import { useCameras } from './hooks/useCameras';
import { useRouting } from './hooks/useRouting';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const App: React.FC = () => {
  const {
    start, setStart, end, setEnd, mode, setMode, engine, setEngine,
    stealthRoute, fastestRoute, loading, error, setError,
    ghApiKey, setGhApiKey, orsApiKey, setOrsApiKey,
    sidebarOpen, setSidebarOpen, sessionOnlyKeys, setSessionOnlyKeys,
    showFastestRoute, setShowFastestRoute, clearAllData
  } = useNavigation();

  const { cameras, loading: cameraLoading, getCamerasForRoute, clearCache } = useCameras();
  const { calculateRoute } = useRouting();

  useEffect(() => {
    const autoFetch = async () => {
      if (start && end) {
        const fetchedCameras = await getCamerasForRoute(
          parseFloat(start.lat), parseFloat(start.lon),
          parseFloat(end.lat), parseFloat(end.lon)
        );
        if (fetchedCameras.length > 0 && !stealthRoute) {
          // Optional: trigger initial route calculation if cameras are found
        }
      }
    };
    const timer = setTimeout(autoFetch, 500);
    return () => clearTimeout(timer);
  }, [start, end, getCamerasForRoute, stealthRoute]);

  const handleRoute = async () => {
    const currentCameras = await getCamerasForRoute(
      parseFloat(start!.lat), parseFloat(start!.lon),
      parseFloat(end!.lat), parseFloat(end!.lon)
    );
    await calculateRoute(currentCameras);
  };

  const handleMapClick = async (lat: number, lon: number) => {
    const result = await reverseGeocode(lat, lon);
    if (result) {
      if (!start) setStart(result);
      else setEnd(result);
    }
  };

  const formatDistance = (m: number) => (m / 1609.34).toFixed(1) + ' miles';
  const formatTime = (ms: number) => Math.round(ms / 60000) + ' min';
  const getPenalty = () => {
    if (!stealthRoute || !fastestRoute) return null;
    const timeDiff = stealthRoute.time - fastestRoute.time;
    return timeDiff > 0 ? Math.round(timeDiff / 60000) : null;
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white overflow-hidden relative font-sans">
      <Analytics />
      
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

      <div className={cn(
        "absolute md:relative z-30 h-full w-full md:w-96 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="hidden md:flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Shield className="text-blue-500" size={32} />
              <h1 className="text-2xl font-bold tracking-tight">ShadeRoute</h1>
            </div>
            <button 
              onClick={() => { clearAllData(); clearCache(); }}
              className="p-2 text-gray-500 hover:text-red-400 transition-colors"
              title="Forget everything"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <SearchInput label="START" placeholder="Start..." onSelect={setStart} value={start?.display_name || ''} />
                {start && <button onClick={() => setStart(null)} className="absolute right-2 top-7 text-gray-500"><X size={14}/></button>}
              </div>
              <div className="relative">
                <SearchInput label="DESTINATION" placeholder="End..." onSelect={setEnd} value={end?.display_name || ''} />
                {end && <button onClick={() => setEnd(null)} className="absolute right-2 top-7 text-gray-500"><X size={14}/></button>}
              </div>
            </div>

            <div className="space-y-4 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Provider</label>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-500 flex items-center gap-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={sessionOnlyKeys} 
                      onChange={(e) => setSessionOnlyKeys(e.target.checked)}
                      className="rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-0"
                    />
                    Session only
                  </label>
                  {cameraLoading && <span className="text-[10px] text-blue-400 animate-pulse">Syncing...</span>}
                </div>
              </div>
              
              <div className="flex gap-1 p-1 bg-gray-900 rounded-lg">
                {['graphhopper', 'openrouteservice'].map((e) => (
                  <button
                    key={e}
                    onClick={() => setEngine(e as any)}
                    className={cn(
                      "flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all",
                      engine === e ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {e === 'graphhopper' ? 'GH' : 'ORS'}
                  </button>
                ))}
              </div>

              <input
                type="password"
                value={engine === 'graphhopper' ? ghApiKey : orsApiKey}
                onChange={(e) => engine === 'graphhopper' ? setGhApiKey(e.target.value) : setOrsApiKey(e.target.value)}
                placeholder="Enter API Key..."
                className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 border border-gray-700 text-xs focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase">Stealth Level</label>
                <button 
                  onClick={() => setShowFastestRoute(!showFastestRoute)}
                  className="text-[10px] text-gray-500 flex items-center gap-1 hover:text-gray-300"
                >
                  {showFastestRoute ? <Eye size={12}/> : <EyeOff size={12}/>}
                  Fastest Route
                </button>
              </div>
              <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
                {(['speed', 'balanced', 'stealth'] as StealthMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
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
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Navigation size={18} />Calculate</>}
            </button>

            {stealthRoute && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <div className={cn("p-4 flex items-center justify-between", stealthRoute.stealthScore > 80 ? "bg-green-600/10" : stealthRoute.stealthScore > 50 ? "bg-yellow-600/10" : "bg-red-600/10")}>
                    <div>
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase">Score</h3>
                      <p className={cn("text-2xl font-black", stealthRoute.stealthScore > 80 ? "text-green-400" : stealthRoute.stealthScore > 50 ? "text-yellow-400" : "text-red-400")}>{stealthRoute.stealthScore}</p>
                    </div>
                    <div className="text-right">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase">Cameras</h3>
                      <p className="text-xl font-bold">{stealthRoute.cameraCount}</p>
                    </div>
                  </div>
                  {getPenalty() !== null && (
                    <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700 flex items-center gap-2 text-[10px] text-gray-400">
                      <Info size={12} className="text-blue-400" />
                      <span>+{getPenalty()} min penalty vs fastest.</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-center">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase">Distance</span>
                    <span className="text-sm font-bold">{formatDistance(stealthRoute.distance)}</span>
                  </div>
                  <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-center">
                    <span className="block text-[10px] font-bold text-gray-500 uppercase">Time</span>
                    <span className="text-sm font-bold">{formatTime(stealthRoute.time)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 relative z-10">
        <Map 
          center={[37.7749, -122.4194]} zoom={12} cameras={cameras} 
          stealthRoute={stealthRoute?.coordinates || null}
          fastestRoute={fastestRoute?.coordinates || null}
          showFastestRoute={showFastestRoute}
          startPoint={start ? [parseFloat(start.lat), parseFloat(start.lon)] : null}
          endPoint={end ? [parseFloat(end.lat), parseFloat(end.lon)] : null}
          onMapClick={handleMapClick}
        />
      </div>
    </div>
  );
};

export default App;
