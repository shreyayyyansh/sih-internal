import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Search, TrendingUp, AlertTriangle, ChevronRight, Zap, BarChart3 } from 'lucide-react-native';
import { api } from '../../../../../lib/api';
import PostCard from './PostCard';

const getTimeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
};

export default function ExploreTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [clusters, setClusters] = useState([]);
  const [loadingClusters, setLoadingClusters] = useState(true);

  // Fetch emerging issue clusters
  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const res = await api.get('/api/urbanconnect/clusters');
        if (res.data?.data) {
          setClusters(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch clusters:', err);
      } finally {
        setLoadingClusters(false);
      }
    };
    fetchClusters();
  }, []);

  // Search debounce
  useEffect(() => {
    const fetchSearch = async () => {
      if (!searchQuery || searchQuery.trim() === '') {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await api.post('/api/urbanconnect/search', { search: searchQuery });
        setSearchResults(res.data);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceSearch = setTimeout(fetchSearch, 500);
    return () => clearTimeout(debounceSearch);
  }, [searchQuery]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Search Bar */}
      <View style={{ padding: 16, backgroundColor: '#050510', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Search size={20} color="#71717a" />
          <TextInput 
            placeholder="Search UrbanConnect"
            placeholderTextColor="#71717a"
            style={{ flex: 1, color: '#fff', fontSize: 16, marginLeft: 12 }}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: searchQuery.trim() === '' ? 16 : 0, paddingBottom: 100 }}>
        {searchQuery.trim() !== '' ? (
          <View>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', margin: 16 }}>Search Results</Text>
            {isSearching ? (
               <ActivityIndicator size="small" color="#fff" style={{ margin: 20 }} />
            ) : searchResults.length > 0 ? (
               searchResults.map((post) => (
                 <PostCard key={post._id} post={post} />
               ))
            ) : (
               <Text style={{ color: '#71717a', fontSize: 15, marginHorizontal: 16 }}>No results found.</Text>
            )}
          </View>
        ) : (
          <React.Fragment>
            {/* Emerging Issues Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Emerging Issues</Text>
                <Text style={{ color: '#71717a', fontSize: 12, marginTop: 1 }}>AI-detected clusters in your city</Text>
              </View>
            </View>

            {loadingClusters ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={{ color: '#71717a', fontSize: 13, marginTop: 12 }}>Detecting patterns...</Text>
              </View>
            ) : clusters.length === 0 ? (
              <View style={{ 
                padding: 32, 
                backgroundColor: 'rgba(255,255,255,0.03)', 
                borderRadius: 16, 
                borderWidth: 1, 
                borderColor: 'rgba(255,255,255,0.06)',
                alignItems: 'center' 
              }}>
                <BarChart3 size={36} color="#52525b" style={{ marginBottom: 14 }} />
                <Text style={{ color: '#a1a1aa', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>No emerging issues detected</Text>
                <Text style={{ color: '#52525b', fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                  When multiple residents report similar issues, AI will cluster them here as an emerging trend.
                </Text>
              </View>
            ) : (
              clusters.map((cluster, idx) => (
                <View 
                  key={cluster._id} 
                  style={{ 
                    marginBottom: 14, 
                    backgroundColor: 'rgba(255,255,255,0.03)', 
                    borderRadius: 16, 
                    padding: 18, 
                    borderWidth: 1, 
                    borderColor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Cluster Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <View style={{ 
                      width: 28, height: 28, borderRadius: 8, 
                      backgroundColor: 'rgba(239, 68, 68, 0.12)', 
                      alignItems: 'center', justifyContent: 'center' 
                    }}>
                      <AlertTriangle size={14} color="#ef4444" />
                    </View>
                    <Text style={{ color: '#71717a', fontSize: 12, fontWeight: '600' }}>
                      {idx + 1} · Emerging Issue
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '500' }}>
                      {getTimeAgo(cluster.createdAt)}
                    </Text>
                  </View>

                  {/* Headline */}
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', lineHeight: 23, marginBottom: 8 }}>
                    {cluster.headline}
                  </Text>

                  {/* Summary */}
                  <Text style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 20, marginBottom: 14 }}>
                    {cluster.summary}
                  </Text>

                  {/* Footer */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    paddingTop: 12, 
                    borderTopWidth: 1, 
                    borderTopColor: 'rgba(255,255,255,0.06)' 
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TrendingUp size={14} color="#ef4444" />
                      <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>
                        {cluster.postCount} {cluster.postCount === 1 ? 'report' : 'reports'}
                      </Text>
                    </View>
                    <View style={{ 
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: 'rgba(239, 68, 68, 0.08)', 
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 
                    }}>
                      <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '600' }}>View reports</Text>
                      <ChevronRight size={14} color="#f87171" />
                    </View>
                  </View>
                </View>
              ))
            )}
          </React.Fragment>
        )}
      </ScrollView>
    </View>
  );
}
