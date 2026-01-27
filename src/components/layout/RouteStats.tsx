import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RouteStats: React.FC = () => {
  const { stealthRoute, fastestRoute } = useNavigation();

  if (!stealthRoute) return null;

  const formatDistance = (m: number) => (m / 1609.34).toFixed(1) + ' miles';
  const formatTime = (ms: number) => Math.round(ms / 60000) + ' min';
  const getPenalty = () => {
    if (!stealthRoute || !fastestRoute) return null;
    const timeDiff = stealthRoute.time - fastestRoute.time;
    return timeDiff > 0 ? Math.round(timeDiff / 60000) : null;
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className={cn(
          "p-4 flex items-center justify-between", 
          stealthRoute.stealthScore > 80 ? "bg-green-600/10" : 
          stealthRoute.stealthScore > 50 ? "bg-yellow-600/10" : "bg-red-600/10"
        )}>
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase">Score</h3>
            <p className={cn(
              "text-2xl font-black", 
              stealthRoute.stealthScore > 80 ? "text-green-400" : 
              stealthRoute.stealthScore > 50 ? "text-yellow-400" : "text-red-400"
            )}>{stealthRoute.stealthScore}</p>
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
  );
};
