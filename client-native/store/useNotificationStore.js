import { create } from "zustand";
import EventSource from "react-native-sse";
import { api } from "../lib/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

let eventSource = null;

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  connectionStatus: "Disconnected",

  connect: async (userId) => {
    if (!userId) return;

    const safeUserId = encodeURIComponent(userId);

    // 1. Fetch notification history
    try {
      const res = await api.get(`/api/notifications/${safeUserId}`);
      const history = res.data || [];
      set({
        notifications: history,
        unreadCount: history.filter((n) => !n.isRead).length,
      });
    } catch (err) {
      console.error("[Notifications] Failed to fetch history:", err);
    }

    // 2. Close any existing connection
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    // 3. Open SSE connection
    const es = new EventSource(`${API_URL}/notifications/${safeUserId}`);

    es.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (["heartbeat", "connection_ack"].includes(data.type)) return;

        set((state) => {
          if (state.notifications.find((n) => n.id === data.id)) return state;
          return {
            notifications: [data, ...state.notifications],
            unreadCount: state.unreadCount + 1,
          };
        });
      } catch (err) {
        console.error("[SSE] Parse Error:", err);
      }
    });

    es.addEventListener("open", () => {
      set({ connectionStatus: "Connected" });
      console.log("[SSE] Connected for user:", userId);
    });

    es.addEventListener("error", (err) => {
      set({ connectionStatus: "Reconnecting..." });
      console.warn("[SSE] Connection error:", err);
    });

    eventSource = es;
  },

  disconnect: () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    set({ connectionStatus: "Disconnected" });
  },

  markAsRead: async (notificationId) => {
    // Optimistic update
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await api.patch(`/api/notifications/${notificationId}/read`);
    } catch (err) {
      console.error("[Notifications] Failed to mark as read:", err);
    }
  },
}));
