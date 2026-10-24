import { Link } from 'lucide-react';

export default function CompositeFindingsBanner({ findings }) {
  if (!findings || findings.length === 0) return null;

  const severityColors = {
    LOW:      { bg: 'bg-emerald-50',  border: 'border-emerald-200',  text: 'text-emerald-700',  iconText: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    MODERATE: { bg: 'bg-amber-50',    border: 'border-amber-200',    text: 'text-amber-700',    iconText: 'text-amber-600',   iconBg: 'bg-amber-100' },
    HIGH:     { bg: 'bg-orange-50',   border: 'border-orange-200',   text: 'text-orange-700',   iconText: 'text-orange-600',  iconBg: 'bg-orange-100' },
    CRITICAL: { bg: 'bg-red-50',      border: 'border-red-200',      text: 'text-red-700',      iconText: 'text-red-600',     iconBg: 'bg-red-100' },
  };

  return (
    <div className="mt-6 space-y-4">
      {findings.map((finding, idx) => {
        const risk = finding.risk_level?.toUpperCase() || 'MODERATE';
        const colors = severityColors[risk] || severityColors.MODERATE;
        
        return (
          <div key={idx} className={`rounded-xl border ${colors.bg} ${colors.border} p-5 flex gap-4 md:items-center flex-col md:flex-row shadow-sm`}>
            {/* Icon & Types */}
            <div className="flex items-center gap-3 md:w-1/3 flex-shrink-0">
              <div className={`p-2.5 rounded-xl ${colors.iconBg} ${colors.iconText} shadow-sm border border-white/50`}>
                <Link className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div className="flex flex-col">
                <span className={`text-[10px] font-black uppercase tracking-widest ${colors.text} opacity-80 mb-0.5`}>
                  Cross-Reference • {finding.related_module}
                </span>
                <span className={`text-sm md:text-base font-black text-slate-900 tracking-tight`}>
                  {finding.correlation_type}
                </span>
              </div>
            </div>

            {/* Description & Badge */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-1 md:pl-5 md:border-l md:border-slate-200/60">
              <p className={`text-xs md:text-sm text-slate-700 leading-relaxed font-medium md:pr-4`}>
                {finding.description}
              </p>
              <span className={`self-start md:self-auto flex-shrink-0 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md ${colors.bg} ${colors.text} border ${colors.border} shadow-sm bg-white/70 backdrop-blur-sm`}>
                {risk} RISK
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
