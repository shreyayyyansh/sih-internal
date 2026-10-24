import { ref, get, runTransaction } from 'firebase/database';
import { db } from '../../../../../lib/firebase';
import { api } from '../../../../../lib/api';

/**
 * Adds a user to an array of geographic blocks in the Realtime Database (RTDB).
 * If a block doesn't exist in RTDB, it fetches its base data from Firestore via 
 * a server endpoint before adding it to RTDB.
 * 
 * @param {Array<string>} toAddBlocks - Array of geohash block IDs to add the user to.
 * @param {string} userId - The user's ID.
 * @param {Object} currentLocation - An object with `lat` and `lng` properties (optional for this context).
 */
export const addToRTDB = async (toAddBlocks, userId) => {
  if (!toAddBlocks || toAddBlocks.length === 0 || !userId) return;

  const missingBlocks = [];
  const fetchedBlocksData = {};

  try {
    // 1. Initial check for block existence in RTDB
    await Promise.all(
      toAddBlocks.map(async (blockId) => {
        const blockRef = ref(db, `blocks/${blockId}`);
        const snapshot = await get(blockRef);

        if (!snapshot.exists()) {
          missingBlocks.push(blockId);
        }
      })
    );

    // 2. Fetch missing blocks from Firestore using backend API
    if (missingBlocks.length > 0) {
      try {
        // Assuming your backend setup requires the `blocks` array
        const response = await api.post('/api/blocks/fetch', { blocks: missingBlocks });

        // Assume API returns a data object where keys are block IDs and values are Firestore block data
        // Example: { "spv2": { block_state: { sos_count: 0, safety_metrics: {...} } } }
        if (response.data && response.data.blocks) {
          Object.assign(fetchedBlocksData, response.data.blocks);
        }
      } catch (error) {
        console.error("Error fetching missing blocks from server:", error);
        // Continue processing even if API fails, those blocks will just be created with default fields below in transaction
      }
    }

    // 3. Atomically add user data to RTDB for ALL toAddBlocks
    await Promise.all(
      toAddBlocks.map((blockId) => {
        const blockRef = ref(db, `blocks/${blockId}`);

        return runTransaction(blockRef, (currentBlock) => {
          // If block doesn't exist in RTDB, initialize using fetched data or use a fallback bare minimum structure
          if (currentBlock === null) {
            const fetchedData = fetchedBlocksData[blockId] || {};

            // Construct base structure from Schema
            currentBlock = {
              block_state: {
                active_user_count: 1, // initialize with 1 for this new user
                active_users: { [userId]: true }, // add user immediately
                sos_count: fetchedData?.block_state?.sos_count || 0,
                ai_analysis: fetchedData?.block_state?.ai_analysis || "",
                safety_metrics: fetchedData?.block_state?.safety_metrics || {
                  current_score: 10.0,
                  mean_sos: 1.0,
                  std_dev: 1.0,
                  z_score: 0.0,
                  last_updated: null,
                },
                geohashId: blockId,
              }
            };
          } else {
            // Block exists, safely update the users list and count
            if (!currentBlock.block_state) {
              // Failsafe in case block_state was somehow wiped
              currentBlock.block_state = { active_user_count: 0, active_users: {} };
            }
            if (!currentBlock.block_state.active_users) {
              currentBlock.block_state.active_users = {};
            }

            // Check if this specific user isn't already there to prevent double-counting
            if (!currentBlock.block_state.active_users[userId]) {
              currentBlock.block_state.active_users[userId] = true;
              currentBlock.block_state.active_user_count = (currentBlock.block_state.active_user_count || 0) + 1;
            }
          }

          return currentBlock;
        });
      })
    );

  } catch (error) {
    console.error("Error in addToRTDB process:", error);
  }
};
