import { ref, runTransaction } from 'firebase/database';
import { db } from '../../../../../lib/firebase';
import { api } from '../../../../../lib/api';
/**
 * @param {Array<string>} toRemoveBlocks
 * @param {string} userId
 */
export const removeFromRTDB = async (toRemoveBlocks, userId) => {
  if (!toRemoveBlocks || toRemoveBlocks.length === 0 || !userId) return;

  try {
    await Promise.all(
      toRemoveBlocks.map((blockId) => {
        const blockRef = ref(db, `blocks/${blockId}`);

        return runTransaction(blockRef, (currentBlock) => {
          if (!currentBlock || !currentBlock.block_state || !currentBlock.block_state.active_users?.[userId]) {
            return currentBlock
          }
          delete currentBlock.block_state.active_users[userId];
          currentBlock.block_state.active_user_count = Math.max(0, (currentBlock.block_state.active_user_count || 1) - 1);
          if (currentBlock.block_state.active_user_count === 0) {
            const firestorePayload = {
              sos_count: currentBlock.block_state.sos_count || 0,
              ai_analysis: currentBlock.block_state.ai_analysis || "",
              safety_metrics: currentBlock.block_state.safety_metrics || {
                current_score: 10.0,
                mean_sos: 1.0,
                std_dev: 1.0,
                z_score: 0.0,
                last_updated: null
              }
            };
            
            api.post('/api/blocks/update', { 
              blockId: blockId, 
              block_state: firestorePayload 
            }).catch(console.error);

            return null;
          }
          
          return currentBlock;
        });
      })
    );

  } catch (error) {
    console.error("Error in removeFromRTDB process:", error);
  }
};
