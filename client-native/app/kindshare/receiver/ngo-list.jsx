import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../lib/api';
import { MapPin, Star, ChevronRight, AlertCircle, Eye, ArrowLeft } from 'lucide-react-native';

export default function ReceiverNGOList() {
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
        } catch (error) { console.error(error); Alert.alert('Error', 'Failed to fetch NGOs'); }
        finally { setLoading(false); }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050510', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#818cf8" />
                <Text style={{ color: '#a1a1aa', marginTop: 12 }}>Finding nearby NGOs with {category}...</Text>
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
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>NGOs providing {category}</Text>
                    <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Select an NGO to view items or file a complaint</Text>
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
                                <View style={{ marginBottom: 10 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', flex: 1 }}>{ngo.name}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(250,204,21,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                            <Star size={11} color="#fbbf24" fill="#fbbf24" />
                                            <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>{typeof ngo.rating === 'number' ? ngo.rating.toFixed(1) : 'N/A'}</Text>
                                        </View>
                                    </View>
                                    {ngo.address && <Text style={{ color: '#71717a', fontSize: 12 }} numberOfLines={1}>{ngo.address}</Text>}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                        <MapPin size={12} color="#818cf8" />
                                        <Text style={{ color: '#a1a1aa', fontSize: 12, marginLeft: 4, fontWeight: '500' }}>
                                            {ngo.distance ? `${Number(ngo.distance).toFixed(2)} km away` : 'Distance unknown'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={{ gap: 8 }}>
                                    <TouchableOpacity activeOpacity={0.7}
                                        onPress={() => router.push({ pathname: '/kindshare/receiver/donations', params: { ngoId, ngoName: ngo.name, category } })}
                                        style={{ backgroundColor: 'rgba(129,140,248,0.15)', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <Eye size={16} color="#818cf8" />
                                        <Text style={{ color: '#818cf8', fontWeight: '700', fontSize: 14 }}>View Available Items</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity activeOpacity={0.7}
                                        onPress={() => router.push({ pathname: '/kindshare/complaints', params: { ngoId, ngoName: ngo.name, role: 'Receiver' } })}
                                        style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 12, borderRadius: 12 }}>
                                        <AlertCircle size={14} color="#71717a" />
                                        <Text style={{ color: '#a1a1aa', fontWeight: '600', fontSize: 13 }}>File Complaint & View History</Text>
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
