import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { runCoastalCheck } from "../../gee/earth/coastal_erosion/landsat_coastal.js";
import { runFloodCheck } from "../../gee/earth/flood/sentinel1_flood.js";
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

export async function generateCoastalReport(req, res) {
    try {
        // CHANGE 1: Extract years from the request body
        const {
            regionGeoJson,
            regionId,
            historicYear, // Optional (will default in helper if undefined)
            currentYear   // Optional
        } = req.body;

        if (!regionGeoJson || !regionId) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: regionGeoJson or regionId"
            });
        }
        const sanitizedGeoJson = ensureGeoJsonFormat(regionGeoJson);

        let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        // Clean credentials path
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

        let coastal_analysis_result = null;
        let reportref = null;
        try {
            coastal_analysis_result = await runCoastalCheck(
                sanitizedGeoJson,
                regionId,
                credentialsPath,
                historicYear,
                currentYear
            );

            if (!coastal_analysis_result) {
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

        if (coastal_analysis_result.status === 'success') {
            try {

                const report = await db.collection('coastal_reports')
                    .doc(userId).collection('reports')
                    .add({
                        regionGeoJson: JSON.stringify(sanitizedGeoJson),
                        historicYear: historicYear || 2000,
                        currentYear: currentYear || 2024,
                        timestamp: new Date(),
                        ...coastal_analysis_result
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

        if (coastal_analysis_result.status === 'success') {
            try {
                const [floodSettled] = await Promise.allSettled([
                  runFloodCheck(sanitizedGeoJson, regionId, credentialsPath, 5, 10, 1000)
                ]);

                const secondaryResults = [
                  floodSettled.status === 'fulfilled' ? { module: 'flood', data: floodSettled.value } : null,
                ].filter(Boolean);

                intelligence_report = await runGeoIntelligence({
                    module_type: "coastal",
                    region_id: regionId,
                    summary_stats: {
                        erosion_detected: coastal_analysis_result.erosion_detected,
                        net_land_change_hectares: coastal_analysis_result.net_land_change_hectares,
                        comparison_years: coastal_analysis_result.comparison_years,
                    },
                    image_url: coastal_analysis_result.visualization_url,
                    historical_reports: secondaryResults,
                });

                if (secondaryResults.length > 0) {
                    composite_findings = await runCrossModuleCorrelation({
                        current_module: "coastal",
                        current_data: {
                            erosion_detected: coastal_analysis_result.erosion_detected,
                            net_land_change_hectares: coastal_analysis_result.net_land_change_hectares,
                        },
                        history: secondaryResults
                    });
                }
            } catch (aiErr) {
                console.warn("⚠️ AI pipeline or correlation failed (non-blocking):", aiErr.message);
            }
        }

        return res.json({
            success: true,
            result: {
                regionGeoJson: sanitizedGeoJson,
                ...coastal_analysis_result,
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