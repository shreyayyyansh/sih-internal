import * as React from "react";
import { Auth0Provider } from "react-native-auth0";

// In Expo, environment variables must start with EXPO_PUBLIC_
const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;

const AuthProvider = ({ children }) => {
  // react-native-auth0 handles the native redirects automatically
  // using the scheme defined in your app.json. We don't need onRedirectCallback here.
  
  if (__DEV__) {
    console.log("Auth0 Audience:", process.env.EXPO_PUBLIC_AUTH0_AUDIENCE);
  }

  return (
    <Auth0Provider domain={domain} clientId={clientId} customScheme="com.anonymous.urbanflow.auth0">
      {children}
    </Auth0Provider>
  );
};

export default AuthProvider;