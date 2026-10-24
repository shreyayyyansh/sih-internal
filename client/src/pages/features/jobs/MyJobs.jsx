import { useState } from "react";
import { api } from "../../../lib/api";
import { useAuth0 } from "@auth0/auth0-react";
import { Loader2, Star, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

export default function MyJobs({ jobs, onSelect, onUpdate }) {
  const { getAccessTokenSilently } = useAuth0();
  const [loadingId, setLoadingId] = useState(null);

  const [expandedJobId, setExpandedJobId] = useState(null);
  const [interestedWorkers, setInterestedWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  const closeJob = async (e, jobId) => {
    e.stopPropagation();
    setLoadingId(jobId);

    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });

      await api.patch(
        `/api/jobs/${jobId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (onUpdate) onUpdate();
      alert("Deal closed successfully.");

    } catch (error) {
      console.error("Failed to close job", error);
      alert("Failed to close job.");
    } finally {
      setLoadingId(null);
    }
  };

  const toggleWorkersList = async (e, job) => {
    e.stopPropagation();
    if (expandedJobId === job.id) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(job.id);
    setLoadingWorkers(true);
    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });
      const res = await api.get('/api/user/workers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInterestedWorkers(res.data.workers || []);
    } catch (error) {
      console.error("Error loading workers:", error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  if (!jobs.length) {
    return <div className="text-zinc-500 text-sm text-center py-4">No jobs posted yet.</div>;
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="bg-black/30 backdrop-blur-md border border-white/10 p-4 rounded-xl flex flex-col gap-3 hover:bg-white/5 transition-colors cursor-pointer"
          onClick={() => onSelect(job)}
        >
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-white flex-1 mr-2">{job.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${job.status === "OPEN"
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30"
              }`}>
              {job.status}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm text-zinc-400">
            <span>₹{job.amount}</span>
            <span>{job.time}</span>
          </div>

          {job.status === "OPEN" && (
            <div className="flex gap-2 mt-1">
              <button
                onClick={(e) => toggleWorkersList(e, job)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-all"
              >
                {expandedJobId === job.id ? "Hide Workers" : "Find Workers"}
                {expandedJobId === job.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={(e) => closeJob(e, job.id)}
                disabled={loadingId === job.id}
                className="flex-1 flex items-center justify-center py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {loadingId === job.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Close Deal"
                )}
              </button>
            </div>
          )}

          {/* Expanded Workers List */}
          {expandedJobId === job.id && (
            <div className="mt-2 border-t border-white/10 pt-4">
              <p className="text-white font-bold text-sm mb-3">Interested Workers</p>
              {loadingWorkers ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                </div>
              ) : interestedWorkers.length === 0 ? (
                <p className="text-zinc-400 text-xs text-center py-3">No workers found.</p>
              ) : (
                <div className="space-y-2">
                  {interestedWorkers.map((w) => (
                    <div key={w.id} className="flex items-center bg-black/30 p-3 rounded-xl border border-white/5 gap-3">
                      {w.picture ? (
                        <img src={w.picture} alt={w.name} className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-zinc-500 text-sm font-bold">
                          {(w.name || "?")[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">{w.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-zinc-300 text-xs font-bold">{w.rating || 3}</span>
                          </span>
                          <span className="text-zinc-600 text-xs">•</span>
                          <span className="text-zinc-400 text-xs">{w.completedJobs || 0} jobs</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(job, w); }}
                        className="w-10 h-10 rounded-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 flex items-center justify-center transition-all"
                      >
                        <MessageSquare className="h-4 w-4 text-blue-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}