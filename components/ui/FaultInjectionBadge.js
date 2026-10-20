import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FAULT_INJECTION_AVAILABLE,
  getFaultState,
  isAnyFaultActive,
  subscribeFaults,
} from '../../utils/storageFaultInjection';

/**
 * ⚠️ GEÇİCİ — KALDIRILACAK: depolama hata enjeksiyonu açıkken HER ekranda
 * görünen belirgin gösterge. Dokunmaları engellemez (pointerEvents="none").
 * Release/preview derlemesinde hiçbir şey çizmez.
 */
export default function FaultInjectionBadge() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(isAnyFaultActive());
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (!FAULT_INJECTION_AVAILABLE) return undefined;
    const update = () => {
      const state = getFaultState();
      setActive(isAnyFaultActive());
      const short = (k) => k.replace('@ajanda_', '').replace('_v1', '');
      setSummary(
        [
          state.read.length ? `okuma: ${state.read.map(short).join(',')}` : '',
          state.write.length ? `yazma: ${state.write.map(short).join(',')}` : '',
        ]
          .filter(Boolean)
          .join(' · ')
      );
    };
    update();
    return subscribeFaults(update);
  }, []);

  if (!FAULT_INJECTION_AVAILABLE || !active) return null;

  return (
    <View pointerEvents="none" style={[styles.badge, { bottom: insets.bottom + 6 }]}>
      <Text style={styles.text} numberOfLines={2}>
        HATA ENJEKSİYONU AÇIK — {summary}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#B71C1C',
    zIndex: 100000,
    elevation: 12,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
