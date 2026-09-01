import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { runAirQualityCheck } from "../../gee/earth/pollutants/sentinel5p_air_quality.js";
import { runHeatCheck } from "../../gee/earth/surfaceHeat/landsat_surface_temp.js";
import dotenv from "dotenv";
import { db } from "../../firebaseadmin/firebaseadmin.js";
import { runGeoIntelligence } from "../../gee/earth/shared/geoIntelligence.js";
import { runCrossModuleCorrelation } from "../../gee/earth/shared/correlationAgent.js";
dotenv.config();

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
export async function generatePollutantsReport(req, res) {
    try {

        const {
            regionGeoJson,
            regionId,
            threshold,
            pollutant,
            bufferMeters,
            recentDays
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

        let pollutant_analysis_result = null;
        let reportref = null;
        const sanitizedGeoJson = ensureGeoJsonFormat(regionGeoJson);
        try {


            pollutant_analysis_result = await runAirQualityCheck(
                sanitizedGeoJson,
                regionId,
                credentialsPath,
                pollutant,
                threshold,
                bufferMeters,
                recentDays
            );


            if (!pollutant_analysis_result) {
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


        if (pollutant_analysis_result.status === 'success') {
            try {
                const report = await db.collection('pollutant_reports').doc(userId).collection('reports').add({
                    timestamp: new Date(),
                    regionGeoJson: JSON.stringify(ensureGeoJsonFormat(regionGeoJson)),
                    settings: {
                        bufferMeters: bufferMeters || 5000,
                        recentDays: recentDays || 6,
                    },
                    ...pollutant_analysis_result
                });
                reportref = report.id

                console.log(`Report saved to Firestore for region: ${regionId}`);

            } catch (dbError) {
                console.error("Firebase Save Error:", dbError);

            }
        }

        // --- AI Intelligence Pipeline & Cross-Module Correlation ---
        let intelligence_report = null;
        let composite_findings = [];

        if (pollutant_analysis_result.status === 'success') {
            try {
                const promises = [];
                if (pollutant === 'O3') {
                    promises.push(runHeatCheck(sanitizedGeoJson, regionId, credentialsPath, 40, bufferMeters || 1000, 15).then(res => ({ module: 'surface_heat', data: res })));
                }
                const settled = await Promise.allSettled(promises);
                
                const secondaryResults = settled
                  .filter(r => r.status === 'fulfilled' && r.value.data)
                  .map(r => r.value);

                intelligence_report = await runGeoIntelligence({
                    module_type: "pollutants",
                    region_id: regionId,
                    summary_stats: {
                        alert_triggered: pollutant_analysis_result.alert_triggered,
                        average_value: pollutant_analysis_result.average_value,
                        pollutant_code: pollutant_analysis_result.pollutant_code,
                        air_quality_status: pollutant_analysis_result.air_quality_status,
                        dates: pollutant_analysis_result.dates,
                    },
                    image_url: pollutant_analysis_result.heatmap_url,
                    historical_reports: secondaryResults,
                });

                if (secondaryResults.length > 0) {
                    composite_findings = await runCrossModuleCorrelation({
                        current_module: "pollutants",
                        current_data: {
                            alert_triggered: pollutant_analysis_result.alert_triggered,
                            average_value: pollutant_analysis_result.average_value,
                            pollutant_code: pollutant_analysis_result.pollutant_code
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
                await db.collection('pollutant_reports').doc(userId).collection('reports').doc(reportref).update({
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
                ...pollutant_analysis_result,
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