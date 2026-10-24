import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, Text, RefreshControl, ScrollView } from 'react-native';
import axios from 'axios';
import PostCard from './PostCard';
import { api } from '../../../../../lib/api';

const SkeletonPost = () => (
  <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', gap: 12, backgroundColor: '#050510' }}>
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1f1f22' }} />
    <View style={{ flex: 1 }}>
      <View style={{ width: '50%', height: 16, backgroundColor: '#1f1f22', borderRadius: 4, marginBottom: 8 }} />
      <View style={{ width: '90%', height: 14, backgroundColor: '#1f1f22', borderRadius: 4, marginBottom: 6 }} />
      <View style={{ width: '70%', height: 14, backgroundColor: '#1f1f22', borderRadius: 4, marginBottom: 12 }} />
      <View style={{ width: '100%', height: 160, backgroundColor: '#1f1f22', borderRadius: 12 }} />
    </View>
  </View>
);

export default function FeedTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async (isLoadMore = false) => {
    if (isLoadMore) {
        setLoadingMore(true);
    }

    try {
      const params = { limit: 15 };
      if (isLoadMore && nextCursor) {
          params.after = nextCursor;
      }

      const res = await api.get('/api/urbanconnect/fetchQuestion', { params });
      
      if (res.data?.data) {
        if (isLoadMore) {
           setPosts(prev => [...prev, ...res.data.data]);
        } else {
           setPosts(res.data.data);
        }
        setNextCursor(res.data.nextCursor);
        setHasMore(res.data.hasMore);
      }
    } catch (err) {
      console.log('Error fetching posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    setNextCursor(null);
    fetchPosts();
  };

  const handleLoadMore = () => {
      if (!loadingMore && hasMore && posts.length > 0 && !loading) {
          fetchPosts(true);
      }
  };

  const renderFooter = () => {
      if (!loadingMore) return <View style={{ height: 100 }} />;
      return (
          <View style={{ padding: 20, paddingBottom: 100, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#3b82f6" />
          </View>
      );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {loading && !refreshing && posts.length === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4].map(key => <SkeletonPost key={key} />)}
        </ScrollView>
      ) : (
        <FlatList 
          data={posts.length > 0 ? posts : [{ _id: 'mock1', title: 'Welcome to UrbanConnect!', description: 'Join the city-wide community to discuss, share, and connect with other residents. Real-time updates coming soon.', authorName: 'UrbanFlow', authorHandle: 'urbanflow_official', isVerified: true, likes: 42, timeAgo: '1m', comments: [1,2,3] }]}
          keyExtractor={(item, index) => item._id || String(index)}
          renderItem={({ item }) => <PostCard post={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}
