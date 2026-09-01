import React, { useEffect, useState } from "react";
import { Megaphone, Building2, ChevronDown, Clock } from "lucide-react";
import { api } from "../../lib/api.js";

// ─── Department Color Tags ──────────────────────────────────────────────
const DEPT_COLORS = {
  Revenue: "bg-amber-100 text-amber-700",
  Civic: "bg-blue-100 text-blue-700",
  "Emergency Services": "bg-red-100 text-red-700",
  Police: "bg-purple-100 text-purple-700",
};

function getTimeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("");

  useEffect(() => {
    fetchAnnouncements();
  }, [selectedCity]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params = selectedCity ? `?city=${selectedCity}&limit=20` : "?limit=20";
      const res = await api.get(`/api/announcements${params}`);
      setAnnouncements(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Header & City Filter ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-black text-white tracking-tight">
            Official Announcements
          </h2>
        </div>

        <div className="relative">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="appearance-none bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 pr-7 text-xs font-bold text-gray-300 cursor-pointer hover:bg-white/15 transition-colors"
          >
            <option value="">All Cities</option>
            <option value="Prayagraj">Prayagraj</option>
          </select>
          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ─── Loading State ─── */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-white/20 border-t-purple-400 rounded-full animate-spin" />
        </div>
      )}

      {/* ─── Empty State ─── */}
      {!loading && announcements.length === 0 && (
        <div className="text-center py-8">
          <Megaphone className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No official announcements at this time.</p>
        </div>
      )}

      {/* ─── Announcements Feed ─── */}
      {!loading && announcements.length > 0 && (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          {announcements.map((ann) => (
            <div
              key={ann._id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors"
            >
              {/* Authority Badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-300">
                      {ann.authorityName}
                    </span>
                    <span className="text-[10px] text-gray-500 ml-1.5">• {ann.city}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    DEPT_COLORS[ann.department] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ann.department}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-sm font-bold text-white mb-1">{ann.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{ann.body}</p>

              {/* Timestamp */}
              <div className="flex items-center gap-1 mt-2.5 text-[10px] text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{getTimeAgo(ann.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
