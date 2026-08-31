/**
 * Runs the GeoScope AI Intelligence Pipeline via the FastAPI Agent.
 * Non-blocking: resolves to null on any failure so primary GEE results are never broken.
 *
 * @param {Object} payload
 * @param {string} payload.module_type - e.g. "deforestation", "fire", "coastal", "flood", "pollutants", "surface_heat"
 * @param {string} payload.region_id
 * @param {Object} payload.summary_stats - Module-specific metrics
 * @param {string|null} payload.image_url - Optional thumbnail URL
 * @param {Array} payload.historical_reports - Past reports for context
 * @returns {Promise<Object|null>} Intelligence report or null on failure
 */
export async function runGeoIntelligence(payload) {
  try {
    const backendUrl = process.env.PYTHON_SERVER;
    
    const response = await fetch(`${backendUrl}/analyze-geoscope-intelligence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`⚠️ GeoIntelligence HTTP error: ${response.status}`);
      return null;
    }

    const result = await response.json();
    console.log("✅ GeoIntelligence report generated successfully via Agent Server.");
    return result;
  } catch (err) {
    console.warn("⚠️ GeoIntelligence API error:", err.message);
    return null;
  }
}
