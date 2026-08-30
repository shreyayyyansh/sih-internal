import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  MapPin, 
  Camera, 
  CheckCircle, 
  Navigation,
  LogOut,
  ArrowLeft,
  Timer,
  Loader,
  AlertTriangle,
  X,
  ShieldCheck,
  AlertOctagon,
  HardHat
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { getDatabase, ref, set, onDisconnect, remove } from "firebase/database";
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from "@react-google-maps/api";
import ngeohash from "ngeohash";
import { api } from "../../../lib/api"; 
import { useAuthStore } from "@/store/useAuthStore";

const libraries = ["places", "geometry"];
const mapContainerStyle = { width: "100%", height: "100dvh", touchAction: "none" };
const defaultCenter = { lat: 25.4358, lng: 81.8463 }; 
const INFRA_ICON = "https://cdn-icons-png.flaticon.com/512/3662/3662817.png"; // Construction/Infra icon
const ROUTE_COLOR = "#f59e0b"; // Amber/Orange for infrastructure

const db = getDatabase();

export default function InfraStaffDashboard() {
  const { logout, getAccessTokenSilently } = useAuth0();
  const user = useAuthStore((state) => state.user);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries
  });

  // --- STATE ---
  const [tasks, setTasks] = useState([]);
  const [recentlyResolved, setRecentlyResolved] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); 
  const [historyCount, setHistoryCount] = useState(0);

  // Navigation & Location
  const [currentLocation, setCurrentLocation] = useState(null);
  const [navMode, setNavMode] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [distanceText, setDistanceText] = useState("");
  const [durationText, setDurationText] = useState("");
  const [distanceMeters, setDistanceMeters] = useState(Infinity);
  
  // Upload & Verification
  const [uploadingId, setUploadingId] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null); 
  
  const mapRef = useRef(null);

  // --- HELPER: Distance Calculation ---
  const getDistanceToTarget = useCallback(() => {
    if (!currentLocation || !activeTask || !window.google) return Infinity;
    const staffLoc = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
    const targetLoc = new window.google.maps.LatLng(activeTask.location.lat, activeTask.location.lng);
    return window.google.maps.geometry.spherical.computeDistanceBetween(staffLoc, targetLoc);
  }, [currentLocation, activeTask]);

  useEffect(() => {
    if (navMode && currentLocation && activeTask) {
      const dist = getDistanceToTarget();
      setDistanceMeters(dist);
    }
  }, [currentLocation, navMode, activeTask, getDistanceToTarget]);

  // --- FETCH TASKS ---
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();
        
        if (activeTab === "active") {
            const [activeRes, historyRes] = await Promise.all([
                api.get("/api/staff/tasks/active", { headers: { Authorization: `Bearer ${token}` } }),
                api.get("/api/staff/tasks/history", { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const formattedTasks = activeRes.data.map(t => ({
                ...t,
                location: { ...t.location, lat: Number(t.location?.lat), lng: Number(t.location?.lng) }
            }));
            setTasks(formattedTasks);
            setHistoryCount(historyRes.data.length);
        } else {
            const res = await api.get("/api/staff/tasks/history", {
                headers: { Authorization: `Bearer ${token}` }
            });

            const formattedTasks = res.data.map(t => ({
                ...t,
                location: { ...t.location, lat: Number(t.location?.lat), lng: Number(t.location?.lng) }
            }));
            setTasks(formattedTasks);
            setHistoryCount(formattedTasks.length);
        }

      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchTasks();
  }, [user, activeTab, getAccessTokenSilently]);

  // --- REAL-TIME LOCATION TRACKING ---
  useEffect(() => {
    if (!user) return;
    let watchId = null;
    let currentRef = null;

    const updateLocation = (position) => {
      const { latitude, longitude } = position.coords;
      const newLoc = { lat: latitude, lng: longitude };
      setCurrentLocation(newLoc);

      const geohash = ngeohash.encode(latitude, longitude, 6);
      const sanitizedUserId = user.sub ? user.sub.replace('|', '_') : "anon";
      const path = `staff/infra/${geohash}/${sanitizedUserId}`;
      const userRef = ref(db, path);

      const staffData = {
        name: user.name || "Infra Technician",
        email: user.email,
        picture: user.picture,
        coords: newLoc,
        status: navMode ? "BUSY" : "ONLINE",
        lastSeen: Date.now()
      };

      if (currentRef && currentRef.toString() !== userRef.toString()) {
        remove(currentRef);
      }
      currentRef = userRef;

      set(userRef, staffData);
      onDisconnect(userRef).remove();
    };

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        updateLocation, 
        (err) => console.error("GPS Error:", err), 
        { enableHighAccuracy: true, distanceFilter: 5 } 
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (currentRef) remove(currentRef);
    };
  }, [user, navMode]);

  const handleStartNavigation = (task) => {
    if (!currentLocation) {
      alert("Waiting for GPS location...");
      return;
    }
    setActiveTask(task);
    setNavMode(true);
  };

  const calculateRoute = useCallback(() => {
    if (!currentLocation || !activeTask || !window.google) return;
    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: currentLocation,
        destination: activeTask.location,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirectionsResponse(result);
          setDistanceText(result.routes[0].legs[0].distance.text);
          setDurationText(result.routes[0].legs[0].duration.text);
        }
      }
    );
  }, [currentLocation, activeTask]);

  useEffect(() => {
    if (navMode && isLoaded && currentLocation && activeTask) {
      calculateRoute();
    }
  }, [navMode, isLoaded, currentLocation, activeTask, calculateRoute]);

  const exitNavigation = () => {
    setNavMode(false);
    setDirectionsResponse(null);
    setActiveTask(null);
    setDistanceMeters(Infinity);
  };

  const handleUploadProof = async (taskId, event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const taskToResolve = tasks.find(t => t.id === taskId);
    if (!taskToResolve) return;

    setUploadingId(taskId);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user?.id || "anonymous");
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });
      const cloudData = await cloudRes.json();
      const uploadedImageUrl = cloudData.secure_url;

      const token = await getAccessTokenSilently();
      const payload = {
        staffimageUrl: uploadedImageUrl,
        imageUrl: taskToResolve.imageUrl || taskToResolve.image,
        geohash: taskToResolve.zoneGeohash,
        id: taskToResolve.id,
        userId: taskToResolve.reporterEmail,
        assignedTo: taskToResolve.assignedTo,
        reportId: taskToResolve.reportId,
        reporterUserId: taskToResolve.reporterUserId
      };

      const res = await api.post("/api/staff/tasks/resolve", payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000
      });
      const { confidence, reasoning } = res.data.data;
      
      setTasks(prev => prev.filter(t => t.id !== taskId));
      const resolvedTask = {
        ...taskToResolve,
        status: "RESOLVED",
        completedAt: new Date().toISOString(),
        aiData: { confidence, reasoning }
      };
      setRecentlyResolved(prev => [resolvedTask, ...prev]);
      setHistoryCount(prev => prev + 1);

      setNavMode(false);
      setVerificationResult({
        success: true,
        title: "Work Verified!",
        message: reasoning || "The AI confirmed the infrastructure repair is complete.",
        confidence: confidence
      });

    } catch (error) {
      console.error("Resolve failed", error);
      setNavMode(false); 
      setVerificationResult({
        success: false,
        title: "Verification Failed",
        message: error.response?.data?.reasoning || "AI Verification failed.",
        confidence: 0
      });
    } finally {
      setUploadingId(null);
    }
  };

  const displayTasks = activeTab === 'active' ? tasks : [...recentlyResolved, ...tasks.filter(t => !recentlyResolved.some(r => r.id === t.id))];

  const VerificationModal = () => {
    if (!verificationResult) return null;
    const isSuccess = verificationResult.success;
    return (
      <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${isSuccess ? 'bg-amber-100' : 'bg-rose-100'}`}>
              {isSuccess ? <ShieldCheck className="w-10 h-10 text-amber-600" /> : <AlertOctagon className="w-10 h-10 text-rose-600" />}
            </div>
          </div>
          <h2 className={`text-2xl font-black text-center mb-2 ${isSuccess ? 'text-amber-800' : 'text-rose-800'}`}>{verificationResult.title}</h2>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
            <p className="text-slate-600 text-sm font-medium text-center leading-relaxed">"{verificationResult.message}"</p>
          </div>
          <button onClick={() => setVerificationResult(null)} className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg ${isSuccess ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900'}`}>
            {isSuccess ? "Continue Work" : "Try Again"}
          </button>
        </div>
      </div>
    );
  };

  if (navMode && isLoaded) {
    const isWithinRange = distanceMeters <= 50;
    return (
      <div className="fixed inset-0 z-[5000] bg-white h-[100dvh] w-full flex flex-col relative">
        <VerificationModal />
        <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-safe bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto mt-2">
            <button onClick={exitNavigation} className="bg-white p-2.5 rounded-full shadow-lg active:scale-95 transition-transform">
              <ArrowLeft className="w-6 h-6 text-slate-800" />
            </button>
            <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 text-sm leading-tight">Navigating to Project Site</h3>
              <p className="text-xs text-slate-500 truncate">{activeTask?.address}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 w-full h-full relative">
          <GoogleMap
            center={currentLocation || defaultCenter}
            zoom={18}
            mapContainerStyle={mapContainerStyle}
            options={{ zoomControl: false, streetViewControl: false, mapTypeControl: false, fullscreenControl: false, heading: 0, gestureHandling: "greedy" }}
          >
            {directionsResponse && <DirectionsRenderer directions={directionsResponse} options={{ suppressMarkers: true, polylineOptions: { strokeColor: ROUTE_COLOR, strokeWeight: 6 } }} />}
            {currentLocation && <Marker position={currentLocation} icon={{ url: INFRA_ICON, scaledSize: new window.google.maps.Size(60, 60), anchor: new window.google.maps.Point(30, 30) }} zIndex={100} />}
            {activeTask && <Marker position={activeTask.location} />}
          </GoogleMap>
        </div>
        <div className="absolute bottom-6 left-4 right-4 z-10 pb-safe">
          <div className="bg-white rounded-2xl shadow-2xl p-5 border border-slate-100">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Estimated Arrival</p>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-3xl font-black text-slate-800">{durationText || "--"}</h2>
                  <span className="text-slate-500 font-medium">({distanceText || "--"})</span>
                </div>
              </div>
              <div className="bg-amber-100 p-3 rounded-full animate-pulse"><Timer className="w-6 h-6 text-amber-600" /></div>
            </div>
            <label className={`w-full py-4 rounded-xl shadow-lg transition-all flex flex-col items-center justify-center relative overflow-hidden cursor-pointer ${!isWithinRange ? "bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200" : "bg-amber-600 text-white shadow-amber-500/30"}`}>
              {uploadingId === activeTask?.id ? <span className="flex items-center gap-2 font-bold animate-pulse"><Loader className="w-5 h-5 animate-spin" /> Verifying Repaired Asset...</span> : !isWithinRange ? <><span className="flex items-center gap-2 font-bold text-sm"><AlertTriangle className="w-4 h-4" /> Move Closer</span><span className="text-[10px] font-bold mt-1 opacity-70">{Math.round(distanceMeters - 50)}m to project</span></> : <span className="flex items-center gap-2 font-bold text-lg"><Camera className="w-5 h-5" /> Capture Resolved Site</span>}
              <input type="file" accept="image/*" className="hidden" disabled={!isWithinRange || uploadingId === activeTask?.id} onChange={(e) => handleUploadProof(activeTask.id, e)} />
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-slate-200">
      <VerificationModal />

      <div className="bg-slate-900 text-white p-6 rounded-b-[2rem] shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Infrastructure Ops</p>
            <h1 className="text-2xl font-black">{user?.name || "Infra Specialist"}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"/>
              <span className="text-xs font-bold text-amber-400 uppercase">Live Tracking Enabled</span>
            </div>
          </div>
          <button onClick={() => logout()} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700">
            <LogOut className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex gap-4">
          <div className="bg-slate-800/50 flex-1 p-3 rounded-xl border border-slate-700 backdrop-blur-sm">
            <span className="text-2xl font-black text-white block">{activeTab === 'active' ? tasks.length : '-'}</span>
            <span className="text-[10px] text-slate-400 uppercase font-bold">Planned</span>
          </div>
          <div className="bg-slate-800/50 flex-1 p-3 rounded-xl border border-slate-700 backdrop-blur-sm">
             <span className="text-2xl font-black text-amber-400 block">{historyCount}</span>
             <span className="text-[10px] text-slate-400 uppercase font-bold">Fixed Today</span>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 flex gap-6 border-b border-slate-200">
        <button onClick={() => setActiveTab("active")} className={`pb-3 text-sm font-bold relative ${activeTab === "active" ? "text-slate-900" : "text-slate-400"}`}>
          Maintenance List
          {activeTab === "active" && <span className="absolute bottom-0 left-0 w-full h-1 bg-amber-600 rounded-t-full" />}
        </button>
        <button onClick={() => setActiveTab("history")} className={`pb-3 text-sm font-bold relative ${activeTab === "history" ? "text-slate-900" : "text-slate-400"}`}>
          Project History
          {activeTab === "history" && <span className="absolute bottom-0 left-0 w-full h-1 bg-amber-600 rounded-t-full" />}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {loading ? (
           <div className="text-center py-10 text-slate-400">
             <Loader className="w-6 h-6 animate-spin mx-auto mb-2"/>
             <p className="text-sm font-bold">Syncing project data...</p>
           </div>
        ) : displayTasks.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <HardHat className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">{activeTab === 'active' ? "Infrastructure is stable!" : "No project history."}</p>
          </div>
        ) : (
          displayTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider ${task.severity === 'CRITICAL' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {task.priority || "NORMAL"}
              </div>
              <div className="flex gap-4 mb-4">
                <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  {task.image || task.imageUrl ? <img src={task.image || task.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Camera className="w-6 h-6" /></div>}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight mb-1">{task.title}</h3>
                  <div className="flex items-start gap-1 text-slate-500 text-xs mb-2">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{task?.address || "No Address Provided"}</span>
                  </div>
                  {(activeTab === 'history' || task.status === 'RESOLVED') && task.aiData && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-[10px] text-amber-700 font-medium"> <span className="font-bold">AI Note:</span> {task.aiData.reasoning} </p>
                    </div>
                  )}
                </div>
              </div>
              {activeTab === 'active' && (
                <button onClick={() => handleStartNavigation(task)} className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-lg shadow-amber-100">
                  <Navigation className="w-4 h-4" /> Open Navigation
                </button>
              )}
              {(activeTab === 'history' || task.status === 'RESOLVED') && (
                <div className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center gap-2 text-xs font-bold">
                  <CheckCircle className="w-4 h-4" /> Completed
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}