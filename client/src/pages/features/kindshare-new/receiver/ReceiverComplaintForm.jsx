import { useState } from "react";

const INPUT = { width: "100%", padding: "12px 14px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "10px" };

export default function ReceiverComplaintForm({ ngoId, ngoName }) {
  const [name, setName] = useState("");
  const [item, setItem] = useState("");
  const [issue, setIssue] = useState("");

  const submitComplaint = async () => {
    await fetch("http://localhost:3000/api/kindshare/complaints", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ngoId, ngoName, name, itemOrCategory: item, issue, complaintFrom: "Receiver" })
    });
    alert("Complaint submitted");
  };

  return (
    <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "16px", marginTop: "12px" }}>
      <h3 style={{ color: "#fff", fontWeight: "700", fontSize: "15px", margin: "0 0 12px 0" }}>File Complaint</h3>
      <input placeholder="Your Name" style={INPUT} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Item / Category" style={INPUT} onChange={(e) => setItem(e.target.value)} />
      <textarea placeholder="Describe Issue" style={{ ...INPUT, minHeight: "70px", resize: "vertical" }} onChange={(e) => setIssue(e.target.value)} />
      <button style={{ padding: "10px 18px", backgroundColor: "#f87171", border: "none", borderRadius: "10px", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: "pointer" }} onClick={submitComplaint}>Submit Complaint</button>
    </div>
  );
}