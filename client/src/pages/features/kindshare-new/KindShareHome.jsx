import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { ArrowLeft, Package, Gift, Building2, ClipboardList, FileText, Settings, ArrowRight, Handshake } from "lucide-react";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

export default function KindShareHome() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth0();
  const [role, setRole] = useState(null);
  const [ngoName, setNgoName] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const checkRole = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/kindshare/users/role?email=${user.email}`);
        const data = await res.json();
        setRole(data.role);
      } catch (err) { console.error(err); }
    };
    checkRole();
  }, [user, isAuthenticated]);

  const fetchNGO = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/kindshare/ngos/by-email?email=${user.email}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.ngoName) setNgoName(data.ngoName);
    } catch (err) { console.error("Fetch NGO Error:", err); }
  };

  return (
    <div style={PAGE}>
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
      </div>

      {/* Hero */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "40px", padding: "32px", background: "linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(5,5,16,0) 70%)", borderRadius: "20px", border: "1px solid rgba(129,140,248,0.1)" }}>
        <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "linear-gradient(135deg, #818cf8, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Handshake size={28} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "800", color: "#fff", margin: "0 0 6px 0", lineHeight: 1.1 }}>KindShare</h1>
          <p style={{ color: "#a1a1aa", fontSize: "15px", margin: 0, lineHeight: 1.5 }}>AI-powered resource redistribution — connecting donors with communities through verified NGOs.</p>
        </div>
      </div>

      {/* Main Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
        <button onClick={() => navigate("/kindshare/donor")} style={{ padding: "28px 24px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(74,222,128,0.06)"; e.currentTarget.style.borderColor = "rgba(74,222,128,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: "rgba(74,222,128,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}><Package size={22} color="#4ade80" /></div>
          <h3 style={{ color: "#fff", fontWeight: "700", fontSize: "18px", margin: "0 0 6px 0" }}>Donate Items</h3>
          <p style={{ color: "#71717a", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>Help others by donating clothes, books, medicines, electronics, and more to NGOs near you.</p>
        </button>

        <button onClick={() => navigate("/kindshare/receiver")} style={{ padding: "28px 24px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.06)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: "rgba(96,165,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}><Gift size={22} color="#60a5fa" /></div>
          <h3 style={{ color: "#fff", fontWeight: "700", fontSize: "18px", margin: "0 0 6px 0" }}>Receive Items</h3>
          <p style={{ color: "#71717a", fontSize: "13px", margin: 0, lineHeight: 1.5 }}>Find available items from verified NGOs in your area and submit a request.</p>
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ height: "1px", flex: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#52525b", letterSpacing: "1.5px", textTransform: "uppercase" }}>More Options</span>
        <div style={{ height: "1px", flex: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "32px" }}>
        <button onClick={() => navigate("/kindshare/register-ngo")} style={{ padding: "20px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "14px", border: "none", cursor: "pointer", textAlign: "left", transition: "background-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"}>
          <Building2 size={22} color="#a1a1aa" />
          <h4 style={{ color: "#fff", fontWeight: "700", fontSize: "14px", margin: "10px 0 4px 0" }}>Register NGO</h4>
          <p style={{ color: "#52525b", fontSize: "12px", margin: 0 }}>Register your organization</p>
        </button>

        <button onClick={() => navigate("/kindshare/my-donations")} style={{ padding: "20px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "14px", border: "none", cursor: "pointer", textAlign: "left", transition: "background-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"}>
          <ClipboardList size={22} color="#a1a1aa" />
          <h4 style={{ color: "#fff", fontWeight: "700", fontSize: "14px", margin: "10px 0 4px 0" }}>My Donations</h4>
          <p style={{ color: "#52525b", fontSize: "12px", margin: 0 }}>Track your donation status</p>
        </button>

        <button onClick={() => navigate("/kindshare/receiver/my-requests")} style={{ padding: "20px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "14px", border: "none", cursor: "pointer", textAlign: "left", transition: "background-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"}>
          <FileText size={22} color="#a1a1aa" />
          <h4 style={{ color: "#fff", fontWeight: "700", fontSize: "14px", margin: "10px 0 4px 0" }}>My Requests</h4>
          <p style={{ color: "#52525b", fontSize: "12px", margin: 0 }}>View your item requests</p>
        </button>
      </div>

      {role === "NGO_ADMIN" && (
        <button onClick={() => navigate("/kindshare/select-ngo")} style={{ width: "100%", padding: "24px", background: "linear-gradient(135deg, rgba(129,140,248,0.08) 0%, rgba(5,5,16,0) 100%)", borderRadius: "16px", border: "1px solid rgba(129,140,248,0.15)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "16px" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(129,140,248,0.35)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(129,140,248,0.15)"}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(129,140,248,0.2), rgba(99,102,241,0.2))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Settings size={22} color="#818cf8" /></div>
          <div>
            <h3 style={{ color: "#818cf8", fontWeight: "700", fontSize: "16px", margin: "0 0 4px 0" }}>{ngoName ? `${ngoName} Dashboard` : "NGO Dashboard"}</h3>
            <p style={{ color: "#71717a", fontSize: "13px", margin: 0 }}>Manage donations, requests, and complaints for your NGO.</p>
          </div>
          <ArrowRight size={22} color="#818cf8" style={{ marginLeft: "auto" }} />
        </button>
      )}
    </div>
  );
}