import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Bell, Shield, Megaphone, Briefcase, Heart, Flame } from 'lucide-react-native';
import { useNotificationStore } from '../../../../../store/useNotificationStore';

const TYPE_ICONS = {
  safety: Shield,
  civic: Megaphone,
  job: Briefcase,
  ngo: Heart,
  fire: Flame,
  info: Bell,
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

export default function NotificationsTab() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {notifications.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Bell size={36} color="#3f3f46" />
            <Text style={{ color: '#52525b', marginTop: 12, fontSize: 14 }}>No notifications yet</Text>
          </View>
        ) : (
          notifications.map((notif) => {
            const Icon = TYPE_ICONS[notif.type] || Bell;
            const iconColor = notif.isRead ? '#6b7280' : '#818cf8';
            return (
              <TouchableOpacity
                key={notif.id}
                onPress={() => { if (!notif.isRead) markAsRead(notif.id); }}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255,255,255,0.08)',
                  gap: 12,
                  opacity: notif.isRead ? 0.5 : 1,
                }}
              >
                <View style={{ width: 32, alignItems: 'center', paddingTop: 2 }}>
                  <Icon size={24} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500', lineHeight: 20 }}>
                    {notif.message}
                  </Text>
                  <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
                    {formatTimeAgo(notif.createdAt)}
                  </Text>
                </View>
                {!notif.isRead && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#818cf8', marginTop: 6 }} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
