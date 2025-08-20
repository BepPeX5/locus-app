'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { api } from '~/src/trpc/react';
import { EmotionLayer } from './emotion-layer';
import { MapControls } from './map-controls';

interface EmotionalMapProps {
  initialCenter: [number, number];
  onCellSelect: (h3Index: string) => void;
  selectedCell: string | null;
}

function MapEventHandler({ onBoundsChange }: { onBoundsChange: (bounds: any) => void }) {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
    zoomend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
  });

  return null;
}

export default function EmotionalMap({ initialCenter, onCellSelect, selectedCell }: EmotionalMapProps) {
  const [bounds, setBounds] = useState<any>(null);
  const [zoom, setZoom] = useState(10);

  // Query for tiles in current viewport
  const { data: tilesData, isLoading } = api.map.getTiles.useQuery(
    {
      bounds: bounds!,
      resolution: Math.min(10, Math.max(6, zoom - 2)), // Adaptive resolution
    },
    {
      enabled: !!bounds,
      refetchOnWindowFocus: false,
    }
  );

  return (
    <div className="h-full w-full">
      <MapContainer
        center={initialCenter}
        zoom={10}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapEventHandler onBoundsChange={setBounds} />
        
        {tilesData && (
          <EmotionLayer
            tiles={tilesData.tiles}
            onCellSelect={onCellSelect}
            selectedCell={selectedCell}
          />
        )}
        
        <MapControls />
      </MapContainer>
    </div>
  );
}
