import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, Inbox } from "lucide-react";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const STATUS_COLORS = { accepted: "#4ade80", available: "#4ade80", rejected: "#f87171", pending: "#fbbf24", donated: "#60a5fa" };

export default function MyDonations() {
  const navigate = useNavigate();
  const { user } = useAuth0();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:3000/api/kindshare/donations/donor?email=${user.email}`)
      .then(res => res.json()).then(data => { setDonations(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [user]);

  if (loading) return <div style={PAGE}><p style={{ color: "#a1a1aa" }}>Loading donations...</p></div>;

  return (
    <div style={PAGE}>
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.05))", display: "flex", alignItems: "center", justifyContent: "center" }}><ClipboardList size={22} color="#4ade80" /></div>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: 0 }}>My Donations</h2>
            <p style={{ color: "#71717a", fontSize: "13px", margin: "4px 0 0 0" }}>Track the status of items you've donated</p>
          </div>
        </div>
        <div style={{ backgroundColor: "rgba(129,140,248,0.1)", padding: "8px 16px", borderRadius: "20px" }}>
          <span style={{ color: "#818cf8", fontWeight: "700", fontSize: "13px" }}>{donations.length} total</span>
        </div>
      </div>

      {donations.length === 0 && (
        <div style={{ padding: "60px", textAlign: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "20px" }}>
          <Inbox size={48} color="#52525b" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#52525b", fontSize: "15px" }}>You have not made any donations yet.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: donations.length >= 2 ? "1fr 1fr" : "1fr", gap: "14px" }}>
        {donations.map(donation => {
          const sc = STATUS_COLORS[donation.status] || "#fbbf24";
          return (
            <div key={donation.id} style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ color: "#fff", fontWeight: "700", fontSize: "16px" }}>{donation.itemName}</span>
                <span style={{ backgroundColor: `${sc}18`, color: sc, padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", textTransform: "capitalize" }}>{donation.status}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                <p style={{ color: "#71717a", fontSize: "12px", margin: 0 }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Qty:</span> {donation.quantity}</p>
                <p style={{ color: "#71717a", fontSize: "12px", margin: 0 }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Category:</span> {donation.category || '-'}</p>
              </div>
              <p style={{ color: "#52525b", fontSize: "12px", margin: "8px 0 0 0" }}>{donation.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}