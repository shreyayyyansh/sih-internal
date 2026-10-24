import { db } from "../../firebaseadmin/firebaseadmin.js";

/**
 * Aggregates GEE reports from all 6 environmental modules for a specific user.
 */
export async function getGeoScopeHistory(req, res) {
    try {
        const userId = req.auth.payload.sub;
        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        const collections = [
            { id: 'deforestation', name: 'deforestation_reports' },
            { id: 'fire', name: 'fire_reports' },
            { id: 'coastal', name: 'coastal_reports' },
            { id: 'flood', name: 'flood_reports' },
            { id: 'pollutants', name: 'pollution_reports' },
            { id: 'surface_heat', name: 'surfaceHeat_reports' }
        ];

        let allReports = [];

        for (const col of collections) {
            try {
                const snapshot = await db.collection(col.name).doc(userId).collection('reports')
                    .orderBy('timestamp', 'desc')
                    .limit(15) // Limit per module to avoid payload bloat
                    .get();

                snapshot.forEach(doc => {
                    const data = doc.data();
                    let jsTimestamp = null;
                    
                    if (data.timestamp) {
                        if (data.timestamp.toDate) jsTimestamp = data.timestamp.toDate();
                        else if (data.timestamp._seconds) jsTimestamp = new Date(data.timestamp._seconds * 1000);
                        else jsTimestamp = new Date(data.timestamp);
                    }

                    allReports.push({
                        id: doc.id,
                        module: col.id,
                        ...data,
                        timestamp: jsTimestamp
                    });
                });
            } catch (err) {
                // Silently skip if a collection doesn't exist for a user yet
                console.warn(`[History] Non-critical: No reports found in ${col.name} for user.`);
            }
        }

        // Sort globally by timestamp descending
        allReports.sort((a, b) => {
            const dateA = a.timestamp || 0;
            const dateB = b.timestamp || 0;
            return dateB - dateA;
        });

        return res.json({
            success: true,
            reports: allReports
        });

    } catch (error) {
        console.error("GeoScope History Controller Error:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Failed to fetch environmental history",
            details: error.message 
        });
    }
}
