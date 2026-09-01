import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from '@react-native-async-storage/async-storage'; // <-- 1. Import Native Storage

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      
      // Set user data
      setUser: (userData) => {
        if (!userData) {
        set({
          user: null,
          isAuthenticated: false
        });
          return;
        }
        set({
          user: {
            id: userData.sub || userData.id,
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            email_verified: userData.email_verified,
            ...userData,
          },
          isAuthenticated: true
        });
      },
      
      // Clear user data (logout)
      clearUser: () => {
        set({
          user: null,
          isAuthenticated: false
        });
      },
      
      // Get current user
      getUser: () => get().user,
      
      // Check if user is authenticated
      isAuth: () => get().isAuthenticated,
      
      // Update specific user fields
      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...updates
            }
          });
        }
      }
    }),
    {
      name: "auth-store", // The key it will be saved under in AsyncStorage
      storage: createJSONStorage(() => AsyncStorage), // <-- 2. Tell Zustand to use the phone's storage
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);