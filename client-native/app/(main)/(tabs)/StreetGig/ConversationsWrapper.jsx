import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Briefcase, MessageSquare, ChevronRight, ChevronDown, User } from 'lucide-react-native';
import { ref, onValue, update, serverTimestamp } from 'firebase/database';
import { db } from '../../../../lib/firebase';
import { api } from '../../../../lib/api';
import { useAuth0 } from 'react-native-auth0';

export default function ConversationsWrapper({ userProfile, userId, onSelectChat, onBrowseJobs }) {
  const { getCredentials } = useAuth0();
  const [viewMode, setViewMode] = useState('employer'); // 'employer' | 'worker'
  
  const [myJobs, setMyJobs] = useState([]); // Jobs posted by the user
  const [allRooms, setAllRooms] = useState({}); // All RTDB rooms
  const [isLoading, setIsLoading] = useState(true);

  const [expandedJobs, setExpandedJobs] = useState({});

  // 1. Fetch Employer Jobs from REST API
  useEffect(() => {
    let mounted = true;
    const fetchEmployerJobs = async () => {
      try {
        setIsLoading(true);
        const creds = await getCredentials();
        if (!creds) return;
        const res = await api.get('/api/jobs/my', { headers: { Authorization: `Bearer ${creds.accessToken}` } });
        if (mounted) {
          setMyJobs(res.data.jobs || []);
        }
      } catch (err) {
        console.error("Error fetching my jobs for chat:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    if (userId) fetchEmployerJobs();
    return () => { mounted = false; };
  }, [userId]);

  // 2. Fetch RTDB Rooms to map chats
  useEffect(() => {
    const roomsRef = ref(db, 'jobs/rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      if (snapshot.exists()) {
        setAllRooms(snapshot.val());
      } else {
        setAllRooms({});
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleJobExpand = (jobId) => {
    setExpandedJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  // --- COMPUTE DRIVED DATA ---

  // Employer View: Group rooms by the Jobs this user posted
  const employerChats = myJobs.map(job => {
    // Find all RTDB rooms that start with this jobId
    const jobRooms = Object.entries(allRooms).filter(([roomId, roomData]) => {
      return roomId.startsWith(`${job.id}_chat_`) && roomData.members;
    });

    const activeChats = jobRooms.map(([roomId, roomData]) => {
      // Find the "other" member (not the employer)
      const otherMemberEntry = Object.entries(roomData.members || {}).find(([memberId]) => memberId !== userId);
      
      let lastMsgText = "No messages yet";
      let lastMsgTime = 0;
      let totalMsgCount = 0;
      if (roomData.messages) {
        const msgs = Object.values(roomData.messages);
        totalMsgCount = msgs.length;
        if (msgs.length > 0) {
          msgs.sort((a, b) => a.timestamp - b.timestamp);
          const last = msgs[msgs.length - 1];
          lastMsgText = last.text;
          lastMsgTime = last.timestamp;
        }
      }

      // Compute unread count based on lastRead
      const myLastRead = roomData.lastRead?.[userId] || 0;
      let unreadCount = 0;
      if (roomData.messages) {
        unreadCount = Object.values(roomData.messages).filter(m => m.timestamp > myLastRead && m.userId !== userId).length;
      }

      return {
        roomId,
        workerId: otherMemberEntry ? otherMemberEntry[0] : 'Unknown',
        workerName: otherMemberEntry ? otherMemberEntry[1].userName : 'Unknown Worker',
        workerAvatar: otherMemberEntry ? otherMemberEntry[1].userImage : null,
        lastMessage: lastMsgText,
        lastTimestamp: lastMsgTime,
        unreadCount
      };
    }).sort((a, b) => b.lastTimestamp - a.lastTimestamp); // newest chat first

    return {
      ...job,
      chats: activeChats,
      isClosed: job.status === 'closed' || job.status === 'CLOSED',
    };
  }).sort((a, b) => {
    // Closed jobs go to the bottom
    if (a.isClosed && !b.isClosed) return 1;
    if (!a.isClosed && b.isClosed) return -1;
    return 0;
  });

  // Worker View: Flat list of rooms where user is a participant BUT did not create the job (i.e. they are the worker)
  const workerChats = Object.entries(allRooms)
    .filter(([roomId, roomData]) => {
      if (!roomData || !roomData.members) return false;
      // User must be a participant according to the roomId string
      if (!roomId.includes(userId)) return false;
      
      // The room ID format is: jobId_chat_employerId_workerId. 
      // If we are the worker, we shouldn't be the employer.
      // But we don't have the job owner natively in RTDB. 
      // However, if the jobId isn't in myJobs, we are likely the worker!
      const isMyOwnJob = myJobs.some(j => roomId.startsWith(`${j.id}_chat_`));
      return !isMyOwnJob;
    })
    .map(([roomId, roomData]) => {
      const otherMemberEntry = Object.entries(roomData.members || {}).find(([memberId]) => memberId !== userId);
      
      let lastMsgText = "No messages yet";
      let lastMsgTime = 0;
      if (roomData.messages) {
        const msgs = Object.values(roomData.messages);
        if (msgs.length > 0) {
          msgs.sort((a, b) => a.timestamp - b.timestamp);
          const last = msgs[msgs.length - 1];
          lastMsgText = last.text;
          lastMsgTime = last.timestamp;
        }
      }

      // Compute unread count based on lastRead
      const myLastRead = roomData.lastRead?.[userId] || 0;
      let unreadCount = 0;
      if (roomData.messages) {
        unreadCount = Object.values(roomData.messages).filter(m => m.timestamp > myLastRead && m.userId !== userId).length;
      }

      // Read job metadata stored in RTDB
      const jobMeta = roomData.jobMeta || {};

      return {
        roomId,
        employerId: otherMemberEntry ? otherMemberEntry[0] : 'Unknown',
        employerName: otherMemberEntry ? otherMemberEntry[1].userName : 'Unknown Employer',
        employerAvatar: otherMemberEntry ? otherMemberEntry[1].userImage : null,
        lastMessage: lastMsgText,
        lastTimestamp: lastMsgTime,
        unreadCount,
        jobAmount: jobMeta.amount || null,
        jobTime: jobMeta.time || null,
        jobCategory: jobMeta.category || null,
        jobTitle: jobMeta.title || null,
      };
    }).sort((a, b) => b.lastTimestamp - a.lastTimestamp);

  // --- RENDERING HANDLERS ---
  const handleSelectEmployerChat = (job, chat) => {
    // Mark as read
    const lastReadRef = ref(db, `jobs/rooms/${chat.roomId}/lastRead/${userId}`);
    update(ref(db, `jobs/rooms/${chat.roomId}/lastRead`), { [userId]: Date.now() });

    onSelectChat({
      id: job.id,
      title: job.title || job.category || 'Job',
      chatRoomId: chat.roomId,
      employerId: userId,
      workerId: chat.workerId,
      status: job.status,
      amount: job.amount,
      time: job.time,
      category: job.category,
      userName: chat.workerName
    });
  };

  const handleSelectWorkerChat = (chat) => {
    // Mark as read
    update(ref(db, `jobs/rooms/${chat.roomId}/lastRead`), { [userId]: Date.now() });

    onSelectChat({
      chatRoomId: chat.roomId,
      title: chat.jobTitle || `Chat with ${chat.employerName}`,
      userName: chat.employerName,
      employerId: chat.employerId,
      amount: chat.jobAmount,
      time: chat.jobTime,
      category: chat.jobCategory,
    });
  };

  const isWorkerEnabled = userProfile?.interestedToWork === true;

  if (isLoading) {
     return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#60a5fa" /></View>;
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 16 }}>Messages</Text>

      {/* Toggles */}
      <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 20 }}>
        <TouchableOpacity 
          onPress={() => setViewMode('employer')} 
          style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: viewMode === 'employer' ? 'rgba(59,130,246,0.3)' : 'transparent' }}
        >
          <Text style={{ color: viewMode === 'employer' ? '#60a5fa' : '#a1a1aa', fontWeight: 'bold', fontSize: 13 }}>As Employer</Text>
        </TouchableOpacity>
        
        {isWorkerEnabled && (
          <TouchableOpacity 
            onPress={() => setViewMode('worker')} 
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: viewMode === 'worker' ? 'rgba(168,85,247,0.3)' : 'transparent' }}
          >
            <Text style={{ color: viewMode === 'worker' ? '#c084fc' : '#a1a1aa', fontWeight: 'bold', fontSize: 13 }}>As Worker</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {viewMode === 'employer' ? (
          employerChats.length === 0 ? (
             <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Briefcase size={40} color="rgba(255,255,255,0.1)" />
                <Text style={{ color: '#a1a1aa', marginTop: 12 }}>You haven't posted any jobs yet.</Text>
             </View>
          ) : (
            employerChats.map(job => (
              <View key={job.id} style={{ marginBottom: 12, backgroundColor: job.isClosed ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: job.isClosed ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', overflow: 'hidden', opacity: job.isClosed ? 0.7 : 1 }}>
                {/* Job Header */}
                <TouchableOpacity onPress={() => toggleJobExpand(job.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: job.isClosed ? '#f87171' : '#fff', fontSize: 16, fontWeight: 'bold' }}>{job.category || job.title || 'Job'}</Text>
                    <Text style={{ color: job.isClosed ? '#f87171' : '#a1a1aa', fontSize: 12, marginTop: 4 }}>{job.isClosed ? 'Closed' : `${job.chats.length} active chats`}</Text>
                  </View>
                  {expandedJobs[job.id] ? <ChevronDown size={20} color="#60a5fa" /> : <ChevronRight size={20} color="#a1a1aa" />}
                </TouchableOpacity>

                {/* Worker Chats for this Job */}
                {expandedJobs[job.id] && (
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    {job.chats.length === 0 ? (
                      <Text style={{ padding: 16, color: '#52525b', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>No workers have messaged you yet.</Text>
                    ) : (
                      job.chats.map(chat => (
                        <TouchableOpacity 
                          key={chat.roomId} onPress={() => handleSelectEmployerChat(job, chat)}
                          style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' }}
                        >
                          {chat.workerAvatar ? (
                             <Image source={{ uri: chat.workerAvatar }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#18181b' }} />
                          ) : (
                             <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                               <User size={20} color="#a1a1aa" />
                             </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{chat.workerName}</Text>
                            <Text style={{ color: '#a1a1aa', fontSize: 12, marginTop: 2 }} numberOfLines={1}>{chat.lastMessage}</Text>
                          </View>
                          {chat.unreadCount > 0 && (
                            <View style={{ backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 8 }}>
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{chat.unreadCount}</Text>
                            </View>
                          )}
                          <ChevronRight size={16} color="#52525b" />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            ))
          )
        ) : (
          workerChats.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <MessageSquare size={40} color="rgba(255,255,255,0.1)" />
              <Text style={{ color: '#a1a1aa', marginTop: 12, textAlign: 'center' }}>You haven't initiated any chats as a worker.{'\n'}Find jobs and message employers to start!</Text>
              <TouchableOpacity onPress={onBrowseJobs} style={{ marginTop: 20, backgroundColor: 'rgba(168,85,247,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#c084fc' }}>
                 <Text style={{ color: '#e9d5ff', fontWeight: 'bold' }}>Browse Open Jobs</Text>
              </TouchableOpacity>
            </View>
          ) : (
            workerChats.map(chat => (
              <TouchableOpacity 
                key={chat.roomId} onPress={() => handleSelectWorkerChat(chat)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
              >
                {chat.employerAvatar ? (
                    <Image source={{ uri: chat.employerAvatar }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 16, backgroundColor: '#18181b' }} />
                ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                      <User size={24} color="#c084fc" />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{chat.jobTitle || chat.employerName}</Text>
                  {chat.jobCategory && (
                    <Text style={{ color: '#c084fc', fontSize: 11, marginTop: 2 }}>{chat.jobCategory}{chat.jobAmount ? ` · ₹${chat.jobAmount}` : ''}</Text>
                  )}
                  <Text style={{ color: '#a1a1aa', fontSize: 13, marginTop: 3 }} numberOfLines={1}>{chat.lastMessage}</Text>
                </View>
                {chat.unreadCount > 0 && (
                  <View style={{ backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{chat.unreadCount}</Text>
                  </View>
                )}
                <ChevronRight size={20} color="#52525b" />
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}
