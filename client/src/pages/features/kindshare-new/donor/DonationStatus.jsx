import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const STATUS_COLORS = { accepted: "#4ade80", available: "#4ade80", rejected: "#f87171", pending: "#fbbf24", donated: "#60a5fa" };

export default function DonationStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [donation, setDonation] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:3000/api/kindshare/donations/status/${id}`)
      .then(res => res.json())
      .then(data => setDonation(data));
  }, [id]);

  if (!donation) return <div style={PAGE}><p style={{ color: "#a1a1aa" }}>Loading...</p></div>;

  const sc = STATUS_COLORS[donation.status] || "#fbbf24";

  return (
    <div style={PAGE}>
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}>←</button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
      </div>

      <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: "0 0 24px 0" }}>Donation Status</h2>

      <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "20px" }}>
        <p style={{ color: "#a1a1aa", fontSize: "13px", margin: "0 0 6px 0" }}><span style={{ color: "#fff", fontWeight: "600" }}>Donor:</span> {donation.donorName}</p>
        <p style={{ color: "#a1a1aa", fontSize: "13px", margin: "0 0 6px 0" }}><span style={{ color: "#fff", fontWeight: "600" }}>Item:</span> {donation.itemName}</p>
        <p style={{ color: "#a1a1aa", fontSize: "13px", margin: "0 0 6px 0" }}><span style={{ color: "#fff", fontWeight: "600" }}>Quantity:</span> {donation.quantity}</p>
        <p style={{ color: "#a1a1aa", fontSize: "13px", margin: "0 0 6px 0" }}><span style={{ color: "#fff", fontWeight: "600" }}>Description:</span> {donation.description}</p>
        <p style={{ color: "#a1a1aa", fontSize: "13px", margin: "0" }}>
          <span style={{ color: "#fff", fontWeight: "600" }}>Status:</span>{" "}
          <span style={{ color: sc, fontWeight: "700", textTransform: "capitalize" }}>{donation.status}</span>
        </p>
      </div>
    </div>
  );
}