import { useEffect, useState } from "react";
import { Shield, CheckCircle } from "lucide-react";

const STAT = (bgColor) => ({ backgroundColor: `${bgColor}12`, borderRadius: "16px", padding: "24px", border: `1px solid ${bgColor}25`, textAlign: "center" });

export default function KindShareAdmin() {
  const [ngos, setNgos] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetch("http://localhost:3000/api/kindshare/admin/pending-ngos")
      .then(res => res.json()).then(data => setNgos(data));
    fetch("http://localhost:3000/api/kindshare/admin/stats")
      .then(res => res.json()).then(data => setStats(data));
  }, []);

  const approve = async (id) => {
    await fetch(`http://localhost:3000/api/kindshare/admin/approve/${id}`, { method: "PATCH" });
    setNgos(ngos.filter(n => n.id !== id));
  };

  const reject = async (id) => {
    await fetch(`http://localhost:3000/api/kindshare/admin/reject/${id}`, { method: "PATCH" });
    setNgos(ngos.filter(n => n.id !== id));
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "32px" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(129,140,248,0.2), rgba(99,102,241,0.1))", display: "flex", alignItems: "center", justifyContent: "center" }}><Shield size={22} color="#818cf8" /></div>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#fff", margin: 0 }}>KindShare NGO Approvals</h1>
          <p style={{ color: "#71717a", fontSize: "13px", margin: "4px 0 0 0" }}>Review and manage NGO registration requests</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "36px" }}>
        <div style={STAT("#60a5fa")}>
          <p style={{ color: "#fff", fontSize: "36px", fontWeight: "800", margin: "0 0 4px 0" }}>{stats.total || 0}</p>
          <span style={{ color: "#60a5fa", fontWeight: "600", fontSize: "13px" }}>Total NGOs</span>
        </div>
        <div style={STAT("#fbbf24")}>
          <p style={{ color: "#fff", fontSize: "36px", fontWeight: "800", margin: "0 0 4px 0" }}>{stats.pending || 0}</p>
          <span style={{ color: "#fbbf24", fontWeight: "600", fontSize: "13px" }}>Pending</span>
        </div>
        <div style={STAT("#4ade80")}>
          <p style={{ color: "#fff", fontSize: "36px", fontWeight: "800", margin: "0 0 4px 0" }}>{stats.approved || 0}</p>
          <span style={{ color: "#4ade80", fontWeight: "600", fontSize: "13px" }}>Approved</span>
        </div>
        <div style={STAT("#f87171")}>
          <p style={{ color: "#fff", fontSize: "36px", fontWeight: "800", margin: "0 0 4px 0" }}>{stats.rejected || 0}</p>
          <span style={{ color: "#f87171", fontWeight: "600", fontSize: "13px" }}>Rejected</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        <div style={{ height: "1px", flex: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#52525b", letterSpacing: "1.5px", textTransform: "uppercase" }}>Pending Approvals</span>
        <div style={{ height: "1px", flex: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
      </div>

      {ngos.length === 0 && (
        <div style={{ padding: "60px", textAlign: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "20px" }}>
          <CheckCircle size={48} color="#4ade80" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#52525b", fontSize: "15px" }}>All clear — no pending NGOs to review.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: ngos.length >= 2 ? "1fr 1fr" : "1fr", gap: "16px" }}>
        {ngos.map((ngo) => (
          <div key={ngo.id} style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", padding: "24px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h2 style={{ color: "#fff", fontWeight: "700", fontSize: "18px", margin: "0 0 12px 0" }}>{ngo.name}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: "14px" }}>
              <p style={{ color: "#71717a", fontSize: "12px", margin: 0 }}><span style={{ color: "#a1a1aa" }}>Admin:</span> {ngo.adminName}</p>
              <p style={{ color: "#71717a", fontSize: "12px", margin: 0 }}><span style={{ color: "#a1a1aa" }}>Email:</span> {ngo.email}</p>
              <p style={{ color: "#71717a", fontSize: "12px", margin: 0 }}><span style={{ color: "#a1a1aa" }}>Phone:</span> {ngo.phone}</p>
              <p style={{ color: "#71717a", fontSize: "12px", margin: 0 }}><span style={{ color: "#a1a1aa" }}>Tags:</span> {ngo.categories?.join(", ")}</p>
            </div>
            <p style={{ color: "#52525b", fontSize: "12px", margin: "0 0 16px 0" }}>{ngo.address}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => approve(ngo.id)} style={{ flex: 1, padding: "11px", backgroundColor: "rgba(74,222,128,0.12)", border: "none", borderRadius: "10px", color: "#4ade80", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>Approve</button>
              <button onClick={() => reject(ngo.id)} style={{ flex: 1, padding: "11px", backgroundColor: "rgba(248,113,113,0.12)", border: "none", borderRadius: "10px", color: "#f87171", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}