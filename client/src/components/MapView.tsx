import { useEffect, useRef } from "react";
import { getRouteUrl } from "@/lib/utils";
import type { ShopWithDetails } from "@/lib/types";

interface MapViewProps {
  shops: ShopWithDetails[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (shop: ShopWithDetails) => void;
  className?: string;
}

// Leaflet is loaded via CDN in index.html
declare global {
  interface Window {
    L: any;
  }
}

export default function MapView({ 
  shops, 
  center = [50.9167, 13.3417], 
  zoom = 13,
  onMarkerClick,
  className = "h-96 md:h-[520px] md:min-h-[420px]"
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current).setView(center, zoom);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Add new markers
    shops.forEach(shop => {
      const lat = parseFloat(shop.lat);
      const lng = parseFloat(shop.lng);
      
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = window.L.marker([lat, lng]).addTo(mapInstanceRef.current);
      
      const routeUrl = getRouteUrl(shop.lat, shop.lng, shop.name);
      
      marker.bindPopup(`
        <div class="p-2" style="color: var(--foreground); min-width: 200px;">
          <h3 class="font-semibold mb-1">${shop.name}</h3>
          <div class="flex items-center mb-2">
            <span class="text-rating mr-1">★</span>
            <span>${shop.avgRating.toFixed(1)}</span>
            <span class="ml-2 text-sm text-muted-foreground">(${shop.reviewCount})</span>
          </div>
          <p class="text-sm text-muted-foreground mb-2">${shop.street}, ${shop.city}</p>
          <div class="flex gap-2 mt-3">
            <a 
              href="${routeUrl}" 
              target="_blank"
              class="text-primary text-sm hover:underline bg-primary/10 px-2 py-1 rounded"
            >
              Route
            </a>
            <button 
              onclick="window.location.href='/laden/${shop.slug}'" 
              class="text-primary text-sm hover:underline"
            >
              Details
            </button>
          </div>
        </div>
      `);

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(shop));
      }

      markersRef.current.push(marker);
    });

    return () => {
      // Cleanup markers when component unmounts
      markersRef.current.forEach(marker => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(marker);
        }
      });
      markersRef.current = [];
    };
  }, [shops, center, zoom, onMarkerClick]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Karte</h3>
      </div>
      <div 
        ref={mapRef} 
        className={className}
        data-testid="map-container"
      />
    </div>
  );
}
