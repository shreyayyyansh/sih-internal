import admin from 'firebase-admin';
import { db } from '../firebaseadmin/firebaseadmin.js';
import { syncReportStatus } from './syncReportStatus.js';

// ── RTDB department key mapping ───────────────────────────────────────────────
// Maps the Firestore collection prefix to the RTDB staff path segment.
const DEPARTMENT_RTDB_KEY = {
  waste:          'waste',
  water:          'water',
  electricity:    'electricity',
  infrastructure: 'infra',       // RTDB uses "infra", Firestore uses "infrastructure"
};

// ── Haversine distance (meters) ───────────────────────────────────────────────
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── 24h deadline helper ───────────────────────────────────────────────────────
function getDeadline24h() {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d;
}

/**
 * Attempts to auto-dispatch a newly saved report to the nearest available staff.
 *
 * This is a FIRE-AND-FORGET function — it never throws.  If anything goes wrong
 * (no staff online, RTDB read fails, etc.) it logs a warning and the report
 * simply stays as VERIFIED for manual assignment later.
 *
 * @param {object} opts
 * @param {string} opts.reportId        – Firestore document ID of the new report
 * @param {string} opts.department      – e.g. "waste", "water", "electricity", "infrastructure"
 * @param {string} opts.geohash         – full-precision geohash stored on the report
 * @param {{lat:number, lng:number}} opts.location – report coordinates
 * @param {string} opts.title           – report title (used as task title)
 * @param {string} opts.aiAnalysis      – AI reasoning (used as task description)
 * @param {string} opts.severity        – "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
 * @param {string} opts.address         – human-readable address
 * @param {string} opts.email           – reporter email
 * @param {string} opts.userId          – reporter userId (Auth0 sub)
 */
