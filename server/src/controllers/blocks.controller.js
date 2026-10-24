import { db } from "../firebaseadmin/firebaseadmin.js";

export const fetchBlocks = async (req, res) => {
  try {
    const { blocks } = req.body;

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A non-empty 'blocks' array is required in the request body.",
      });
    }

    const fetchedBlocksData = {};
    const blockRefs = blocks.map(blockId => db.collection("blocks").doc(blockId));
    if (blockRefs.length > 0) {
        const documentSnapshots = await db.getAll(...blockRefs);
        documentSnapshots.forEach((docSnap) => {
            if (docSnap.exists) {
                fetchedBlocksData[docSnap.id] = docSnap.data();
            }
        });
    }

    return res.status(200).json({
      success: true,
      blocks: fetchedBlocksData,
    });
  } catch (err) {
    console.error("❌ fetchBlocks error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching blocks",
    });
  }
};

export const updateBlock = async (req, res) => {
  try {
    const { blockId, block_state } = req.body;

    if (!blockId || !block_state) {
      return res.status(400).json({
        success: false,
        message: "Both 'blockId' and 'block_state' are required.",
      });
    }

    const blockRef = db.collection("blocks").doc(blockId);
    
    // We use set with merge: true to gracefully update or create the block document
    await blockRef.set({ block_state }, { merge: true });

    return res.status(200).json({
      success: true,
      message: "Block updated successfully",
    });
  } catch (err) {
    console.error("❌ updateBlock error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error updating block",
    });
  }
};
