import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { MessageSquare, ChevronUp, ChevronDown, Bookmark } from 'lucide-react-native';
import { api } from '../../../../../lib/api';
import { useAuthStore } from '../../../../../store/useAuthStore';

export default function CommentItem({ comment, depth = 0 }) {
  
  const { user } = useAuthStore();
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const [votes, setVotes] = useState(comment.votes || 0);
  const [userVote, setUserVote] = useState(comment.userVote || 0);
  const [saved, setSaved] = useState(comment.saved || false);

  const fetchReplies = async () => {
    if (loadingReplies) return;
    setLoadingReplies(true);
    try {
      const res = await api.get('/api/urbanconnect/replies', {
        params: { parentId: comment._id || comment.id, limit: 10 }
      });
      if (res.data?.replies) {
        setReplies(res.data.replies);
      }
    } catch (err) {
      console.log('Error fetching replies:', err);
    } finally {
      setLoadingReplies(false);
    }
  };

  const toggleReplies = () => {
    const nextState = !showReplies;
    setShowReplies(nextState);
    if (nextState && replies.length === 0) {
      fetchReplies();
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;
    
    // Optimistic UI update
    const tempReply = {
      _id: `temp-${Date.now()}`,
      questionId: comment.questionId,
      parentId: comment._id || comment.id,
      authorName: user?.name || 'Local Resident',
      authorHandle: user?.nickname || 'resident',
      body: replyText,
      timeAgo: 'Just now',
      votes: 0,
      replyCount: 0
    };
    
    setReplies(prev => [...prev, tempReply]);
    setReplyText('');
    setShowReplyBox(false);
    setShowReplies(true);

    try {
      await api.post('/api/urbanconnect/comment', {
        questionId: comment.questionId,
        parentId: comment._id || comment.id,
        authorName: user?.name,
        authorEmail: user?.email,
        comment: tempReply.body
      });
    } catch (err) {
      console.log('Error posting reply:', err);
      // rollback in real scenario
    }
  };

  const handleVote = async (value) => {
    let newVote = value;
    if (userVote === value) newVote = 0; // toggle off
    
    const voteDelta = newVote - userVote;
    setVotes(prev => prev + voteDelta);
    setUserVote(newVote);

    try {
      await api.patch('/api/urbanconnect/votes', {
        commentId: comment._id || comment.id,
        value: newVote,
        email: user?.email
      });
    } catch (err) {
      // rollback
      setVotes(prev => prev - voteDelta);
      setUserVote(userVote);
    }
  };

  const handleSave = async () => {
    const newSaved = !saved;
    setSaved(newSaved);

    try {
      await api.post('/api/urbanconnect/save', {
        commentId: comment._id || comment.id,
        email: user?.email
      });
    } catch (err) {
      setSaved(!newSaved);
      console.log('Error toggling save:', err);
    }
  };

  const isReply = depth > 0;

  return (
    <View style={{ 
      paddingLeft: isReply ? 24 : 16,
      paddingRight: 16,
      paddingVertical: 12,
      borderBottomWidth: isReply ? 0 : 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
      backgroundColor: '#000'
    }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Avatar */}
        <View style={{ 
          width: isReply ? 32 : 40, 
          height: isReply ? 32 : 40, 
          borderRadius: 20, 
          backgroundColor: '#27272a', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: isReply ? 12 : 14 }}>
            {comment.authorName?.charAt(0) || 'U'}
          </Text>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{comment.authorName}</Text>
            <Text style={{ color: '#71717a', fontSize: 13 }}>
              @{comment.authorHandle || 'resident'} · {comment.timeAgo || '1h'}
            </Text>
          </View>
          
          <Text style={{ color: '#d4d4d8', marginTop: 4, lineHeight: 20, fontSize: 14 }}>
            {comment.body || comment.text || comment.comment}
          </Text>

          {/* Actions Bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 16 }}>
            {/* Threaded Voting */}
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 12 }}>
              <TouchableOpacity onPress={() => handleVote(1)} style={{ padding: 6, paddingHorizontal: 10 }}>
                <ChevronUp size={16} color={userVote === 1 ? '#f97316' : '#71717a'} />
              </TouchableOpacity>
              <Text style={{ color: userVote === 1 ? '#f97316' : userVote === -1 ? '#3b82f6' : '#a1a1aa', fontSize: 13, fontWeight: 'bold', minWidth: 20, textAlign: 'center' }}>
                {votes}
              </Text>
              <TouchableOpacity onPress={() => handleVote(-1)} style={{ padding: 6, paddingHorizontal: 10 }}>
                <ChevronDown size={16} color={userVote === -1 ? '#3b82f6' : '#71717a'} />
              </TouchableOpacity>
            </View>

            {/* Reply Button Option */}
            <TouchableOpacity onPress={() => setShowReplyBox(!showReplyBox)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={16} color="#71717a" />
              <Text style={{ color: '#71717a', fontSize: 13, fontWeight: '500' }}>Reply</Text>
            </TouchableOpacity>

            {/* Bookmark / Save */}
            <TouchableOpacity onPress={handleSave} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Bookmark size={16} fill={saved ? '#f59e0b' : 'transparent'} color={saved ? '#f59e0b' : '#71717a'} />
            </TouchableOpacity>
          </View>

          {/* Internal Reply Input Box */}
          {showReplyBox && (
             <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
               <TextInput 
                 style={{ flex: 1, backgroundColor: '#18181b', color: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, fontSize: 13 }}
                 placeholder="Write a reply..."
                 placeholderTextColor="#71717a"
                 value={replyText}
                 onChangeText={setReplyText}
               />
               <TouchableOpacity 
                 onPress={handleReplySubmit}
                 disabled={!replyText.trim()}
                 style={{ backgroundColor: replyText.trim() ? '#3b82f6' : '#27272a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}
               >
                 <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Post</Text>
               </TouchableOpacity>
             </View>
          )}

          {/* Show Nested Replies Toggle */}
          {(comment.replyCount > 0 || replies.length > 0) && (
            <TouchableOpacity onPress={toggleReplies} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 24, height: 1, backgroundColor: '#3f3f46' }} />
              <Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: '600' }}>
                {showReplies ? 'Hide' : 'Show'} {Math.max(comment.replyCount || 0, replies.length)} replies
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </View>

      {/* Render Nested Threads */}
      {showReplies && (
        <View style={{ marginTop: 8 }}>
          {loadingReplies ? (
            <ActivityIndicator size="small" color="#3b82f6" style={{ margin: 12 }} />
          ) : (
            replies.map((reply, idx) => (
              <CommentItem key={reply._id || idx} comment={reply} depth={depth + 1} />
            ))
          )}
        </View>
      )}
    </View>
  );
}
