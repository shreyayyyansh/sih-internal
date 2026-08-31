import { db } from "../../firebaseadmin/firebaseAdmin.js";

export const registerNGO = async (data) => {

  const ref = await db.collection("kindshare_ngos").add({

    name: data.name,
    adminName: data.adminName,
    email: data.email,
    phone: data.phone,
    address: data.address,
    description: data.description,
    categories: data.categories,

    lat: parseFloat(data.lat),
    lon: parseFloat(data.lon),

    rating: 0,

    status: "pending",          // IMPORTANT
    emailVerified: false,       // IMPORTANT

    createdAt: new Date()

  });

  return { id: ref.id };

};

/* ----------------------------
DISTANCE CALCULATION
(Haversine Formula)
-----------------------------*/
function getDistance(lat1, lon1, lat2, lon2) {

  const R = 6371;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) *
    Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}


/* ----------------------------
GET NGOs
-----------------------------*/
export const getNGOs = async (category, lat, lon) => {

let query = db
  .collection("kindshare_ngos")
  .where("status", "==", "approved");

  if (category) {
    query = query.where("categories", "array-contains", category);
  }

  const snapshot = await query.get();

  const ngos = [];

  snapshot.forEach(doc => {

    const ngo = {
      id: doc.id,
      ...doc.data()
    };

    // calculate distance
    if (
      lat &&
      lon &&
      ngo.lat !== null &&
      ngo.lon !== null
    ) {

      ngo.distance = getDistance(
        Number(lat),
        Number(lon),
        Number(ngo.lat),
        Number(ngo.lon)
      );

    }

    ngos.push(ngo);

  });

  /* ----------------------------
  SORT NGOs
  1. Rating (desc)
  2. Distance (asc)
  -----------------------------*/

  ngos.sort((a, b) => {

    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }

    return (a.distance || 999) - (b.distance || 999);

  });

  return ngos;

};