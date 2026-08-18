import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { MapPin, Navigation, Clock, Ruler } from 'lucide-react';

function renderInstruction(text: string): JSX.Element {
  const parts = text.split(/<\/b>/);
  if (parts.length === 1 || text.indexOf('<b>') === -1) {
    return <p className="text-sm text-gray-200 leading-snug">{text}</p>;
  }

  const elements: JSX.Element[] = [];
  let i = 0;
  while (i < parts.length) {
    const before = parts[i];
    if (before.trim()) {
      elements.push(<span key={i} className="text-sm text-gray-200 leading-snug">{before}</span>);
    }
    i++;

    if (i < parts.length) {
      const after = parts[i];
      // Check if the original text had <b> before this part
      // The split on </b> means odd-indexed parts follow a <b> tag
      elements.push(<b key={i} className="text-sm text-blue-500">{after}</b>);
    }
    i++;
  }

  return <p className="text-sm text-gray-200 leading-snug">{elements}</p>;
}

export const DirectionsList: React.FC = () => {
  const { stealthRoute } = useNavigation();

  if (!stealthRoute || !stealthRoute.instructions.length) return null;

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Navigation size={14} className="text-blue-500" />
          Directions
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
          <span className="flex items-center gap-1">
            <Ruler size={10} />
            {formatDistance(stealthRoute.distance)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatTime(stealthRoute.time)}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {stealthRoute.instructions.map((step, index) => (
          <div 
            key={index} 
            className="group flex gap-3 p-3 rounded-lg hover:bg-gray-800/50 transition-colors border-l-2 border-transparent hover:border-blue-600"
          >
            <div className="flex flex-col items-center gap-1 mt-1">
              <div className="w-2 h-2 rounded-full bg-gray-700 group-hover:bg-blue-600 transition-colors" />
              {index < stealthRoute.instructions.length - 1 && (
                <div className="w-0.5 h-full bg-gray-800" />
              )}
            </div>
            
            <div className="flex-1">
              {renderInstruction(step.text)}
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] text-gray-500 font-mono">
                  {formatDistance(step.distance)}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex gap-3 p-3">
          <div className="mt-1">
            <MapPin size={16} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-200">Arrived at destination</p>
          </div>
        </div>
      </div>
    </div>
  );
};
