import ngeohash from 'ngeohash';
import { calculateDistance } from './locationMath';

/**
 * Fetches geohash8 blocks within a tight 50m radius.
 * Ideal for initial "Stationary" state to minimize Firebase listeners.
 */
export const getInitialStationaryBlocks = (lat, lng, radiusInMeters = 50) => {
  // 1. Calculate offsets for 50m
  const latOffset = radiusInMeters / 111320;
  const lngOffset = radiusInMeters / (111320 * Math.cos(lat * (Math.PI / 180)));

  const minLat = lat - latOffset;
  const minLng = lng - lngOffset;
  const maxLat = lat + latOffset;
  const maxLng = lng + lngOffset;
  const allPossibleBlocks = ngeohash.bboxes(minLat, minLng, maxLat, maxLng, 8);
  const optimizedBlocks = allPossibleBlocks.filter(hash => {
    const { latitude, longitude } = ngeohash.decode(hash);
    const distance = calculateDistance(lat, lng, latitude, longitude);
    return distance <= radiusInMeters + 10; 
  });
  return optimizedBlocks;
};