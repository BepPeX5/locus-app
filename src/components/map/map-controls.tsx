'use client';

import { useState } from 'react';
import { useMap } from 'react-leaflet';
import { Plus, Minus, RotateCcw, User, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function MapControls() {
  const map = useMap();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const zoomIn = () => map.zoomIn();
  const zoomOut = () => map.zoomOut();
  const resetView = () => map.setView([40.8518, 14.2681], 10);
  
  const goToUserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.setView([position.coords.latitude, position.coords.longitude], 12);
        },
        (error) => {
          console.warn('Could not get user location:', error);
        }
      );
    }
  };

  return (
    <>
      {/* Zoom Controls */}
      <Card className="absolute right-4 top-4 z-[1000] p-1">
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" onClick={zoomIn}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={zoomOut}>
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Navigation Controls */}
      <Card className="absolute right-4 top-32 z-[1000] p-1">
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" onClick={goToUserLocation} title="Go to my location">
            <User className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={resetView} title="Reset view">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Menu Toggle (Mobile) */}
      <Card className="absolute left-4 top-4 z-[1000] p-1 md:hidden">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </Card>
    </>
  );
}
