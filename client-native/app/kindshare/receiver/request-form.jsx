import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/useAuthStore';
import { Send, User, Phone, MapPin, ArrowLeft } from 'lucide-react-native';

const INPUT_STYLE = { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10 };
const TEXT_INPUT_STYLE = { flex: 1, color: '#fff', fontSize: 14 };

export default function RequestForm() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { ngoId, donationId, itemName, ngoName } = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ receiverName: '', receiverEmail: '', receiverPhone: '', receiverAddress: '' });

    useEffect(() => {
        console.log('RequestForm mounted with params:', { ngoId, donationId, itemName, ngoName });
        if (user?.email) setForm(prev => ({ ...prev, receiverEmail: user.email }));
        if (user?.name) setForm(prev => ({ ...prev, receiverName: user.name }));
    }, [user]);

    const handleSubmit = async () => {
        if (!form.receiverName || !form.receiverEmail || !form.receiverPhone) { Alert.alert('Error', 'Please fill in your name, email and phone.'); return; }
        if (!ngoId) { Alert.alert('Error', 'NGO ID is missing. Please go back and try again.'); return; }
        if (!donationId) { Alert.alert('Error', 'Donation ID is missing. Please go back and try again.'); return; }
        try {
            setLoading(true);
            const payload = { ngoId: String(ngoId), donationId: String(donationId), ngoName: ngoName ? String(ngoName) : '', itemName: itemName ? String(itemName) : '', ...form };
            console.log('REQUEST PAYLOAD:', JSON.stringify(payload));
            const response = await api.post('/api/kindshare/requests', payload);
            console.log('REQUEST SUCCESS:', JSON.stringify(response.data));
            Alert.alert('Request Sent!', `Your request for "${itemName}" has been sent to ${ngoName}.`, [
                { text: 'Done', onPress: () => router.replace('/kindshare') },
                { text: 'Rate NGO', onPress: () => router.push({ pathname: '/kindshare/receiver/feedback', params: { ngoId, ngoName } }) }
            ]);
        } catch (error) {
            const errMsg = error?.response?.data?.error || error?.message || 'Unknown error';
            console.error('REQUEST FAILED:', errMsg);
            Alert.alert('Request Failed', `Could not send request: ${errMsg}`);
        } finally { setLoading(false); }
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
                <View style={{ marginBottom: 28 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>Requesting {itemName}</Text>
                    <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>From: {ngoName}</Text>
                </View>

                <View style={{ gap: 14 }}>
                    <View style={INPUT_STYLE}>
                        <User size={18} color="#52525b" />
                        <TextInput style={TEXT_INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Your Name *" value={form.receiverName} onChangeText={(v) => setForm(p => ({ ...p, receiverName: v }))} />
                    </View>
                    <View style={INPUT_STYLE}>
                        <Text style={{ color: '#52525b', fontWeight: '700', fontSize: 16 }}>@</Text>
                        <TextInput style={TEXT_INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Your Email *" keyboardType="email-address" value={form.receiverEmail} onChangeText={(v) => setForm(p => ({ ...p, receiverEmail: v }))} />
                    </View>
                    <View style={INPUT_STYLE}>
                        <Phone size={18} color="#52525b" />
                        <TextInput style={TEXT_INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Your Phone *" keyboardType="phone-pad" value={form.receiverPhone} onChangeText={(v) => setForm(p => ({ ...p, receiverPhone: v }))} />
                    </View>
                    <View style={[INPUT_STYLE, { alignItems: 'flex-start' }]}>
                        <MapPin size={18} color="#52525b" style={{ marginTop: 4 }} />
                        <TextInput style={[TEXT_INPUT_STYLE, { height: 70, textAlignVertical: 'top' }]} placeholderTextColor="#52525b" placeholder="Your Delivery Address" multiline value={form.receiverAddress} onChangeText={(v) => setForm(p => ({ ...p, receiverAddress: v }))} />
                    </View>

                    <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
                        style={{ backgroundColor: '#818cf8', paddingVertical: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                        {loading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Send Request</Text>
                                <Send size={18} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ marginTop: 32, padding: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14 }}>
                    <Text style={{ color: '#3f3f46', fontSize: 11, textAlign: 'center', fontStyle: 'italic' }}>
                        By submitting this request, your contact details will be shared with {ngoName} to facilitate the item delivery/pickup.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
