'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface EmotionTile {
  h3Index: string;
  bounds: Array<{ lat: number; lng: number }>;
  center: { lat: number; lng: number };
  aggregate: any;
  color: string | null;
}

interface EmotionLayerProps {
  tiles: EmotionTile[];
  onCellSelect: (h3Index: string) => void;
  selectedCell: string | null;
}

export function EmotionLayer({ tiles, onCellSelect, selectedCell }: EmotionLayerProps) {
  const map = useMap();

  useEffect(() => {
    // Clear existing emotion layers
    map.eachLayer((layer) => {
      if (layer.options?.isEmotionLayer) {
        map.removeLayer(layer);
      }
    });

    // Add new emotion polygons
    tiles.forEach((tile) => {
      if (!tile.aggregate || !tile.color) return;

      const latLngs = tile.bounds.map(point => [point.lat, point.lng]);
      
      const isSelected = tile.h3Index === selectedCell;
      
      const polygon = L.polygon(latLngs as L.LatLngExpression[], {
        color: tile.color,
        fillColor: tile.color,
        fillOpacity: isSelected ? 0.8 : 0.6,
        weight: isSelected ? 3 : 1,
        opacity: isSelected ? 1 : 0.8,
        isEmotionLayer: true,
      } as any);

      // Add click handler
      polygon.on('click', () => {
        onCellSelect(tile.h3Index);
      });

      // Add hover effects
      polygon.on('mouseover', () => {
        polygon.setStyle({
          fillOpacity: 0.8,
          weight: 2,
        });
      });

      polygon.on('mouseout', () => {
        if (tile.h3Index !== selectedCell) {
          polygon.setStyle({
            fillOpacity: 0.6,
            weight: 1,
          });
        }
      });

      // Add popup with basic info
      polygon.bindTooltip(
        `<div class="p-2">
          <div class="font-semibold">${tile.aggregate.dominantEmotion}</div>
          <div class="text-sm">Valence: ${tile.aggregate.meanValence.toFixed(2)}</div>
          <div class="text-sm">Intensity: ${tile.aggregate.meanIntensity.toFixed(0)}</div>
          <div class="text-sm">${tile.aggregate.entryCount} emotions</div>
        </div>`,
        {
          sticky: true,
          className: 'emotion-tooltip',
        }
      );

      polygon.addTo(map);
    });

    return () => {
      // Cleanup on unmount
      map.eachLayer((layer) => {
        if (layer.options?.isEmotionLayer) {
          map.removeLayer(layer);
        }
      });
    };
  }, [tiles, map, onCellSelect, selectedCell]);

  return null;
}
