import { useEffect, useState } from "react";
import { ref, set, serverTimestamp } from "firebase/database";
import { api } from "../../../lib/api.js";
import { useNavigate } from "react-router-dom";

import { db } from "../../../firebase/firebase.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useAuth0 } from "@auth0/auth0-react";

import JobCreate from "./JobCreate";
import JobList from "./JobList";
import MyJobs from "./MyJobs";
import JobChat from "./JobChat";
import JobsMap from "./JobsMap";

import { Button } from "../../../ui/button";
import { ArrowLeft, Briefcase, Map as MapIcon, List, MessageSquare, MapPin, AlertCircle } from "lucide-react";

import FloatingLines from "../../../ui/FloatingLines";
import { JOBS_FEATURE } from "./config";

const CATEGORIES = ['Movers', 'Carpenter', 'Plumber', 'Electrician', 'Masonry', 'Cleaners'];

export default function JobsPage() {
  const { user } = useAuthStore();
  const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  const feature = JOBS_FEATURE || {
    title: "Jobs",
    description: "Find nearby work",
    icon: Briefcase
  };

  /* ---------------- STATE ---------------- */
  const [activeTab, setActiveTab] = useState("ALL");
  const [mobileTab, setMobileTab] = useState("map");

  const [jobs, setJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Worker Profile State
  const [userProfile, setUserProfile] = useState(null);
  const [showWorkerPrompt, setShowWorkerPrompt] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [selectedWorkerCategory, setSelectedWorkerCategory] = useState('');

  /* ---------------- LOCATION ---------------- */
  const requestLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
        });
      });
      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (err) {
      console.error("Location denied", err);
      alert("Location access is required to view nearby jobs.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSkip = () => navigate("/dashboard");

  /* ---------------- DATA FETCHING ---------------- */
  const fetchJobs = async () => {
    if (!userLocation) return;
    try {
      const res = await api.get("/api/jobs/nearby", {
        params: { lat: userLocation.lat, lng: userLocation.lng },
      });
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    }
  };

  const fetchMyJobs = async () => {
    if (!user) return;
    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });
      const res = await api.get("/api/jobs/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyJobs(res.data.jobs || []);
    } catch (err) {
      console.error("Error fetching my jobs:", err);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });
      const res = await api.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data.profile;
      setUserProfile(data);
      if (data.hasSeenWorkerPrompt === false) {
        setShowWorkerPrompt(true);
      }
    } catch (err) {
      console.error('Error fetching user profile', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (userLocation) fetchJobs();
  }, [userLocation]);

  useEffect(() => {
    if (user?.sub) {
      fetchMyJobs();
      fetchUserProfile();
    } else {
      setIsLoadingProfile(false);
    }
  }, [user]);

  /* ---------------- WORKER INTEREST ---------------- */
  const setWorkerInterest = async (isInterested) => {
    if (isInterested && !selectedWorkerCategory) {
      alert('Please choose your work category before signing up.');
      return;
    }
    setShowWorkerPrompt(false);
    try {
      const payload = { interestedToWork: isInterested };
      if (isInterested && selectedWorkerCategory) {
        payload.workerCategory = selectedWorkerCategory;
      }
      const token = await getAccessTokenSilently({
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      });
      await api.patch('/api/user/worker-interest', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserProfile(prev => ({
        ...prev,
        interestedToWork: isInterested,
        hasSeenWorkerPrompt: true,
        ...(isInterested && selectedWorkerCategory ? { workerCategory: selectedWorkerCategory } : {})
      }));
      if (isInterested) {
        alert(`Worker profile active! You will now see ${selectedWorkerCategory} job listings.`);
      }
    } catch (error) {
      console.error('Error updating worker status:', error);
      alert('Failed to update your preference.');
    }
  };

  /* ---------------- ACTIONS ---------------- */
  const selectJobAndJoin = async (job, selectedWorker = null) => {
    let employerId = job.employerId;
    if (!employerId) employerId = user?.sub;

    const workerId = selectedWorker ? selectedWorker.id : user?.sub;

    // Sort to create consistent room name regardless of who initiates
    const participants = [String(employerId), String(workerId)].sort();
    const chatRoomSuffix = `${participants[0]}_${participants[1]}`;
    const chatRoomId = `${job.id}_chat_${chatRoomSuffix}`;

    setSelectedJob({ ...job, chatRoomId });

    // Auto-switch to chat view on mobile when a job is selected
    if (window.innerWidth < 1024) {
      setMobileTab("chat");
    }

    if (!user) return;

    try {
      await set(ref(db, `jobs/rooms/${chatRoomId}/members/${user.sub}`), {
        joinedAt: serverTimestamp(),
        userName: user.name || "Anonymous",
        userImage: user.picture || "",
      });
    } catch (err) {
      console.error("Failed to join job room:", err);
    }
  };

  /* ---------------- FILTERED JOBS ---------------- */
  const filteredJobs = userProfile?.interestedToWork && userProfile?.workerCategory
    ? jobs.filter(j => j.category === userProfile.workerCategory)
    : jobs;

  /* ---------------- LOCATION GATE (GLASS THEME) ---------------- */
  if (!userLocation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 md:px-6 relative z-10 bg-slate-950 overflow-hidden font-sans">
        <div className="absolute inset-0 z-0 opacity-50 pointer-events-none">
          <FloatingLines />
        </div>

        <div className="max-w-md w-full space-y-8 bg-white/5 p-6 md:p-8 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative z-10">
          <div className="flex justify-center">
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]">
              <MapPin className="h-8 w-8 md:h-10 md:w-10 text-white drop-shadow-glow" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight drop-shadow-sm">Enable Location</h1>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 backdrop-blur-md">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5 drop-shadow-sm" />
              <div>
                <p className="text-white text-sm font-semibold">Local Jobs</p>
                <p className="text-zinc-300 text-xs mt-1 leading-normal">
                  We need your location to show verified gigs and opportunities near you.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={requestLocation}
              disabled={isLoadingLocation}
              className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-6 text-lg rounded-2xl backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:scale-[1.02]"
            >
              {isLoadingLocation ? "Detecting..." : "Allow Access"}
            </Button>

            <button
              onClick={handleSkip}
              className="w-full text-zinc-400 hover:text-white text-sm font-medium py-2 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <div className="relative h-screen w-screen bg-slate-950 flex flex-col overflow-hidden font-sans">

      {/* GLOBAL BACKGROUND: Floating Lines */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <FloatingLines />
      </div>

      {/* HEADER */}
      <header className="relative z-50 w-full h-16 px-4 md:px-6 flex items-center justify-between bg-black/20 backdrop-blur-xl border-b border-white/10 shrink-0 overflow-hidden shadow-sm">
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <div className="w-full h-full scale-150 origin-top">
            <FloatingLines />
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white drop-shadow-sm">
              Urban<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">Flow</span>
            </h1>
          </div>
        </div>

        {/* Worker Toggle */}
        <button
          onClick={() => {
            if (userProfile?.interestedToWork) {
              setWorkerInterest(false);
            } else {
              setShowWorkerPrompt(true);
            }
          }}
          className={`relative z-10 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${userProfile?.interestedToWork
            ? "bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
            : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
            }`}
        >
          {userProfile?.interestedToWork ? "Worker On" : "Worker Off"}
        </button>
      </header>

      {/* WORKER PROMPT MODAL */}
      {showWorkerPrompt && (
        <div className="absolute inset-0 z-[999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 rounded-3xl p-8 border border-white/10 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to StreetGig!</h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Choose your work category and sign up as a worker, or just post jobs.
              </p>
            </div>

            <div className="text-left">
              <p className="text-zinc-300 text-xs font-semibold mb-3">Select your skill:</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedWorkerCategory(cat)}
                    className={`px-4 py-2.5 rounded-full text-xs font-medium border transition-all duration-200 ${selectedWorkerCategory === cat
                      ? "bg-blue-500/25 border-blue-500/50 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                      : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => setWorkerInterest(true)}
                className={`w-full py-3.5 rounded-xl font-bold text-white transition-all ${selectedWorkerCategory
                  ? "bg-blue-600 hover:bg-blue-500"
                  : "bg-blue-600/30 cursor-not-allowed"
                  }`}
              >
                Yes, Sign Me Up as Worker
              </button>
              <button
                onClick={() => setWorkerInterest(false)}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                No, Only Posting Jobs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden relative z-10">

        {/* --- LEFT PANEL: LISTS --- */}
        <div className={`
            absolute inset-0 lg:static lg:w-96 flex flex-col 
            bg-slate-950/90 lg:bg-black/20 backdrop-blur-3xl lg:backdrop-blur-xl
            border-r border-white/10 z-30 lg:z-20 transition-transform duration-300
            ${mobileTab === 'list' ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
            <FloatingLines />
          </div>

          <div className="p-6 z-10">
            <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-md">StreetGig</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Find verified local job opportunities.
            </p>
          </div>

          <div className="px-4 pb-4 border-b border-white/10 flex gap-2 z-10">
            {["ALL", "MY", "CREATE"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border backdrop-blur-md ${activeTab === tab
                  ? "bg-white/10 text-white border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  : "bg-transparent text-zinc-500 border-transparent hover:bg-white/5 hover:text-zinc-300"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10 pb-28 lg:pb-4">
            {activeTab === "CREATE" && <JobCreate onCreated={fetchJobs} location={userLocation} />}
            {activeTab === "ALL" && (
              userProfile?.interestedToWork ? (
                <JobList jobs={filteredJobs} onSelect={selectJobAndJoin} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <Briefcase className="h-8 w-8 text-zinc-600" />
                  </div>
                  <h3 className="text-white text-lg font-bold mb-2">Worker Profile Inactive</h3>
                  <p className="text-zinc-400 text-sm mb-6">You must register as a worker to browse local gig opportunities.</p>
                  <button
                    onClick={() => setShowWorkerPrompt(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-all"
                  >
                    Become a Worker
                  </button>
                </div>
              )
            )}
            {activeTab === "MY" && <MyJobs jobs={myJobs} onSelect={selectJobAndJoin} onUpdate={fetchMyJobs} />}
          </div>
        </div>

        {/* --- CENTER PANEL: MAP --- */}
        <div className="flex-1 relative w-full h-full z-10">
          <JobsMap
            jobs={jobs}
            selectedJob={selectedJob}
            onSelect={selectJobAndJoin}
            userLocation={userLocation}
          />
        </div>

        {/* --- RIGHT PANEL: CHAT --- */}
        <div className={`
            absolute inset-0 lg:static lg:w-[420px] flex flex-col 
            bg-slate-950/90 lg:bg-black/20 backdrop-blur-3xl lg:backdrop-blur-xl
            border-l border-white/10 z-30 lg:z-20 transition-transform duration-300
            ${mobileTab === 'chat' ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            pb-24 lg:pb-0 
        `}>

          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden lg:hidden">
            <FloatingLines />
          </div>

          {selectedJob ? (
            <JobChat job={selectedJob} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center relative z-10">
              <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
                <Briefcase className="h-8 w-8 opacity-40" />
              </div>
              <p className="text-sm font-medium">Select a job to view details & chat</p>

              <button
                onClick={() => setMobileTab('map')}
                className="mt-6 lg:hidden px-6 py-2 rounded-full bg-white/10 border border-white/10 text-white text-sm font-bold"
              >
                Browse Jobs on Map
              </button>
            </div>
          )}
        </div>

        {/* --- MOBILE BOTTOM NAVIGATION PILL --- */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 lg:hidden w-auto pointer-events-none">
          <div className="flex items-center bg-black/40 border border-white/20 rounded-full p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-3xl pointer-events-auto">
            <button
              onClick={() => setMobileTab("list")}
              className={`
                 flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all duration-300
                 ${mobileTab === "list"
                  ? "bg-purple-500/30 text-purple-100 border border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"}
               `}
            >
              <List className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMobileTab("map")}
              className={`
                 flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all duration-300
                 ${mobileTab === "map"
                  ? "bg-white/20 text-white border border-white/20 shadow-[inset_0_0_15px_rgba(255,255,255,0.1)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"}
               `}
            >
              <MapIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => setMobileTab("chat")}
              className={`
                 flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all duration-300
                 ${mobileTab === "chat"
                  ? "bg-blue-500/30 text-blue-100 border border-blue-400/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"}
               `}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}