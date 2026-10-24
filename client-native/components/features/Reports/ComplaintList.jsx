// client-native/components/features/reports/ComplaintList.jsx
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Droplets, Trash2, Zap, Building2, HelpCircle } from "lucide-react-native";

import { api } from "../../../lib/api";
// Note: Depending on your native auth setup, adjust this import. 
// If using react-native-auth0, the hook name is the same.
import { useAuth0 } from "react-native-auth0";

export default function ComplaintList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const { getCredentials } = useAuth0(); // Adjust based on your Native Auth0 setup
  const router = useRouter();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // Retrieve native Auth0 token
        const credentials = await getCredentials();
        const token = credentials?.accessToken;

        const res = await api.post('/api/reports/fetch3Reports', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log("response for reports", res.data);
        setReports(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const formatTimeAgo = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput._seconds ? dateInput._seconds * 1000 : dateInput);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // [NATIVE FIX]: In React Native, text colors must go on <Text> and backgrounds on <View>.
  // We split the classes into an object.
  const getStatusStyles = (status) => {
    const normalized = status?.toUpperCase();
    if (normalized === "RESOLVED") return { view: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" };
    if (normalized === "IN_PROGRESS" || normalized === "ASSIGNED") return { view: "bg-indigo-500/10 border-indigo-500/20", text: "text-indigo-400" };
    if (normalized === "VERIFIED") return { view: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" };
    return { view: "bg-zinc-500/10 border-zinc-500/20", text: "text-zinc-400" };
  };

  const getSeverityStyles = (severity) => {
    const s = severity?.toUpperCase();
    if (s === 'CRITICAL' || s === 'HIGH') return { view: 'bg-red-500/10 border-red-500/20', text: 'text-red-400' };
    if (s === 'MEDIUM') return { view: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400' };
    return { view: 'bg-slate-800 border-white/5', text: 'text-slate-400' };
  };

  const getCategoryIcon = (category) => {
    const size = 20;
    switch (category?.toUpperCase()) {
      case "WATER": return <Droplets size={size} color="white" />;
      case "WASTE": return <Trash2 size={size} color="white" />;
      case "ELECTRICITY": return <Zap size={size} color="white" />;
      case "INFRASTRUCTURE": return <Building2 size={size} color="white" />;
      default: return <HelpCircle size={size} color="white" />;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', padding: 32 }}>
        <ActivityIndicator size="small" color="#818cf8" />
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {reports.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12 }}>
          <Text style={{ fontSize: 12, color: '#71717a' }}>No reports found.</Text>
        </View>
      ) : (
        reports.map((report) => {
          const statusStyles = getStatusStyles(report.status);
          const severityStyles = getSeverityStyles(report.severity);

          return (
            <TouchableOpacity
              key={report.id}
              onPress={() => router.push(`/track/${report.id}`)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: '#18181b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8, gap: 12 }}>
                {/* Icon Container */}
                <View className={`w-10 h-10 rounded-lg items-center justify-center border ${severityStyles.view}`}>
                  {getCategoryIcon(report.assigned_category)}
                </View>

                {/* Text Content */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text
                      className="text-sm font-bold text-zinc-200 capitalize flex-1"
                      numberOfLines={1}
                    >
                      {report.title || (report.assigned_category ? `${report.assigned_category.toLowerCase()} Issue` : "Report Issue")}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text
                      className="text-[11px] text-zinc-500 font-medium flex-1"
                      numberOfLines={1}
                    >
                      {report.address || "Location unavailable"}
                    </Text>
                    {report.createdAt && (
                      <Text className="text-[10px] text-zinc-600 ml-2">
                        • {formatTimeAgo(report.createdAt)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Status Badge */}
              <View className={`px-2.5 py-1 rounded-md border ${statusStyles.view}`}>
                <Text className={`text-[10px] font-bold uppercase tracking-wider ${statusStyles.text}`}>
                  {report.status === 'success' ? 'RECEIVED' : report.status || 'OPEN'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {reports.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/reports/me')}
          style={{ width: '100%', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', marginTop: 4, alignItems: 'center' }}
        >
          <Text className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
            View Full History
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}