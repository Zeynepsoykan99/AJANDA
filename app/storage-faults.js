import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import {
  FAULT_INJECTION_AVAILABLE,
  FAULT_KEYS,
  clearAllFaults,
  getFaultState,
  setFault,
  subscribeFaults,
} from '../utils/storageFaultInjection';

/**
 * ⚠️ GEÇİCİ — TEŞHİS EKRANI — KALDIRILACAK (depolama hata enjeksiyonu)
 *
 * Anahtar bazında okuma/yazma hatasını açıp kapatır. YALNIZCA geliştirme
 * derlemesinde (__DEV__) çalışır; release/preview derlemesinde yalnızca
 * "kapalı" bilgisini gösterir ve hiçbir anahtarı değiştiremez.
 * Diskteki veriye dokunmaz; durum bellektedir, yeniden yüklemede sıfırlanır.
 */
const LABELS = {
  '@ajanda_pages': 'Sayfalar (Ajandam + Yapılacaklar)',
  '@ajanda_diary_v1': 'Günlük',
  '@ajanda_notebooks_v1': 'Defterler (Notlarım)',
  '@ajanda_cover': 'Ajanda kapağı',
};

export default function StorageFaultsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [state, setState] = useState(getFaultState());

  useEffect(() => subscribeFaults(() => setState(getFaultState())), []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Hata enjeksiyonu (geçici)</Text>
        {!FAULT_INJECTION_AVAILABLE ? (
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            Yalnızca geliştirme derlemesinde çalışır. Bu derlemede kapalı.
          </Text>
        ) : (
          <>
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              Diskteki veriye dokunmaz. Açık olan anahtarın okuması veya yazması gerçek depolamaya
              gitmeden hata verir. Uygulama yeniden yüklenince hepsi kapanır.
            </Text>
            {FAULT_KEYS.map((key) => (
              <View key={key} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.keyLabel, { color: colors.textPrimary }]}>{LABELS[key] || key}</Text>
                <Text style={[styles.keyName, { color: colors.textSecondary }]}>{key}</Text>
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Okuma hatası</Text>
                  <Switch value={state.read.includes(key)} onValueChange={(v) => setFault('read', key, v)} />
                </View>
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Yazma hatası</Text>
                  <Switch value={state.write.includes(key)} onValueChange={(v) => setFault('write', key, v)} />
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={clearAllFaults} style={styles.button}>
              <Text style={[styles.buttonText, { color: colors.accent }]}>Tümünü kapat</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text style={[styles.buttonText, { color: colors.accent }]}>Geri</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  keyLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  keyName: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 14,
  },
  button: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
