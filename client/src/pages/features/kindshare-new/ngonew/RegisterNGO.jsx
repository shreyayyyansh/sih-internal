import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, User, Mail, Phone, MapPin, MapPinned, FileText, Shirt, BookOpen, Pill, Laptop, Package } from "lucide-react";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px", display: "flex", justifyContent: "center" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const INPUT = { width: "100%", padding: "14px 16px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" };
const LABEL = { fontSize: "12px", fontWeight: "600", color: "#a1a1aa", marginBottom: "6px", display: "block" };

const CAT_ICONS = { Clothes: Shirt, Books: BookOpen, Medicines: Pill, Electronics: Laptop, Others: Package };

export default function RegisterNGO() {
  const [ngoName, setNgoName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ngoAddress, setNgoAddress] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const navigate = useNavigate();
  const categoryOptions = ["Clothes", "Books", "Medicines", "Electronics", "Others"];

  const handleCategoryChange = (cat) => setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  const fetchLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      setLat(position.coords.latitude); setLon(position.coords.longitude);
      alert("Location detected successfully");
    });
  };

  const detectAddressLocation = async () => {
    if (!ngoAddress) { alert("Enter address first"); return; }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(ngoAddress)}`;
      const res = await fetch(url); const data = await res.json();
      if (!data.length) { alert("Location not found."); return; }
      setLat(parseFloat(data[0].lat)); setLon(parseFloat(data[0].lon));
      setNgoAddress(data[0].display_name); alert("Location detected successfully");
    } catch (err) { console.error(err); alert("Failed to detect location"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lat || !lon) { alert("Please detect location first"); return; }
    if (!ngoName || !adminName || !email) { alert("Please fill all required fields"); return; }
    const res = await fetch("http://localhost:3000/api/kindshare/ngos/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: ngoName, adminName, email, phone, address: ngoAddress, description, categories, lat, lon })
    });
    const data = await res.json();
    alert("NGO registered successfully");
    navigate(`/kindshare/ngo-status?id=${data.id}`);
  };

  return (
    <div style={PAGE}>
      <div style={{ maxWidth: "720px", width: "100%" }}>
        <div style={HEADER}>
          <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
        </div>

        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "32px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(129,140,248,0.15), rgba(129,140,248,0.05))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={22} color="#818cf8" />
          </div>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#fff", margin: 0 }}>Register Your NGO</h2>
            <p style={{ color: "#71717a", fontSize: "13px", margin: "4px 0 0 0" }}>Fill in the details to register for approval</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section: Organization Info */}
          <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", padding: "24px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <User size={16} color="#52525b" />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#52525b", letterSpacing: "1.5px", textTransform: "uppercase" }}>Organization Details</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div><label style={LABEL}>NGO Name *</label><input style={INPUT} placeholder="Organization name" value={ngoName} onChange={e => setNgoName(e.target.value)} /></div>
              <div><label style={LABEL}>Admin Name *</label><input style={INPUT} placeholder="Your name" value={adminName} onChange={e => setAdminName(e.target.value)} /></div>
              <div><label style={LABEL}>Admin Email *</label><input type="email" style={INPUT} placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><label style={LABEL}>Phone Number</label><input style={INPUT} placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} /></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={LABEL}>Description</label>
                <textarea style={{ ...INPUT, minHeight: "80px", resize: "vertical" }} placeholder="Brief description of your NGO and mission" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section: Location */}
          <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", padding: "24px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <MapPin size={16} color="#52525b" />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#52525b", letterSpacing: "1.5px", textTransform: "uppercase" }}>Location</span>
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              <input style={INPUT} placeholder="Enter NGO Address" value={ngoAddress} onChange={e => setNgoAddress(e.target.value)} />
              <button type="button" onClick={detectAddressLocation} style={{ padding: "14px 18px", backgroundColor: "rgba(255,255,255,0.06)", border: "none", borderRadius: "14px", color: "#a1a1aa", fontWeight: "700", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}>Detect</button>
            </div>
            <button type="button" onClick={fetchLocation} style={{ width: "100%", padding: "14px", backgroundColor: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: "12px", color: "#818cf8", fontWeight: "700", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <MapPinned size={16} /> Use Current GPS Location
            </button>
            {lat && (
              <div style={{ marginTop: "14px", padding: "12px 14px", backgroundColor: "rgba(74,222,128,0.08)", borderRadius: "10px", border: "1px solid rgba(74,222,128,0.15)", display: "flex", alignItems: "center", gap: "8px" }}>
                <MapPin size={14} color="#4ade80" />
                <p style={{ color: "#4ade80", fontSize: "13px", margin: 0, fontWeight: "600" }}>Location set: {lat.toFixed(4)}, {lon.toFixed(4)}</p>
              </div>
            )}
          </div>

          {/* Section: Categories */}
          <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", padding: "24px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <Package size={16} color="#52525b" />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#52525b", letterSpacing: "1.5px", textTransform: "uppercase" }}>Categories Accepted</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
              {categoryOptions.map(cat => {
                const Icon = CAT_ICONS[cat];
                return (
                  <button key={cat} type="button" onClick={() => handleCategoryChange(cat)}
                    style={{ padding: "16px 12px", borderRadius: "14px", border: "1px solid", borderColor: categories.includes(cat) ? "rgba(129,140,248,0.4)" : "rgba(255,255,255,0.08)", backgroundColor: categories.includes(cat) ? "rgba(129,140,248,0.12)" : "rgba(255,255,255,0.02)", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
                      <Icon size={24} color={categories.includes(cat) ? "#818cf8" : "#71717a"} />
                    </div>
                    <span style={{ color: categories.includes(cat) ? "#818cf8" : "#71717a", fontWeight: categories.includes(cat) ? "700" : "500", fontSize: "13px" }}>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg, #818cf8, #6366f1)", border: "none", borderRadius: "14px", color: "#fff", fontWeight: "700", fontSize: "16px", cursor: "pointer" }}>
            Register NGO →
          </button>
        </form>
      </div>
    </div>
  );
}