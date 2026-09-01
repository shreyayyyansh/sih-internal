import cron from 'node-cron';
import admin from 'firebase-admin';
import { db } from '../firebaseadmin/firebaseadmin.js';
import { tryAutoDispatch, tryFireAutoDispatch } from '../services/autoDispatch.js';

/**
 * Runs every 2 minutes.
 * Scans Firestore for reports that failed to auto-dispatch at creation time
 * (e.g., because no staff were online) and tries to assign them again.
 */
export function initAutoDispatchCron() {
  console.log('[AutoDispatchCron] 🕒 Initializing auto-dispatch background cron (runs every 2 mins)');

  cron.schedule('*/2 * * * *', async () => {
    console.log('[AutoDispatchCron] 🔍 Sweeping for unassigned reports...');

    try {
      // 1. Check Waste, Water, Electricity, Infrastructure (Firestore status: VERIFIED)
      // We use collectionGroup('userReports') to bypass the `{geohash}/reports/{userId}` hierarchy
      const strandedReports = await db.collectionGroup('userReports')
        .where('status', '==', 'VERIFIED')
        .get();

      if (!strandedReports.empty) {
        console.log(`[AutoDispatchCron] Found ${strandedReports.size} stranded non-fire reports.`);
        
        strandedReports.forEach((doc) => {
          const data = doc.data();
          // The collection name prefix is usually the department
          // e.g. wasteReports, waterReports 
          // We can determine dept from the document path, or just try to dispatch it if we have geohash
          if (!data.geohash) return;

          // Determine dept from ref path (e.g., wasteReports/... or infrastructureReports/...)
          const pathSegments = doc.ref.path.split('/');
          const rootCollection = pathSegments[0]; // e.g., 'wasteReports'
          const actualDept = rootCollection.replace('Reports', ''); 

          tryAutoDispatch({
            reportId:   data.id || doc.id,
            department: actualDept,
            geohash:    data.geohash,
            location:   data.location || data.coords,
            title:      data.title,
            aiAnalysis: data.aiAnalysis,
            severity:   data.severity,
            address:    data.address,
            email:      data.email || data.userEmail,
            userId:     data.userId,
            imageUrl:   data.imageUrl || data.image || null
          }).catch(() => {});
        });
      }
    } catch (err) {
      console.error('[AutoDispatchCron] ❌ Error scanning non-fire reports:', err.message);
      // FAILED_PRECONDITION often contains a direct link to generate the index in err.details or err.message
      // Let's log the raw error object so the console outputs the clickable URL
      console.error(err);
    }

    // 2. Check Fire Reports
    // Fire reports use Firebase RTDB primarily, but their status is updated there.
    // However, if the RTDB status is RAISED (not ASSIGNED), it needs dispatch.
    try {
      const rtdb = admin.database();
      const fireAlertsSnap = await rtdb.ref('fireAlerts').once('value');
      const fireAlertsData = fireAlertsSnap.val();

      if (fireAlertsData) {
        let strandedFireCount = 0;

        // Structure: fireAlerts/{geohash}/{alertId}
        Object.entries(fireAlertsData).forEach(([geohash, alertsObj]) => {
          Object.entries(alertsObj).forEach(([alertId, alertData]) => {
            // "RAISED" is the initial unassigned state for Fire SOS in RTDB
            if (alertData.status === 'RAISED') {
              strandedFireCount++;
              tryFireAutoDispatch({
                alertId: alertId,
                geohash: geohash,
                location: alertData.location || alertData.coords
              }).catch(() => {});
            }
          });
        });

        if (strandedFireCount > 0) {
          console.log(`[AutoDispatchCron] Found ${strandedFireCount} stranded fire reports.`);
        }
      }
    } catch (err) {
      console.error('[AutoDispatchCron] ❌ Error scanning fire reports:', err.message);
    }
  });
}
