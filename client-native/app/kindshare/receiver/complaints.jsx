import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/useAuthStore';
import { api } from '../../../lib/api';
import { AlertCircle, Building2, ChevronRight, ArrowLeft } from 'lucide-react-native';

export default function ReceiverComplaints() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [ngos, setNgos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchNGOs(); }, []);

    const fetchNGOs = async () => {
        try { setLoading(true); const response = await api.get('/api/kindshare/ngos'); setNgos(response.data); }
        catch (error) { console.warn('Failed to fetch NGOs:', error.message); }
        finally { setLoading(false); }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050510', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#818cf8" />
                <Text style={{ color: '#a1a1aa', marginTop: 12 }}>Loading NGOs...</Text>
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

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={{ paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <AlertCircle size={28} color="#f87171" />
                    <View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>File a Complaint</Text>
                        <Text style={{ color: '#71717a', fontSize: 12, marginTop: 2 }}>Select an NGO to file a complaint or view history</Text>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 20 }}>
                    {ngos.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 60, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
                            <Building2 size={44} color="#3f3f46" />
                            <Text style={{ color: '#52525b', marginTop: 12, fontSize: 16, fontWeight: '600' }}>No NGOs found</Text>
                            <Text style={{ color: '#3f3f46', fontSize: 12, marginTop: 4 }}>There are no registered NGOs at the moment.</Text>
                        </View>
                    ) : (
                        ngos.map((ngo) => {
                            const ngoId = ngo._id || ngo.id;
                            return (
                                <TouchableOpacity
                                    key={ngoId}
                                    activeOpacity={0.7}
                                    onPress={() => router.push({ pathname: '/kindshare/complaints', params: { ngoId, ngoName: ngo.name, role: 'Receiver' } })}
                                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                                >
                                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(248,113,113,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                                        <AlertCircle size={20} color="#f87171" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{ngo.name}</Text>
                                        {ngo.address && <Text style={{ color: '#71717a', fontSize: 11, marginTop: 2 }} numberOfLines={1}>{ngo.address}</Text>}
                                        <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '500', marginTop: 3 }}>Tap to file complaint or view history</Text>
                                    </View>
                                    <ChevronRight size={18} color="#3f3f46" />
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
