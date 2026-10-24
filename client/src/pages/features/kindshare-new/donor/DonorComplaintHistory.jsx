import { useEffect, useState } from "react";

export default function DonorComplaintHistory({ ngoId }) {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:3000/api/kindshare/complaints/ngo/${ngoId}`)
      .then(res => res.json())
      .then(data => setComplaints(data));
  }, [ngoId]);

  return (
    <div style={{ marginTop: "16px" }}>
      <h3 style={{ color: "#fff", fontWeight: "700", fontSize: "15px", margin: "0 0 12px 0" }}>Complaint History</h3>
      {complaints.length === 0 && <p style={{ color: "#52525b", fontSize: "13px" }}>No complaints for this NGO.</p>}
      {complaints.map(c => (
        <div key={c.id} style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "12px", marginBottom: "8px" }}>
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