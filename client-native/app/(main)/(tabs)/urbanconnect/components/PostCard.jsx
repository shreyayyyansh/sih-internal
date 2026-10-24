import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Dimensions, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { MessageCircle, Heart, CheckCircle2, MoreHorizontal, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { api } from '../../../../../lib/api';
import { useAuthStore } from '../../../../../store/useAuthStore';

const { width } = Dimensions.get('window');

export default function PostCard({ post }) {
  const { user } = useAuthStore();
  const [liked, setLiked] = useState(post?.userVote === 1);
  const [likesCount, setLikesCount] = useState(post?.votes || 0);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleLike = async () => {
    const newLikedState = !liked;
    const voteDelta = newLikedState ? 1 : -1;
    
    // Optimistic UI update
    setLikesCount(prev => prev + voteDelta);
    setLiked(newLikedState);

    try {
      await api.patch('/api/urbanconnect/questionVotes', {
        questionId: post?._id || post?.id,
        value: newLikedState ? 1 : 0,
        email: user?.email
      });
    } catch (err) {
      // Revert if API fails
      setLikesCount(prev => prev - voteDelta);
      setLiked(!newLikedState);
      console.log('Error updating question vote:', err);
    }
  };

  const images = post?.images || post?.image || [];

  return (
    <View style={{
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      gap: 12,
      backgroundColor: '#050510'
    }}>
      {/* Avatar (Left Column) */}
      <View style={{ width: 48, alignItems: 'center' }}>
        {post?.authorAvatar ? (
          <Image 
            source={{ uri: post.authorAvatar }} 
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#27272a' }} 
          />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#a1a1aa', fontWeight: 'bold', fontSize: 18 }}>
              {post?.authorName ? post.authorName.charAt(0).toUpperCase() : 'A'}
            </Text>
          </View>
        )}
      </View>

      {/* Main Content (Right Column) */}
      <View style={{ flex: 1 }}>
        {/* Header - Name, Handle, Time, Action */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
              {post?.authorName || 'Anonymous User'}
            </Text>
            {post?.isVerified && <CheckCircle2 size={14} color="#3b82f6" />}
            <Text style={{ color: '#71717a', fontSize: 14 }} numberOfLines={1}>
              @{post?.authorHandle || 'anonymous'}
            </Text>
            <Text style={{ color: '#71717a', fontSize: 14 }}>· {post?.timeAgo || '2h'}</Text>
          </View>
          <TouchableOpacity style={{ padding: 4 }}>
            <MoreHorizontal size={18} color="#71717a" />
          </TouchableOpacity>
        </View>

        {/* --- CIVIC REPORT SYSTEM BADGE & STATUS PILL --- */}
        {post?.isCivicReport && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {/* System Badge */}
            <View style={{
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(56, 189, 248, 0.3)',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4
            }}>
              <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                CIVIC SYSTEM
              </Text>
            </View>

            {/* LIVE Status Pill */}
            <View style={{
              backgroundColor: 
                post.reportStatus === 'RESOLVED' ? 'rgba(34, 197, 94, 0.15)' :
                post.reportStatus === 'USERVERIFICATION' ? 'rgba(168, 85, 247, 0.15)' :
                post.reportStatus === 'ASSIGNED' ? 'rgba(234, 179, 8, 0.15)' :
                'rgba(113, 113, 122, 0.15)',
              borderWidth: 1,
              borderColor: 
                post.reportStatus === 'RESOLVED' ? 'rgba(34, 197, 94, 0.3)' :
                post.reportStatus === 'USERVERIFICATION' ? 'rgba(168, 85, 247, 0.3)' :
                post.reportStatus === 'ASSIGNED' ? 'rgba(234, 179, 8, 0.3)' :
                'rgba(113, 113, 122, 0.3)',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4
            }}>
              <View style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: 
                  post.reportStatus === 'RESOLVED' ? '#22c55e' :
                  post.reportStatus === 'USERVERIFICATION' ? '#a855f7' :
                  post.reportStatus === 'ASSIGNED' ? '#eab308' :
                  '#71717a'
              }} />
              <Text style={{ 
                color: 
                  post.reportStatus === 'RESOLVED' ? '#22c55e' :
                  post.reportStatus === 'USERVERIFICATION' ? '#a855f7' :
                  post.reportStatus === 'ASSIGNED' ? '#eab308' :
                  '#a1a1aa',
                fontSize: 10, fontWeight: '700', letterSpacing: 0.5 
              }}>
                {post.reportStatus === 'USERVERIFICATION' ? 'IN REVIEW' : post.reportStatus || 'PENDING'}
              </Text>
            </View>
          </View>
        )}

        {/* Post Title */}
        {post?.title && (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4, lineHeight: 22 }}>
            {post.title}
          </Text>
        )}

        {/* Post Body */}
        {post?.description && (
          <Text style={{ color: '#d4d4d8', fontSize: 15, lineHeight: 21, marginTop: 4 }}>
            {post.description}
          </Text>
        )}

        {/* Tagged Authorities */}
        {post?.taggedAuthorities && post.taggedAuthorities.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {post.taggedAuthorities.map((auth, idx) => (
              <View 
                key={auth._id || idx} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                  borderWidth: 1,
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                  paddingHorizontal: 8, 
                  paddingVertical: 4, 
                  borderRadius: 6 
                }}
              >
                <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '600' }}>
                  {auth.postName} · {auth.city}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Media */}
        {images.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            style={{ marginTop: 12, borderRadius: 16, overflow: 'hidden' }}
          >
            {images.map((img, idx) => (
              <TouchableOpacity key={idx} activeOpacity={0.9} onPress={() => setSelectedImage(img)}>
                <Image 
                  source={{ uri: img }}
                  style={{
                    width: images.length === 1 ? width - 96 : 240,
                    height: images.length === 1 ? 200 : 160,
                    borderRadius: 16,
                    backgroundColor: '#18181b',
                  }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Misinformation Context Note */}
        {post?.aiAnalysis?.isMisinformation === true && (
          <View style={{
            marginTop: 10,
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.25)',
            borderRadius: 10,
            padding: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={{
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '900' }}>!</Text>
              </View>
              <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '800', letterSpacing: 0.5  }}>
                Community Context
              </Text>
            </View>
            <Text style={{ color: '#f87171', fontSize: 12, lineHeight: 17 }}>
              {post.aiAnalysis.contextNote || 'This post may contain information that contradicts official announcements.'}
            </Text>
          </View>
        )}

        {/* Action Bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: 24, marginTop: 14 }}>
          {/* Comment */}
          <TouchableOpacity 
            onPress={() => router.push(`/(main)/(tabs)/urbanconnect/post/${post?._id || post?.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <MessageCircle size={18} color="#71717a" />
            <Text style={{ color: '#71717a', fontSize: 13, fontWeight: '500' }}>
              {post?.commentCount ?? post?.comments?.length ?? 0}
            </Text>
          </TouchableOpacity>

          {/* Like */}
          <TouchableOpacity 
            onPress={handleLike}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Heart size={18} fill={liked ? '#ef4444' : 'transparent'} color={liked ? '#ef4444' : '#71717a'} />
            <Text style={{ color: liked ? '#ef4444' : '#71717a', fontSize: 13, fontWeight: '500' }}>
              {likesCount}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 }} 
            onPress={() => setSelectedImage(null)}
          >
            <X size={32} color="#ffffff" />
          </TouchableOpacity>
          {selectedImage && (
            <TouchableWithoutFeedback onPress={() => setSelectedImage(null)}>
              <Image 
                source={{ uri: selectedImage }} 
                style={{ width: '100%', height: '80%' }} 
                resizeMode="contain" 
              />
            </TouchableWithoutFeedback>
          )}
        </View>
      </Modal>
    </View>
  );
}
