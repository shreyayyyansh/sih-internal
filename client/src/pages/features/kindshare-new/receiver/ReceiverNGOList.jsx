import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, MapPin, Star, Search } from "lucide-react";
import ReceiverComplaintForm from "./ReceiverComplaintForm";
import ReceiverComplaintHistory from "./ReceiverComplaintHistory";

const PAGE = { minHeight: "100vh", backgroundColor: "#050510", padding: "32px 40px" };
const HEADER = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" };
const BACK_BTN = { width: "40px", height: "40px", borderRadius: "20px", backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#a1a1aa", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

export default function ReceiverNGOList() {
  const [ngos, setNgos] = useState([]);
  const [selectedNGO, setSelectedNGO] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const category = params.get("category");
  const lat = params.get("lat");
  const lon = params.get("lon");

  useEffect(() => {
    fetch(`http://localhost:3000/api/kindshare/ngos?category=${category}&lat=${lat}&lon=${lon}`)
      .then(res => res.json()).then(data => setNgos(data));
  }, [category, lat, lon]);

  return (
    <div style={PAGE}>
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff", letterSpacing: "-0.5px" }}>Urban<span style={{ color: "#818cf8" }}>Flow</span></span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05))", display: "flex", alignItems: "center", justifyContent: "center" }}><Gift size={22} color="#60a5fa" /></div>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", margin: 0 }}>NGOs providing {category}</h2>
            <p style={{ color: "#71717a", fontSize: "13px", margin: "4px 0 0 0" }}>Select an NGO to view available items</p>
          </div>
        </div>
        <div style={{ backgroundColor: "rgba(129,140,248,0.1)", padding: "8px 16px", borderRadius: "20px" }}>
          <span style={{ color: "#818cf8", fontWeight: "700", fontSize: "13px" }}>{ngos.length} found</span>
        </div>
      </div>

      {ngos.length === 0 && (
        <div style={{ padding: "60px", textAlign: "center", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "20px" }}>
          <Search size={48} color="#52525b" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "#52525b", fontSize: "15px" }}>No NGOs found nearby.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: ngos.length >= 2 ? "1fr 1fr" : "1fr", gap: "16px" }}>
        {ngos.map(ngo => (
          <div key={ngo.id} style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "18px", padding: "24px", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ color: "#fff", fontWeight: "700", fontSize: "18px", margin: 0 }}>{ngo.name}</h3>
              <span style={{ backgroundColor: "rgba(250,204,21,0.1)", color: "#fbbf24", padding: "4px 12px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                <Star size={12} fill="#fbbf24" /> {typeof ngo.rating === 'number' ? ngo.rating.toFixed(1) : 'N/A'}
              </span>
            </div>
            <p style={{ color: "#818cf8", fontSize: "12px", margin: "0 0 14px 0", display: "flex", alignItems: "center", gap: "4px" }}><MapPin size={12} /> {ngo.distance ? Number(ngo.distance).toFixed(2) : '?'} km</p>

            <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
              <button onClick={() => navigate(`/kindshare/receiver/donations/${ngo.id}?category=${category}`)} style={{ flex: 1, padding: "11px", backgroundColor: "rgba(96,165,250,0.12)", border: "none", borderRadius: "10px", color: "#60a5fa", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>View Items</button>
              <button onClick={() => setSelectedNGO(selectedNGO?.id === ngo.id ? null : ngo)} style={{ flex: 1, padding: "11px", backgroundColor: "rgba(255,255,255,0.04)", border: "none", borderRadius: "10px", color: "#a1a1aa", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}>
                {selectedNGO?.id === ngo.id ? "Hide" : "Complaints"}
              </button>
            </div>

            {selectedNGO?.id === ngo.id && (
              <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
                <ReceiverComplaintHistory ngoId={ngo.id} />
                <ReceiverComplaintForm ngoId={ngo.id} ngoName={ngo.name} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}