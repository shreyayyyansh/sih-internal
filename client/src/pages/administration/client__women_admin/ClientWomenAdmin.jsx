import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import {
  ArrowLeft,
  LogOut,
  ShieldAlert,
  MapPin,
  AlertOctagon,
  Activity,
  Search,
  AlertTriangle,
  WifiOff
} from "lucide-react"
import { ref, onValue, off } from "firebase/database"
import { db } from "../../../firebase/firebase.js"
import { useAuthStore } from "../../../store/useAuthStore.js"

export default function ClientWomenAdmin() {
  const navigate = useNavigate()
  const { logout } = useAuth0()
  const { user: storedUser } = useAuthStore()

  const [activeSOSZones, setActiveSOSZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    // Listen to the active_sos root node (used by native SisterHood app)
    const activeSosRef = ref(db, 'active_sos')

    const listener = onValue(activeSosRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()

        const formattedZones = Object.entries(data).map(([geoHash6, usersInDistress]) => {
          const activeSOSCount = usersInDistress ? Object.keys(usersInDistress).length : 0;
          return {
            id: geoHash6,
            count: activeSOSCount,
            userIds: usersInDistress ? Object.keys(usersInDistress) : []
          }
        })

        // Sort by count descending (most active SOS first)
        formattedZones.sort((a, b) => b.count - a.count)
        setActiveSOSZones(formattedZones)
      } else {
        setActiveSOSZones([])
      }
      setLoading(false)
    })

    return () => off(activeSosRef, 'value', listener)
  }, [])

  const filteredZones = activeSOSZones.filter(zone =>
    zone.id.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const totalActiveSOS = activeSOSZones.reduce((acc, zone) => acc + zone.count, 0)
  const isSystemOnline = true // Firebase connection is active if this loads

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="sticky top-0 z-50 w-full h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/administration")}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center text-red-600 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900">
              Native SOS Command
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              Live Distress Monitor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full border border-slate-200 shadow-sm">
            <img
              src={storedUser?.picture || "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"}
              alt="Profile"
              className="w-8 h-8 rounded-full border border-slate-200"
            />
            <span className="text-sm font-bold text-slate-700">
              {storedUser?.name || "Administrator"}
            </span>
          </div>
          <button
            onClick={() => logout({ returnTo: window.location.origin })}
            className="h-11 w-11 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* TOP STATS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <MapPin className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 font-medium text-sm">Active Danger Zones</p>
              <h2 className="text-3xl font-black text-slate-900">{activeSOSZones.length}</h2>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-md shadow-red-100 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
              <AlertOctagon className="w-7 h-7" />
            </div>
            <div>
              <p className="text-red-600 font-bold text-sm">Active SOS Signals</p>
              <h2 className="text-3xl font-black text-red-700">{totalActiveSOS}</h2>
            </div>
          </div>
          {/* SYSTEM STATUS CARD */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 relative overflow-hidden">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center z-10 transition-colors duration-300
                  ${isSystemOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {isSystemOnline ? (
                <Activity className="w-7 h-7 animate-pulse" />
              ) : (
                <WifiOff className="w-7 h-7" />
              )}
            </div>
            <div className="z-10">
              <p className="text-slate-500 font-medium text-sm">Receiver Status</p>
              <h2 className={`text-lg font-bold flex items-center gap-2 transition-colors duration-300
                      ${isSystemOnline ? 'text-emerald-600' : 'text-slate-500'}`}>
                <span className={`w-2.5 h-2.5 rounded-full transition-colors duration-300
                          ${isSystemOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {isSystemOnline ? 'Listening' : 'Offline'}
              </h2>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Distress Zones (GeoHash 6)</h2>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search GeoHash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-300 w-full sm:w-64 transition-all"
            />
          </div>
        </div>

        {/* GRID OF LOCAL ROOMS */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-red-500 rounded-full animate-spin" />
            Scanning for SOS Signals...
          </div>
        ) : filteredZones.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">City is Safe</h3>
            <p className="text-slate-500">No active SOS distress signals detected in the network.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredZones.map((zone) => (
              <div
                key={zone.id}
                onClick={() => navigate(`/administration/client-women-admin/${zone.id}`)}
                className="group bg-white border-2 border-red-100 rounded-[1.5rem] p-6 shadow-md shadow-red-100/50 hover:shadow-xl hover:border-red-300 transition-all duration-300 cursor-pointer relative overflow-hidden"
              >
                {/* Header: Map Pin & Status */}
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 group-hover:bg-red-100 group-hover:text-red-700 transition-colors">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100 flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    SOS ACTIVE
                  </span>
                </div>

                {/* Body: Zone ID */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Zone GeoHash
                  </p>
                  <h3 className="text-xl font-black text-slate-800 font-mono tracking-tight mb-4 truncate" title={zone.id}>
                    {zone.id}
                  </h3>
                  {/* Footer: Count */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-black text-red-600">
                      {zone.count} {zone.count === 1 ? 'Person' : 'People'} in Danger
                    </span>
                  </div>
                </div>
                {/* Hover Effect Background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-red-50/0 via-transparent to-red-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
