import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, MapPinned, Package, Shirt, BookOpen, Pill, Laptop } from "lucide-react";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const INPUT = { width: "100%", padding: "14px 16px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" };

const CAT_ICONS = { Clothes: Shirt, Books: BookOpen, Medicines: Pill, Electronics: Laptop, Others: Package };

export default function DonorCategory() {
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const categories = ["Clothes", "Books", "Medicines", "Electronics", "Others"];

  const fetchLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition((position) => {
      setLat(position.coords.latitude); setLon(position.coords.longitude);
      setLoadingLocation(false); alert("Location fetched successfully");
    });
  };

  const convertAddress = async () => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${address}`);
    const data = await res.json();
    if (!data.length) { alert("Address not found"); return; }
    setLat(parseFloat(data[0].lat)); setLon(parseFloat(data[0].lon));
    alert("Address location detected");
  };

  const handleCategoryClick = (category) => {
    if (!lat || !lon) { alert("Please select location first"); return; }
    navigate(`/kindshare/donor/ngos?category=${encodeURIComponent(category)}&lat=${lat}&lon=${lon}`);
  };

  return (
    <div style={PAGE}>
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", alignItems: "start" }}>
        {/* Left — Location */}
        <div style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "20px", padding: "28px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: "rgba(129,140,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><MapPin size={20} color="#818cf8" /></div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: 0 }}>Your Location</h2>
              <p style={{ color: "#71717a", fontSize: "12px", margin: "2px 0 0 0" }}>We need this to find nearby NGOs</p>
            </div>
          </div>

          <button onClick={fetchLocation} style={{ width: "100%", padding: "14px", backgroundColor: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.25)", borderRadius: "12px", color: "#818cf8", fontWeight: "700", fontSize: "14px", cursor: "pointer", marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <MapPinned size={16} /> {loadingLocation ? "Fetching..." : "Use Current Location"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "14px 0" }}>
            <div style={{ height: "1px", flex: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: "11px", color: "#52525b", fontWeight: "600" }}>OR</span>
            <div style={{ height: "1px", flex: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input type="text" placeholder="Enter city or address" style={INPUT} value={address} onChange={(e) => setAddress(e.target.value)} />
            <button onClick={convertAddress} style={{ padding: "14px 18px", backgroundColor: "rgba(255,255,255,0.06)", border: "none", borderRadius: "12px", color: "#a1a1aa", fontWeight: "700", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" }}>Detect</button>
          </div>

          {lat && lon && (
            <div style={{ marginTop: "16px", padding: "12px 14px", backgroundColor: "rgba(74,222,128,0.08)", borderRadius: "10px", border: "1px solid rgba(74,222,128,0.15)", display: "flex", alignItems: "center", gap: "8px" }}>
              <MapPin size={14} color="#4ade80" />
              <p style={{ color: "#4ade80", fontSize: "13px", margin: 0, fontWeight: "600" }}>Location selected · {lat.toFixed(4)}, {lon.toFixed(4)}</p>
            </div>
          )}
        </div>

        {/* Right — Categories */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: "rgba(74,222,128,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><Package size={20} color="#4ade80" /></div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: 0 }}>Donation Category</h2>
              <p style={{ color: "#71717a", fontSize: "12px", margin: "2px 0 0 0" }}>Select what you'd like to donate</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {categories.map(cat => {
              const Icon = CAT_ICONS[cat];
              return (
                <button key={cat} onClick={() => handleCategoryClick(cat)}
                  style={{ padding: "20px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(74,222,128,0.06)"; e.currentTarget.style.borderColor = "rgba(74,222,128,0.2)"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                  <Icon size={28} color="#a1a1aa" style={{ marginBottom: "8px" }} />
                  <span style={{ color: "#fff", fontWeight: "700", fontSize: "15px", display: "block" }}>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}