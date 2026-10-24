import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  View, Text, ActivityIndicator, TouchableOpacity, Image,
  StyleSheet, ScrollView, Alert, TextInput, Modal, Platform,
  Dimensions,
} from "react-native";
import { api } from "../../../lib/api";
import {
  ShieldCheck, AlertTriangle, ArrowLeft, Clock, MapPin,
  CheckCircle, XCircle, Eye, ChevronRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_W } = Dimensions.get("window");

const STEPS = [
  { status: "OPEN",             label: "Report Submitted",      description: "Report received and pending review.",        color: "#64748b" },
  { status: "VERIFIED",         label: "Verified",              description: "Issue verified by authority or AI.",          color: "#f59e0b" },
  { status: "ASSIGNED",         label: "Team Assigned",         description: "Cleanup crew has been dispatched.",           color: "#3b82f6" },
  { status: "USERVERIFICATION", label: "Pending Verification",  description: "Staff uploaded proof. Please verify.",        color: "#a855f7" },
  { status: "RESOLVED",         label: "Resolved",              description: "The issue has been successfully cleared.",    color: "#10b981" },
];

const STATUS_INDEX = {
  OPEN: 0,
  VERIFIED: 1,
  ASSIGNED: 2,
  IN_PROGRESS: 2,
  USERVERIFICATION: 3,
  RESOLVED: 4,
  COMPLETED: 4,
};

