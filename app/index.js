import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import CircleMenuButton from '../components/CircleMenuButton';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const menuItems = [
    { id: 'gunlugum', label: 'günlüğüm', route: '/gunlugum', icon: 'book-heart-outline' },
    { id: 'ajandam', label: 'ajandam', route: '/ajandam', icon: 'calendar-heart' },
    { id: 'notlarim', label: 'notlarım', route: '/defterlerim', icon: 'notebook-outline' },
  ];

  const handleMenuPress = (item) => {
    router.push(item.route);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık Bölümü */}
        <View style={styles.headerContainer}>
          <Text style={[styles.appTitle, { color: colors.textPrimary }]}>AJANDA</Text>
          <View style={[styles.titleUnderline, { backgroundColor: colors.border }]} />
        </View>

        {/* Dairesel Butonlar Listesi */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <CircleMenuButton
              key={item.id}
              label={item.label}
              iconName={item.icon}
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
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  titleUnderline: {
    width: 48,
    height: 3,
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
