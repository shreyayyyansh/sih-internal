import { useEffect, useState } from "react";

const CARD = { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "16px", marginBottom: "12px" };
const BTN = (active, color) => ({ padding: "8px 16px", backgroundColor: active ? `${color}22` : "rgba(255,255,255,0.04)", border: "none", borderRadius: "8px", color: active ? color : "#52525b", fontWeight: "700", fontSize: "12px", cursor: active ? "pointer" : "not-allowed", opacity: active ? 1 : 0.5 });
const STATUS_COLORS = { accepted: "#4ade80", rejected: "#f87171", pending: "#fbbf24", donated: "#60a5fa" };

export default function ReceiverRequests() {
  const [requests, setRequests] = useState([]);
  const ngoId = localStorage.getItem("ngoId");

  const updateStatus = async (id, status) => {
    await fetch(`http://localhost:3000/api/kindshare/requests/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
    });
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  useEffect(() => {
    fetch(`http://localhost:3000/api/kindshare/requests/ngo/${ngoId}`)
      .then(res => res.json()).then(data => setRequests(data));
  }, [ngoId]);

  return (
    <div>
      <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", margin: "0 0 16px 0" }}>Receiver Requests</h2>
      {requests.length === 0 && <p style={{ color: "#52525b" }}>No receiver requests yet.</p>}
      {requests.map(req => {
        const sc = STATUS_COLORS[req.status] || "#fbbf24";
        return (
          <div key={req.id} style={CARD}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>{req.receiverName}</span>
              <span style={{ backgroundColor: `${sc}18`, color: sc, padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", textTransform: "capitalize" }}>{req.status}</span>
            </div>
            <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 3px 0" }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Email:</span> {req.receiverEmail}</p>
            <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 3px 0" }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Phone:</span> {req.receiverPhone}</p>
            <p style={{ color: "#71717a", fontSize: "12px", margin: "0 0 3px 0" }}><span style={{ color: "#a1a1aa", fontWeight: "600" }}>Address:</span> {req.receiverAddress}</p>
            <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
              <button style={BTN(req.status === "pending", "#4ade80")} disabled={req.status !== "pending"} onClick={() => updateStatus(req.id, "accepted")}>Accept</button>
              <button style={BTN(req.status === "pending", "#f87171")} disabled={req.status !== "pending"} onClick={() => updateStatus(req.id, "rejected")}>Reject</button>
              <button style={BTN(req.status === "accepted", "#fbbf24")} disabled={req.status !== "accepted"} onClick={() => updateStatus(req.id, "donated")}>Donated</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}