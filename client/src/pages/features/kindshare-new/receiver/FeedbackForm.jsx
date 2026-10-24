import { useState } from "react";
import { api } from "@/lib/api";

const INPUT = { width: "100%", padding: "12px 14px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "10px" };

export default function FeedbackForm({ ngoId, ngoName }) {
  const [name, setName] = useState("");
  const [issue, setIssue] = useState("");
  const [rating, setRating] = useState(0);

  const submitFeedback = async () => {
    try {
      await api.post("/api/kindshare/feedback", { ngoId, ngoName, receiverName: name, issue, rating });
      alert("Feedback submitted");
    } catch (err) { console.error("Failed to submit feedback", err); alert(err.response?.data?.error || err.response?.data?.message || "Failed to submit feedback"); }
  };

  return (
    <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "16px", marginTop: "12px" }}>
      <h3 style={{ color: "#fff", fontWeight: "700", fontSize: "15px", margin: "0 0 12px 0" }}>Rate NGO</h3>
      <input placeholder="Your Name" style={INPUT} onChange={(e) => setName(e.target.value)} />
      <textarea placeholder="Issue / Comments" style={{ ...INPUT, minHeight: "70px", resize: "vertical" }} onChange={(e) => setIssue(e.target.value)} />
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} onClick={() => setRating(star)}
            style={{ cursor: "pointer", fontSize: "28px", color: rating >= star ? "#fbbf24" : "#3f3f46" }}>★</span>
        ))}
      </div>
      <button style={{ padding: "10px 18px", backgroundColor: "#818cf8", border: "none", borderRadius: "10px", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: "pointer" }} onClick={submitFeedback}>Submit Feedback</button>
    </div>
  );
}