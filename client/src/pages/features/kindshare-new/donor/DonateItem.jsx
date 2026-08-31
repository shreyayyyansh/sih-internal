import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, User, Mail, Phone, MapPin, ClipboardList, Camera, Image } from "lucide-react";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px", display: "flex", justifyContent: "center" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const INPUT = { width: "100%", padding: "14px 16px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" };
const SELECT = { ...INPUT, appearance: "none" };
const LABEL = { fontSize: "12px", fontWeight: "600", color: "#a1a1aa", marginBottom: "6px", display: "block" };

export default function DonateItem() {
  const { ngoId } = useParams();
  const navigate = useNavigate();
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [address, setAddress] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ngoId) { alert("NGO not selected"); return; }
    try {
      let imageUrl = "";
      if (image) {
        const formData = new FormData();
        formData.append("image", image);
        const uploadRes = await fetch("http://localhost:3000/api/kindshare/donations/upload-image", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.imageUrl;
      }
      const res = await fetch("http://localhost:3000/api/kindshare/donations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ngoId, donorName, donorEmail, donorPhone, donorAddress: address, itemName, category, quantity, description, imageUrl, status: "pending" })
      });
      const data = await res.json();
      navigate(`/donation-status/${data.id}`);
    } catch (error) { console.error("Donation submission failed", error); }
  };

  return (
    <div style={PAGE}>
      <div style={{ maxWidth: "680px", width: "100%" }}>
        <div style={HEADER}>
          <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "32px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(74,222,128,0.15), rgba(74,222,128,0.05))", display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={22} color="#4ade80" /></div>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#fff", margin: 0 }}>Donate Item</h2>
            <p style={{ color: "#71717a", fontSize: "13px", margin: "4px 0 0 0" }}>Fill in the details below to submit your donation</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", padding: "24px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <User size={16} color="#52525b" />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#52525b", letterSpacing: "1.5px", textTransform: "uppercase" }}>Your Information</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div><label style={LABEL}>Name *</label><input placeholder="Full name" style={INPUT} value={donorName} onChange={e => setDonorName(e.target.value)} /></div>
              <div><label style={LABEL}>Email *</label><input placeholder="you@email.com" style={INPUT} value={donorEmail} onChange={e => setDonorEmail(e.target.value)} /></div>
              <div><label style={LABEL}>Phone</label><input placeholder="Phone number" style={INPUT} value={donorPhone} onChange={e => setDonorPhone(e.target.value)} /></div>
              <div><label style={LABEL}>Pickup Address</label><input placeholder="Your address" style={INPUT} value={address} onChange={e => setAddress(e.target.value)} /></div>
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", padding: "24px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <ClipboardList size={16} color="#52525b" />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#52525b", letterSpacing: "1.5px", textTransform: "uppercase" }}>Item Details</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={LABEL}>Category</label>
                <select style={SELECT} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="" style={{ backgroundColor: "#0a0a1a" }}>Select Category</option>
                  {["Clothes", "Books", "Medicines", "Electronics", "Others"].map(c => <option key={c} value={c} style={{ backgroundColor: "#0a0a1a" }}>{c}</option>)}
                </select>
              </div>
              <div><label style={LABEL}>Item Name *</label><input placeholder="e.g. Winter Jacket" style={INPUT} value={itemName} onChange={e => setItemName(e.target.value)} /></div>
              <div><label style={LABEL}>Quantity</label><input placeholder="e.g. 5" style={INPUT} value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={LABEL}>Description</label>
                <textarea placeholder="Describe the item condition, size, etc." style={{ ...INPUT, minHeight: "80px", resize: "vertical" }} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", padding: "24px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Image size={16} color="#52525b" />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#52525b", letterSpacing: "1.5px", textTransform: "uppercase" }}>Item Photo (Optional)</span>
            </div>
            <input type="file" style={{ ...INPUT, padding: "10px 14px" }} onChange={e => setImage(e.target.files[0])} />
          </div>

          <button type="submit" style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg, #818cf8, #6366f1)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: "700", fontSize: "16px", cursor: "pointer" }}>
            Submit Donation →
          </button>
        </form>
      </div>
    </div>
  );
}