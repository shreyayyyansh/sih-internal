import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../lib/api';
import { Package, ChevronRight, Info, ArrowLeft } from 'lucide-react-native';

export default function ReceiverDonations() {
    const router = useRouter();
    const { ngoId, ngoName, category } = useLocalSearchParams();
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchDonations(); }, [ngoId, category]);

    const fetchDonations = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/kindshare/donations/available/${ngoId}`, { params: { category } });
            setDonations(response.data);
        } catch (error) { console.error(error); Alert.alert('Error', 'Failed to fetch available donations'); }
        finally { setLoading(false); }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050510', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#818cf8" />
                <Text style={{ color: '#a1a1aa', marginTop: 12 }}>Checking for available items...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#050510' }}>
            <View style={{ paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(5,5,16,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <TouchableOpacity onPress={() => router.back()} style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <ArrowLeft size={20} color="#a1a1aa" />
                </TouchableOpacity>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>Urban<Text style={{ color: '#818cf8' }}>Flow</Text></Text>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>{category} at {ngoName}</Text>
                    <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Available items for share request</Text>
                </View>

                {donations.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 60, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
                        <Package size={44} color="#3f3f46" />
                        <Text style={{ color: '#52525b', marginTop: 12, fontWeight: '500' }}>No items available at the moment.</Text>
                        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}>
                            <Text style={{ color: '#a1a1aa', fontWeight: '600' }}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    donations.map(item => (
                        <View key={item.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                            {item.imageUrl && (
                                <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
                            )}
                            <View style={{ padding: 16 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 }}>{item.itemName}</Text>
                                    <View style={{ backgroundColor: 'rgba(129,140,248,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                        <Text style={{ color: '#818cf8', fontWeight: '700', fontSize: 11 }}>Qty: {item.quantity}</Text>
                                    </View>
                                </View>
                                <Text style={{ color: '#71717a', fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
                                    {item.description || "No description provided."}
                                </Text>
                                <TouchableOpacity activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: '/kindshare/receiver/request-form', params: { ngoId, donationId: item.id, itemName: item.itemName, ngoName } })}
                                    style={{ backgroundColor: '#818cf8', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Request Item</Text>
                                    <ChevronRight size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}

                {donations.length > 0 && (
                    <View style={{ marginTop: 8, padding: 16, backgroundColor: 'rgba(129,140,248,0.06)', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(129,140,248,0.15)' }}>
                        <Info size={20} color="#818cf8" />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#818cf8', fontWeight: '700', fontSize: 13 }}>Important</Text>
                            <Text style={{ color: '#a1a1aa', fontSize: 11 }}>After receiving an item, please don't forget to rate the NGO.</Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
