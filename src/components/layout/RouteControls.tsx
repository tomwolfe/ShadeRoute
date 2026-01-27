import React from 'react';
import { SearchInput } from '../SearchInput';
import { X, Navigation } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export const RouteControls: React.FC = () => {
  const { start, setStart, end, setEnd, loading, stealthRoute } = useNavigation();

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchInput label="START" placeholder="Start..." onSelect={setStart} value={start?.display_name || ''} />
        {start && <button onClick={() => setStart(null)} className="absolute right-2 top-7 text-gray-500 hover:text-white"><X size={14}/></button>}
      </div>
      <div className="relative">
        <SearchInput label="DESTINATION" placeholder="End..." onSelect={setEnd} value={end?.display_name || ''} />
        {end && <button onClick={() => setEnd(null)} className="absolute right-2 top-7 text-gray-500 hover:text-white"><X size={14}/></button>}
      </div>
    </div>
  );
};
