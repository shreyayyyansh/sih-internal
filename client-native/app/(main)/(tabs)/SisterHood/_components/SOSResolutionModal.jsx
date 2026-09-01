import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react-native';

/**
 * SOSResolutionModal
 * Shown when a user deactivates SOS. Asks them to classify the outcome.
 *
 * @param {boolean} visible - whether the modal is shown
 * @param {function} onOutcome - callback with 'FALSE_ALARM' | 'REAL_EMERGENCY'
 */
export default function SOSResolutionModal({ visible, onOutcome }) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* Header */}
          <View style={styles.header}>
            <ShieldAlert size={28} color="#ef4444" />
            <Text style={styles.title}>SOS Deactivated</Text>
          </View>

          <Text style={styles.subtitle}>
            Was this a false alarm?
          </Text>
          <Text style={styles.description}>
            Your answer helps us keep the safety map accurate and builds your trust score.
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Option: False Alarm */}
          <Pressable
            style={[styles.optionButton, styles.falseAlarmButton]}
            onPress={() => onOutcome('FALSE_ALARM')}
            android_ripple={{ color: 'rgba(239,68,68,0.3)' }}
          >
            <ShieldX size={20} color="#ef4444" />
            <View style={styles.optionTextBlock}>
              <Text style={styles.optionTitle}>Yes, False Alarm</Text>
              <Text style={styles.optionSub}>I accidentally triggered SOS</Text>
            </View>
          </Pressable>

          {/* Option: Real Emergency */}
          <Pressable
            style={[styles.optionButton, styles.realEmergencyButton]}
            onPress={() => onOutcome('REAL_EMERGENCY')}
            android_ripple={{ color: 'rgba(34,197,94,0.3)' }}
          >
            <ShieldCheck size={20} color="#22c55e" />
            <View style={styles.optionTextBlock}>
              <Text style={[styles.optionTitle, styles.textGreen]}>No — Real Emergency</Text>
              <Text style={styles.optionSub}>I needed help</Text>
            </View>
          </Pressable>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#e4e4e7',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  description: {
    color: '#71717a',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#27272a',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  falseAlarmButton: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  realEmergencyButton: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderColor: 'rgba(34,197,94,0.3)',
  },
  optionTextBlock: {
    flex: 1,
  },
  optionTitle: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
  textGreen: {
    color: '#22c55e',
  },
  optionSub: {
    color: '#71717a',
    fontSize: 12,
    marginTop: 2,
  },
});
