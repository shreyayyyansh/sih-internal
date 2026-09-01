import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapAutoCenter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 2) {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [bounds, map]);
  return null;
}
