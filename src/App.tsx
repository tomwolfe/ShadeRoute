import React, { useEffect } from 'react';
import { Shield, ShieldAlert, Menu, X } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { Map } from './components/Map';
import { Sidebar } from './components/layout/Sidebar';
import { reverseGeocode } from './services/nominatim';
import { useNavigation } from './context/NavigationContext';
import { useCameras } from './hooks/useCameras';

const App: React.FC = () => {
  const {
    start, setStart, end, setEnd, error, setError,
    stealthRoute, fastestRoute, sidebarOpen, setSidebarOpen,
    showFastestRoute, setCameraLoading, loading, cameraLoading
  } = useNavigation();

  const { cameras, getCamerasForRoute } = useCameras();

  useEffect(() => {
    const autoFetch = async () => {
      if (start && end) {
        setCameraLoading(true);
        await getCamerasForRoute(
          parseFloat(start.lat), parseFloat(start.lon),
          parseFloat(end.lat), parseFloat(end.lon)
        );
        setCameraLoading(false);
      }
    };
    const timer = setTimeout(autoFetch, 500);
    return () => clearTimeout(timer);
  }, [start, end, getCamerasForRoute, setCameraLoading]);

  const handleMapClick = async (lat: number, lon: number) => {
    const result = await reverseGeocode(lat, lon);
    if (result) {
      if (!start) setStart(result);
      else setEnd(result);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white overflow-hidden relative font-sans">
      <Analytics />
      
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <ShieldAlert size={18} />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:bg-white/20 rounded-full p-1"><X size={14} /></button>
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

      <Sidebar />

      <div className="flex-1 relative z-10">
        <Map 
          center={[37.7749, -122.4194]} zoom={12} cameras={cameras} 
          stealthRoute={stealthRoute?.coordinates || null}
          fastestRoute={fastestRoute?.coordinates || null}
          showFastestRoute={showFastestRoute}
          startPoint={start ? [parseFloat(start.lat), parseFloat(start.lon)] : null}
          endPoint={end ? [parseFloat(end.lat), parseFloat(end.lon)] : null}
          onMapClick={handleMapClick}
          isLoading={loading}
          isCameraLoading={cameraLoading}
        />
      </div>
    </div>
  );
};

export default App;