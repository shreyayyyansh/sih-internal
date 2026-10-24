import { useState } from "react";
import { api } from "@/lib/api";

const INPUT = { width: "100%", padding: "12px 14px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "10px" };

export default function ComplaintForm({ ngoId }) {
  const [name, setName] = useState("");
  const [item, setItem] = useState("");
  const [issue, setIssue] = useState("");

  const submitComplaint = async () => {
    try {
      await api.post("/api/kindshare/complaints", { ngoId, name, itemOrCategory: item, issue, complaintFrom: "Donor" });
      alert("Complaint submitted");
    } catch (err) { console.error("Failed to submit complaint", err); alert(err.response?.data?.error || err.response?.data?.message || "Failed to submit complaint"); }
  };

  return (
    <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "16px", marginTop: "12px" }}>
      <h3 style={{ color: "#fff", fontWeight: "700", fontSize: "15px", margin: "0 0 12px 0" }}>Submit Complaint</h3>
      <input placeholder="Your Name" style={INPUT} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Item / Category" style={INPUT} onChange={(e) => setItem(e.target.value)} />
      <textarea placeholder="Describe Issue" style={{ ...INPUT, minHeight: "70px", resize: "vertical" }} onChange={(e) => setIssue(e.target.value)} />
      <button style={{ padding: "10px 18px", backgroundColor: "#f87171", border: "none", borderRadius: "10px", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: "pointer" }} onClick={submitComplaint}>Submit Complaint</button>
    </div>
  );
}