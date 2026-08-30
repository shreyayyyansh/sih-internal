import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Inbox } from "lucide-react";
import FeedbackForm from "./FeedbackForm";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const STATUS_COLORS = { accepted: "#4ade80", rejected: "#f87171", pending: "#fbbf24", donated: "#60a5fa" };

export default function MyRequests() {
  const navigate = useNavigate();
  const { user } = useAuth0();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:3000/api/kindshare/requests/receiver?email=${user.email}`)
      .then(res => res.json()).then(data => setRequests(data));
  }, [user]);

  return (
    <div style={PAGE}>
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))", display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={22} color="#60a5fa" /></div>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: 0 }}>My Requests</h2>
            <p style={{ color: "#71717a", fontSize: "13px", margin: "4px 0 0 0" }}>Track items you've requested from NGOs</p>
          </div>
        </div>
        <div style={{ backgroundColor: "rgba(129,140,248,0.1)", padding: "8px 16px", borderRadius: "20px" }}>
          <span style={{ color: "#818cf8", fontWeight: "700", fontSize: "13px" }}>{requests.length} total</span>
        </div>
      </div>

      {requests.length === 0 && (
        <div style={{ padding: "60px", textAlign: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "20px" }}>
          <Inbox size={48} color="#52525b" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#52525b", fontSize: "15px" }}>No requests made yet.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: requests.length >= 2 ? "1fr 1fr" : "1fr", gap: "14px" }}>
        {requests.map(req => {
          const sc = STATUS_COLORS[req.status] || "#fbbf24";
          return (
            <div key={req.id} style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ color: "#fff", fontWeight: "700", fontSize: "15px" }}>NGO: {req.ngoName || req.ngoId}</span>
                <span style={{ backgroundColor: `${sc}18`, color: sc, padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", textTransform: "capitalize" }}>{req.status}</span>
              </div>
              <p style={{ color: "#71717a", fontSize: "12px", margin: 0 }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Donation ID:</span> {req.donationId}</p>
              {req.status === "donated" && <FeedbackForm ngoId={req.ngoId} ngoName={req.ngoName} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}