export default function TrackReport() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // For rejection reason modal (Alert.prompt is iOS-only)
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // ── Fetch report ──────────────────────────────────────────
  const fetchReport = async () => {
    try {
      if (!id) throw new Error("Report ID is missing.");
      setLoading(true);
      const res = await api.get(`/api/track/${id}`);
      setReport(res.data.report || res.data);
    } catch (err) {
      console.error("Error fetching report:", err);
      setError("Could not load report details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [id]);

  // ── Actions ───────────────────────────────────────────────
  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      await api.post("/api/track/confirm", {
        taskId: report.assignedTaskId,
        reportId: report.id,
      });
      Alert.alert("Success", "Thank you! The issue has been marked as resolved.");
      fetchReport();
    } catch (err) {
      console.error("Confirm failed:", err);
      Alert.alert("Error", "Failed to confirm. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason) => {
    try {
      setActionLoading(true);
      await api.post("/api/track/reject", {
        taskId: report.assignedTaskId,
        reportId: report.id,
        reason: reason || "Citizen was not satisfied with the resolution.",
      });
      Alert.alert("Sent Back", "The task has been sent back to staff for rework.");
      fetchReport();
    } catch (err) {
      console.error("Reject failed:", err);
      Alert.alert("Error", "Failed to reject. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const promptReject = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Reject Resolution",
        "Please provide a reason:",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Submit", onPress: (text) => text && handleReject(text) },
        ],
        "plain-text"
      );
    } else {
      // Android: use a modal with TextInput
      setRejectReason("");
      setRejectModalVisible(true);
    }
  };

  // ── Loading / Error states ────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={s.loadingText}>Loading report…</Text>
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={s.center}>
        <AlertTriangle size={40} color="#ef4444" />
        <Text style={s.errorText}>{error || "Report not found."}</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.linkBtn}>
          <Text style={s.linkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = STATUS_INDEX[report.status] ?? 0;

  // ── Main UI ───────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <LinearGradient
        colors={["#0f172a", "#020617"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Report Status</Text>
          <Text style={s.headerSub}>ID: {report.id?.slice(0, 8)}…</Text>
        </View>
        <View style={[s.badge, { borderColor: STEPS[currentStep]?.color + "55", backgroundColor: STEPS[currentStep]?.color + "18" }]}>
          <Text style={[s.badgeText, { color: STEPS[currentStep]?.color }]}>{report.status}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Report Title + Image */}
        <View style={s.card}>
          {report.imageUrl ? (
            <Image source={{ uri: report.imageUrl }} style={s.heroImage} resizeMode="cover" />
          ) : (
            <View style={[s.heroImage, { justifyContent: "center", alignItems: "center" }]}>
              <Text style={{ color: "#475569" }}>No Image</Text>
            </View>
          )}
          <View style={{ padding: 16 }}>
            {report.severity && (
              <View style={[s.severityBadge, report.severity === "CRITICAL" ? s.severityCritical : s.severityDefault]}>
                <AlertTriangle size={10} color={report.severity === "CRITICAL" ? "#f87171" : "#fb923c"} />
                <Text style={{ color: report.severity === "CRITICAL" ? "#f87171" : "#fb923c", fontSize: 10, fontWeight: "800", marginLeft: 4 }}>
                  {report.severity}
                </Text>
              </View>
            )}
            <Text style={s.reportTitle}>{report.title}</Text>
            {report.address && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                <MapPin size={12} color="#64748b" />
                <Text style={s.address} numberOfLines={2}>{report.address}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── USERVERIFICATION SECTION ─────────────────────── */}
        {report.status === "USERVERIFICATION" && report.proofImageUrl && (
          <View style={s.verificationCard}>
            <LinearGradient
              colors={["rgba(168,85,247,0.08)", "rgba(168,85,247,0.02)", "transparent"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            {/* Title */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <ShieldCheck size={22} color="#a855f7" />
              <Text style={s.verifyTitle}>Verification Required</Text>
            </View>
            <Text style={s.verifyDesc}>
              The assigned staff has marked this issue as resolved. Review the proof below and confirm or reject.
            </Text>

            {/* Before / After images */}
            <View style={s.imageRow}>
              {/* Before */}
              <View style={s.imageCol}>
                <Text style={s.imageLabel}>ORIGINAL ISSUE</Text>
                <View style={[s.imageFrame, { borderColor: "#334155" }]}>
                  <Image source={{ uri: report.imageUrl }} style={s.compareImage} resizeMode="cover" />
                </View>
              </View>

              {/* After */}
              <View style={s.imageCol}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <CheckCircle size={10} color="#a855f7" />
                  <Text style={[s.imageLabel, { color: "#a855f7", marginBottom: 0, marginLeft: 4 }]}>RESOLUTION PROOF</Text>
                </View>
                <View style={[s.imageFrame, { borderColor: "#a855f766", borderWidth: 2 }]}>
                  <Image source={{ uri: report.proofImageUrl }} style={s.compareImage} resizeMode="cover" />
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.confirmBtn, actionLoading && { opacity: 0.5 }]}
                onPress={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <CheckCircle size={16} color="#fff" />
                )}
                <Text style={s.confirmText}>Yes, Resolved</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.rejectBtn, actionLoading && { opacity: 0.5 }]}
                onPress={promptReject}
                disabled={actionLoading}
              >
                <XCircle size={16} color="#f87171" />
                <Text style={s.rejectText}>No, Still There</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── TIMELINE ─────────────────────────────────────── */}
        <View style={s.card}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <Clock size={16} color="#3b82f6" />
              <Text style={s.sectionTitle}>Timeline</Text>
            </View>

            {STEPS.map((step, index) => {
              const isCompleted = index <= currentStep;
              const isCurrent  = index === currentStep;

              return (
                <View key={step.status} style={{ flexDirection: "row", marginBottom: index < STEPS.length - 1 ? 24 : 0 }}>
                  {/* Connector line + circle */}
                  <View style={{ alignItems: "center", width: 36 }}>
                    <View style={[
                      s.stepCircle,
                      {
                        backgroundColor: isCompleted ? step.color : "#1e293b",
                        borderColor: isCompleted ? step.color : "#334155",
                      },
                      isCurrent && step.status === "USERVERIFICATION" && {
                        shadowColor: "#a855f7",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.6,
                        shadowRadius: 8,
                        elevation: 8,
                      },
                    ]}>
                      {isCompleted ? (
                        <CheckCircle size={14} color="#fff" />
                      ) : (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#475569" }} />
                      )}
                    </View>
                    {index < STEPS.length - 1 && (
                      <View style={[s.connector, { backgroundColor: isCompleted ? step.color + "55" : "#1e293b" }]} />
                    )}
                  </View>

                  {/* Label */}
                  <View style={{ flex: 1, paddingLeft: 12, paddingTop: 2 }}>
                    <Text style={[s.stepLabel, isCurrent && { color: step.color }]}>{step.label}</Text>
                    <Text style={s.stepDesc}>{step.description}</Text>
                    {step.status === "ASSIGNED" && isCompleted && report.assignedTaskId && (
                      <View style={s.taskIdBadge}>
                        <Text style={s.taskIdText}>Task: {report.assignedTaskId.slice(0, 6)}…</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Footer note */}
          <View style={s.timelineFooter}>
            <View style={[s.dot, { backgroundColor: report.status === "RESOLVED" || report.status === "COMPLETED" ? "#10b981" : "#3b82f6" }]} />
            <Text style={s.footerText}>
              {report.status === "RESOLVED" || report.status === "COMPLETED"
                ? "Case closed. Thank you for making the city cleaner!"
                : "Updates are refreshed in real-time."}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── REJECT REASON MODAL (Android) ─────────────────── */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Reject Resolution</Text>
            <Text style={s.modalSub}>Please provide a reason:</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Reason for rejection…"
              placeholderTextColor="#64748b"
              multiline
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: "#1e293b" }]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={{ color: "#94a3b8", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: "#ef4444", flex: 1 }]}
                onPress={() => {
                  setRejectModalVisible(false);
                  if (rejectReason.trim()) handleReject(rejectReason.trim());
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  loadingText: { color: "#94a3b8", marginTop: 16, fontSize: 13 },
  errorText: { color: "#94a3b8", marginTop: 16, fontSize: 14, textAlign: "center" },
  linkBtn: { marginTop: 16 },
  linkText: { color: "#3b82f6", fontSize: 14 },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  backBtn: { padding: 8, borderRadius: 20, marginRight: 8 },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  headerSub: { color: "#475569", fontSize: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: "800" },

  // Card
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 20, marginBottom: 16, overflow: "hidden" },
  heroImage: { width: "100%", height: 200, backgroundColor: "#0f172a" },
  reportTitle: { color: "#fff", fontSize: 18, fontWeight: "800", lineHeight: 24 },
  address: { color: "#64748b", fontSize: 11, marginLeft: 4, flex: 1 },
  severityBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: "flex-start", marginBottom: 8 },
  severityCritical: { backgroundColor: "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  severityDefault: { backgroundColor: "rgba(249,115,22,0.12)", borderWidth: 1, borderColor: "rgba(249,115,22,0.2)" },

  // Verification Card
  verificationCard: { backgroundColor: "rgba(168,85,247,0.04)", borderWidth: 1, borderColor: "rgba(168,85,247,0.15)", borderRadius: 20, padding: 16, marginBottom: 16, overflow: "hidden" },
  verifyTitle: { color: "#c084fc", fontSize: 15, fontWeight: "800", marginLeft: 8, letterSpacing: 0.3 },
  verifyDesc: { color: "#94a3b8", fontSize: 12, lineHeight: 18, marginBottom: 16 },
  imageRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  imageCol: { flex: 1 },
  imageLabel: { color: "#64748b", fontSize: 9, fontWeight: "800", letterSpacing: 1, marginBottom: 6 },
  imageFrame: { borderRadius: 12, overflow: "hidden", borderWidth: 1, aspectRatio: 4 / 3, backgroundColor: "#0f172a" },
  compareImage: { width: "100%", height: "100%" },

  // Action buttons
  actionRow: { flexDirection: "row", gap: 10 },
  confirmBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#059669", paddingVertical: 14, borderRadius: 14, gap: 6 },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(248,113,113,0.25)", paddingVertical: 14, borderRadius: 14, gap: 6 },
  rejectText: { color: "#f87171", fontWeight: "800", fontSize: 13 },

  // Timeline
  sectionTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginLeft: 8 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  connector: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  stepLabel: { color: "#e2e8f0", fontSize: 13, fontWeight: "700" },
  stepDesc: { color: "#64748b", fontSize: 11, marginTop: 2 },
  taskIdBadge: { marginTop: 6, backgroundColor: "rgba(59,130,246,0.1)", borderWidth: 1, borderColor: "rgba(59,130,246,0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  taskIdText: { color: "#93c5fd", fontSize: 9, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  timelineFooter: { flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  footerText: { color: "#64748b", fontSize: 11, flex: 1 },

  // Reject Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox: { backgroundColor: "#1e293b", borderRadius: 20, padding: 24, width: "100%", maxWidth: 360, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginBottom: 4 },
  modalSub: { color: "#94a3b8", fontSize: 12, marginBottom: 16 },
  modalInput: { backgroundColor: "#0f172a", borderRadius: 12, padding: 14, color: "#fff", fontSize: 13, minHeight: 80, textAlignVertical: "top", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" },
});