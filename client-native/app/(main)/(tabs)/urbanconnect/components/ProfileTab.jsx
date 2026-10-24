import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Calendar, Bookmark, MessageSquare } from 'lucide-react-native';
import { useAuthStore } from '../../../../../store/useAuthStore';
import { api } from '../../../../../lib/api';
import PostCard from './PostCard';
import { router } from 'expo-router';

export default function ProfileTab() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    posts: [],
    replies: [],
    likes: [],
    saved: []
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      try {
        const queryParams = `email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}&nickname=${encodeURIComponent(user.nickname || '')}&picture=${encodeURIComponent(user.picture || '')}`;
        const res = await api.get(`/api/urbanconnect/profile?${queryParams}`);
        setProfileData(res.data);
      } catch (err) {
        console.error("Failed to fetch profile data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.email]);

  const getActiveData = () => {
    if (activeTab === 'posts') return profileData.posts;
    if (activeTab === 'likes') return profileData.likes;
    if (activeTab === 'saved') return profileData.saved;
    return [];
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover Photo */}
        <View style={{ height: 120, backgroundColor: '#1e293b' }}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=2070&auto=format&fit=crop' }} 
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>

        {/* Profile Info Header */}
        <View style={{ paddingHorizontal: 16, position: 'relative' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ 
              width: 80, height: 80, borderRadius: 40, backgroundColor: '#000', 
              marginTop: -40, borderWidth: 4, borderColor: '#000',
              overflow: 'hidden' 
            }}>
              {user?.picture ? (
                <Image source={{ uri: user.picture }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ width: '100%', height: '100%', backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{user?.name?.charAt(0) || 'U'}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{user?.name || 'Local Resident'}</Text>
            <Text style={{ color: '#71717a', fontSize: 15, marginTop: 2 }}>@{user?.nickname || 'resident'}</Text>
          </View>

          <Text style={{ color: '#fff', fontSize: 15, lineHeight: 20, marginTop: 12 }}>
            Urban explorer passionate about smart city infrastructure and community engagement.
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
            <Calendar size={16} color="#71717a" />
            <Text style={{ color: '#71717a', fontSize: 14 }}>Joined March 2026</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginTop: 16 }}>
          {['posts', 'likes', 'saved'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={{ flex: 1, alignItems: 'center', paddingTop: 16, paddingBottom: 16, position: 'relative' }}
            >
              <Text style={{ 
                color: activeTab === tab ? '#fff' : '#71717a',
                fontWeight: activeTab === tab ? '700' : '500',
                fontSize: 15,
                textTransform: 'capitalize'
              }}>
                {tab}
              </Text>
              {activeTab === tab && (
                <View style={{ position: 'absolute', bottom: 0, width: 56, height: 4, backgroundColor: '#3b82f6', borderRadius: 2 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading ? (
           <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : (
           <View style={{ paddingBottom: 100 }}>
             {/* Posts & Likes render with PostCard */}
             {(activeTab === 'posts') && profileData.posts.map(post => <PostCard key={post._id} post={post} />)}
             {(activeTab === 'likes') && profileData.likes.map(post => <PostCard key={post._id} post={post} />)}

             {/* Saved tab renders saved comments with parent question context */}
             {activeTab === 'saved' && profileData.saved.map(item => (
               <TouchableOpacity 
                 key={item._id} 
                 activeOpacity={0.7}
                 onPress={() => router.push(`/(main)/(tabs)/urbanconnect/post/${item.questionId || item.parentQuestion?._id}`)}
                 style={{
                   borderBottomWidth: 1,
                   borderBottomColor: 'rgba(255,255,255,0.08)',
                   paddingHorizontal: 16,
                   paddingVertical: 14,
                   backgroundColor: '#050510',
                 }}
               >
                 {/* Parent question context */}
                 {item.parentQuestion && (
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                     <MessageSquare size={13} color="#71717a" />
                     <Text style={{ color: '#71717a', fontSize: 12, flex: 1 }} numberOfLines={1}>
                       Replied on: <Text style={{ color: '#a1a1aa', fontWeight: '600' }}>{item.parentQuestion.title}</Text>
                     </Text>
                   </View>
                 )}

                 {/* Comment body */}
                 <View style={{ flexDirection: 'row', gap: 10 }}>
                   <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' }}>
                     <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                       {item.authorName?.charAt(0) || 'U'}
                     </Text>
                   </View>
                   <View style={{ flex: 1 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                       <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{item.authorName || 'User'}</Text>
                       <Text style={{ color: '#71717a', fontSize: 12 }}>· {item.timeAgo || ''}</Text>
                     </View>
                     <Text style={{ color: '#d4d4d8', fontSize: 14, lineHeight: 20, marginTop: 4 }}>
                       {item.body}
                     </Text>
                   </View>
                   <Bookmark size={16} fill="#f59e0b" color="#f59e0b" style={{ marginTop: 2 }} />
                 </View>
               </TouchableOpacity>
             ))}

             {/* Empty state */}
             {getActiveData().length === 0 && (
               <View style={{ padding: 32, alignItems: 'center' }}>
                 <Text style={{ color: '#71717a', fontSize: 15 }}>No {activeTab} yet.</Text>
               </View>
             )}
           </View>
        )}
      </ScrollView>
    </View>
  );
}
