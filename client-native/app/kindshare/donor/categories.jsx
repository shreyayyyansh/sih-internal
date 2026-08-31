import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Shirt, BookOpen, Pill, Zap, MoreHorizontal, MapPin, ArrowLeft } from 'lucide-react-native';

export default function DonorCategories() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const categories = [
        { title: 'Clothes', icon: Shirt },
        { title: 'Books', icon: BookOpen },
        { title: 'Medicines', icon: Pill },
        { title: 'Electronics', icon: Zap },
        { title: 'Others', icon: MoreHorizontal },
    ];

    const fetchLocationAndNavigate = async (category) => {
        try {
            setLoading(true);
            let lat = '';
            let lon = '';
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeout: 5000 });
                    lat = loc.coords.latitude;
                    lon = loc.coords.longitude;
                }
            } catch (locError) {
                console.warn('Location unavailable, proceeding without it:', locError.message);
            }
            router.push({ pathname: '/kindshare/donor/ngo-list', params: { category, lat, lon } });
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
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
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>What would you like to donate?</Text>
                    <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 4 }}>Select a category to see NGOs near you.</Text>
                </View>

                {loading && (
                    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                        <ActivityIndicator color="#818cf8" />
                        <Text style={{ color: '#818cf8', marginTop: 8, fontSize: 13 }}>Detecting location...</Text>
                    </View>
                )}

                <View style={{ gap: 12 }}>
                    {categories.map((cat, index) => {
                        const CatIcon = cat.icon;
                        return (
                            <TouchableOpacity
                                key={index}
                                disabled={loading}
                                onPress={() => fetchLocationAndNavigate(cat.title)}
                                activeOpacity={0.7}
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, gap: 16 }}
                            >
                                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                    <CatIcon size={22} color="#d4d4d8" />
                                </View>
                                <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' }}>{cat.title}</Text>
                                <MapPin size={18} color="#52525b" />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={{ marginTop: 24, padding: 16, backgroundColor: 'rgba(129,140,248,0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(129,140,248,0.15)' }}>
                    <Text style={{ color: '#818cf8', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>Why do we need location?</Text>
                    <Text style={{ color: '#a1a1aa', fontSize: 12, lineHeight: 18 }}>We use your location to sort NGOs by proximity, making it easier for you to drop off donations or for them to collect.</Text>
                </View>
            </ScrollView>
        </View>
    );
}
