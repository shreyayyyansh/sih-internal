import { fileURLToPath } from "url";
import fs from "fs";
import { runHeatCheck } from "../../gee/earth/surfaceHeat/landsat_surface_temp.js";
import { runAirQualityCheck } from "../../gee/earth/pollutants/sentinel5p_air_quality.js";
import { runDeforestationCheck } from "../../gee/earth/deforestation/copernicus_deforestation.js";
import path from "path";
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
export async function generateLandHeatReport(req, res) {
    try {
        const {
            regionGeoJson,
            regionId,
            thresholdCelsius,
            recentDays,
            bufferMeters
        } = req.body;


        if (!regionGeoJson || !regionId) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: regionGeoJson or regionId"
            });
        }

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

        let landheat_analysis_result = null;
        let reportref = null;
        const sanitizedGeoJson = ensureGeoJsonFormat(regionGeoJson);
        try {

            landheat_analysis_result = await runHeatCheck(
                sanitizedGeoJson,
                regionId,
                credentialsPath,
                thresholdCelsius,
                bufferMeters,
                recentDays
            );


            if (!landheat_analysis_result) {
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
        console.log("userid", userId);
        if (landheat_analysis_result.status === 'success') {
            try {
                const report = await db.collection('landheat_reports').doc(userId).collection('reports').add({
                    parameters: {
                        recentDays,
                        bufferMeters
                    },
                    timestamp: new Date(),
                    ...landheat_analysis_result
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

        if (landheat_analysis_result.status === 'success') {
            try {
                const [o3Settled, deforestSettled] = await Promise.allSettled([
                  runAirQualityCheck(sanitizedGeoJson, regionId, credentialsPath, 'O3', 0.1, bufferMeters || 1000, 6),
                  runDeforestationCheck(sanitizedGeoJson, regionId, credentialsPath, 0.15, bufferMeters || 1000, 6)
                ]);

                const secondaryResults = [
                  o3Settled.status === 'fulfilled' ? { module: 'air_pollutants', data: o3Settled.value } : null,
                  deforestSettled.status === 'fulfilled' ? { module: 'deforestation', data: deforestSettled.value } : null,
                ].filter(Boolean);

                intelligence_report = await runGeoIntelligence({
                    module_type: "surface_heat",
                    region_id: regionId,
                    summary_stats: {
                        alert_triggered: landheat_analysis_result.alert_triggered,
                        max_temp_celsius: landheat_analysis_result.max_temp_celsius,
                        mean_temp_celsius: landheat_analysis_result.mean_temp_celsius,
                        threshold: landheat_analysis_result.threshold,
                        dates: landheat_analysis_result.dates,
                    },
                    image_url: landheat_analysis_result.heatmap_url,
                    historical_reports: secondaryResults,
                });

                if (secondaryResults.length > 0) {
                    composite_findings = await runCrossModuleCorrelation({
                        current_module: "surface_heat",
                        current_data: {
                            alert_triggered: landheat_analysis_result.alert_triggered,
                            max_temp_celsius: landheat_analysis_result.max_temp_celsius,
                            mean_temp_celsius: landheat_analysis_result.mean_temp_celsius
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
                await db.collection('landheat_reports').doc(userId).collection('reports').doc(reportref).update({
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
                ...landheat_analysis_result,
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