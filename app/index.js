import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CircleMenuButton from '../components/CircleMenuButton';
import { COLORS } from '../constants/colors';

export default function HomeScreen() {
  const menuItems = [
    { id: 'gunlugum', label: 'günlüğüm' },
    { id: 'defterlerim', label: 'defterlerim' },
    { id: 'ajandam', label: 'ajandam' },
  ];

  const handleMenuPress = (item) => {
    // İlerideki sayfa geçişleri ve işlemler için tıklama dinleyicisi
    console.log(`${item.label} seçildi`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık Bölümü */}
        <View style={styles.headerContainer}>
          <Text style={styles.appTitle}>AJANDA</Text>
          <View style={styles.titleUnderline} />
        </View>

        {/* Dairesel Butonlar Listesi */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <CircleMenuButton
              key={item.id}
              label={item.label}
              size={130}
              onPress={() => handleMenuPress(item)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.powderPink.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.darkPink.primary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  titleUnderline: {
    width: 48,
    height: 3,
    backgroundColor: COLORS.powderPink.border,
    borderRadius: 2,
    marginTop: 6,
  },
  menuContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
