import admin from "firebase-admin";
import { createRequire } from "module";
const req = createRequire(import.meta.url);

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", error);
  }
} else {
  try {
    serviceAccount = req("../../serviceAccountKey.json");
  } catch (error) {
    console.error("No serviceAccountKey.json found and FIREBASE_SERVICE_ACCOUNT not set.");
  }
}

const databaseURL = "https://quantacon-3e441-default-rtdb.firebaseio.com";

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL,
    });
  } else {
    console.error("Firebase service account not available.");
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export const FieldValue = admin.firestore.FieldValue;
