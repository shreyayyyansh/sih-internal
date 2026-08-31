import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
let ImagePicker = null;
try { ImagePicker = require('expo-image-picker'); } catch (e) { console.warn('expo-image-picker not available'); }
import { api } from '../../../lib/api';
import { Camera, Package, ChevronDown, ArrowLeft } from 'lucide-react-native';

const INPUT_STYLE = { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14 };

export default function DonateForm() {
    const router = useRouter();
    const { ngoId, ngoName } = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState(null);
    const [form, setForm] = useState({ donorName: '', donorEmail: '', donorPhone: '', donorAddress: '', itemName: '', category: '', quantity: '', description: '' });
    const categories = ["Clothes", "Books", "Medicines", "Electronics", "Others"];

    const pickImage = async () => {
        if (!ImagePicker) { Alert.alert('Not Available', 'Image picking requires a development build.'); return; }
        try {
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 });
            if (!result.canceled) setImage(result.assets[0]);
        } catch (e) { Alert.alert('Not Available', 'Image picking is not supported in Expo Go.'); }
    };

    const handleSubmit = async () => {
        if (!form.donorName || !form.itemName || !form.category || !form.quantity) { Alert.alert('Error', 'Please fill in all mandatory fields.'); return; }
        try {
            setLoading(true);
            let imageUrl = '';
            if (image) {
                const formData = new FormData();
                const fileName = image.uri.split('/').pop();
                const fileType = fileName.split('.').pop();
                formData.append('image', { uri: image.uri, name: fileName, type: `image/${fileType}` });
                const uploadRes = await api.post('/api/kindshare/donations/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                imageUrl = uploadRes.data.imageUrl;
            }
            await api.post('/api/kindshare/donations', { ngoId, imageUrl, status: 'pending', ...form });
            Alert.alert('Success', 'Donation submitted! The NGO will review your post.', [{ text: 'OK', onPress: () => router.replace('/kindshare') }]);
        } catch (error) { console.error(error); Alert.alert('Error', 'Submission failed. Please try again.'); }
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
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>Donate to {ngoName}</Text>
                    <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Provide details of your donation</Text>
                </View>

                <View style={{ gap: 20 }}>
                    {/* Donor Info */}
                    <View style={{ gap: 12 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#52525b', letterSpacing: 1.5, textTransform: 'uppercase' }}>Your Information</Text>
                        <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Full Name *" value={form.donorName} onChangeText={(v) => setForm(p => ({ ...p, donorName: v }))} />
                        <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Email *" keyboardType="email-address" value={form.donorEmail} onChangeText={(v) => setForm(p => ({ ...p, donorEmail: v }))} />
                        <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Phone Number *" keyboardType="phone-pad" value={form.donorPhone} onChangeText={(v) => setForm(p => ({ ...p, donorPhone: v }))} />
                        <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Pickup Address" multiline value={form.donorAddress} onChangeText={(v) => setForm(p => ({ ...p, donorAddress: v }))} />
                    </View>

                    {/* Item Info */}
                    <View style={{ gap: 12 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#52525b', letterSpacing: 1.5, textTransform: 'uppercase' }}>Item Details</Text>
                        <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                <Text style={{ flex: 1, color: form.category ? '#fff' : '#52525b', fontSize: 14 }}>{form.category || "Select Category *"}</Text>
                                <ChevronDown size={18} color="#52525b" />
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                                {categories.map(cat => (
                                    <TouchableOpacity key={cat} onPress={() => setForm(p => ({ ...p, category: cat }))}
                                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, backgroundColor: form.category === cat ? 'rgba(129,140,248,0.2)' : 'transparent', borderColor: form.category === cat ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.1)' }}>
                                        <Text style={{ color: form.category === cat ? '#818cf8' : '#a1a1aa', fontWeight: form.category === cat ? '700' : '500', fontSize: 13 }}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="What are you donating? *" value={form.itemName} onChangeText={(v) => setForm(p => ({ ...p, itemName: v }))} />
                        <TextInput style={INPUT_STYLE} placeholderTextColor="#52525b" placeholder="Quantity (e.g., 2 bags, 5 units) *" value={form.quantity} onChangeText={(v) => setForm(p => ({ ...p, quantity: v }))} />
                        <TextInput style={[INPUT_STYLE, { height: 90, textAlignVertical: 'top' }]} placeholderTextColor="#52525b" placeholder="Short description or condition of item" multiline value={form.description} onChangeText={(v) => setForm(p => ({ ...p, description: v }))} />
                    </View>

                    {/* Image */}
                    <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#52525b', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>Item Photo (Optional)</Text>
                        <TouchableOpacity onPress={pickImage} style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', padding: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            {image ? (
                                <Image source={{ uri: image.uri }} style={{ width: '100%', height: 160, borderRadius: 12 }} />
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <Camera size={36} color="#52525b" />
                                    <Text style={{ color: '#52525b', marginTop: 8, fontWeight: '500' }}>Add Photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
                        style={{ backgroundColor: '#818cf8', paddingVertical: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                        {loading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Package size={20} color="white" />
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Submit Donation</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}
