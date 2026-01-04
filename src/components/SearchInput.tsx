import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { searchAddress } from '../services/nominatim';
import type { GeocodeResult } from '../services/nominatim';

interface SearchInputProps {
  placeholder: string;
  onSelect: (result: GeocodeResult) => void;
  label: string;
  value?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ placeholder, onSelect, label, value = '' }) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.length < 3 || query === value) {
      setResults([]);
      return;
    }

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(async () => {
      try {
        const data = await searchAddress(query);
        setResults(data);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [query]);

  return (
    <div className="relative w-full">
      <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <div className="absolute left-3 top-2.5 text-gray-500">
          <Search size={18} />
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {results.map((result, index) => (
            <button
              key={index}
              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-gray-200 border-b border-gray-700 last:border-0 flex items-start gap-2"
              onClick={() => {
                setQuery(result.display_name);
                setIsOpen(false);
                onSelect(result);
              }}
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-gray-500" />
              <span>{result.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
