import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Package,
  Gift,
  Building2,
  ClipboardList,
  FileText,
  Settings,
  ArrowRight,
  Handshake
} from "lucide-react";

const PAGE = {
  minHeight: "100vh",
  backgroundColor: "#050510",
  padding: "32px 40px"
};

const HEADER = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "40px"
};

const BACK_BTN = {
  width: "40px",
  height: "40px",
  borderRadius: "20px",
  backgroundColor: "rgba(255,255,255,0.05)",
  border: "none",
  color: "#a1a1aa",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

export default function KindShareHome() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth0();

  const [ngoName, setNgoName] = useState("");
  const [loadingNgo, setLoadingNgo] = useState(true);

  // Fetch NGO
  const fetchNGO = async () => {
    try {
      setLoadingNgo(true);

      const res = await fetch(
        `http://localhost:3000/api/kindshare/ngos/by-email?email=${user.email}`
      );

      if (!res.ok) {
        setNgoName("");
        return;
      }

      const data = await res.json();
      console.log("NGO API RESPONSE:", data);

      setNgoName(data?.ngoName || "");
    } catch (err) {
      console.error("Fetch NGO Error:", err);
      setNgoName("");
    } finally {
      setLoadingNgo(false);
    }
  };

  // Call after login
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    fetchNGO();
  }, [user?.email, isAuthenticated]);

  return (
    <div style={PAGE}>
      {/* Header */}
      <div style={HEADER}>
        <button style={BACK_BTN} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontSize: "22px", fontWeight: "900", color: "#fff" }}>
          Urban<span style={{ color: "#818cf8" }}>Flow</span>
        </span>
      </div>

      {/* Hero */}
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ color: "#fff" }}>KindShare</h1>
        <p style={{ color: "#a1a1aa" }}>
          Connect donors with NGOs seamlessly.
        </p>
      </div>

      {/* Main Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
        <button onClick={() => navigate("/kindshare/donor")}>
          <Package /> Donate
        </button>

        <button onClick={() => navigate("/kindshare/receiver")}>
          <Gift /> Receive
        </button>
      </div>

      {/* More Options */}
      <div style={{ marginBottom: "32px" }}>
        {ngoName ? (
          <button onClick={() => navigate("/kindshare/select-ngo")}>
            <Settings /> Already Registered NGO
          </button>
        ) : (
          <button onClick={() => navigate("/kindshare/register-ngo")}>
            <Building2 /> Register NGO
          </button>
        )}

        <button onClick={() => navigate("/kindshare/my-donations")}>
          <ClipboardList /> My Donations
        </button>

        <button onClick={() => navigate("/kindshare/receiver/my-requests")}>
          <FileText /> My Requests
        </button>
      </div>

      {/* Updated section for better NGO status management */}
      {!loadingNgo && !ngoName && (
        <div style={{ marginTop: "20px", padding: "16px", background: "rgba(129,140,248,0.1)", borderRadius: "12px", textAlign: "center" }}>
          <p style={{ color: "#818cf8", fontSize: "14px", margin: "0 0 12px 0" }}>Want to help others? Register your organization.</p>
          <button
            onClick={() => navigate("/kindshare/register-ngo")}
            style={{ background: "#818cf8", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
          >
            Get Started
          </button>
        </div>
      )}
    </div>
  );
}