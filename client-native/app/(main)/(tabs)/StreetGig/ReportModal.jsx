import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Flag, X, CheckCircle2 } from 'lucide-react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';

export default function ReportModal({ visible, onClose, onSubmit, isSubmitting }) {
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert("Required", "Please provide a description of the issue.");
      return;
    }
    onSubmit(description);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
         <View style={{ backgroundColor: '#18181b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
               <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                 <View style={{ padding: 8, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 12 }}>
                   <Flag size={24} color="#ef4444" />
                 </View>
                 <View>
                   <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Report Chat</Text>
                   <Text style={{ color: '#a1a1aa', fontSize: 13, marginTop: 4 }}>This conversation will be audited by AI</Text>
                 </View>
               </View>
               <TouchableOpacity onPress={onClose} style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
                 <X size={20} color="#a1a1aa" />
               </TouchableOpacity>
            </View>

            <Animated.View entering={FadeInRight} style={{ minHeight: 180 }}>
               <Text style={{ color: '#e4e4e7', fontSize: 15, fontWeight: '600', marginBottom: 12 }}>
                  Why are you reporting this user?
               </Text>
               <TextInput
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    padding: 16,
                    color: '#fff',
                    fontSize: 15,
                    height: 120,
                    textAlignVertical: 'top'
                  }}
                  placeholder="Describe inappropriate behavior, scams, or offline safety concerns..."
                  placeholderTextColor="#52525b"
                  multiline
                  value={description}
                  onChangeText={setDescription}
               />
               
               <TouchableOpacity 
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                  style={{
                    backgroundColor: '#ef4444',
                    paddingVertical: 16,
                    borderRadius: 16,
                    alignItems: 'center',
                    marginTop: 24,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: isSubmitting ? 0.7 : 1
                  }}
               >
                  {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <CheckCircle2 size={20} color="#fff" />}
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                    {isSubmitting ? 'Filing Report...' : 'Submit Report'}
                  </Text>
               </TouchableOpacity>
            </Animated.View>
         </View>
      </View>
    </Modal>
  );
}
