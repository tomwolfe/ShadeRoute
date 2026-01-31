import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import type { Camera } from '../services/overpass';

// Fix leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  center: [number, number];
  zoom: number;
  cameras: Camera[];
  stealthRoute: [number, number][] | null;
  fastestRoute: [number, number][] | null;
  showFastestRoute?: boolean;
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
  onMapClick?: (lat: number, lon: number) => void;
  isLoading?: boolean;
  isCameraLoading?: boolean;
}

function ClickHandler({ onClick }: { onClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ChangeView({ stealthRoute, fastestRoute, startPoint, endPoint }: { 
  stealthRoute: [number, number][] | null,
  fastestRoute: [number, number][] | null,
  startPoint: [number, number] | null,
  endPoint: [number, number] | null
}) {
  const map = useMap();
  React.useEffect(() => {
    const route = stealthRoute || fastestRoute;
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route);
      if (stealthRoute && fastestRoute) {
        bounds.extend(L.latLngBounds(fastestRoute));
      }
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (startPoint && endPoint) {
      const bounds = L.latLngBounds([startPoint, endPoint]);
      map.fitBounds(bounds, { padding: [100, 100] });
    } else if (startPoint) {
      map.setView(startPoint, 13);
    } else if (endPoint) {
      map.setView(endPoint, 13);
    }
  }, [stealthRoute, fastestRoute, startPoint, endPoint, map]);
  return null;
}

export const Map: React.FC<MapProps> = ({ 
  center, 
  zoom, 
  cameras, 
  stealthRoute, 
  fastestRoute, 
  showFastestRoute = true,
  startPoint, 
  endPoint, 
  onMapClick,
  isLoading = false,
  isCameraLoading = false
}) => {
  return (
    <div className="h-full w-full relative">
      {(isLoading || isCameraLoading) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900/90 backdrop-blur-md border border-gray-700 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
          </div>
          <span className="text-xs font-bold text-gray-200 uppercase tracking-widest">
            {isCameraLoading ? 'Scanning Cameras' : 'Calculating Route'}
          </span>
        </div>
      )}

      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        className="h-full w-full"
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={onMapClick} />
        <ChangeView 
          stealthRoute={stealthRoute} 
          fastestRoute={fastestRoute} 
          startPoint={startPoint} 
          endPoint={endPoint} 
        />
        
        {cameras.map((camera) => {
          const isALPR = 
            camera.tags['surveillance:type']?.toLowerCase().includes('alpr') ||
            camera.tags['surveillance:type']?.toLowerCase().includes('lpr') ||
            camera.tags['camera:type']?.toLowerCase().includes('alpr') ||
            camera.tags['camera:type']?.toLowerCase().includes('lpr');
          
          const radius = isALPR ? 130 : 65;

          return (
            <React.Fragment key={camera.id}>
              <Circle
                center={[camera.lat, camera.lon]}
                radius={radius}
                pathOptions={{
                  fillColor: '#ef4444',
                  fillOpacity: 0.1,
                  color: '#ef4444',
                  weight: 1,
                }}
              />
              <CircleMarker 
                center={[camera.lat, camera.lon]} 
                radius={4}
                pathOptions={{
                  fillColor: '#ef4444',
                  fillOpacity: 0.8,
                  color: '#ffffff',
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-xs text-gray-900">
                    <p className="font-bold">Surveillance Camera</p>
                    {isALPR && <p className="text-red-600 font-semibold italic">ALPR/LPR Enabled</p>}
                    {camera.tags['surveillance:type'] && <p>Type: {camera.tags['surveillance:type']}</p>}
                    {camera.tags.brand && <p>Brand: {camera.tags.brand}</p>}
                    {camera.tags.name && <p>Name: {camera.tags.name}</p>}
                    <p className="mt-1 text-[10px] text-gray-500">ID: {camera.id}</p>
                    <p className="text-[10px] text-gray-400">Avoidance Radius: {radius}m</p>
                  </div>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}

        {startPoint && (
          <Marker position={startPoint}>
            <Popup>Start Location</Popup>
          </Marker>
        )}
        {endPoint && (
          <Marker position={endPoint}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {fastestRoute && showFastestRoute && (
          <Polyline 
            positions={fastestRoute} 
            pathOptions={{ color: '#64748b', weight: 4, opacity: 0.6, dashArray: '10, 10' }} 
          />
        )}

        {stealthRoute && (
          <Polyline 
            positions={stealthRoute} 
            pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.9 }} 
          />
        )}
      </MapContainer>
    </div>
  );
};
