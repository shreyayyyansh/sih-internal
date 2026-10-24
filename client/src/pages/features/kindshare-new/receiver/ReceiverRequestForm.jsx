import { useState } from "react";

const INPUT = { width: "100%", padding: "12px 14px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", marginBottom: "10px" };

export default function ReceiverRequestForm({ donationId, ngoId, onRequestSent }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const submitRequest = async () => {
    await fetch("http://localhost:3000/api/kindshare/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ngoId, donationId, receiverName: name, receiverEmail: email, receiverPhone: phone, receiverAddress: address })
    });
    alert("Request sent to NGO");
    onRequestSent(donationId);
  };

  return (
    <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "14px", padding: "16px", marginTop: "12px" }}>
      <input placeholder="Name" style={INPUT} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Email" style={INPUT} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Phone" style={INPUT} onChange={(e) => setPhone(e.target.value)} />
      <input placeholder="Address" style={INPUT} onChange={(e) => setAddress(e.target.value)} />
      <button style={{ padding: "10px 18px", backgroundColor: "#818cf8", border: "none", borderRadius: "10px", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: "pointer" }} onClick={submitRequest}>Send Request</button>
    </div>
  );
}