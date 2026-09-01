import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, Inbox } from "lucide-react";
import ReceiverRequestForm from "./ReceiverRequestForm";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

export default function ReceiverDonations() {
  const { ngoId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const category = params.get("category");
  const [donations, setDonations] = useState([]);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [requestedItems, setRequestedItems] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:3000/api/kindshare/donations/available/${ngoId}?category=${category}`)
      .then(res => res.json()).then(data => setDonations(data));
  }, [ngoId, category]);

  return (
    <div style={PAGE}>
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(96,165,250,0.15),rgba(96,165,250,0.05))", display: "flex", alignItems: "center", justifyContent: "center" }}><Gift size={22} color="#60a5fa" /></div>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: 0 }}>Available Donations</h2>
            <p style={{ color: "#71717a", fontSize: "13px", margin: "4px 0 0 0" }}>Items available for request from this NGO</p>
          </div>
        </div>
        <div style={{ backgroundColor: "rgba(129,140,248,0.1)", padding: "8px 16px", borderRadius: "20px" }}>
          <span style={{ color: "#818cf8", fontWeight: "700", fontSize: "13px" }}>{donations.length} items</span>
        </div>
      </div>

      {donations.length === 0 && (
        <div style={{ padding: "60px", textAlign: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "20px" }}>
          <Inbox size={48} color="#52525b" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#52525b", fontSize: "15px" }}>No donations available in this category.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: donations.length >= 2 ? "1fr 1fr" : "1fr", gap: "16px" }}>
        {donations.map(donation => (
          <div key={donation.id} style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", padding: "20px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ color: "#fff", fontWeight: "700", fontSize: "16px" }}>{donation.itemName}</span>
              <span style={{ backgroundColor: "rgba(129,140,248,0.12)", color: "#818cf8", padding: "4px 12px", borderRadius: "10px", fontSize: "12px", fontWeight: "700" }}>Qty: {donation.quantity}</span>
            </div>
            <p style={{ color: "#71717a", fontSize: "13px", margin: "0 0 12px 0", lineHeight: 1.5 }}>{donation.description || "No description"}</p>
            {donation.imageUrl && <img src={donation.imageUrl} alt="" style={{ width: "100%", maxWidth: "200px", borderRadius: "10px", marginBottom: "12px" }} />}
            <button
              style={{ width: "100%", padding: "11px", backgroundColor: requestedItems.includes(donation.id) ? "rgba(255,255,255,0.04)" : "#818cf8", border: "none", borderRadius: "10px", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: requestedItems.includes(donation.id) ? "not-allowed" : "pointer" }}
              disabled={requestedItems.includes(donation.id)}
              onClick={() => setSelectedDonation(donation.id)}>
              {requestedItems.includes(donation.id) ? "Request Sent" : "Request This Item"}
            </button>
            {selectedDonation === donation.id && (
              <ReceiverRequestForm donationId={donation.id} ngoId={ngoId} onRequestSent={(id) => { setRequestedItems(prev => [...prev, id]); setSelectedDonation(null); }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}