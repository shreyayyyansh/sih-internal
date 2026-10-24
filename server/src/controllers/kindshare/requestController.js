import { db } from "../../firebaseadmin/firebaseAdmin.js";

export const createRequest = async (req, res) => {

  try {

    const requestData = {
      ...req.body,
      status: "pending",
      createdAt: new Date()
    };

    const ref = await db
      .collection("kindshare_requests")
      .add(requestData);

    res.json({
      message: "Request sent successfully",
      id: ref.id
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to send request"
    });

  }

};

export const getNGORequests = async (req, res) => {

  try {

    const { ngoId } = req.params;

    const snapshot = await db
      .collection("kindshare_requests")
      .where("ngoId", "==", ngoId)
      .get();

    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(requests);

  } catch (error) {

    res.status(500).json({
      error: "Failed to fetch requests"
    });

  }

};
import { sendReceiverStatusEmail } from "../../services/kindshare/emailService.js";

export const updateRequestStatus = async (req, res) => {

  try {

    const { id } = req.params;
    const { status } = req.body;
    console.log("the cuurent status", status);

    const requestRef = db.collection("kindshare_requests").doc(id);
    const doc = await requestRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const request = doc.data();

    await requestRef.update({ status });

    await sendReceiverStatusEmail(
      request.receiverEmail,
      request.receiverName,
      status
    );

    res.json({
      message: "Request status updated"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to update request"
    });

  }

};
export const getReceiverRequests = async (req, res) => {

  try {

    const { email } = req.query;

    const snapshot = await db
      .collection("kindshare_requests")
      .where("receiverEmail", "==", email)
      .get();

    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(requests);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to fetch receiver requests"
    });

  }

};