export async function tryAutoDispatch({
  reportId,
  department,
  geohash,
  location,
  title,
  aiAnalysis,
  severity,
  address,
  email,
  userId,
  imageUrl,
}) {
  try {
    // 1. Resolve RTDB key
    const rtdbKey = DEPARTMENT_RTDB_KEY[department.toLowerCase()];
    if (!rtdbKey) {
      console.log(`[AutoDispatch] Unknown department "${department}" — skipping.`);
      return;
    }

    // ── NEW: Status Guard ──
    // Check if report is already assigned to avoid duplicates (e.g. from cron and real-time triggers)
    const collectionPrefix = department.toLowerCase() === 'infrastructure'
      ? 'infrastructureReports'
      : `${department.toLowerCase()}Reports`;
    const reportPathSafe = `${collectionPrefix}/${geohash}/reports/${userId}/userReports/${reportId}`;
    
    try {
      const reportSnap = await db.doc(reportPathSafe).get();
      if (reportSnap.exists) {
        const currentData = reportSnap.data();
        if (['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'USERVERIFICATION'].includes(currentData.status)) {
          console.log(`[AutoDispatch] Report ${reportId} already has status ${currentData.status}. Aborting redundant dispatch.`);
          return;
        }
      }
    } catch (checkErr) {
      console.error(`[AutoDispatch] Guard check failed for ${reportId}:`, checkErr.message);
      // Non-fatal: if check fails, we might still want to try to assign it if we can
    }

    // 2. Use 6-char geohash prefix (matches how staff register themselves)
    const zoneHash = geohash.substring(0, 6);

    // 3. Read available staff from RTDB
    const rtdb = admin.database();
    const snapshot = await rtdb.ref(`staff/${rtdbKey}/${zoneHash}`).once('value');
    const staffMap = snapshot.val();

    if (!staffMap || Object.keys(staffMap).length === 0) {
      console.log(`[AutoDispatch] No staff online in ${rtdbKey}/${zoneHash} — report stays VERIFIED.`);
      return;
    }

    // 4. Build staff list with real IDs (undo the sanitize: _ → |)
    const staffList = Object.entries(staffMap).map(([key, val]) => ({
      id: key.replace('_', '|'),
      ...val,
    }));

    // 5. Find nearest staff by Haversine distance
    const reportLat = Number(location?.lat);
    const reportLng = Number(location?.lng);

    if (!reportLat || !reportLng) {
      console.log(`[AutoDispatch] ❌ Skipping: Report ${reportId} has invalid coordinates (lat: ${reportLat}, lng: ${reportLng}). Payload location:`, location);
      return;
    }

    let closestStaff = null;
    let minDistance = Infinity;

    for (const staff of staffList) {
      const sLat = Number(staff.coords?.lat);
      const sLng = Number(staff.coords?.lng);
      if (!sLat || !sLng) {
         console.log(`[AutoDispatch] ⚠️ Skipping staff ${staff.id} because they have no GPS coords in RTDB.`);
         continue;
      }

      const dist = haversineMeters(reportLat, reportLng, sLat, sLng);
      if (dist < minDistance) {
        minDistance = dist;
        closestStaff = staff;
      }
    }

    if (!closestStaff) {
      console.log(`[AutoDispatch] ❌ Skipping: No staff found in zone ${zoneHash} with valid GPS coordinates.`);
      return;
    }

    console.log(
      `[AutoDispatch] Nearest staff: ${closestStaff.name} (${(minDistance / 1000).toFixed(2)} km) → assigning...`
    );

    // 6. Create task document in Firestore (same schema as staff.controller.js → assignTask)
    const newTask = {
      title:           `Fix: ${title || 'Civic Issue'}`,
      description:     `AI Analysis: ${aiAnalysis || 'N/A'}`,
      priority:        severity || 'MEDIUM',
      status:          'PENDING',
      assignedTo:      closestStaff.id,
      assignedToName:  closestStaff.name || 'Staff Member',
      assignedBy:      'SYSTEM_AUTO_DISPATCH',
      zoneGeohash:     zoneHash,
      department:      rtdbKey,          // use the RTDB key as canonical department name
      location:        { lat: reportLat, lng: reportLng },
      reportId:        reportId || null,
      reporterEmail:   email || null,
      reporterUserId:  userId || null,
      imageUrl:        imageUrl || null,
      severity:        severity || 'MEDIUM',
      address:         address || null,
      createdAt:       admin.firestore.FieldValue.serverTimestamp(),
      deadline:        admin.firestore.Timestamp.fromDate(getDeadline24h()),
    };

    const taskRef = await db.collection('tasks').add(newTask);
    console.log(`[AutoDispatch] Task created: ${taskRef.id}`);

    // 7. Update the report status to ASSIGNED
    //    Path: {department}Reports/{geohash}/reports/{userId}/userReports/{reportId}
    const reportPath = reportPathSafe;

    try {
      await db.doc(reportPath).update({
        status:         'ASSIGNED',
        assignedTaskId: taskRef.id,
        updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[AutoDispatch] Report updated at: ${reportPath}`);
      
      // Keep UrbanConnect Feed in sync
      if (reportId) {
        syncReportStatus(reportId, 'ASSIGNED');
      }
    } catch (updateErr) {
      console.error(`[AutoDispatch] Failed to update report at ${reportPath}:`, updateErr.message);
      // Task was still created — admin can see it even if report flag didn't update.
    }

    console.log(`[AutoDispatch] ✅ Auto-dispatched to ${closestStaff.name} for ${department} report.`);
  } catch (err) {
    // Catch-all: never let auto-dispatch crash the main flow
    console.error('[AutoDispatch] ❌ Error (non-fatal):', err.message);
  }
}

/**
 * Fire Department specific Auto-Dispatch.
 * Fire uses RTDB for both alerts and staff tracking.
 */
export async function tryFireAutoDispatch({ alertId, geohash, location }) {
  try {
    const zoneHash = geohash.substring(0, 6);
    const rtdb = admin.database();

    // 1. Read fire staff
    const snapshot = await rtdb.ref(`staff/fire/${zoneHash}`).once('value');
    const staffMap = snapshot.val();

    if (!staffMap || Object.keys(staffMap).length === 0) {
      console.log(`[FireAutoDispatch] No fire staff online in sector ${zoneHash}.`);
      return;
    }

    // 2. Filter for AVAILABLE staff
    const availableStaff = [];
    Object.entries(staffMap).forEach(([key, val]) => {
      if (val.status === 'AVAILABLE' && val.coords?.lat && val.coords?.lng) {
        availableStaff.push({ id: key, ...val });
      }
    });

    if (availableStaff.length === 0) {
      console.log(`[FireAutoDispatch] Fire staff exist, but none are AVAILABLE.`);
      return;
    }

    // 3. Find nearest
    const alertLat = Number(location?.lat);
    const alertLng = Number(location?.lng);

    if (!alertLat || !alertLng) {
      console.log('[FireAutoDispatch] Alert has no GPS coords.');
      return;
    }

    let closestStaff = null;
    let minDistance = Infinity;

    for (const staff of availableStaff) {
      const dist = haversineMeters(alertLat, alertLng, Number(staff.coords.lat), Number(staff.coords.lng));
      if (dist < minDistance) {
        minDistance = dist;
        closestStaff = staff;
      }
    }

    // 4. Perform Multi-path RTDB Update (mirrors client-side fire.jsx logic)
    const updates = {};
    updates[`fireAlerts/${geohash}/${alertId}/status`] = "ASSIGNED";
    updates[`fireAlerts/${geohash}/${alertId}/assignedTo`] = closestStaff.userId || closestStaff.id.replace('_', '|');
    updates[`fireAlerts/${geohash}/${alertId}/assignedToName`] = closestStaff.name || 'Fire Staff';
    updates[`fireAlerts/${geohash}/${alertId}/assignedAt`] = Date.now();

    updates[`staff/fire/${zoneHash}/${closestStaff.id}/status`] = "ENGAGED";
    updates[`staff/fire/${zoneHash}/${closestStaff.id}/currentTask`] = alertId;

    await rtdb.ref().update(updates);
    console.log(`[FireAutoDispatch] ✅ Dispatched ${alertId} to ${closestStaff.name} (${(minDistance / 1000).toFixed(2)} km)`);
  } catch (err) {
    console.error('[FireAutoDispatch] ❌ Error (non-fatal):', err.message);
  }
}
