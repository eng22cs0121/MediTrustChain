"use client";

import { useEffect, useRef } from 'react';
import "leaflet/dist/leaflet.css";
import { Batch } from '@/contexts/batches-context';
import L from 'leaflet';

export function ShipmentMap({ batch }: { batch: Batch }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // 1. Clean up any existing map instance (Strict Mode / Fast Refresh foolproof)
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    
    // Sometimes Leaflet leaves the _leaflet_id on the DOM if react strict mode interrupts
    const container = mapRef.current as any;
    if (container && container._leaflet_id) {
      container._leaflet_id = null;
    }

    // Fix default marker icons dynamically
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });

    // Extract valid coordinates
    const coordinatesList = batch.history
      .filter(h => h.latitude && h.longitude)
      .map(h => [h.latitude, h.longitude] as [number, number]);

    // Calculate center
    const defaultCenter: [number, number] = coordinatesList.length > 0 
      ? coordinatesList[coordinatesList.length - 1] 
      : [20.5937, 78.9629];
    
    const zoomLevel = coordinatesList.length > 0 ? 10 : 5;

    // 2. Initialize the raw Leaflet Map
    const map = L.map(mapRef.current).setView(defaultCenter, zoomLevel);
    mapInstanceRef.current = map;

    // Add Tile Layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Add Markers
    batch.history.forEach((step) => {
      if (step.latitude && step.longitude) {
        const marker = L.marker([step.latitude, step.longitude]).addTo(map);
        
        const popupContent = `
          <div class="text-sm font-sans" style="font-family: ui-sans-serif, system-ui, sans-serif;">
            <p style="font-weight: bold; color: #2563eb; margin: 0 0 4px 0;">${step.status}</p>
            <p style="font-weight: 500; color: #1e293b; margin: 0 0 4px 0;">${step.location}</p>
            <p style="font-size: 11px; color: #64748b; margin: 0;">${new Date(step.timestamp).toLocaleString()}</p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
      }
    });

    // Add Polyline for route tracking
    if (coordinatesList.length > 1) {
      L.polyline(coordinatesList, {
        color: '#0284c7',
        weight: 4,
        dashArray: '8, 8'
      }).addTo(map);
    }

    // 3. Absolute teardown protocol for Unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if (container) {
        container._leaflet_id = null;
      }
    };
  }, [batch]);

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border shadow-md">
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
