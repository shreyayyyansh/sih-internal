import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../lib/api';
import { Star, MessageCircle, ThumbsUp, ArrowLeft } from 'lucide-react-native';

export default function ReceiverFeedback() {
    const router = useRouter();
    const { ngoId, ngoName } = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [rating, setRating] = useState(0);
    const [form, setForm] = useState({ receiverName: '', issue: '' });

    const handleSubmit = async () => {
        if (rating === 0) { Alert.alert('Error', 'Please select a rating level.'); return; }
        try {
            setLoading(true);
            await api.post('/api/kindshare/feedback', { ngoId, ngoName, rating, ...form });
            Alert.alert('Thank You', 'Your feedback helps the community grow!', [{ text: 'Finish', onPress: () => router.replace('/kindshare') }]);
        } catch (error) { console.error(error); Alert.alert('Error', 'Failed to submit feedback.'); }
        finally { setLoading(false); }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#050510' }}>
            <View style={{ paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(5,5,16,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <TouchableOpacity onPress={() => router.back()} style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <ArrowLeft size={20} color="#a1a1aa" />
                </TouchableOpacity>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Urban<Text style={{ color: '#818cf8' }}>Flow</Text></Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <View style={{ alignItems: 'center', marginBottom: 32, paddingTop: 20 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(129,140,248,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <ThumbsUp size={36} color="#818cf8" />
                    </View>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' }}>Rate Your Experience</Text>
                    <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 6, textAlign: 'center' }}>How was your interaction with {ngoName}?</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Star size={40} color={rating >= star ? "#fbbf24" : "#3f3f46"} fill={rating >= star ? "#fbbf24" : "transparent"} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ gap: 14 }}>
                    <TextInput
                        style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, color: '#fff', fontSize: 14 }}
                        placeholderTextColor="#52525b"
                        placeholder="Your Name (Optional)"
                        value={form.receiverName}
                        onChangeText={(v) => setForm(p => ({ ...p, receiverName: v }))}
                    />
                    <TextInput
                        style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, color: '#fff', fontSize: 14, height: 120, textAlignVertical: 'top' }}
                        placeholderTextColor="#52525b"
                        placeholder="Any comments or issues to report?"
                        multiline
                        value={form.issue}
                        onChangeText={(v) => setForm(p => ({ ...p, issue: v }))}
                    />

                    <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
                        style={{ backgroundColor: '#818cf8', paddingVertical: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                        {loading ? <ActivityIndicator color="white" /> : (
                            <>
                                <MessageCircle size={18} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Submit Feedback</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
