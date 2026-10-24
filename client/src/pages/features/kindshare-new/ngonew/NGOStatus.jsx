import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

export default function NGOStatus() {
  const [ngo, setNgo] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  useEffect(() => {
    fetch(`http://localhost:3000/api/kindshare/ngos/status/${id}`)
      .then(res => res.json()).then(data => setNgo(data));
  }, [id]);

  if (!ngo) return <div style={PAGE}><p style={{ color: "#a1a1aa" }}>Loading...</p></div>;

  return (
    <div style={PAGE}>
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
      </div>

      <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#fff", margin: "0 0 24px 0" }}>NGO Registration Status</h1>

      <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "24px" }}>
        {!ngo.emailVerified && (
          <p style={{ color: "#f87171", fontSize: "15px", fontWeight: "600" }}>Please verify your email first.</p>
        )}
        {ngo.emailVerified && ngo.status === "pending" && (
          <p style={{ color: "#fbbf24", fontSize: "15px", fontWeight: "600" }}>Email verified. Waiting for admin approval.</p>
        )}
        {ngo.status === "approved" && (
          <p style={{ color: "#4ade80", fontSize: "15px", fontWeight: "600" }}>NGO has been approved.</p>
        )}
        {ngo.status === "rejected" && (
          <p style={{ color: "#f87171", fontSize: "15px", fontWeight: "600" }}>NGO registration was rejected.</p>
        )}
      </div>
    </div>
  );
}