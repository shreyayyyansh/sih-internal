import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, ArrowRight } from "lucide-react";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

export default function SelectNGO() {
  const { user } = useAuth0();
  const [ngos, setNgos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:3000/api/kindshare/ngos/admin-ngos?email=${user.email}`)
      .then(res => res.json()).then(data => setNgos(data));
  }, [user]);

  const openDashboard = (ngo) => {
    localStorage.setItem("ngoId", ngo.id);
    localStorage.setItem("ngoName", ngo.name);
    navigate("/kindshare/ngo-admin");
  };

  return (
    <div style={PAGE}>
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(129,140,248,0.15), rgba(129,140,248,0.05))", display: "flex", alignItems: "center", justifyContent: "center" }}><Building2 size={22} color="#818cf8" /></div>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: 0 }}>Select NGO Dashboard</h2>
          <p style={{ color: "#71717a", fontSize: "13px", margin: "4px 0 0 0" }}>Choose an NGO to manage</p>
        </div>
      </div>

      {ngos.length === 0 && (
        <div style={{ padding: "60px", textAlign: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "20px" }}>
          <Building2 size={48} color="#52525b" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#52525b", fontSize: "15px" }}>No NGOs linked to your account.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: ngos.length >= 2 ? "1fr 1fr" : "1fr", gap: "16px" }}>
        {ngos.map(ngo => (
          <button key={ngo.id} onClick={() => openDashboard(ngo)}
            style={{ padding: "24px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", textAlign: "left", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "16px" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(129,140,248,0.06)"; e.currentTarget.style.borderColor = "rgba(129,140,248,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(129,140,248,0.2), rgba(99,102,241,0.1))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Building2 size={22} color="#818cf8" /></div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: "#fff", fontWeight: "700", fontSize: "17px", margin: "0 0 4px 0" }}>{ngo.name}</h3>
              <p style={{ color: "#71717a", fontSize: "13px", margin: 0 }}>{ngo.address || "No address"}</p>
            </div>
            <ArrowRight size={22} color="#818cf8" />
          </button>
        ))}
      </div>
    </div>
  );
}