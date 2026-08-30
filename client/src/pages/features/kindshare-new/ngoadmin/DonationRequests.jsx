import { useEffect, useState } from "react";

const CARD = { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "16px", marginBottom: "12px" };
const BTN = (active, color) => ({ padding: "8px 16px", backgroundColor: active ? `${color}22` : "rgba(255,255,255,0.04)", border: "none", borderRadius: "8px", color: active ? color : "#52525b", fontWeight: "700", fontSize: "12px", cursor: active ? "pointer" : "not-allowed", opacity: active ? 1 : 0.5 });
const STATUS_COLORS = { accepted: "#4ade80", available: "#4ade80", rejected: "#f87171", pending: "#fbbf24", donated: "#60a5fa" };

export default function DonationRequests({ ngoId }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ngoId) return;
    fetch(`http://localhost:3000/api/kindshare/donations/ngo/${ngoId}`)
      .then(res => res.json()).then(data => { setDonations(data); setLoading(false); });
  }, [ngoId]);

  const updateStatus = async (id, status) => {
    await fetch(`http://localhost:3000/api/kindshare/donations/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
    });
    setDonations(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  if (loading) return <p style={{ color: "#a1a1aa" }}>Loading donations...</p>;

  return (
    <div>
      <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", margin: "0 0 16px 0" }}>Donation Requests</h2>
      {donations.length === 0 && <p style={{ color: "#52525b" }}>No donation requests yet.</p>}
      {donations.map(donation => {
        const sc = STATUS_COLORS[donation.status] || "#fbbf24";
        return (
          <div key={donation.id} style={CARD}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ color: "#fff", fontWeight: "700", fontSize: "15px" }}>{donation.itemName}</span>
              <span style={{ backgroundColor: `${sc}18`, color: sc, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", textTransform: "capitalize" }}>{donation.status}</span>
            </div>
            <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 3px 0" }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Donor:</span> {donation.donorName}</p>
            <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 3px 0" }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Email:</span> {donation.donorEmail}</p>
            <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 3px 0" }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Phone:</span> {donation.donorPhone}</p>
            <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 3px 0" }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Quantity:</span> {donation.quantity}</p>
            <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 3px 0" }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Description:</span> {donation.description}</p>
            {donation.imageUrl && <img src={donation.imageUrl} alt="Donation item" style={{ width: "160px", borderRadius: "10px", marginTop: "8px" }} />}
            <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
              <button style={BTN(donation.status === "pending", "#4ade80")} disabled={donation.status !== "pending"} onClick={() => updateStatus(donation.id, "accepted")}>Accept</button>
              <button style={BTN(donation.status === "pending", "#f87171")} disabled={donation.status !== "pending"} onClick={() => updateStatus(donation.id, "rejected")}>Reject</button>
              <button style={BTN(donation.status === "accepted", "#fbbf24")} disabled={donation.status !== "accepted"} onClick={() => updateStatus(donation.id, "available")}>Mark Available</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}