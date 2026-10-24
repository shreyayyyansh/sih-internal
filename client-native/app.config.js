// Injects secrets from .env into the static config in app.json.
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!googleMapsApiKey) {
  console.warn("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set — native Google Maps will not load.");
}

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: { ...config.ios?.config, googleMapsApiKey },
  },
  android: {
    ...config.android,
    config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } },
  },
});
