import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert, StyleSheet, ScrollView } from 'react-native';
import { api } from '../../../../lib/api';
import { useAuth0 } from 'react-native-auth0';
import { ArrowRight, ArrowLeft, Check, Sparkles, Clock, IndianRupee } from 'lucide-react-native';

export default function JobCreate({ onCreated, location }) {
  const { getCredentials } = useAuth0();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Form State
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const CATEGORIES = [
    'Movers', 'Carpenter', 'Plumber', 'Electrician', 'Masonry', 'Cleaners',
    'Painters', 'Mechanic', 'Gardening', 'AC Repair', 'Tech Support', 'Tailor',
    'Beauty & Salon', 'Delivery', 'Photography', 'House Sitting',
    'Civil Work', 'Flooring', 'Roofing', 'Welding', 'Scaffolding',
    'Security', 'Janitorial Services', 'Maintenance', 'BMS Operator',
    'Pest Control', 'Deep Cleaning', 'Home Renovation', 'Appliance Repair', 'Interior Design'
  ].sort();

  const TIME_SLOTS = [
    'Quick (< 1 hr)',
    '1-2 Hours',
    'Half Day (4 hrs)',
    'Full Day (8 hrs)',
    'Next 24 Hours',
    'Flexible'
  ];

  const RECOMMENDATIONS = [
    'Urgent Fix',
    'Quality First',
    'Budget Friendly',
    'Professional Required',
    'Material Provided'
  ];

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const submit = async () => {
    if (!description || !amount || !time || !category) {
      Alert.alert('Missing Fields', 'Please complete all steps.');
      return;
    }
    setLoading(true);

    try {
      const credentials = await getCredentials();
      if (!credentials) throw new Error('No credentials');
      
      // Sending category as temporary title since user wants AI to handle it later 
      // but backend validation currently requires a string.
      await api.post(
        '/api/jobs',
        {
          description: description,
          amount, 
          time, 
          category,
          recommendation,
          location: { lat: Number(location.lat), lng: Number(location.lng) },
        },
        { headers: { Authorization: `Bearer ${credentials.accessToken}` } }
      );

      // Reset
      setCategory(''); setAmount(''); setTime(''); setDescription(''); setRecommendation('');
      setCurrentStep(0);
      if (onCreated) onCreated();
      Alert.alert('Success', 'Job posted successfully!');
    } catch (error) {
      console.error('Failed to post job', error);
      Alert.alert('Error', 'Failed to post job.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What do you need help with?</Text>
            <ScrollView contentContainerStyle={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity 
                  key={cat} 
                  onPress={() => setCategory(cat)}
                  style={[styles.catCard, category === cat && styles.catCardSelected]}
                >
                  <View style={[styles.catIconCircle, category === cat && styles.catIconCircleSelected]}>
                    <Sparkles size={20} color={category === cat ? '#fff' : '#71717a'} />
                  </View>
                  <Text style={[styles.catText, category === cat && styles.catTextSelected]}>{cat}</Text>
                  {category === cat && <View style={styles.checkBadge}><Check size={10} color="#fff" /></View>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Set your budget</Text>
            <View style={styles.amountInputWrapper}>
              <IndianRupee size={32} color="#4ade80" />
              <TextInput 
                style={styles.amountInput} 
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.1)"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
            <View style={styles.quickAmountRow}>
              {['200', '500', '1000', '2000'].map(val => (
                <TouchableOpacity key={val} onPress={() => setAmount(val)} style={styles.quickAmountBtn}>
                  <Text style={styles.quickAmountText}>₹{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select time duration</Text>
            <View style={styles.slotGrid}>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity 
                  key={slot} 
                  onPress={() => setTime(slot)}
                  style={[styles.slotCard, time === slot && styles.slotCardSelected]}
                >
                  <Clock size={18} color={time === slot ? '#60a5fa' : '#71717a'} />
                  <Text style={[styles.slotText, time === slot && styles.slotTextSelected]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Final details</Text>
            <TextInput 
              style={styles.largeTextArea}
              placeholder="Describe the job requirements..."
              placeholderTextColor="#52525b"
              multiline
              value={description}
              onChangeText={setDescription}
            />
            
            <Text style={styles.subLabel}>Recommendation (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recScroll}>
              {RECOMMENDATIONS.map(rec => (
                <TouchableOpacity 
                  key={rec} 
                  onPress={() => setRecommendation(rec)}
                  style={[styles.recChip, recommendation === rec && styles.recChipSelected]}
                >
                  <Text style={[styles.recText, recommendation === rec && styles.recTextSelected]}>{rec}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    if (currentStep === 0 && !category) return true;
    if (currentStep === 1 && !amount) return true;
    if (currentStep === 2 && !time) return true;
    if (currentStep === 3 && !description) return true;
    return false;
  };  return (
    <View style={styles.container}>
      {/* ProgressBar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${((currentStep + 1) / 4) * 100}%` }]} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderStep()}
      </ScrollView>

      <View style={styles.navRow}>
        {currentStep > 0 && (
          <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
            <ArrowLeft size={20} color="#a1a1aa" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          onPress={currentStep === 3 ? submit : nextStep} 
          disabled={loading || isNextDisabled()}
          style={[styles.nextBtn, (loading || isNextDisabled()) && styles.disabledBtn]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>{currentStep === 3 ? 'Post Job' : 'Next'}</Text>
              {currentStep < 3 && <ArrowRight size={20} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, marginBottom: 24, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#818cf8' },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 160 },
  stepContainer: { flex: 1 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 20, marginLeft: 4 },
  
  // Cat Grid
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 },
  catCard: { width: '47%', aspectRatio: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  catCardSelected: { backgroundColor: 'rgba(129,140,248,0.1)', borderColor: '#818cf8' },
  catIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  catIconCircleSelected: { backgroundColor: '#818cf8' },
  catText: { fontSize: 13, color: '#a1a1aa', fontWeight: '600', textAlign: 'center' },
  catTextSelected: { color: '#fff' },
  checkBadge: { position: 'absolute', top: 12, right: 12, width: 18, height: 18, borderRadius: 9, backgroundColor: '#818cf8', alignItems: 'center', justifyContent: 'center' },

  // Amount
  amountInputWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, gap: 12 },
  amountInput: { fontSize: 48, fontWeight: '900', color: '#fff', minWidth: 100, textAlign: 'center' },
  quickAmountRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 40 },
  quickAmountBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  quickAmountText: { color: '#4ade80', fontWeight: 'bold' },

  // Slots
  slotGrid: { gap: 12, paddingBottom: 10 },
  slotCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  slotCardSelected: { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6' },
  slotText: { fontSize: 15, color: '#a1a1aa', fontWeight: '500' },
  slotTextSelected: { color: '#fff', fontWeight: '700' },

  // Final details
  largeTextArea: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, color: '#fff', fontSize: 16, minHeight: 180, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  subLabel: { color: '#a1a1aa', fontSize: 13, fontWeight: '600', marginTop: 24, marginBottom: 12, marginLeft: 4 },
  recScroll: { gap: 8, paddingBottom: 10 },
  recChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  recChipSelected: { backgroundColor: 'rgba(245,158,11,0.2)', borderColor: '#f59e0b' },
  recText: { fontSize: 13, color: '#71717a', fontWeight: '600' },
  recTextSelected: { color: '#fbbf24' },

  // Nav
  navRow: { 
    position: 'absolute', 
    bottom: -20, // Negative to stretch to the bottom padded area if necessary, but 0 is usually safer. 
                 // Let's use 0 to stay within JobCreate bounds, and add huge padding bottom.
                 // Actually, padding: 20 is on the parent. So bottom: 0 means it stops 20px before screen bottom.
    left: 0, 
    right: 0, 
    flexDirection: 'row', 
    gap: 12, 
    paddingTop: 16, 
    paddingBottom: 80, // Accounts for the floating pill height
    backgroundColor: '#050510',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.02)'
  },
  backBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  nextBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  disabledBtn: { opacity: 0.4 },
});
