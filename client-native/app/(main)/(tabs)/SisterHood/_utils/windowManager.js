import ngeohash from 'ngeohash';
import { getDestinationPoint } from './locationMath';

/**
 * Generates a sequence of unique geohash8 blocks projecting forward.
 * @param {number} startLat - Current Latitude
 * @param {number} startLng - Current Longitude
 * @param {number} bearing - Direction of travel
 * @param {number} blockCount - How many blocks to fetch ahead (default 5)
 * @returns {Array<string>} Array of unique geohash8 strings
 */
export const getForwardBlocks = (startLat, startLng, bearing, blockCount = 5) => {
  const blocks = [];
  // A geohash 8 is ~38m x 19m. Stepping by 30 meters ensures we 
  // sequentially hit the next blocks without skipping over them.
  const stepDistanceMeters = 30; 

  // 1. Always grab the block the user is currently standing in
  const currentBlock = ngeohash.encode(startLat, startLng, 8);
  blocks.push(currentBlock);

  // 2. Project points forward along the bearing and grab their geohashes
  for (let i = 1; i <= blockCount; i++) {
    const nextPoint = getDestinationPoint(startLat, startLng, stepDistanceMeters * i, bearing);
    const nextBlock = ngeohash.encode(nextPoint.latitude, nextPoint.longitude, 8);
    // Only add if it's a new, unique block in the sequence
    if (blocks[blocks.length - 1] !== nextBlock) {
      blocks.push(nextBlock);
    }
  }
  // Ensure we return exactly the requested number of unique blocks (+1 for current)
  return [...new Set(blocks)].slice(0, blockCount + 1); 
};
/**
 * Evaluates the user's new geohash against their current active window.
 * Determines if we need to slide forward, refetch entirely, or do nothing.
 * * @param {string} newGeohash - The user's current geohash8
 * @param {Array<string>} currentWindow - The array of blocks currently active in Firebase
 * @param {number} lat - Current Latitude
 * @param {number} lng - Current Longitude
 * @param {number} bearing - Current direction of travel
 * @returns {Object} Instructions for the main component
 */
export const evaluateSlidingWindow = (newGeohash, currentWindow, lat, lng, bearing) => {
  // SCENARIO 1: Deviation (User turned a corner / changed path) or Initial Load
  if (!currentWindow || currentWindow.length === 0 || !currentWindow.includes(newGeohash)) {
    const newPath = getForwardBlocks(lat, lng, bearing, 5);
    return {
      status: 'PATH_CHANGED',
      newWindow: newPath,
      toAdd: newPath,
      toRemove: currentWindow || [] // Drop all old listeners
    };
  }

  // Find where the user currently is within the projected window
  const currentIndex = currentWindow.indexOf(newGeohash);
  
  // SCENARIO 2: Progression (User reached the 4th block out of 5)
  // We trigger the slide just before they run out of fetched blocks
  const isNearEnd = currentIndex >= currentWindow.length - 2; 

  if (isNearEnd) {
    const extendedPath = getForwardBlocks(lat, lng, bearing, 5);
    
    const oldSet = new Set(currentWindow);
    const newSet = new Set(extendedPath);

    return {
      status: 'SLIDING_FORWARD',
      newWindow: extendedPath,
      toAdd: [...newSet].filter(b => !oldSet.has(b)),
      toRemove: [...oldSet].filter(b => !newSet.has(b))
    };
  }

  // SCENARIO 3: No Change (User is walking normally through blocks 1, 2, or 3)
  return {
    status: 'ON_TRACK',
    newWindow: currentWindow,
    toAdd: [],
    toRemove: []
  };
};