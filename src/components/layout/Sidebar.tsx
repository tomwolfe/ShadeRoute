import React from 'react';
import { Shield, Trash2, Navigation } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useCameras } from '../../hooks/useCameras';
import { useRouting } from '../../hooks/useRouting';
import { RouteControls } from './RouteControls';
import { SettingsPanel } from './SettingsPanel';
import { RouteStats } from './RouteStats';
import { DirectionsList } from './DirectionsList';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Sidebar: React.FC = () => {
  const { 
    start, end, loading, sidebarOpen, clearAllData, setCameraLoading
  } = useNavigation();
  const { getCamerasForRoute, clearCache } = useCameras();
  const { calculateRoute } = useRouting();

  const handleRoute = async () => {
    if (!start || !end) return;
    setCameraLoading(true);
    const currentCameras = await getCamerasForRoute(
      parseFloat(start.lat), parseFloat(start.lon),
      parseFloat(end.lat), parseFloat(end.lon)
    );
    setCameraLoading(false);
    await calculateRoute(currentCameras);
  };

  return (
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
          <RouteControls />
          <SettingsPanel />

          <button
            onClick={handleRoute}
            disabled={!start || !end || loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Navigation size={18} />
                Calculate
              </>
            )}
          </button>

          <RouteStats />
          <DirectionsList />
        </div>
      </div>

      <div className="p-6 border-t border-gray-800">
        <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            ShadeRoute identifies surveillance clusters using OSM & DeFlock data. Always prioritize safety and legal compliance.
          </p>
        </div>
      </div>
    </div>
  );
};
