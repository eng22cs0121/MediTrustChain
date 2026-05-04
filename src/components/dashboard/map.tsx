
"use client";

import { useState, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Pin } from 'lucide-react';
import type {Point, Feature, LineString} from 'geojson';
import { format, parseISO } from "date-fns";

export type MapPosition = { 
  lat: number; 
  lng: number; 
  location: string;
  status: string;
  timestamp: string;
};

type MapProps = {
  positions: MapPosition[];
};

export function DashboardMap({ positions }: MapProps) {
  const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  const initialPosition = positions[positions.length - 1] || { lng: -98, lat: 39 };
  const initialZoom = positions.length > 1 ? 3 : 10;

  const [viewState, setViewState] = useState({
    longitude: initialPosition.lng,
    latitude: initialPosition.lat,
    zoom: initialZoom,
  });

  const [popupInfo, setPopupInfo] = useState<MapPosition | null>(null);

  const markers = useMemo(() => positions.map((p, i) => (
      <Marker key={`marker-${i}`} longitude={p.lng} latitude={p.lat} anchor="bottom" onClick={e => {
        e.originalEvent.stopPropagation();
        setPopupInfo(p);
      }}>
         <Pin className="h-8 w-8 text-primary fill-primary/70 cursor-pointer" />
      </Marker>
  )), [positions]);

  const lineGeoJSON: Feature<LineString> = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: positions.map(p => [p.lng, p.lat])
    },
    properties: {}
  };


  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <p className="text-muted-foreground text-center p-4">
          MapTiler API key is missing. Please add NEXT_PUBLIC_MAPTILER_API_KEY to your .env file.
        </p>
      </div>
    );
  }

  return (
    <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{width: '100%', height: '100%'}}
        mapStyle={`https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`}
      >
        {markers}

        {popupInfo && (
          <Popup
            anchor="top"
            longitude={Number(popupInfo.lng)}
            latitude={Number(popupInfo.lat)}
            onClose={() => setPopupInfo(null)}
            closeButton={false}
            className="text-sm"
          >
           <div className="p-1">
             <h4 className="font-bold text-base">{popupInfo.location}</h4>
             <p><strong>Status:</strong> {popupInfo.status}</p>
             <p><strong>Date:</strong> {format(parseISO(popupInfo.timestamp), "MMM d, yyyy, h:mm a")}</p>
           </div>
          </Popup>
        )}

        {positions.length > 1 && (
            <Source id="route" type="geojson" data={lineGeoJSON}>
                <Layer
                    id="route-layer"
                    type="line"
                    source="route"
                    layout={{
                        'line-join': 'round',
                        'line-cap': 'round'
                    }}
                    paint={{
                        'line-color': 'hsl(var(--primary))',
                        'line-width': 4,
                        'line-opacity': 0.8
                    }}
                />
            </Source>
        )}
      </Map>
  );
}
