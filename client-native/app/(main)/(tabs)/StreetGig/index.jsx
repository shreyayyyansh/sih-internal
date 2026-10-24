import * as Location from 'expo-location';
import { router } from 'expo-router';
import { ref as dbRef, serverTimestamp, update } from 'firebase/database';
import { ArrowLeft, Briefcase, Clock, GraduationCap, List, MessageSquare } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';
import { api } from '../../../../lib/api';
import { db } from '../../../../lib/firebase';
import { useAuthStore } from '../../../../store/useAuthStore';

import ConversationsWrapper from './ConversationsWrapper';
import JobChat from './JobChat';
import JobCreate from './JobCreate';
import JobList from './JobList';
import LearningSchemesModal from './LearningSchemesModal';
import MyJobs from './MyJobs';
import WorkerPrompt from './WorkerPrompt';

export default function StreetGigIndex() {
  const { user } = useAuthStore();
  const { getCredentials } = useAuth0();

  const [activeTab, setActiveTab] = useState('ALL');
  const [mobileTab, setMobileTab] = useState('list');

  const [userProfile, setUserProfile] = useState(null);
  const [showWorkerPrompt, setShowWorkerPrompt] = useState(false);
  const [showLearningSchemes, setShowLearningSchemes] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [selectedWorkerCategory, setSelectedWorkerCategory] = useState('');

  const CATEGORIES = [
    'Movers', 'Carpenter', 'Plumber', 'Electrician', 'Masonry', 'Cleaners',
    'Painters', 'Mechanic', 'Gardening', 'AC Repair', 'Tech Support', 'Tailor',
    'Beauty & Salon', 'Delivery', 'Photography', 'House Sitting',
    'Civil Work', 'Flooring', 'Roofing', 'Welding', 'Scaffolding',
    'Security', 'Janitorial Services', 'Maintenance', 'BMS Operator',
    'Pest Control', 'Deep Cleaning', 'Home Renovation', 'Appliance Repair', 'Interior Design'
  ].sort();

  const TIME_SLOTS = [
    'Quick (< 1 hr)',
    '1-2 Hours',
    'Half Day (4 hrs)',
    'Full Day (8 hrs)',
    'Next 24 Hours',
    'Flexible'
  ];

  const [timeFilter, setTimeFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState('');

  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  /* ------------ LOCATION ------------ */
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const request = await Location.requestForegroundPermissionsAsync();
          status = request.status;
        }
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
        }
      } catch (err) {
        console.error('Error getting location', err);
      }
    })();
  }, []);

  /* ------------ DATA FETCHING ------------ */
  const fetchJobs = async () => {
    if (!userLocation) return;
    setIsLoadingJobs(true);
    try {
      const res = await api.get('/api/jobs/nearby', { params: { lat: userLocation.lat, lng: userLocation.lng } });
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!user || !userLocation) return;
    setIsLoadingJobs(true);
    try {
      const credentials = await getCredentials();
      if (!credentials) { setIsLoadingJobs(false); return; }
      const res = await api.get('/api/jobs/recommendations', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
        params: {
          lat: userLocation.lat,
          lng: userLocation.lng,
          time: timeFilter,
          minPrice: minPriceFilter
        }
      });
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const loadJobs = () => {
    if (userProfile?.interestedToWork) {
      fetchRecommendations();
    } else {
      fetchJobs();
    }
  };

  const fetchMyJobs = async () => {
    if (!user) return;
    try {
      const credentials = await getCredentials();
      if (!credentials) return;
      const res = await api.get('/api/jobs/my', { headers: { Authorization: `Bearer ${credentials.accessToken}` } });
      setMyJobs(res.data.jobs || []);
    } catch (err) {
      console.error('Error fetching my jobs:', err);
    }
  };

  useEffect(() => {
    if (userLocation && !isLoadingProfile) {
      loadJobs();
    }
  }, [userLocation, isLoadingProfile, userProfile?.interestedToWork, timeFilter, minPriceFilter]);
  useEffect(() => {
    if (user?.sub) {
      fetchMyJobs();
      fetchUserProfile();
    } else {
      setIsLoadingProfile(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/api/user/profile');
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

  const handleToggleWorker = async () => {
    if (!userProfile) return;
    const newStatus = !userProfile.interestedToWork;

    if (newStatus && (!userProfile.workerCategories || userProfile.workerCategories.length === 0)) {
      // Trying to turn ON but no category -> show prompt
      setShowWorkerPrompt(true);
      return;
    }

    try {
      // just toggle interestedToWork, backend handles not overriding data
      await api.patch('/api/user/worker-interest', { interestedToWork: newStatus });
      setUserProfile(prev => ({
        ...prev,
        interestedToWork: newStatus,
      }));

      if (newStatus) {
        Alert.alert('Worker Profile Active', 'Worker mode ON. Visible for jobs.');
      } else {
        Alert.alert('Worker Profile Inactive', 'Worker mode OFF.');
      }
    } catch (error) {
      console.error('Error toggling worker status:', error);
      Alert.alert('Error', 'Failed to update your preference.');
    }
  };

  const handleSaveWorkerProfile = async (data) => {
    setShowWorkerPrompt(false);
    try {
      const payload = {
        interestedToWork: true,
        workerCategories: data.categories,
        experience: data.experience,
        description: data.description
      };

      await api.patch('/api/user/worker-interest', payload);
      setUserProfile(prev => ({
        ...prev,
        interestedToWork: true,
        hasSeenWorkerPrompt: true,
        workerCategories: data.categories
      }));

      Alert.alert('Worker Profile Active', 'You are now signed up as a worker.');
    } catch (error) {
      console.error('Error saving worker profile:', error);
      Alert.alert('Error', 'Failed to update your profile.');
    }
  };

  /* ------------ ACTIONS ------------ */
  const selectJobAndJoin = async (job, selectedWorker = null) => {
    if (!user) return;

    // If a worker was selected (from MyJobs "Find Workers" list), start chat with that worker
    if (selectedWorker) {
      const employerId = user.sub;
      const workerId = selectedWorker.id || selectedWorker.sub;

      const participants = [String(employerId), String(workerId)].sort();
      const chatRoomSuffix = `${participants[0]}_${participants[1]}`;
      const chatRoomId = `${job.id}_chat_${chatRoomSuffix}`;

      setSelectedJob({ ...job, chatRoomId, workerId, userName: selectedWorker.name || 'Worker' });
      setMobileTab('chat');

      try {
        const updates = {};
        updates[`jobs/rooms/${chatRoomId}/members/${employerId}`] = {
          joinedAt: serverTimestamp(), userName: user.name || 'Anonymous', userImage: user.picture || '',
        };
        updates[`jobs/rooms/${chatRoomId}/members/${workerId}`] = {
          userName: selectedWorker.name || 'Worker', userImage: selectedWorker.picture || '',
        };
        // Store job metadata so both parties can see deal terms
        updates[`jobs/rooms/${chatRoomId}/jobMeta`] = {
          amount: job.amount || null,
          time: job.time || null,
          category: job.category || null,
          title: job.title || job.category || 'Job',
        };
        await update(dbRef(db), updates);
      } catch (err) {
        console.error('Failed to create job chat room:', err);
      }
      return;
    }

    // Default: just select the job (no map tab exists, go to list)
    setSelectedJobId(job.id);
    setMobileTab('list');
  };

  const handleStartWorkerChat = async (job) => {
    const employerId = job.employerId || job?.user?.sub; // Fallback handles malformed objects
    const workerId = userProfile?.interestedToWork ? user.sub : 'unknown';

    // Sort logic to match the existing poster/worker setup
    const participants = [String(employerId), String(workerId)].sort();
    const chatRoomSuffix = `${participants[0]}_${participants[1]}`;
    const chatRoomId = `${job.id}_chat_${chatRoomSuffix}`;

    // Switch to chatting state
    setSelectedJob({ ...job, chatRoomId, workerId, userName: job.employerName || 'Employer' });
    setMobileTab('chat');

    if (!user) return;
    try {
      const updates = {};
      updates[`jobs/rooms/${chatRoomId}/members/${workerId}`] = {
        joinedAt: serverTimestamp(), userName: user.name || 'Anonymous', userImage: user.picture || '',
      };

      // Ensure employer exists in RTDB so UI resolves their name properly
      updates[`jobs/rooms/${chatRoomId}/members/${employerId}`] = {
        userName: job.employerName || 'Employer', userImage: ''
      };

      // Store job metadata so worker chat can display deal terms
      updates[`jobs/rooms/${chatRoomId}/jobMeta`] = {
        amount: job.amount || null,
        time: job.time || null,
        category: job.category || null,
        title: job.title || job.category || 'Job',
      };

      await update(dbRef(db), updates);
    } catch (err) {
      console.error('Failed to join job room:', err);
    }
  };

  /* ------------ MAIN UI ------------ */
  return (
    <View style={{ flex: 1, backgroundColor: '#050510' }}>

      {/* HEADER */}
      <View style={{ paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(5,5,16,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', zIndex: 50 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color="#a1a1aa" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>
            Urban<Text style={{ color: '#818cf8' }}>Flow</Text>
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {userProfile?.interestedToWork && (
            <TouchableOpacity
              onPress={() => setShowLearningSchemes(true)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <GraduationCap size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Schemes</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleToggleWorker}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: userProfile?.interestedToWork ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: userProfile?.interestedToWork ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)' }}
          >
            <Text style={{ color: userProfile?.interestedToWork ? '#60a5fa' : '#a1a1aa', fontSize: 12, fontWeight: 'bold' }}>
              {userProfile?.interestedToWork ? 'Worker On' : 'Worker Off'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <LearningSchemesModal
        visible={showLearningSchemes}
        onClose={() => setShowLearningSchemes(false)}
      />

      {/* WORKER PROMPT MODAL */}
      {showWorkerPrompt && (
        <WorkerPrompt
          initialData={userProfile}
          onSave={handleSaveWorkerProfile}
          onCancel={() => setShowWorkerPrompt(false)}
        />
      )}

      <View style={{ flex: 1 }}>

        {/* LIST VIEW */}
        {mobileTab === 'list' && (
          <View style={{ flex: 1, padding: 20 }}>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 }}>StreetGig</Text>
              <Text style={{ fontSize: 14, color: '#a1a1aa' }}>AI-matched verified local job opportunities.</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 16 }}>
              {['ALL', 'MY', 'CREATE'].map((tab) => (
                <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center',
                    borderColor: activeTab === tab ? 'rgba(255,255,255,0.15)' : 'transparent',
                    backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.06)' : 'transparent',
                  }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: activeTab === tab ? '#fff' : '#71717a' }}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flex: 1 }}>
              {activeTab === 'CREATE' && (
                <JobCreate
                  onCreated={() => {
                    loadJobs();
                    fetchMyJobs();
                    setActiveTab('MY');
                  }}
                  location={userLocation}
                />
              )}
              {activeTab === 'ALL' && (
                userProfile?.interestedToWork ? (
                  <>
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>Filter Recommendations</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
                        {/* Time Filters */}
                        <TouchableOpacity
                          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: timeFilter === '' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: timeFilter === '' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)' }}
                          onPress={() => setTimeFilter('')}
                        >
                          <Text style={{ color: timeFilter === '' ? '#60a5fa' : '#a1a1aa', fontSize: 12, fontWeight: 'bold' }}>Any Time</Text>
                        </TouchableOpacity>
                        {TIME_SLOTS.map(slot => (
                          <TouchableOpacity
                            key={slot}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: timeFilter === slot ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: timeFilter === slot ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)' }}
                            onPress={() => setTimeFilter(slot)}
                          >
                            <Clock size={12} color={timeFilter === slot ? '#60a5fa' : '#71717a'} />
                            <Text style={{ color: timeFilter === slot ? '#60a5fa' : '#a1a1aa', fontSize: 12, fontWeight: 'bold' }}>{slot}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, marginTop: 4 }}>
                        <Text style={{ color: '#a1a1aa', fontSize: 14, fontWeight: 'bold', marginRight: 4 }}>₹</Text>
                        <TextInput
                          style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' }}
                          placeholder="Min budget (e.g. 500)"
                          placeholderTextColor="#52525b"
                          keyboardType="number-pad"
                          value={minPriceFilter}
                          onChangeText={setMinPriceFilter}
                        />
                      </View>
                    </View>

                    <JobList
                      jobs={jobs}
                      onSelect={(job) => { setSelectedJobId(job.id); setMobileTab('map'); }}
                      onChat={handleStartWorkerChat}
                      isLoading={isLoadingJobs}
                      isAiMatching={true}
                    />
                  </>
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <Briefcase size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: 16 }} />
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Worker Profile Inactive</Text>
                    <Text style={{ color: '#a1a1aa', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>You must register as a worker to browse local gig opportunities.</Text>
                    <TouchableOpacity onPress={() => setShowWorkerPrompt(true)} style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Become a Worker</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}
              {activeTab === 'MY' && <MyJobs jobs={myJobs} onSelect={selectJobAndJoin} onUpdate={fetchMyJobs} />}
            </View>
          </View>
        )}



        {/* CHAT VIEW */}
        {mobileTab === 'chat' && (
          <View style={{ flex: 1, paddingBottom: 80 }}>
            {selectedJob ? (
              <JobChat job={selectedJob} onBack={() => setSelectedJob(null)} />
            ) : (
              <ConversationsWrapper
                userProfile={userProfile}
                userId={user?.sub}
                onSelectChat={(chatProps) => setSelectedJob(chatProps)}
                onBrowseJobs={() => { setMobileTab('list'); setActiveTab('ALL'); }}
              />
            )}
          </View>
        )}

        {/* FLOATING PILL NAV */}
        <View style={{ position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center', zIndex: 100 }}>
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.8)', padding: 6, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <TouchableOpacity onPress={() => setMobileTab('list')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
                backgroundColor: mobileTab === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderWidth: 1, borderColor: mobileTab === 'list' ? 'rgba(255,255,255,0.15)' : 'transparent',
              }}>
              <List size={16} color={mobileTab === 'list' ? '#fff' : '#a1a1aa'} />
            </TouchableOpacity>



            <TouchableOpacity onPress={() => setMobileTab('chat')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
                backgroundColor: mobileTab === 'chat' ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderWidth: 1, borderColor: mobileTab === 'chat' ? 'rgba(255,255,255,0.15)' : 'transparent',
              }}>
              <MessageSquare size={16} color={mobileTab === 'chat' ? '#fff' : '#a1a1aa'} />
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </View>
  );
}
