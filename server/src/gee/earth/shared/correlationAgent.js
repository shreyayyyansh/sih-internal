/**
 * Runs the Cross-Module Correlation Agent via the FastAPI Agent.
 * Non-blocking: resolves to an empty array on any failure.
 *
 * @param {Object} payload
 * @param {string} payload.current_module (maps to primary_module)
 * @param {Object} payload.current_data (maps to primary_stats)
 * @param {Array} payload.history (maps to secondary_results)
 * @returns {Promise<Array>} Array of composite finding objects
 */
export async function runCrossModuleCorrelation(payload) {
  try {
    const backendUrl =  process.env.PYTHON_SERVER ;
    
    // Map the older JS payload names to our new Pydantic schema
    const formattedPayload = {
      primary_module: payload.current_module,
      primary_stats: payload.current_data || {},
      secondary_results: payload.history || []
    };

    const response = await fetch(`${backendUrl}/analyze-geoscope-correlation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formattedPayload)
    });

    if (!response.ok) {
      console.warn(`⚠️ Cross-Correlation HTTP error: ${response.status}`);
      return [];
    }

    const result = await response.json();
    console.log("✅ Cross-Correlation report generated successfully via Agent Server.");
    return result.findings || [];
  } catch (err) {
    console.warn("⚠️ Cross-Correlation API error:", err.message);
    return [];
  }
}
