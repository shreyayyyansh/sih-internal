import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { runDeforestationCheck } from "../../gee/earth/deforestation/copernicus_deforestation.js";
import { runHeatCheck } from "../../gee/earth/surfaceHeat/landsat_surface_temp.js";
import { runAirQualityCheck } from "../../gee/earth/pollutants/sentinel5p_air_quality.js";
import { db } from "../../firebaseadmin/firebaseadmin.js";
import { runGeoIntelligence } from "../../gee/earth/shared/geoIntelligence.js";
import { runCrossModuleCorrelation } from "../../gee/earth/shared/correlationAgent.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function ensureGeoJsonFormat(geometry) {

    if (!geometry || !geometry.coordinates) return geometry;

    const coords = geometry.coordinates;
    if (Array.isArray(coords) && coords.length > 0 && typeof coords[0] === 'object' && !Array.isArray(coords[0])) {

        console.log("Backend: Detected Google Maps format. Converting to GeoJSON...");


        let ring = coords.map(point => [point.lng, point.lat]);
        const first = ring[0];
        const last = ring[ring.length - 1];

        if (first[0] !== last[0] || first[1] !== last[1]) {
            ring.push(first);
        }

        return {
            type: 'Polygon',
            coordinates: [ring]
        };
    }
    return geometry;
}
export async function generateDeforestationReport(req, res) {
    try {
        const {
            regionGeoJson,
            regionId,
            threshold,
            buffermeters,
            previousDays,
        } = req.body;

        if (!regionGeoJson || !regionId) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: regionGeoJson or regionId"
            });
        }


        const sanitizedGeoJson = ensureGeoJsonFormat(regionGeoJson);


        let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (credentialsPath && credentialsPath.startsWith('"') && credentialsPath.endsWith('"')) {
            credentialsPath = credentialsPath.slice(1, -1);
        }

        if (!credentialsPath) {
            return res.status(500).json({ success: false, error: "GEE credentials path env error" });
        }

        if (!path.isAbsolute(credentialsPath)) {
            credentialsPath = path.resolve(process.cwd(), credentialsPath);
        }

        if (!fs.existsSync(credentialsPath)) {
            return res.status(500).json({ success: false, error: "GEE credentials file not found" });
        }


        let deforestation_analysis_result = null;
        let reportref = null;
        try {
            deforestation_analysis_result = await runDeforestationCheck(
                sanitizedGeoJson,
                regionId,
                credentialsPath,
                threshold,
                buffermeters,
                previousDays
            );

            if (!deforestation_analysis_result) {
                throw new Error("Analysis script returned no data");
            }

        } catch (innerError) {
            console.error("GEE Script Error:", innerError);
            return res.status(500).json({
                success: false,
                result: {
                    status: "error",
                    message: innerError.message,
                    alert_triggered: false,
                }
            });
        }


        const userId = req.auth.payload.sub;
        console.log("userid", userId)
        if (deforestation_analysis_result.status === 'success') {
            try {

                const report = await db.collection('deforestation_reports').doc(userId).collection('reports').add({
                    regionGeoJson: JSON.stringify(sanitizedGeoJson),
                    timestamp: new Date(),
                    parameters: {
                        buffer: buffermeters || 1000,
                        baselineDays: previousDays || 90
                    },
                    ...deforestation_analysis_result
                });
                reportref = report.id;
                console.log(`Report saved to Firestore for region: ${regionId}`);

            } catch (dbError) {
                console.error("Firebase Save Error:", dbError);
            }
        }

        // --- AI Intelligence Pipeline & Cross-Module Correlation ---
        let intelligence_report = null;
        let composite_findings = [];

        if (deforestation_analysis_result.status === 'success') {
            try {
                const [heatSettled, coSettled] = await Promise.allSettled([
                  runHeatCheck(sanitizedGeoJson, regionId, credentialsPath, 40, buffermeters || 1000, 15),
                  runAirQualityCheck(sanitizedGeoJson, regionId, credentialsPath, 'CO', 0.05, buffermeters || 1000, 6)
                ]);

                const secondaryResults = [
                  heatSettled.status === 'fulfilled' ? { module: 'surface_heat', data: heatSettled.value } : null,
                  coSettled.status === 'fulfilled' ? { module: 'air_pollutants', data: coSettled.value } : null,
                ].filter(Boolean);

                intelligence_report = await runGeoIntelligence({
                    module_type: "deforestation",
                    region_id: regionId,
                    summary_stats: {
                        alert_triggered: deforestation_analysis_result.alert_triggered,
                        mean_ndvi_change: deforestation_analysis_result.mean_ndvi_change,
                        threshold: deforestation_analysis_result.threshold,
                        dates: deforestation_analysis_result.dates,
                    },
                    image_url: deforestation_analysis_result.change_image_url,
                    historical_reports: secondaryResults,
                });

                if (secondaryResults.length > 0) {
                    composite_findings = await runCrossModuleCorrelation({
                        current_module: "deforestation",
                        current_data: {
                            alert_triggered: deforestation_analysis_result.alert_triggered,
                            mean_ndvi_change: deforestation_analysis_result.mean_ndvi_change
                        },
                        history: secondaryResults
                    });
                }
            } catch (aiErr) {
                console.warn("⚠️ AI pipeline or correlation failed (non-blocking):", aiErr.message);
            }
        }

        
        // Save AI findings to history
        if (reportref && (intelligence_report || composite_findings?.length > 0)) {
            try {
                await db.collection('deforestation_reports').doc(userId).collection('reports').doc(reportref).update({
                    intelligence_report,
                    composite_findings
                });
                console.log(`✅ Appended AI analysis to Firestore doc: ${reportref}`);
            } catch (updateErr) {
                console.warn("⚠️ Failed to update history with AI findings:", updateErr);
            }
        }

        return res.json({
            success: true,
            result: {
                regionGeoJson: sanitizedGeoJson,
                ...deforestation_analysis_result,
                reportref,
                intelligence_report,
                composite_findings,
            }
        });

    } catch (error) {
        console.error("Controller Error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error",
            details: error.message
        });
    }
}