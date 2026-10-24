import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Briefcase, X } from 'lucide-react-native';

const CATEGORIES = [
  'Movers', 'Carpenter', 'Plumber', 'Electrician', 'Masonry', 'Cleaners',
  'Painters', 'Mechanic', 'Gardening', 'AC Repair', 'Tech Support', 'Tailor',
  'Beauty & Salon', 'Delivery', 'Photography', 'House Sitting',
  'Civil Work', 'Flooring', 'Roofing', 'Welding', 'Scaffolding',
  'Security', 'Janitorial Services', 'Maintenance', 'BMS Operator',
  'Pest Control', 'Deep Cleaning', 'Home Renovation', 'Appliance Repair', 'Interior Design'
].sort();

export default function WorkerPrompt({ onSave, onCancel, initialData }) {
  const [selectedCategories, setSelectedCategories] = useState(initialData?.workerCategories || []);
  const [experience, setExperience] = useState(initialData?.experience ? String(initialData.experience) : '');
  const [description, setDescription] = useState(initialData?.description || '');

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = () => {
    onSave({
      categories: selectedCategories,
      experience: experience.trim(),
      description: description.trim()
    });
  };

  return (
    <Animated.View 
      entering={FadeIn} exiting={FadeOut}
      style={styles.overlay}
    >
      <Animated.View 
        entering={SlideInDown.duration(300)} 
        exiting={SlideOutDown}
        style={styles.modalContent}
      >
        <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
          <X size={24} color="#a1a1aa" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Briefcase size={28} color="#60a5fa" />
            </View>
            <Text style={styles.title}>Become a Worker</Text>
            <Text style={styles.subtitle}>
              Set up your profile to start receiving relevant gig opportunities in your area.
            </Text>
          </View>

          {/* Categories */}
          <Text style={styles.label}>Select your skills (Multiple allowed):</Text>
          <View style={styles.chipContainer}>
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <TouchableOpacity 
                  key={cat} 
                  onPress={() => toggleCategory(cat)}
                  style={[
                    styles.chip,
                    isSelected ? styles.chipSelected : styles.chipUnselected
                  ]}
                >
                  <Text style={[
                     styles.chipText,
                     isSelected ? styles.chipTextSelected : styles.chipTextUnselected
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Experience */}
          <Text style={styles.label}>Years of Experience:</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 3"
            placeholderTextColor="#71717a"
            keyboardType="numeric"
            value={experience}
            onChangeText={setExperience}
            maxLength={2}
          />

          {/* Description */}
          <Text style={styles.label}>About your services (Optional):</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Briefly describe what you do..."
            placeholderTextColor="#71717a"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />

        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={selectedCategories.length === 0}
            style={[styles.saveBtn, selectedCategories.length === 0 && { opacity: 0.5 }]}
          >
            <Text style={styles.saveBtnText}>Save Profile</Text>
          </TouchableOpacity>
        </View>

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
    height: '90%',
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  closeBtn: {
    position: 'absolute', top: 20, right: 20, zIndex: 10,
    padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20
  },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  iconContainer: {
    height: 60, width: 60, borderRadius: 30,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#a1a1aa', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  label: { color: '#d4d4d8', fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 10 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1
  },
  chipSelected: {
    backgroundColor: 'rgba(59,130,246,0.25)',
    borderColor: 'rgba(59,130,246,0.5)',
  },
  chipUnselected: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)'
  },
  chipText: { fontSize: 13 },
  chipTextSelected: { color: '#93c5fd', fontWeight: 'bold' },
  chipTextUnselected: { color: '#a1a1aa', fontWeight: '500' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 16, color: '#fff', fontSize: 15,
    marginBottom: 20
  },
  textArea: { height: 120, paddingTop: 16 },
  footer: {
    flexDirection: 'row', padding: 20, gap: 12,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#18181b', paddingBottom: 40
  },
  cancelBtn: {
    flex: 1, paddingVertical: 16, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center'
  },
  cancelBtnText: { color: '#a1a1aa', fontSize: 16, fontWeight: 'bold' },
  saveBtn: {
    flex: 2, paddingVertical: 16, borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center'
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
