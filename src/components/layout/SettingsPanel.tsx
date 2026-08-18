import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ShieldAlert, ShieldCheck, Navigation, Eye, EyeOff } from 'lucide-react';
import type { StealthMode } from '../../services/graphhopper';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SettingsPanel: React.FC = () => {
  const { 
    engine, setEngine, ghApiKey, setGhApiKey, orsApiKey, setOrsApiKey,
    sessionOnlyKeys, setSessionOnlyKeys, mode, setMode,
    showFastestRoute, setShowFastestRoute, cameraLoading,
    ghBaseUrl, setGhBaseUrl
  } = useNavigation();

  return (
    <div className="space-y-6">
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
          {(['graphhopper', 'openrouteservice'] as const).map((e) => (
            <button
              key={e}
              onClick={() => setEngine(e)}
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
        {engine === 'graphhopper' && (
          <input
            type="text"
            value={ghBaseUrl}
            onChange={(e) => setGhBaseUrl(e.target.value)}
            placeholder="Custom GH server URL (optional)"
            className="w-full bg-gray-900 text-white rounded-lg px-3 py-2 border border-gray-700 text-xs focus:border-blue-500 outline-none mt-2"
          />
        )}
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
    </div>
  );
};
