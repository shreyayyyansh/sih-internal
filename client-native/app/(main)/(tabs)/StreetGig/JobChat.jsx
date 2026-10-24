import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Send, User, ArrowLeft, Flag, ChevronDown, ChevronUp, IndianRupee, Clock, Tag, Info, Wifi, WifiOff } from 'lucide-react-native';
import { ref, push, onValue, serverTimestamp, update, set, onDisconnect, remove } from 'firebase/database';
import { db } from '../../../../lib/firebase';
import { api } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/useAuthStore';
import RatingModal from './RatingModal';
import ReportModal from './ReportModal';
import { useAuth0 } from 'react-native-auth0';

// --- HELPERS ---
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 0) return 'just now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function JobChat({ job, onBack }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDealClosed, setIsDealClosed] = useState(job?.status === 'closed');
  
  // Job info bar
  const [showJobInfo, setShowJobInfo] = useState(false);

  // Rating logic
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  
  // Reporting logic
  const { getCredentials } = useAuth0();
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Typing & presence
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState(null);
  const typingTimeoutRef = useRef(null);
  
  const scrollViewRef = useRef();

  useEffect(() => {
    const roomId = job?.chatRoomId || job?.id;
    if (!roomId) return;

    const messagesRef = ref(db, `jobs/rooms/${roomId}/messages`);
    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));
        setMessages(loaded.sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setMessages([]);
      }
    });

    const statusRef = ref(db, `jobs/rooms/${roomId}/status`);
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val() === 'closed') setIsDealClosed(true);
    });

    return () => { unsubscribeMessages(); unsubscribeStatus(); };
  }, [job?.id]);

  // --- Typing & Presence ---
  useEffect(() => {
    const roomId = job?.chatRoomId || job?.id;
    const myId = user?.sub || user?.id;
    if (!roomId || !myId) return;

    // Set my presence as online
    const myPresenceRef = ref(db, `jobs/rooms/${roomId}/presence/${myId}`);
    set(myPresenceRef, { online: true, lastSeen: serverTimestamp() });
    onDisconnect(myPresenceRef).set({ online: false, lastSeen: serverTimestamp() });

    // Determine who the "other" user is
    const otherId = job?.employerId === myId ? job?.workerId : job?.employerId;
    if (!otherId) return;

    // Listen to other user's typing
    const otherTypingRef = ref(db, `jobs/rooms/${roomId}/typing/${otherId}`);
    const unsubTyping = onValue(otherTypingRef, (snap) => {
      setIsOtherTyping(snap.exists() && snap.val() === true);
    });

    // Listen to other user's presence
    const otherPresenceRef = ref(db, `jobs/rooms/${roomId}/presence/${otherId}`);
    const unsubPresence = onValue(otherPresenceRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setIsOtherOnline(data.online === true);
        setOtherLastSeen(data.lastSeen || null);
      } else {
        setIsOtherOnline(false);
      }
    });

    return () => {
      set(myPresenceRef, { online: false, lastSeen: serverTimestamp() });
      unsubTyping();
      unsubPresence();
    };
  }, [job?.id, user]);

  const handleTyping = useCallback((text) => {
    setNewMessage(text);
    const roomId = job?.chatRoomId || job?.id;
    const myId = user?.sub || user?.id;
    if (!roomId || !myId) return;

    const myTypingRef = ref(db, `jobs/rooms/${roomId}/typing/${myId}`);
    set(myTypingRef, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      remove(myTypingRef);
    }, 2000);
  }, [job, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to send messages.');
      return;
    }
    try {
      const userId = user.sub || user.id;
      const roomId = job?.chatRoomId || job?.id;
      const messagesRef = ref(db, `jobs/rooms/${roomId}/messages`);
      await push(messagesRef, {
        text: newMessage.trim(),
        userId,
        userName: user.name || 'Anonymous',
        userAvatar: user.picture || '',
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
      // Clear typing indicator on send
      const myTypingRef = ref(db, `jobs/rooms/${roomId}/typing/${userId}`);
      remove(myTypingRef);
    } catch (err) {
      console.error('Send message error:', err);
      Alert.alert('Error', 'Failed to send message. Check your connection.');
    }
  };

  const handleReportSubmit = async (description) => {
    setIsSubmittingReport(true);
    try {
       const credentials = await getCredentials();
       const token = credentials?.accessToken;
       
       await api.post(`/api/jobs/${job.id || job.chatRoomId}/report-chat`, {
          description,
          messages, // Send entire local history
          reportedUserId: job.workerId || job.employerId // Send the ID of who they are looking at
       }, {
          headers: { Authorization: `Bearer ${token}` }
       });
       
       Alert.alert("Report Filed", "Thank you. Our Trust & Safety AI is analyzing the conversation.");
       setIsReportModalVisible(false);
    } catch (err) {
       console.error("Failed to submit report:", err);
       Alert.alert("Error", err.response?.data?.message || "Could not submit report. Please try again.");
    } finally {
       setIsSubmittingReport(false);
    }
  };

  const userId = user?.sub || user?.id;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: showJobInfo ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ padding: 8, marginLeft: -8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <ArrowLeft size={20} color="#a1a1aa" />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 16 }} numberOfLines={1}>{job?.title || job?.category}</Text>
          <Text style={{ fontSize: 12, color: isOtherTyping ? '#818cf8' : '#a1a1aa', marginTop: 2 }}>
            {isOtherTyping ? 'typing...' : isOtherOnline ? '● Online' : otherLastSeen ? `Last seen ${formatRelativeTime(otherLastSeen)}` : `Chatting with ${job?.userName || 'Unknown'}`}
          </Text>
        </View>

        {/* Info Toggle */}
        <TouchableOpacity onPress={() => setShowJobInfo(p => !p)} style={{ padding: 8, borderRadius: 20, backgroundColor: showJobInfo ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.05)' }}>
          <Info size={18} color={showJobInfo ? '#818cf8' : '#a1a1aa'} />
        </TouchableOpacity>
        
        {/* Report Button (VISIBLE TO ALL) */}
        {!isDealClosed && (
           <TouchableOpacity 
             onPress={() => setIsReportModalVisible(true)}
             style={{ padding: 8, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.1)' }}
           >
             <Flag size={18} color="#ef4444" />
           </TouchableOpacity>
        )}

        {/* Close Deal Action (EMPLOYER ONLY) */}
        {!isDealClosed && job?.employerId === userId && (
           <TouchableOpacity 
             onPress={() => setIsRatingModalVisible(true)}
             style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f43f5e' }}
           >
             <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Close Deal</Text>
           </TouchableOpacity>
        )}
      </View>

      {/* Collapsible Job Info Bar */}
      {showJobInfo && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(129,140,248,0.04)' }}>
          {job?.amount && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' }}>
              <IndianRupee size={12} color="#34d399" />
              <Text style={{ color: '#34d399', fontSize: 12, fontWeight: 'bold' }}>{job.amount}</Text>
            </View>
          )}
          {job?.time && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' }}>
              <Clock size={12} color="#60a5fa" />
              <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: 'bold' }}>{job.time}</Text>
            </View>
          )}
          {job?.category && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(168,85,247,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' }}>
              <Tag size={12} color="#c084fc" />
              <Text style={{ color: '#c084fc', fontSize: 12, fontWeight: 'bold' }}>{job.category}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDealClosed ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: isDealClosed ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)' }}>
            {isDealClosed ? <WifiOff size={12} color="#f87171" /> : <Wifi size={12} color="#4ade80" />}
            <Text style={{ color: isDealClosed ? '#f87171' : '#4ade80', fontSize: 12, fontWeight: 'bold' }}>{isDealClosed ? 'Closed' : 'Open'}</Text>
          </View>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ gap: 16, paddingBottom: 20 }}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => {
          const isMe = msg.userId === userId;
          return (
            <View key={msg.id} style={{ flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
              <View style={{ height: 24, width: 24, borderRadius: 12, backgroundColor: '#18181b', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                {msg.userAvatar ? <Image source={{ uri: msg.userAvatar }} style={{ height: '100%', width: '100%' }} /> : <User size={14} color="#71717a" />}
              </View>
              <View style={{
                maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                backgroundColor: isMe ? '#2563eb' : 'rgba(255,255,255,0.05)',
                borderBottomRightRadius: isMe ? 4 : 20, borderBottomLeftRadius: isMe ? 20 : 4,
                borderWidth: isMe ? 0 : 1, borderColor: 'rgba(255,255,255,0.06)',
              }}>
                <Text style={{ color: isMe ? '#fff' : '#e4e4e7', fontSize: 14 }}>{msg.text}</Text>
                <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.5)' : '#52525b', marginTop: 4, alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                  {formatRelativeTime(msg.timestamp)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input */}
      {isDealClosed ? (
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', alignItems: 'center' }}>
          <Text style={{ color: '#71717a', fontSize: 14 }}>This conversation is closed.</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', gap: 8 }}>
          <TextInput
            value={newMessage} onChangeText={handleTyping} placeholder="Type a message..."
            placeholderTextColor="#52525b"
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14 }}
          />
          <TouchableOpacity
            onPress={handleSendMessage} disabled={!newMessage.trim()}
            style={{ backgroundColor: newMessage.trim() ? '#2563eb' : 'rgba(37,99,235,0.3)', height: 40, width: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* AI Feedback Form triggered by Close Deal */}
      <RatingModal 
        visible={isRatingModalVisible}
        onClose={() => setIsRatingModalVisible(false)}
        job={job}
        workerToRate={{ id: job?.workerId, name: job?.userName }}
        onSuccess={() => {
           setIsRatingModalVisible(false);
           setIsDealClosed(true);
           Alert.alert('Job Closed', 'Feedback submitted! All incoming chats for this job are now locked.');
        }}
      />
      
      {/* AI Safety Reporting Form */}
      <ReportModal
         visible={isReportModalVisible}
         onClose={() => setIsReportModalVisible(false)}
         onSubmit={handleReportSubmit}
         isSubmitting={isSubmittingReport}
      />
    </KeyboardAvoidingView>
  );
}
