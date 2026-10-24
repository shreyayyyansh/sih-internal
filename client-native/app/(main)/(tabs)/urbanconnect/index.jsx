import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Search, User, Plus, Megaphone } from 'lucide-react-native';
import { router } from 'expo-router';

import FeedTab from './components/FeedTab';
import ExploreTab from './components/ExploreTab';
import ProfileTab from './components/ProfileTab';
import AnnouncementsTab from './components/AnnouncementsTab';

export default function UrbanConnect() {
  const [activeTab, setActiveTab] = useState('feed');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Dynamic Header */}
      <View style={{ 
        height: 50, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1, 
        borderBottomColor: 'rgba(255,255,255,0.08)' 
      }}>
        {/* UrbanFlow Logo Top Left */}
        <Image source={require('../../../../assets/images/logo.png')} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="contain" />
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
          {activeTab === 'feed' ? 'UrbanConnect' : 
           activeTab === 'explore' ? 'Explore' : 
           activeTab === 'profile' ? 'Profile' : 'Announcements'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {activeTab === 'feed' && <FeedTab />}
        {activeTab === 'explore' && <ExploreTab />}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'announcements' && <AnnouncementsTab />}
      </View>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        onPress={() => router.push('/(main)/(tabs)/urbanconnect/create')}
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 140 : 120,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#3b82f6',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#3b82f6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 5,
        }}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#fff" />
      </TouchableOpacity>

      {/* Custom Bottom Tab Bar */}
      <View style={{ 
        flexDirection: 'row', 
        height: Platform.OS === 'ios' ? 84 : 64, 
        backgroundColor: '#050510', 
        borderTopWidth: 1, 
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingBottom: Platform.OS === 'ios' ? 20 : 0
      }}>
        {['feed', 'explore', 'profile', 'announcements'].map((tab) => {
          const Icon = 
            tab === 'feed' ? Home : 
            tab === 'explore' ? Search : 
            tab === 'profile' ? User : Megaphone;
            
          const isActive = activeTab === tab;
          
          return (
            <TouchableOpacity 
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            >
              <Icon size={26} color={isActive ? '#fff' : '#71717a'} fill={isActive ? '#fff' : 'transparent'} />
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
