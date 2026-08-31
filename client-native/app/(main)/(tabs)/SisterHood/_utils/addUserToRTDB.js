import { ref, set } from "firebase/database";
import ngeohash from "ngeohash";
import { db } from "../../../../../lib/firebase";
import { UserSchema } from "../_models/RTDB/UserModel";
export const addUserToRTDB = async (user, lat, lng) => {
  const geo6 = ngeohash.encode(lat, lng, 6);
  const geo8 = ngeohash.encode(lat, lng, 8);
  const userData = {
    ...UserSchema,
    email: user.email,
    name: user.displayName,
    id: user.id,
    current_lat: lat,
    current_lng: lng,
    current_geohash_6: geo6,
    current_geohash_8: geo8
  };
  await set(ref(db, `users/${user.id}`), userData);
};