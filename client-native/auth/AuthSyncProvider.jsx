import { useEffect, useRef } from "react";
import { useAuth0 } from "react-native-auth0";
import { useAuthStore } from "../store/useAuthStore";
import { api } from "../lib/api";
import { setAuth0TokenGetter } from "../lib/auth0Axios";

export default function AuthSyncProvider({ children }) {
  const { user, isLoading, getCredentials } = useAuth0();
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const hasSyncedWithBackend = useRef(false);

  // 1. Extract a primitive ID to prevent infinite useEffect loops
  const userId = user?.sub;

  useEffect(() => {
    setAuth0TokenGetter(async () => {
      try {
        const credentials = await getCredentials();
        return credentials?.accessToken || null;
      } catch (error) {
        return null;
      }
    });
  }, []); // <-- REMOVED getCredentials to prevent background loops

  useEffect(() => {
    if (isLoading) return;

    if (!userId) {
      hasSyncedWithBackend.current = false;
      // Only clear if Zustand currently thinks we are authenticated
      if (useAuthStore.getState().isAuthenticated) {
        clearUser();
      }
      return;
    }

    // UPDATE UI IMMEDIATELY
    // Check state directly to prevent unnecessary Zustand updates
    if (!useAuthStore.getState().isAuthenticated || useAuthStore.getState().user?.sub !== userId) {
      setUser(user);
    }

    const syncWithBackend = async () => {
      if (hasSyncedWithBackend.current) return;
      
      try {
        const credentials = await getCredentials();
        const token = credentials?.accessToken;

        if (token) {
          const res=await api.post("/api/auth/sync-user", {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
          useAuthStore.getState().setUser({
            ...user,
            ...res.data
          })
          hasSyncedWithBackend.current = true;
          console.log("Backend sync complete");
        }
      } catch (err) {
        console.error("Backend sync failed:", err);
      }
    };

    syncWithBackend();
    
    // 2. DEPEND ON THE PRIMITIVE STRING, NOT THE OBJECT
  }, [isLoading, userId]); 

  return children;
}