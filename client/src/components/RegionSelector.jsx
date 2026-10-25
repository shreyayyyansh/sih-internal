import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, Polyline, Marker } from '@react-google-maps/api';
import { Trash2, Loader2, Undo2, Check } from 'lucide-react';

// The 'drawing' library (DrawingManager) was removed in Maps JS API 3.65,
// so polygons are drawn manually: click to add points, finish to close.
const LIBRARIES = ['places'];

const polygonStyle = {
  fillColor: '#10b981',
  fillOpacity: 0.4,
  strokeWeight: 2,
  strokeColor: '#10b981',
  zIndex: 1,
};

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1.5rem',
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

// 1. DEFINE MAP STYLES TO HIDE PLACES/LABELS
const mapStyles = [
  {
    featureType: "poi", // Points of Interest (Businesses, attractions, etc.)
    elementType: "labels",
    stylers: [{ visibility: "off" }], // Hide them
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  // Optional: If you want to hide road labels too for a cleaner satellite look
  {
    featureType: "road",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  }
];

export default function RegionSelector({ onRegionSelect }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [isDrawing, setIsDrawing] = useState(true);
  const [draftPath, setDraftPath] = useState([]);
  const [polygonPath, setPolygonPath] = useState([]);
  const [center, setCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(5);
  const [locating, setLocating] = useState(true);
  const polygonRef = useRef(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setZoom(11); // Zoom in closer since we know their location
          setLocating(false);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocating(false);
    }
  }, []);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  const readPolygonPath = (polygon) => {
    const path = polygon.getPath();
    const coordinates = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push({ lat: point.lat(), lng: point.lng() });
    }
    return coordinates;
  };

  const commitPath = (coordinates) => {
    setPolygonPath(coordinates);
    if (onRegionSelect) {
      onRegionSelect(coordinates);
    }
  };

  const handleMapClick = (e) => {
    if (!isDrawing) return;
    setDraftPath((prev) => [...prev, { lat: e.latLng.lat(), lng: e.latLng.lng() }]);
  };

  const handleFinish = () => {
    if (draftPath.length < 3) return;
    setIsDrawing(false);
    commitPath(draftPath);
    setDraftPath([]);
  };

  const handleUndo = () => {
    setDraftPath((prev) => prev.slice(0, -1));
  };

  // Vertex drags / midpoint inserts on the editable polygon
  const handlePolygonEdit = () => {
    if (polygonRef.current) {
      commitPath(readPolygonPath(polygonRef.current));
    }
  };

  const handleClear = () => {
    polygonRef.current = null;
    setPolygonPath([]);
    setDraftPath([]);
    setIsDrawing(true);
    if (onRegionSelect) onRegionSelect(null);
  };

  if (!isLoaded || locating) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-[2rem] flex-col gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
        {locating && <span className="text-sm font-medium text-slate-500">Locating you...</span>}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          mapTypeId: 'hybrid', // 'hybrid' gives you satellite + borders (better context than pure satellite)
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          disableDoubleClickZoom: isDrawing,
          draggableCursor: isDrawing ? 'crosshair' : undefined,
          styles: mapStyles, // <--- THIS REMOVES THE PLACES
        }}
      >
        {isDrawing && draftPath.length > 0 && (
          <>
            <Polyline
              path={draftPath}
              options={{ ...polygonStyle, clickable: false }}
            />
            {draftPath.map((point, i) => (
              <Marker
                key={i}
                position={point}
                clickable={i === 0 && draftPath.length >= 3}
                onClick={handleFinish}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: i === 0 ? 7 : 5,
                  fillColor: '#ffffff',
                  fillOpacity: 1,
                  strokeColor: '#10b981',
                  strokeWeight: 2,
                }}
              />
            ))}
          </>
        )}

        {!isDrawing && polygonPath.length > 0 && (
          <Polygon
            path={polygonPath}
            editable
            options={{ ...polygonStyle, clickable: true }}
            onLoad={(polygon) => { polygonRef.current = polygon; }}
            onUnmount={() => { polygonRef.current = null; }}
            onMouseUp={handlePolygonEdit}
            onDragEnd={handlePolygonEdit}
          />
        )}
      </GoogleMap>

      {/* Floating Control Panel */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Selected Region Stats
        </h4>
        
        {polygonPath.length > 0 ? (
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-800">Area Selected</span>
             </div>
             <p className="text-xs text-slate-500">
               {polygonPath.length} coordinate points captured
             </p>
             <button 
                onClick={handleClear}
                className="flex items-center gap-2 text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors"
             >
                <Trash2 className="w-3 h-3" />
                Clear Selection
             </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-slate-400 italic">
              {draftPath.length === 0
                ? 'Click on the map to start drawing a region...'
                : `${draftPath.length} point${draftPath.length === 1 ? '' : 's'} added${draftPath.length < 3 ? ' (need at least 3)' : ' — click the first point or Finish'}`}
            </div>
            {draftPath.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFinish}
                  disabled={draftPath.length < 3}
                  className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg font-bold hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-3 h-3" />
                  Finish
                </button>
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-2 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                >
                  <Undo2 className="w-3 h-3" />
                  Undo
                </button>
                <button
                  onClick={handleClear}
                  className="flex items-center gap-2 text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
