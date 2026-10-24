import React, { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  AlertOctagon,
  Activity,
  Users,
  ShieldAlert,
  Clock,
  Mic,
  Play,
  Pause,
  CheckCircle,
  Volume2,
  Smartphone,
  Monitor,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { ref, onValue, off, update } from "firebase/database"
import { db } from "../../../firebase/firebase.js"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api"

const libraries = ["places"]
const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "1.5rem" }

export default function ClientWomenZone() {
  const { geohashId } = useParams()
  const navigate = useNavigate()

  const [activeUsers, setActiveUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)

  // All voice alerts from RTDB
  const [voiceAlerts, setVoiceAlerts] = useState([])
  const [playingId, setPlayingId] = useState(null)
  const [audioElements, setAudioElements] = useState({})
  const [expandedTranscript, setExpandedTranscript] = useState(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  })

  // 1. Fetch active SOS signals from RTDB for this geohash6 zone
  useEffect(() => {
    if (!geohashId) return
    const zoneRef = ref(db, `active_sos/${geohashId}`)
    const listener = onValue(zoneRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const usersList = Object.entries(data).map(([userId, info]) => ({
          id: userId,
          lat: info.lat,
          lng: info.lng,
          picture: info.picture,
          timestamp: info.timestamp
        }))
        usersList.sort((a, b) => b.timestamp - a.timestamp)
        setActiveUsers(usersList)
      } else {
        setActiveUsers([])
      }
      setLoading(false)
    })
    return () => off(zoneRef, 'value', listener)
  }, [geohashId])

  // 2. Fetch ALL voice alerts from RTDB (both web client & native)
  // Web client stores in RTDB voice_alerts/{key}, native uploads to Cloudinary then Firestore
  // but the server also could store in RTDB — we read all and sort newest first
  useEffect(() => {
    const voiceRef = ref(db, 'voice_alerts')
    const listener = onValue(voiceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        // Flatten all entries, sort by timestamp desc
        const alerts = Object.entries(data).map(([key, val]) => ({
          rtdbKey: key,
          ...val
        }))
        alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        setVoiceAlerts(alerts)
      } else {
        setVoiceAlerts([])
      }
    })
    return () => off(voiceRef, 'value', listener)
  }, [])

  const getMapCenter = useCallback(() => {
    if (activeUsers.length > 0) {
      return { lat: activeUsers[0].lat, lng: activeUsers[0].lng }
    }
    return { lat: 20.5937, lng: 78.9629 }
  }, [activeUsers])

  const timeAgo = (timestamp) => {
    const date = new Date(timestamp)
    const seconds = Math.floor((new Date() - date) / 1000)
    let interval = seconds / 31536000
    if (interval > 1) return Math.floor(interval) + "y ago"
    interval = seconds / 2592000
    if (interval > 1) return Math.floor(interval) + "mo ago"
    interval = seconds / 86400
    if (interval > 1) return Math.floor(interval) + "d ago"
    interval = seconds / 3600
    if (interval > 1) return Math.floor(interval) + "h ago"
    interval = seconds / 60
    if (interval > 1) return Math.floor(interval) + "m ago"
    return Math.floor(seconds) + "s ago"
  }

  const handlePlayPause = async (alert) => {
    if (playingId === alert.rtdbKey) {
      audioElements[alert.rtdbKey]?.pause()
      setPlayingId(null)
      return
    }
    if (playingId && audioElements[playingId]) {
      audioElements[playingId].pause()
    }

    let audio = audioElements[alert.rtdbKey]
    if (!audio) {
      audio = new Audio(alert.audioUrl)
      audio.addEventListener('ended', () => setPlayingId(null))
      setAudioElements(prev => ({ ...prev, [alert.rtdbKey]: audio }))
    }

    audio.play()
    setPlayingId(alert.rtdbKey)

    // Mark as listened in RTDB
    if (!alert.isListened) {
      try {
        await update(ref(db, `voice_alerts/${alert.rtdbKey}`), { isListened: true })
      } catch (e) {
        console.error("Failed to mark as listened:", e)
      }
    }
  }

  // Detect recording source: native app uses roomId='SISTERHOOD_NATIVE_SOS'
  const getSource = (alert) =>
    alert.roomId === 'SISTERHOOD_NATIVE_SOS' ? 'native' : 'web'

  const unheardCount = voiceAlerts.filter(a => !a.isListened).length

  const URGENCY_STYLES = {
    LOW: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
    MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
    HIGH: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    CRITICAL: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/administration/client-women-admin")}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center text-red-600 shadow-sm">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 font-mono">
              Zone: {geohashId}
            </h1>
            <p className="text-[10px] text-red-500 font-bold tracking-widest uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live SOS Tracking
            </p>
          </div>
        </div>

        {unheardCount > 0 && (
          <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
            <Mic className="w-4 h-4" />
            <span className="text-sm font-bold">{unheardCount} Unheard Voice SOS</span>
          </div>
        )}
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-screen-2xl mx-auto w-full">
        {/* TOP STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 font-medium text-xs">Active Signals</p>
              <h2 className="text-2xl font-black text-slate-900">{activeUsers.length}</h2>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 font-medium text-xs">Voice Recordings</p>
              <h2 className="text-2xl font-black text-slate-900">{voiceAlerts.length}</h2>
            </div>
          </div>
          <div className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${unheardCount > 0 ? 'border-orange-200 shadow-orange-100' : 'border-slate-200'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${unheardCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Volume2 className={`w-6 h-6 ${unheardCount > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <p className={`font-bold text-xs ${unheardCount > 0 ? 'text-orange-600' : 'text-slate-500'}`}>Unheard Alerts</p>
              <h2 className={`text-2xl font-black ${unheardCount > 0 ? 'text-orange-700' : 'text-slate-900'}`}>{unheardCount}</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Active SOS Users */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: '480px' }}>
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Active Signals</h3>
                <div className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Live
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center h-32 text-slate-400">
                    <Activity className="w-5 h-5 animate-spin mr-2" /> Loading...
                  </div>
                ) : activeUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <ShieldAlert className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold text-slate-600">Zone Cleared</p>
                  </div>
                ) : (
                  activeUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="w-full text-left bg-white border-2 border-red-50 hover:border-red-200 rounded-xl p-3 transition-all hover:shadow-md flex gap-3 items-center focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-red-100 shrink-0">
                        <img
                          src={user.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                          alt="User"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{user.id}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-medium">
                          <span className="text-red-500 flex items-center gap-1">
                            <AlertOctagon className="w-3 h-3" /> SOS Active
                          </span>
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {timeAgo(user.timestamp)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Map + Voice Recordings */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* MAP */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-4 h-[340px] overflow-hidden relative">
              {loading || !isLoaded ? (
                <div className="w-full h-full bg-slate-100 rounded-[1.5rem] flex items-center justify-center">
                  <Activity className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              ) : loadError ? (
                <div className="w-full h-full bg-rose-50 rounded-[1.5rem] flex items-center justify-center text-rose-600">
                  Failed to load maps
                </div>
              ) : (
                <div className="w-full h-full rounded-[1.5rem] overflow-hidden shadow-inner">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={selectedUser ? { lat: selectedUser.lat, lng: selectedUser.lng } : getMapCenter()}
                    zoom={15}
                    options={{
                      zoomControl: true,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: true,
                      styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                    }}
                  >
                    {activeUsers.map(user => (
                      <Marker
                        key={user.id}
                        position={{ lat: user.lat, lng: user.lng }}
                        onClick={() => setSelectedUser(user)}
                        icon={{
                          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="20" cy="20" r="18" fill="red" fill-opacity="0.2"/>
                              <circle cx="20" cy="20" r="10" fill="red" stroke="white" stroke-width="2"/>
                            </svg>`),
                          scaledSize: new window.google.maps.Size(40, 40),
                          anchor: new window.google.maps.Point(20, 20),
                        }}
                        animation={window.google.maps.Animation.DROP}
                      />
                    ))}
                    {selectedUser && (
                      <InfoWindow
                        position={{ lat: selectedUser.lat, lng: selectedUser.lng }}
                        onCloseClick={() => setSelectedUser(null)}
                        options={{ pixelOffset: new window.google.maps.Size(0, -15) }}
                      >
                        <div className="p-1 max-w-[200px]">
                          <div className="flex items-center gap-3 mb-2">
                            <img
                              src={selectedUser.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.id}`}
                              alt="Profile"
                              className="w-8 h-8 rounded-full border border-red-200"
                            />
                            <p className="font-bold text-sm text-slate-900 truncate m-0">{selectedUser.id}</p>
                          </div>
                          <p className="text-red-600 font-bold text-xs m-0 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Active SOS — {timeAgo(selectedUser.timestamp)}
                          </p>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </div>
              )}
            </div>

            {/* VOICE RECORDINGS PANEL */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-violet-600" />
                  <h3 className="font-bold text-slate-800">Voice SOS Recordings</h3>
                </div>
                <div className="flex items-center gap-2">
                  {unheardCount > 0 && (
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
                      {unheardCount} new
                    </span>
                  )}
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full">
                    {voiceAlerts.length} total
                  </span>
                </div>
              </div>

              <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: '340px' }}>
                {voiceAlerts.length === 0 ? (
                  <div className="text-center py-10">
                    <Mic className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-500">No voice recordings yet</p>
                    <p className="text-xs text-slate-400 mt-1">Recordings will appear here in real-time.</p>
                  </div>
                ) : (
                  voiceAlerts.map((alert) => {
                    const isPlaying = playingId === alert.rtdbKey
                    const source = getSource(alert)
                    const analysis = alert.analysis
                    const uStyle = analysis ? (URGENCY_STYLES[analysis.urgency] || URGENCY_STYLES.LOW) : null
                    return (
                      <div
                        key={alert.rtdbKey}
                        className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                          !alert.isListened
                            ? 'bg-red-50 border-red-200 shadow-sm'
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        {/* Top row: Avatar + Info + Controls */}
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 shrink-0">
                            <img
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${alert.userId}`}
                              alt="User"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 truncate max-w-[160px]">
                                {alert.userName || alert.userId}
                              </span>
                              {!alert.isListened && (
                                <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full shrink-0">
                                  NEW
                                </span>
                              )}
                              {/* Source badge */}
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0 ${
                                source === 'native'
                                  ? 'bg-violet-100 text-violet-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {source === 'native'
                                  ? <><Smartphone className="w-2.5 h-2.5" /> Native</>
                                  : <><Monitor className="w-2.5 h-2.5" /> Web</>
                                }
                              </span>
                              {/* Urgency badge */}
                              {analysis && (
                                <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${uStyle.bg} ${uStyle.text}`}>
                                  {analysis.urgency}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(alert.timestamp)}
                              </span>
                              {alert.location && (
                                <span className="font-mono">
                                  {Number(alert.location.lat).toFixed(4)}°, {Number(alert.location.lng).toFixed(4)}°
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Play / Pause */}
                          <div className="flex items-center gap-2 shrink-0">
                            {alert.isListened && !isPlaying && (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            )}
                            <button
                              onClick={() => handlePlayPause(alert)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow ${
                                isPlaying
                                  ? 'bg-red-500 text-white shadow-red-200 scale-110'
                                  : !alert.isListened
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {isPlaying
                                ? <Pause className="w-4 h-4" />
                                : <Play className="w-4 h-4 ml-0.5" />
                              }
                            </button>
                          </div>
                        </div>

                        {/* AI Analysis Section */}
                        {analysis ? (
                          <div className={`mt-3 p-3 rounded-xl border ${uStyle.border} bg-white`}>
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-bold text-slate-700 mb-1">AI Summary</p>
                                <p className="text-[13px] text-slate-600 leading-relaxed">{analysis.summary}</p>
                              </div>
                            </div>

                            {/* Pattern Analysis */}
                            {analysis.pattern && (
                              <div className="mt-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
                                <p className="text-[11px] font-bold text-amber-700">
                                  📊 Pattern: <span className="font-medium">{analysis.pattern}</span>
                                </p>
                              </div>
                            )}

                            {/* Action Items */}
                            {analysis.actionItems && analysis.actionItems.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide">⚡ Recommended Actions</p>
                                {analysis.actionItems.map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-2 pl-1">
                                    <span className="text-[10px] mt-0.5 text-slate-300">▸</span>
                                    <p className="text-[12px] text-slate-600">{item}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {analysis.transcript && (
                              <button
                                onClick={() => setExpandedTranscript(expandedTranscript === alert.rtdbKey ? null : alert.rtdbKey)}
                                className="mt-2 flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {expandedTranscript === alert.rtdbKey ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {expandedTranscript === alert.rtdbKey ? 'Hide' : 'Show'} Transcript
                              </button>
                            )}
                            {expandedTranscript === alert.rtdbKey && (
                              <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500 italic leading-relaxed">"{analysis.transcript}"</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="font-medium">AI analyzing audio...</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
