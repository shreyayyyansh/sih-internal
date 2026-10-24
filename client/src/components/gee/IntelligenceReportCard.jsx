import { AlertTriangle, Brain, CheckCircle, Lightbulb, Shield, TrendingUp } from 'lucide-react';

const severityConfig = {
  LOW:      { color: 'emerald', icon: CheckCircle, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', iconColor: 'text-emerald-600' },
  MODERATE: { color: 'amber',   icon: TrendingUp,  bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   iconColor: 'text-amber-600'   },
  HIGH:     { color: 'orange',  icon: AlertTriangle,bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  iconColor: 'text-orange-600'  },
  CRITICAL: { color: 'red',     icon: AlertTriangle,bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     iconColor: 'text-red-600'     },
  UNKNOWN:  { color: 'slate',   icon: Brain,        bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700',   iconColor: 'text-slate-600'   },
};

export default function IntelligenceReportCard({ report }) {
  if (!report) return null;

  const severity = report.severity?.toUpperCase() || 'UNKNOWN';
  const config = severityConfig[severity] || severityConfig.UNKNOWN;
  const Icon = config.icon;

  return (
    <div className={`rounded-2xl bg-white border border-slate-200 shadow-sm p-5 md:p-6 space-y-4 mt-6`}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-2 bg-indigo-50 rounded-xl">
            <Brain className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
            <h3 className="font-black text-slate-900 text-base md:text-lg tracking-tight">AI Intelligence Report</h3>
            <p className="text-xs font-semibold text-slate-400">Advanced AI Spatial Analysis</p>
        </div>
        <span className={`ml-auto text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${config.bg} ${config.text} ${config.border} border shadow-sm`}>
          {severity} SEVERITY
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Pattern */}
          {report.pattern_detected && (
            <div className="flex items-start gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <TrendingUp className="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Pattern Detected</p>
                <p className="text-slate-700 text-sm leading-relaxed">{report.pattern_detected}</p>
              </div>
            </div>
          )}

          {/* Probable Cause */}
          {report.probable_cause && (
            <div className="flex items-start gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <Shield className="w-5 h-5 mt-0.5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Probable Cause</p>
                <p className="text-slate-700 text-sm leading-relaxed">{report.probable_cause}</p>
              </div>
            </div>
          )}
      </div>

      {/* Recommended Action */}
      {report.recommended_action && (
        <div className="flex items-start gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mt-2">
          <Lightbulb className="w-5 h-5 mt-0.5 text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-emerald-600/70 font-bold mb-1">Recommended Action</p>
            <p className="text-slate-800 text-sm leading-relaxed font-medium">{report.recommended_action}</p>
          </div>
        </div>
      )}

      {/* Confidence */}
      {report.confidence != null && (
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">AI Confidence</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
              style={{ width: `${Math.round(report.confidence * 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-600 font-black font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
             {Math.round(report.confidence * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
