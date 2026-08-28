import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';

export default function DefterlerimScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Üst Bar / Geri Butonu */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
      </View>

      {/* Sayfa İçeriği */}
      <View style={styles.contentContainer}>
        <Text style={styles.pageTitle}>defterlerim</Text>
        <View style={styles.underline} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.powderPink.background,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.powderPink.border,
    shadowColor: COLORS.darkPink.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkPink.text,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.darkPink.text,
    letterSpacing: 1,
    textTransform: 'lowercase',
  },
  underline: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.powderPink.border,
    borderRadius: 2,
    marginTop: 8,
  },
});
