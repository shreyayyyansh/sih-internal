import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { AlertCircle, History, Send, User, ArrowLeft } from 'lucide-react-native';

const INPUT_STYLE = { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14 };

export default function ComplaintsScreen() {
    const router = useRouter();
    const { ngoId, ngoName, role } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [complaints, setComplaints] = useState([]);
    const [form, setForm] = useState({ name: '', itemOrCategory: '', issue: '' });

    useEffect(() => { fetchComplaints(); }, [ngoId]);

    const fetchComplaints = async () => {
        try { setLoading(true); const response = await api.get(`/api/kindshare/complaints/ngo/${ngoId}`); setComplaints(response.data); }
        catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleSubmit = async () => {
        if (!form.name || !form.issue) { Alert.alert('Error', 'Please fill in your name and describe the issue.'); return; }
        try {
            setSubmitting(true);
            await api.post('/api/kindshare/complaints', { ngoId, ngoName: ngoName || '', name: form.name, itemOrCategory: form.itemOrCategory, issue: form.issue, complaintFrom: role || 'User' });
            Alert.alert('Submitted', 'Your complaint has been registered.');
            setForm({ name: '', itemOrCategory: '', issue: '' });
            fetchComplaints();
        } catch (error) { console.error(error); Alert.alert('Error', 'Failed to submit complaint.'); }
        finally { setSubmitting(false); }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#050510' }}>
            <View style={{ paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(5,5,16,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <TouchableOpacity onPress={() => router.back()} style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <ArrowLeft size={20} color="#a1a1aa" />
                </TouchableOpacity>
                <View>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Urban<Text style={{ color: '#818cf8' }}>Flow</Text></Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header section */}
                <View style={{ paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <AlertCircle size={28} color="#f87171" />
                    <View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>Complaints & History</Text>
                        <Text style={{ color: '#f87171', fontSize: 12, marginTop: 2 }}>{ngoName}</Text>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 20 }}>
                    {/* Submit Section */}
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 28 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 16 }}>Submit New Complaint</Text>
                        <View style={{ gap: 12 }}>
                            <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Your Name *" value={form.name} onChangeText={(v) => setForm(p => ({ ...p, name: v }))} />
                            <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Item or Category (e.g. Clothes, Food)" value={form.itemOrCategory} onChangeText={(v) => setForm(p => ({ ...p, itemOrCategory: v }))} />
                            <TextInput style={[INPUT_STYLE, { height: 100, textAlignVertical: 'top' }]} placeholderTextColor="#52525b" placeholder="Describe the issue in detail *" multiline value={form.issue} onChangeText={(v) => setForm(p => ({ ...p, issue: v }))} />
                            <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.8}
                                style={{ backgroundColor: '#f87171', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {submitting ? <ActivityIndicator color="white" /> : (
                                    <>
                                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Submit Complaint</Text>
                                        <Send size={16} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* History Section */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <History size={18} color="#71717a" />
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Complaint History</Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator color="#818cf8" style={{ marginVertical: 40 }} />
                    ) : complaints.length === 0 ? (
                        <View style={{ paddingVertical: 40, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
                            <Text style={{ color: '#52525b' }}>No previous complaints found.</Text>
                        </View>
                    ) : (
                        complaints.map((c, i) => (
                            <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 14, marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <User size={12} color="#71717a" />
                                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{c.name}</Text>
                                    </View>
                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                        <Text style={{ color: '#71717a', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{c.complaintFrom}</Text>
                                    </View>
                                </View>
                                <Text style={{ color: '#52525b', fontSize: 11, marginBottom: 4 }}>Item: {c.itemOrCategory || 'N/A'}</Text>
                                <Text style={{ color: '#a1a1aa', fontSize: 13 }}>{c.issue}</Text>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
