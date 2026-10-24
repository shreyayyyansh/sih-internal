import cron from "node-cron";
import { updateDeforestationReports } from "../controllers/gee/deforestationReportUpdater.js";
import { updateFireReports } from "../controllers/gee/fireReportUpdater.js";
import { updateCoastalReports } from "../controllers/gee/coastalReportUpdater.js";
import { updateFloodReports } from "../controllers/gee/floodReportUpdater.js";
import { updateSurfaceHeatReports } from "../controllers/gee/surfaceheatReportUpdater.js";
import { updateAirQualityReports } from "../controllers/gee/pollutantReportUpdater.js";
import { fetchAndAnalyzeCityPulse } from "../controllers/urbanconnect/cityPulse.controller.js";
import { initAutoDispatchCron } from "../cron/autoDispatchCron.js";

const startCronJobs = async () => {
  console.log("🚀 Initializing Cron Jobs..."); 
  initAutoDispatchCron(); 
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ Cron Job Triggered: Updating GEE Reports...");
    await updateDeforestationReports(null, null); 
    await updateFireReports(null, null);
    await updateCoastalReports(null, null);
    await updateFloodReports(null,null); 
    await updateSurfaceHeatReports(null, null); 
    await updateAirQualityReports(null, null);
    console.log("✅ GEE Report Updates Completed.");
  });

  cron.schedule("0 2 * * *", async () => {
    console.log("⏰ Cron Job Triggered: Fetching Social Media City Pulse...");
    await fetchAndAnalyzeCityPulse();
    console.log("✅ City Pulse Analysis Completed.");
  });
};

export default startCronJobs;