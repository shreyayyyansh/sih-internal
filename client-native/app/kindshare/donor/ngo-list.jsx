import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../lib/api';
import { MapPin, Star, AlertCircle, ArrowLeft } from 'lucide-react-native';

export default function DonorNGOList() {
    const router = useRouter();
    const { category, lat, lon } = useLocalSearchParams();
    const [ngos, setNgos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchNGOs(); }, [category, lat, lon]);

    const fetchNGOs = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/kindshare/ngos`, { params: { category, lat, lon } });
            setNgos(response.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch NGOs');
        } finally { setLoading(false); }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050510', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#818cf8" />
                <Text style={{ color: '#a1a1aa', marginTop: 12 }}>Finding nearby NGOs...</Text>
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
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>NGOs accepting {category}</Text>
                    <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Sorted by rating and proximity</Text>
                </View>

                {ngos.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                        <Text style={{ color: '#52525b' }}>No NGOs found for this category nearby.</Text>
                    </View>
                ) : (
                    ngos.map(ngo => {
                        const ngoId = ngo._id || ngo.id;
                        return (
                            <View key={ngoId} style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 16, marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{ngo.name}</Text>
                                        <Text style={{ color: '#71717a', fontSize: 12, marginTop: 4 }}>{ngo.address}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(250,204,21,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                        <Star size={12} color="#fbbf24" fill="#fbbf24" />
                                        <Text style={{ color: '#fbbf24', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>{typeof ngo.rating === 'number' ? ngo.rating.toFixed(1) : 'N/A'}</Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(129,140,248,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                        <MapPin size={12} color="#818cf8" />
                                        <Text style={{ color: '#818cf8', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
                                            {ngo.distance ? `${Number(ngo.distance).toFixed(2)} km` : 'N/A'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ gap: 8 }}>
                                    <TouchableOpacity
                                        onPress={() => router.push({ pathname: '/kindshare/donor/donate-form', params: { ngoId, ngoName: ngo.name } })}
                                        activeOpacity={0.7}
                                        style={{ backgroundColor: 'rgba(129,140,248,0.15)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                                    >
                                        <Text style={{ color: '#818cf8', fontWeight: '700', fontSize: 14 }}>Donate to this NGO</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => router.push({ pathname: '/kindshare/complaints', params: { ngoId, ngoName: ngo.name, role: 'Donor' } })}
                                        activeOpacity={0.7}
                                        style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 12, borderRadius: 12 }}
                                    >
                                        <AlertCircle size={14} color="#71717a" />
                                        <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>View Complaints & History</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}
