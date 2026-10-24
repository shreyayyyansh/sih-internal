import React, { useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import JobCard from './JobCard';
import { Sparkles } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

export default function JobList({ jobs, onSelect, onChat, selectedJobId, isLoading, isAiMatching }) {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    if (isLoading) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [isLoading]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.95 + 0.05 * pulse.value }]
  }));

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
        <Animated.View style={[{ alignItems: 'center' }, animatedStyle]}>
          <View style={{ 
            width: 72, height: 72, borderRadius: 36, 
            backgroundColor: 'rgba(129,140,248,0.15)', 
            alignItems: 'center', justifyContent: 'center', 
            marginBottom: 20, borderWidth: 1, borderColor: 'rgba(129,140,248,0.3)' 
          }}>
            <Sparkles size={36} color="#818cf8" />
          </View>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            {isAiMatching ? 'AI is finding best jobs in the city...' : 'Finding local opportunities...'}
          </Text>
          <Text style={{ color: '#818cf8', fontSize: 14, textAlign: 'center', opacity: 0.8 }}>
             {isAiMatching ? 'Analyzing requirements & distance' : 'Loading jobs near you'}
          </Text>
        </Animated.View>
      </View>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
        <Text style={{ color: '#71717a', fontSize: 14, textAlign: 'center' }}>
          No jobs found in this area yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          isSelected={selectedJobId === job.id}
          onChat={() => onChat(job)}
        />
      ))}
    </ScrollView>
  );
}
