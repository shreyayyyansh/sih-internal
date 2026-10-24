import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Image } from 'react-native';
import { api } from '../../../../lib/api';
import { useAuth0 } from 'react-native-auth0';
import { Star, MessageSquare, ChevronDown, ChevronUp, Sparkles } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import WorkerProfileModal from './WorkerProfileModal';

const AiLoadingAnimation = () => {
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value, transform: [{ scale: 0.95 + 0.05 * pulse.value }] }));
  return (
    <View style={{ alignItems: 'center', padding: 24, paddingBottom: 16 }}>
      <Animated.View style={[{ alignItems: 'center' }, style]}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(129,140,248,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(129,140,248,0.3)' }}>
          <Sparkles size={28} color="#818cf8" />
        </View>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>AI is finding the best workers...</Text>
        <Text style={{ color: '#818cf8', fontSize: 12, marginTop: 4, opacity: 0.8 }}>Analyzing skills & vector embeddings</Text>
      </Animated.View>
    </View>
  );
};

export default function MyJobs({ jobs, onSelect, onUpdate }) {
  const { getCredentials } = useAuth0();
  
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [interestedWorkers, setInterestedWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // Profile Modal State
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [profileWorker, setProfileWorker] = useState(null);

  const openProfileModal = (worker) => {
    setProfileWorker(worker);
    setIsProfileModalVisible(true);
  };

  const toggleWorkersList = async (job) => {
    if (expandedJobId === job.id) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(job.id);
    setLoadingWorkers(true);
    try {
      const credentials = await getCredentials();
      const token = credentials?.accessToken;
      
      // Enforce a minimum 2-second animation to show off the AI processing
      const [res] = await Promise.all([
        api.get(`/api/jobs/${job.id}/match-workers`, { headers: { Authorization: `Bearer ${token}` } }),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      setInterestedWorkers(res.data.workers || []);
    } catch(error) {
      console.error("Error loading workers:", error);
      Alert.alert("Error", error.response?.data?.message || "Could not match workers at this time.");
    } finally {
      setLoadingWorkers(false);
    }
  };

  if (!jobs || !jobs.length) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <Text style={{ color: '#71717a', fontSize: 14 }}>No jobs posted yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {jobs.map((job) => (
        <TouchableOpacity
          key={job.id} activeOpacity={0.8} onPress={() => onSelect(job)}
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)', padding: 16, borderRadius: 16, marginBottom: 12, gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontWeight: '800', color: '#fff', fontSize: 18, marginBottom: 4 }}>{job.category || job.title || 'Job'}</Text>
              
              {job.recommendation && (
                <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', marginBottom: 6 }}>
                  <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: 'bold' }}>{job.recommendation}</Text>
                </View>
              )}
            </View>
            <View style={{
              paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
              backgroundColor: job.status === 'OPEN' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              borderColor: job.status === 'OPEN' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: job.status === 'OPEN' ? '#4ade80' : '#f87171' }}>{job.status}</Text>
            </View>
          </View>

          {job.description && (
             <Text style={{ fontSize: 13, color: '#d4d4d8', marginBottom: 12, lineHeight: 18 }} numberOfLines={2}>
               {job.description}
             </Text>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 14, color: '#4ade80', fontWeight: 'bold' }}>₹{job.amount}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, color: '#a1a1aa', fontWeight: '500' }}>{job.time}</Text>
            </View>
          </View>

          {job.status === 'OPEN' && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => toggleWorkersList(job)}
                style={{
                  flex: 1, paddingVertical: 12, backgroundColor: 'rgba(59,130,246,0.1)',
                  borderColor: 'rgba(59,130,246,0.2)', borderWidth: 1, borderRadius: 8,
                  alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6
                }}
              >
                <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: 'bold' }}>
                  {expandedJobId === job.id ? 'Hide Workers' : 'Find Workers'}
                </Text>
                {expandedJobId === job.id ? <ChevronUp size={14} color="#60a5fa" /> : <ChevronDown size={14} color="#60a5fa" />}
              </TouchableOpacity>
            </View>
          )}

          {expandedJobId === job.id && (
            <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 16 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 12 }}>Recommended Workers</Text>
              {loadingWorkers ? <AiLoadingAnimation /> : (
                 interestedWorkers.length === 0 ? <Text style={{ color: '#a1a1aa', fontSize: 13, textAlign: 'center', padding: 10 }}>No workers found.</Text> : (
                   interestedWorkers.map(w => (
                     <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                       <TouchableOpacity onPress={() => openProfileModal(w)} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                         {w.picture ? (
                           <Image source={{ uri: w.picture }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                         ) : (
                           <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 12 }} />
                         )}
                         <View style={{ flex: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{w.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Star size={12} color="#fbbf24" fill="#fbbf24" />
                                <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: 'bold' }}>{w.rating?.toFixed(1) || '0.0'}</Text>
                              </View>
                              <Text style={{ color: '#52525b', fontSize: 12 }}>•</Text>
                              <Text style={{ color: '#a1a1aa', fontSize: 12 }}>{w.completedJobs || 0} completed jobs</Text>
                            </View>
                            {w.match_reason && (
                              <View style={{
                                marginTop: 6,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                backgroundColor: 'rgba(59,130,246,0.08)',
                                borderRadius: 6,
                                borderLeftWidth: 2,
                                borderLeftColor: 'rgba(59,130,246,0.4)',
                              }}>
                                <Text style={{ color: '#93c5fd', fontSize: 11, lineHeight: 16 }}>
                                  {w.match_reason}
                                </Text>
                              </View>
                            )}
                         </View>
                       </TouchableOpacity>
                       <View style={{ flexDirection: 'row', gap: 8 }}>
                         <TouchableOpacity onPress={() => onSelect(job, w)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                            <MessageSquare size={18} color="#60a5fa" />
                         </TouchableOpacity>
                       </View>
                     </View>
                   ))
                 )
              )}
            </View>
          )}
        </TouchableOpacity>
      ))}
      <WorkerProfileModal
        visible={isProfileModalVisible}
        worker={profileWorker}
        onClose={() => setIsProfileModalVisible(false)}
      />
    </ScrollView>
  );
}
