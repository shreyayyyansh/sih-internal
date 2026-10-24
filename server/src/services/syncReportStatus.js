import Question from '../models/urbanconnect/questionModel.js';

export async function syncReportStatus(reportId, status) {
  try {
    if (!reportId) return;
    await Question.findOneAndUpdate({ reportId }, { reportStatus: status });
    console.log(`[CivicSyndication] Synced report ${reportId} status to ${status}`);
  } catch (err) {
    console.error(`[CivicSyndication] Failed to sync status for ${reportId}:`, err.message);
  }
}
