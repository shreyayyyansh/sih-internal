import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, HandHeart, Package, Inbox, ArrowLeft } from 'lucide-react-native';

export default function KindShareHome() {
  const router = useRouter();

  const menuItems = [
    {
      title: 'Donate Items',
      description: 'Help others by donating clothes, books, medicines, and more.',
      icon: HandHeart,
      onPress: () => router.push('/kindshare/donor/categories'),
    },
    {
      title: 'Receive Items',
      description: 'Find available items from NGOs in your area.',
      icon: Heart,
      onPress: () => router.push('/kindshare/receiver/categories'),
    },
    {
      title: 'My Donations',
      description: 'Track the status of items you have donated.',
      icon: Package,
      onPress: () => router.push('/kindshare/donor/my-donations'),
    },
    {
      title: 'My Requests',
      description: 'View items you have requested from NGOs.',
      icon: Inbox,
      onPress: () => router.push('/kindshare/receiver/my-requests'),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#050510' }}>
      {/* Header */}
      <View style={{ paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(5,5,16,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={20} color="#a1a1aa" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }}>
            Urban<Text style={{ color: '#818cf8' }}>Flow</Text>
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>KindShare</Text>
          <Text style={{ fontSize: 14, color: '#a1a1aa', marginTop: 4 }}>AI-powered resource redistribution for communities.</Text>
        </View>

        <View style={{ gap: 12 }}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                onPress={item.onPress}
                activeOpacity={0.7}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} color="#d4d4d8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 3 }}>{item.title}</Text>
                  <Text style={{ color: '#a1a1aa', fontSize: 12, lineHeight: 17 }}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
