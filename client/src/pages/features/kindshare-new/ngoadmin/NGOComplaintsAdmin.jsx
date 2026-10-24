import { useEffect, useState } from "react";

export default function NGOComplaintsAdmin() {
  const [complaints, setComplaints] = useState([]);
  const ngoId = localStorage.getItem("ngoId");

  useEffect(() => {
    if (!ngoId) return;
    fetch(`http://localhost:3000/api/kindshare/complaints/ngo/${ngoId}`)
      .then(res => res.json()).then(data => { console.log("Admin complaints:", data); setComplaints(data); });
  }, [ngoId]);

  return (
    <div>
      <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", margin: "0 0 16px 0" }}>NGO Complaints</h2>
      {complaints.length === 0 && <p style={{ color: "#52525b" }}>No complaints yet.</p>}
      {complaints.map(c => (
        <div key={c.id} style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "14px", marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: "#fff", fontWeight: "600", fontSize: "13px" }}>{c.name}</span>
            <span style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#71717a", padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: "700", textTransform: "uppercase" }}>{c.complaintFrom}</span>
          </div>
          <p style={{ color: "#52525b", fontSize: "12px", margin: "0 0 3px 0" }}>Item: {c.itemOrCategory}</p>
          <p style={{ color: "#a1a1aa", fontSize: "13px", margin: 0 }}>{c.issue}</p>
        </div>
      ))}
    </div>
  );
}