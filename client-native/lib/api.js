import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) throw new Error("EXPO_PUBLIC_API_URL is not defined");

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

// Create a holder for the token getter function
let getAuth0Token = null;
export const setAuth0TokenGetter = (fn) => { getAuth0Token = fn; };

// 🚀 Automatically add the token to EVERY request
api.interceptors.request.use(async (config) => {
  if (getAuth0Token) {
    const token = await getAuth0Token();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Request Interceptor
api.interceptors.request.use(
  async (config) => {
    //console.log("Starting Request:", config); // Log request details
    return config;
  },
  (error) => {
    console.error("Request Error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    //console.log("Response:", response); // Log response details
    return response;
  },
  (error) => {
    //console.error("Response Error:", error);

    // Handle specific error codes globally
    if (error.response) {
      if (error.response.status === 401) {
        console.error("Unauthorized! Redirecting to login...");
        // Add logic to redirect to login or refresh token
      }
    } else if (error.message === "Network Error") {
      console.error("Network Error! Please check your connection.");
    }

    return Promise.reject(error);
  }
);

export const verifyCleanup = async (reportId, file, lat, lng) => {
  const formData = new FormData();
  
  // React Native Image Object
  formData.append("image", file); 
  formData.append("lat", lat);
  formData.append("lng", lng);

  // No need to pass 'token' or 'headers' manually anymore!
  const response = await api.post(`/api/garbage/${reportId}/verify-cleanup`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};