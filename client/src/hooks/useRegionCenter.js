export function useRegionCenter(regionGeoJsonString) {
  if (!regionGeoJsonString) return { center: [20, 78], zoom: 5, bounds: null };
  try {
    const geo = typeof regionGeoJsonString === 'string'
      ? JSON.parse(regionGeoJsonString)
      : regionGeoJsonString;
    
    // Support Geometry, Feature, or FeatureCollection
    let geometry = geo;
    if (geo.type === 'FeatureCollection' && geo.features?.length > 0) {
      geometry = geo.features[0].geometry;
    } else if (geo.type === 'Feature') {
      geometry = geo.geometry;
    }

    if (!geometry || !geometry.coordinates) {
        return { center: [20, 78], zoom: 5, bounds: null };
    }

    const coords = geometry.coordinates[0];
    const lats = coords.map(c => c[1]);
    const lngs = coords.map(c => c[0]);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    return { 
      center: [centerLat, centerLng], 
      zoom: 12, 
      bounds: [[minLat, minLng], [maxLat, maxLng]] 
    };
  } catch {
    return { center: [20, 78], zoom: 5, bounds: null };
  }
}
