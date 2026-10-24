import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { api } from '../../../../../lib/api';

const DEPT_COLORS = {
  Revenue: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' },
  Civic: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' },
  'Emergency Services': { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' },
  Police: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', text: '#a855f7' },
};

function getTimeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function AnnouncementCard({ item }) {
  const dept = DEPT_COLORS[item.department] || DEPT_COLORS.Civic;

  return (
    <View style={styles.card}>
      {/* Authority Badge Row */}
      <View style={styles.headerRow}>
        <View style={styles.authorityBadge}>
          <View style={[styles.avatarCircle, { backgroundColor: dept.bg, borderColor: dept.border }]}>
            <Text style={[styles.avatarText, { color: dept.text }]}>
              {item.authorityName?.charAt(0) || 'G'}
            </Text>
          </View>
          <View>
            <Text style={styles.authorityName}>{item.authorityName}</Text>
            <Text style={styles.cityText}>Prayagraj · Official</Text>
          </View>
        </View>
        <View style={[styles.deptTag, { backgroundColor: dept.bg, borderColor: dept.border }]}>
          <Text style={[styles.deptTagText, { color: dept.text }]}>{item.department}</Text>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.officialBadge}>
          <View style={styles.officialDot} />
          <Text style={styles.officialText}>Official Announcement</Text>
        </View>
        <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await api.get('/api/announcements?city=Prayagraj&limit=20');
      setAnnouncements(res.data?.data || []);
    } catch (err) {
      console.log('Error fetching announcements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#a855f7" />
        <Text style={styles.loadingText}>Loading official announcements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.megaphoneCircle}>
            <Text style={{ fontSize: 16 }}>📢</Text>
          </View>
          <View>
            <Text style={styles.sectionTitle}>Official Announcements</Text>
            <Text style={styles.sectionSubtitle}>Prayagraj Administration</Text>
          </View>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{announcements.length}</Text>
        </View>
      </View>

      <FlatList
        data={announcements}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <AnnouncementCard item={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a855f7" />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
            <Text style={styles.emptyTitle}>No Announcements</Text>
            <Text style={styles.emptySubtitle}>Official updates will appear here</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#71717a', fontSize: 13, marginTop: 12 },

  // Section Header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  megaphoneCircle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sectionSubtitle: { color: '#71717a', fontSize: 11, fontWeight: '500', marginTop: 1 },
  countBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)', borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
  },
  countText: { color: '#a855f7', fontSize: 12, fontWeight: '800' },

  // Card
  card: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#050510',
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  authorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '900' },
  authorityName: { color: '#e4e4e7', fontSize: 13, fontWeight: '700' },
  cityText: { color: '#52525b', fontSize: 11, marginTop: 1 },
  deptTag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  deptTagText: { fontSize: 10, fontWeight: '700' },

  // Content
  title: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 20, marginBottom: 4 },
  body: { color: '#a1a1aa', fontSize: 13, lineHeight: 19 },

  // Footer
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
  },
  officialBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  officialDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  officialText: { color: '#22c55e', fontSize: 10, fontWeight: '700' },
  timeText: { color: '#52525b', fontSize: 10 },

  // Empty State
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: '#71717a', fontSize: 16, fontWeight: '700' },
  emptySubtitle: { color: '#52525b', fontSize: 13, marginTop: 4 },
});
