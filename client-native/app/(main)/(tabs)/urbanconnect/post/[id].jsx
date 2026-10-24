import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MessageSquare } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import PostCard from '../components/PostCard';
import CommentItem from '../components/CommentItem';
import { api } from '../../../../../lib/api';
import { useAuthStore } from '../../../../../store/useAuthStore';

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [post, setPost] = useState(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  // Use a hardcoded post if API fails for demo
  const mockPost = {
    _id: id,
    authorName: 'UrbanFlow',
    authorHandle: 'urbanflow_official',
    isVerified: true,
    timeAgo: '1m',
    title: 'Welcome to UrbanConnect!',
    description: 'Join the city-wide discussion...',
    votes: 42,
    comments: [
      { id: 'c1', authorName: 'John Doe', authorHandle: 'johndoe', text: 'Excited about this!', timeAgo: '3m' }
    ]
  };

  useEffect(() => {
    const fetchPostDetail = async () => {
      try {
        const res = await api.get(`/api/urbanconnect/fetchQuestion/${id}`);
        setPost(res.data || mockPost);
      } catch (err) {
        setPost(mockPost);
      } finally {
        setLoading(false);
      }
    };
    fetchPostDetail();
  }, [id]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    try {
      const res = await api.post('/api/urbanconnect/comment', { 
        questionId: id, 
        authorName: user?.name, 
        authorEmail: user?.email,
        comment: reply 
      });
      // manually push to state for demo
      setPost(prev => ({
        ...prev,
        comments: [{
           _id: res.data?.newComment?._id || Math.random().toString(),
           questionId: id,
           authorName: user?.name || 'Local Resident',
           authorHandle: user?.nickname || 'resident',
           body: reply,
           timeAgo: 'Just now',
           votes: 0,
           replyCount: 0
        }, ...(prev?.comments || [])]
      }));
      setReply('');
    } catch(err) {
      console.log('Error commenting:', err);
      Alert.alert('Network Error', 'Could not post reply. Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        height: 60, 
        borderBottomWidth: 1, 
        borderBottomColor: 'rgba(255,255,255,0.08)' 
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 24 }}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Post</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}>
          {post && <PostCard post={post} />}
          
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Replies</Text>
          </View>

          {post?.comments?.map((c, i) => (
            <CommentItem key={c._id || c.id || i} comment={c} />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          padding: 12, 
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          borderTopWidth: 1, 
          borderTopColor: 'rgba(255,255,255,0.08)',
          backgroundColor: '#050510'
        }}>
          <View style={{ flex: 1, backgroundColor: '#18181b', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 }}>
            <TextInput
              placeholder="Post your reply"
              placeholderTextColor="#71717a"
              style={{ color: '#fff', fontSize: 15 }}
              value={reply}
              onChangeText={setReply}
            />
          </View>
          <TouchableOpacity onPress={handleReply} disabled={!reply.trim()} style={{ marginLeft: 12 }}>
            <MessageSquare size={24} color={reply.trim() ? '#3b82f6' : '#71717a'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
