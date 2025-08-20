import { 
  latLngToCell, 
  cellToBoundary, 
  cellToLatLng, 
  isValidCell,
  getResolution,
  gridDistance,
  gridRingUnsafe,
  polyfill
} from 'h3-js';
import { env } from '~/src/env';

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface LatLng {
  lat: number;
  lng: number;
}

export const h3Service = {
  /**
   * Convert lat/lng to H3 cell index
   */
  latLngToH3(lat: number, lng: number, resolution?: number): string {
    const res = resolution || env.H3_RESOLUTION;
    return latLngToCell(lat, lng, res);
  },

  /**
   * Convert H3 cell to lat/lng center
   */
  h3ToLatLng(h3Index: string): [number, number] {
    const coords = cellToLatLng(h3Index);
    return [coords[0], coords[1]];
  },

  /**
   * Get cell center as {lat, lng}
   */
  getCellCenter(h3Index: string): LatLng {
    const [lat, lng] = this.h3ToLatLng(h3Index);
    return { lat, lng };
  },

  /**
   * Get cell boundary polygon
   */
  getCellBounds(h3Index: string): LatLng[] {
    const boundary = cellToBoundary(h3Index);
    return boundary.map(([lat, lng]) => ({ lat, lng }));
  },

  /**
   * Check if H3 index is valid
   */
  isValidH3Index(h3Index: string): boolean {
    try {
      return isValidCell(h3Index);
    } catch {
      return false;
    }
  },

  /**
   * Get H3 resolution of a cell
   */
  getResolution(h3Index: string): number {
    return getResolution(h3Index);
  },

  /**
   * Get all H3 cells within bounds
   */
  getCellsInBounds(bounds: Bounds, resolution?: number): string[] {
    const res = resolution || env.H3_RESOLUTION;
    
    // Create polygon from bounds
    const polygon = [
      [bounds.north, bounds.west],
      [bounds.north, bounds.east], 
      [bounds.south, bounds.east],
      [bounds.south, bounds.west],
      [bounds.north, bounds.west], // Close the polygon
    ];

    try {
      return polyfill(polygon, res);
    } catch (error) {
      console.warn('Error getting cells in bounds:', error);
      return [];
    }
  },

  /**
   * Get cells within radius of a point
   */
  getCellsInRadius(lat: number, lng: number, radiusKm: number, resolution?: number): string[] {
    const res = resolution || env.H3_RESOLUTION;
    const centerCell = this.latLngToH3(lat, lng, res);
    
    // Estimate rings needed based on radius
    // Average H3 cell edge length at resolution 10 is ~1.22km
    const avgCellSize = this.getAverageCellSizeKm(res);
    const ringsNeeded = Math.ceil(radiusKm / avgCellSize);
    
    const cells = new Set<string>();
    cells.add(centerCell);
    
    for (let ring = 1; ring <= ringsNeeded; ring++) {
      try {
        const ringCells = gridRingUnsafe(centerCell, ring);
        ringCells.forEach(cell => {
          const cellCenter = this.getCellCenter(cell);
          const distance = this.getDistance(lat, lng, cellCenter.lat, cellCenter.lng);
          if (distance <= radiusKm) {
            cells.add(cell);
          }
        });
      } catch {
        // Ring may be incomplete at resolution boundaries
        break;
      }
    }
    
    return Array.from(cells);
  },

  /**
   * Get neighboring cells
   */
  getNeighbors(h3Index: string, ringSize: number = 1): string[] {
    const neighbors = new Set<string>();
    
    for (let ring = 1; ring <= ringSize; ring++) {
      try {
        const ringCells = gridRingUnsafe(h3Index, ring);
        ringCells.forEach(cell => neighbors.add(cell));
      } catch {
        // Handle incomplete rings gracefully
        break;
      }
    }
    
    return Array.from(neighbors);
  },

  /**
   * Calculate distance between two points using Haversine formula
   */
  getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Get grid distance between two H3 cells
   */
  getGridDistance(h3Index1: string, h3Index2: string): number {
    try {
      return gridDistance(h3Index1, h3Index2);
    } catch {
      return Infinity;
    }
  },

  /**
   * Get approximate cell size in km for a given resolution
   */
  getAverageCellSizeKm(resolution: number): number {
    // Approximate edge lengths in km for different H3 resolutions
    const edgeLengths: Record<number, number> = {
      0: 1107.712,
      1: 418.676,
      2: 158.244,
      3: 59.810,
      4: 22.606,
      5: 8.544,
      6: 3.229,
      7: 1.220,
      8: 0.461,
      9: 0.174,
      10: 0.065,
      11: 0.025,
      12: 0.009,
      13: 0.003,
      14: 0.001,
      15: 0.0005,
    };
    
    return edgeLengths[resolution] || 1.0;
  },

  /**
   * Convert degrees to radians
   */
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  /**
   * Get optimal resolution for a given zoom level
   */
  getResolutionForZoom(zoom: number): number {
    // Mapping zoom levels to H3 resolutions for good visual balance
    if (zoom <= 3) return 3;
    if (zoom <= 5) return 4;
    if (zoom <= 7) return 5;
    if (zoom <= 9) return 6;
    if (zoom <= 11) return 7;
    if (zoom <= 13) return 8;
    if (zoom <= 15) return 9;
    return 10;
  },

  /**
   * Get cells with smoothing (includes neighbors for spatial blending)
   */
  getCellsWithSmoothing(h3Index: string): string[] {
    const cells = [h3Index];
    const neighbors = this.getNeighbors(h3Index, 1);
    return cells.concat(neighbors);
  },
};
