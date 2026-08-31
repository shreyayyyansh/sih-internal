import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, Platform } from 'react-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { api } from '../../../lib/api';
import { Package, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

const STATUS_CONFIG = {
    available: { label: 'Available', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', Icon: CheckCircle },
    accepted: { label: 'Accepted', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', Icon: CheckCircle },
    rejected: { label: 'Rejected', color: '#f87171', bg: 'rgba(248,113,113,0.1)', Icon: XCircle },
    pending: { label: 'Pending', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', Icon: Clock },
    donated: { label: 'Donated', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', Icon: CheckCircle },
};

export default function MyDonations() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.email) return;
        api.get(`/api/kindshare/donations/donor?email=${user.email}`)
            .then(res => setDonations(res.data))
            .catch(err => console.warn('Failed to load donations:', err.message))
            .finally(() => setLoading(false));
    }, [user]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050510', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#818cf8" />
                <Text style={{ color: '#a1a1aa', marginTop: 12 }}>Loading your donations...</Text>
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
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>My Donations</Text>
                    <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Track the status of items you've donated.</Text>
                </View>

                {donations.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 60, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
                        <Package size={44} color="#3f3f46" />
                        <Text style={{ color: '#52525b', marginTop: 12, fontSize: 16, fontWeight: '600' }}>No donations yet</Text>
                        <Text style={{ color: '#3f3f46', fontSize: 12, marginTop: 4 }}>Your donated items will appear here.</Text>
                    </View>
                ) : (
                    donations.map((donation, index) => {
                        const status = STATUS_CONFIG[donation.status] || STATUS_CONFIG.pending;
                        const StatusIcon = status.Icon;
                        return (
                            <View key={donation._id || index} style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 12 }}>
                                {donation.imageUrl && (
                                    <Image source={{ uri: donation.imageUrl }} style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }} resizeMode="cover" />
                                )}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 }}>{donation.itemName}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: status.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 }}>
                                        <StatusIcon size={12} color={status.color} />
                                        <Text style={{ color: status.color, fontWeight: '600', fontSize: 11 }}>{status.label}</Text>
                                    </View>
                                </View>
                                <View style={{ gap: 4 }}>
                                    {donation.category && <Text style={{ color: '#71717a', fontSize: 12 }}><Text style={{ color: '#a1a1aa', fontWeight: '600' }}>Category: </Text>{donation.category}</Text>}
                                    {donation.quantity && <Text style={{ color: '#71717a', fontSize: 12 }}><Text style={{ color: '#a1a1aa', fontWeight: '600' }}>Quantity: </Text>{donation.quantity}</Text>}
                                    {donation.description && <Text style={{ color: '#71717a', fontSize: 12 }}><Text style={{ color: '#a1a1aa', fontWeight: '600' }}>Description: </Text>{donation.description}</Text>}
                                    {donation.ngoName && <Text style={{ color: '#71717a', fontSize: 12 }}><Text style={{ color: '#a1a1aa', fontWeight: '600' }}>NGO: </Text>{donation.ngoName}</Text>}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}
