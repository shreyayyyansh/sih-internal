import Auth0 from "react-native-auth0";

// Same domain/clientId as AuthProvider, so this shares the native credential store the
// Auth0Provider saves into. Unlike useAuth0(), it works outside React — including the
// headless JS that runs notification actions and background tasks after the app is killed.
export const auth0 = new Auth0({
  domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
  clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
});

/** Stored access token, or null when logged out / expired without a refresh token. */
export const getStoredAccessToken = async () => {
  try {
    const credentials = await auth0.credentialsManager.getCredentials();
    return credentials?.accessToken || null;
  } catch {
    return null;
  }
};
