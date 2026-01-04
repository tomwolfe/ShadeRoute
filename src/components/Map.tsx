import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Camera } from '../services/overpass';

// Fix leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
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
  route: [number, number][] | null;
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
  onMapClick?: (lat: number, lon: number) => void;
}

function ClickHandler({ onClick }: { onClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ChangeView({ route, startPoint, endPoint }: { 
  route: [number, number][] | null,
  startPoint: [number, number] | null,
  endPoint: [number, number] | null
}) {
  const map = useMap();
  React.useEffect(() => {
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (startPoint && endPoint) {
      const bounds = L.latLngBounds([startPoint, endPoint]);
      map.fitBounds(bounds, { padding: [100, 100] });
    } else if (startPoint) {
      map.setView(startPoint, 13);
    } else if (endPoint) {
      map.setView(endPoint, 13);
    }
  }, [route, startPoint, endPoint, map]);
  return null;
}

export const Map: React.FC<MapProps> = ({ center, zoom, cameras, route, startPoint, endPoint, onMapClick }) => {
  return (
    <div className="h-full w-full">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={onMapClick} />
        <ChangeView 
          route={route} 
          startPoint={startPoint} 
          endPoint={endPoint} 
        />
        
        {cameras.map((camera) => (
          <CircleMarker 
            key={camera.id} 
            center={[camera.lat, camera.lon]} 
            radius={6}
            pathOptions={{
              fillColor: '#ef4444',
              fillOpacity: 0.8,
              color: '#ffffff',
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-xs text-gray-900">
                <p className="font-bold">Surveillance Camera</p>
                {camera.tags['surveillance:type'] && <p>Type: {camera.tags['surveillance:type']}</p>}
                {camera.tags.brand && <p>Brand: {camera.tags.brand}</p>}
                {camera.tags.name && <p>Name: {camera.tags.name}</p>}
                <p className="mt-1 text-[10px] text-gray-500">ID: {camera.id}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

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

        {route && (
          <Polyline 
            positions={route} 
            pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.8 }} 
          />
        )}
      </MapContainer>
    </div>
  );
};
