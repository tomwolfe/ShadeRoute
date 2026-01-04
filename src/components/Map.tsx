import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

// Camera icon
const cameraIcon = L.divIcon({
  html: `<div class="bg-red-600 w-3 h-3 rounded-full border-2 border-white shadow-lg"></div>`,
  className: 'custom-camera-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

interface MapProps {
  center: [number, number];
  zoom: number;
  cameras: Camera[];
  route: [number, number][] | null;
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
}

function ChangeView({ center, zoom, route }: { center: [number, number], zoom: number, route: any }) {
  const map = useMap();
  React.useEffect(() => {
    if (route && route.length > 0) {
      const bounds = L.latLngBounds(route);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, route, map]);
  return null;
}

export const Map: React.FC<MapProps> = ({ center, zoom, cameras, route, startPoint, endPoint }) => {
  return (
    <div className="h-full w-full">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={center} zoom={zoom} route={route} />
        
        {cameras.map((camera) => (
          <Marker 
            key={camera.id} 
            position={[camera.lat, camera.lon]} 
            icon={cameraIcon}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold">ALPR Camera</p>
                {camera.tags.brand && <p>Brand: {camera.tags.brand}</p>}
                {camera.tags.name && <p>Name: {camera.tags.name}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {startPoint && <Marker position={startPoint} />}
        {endPoint && <Marker position={endPoint} />}

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
