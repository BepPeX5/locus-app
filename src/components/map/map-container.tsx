'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';

import { MapSidebar } from './map-sidebar';
import { LoadingSpinner } from '../ui/loading-spinner';

// Dynamically import the map to avoid SSR issues
const EmotionalMap = dynamic(() => import('./emotional-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  ),
});

export function MapContainer() {
  const { data: session } = useSession();
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Get user's location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn('Could not get user location:', error);
          // Default to Naples, Italy as fallback
          setUserLocation([40.8518, 14.2681]);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    } else {
      // Fallback location
      setUserLocation([40.8518, 14.2681]);
    }
  }, []);

  const handleCellSelect = (h3Index: string) => {
    setSelectedCell(h3Index);
    setSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    setSelectedCell(null);
  };

  if (!session) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Please sign in</h2>
          <p className="text-muted-foreground">You need to be signed in to view the emotional map</p>
        </div>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <EmotionalMap
        initialCenter={userLocation}
        onCellSelect={handleCellSelect}
        selectedCell={selectedCell}
      />
      
      <MapSidebar
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
        selectedCell={selectedCell}
      />
    </div>
  );
}
