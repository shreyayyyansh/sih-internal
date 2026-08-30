import { useState } from "react";
import DonationRequests from "./DonationRequests";
import { useNavigate } from "react-router-dom";
import ReceiverRequests from "./ReceiverRequests";
import NGOComplaintsAdmin from "./NGOComplaintsAdmin";
import { ArrowLeft, Settings, Package, FileText, AlertTriangle } from "lucide-react";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const TAB = (active) => ({ padding: "12px 24px", backgroundColor: active ? "rgba(129,140,248,0.15)" : "rgba(255,255,255,0.03)", border: active ? "1px solid rgba(129,140,248,0.3)" : "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", color: active ? "#818cf8" : "#71717a", fontWeight: "700", fontSize: "14px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "8px" });

export default function NGOAdminDashboard() {
  const [tab, setTab] = useState("requests");
  const navigate = useNavigate();
  const ngoId = localStorage.getItem("ngoId");
  const ngoName = localStorage.getItem("ngoName");

  if (!ngoId) {
    return (
      <div style={PAGE}>
        <div style={{ padding: "60px", textAlign: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "20px" }}>
          <AlertTriangle size={48} color="#f87171" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#f87171", fontSize: "16px", fontWeight: "600" }}>No NGO selected. Please select an NGO first.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={PAGE}>
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "32px", padding: "28px", background: "linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(5,5,16,0) 70%)", borderRadius: "20px", border: "1px solid rgba(129,140,248,0.1)" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "linear-gradient(135deg, #818cf8, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Settings size={24} color="#fff" /></div>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#fff", margin: "0 0 4px 0" }}>NGO Admin Dashboard</h1>
          <p style={{ color: "#a1a1aa", fontSize: "14px", margin: 0 }}>Managing: <strong style={{ color: "#818cf8" }}>{ngoName}</strong></p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "28px", flexWrap: "wrap" }}>
        <button style={TAB(tab === "requests")} onClick={() => setTab("requests")}><Package size={16} /> Donation Requests</button>
        <button style={TAB(tab === "receiver")} onClick={() => setTab("receiver")}><FileText size={16} /> Receiver Requests</button>
        <button style={TAB(tab === "complaints")} onClick={() => setTab("complaints")}><AlertTriangle size={16} /> Complaints</button>
      </div>

      <div style={{ backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "20px", padding: "24px", border: "1px solid rgba(255,255,255,0.04)" }}>
        {tab === "requests" && <DonationRequests ngoId={ngoId} />}
        {tab === "receiver" && <ReceiverRequests />}
        {tab === "complaints" && <NGOComplaintsAdmin />}
      </div>
    </div>
  );
}