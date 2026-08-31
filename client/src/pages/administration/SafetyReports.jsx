import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { ShieldAlert, ArrowLeft, Bot, MessageSquare, Clock } from 'lucide-react';
// Using firestore client directly here if needed, or via an API.
// To perfectly align with existing CityAdmin pattern, we will fetch directly from Firestore if available, otherwise wire an API.

// We will simulate real-time listening via the API if Firestore isn't fully configured on the web client, 
// but since this is admin, a direct REST fetch is also fine. Let's use `api.get` similar to complains.

export default function SafetyReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
     fetchReports();
  }, []);

  const fetchReports = async () => {
     try {
        const res = await api.get('/api/reports/safety-reports');
        if (res.data.success) {
           setReports(res.data.data);
        }
     } catch (err) {
        console.error("Failed to load reports", err);
     } finally {
        setLoading(false);
     }
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
       {/* Header */}
       <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50">
               <ArrowLeft className="w-5 h-5" />
             </button>
             <div>
                <h1 className="text-3xl font-black flex items-center gap-3">
                  <ShieldAlert className="w-8 h-8 text-rose-600" />
                  AI Safety Operations
                </h1>
                <p className="text-slate-500 font-medium mt-1">Review AI-audited chat reports and platform policy violations.</p>
             </div>
          </div>
       </div>

       {/* Content Grid */}
       <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* List Column */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <Clock className="w-5 h-5 text-slate-400" />
               Recent Reports
            </h2>
            
            {loading ? (
               <div className="animate-pulse flex flex-col gap-4">
                  {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
               </div>
            ) : reports.length === 0 ? (
               <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
                 No safety reports pending.
               </div>
            ) : (
               reports.map(report => (
                 <button 
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedReport?.id === report.id ? 'bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                 >
                    <div className="flex justify-between items-start mb-3">
                       <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${getSeverityColor(report.severity)}`}>
                         {report.severity || "PENDING"}
                       </span>
                       <span className="text-xs font-semibold text-slate-400">
                         {new Date(report.createdAt?._seconds * 1000 || Date.now()).toLocaleDateString()}
                       </span>
                    </div>
                    <p className="font-semibold text-sm line-clamp-2 text-slate-700 mb-2">
                      "{report.description}"
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-100/50 w-fit px-2 py-1 rounded-md">
                      <Bot className="w-3.5 h-3.5" />
                      AI Analyzed
                    </div>
                 </button>
               ))
            )}
          </div>

          {/* Details Column */}
          <div className="lg:col-span-2">
             {selectedReport ? (
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[700px]">
                   
                   {/* Report Header */}
                   <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                      <div>
                         <h3 className="text-xl font-bold mb-2">Reported Issue</h3>
                         <p className="text-slate-600 bg-white p-4 border border-slate-200 rounded-xl italic">
                           "{selectedReport.description}"
                         </p>
                      </div>
                      <div className="text-right">
                         <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Job ID</span>
                         <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-600">{selectedReport.jobId}</span>
                      </div>
                   </div>

                   {/* AI Analysis Block */}
                   {selectedReport.aiAnalysis && (
                      <div className="mx-6 mt-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl shadow-inner">
                         <div className="flex items-center gap-2 mb-3">
                            <Bot className="w-5 h-5 text-indigo-600" />
                            <h4 className="font-bold text-indigo-900">AI Safety Verdict</h4>
                         </div>
                         <p className="text-indigo-800 text-sm leading-relaxed">
                            {selectedReport.aiAnalysis}
                         </p>
                      </div>
                   )}

                   {/* Chat History */}
                   <div className="flex-1 p-6 overflow-y-auto">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                         <MessageSquare className="w-4 h-4 text-slate-400" />
                         Chat History Evidence
                      </h4>
                      <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                         {selectedReport.messages?.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.userId === selectedReport.reportedUserId ? 'items-end' : 'items-start'}`}>
                               <span className="text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">{msg.userName}</span>
                               <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${msg.userId === selectedReport.reportedUserId ? 'bg-red-50 border border-red-100 text-red-900 rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                                  {msg.text}
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                </div>
             ) : (
                <div className="h-full bg-white border border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 flex-col gap-4">
                  <ShieldAlert className="w-16 h-16 text-slate-200" />
                  <p className="font-medium">Select a report from the left to view the AI audit.</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );
}
