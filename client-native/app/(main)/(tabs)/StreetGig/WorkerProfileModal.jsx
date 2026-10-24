import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { X, Star, Briefcase, MapPin } from 'lucide-react-native';

export default function WorkerProfileModal({ visible, worker, onClose }) {
  if (!visible || !worker) return null;

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.overlay}>
      <Animated.View entering={SlideInDown.duration(300)} exiting={SlideOutDown} style={styles.modalContent}>
        
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <X size={24} color="#a1a1aa" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          <View style={styles.profileHeader}>
            {worker.picture ? (
              <Image source={{ uri: worker.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarPlaceholderText}>{worker.name?.charAt(0) || '?'}</Text>
              </View>
            )}
            
            <Text style={styles.name}>{worker.name}</Text>
            
            <View style={styles.ratingBadge}>
              <Star size={16} color="#fbbf24" fill="#fbbf24" />
              <Text style={styles.ratingText}>{worker.rating?.toFixed(1) || '0.0'}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Briefcase size={20} color="#60a5fa" />
              <Text style={styles.statValue}>{worker.completedJobs || 0}</Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
            <View style={styles.statBox}>
              <Star size={20} color="#fbbf24" />
              <Text style={styles.statValue}>{worker.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.descriptionText}>
              {worker.description || "This worker hasn't added a description yet."}
            </Text>
          </View>

        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '80%',
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  closeBtn: {
    position: 'absolute', top: 20, right: 20, zIndex: 10,
    padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20
  },
  scrollContainer: { padding: 24, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginTop: 30, marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: 'rgba(59,130,246,0.3)', marginBottom: 16 },
  avatarPlaceholder: { backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderText: { color: '#60a5fa', fontSize: 40, fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  ratingText: { color: '#fbbf24', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8, marginBottom: 4 },
  statLabel: { color: '#a1a1aa', fontSize: 12, fontWeight: '600' },
  section: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  descriptionText: { color: '#a1a1aa', fontSize: 14, lineHeight: 22 },
});
