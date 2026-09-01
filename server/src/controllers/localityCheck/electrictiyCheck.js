import { db } from '../../firebaseadmin/firebaseadmin.js';
import ngeohash from 'ngeohash';

// Electricity faults are tightly localised — keep radius small
// Geohash precision 7 = ~76m × 76m tile — must match what you encode with
const RADIUS_M= 15;

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R  = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a  =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function scanHash(hash, userLat, userLng, submitterId) {
  const candidates = [];

  let userDocRefs;
  try {
    userDocRefs = await db
      .collection('electricityReports')
      .doc(hash)
      .collection('reports')
      .listDocuments();
  } catch {
    return candidates;
  }

  if (!userDocRefs.length) return candidates;

  await Promise.all(
    userDocRefs.map(async (userDocRef) => {
      const userId = userDocRef.id;

      let snapshot;
      try {
        snapshot = await userDocRef
          .collection('userReports')
          .where('status', '!=', 'RESOLVED')
          .get();
      } catch {
        return;
      }

      snapshot.forEach((doc) => {
        const d    = doc.data();
        const rLat = d.location?.lat;
        const rLng = d.location?.lng;
        if (!rLat || !rLng) return;
        console.log("submitterid",submitterId);
        console.log("userid",userId);
        const dist = distanceMeters(userLat, userLng, rLat, rLng);
        if (dist <= RADIUS_M) {
          candidates.push({
            imageUrl:       d.imageUrl ?? null,
            userId,
            reportId:       doc.id,
            locality_email: d.email    ?? null,
            distance:       dist,
            isSelfDuplicate: userId === submitterId,
          });
        }
      });
    })
  );

  return candidates;
}

export const electricityCheck = async (req, res) => {
  try {
    const { location, geohash, userId } = req.body;

    if (!location?.lat || !location?.lng || !geohash) {
      return res.status(400).json({ message: 'Invalid location or geohash data' });
    }
    const { lat, lng } = location;
    const hashes = [geohash, ...ngeohash.neighbors(geohash)];

    const results = await Promise.all(hashes.map((h) => scanHash(h, lat, lng, userId)));
    const all     = results.flat();
    console.log(results,"results")

    if (!all.length) {
      return res.status(200).json({ duplicateFound: false });
    }

    const closest = all.reduce((best, cur) => (cur.distance < best.distance ? cur : best));

    console.log(`[Electricity] Duplicate found ${closest.distance.toFixed(1)}m away — reportId: ${closest.reportId}`);
    return res.status(200).json({ duplicateFound: true, data: closest });

  } catch (error) {
    console.error('[electricityCheck] error:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};