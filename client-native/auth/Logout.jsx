import { TouchableOpacity, Text } from "react-native";
import { useAuth0 } from "react-native-auth0";
import { useAuthStore } from "../store/useAuthStore";

export default function Logout() {
  const { clearSession } = useAuth0();
  const clearUser = useAuthStore((s) => s.clearUser);

  const handleLogout = async () => {
    try {
      await clearSession({
        customScheme:"com.anonymous.urbanflow.auth0",
        federated: false
      });
      clearUser();
      console.log("Auth0 session cleared");
    } catch (e) {
      console.log("Background Auth0 session clear failed:", e);
    }
  };

  return (
    <TouchableOpacity
    >
    </TouchableOpacity>
  );
}