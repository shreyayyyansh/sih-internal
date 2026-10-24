import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { api } from '../../lib/api';
import { MapPin, CheckCircle, ArrowLeft } from 'lucide-react-native';

const INPUT_STYLE = { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14 };

export default function RegisterNGO() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', adminName: '', email: '', phone: '', address: '', description: '', categories: [], lat: null, lon: null });
    const categoryOptions = ["Clothes", "Books", "Medicines", "Electronics", "Others"];

    const toggleCategory = (cat) => {
        setForm(prev => ({ ...prev, categories: prev.categories.includes(cat) ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat] }));
    };

    const fetchLocation = async () => {
        try {
            setLoading(true);
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission Denied', 'Permission to access location was denied'); return; }
            let location = await Location.getCurrentPositionAsync({});
            setForm(prev => ({ ...prev, lat: location.coords.latitude, lon: location.coords.longitude }));
            Alert.alert('Success', 'Location detected successfully!');
        } catch (error) { Alert.alert('Error', 'Failed to fetch location'); }
        finally { setLoading(false); }
    };

    const detectAddressLocation = async () => {
        if (!form.address) { Alert.alert('Error', 'Please enter an address first'); return; }
        try {
            setLoading(true);
            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(form.address)}`;
            const res = await fetch(url);
            const data = await res.json();
            if (!data.length) { Alert.alert('Error', 'Location not found'); return; }
            setForm(prev => ({ ...prev, lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), address: data[0].display_name }));
            Alert.alert('Success', 'Address location detected!');
        } catch (err) { Alert.alert('Error', 'Failed to detect location for address'); }
        finally { setLoading(false); }
    };

    const handleSubmit = async () => {
        if (!form.lat || !form.lon) { Alert.alert('Error', 'Please detect location first'); return; }
        if (!form.name || !form.adminName || !form.email) { Alert.alert('Error', 'Please fill all required fields'); return; }
        try {
            setLoading(true);
            await api.post('/api/kindshare/ngos/register', { ...form });
            Alert.alert('Success', 'NGO registered successfully for approval.');
            router.replace('/kindshare');
        } catch (error) { Alert.alert('Error', 'Failed to register NGO'); console.error(error); }
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
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 24 }}>Register Your NGO</Text>

                <View style={{ gap: 18 }}>
                    <View style={{ gap: 6 }}>
                        <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>NGO Name *</Text>
                        <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Enter NGO Name" value={form.name} onChangeText={(v) => setForm(p => ({ ...p, name: v }))} />
                    </View>

                    <View style={{ gap: 6 }}>
                        <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>Admin Name *</Text>
                        <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Enter Admin Name" value={form.adminName} onChangeText={(v) => setForm(p => ({ ...p, adminName: v }))} />
                    </View>

                    <View style={{ gap: 6 }}>
                        <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>Admin Email *</Text>
                        <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Enter Email" keyboardType="email-address" value={form.email} onChangeText={(v) => setForm(p => ({ ...p, email: v }))} />
                    </View>

                    <View style={{ gap: 6 }}>
                        <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>Phone Number</Text>
                        <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Enter Phone Number" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm(p => ({ ...p, phone: v }))} />
                    </View>

                    <View style={{ gap: 6 }}>
                        <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>NGO Address</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput style={[INPUT_STYLE, { flex: 1 }]} placeholderTextColor="#52525b" placeholder="Enter Address" value={form.address} onChangeText={(v) => setForm(p => ({ ...p, address: v }))} />
                            <TouchableOpacity onPress={detectAddressLocation} style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center' }}>
                                <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>Detect</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity onPress={fetchLocation} activeOpacity={0.7}
                        style={{ backgroundColor: 'rgba(129,140,248,0.12)', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(129,140,248,0.2)' }}>
                        <MapPin size={18} color="#818cf8" />
                        <Text style={{ color: '#818cf8', fontWeight: '700', fontSize: 14 }}>Use Current GPS Location</Text>
                    </TouchableOpacity>

                    {form.lat && (
                        <View style={{ backgroundColor: 'rgba(74,222,128,0.08)', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(74,222,128,0.15)' }}>
                            <CheckCircle size={14} color="#4ade80" />
                            <Text style={{ color: '#4ade80', fontSize: 12 }}>Location set: {form.lat.toFixed(4)}, {form.lon.toFixed(4)}</Text>
                        </View>
                    )}

                    <View style={{ gap: 6 }}>
                        <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>Description</Text>
                        <TextInput style={[INPUT_STYLE, { height: 90, textAlignVertical: 'top' }]} placeholderTextColor="#52525b" placeholder="Enter NGO Description" multiline value={form.description} onChangeText={(v) => setForm(p => ({ ...p, description: v }))} />
                    </View>

                    <View style={{ gap: 8 }}>
                        <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13, marginBottom: 4 }}>Categories Accepted</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {categoryOptions.map(cat => (
                                <TouchableOpacity key={cat} onPress={() => toggleCategory(cat)}
                                    style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: form.categories.includes(cat) ? 'rgba(129,140,248,0.2)' : 'transparent', borderColor: form.categories.includes(cat) ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.1)' }}>
                                    <Text style={{ color: form.categories.includes(cat) ? '#818cf8' : '#71717a', fontWeight: form.categories.includes(cat) ? '700' : '500', fontSize: 13 }}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
                        style={{ backgroundColor: '#818cf8', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, marginBottom: 20 }}>
                        {loading ? <ActivityIndicator color="white" /> : (
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Register NGO</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
