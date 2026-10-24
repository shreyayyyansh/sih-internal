import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { 
  ArrowLeft, 
  History, 
  Trees, 
  Flame, 
  Waves, 
  CloudRain, 
  Factory, 
  ThermometerSun,
  LayoutDashboard,
  ExternalLink,
  Calendar,
  MapPin,
  Clock,
  Loader2
} from "lucide-react";
import { api } from "../../../lib/api.js";

const MODULE_CONFIG = {
  deforestation: { icon: Trees, color: "text-emerald-600", bg: "bg-emerald-100", label: "Deforestation", route: "/deforestation/result" },
  fire: { icon: Flame, color: "text-orange-600", bg: "bg-orange-100", label: "Fire Alert", route: "/fire/result" },
  coastal: { icon: Waves, color: "text-cyan-600", bg: "bg-cyan-100", label: "Coastal Erosion", route: "/coastal-erosion/result" },
  flood: { icon: CloudRain, color: "text-blue-600", bg: "bg-blue-100", label: "Flood Watch", route: "/flood/result" },
  pollutants: { icon: Factory, color: "text-slate-600", bg: "bg-slate-100", label: "Air Pollutants", route: "/pollutants/result" },
  surface_heat: { icon: ThermometerSun, color: "text-red-600", bg: "bg-red-100", label: "Surface Heat", route: "/surface-heat/result" }
};

export default function GeoScopeHistory() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const { getAccessTokenSilently } = useAuth0();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = await getAccessTokenSilently({
                    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                });
                const response = await api.get('/api/gee/history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.success) {
                    setReports(response.data.reports);
                }
            } catch (err) {
                console.error("Failed to fetch GEE history:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [getAccessTokenSilently]);

    const handleViewReport = (report) => {
        const config = MODULE_CONFIG[report.module];
        if (!config) return;
        
        // Pass the result object wrapped in the same structure result pages expect
        navigate(config.route, { state: { data: { result: report } } });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 overflow-x-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 md:gap-4">
                    <button 
                        onClick={() => navigate('/administration/geoscope')} 
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
                        title="Back to Environmental Hub"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900" />
                    </button>
                    <div>
                        <h1 className="text-lg md:text-2xl font-black text-slate-900 flex items-center gap-2">
                            <History className="text-emerald-600 w-5 h-5 md:w-6 md:h-6" /> 
                            <span className="hidden sm:inline">Report History</span>
                            <span className="sm:hidden">History</span>
                        </h1>
                        <p className="text-[10px] md:text-xs text-slate-500 font-bold tracking-widest uppercase">GeoScope Archives</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 bg-emerald-50 px-3 md:px-5 py-2 rounded-full border border-emerald-100 shadow-sm">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs md:text-sm font-black text-emerald-800">{reports.length} <span className="hidden md:inline">Reports</span></span>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-6 text-slate-400">
                        <div className="relative">
                            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse rounded-full" />
                            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin relative z-10" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-slate-800 text-lg">Accessing Geospatial Archives</p>
                            <p className="text-sm font-medium mt-1">Connecting to UrbanFlow Data Layer...</p>
                        </div>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="text-center py-20 md:py-32 bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-100/50">
                         <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <History className="w-10 h-10 md:w-12 md:h-12 text-slate-200" />
                         </div>
                         <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">No Reports Found</h2>
                         <p className="text-slate-500 max-w-sm mx-auto mt-3 text-sm md:text-base leading-relaxed font-medium">
                             Your environmental scan history is currently empty. Start analyzing regions in the Hub to generate reports.
                         </p>
                         <button 
                            onClick={() => navigate('/administration/geoscope')}
                            className="mt-10 px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 active:scale-95 flex items-center gap-2 mx-auto"
                         >
                             Launch Environmental Hub
                         </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {reports.map((report) => {
                            const config = MODULE_CONFIG[report.module] || { icon: History, color: "text-slate-600", bg: "bg-slate-100", label: "Analysis" };
                            const Icon = config.icon;
                            let dateStr = "N/A";
                            if (report.timestamp) {
                                const d = new Date(report.timestamp);
                                dateStr = d.toLocaleDateString("en-US", {
                                    month: "short", day: "numeric", year: "numeric"
                                }) + " at " + d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
                            }

                            return (
                                <div 
                                    key={report.id}
                                    className="group bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-8 hover:shadow-2xl hover:shadow-emerald-100/50 hover:border-emerald-200 transition-all duration-500 relative overflow-hidden flex flex-col h-full"
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center ${config.color} shrink-0 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                            <Icon className="w-7 h-7" />
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Module</span>
                                            <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${config.bg} ${config.color} border-current/10`}>
                                                {config.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-emerald-700 transition-colors">
                                            {report.module === 'fire' ? 'Active Fire Scan' : 
                                             report.module === 'deforestation' ? 'Vegetation Analysis' :
                                             report.module === 'pollutants' ? 'Air Quality Brief' :
                                             report.module === 'flood' ? 'Inundation Report' :
                                             report.module === 'coastal' ? 'Shoreline Study' : 'Surface Heat Scan'}
                                        </h3>
                                        
                                        <div className="mt-6 space-y-3">
                                            <div className="flex items-start gap-3 text-slate-500">
                                                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span className="text-xs font-bold text-slate-600 line-clamp-1">Region: {report.region_id || "Global View"}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-500">
                                                <Calendar className="w-4 h-4 shrink-0" />
                                                <span className="text-xs font-bold text-slate-600">
                                                    {dateStr}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scan Status</span>
                                            <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> 
                                                Live Archive
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => handleViewReport(report)}
                                            className="flex-1 max-w-[140px] py-3 bg-slate-900 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-slate-200 active:scale-95 group/btn"
                                        >
                                            Report <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                        </button>
                                    </div>

                                    {/* Abstract Background Elements */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 -z-10" />
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-50 rounded-full -ml-12 -mb-12 group-hover:bg-emerald-100/50 transition-colors -z-10" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
