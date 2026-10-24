import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/useAuthStore';
import { api } from '../../../lib/api';
import { Inbox, Clock, CheckCircle, Star, Package, ArrowLeft } from 'lucide-react-native';

const STATUS_CONFIG = {
    pending: { label: 'Pending', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', Icon: Clock },
    accepted: { label: 'Accepted', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', Icon: CheckCircle },
    donated: { label: 'Donated', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', Icon: CheckCircle },
    rejected: { label: 'Rejected', color: '#f87171', bg: 'rgba(248,113,113,0.1)', Icon: Inbox },
};

export default function MyRequests() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.email) return;
        api.get(`/api/kindshare/requests/receiver?email=${user.email}`)
            .then(res => setRequests(res.data))
            .catch(err => console.warn('Failed to load requests:', err.message))
            .finally(() => setLoading(false));
    }, [user]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050510', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#818cf8" />
                <Text style={{ color: '#a1a1aa', marginTop: 12 }}>Loading your requests...</Text>
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
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>My Requests</Text>
                    <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Track items you've requested from NGOs.</Text>
                </View>

                {requests.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 60, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
                        <Inbox size={44} color="#3f3f46" />
                        <Text style={{ color: '#52525b', marginTop: 12, fontSize: 16, fontWeight: '600' }}>No requests yet</Text>
                        <Text style={{ color: '#3f3f46', fontSize: 12, marginTop: 4 }}>Items you request will appear here.</Text>
                    </View>
                ) : (
                    requests.map((req, index) => {
                        const status = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                        const StatusIcon = status.Icon;
                        return (
                            <View key={req._id || index} style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                                        <Package size={16} color="#71717a" />
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }} numberOfLines={1}>{req.itemName || `Request #${index + 1}`}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: status.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 }}>
                                        <StatusIcon size={12} color={status.color} />
                                        <Text style={{ color: status.color, fontWeight: '600', fontSize: 11 }}>{status.label}</Text>
                                    </View>
                                </View>
                                <View style={{ gap: 4 }}>
                                    {(req.ngoName || req.ngoId) && <Text style={{ color: '#71717a', fontSize: 12 }}><Text style={{ color: '#a1a1aa', fontWeight: '600' }}>NGO: </Text>{req.ngoName || req.ngoId}</Text>}
                                    {req.donationId && <Text style={{ color: '#71717a', fontSize: 12 }}><Text style={{ color: '#a1a1aa', fontWeight: '600' }}>Donation ID: </Text>{req.donationId}</Text>}
                                    {req.message && <Text style={{ color: '#71717a', fontSize: 12 }}><Text style={{ color: '#a1a1aa', fontWeight: '600' }}>Message: </Text>{req.message}</Text>}
                                </View>

                                {req.status === 'donated' && (
                                    <TouchableOpacity activeOpacity={0.7}
                                        onPress={() => router.push({ pathname: '/kindshare/receiver/feedback', params: { ngoId: req.ngoId, ngoName: req.ngoName || 'NGO' } })}
                                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(250,204,21,0.08)', paddingVertical: 10, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(250,204,21,0.15)' }}>
                                        <Star size={14} color="#fbbf24" />
                                        <Text style={{ color: '#fbbf24', fontWeight: '600', fontSize: 13 }}>Rate this NGO</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}
