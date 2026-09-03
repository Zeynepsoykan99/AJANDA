import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CircleMenuButton from '../components/CircleMenuButton';
import ThemePickerModal from '../components/ThemePickerModal';
import { useTheme } from '../context/ThemeContext';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();
  const [isThemeModalVisible, setIsThemeModalVisible] = React.useState(false);

  const menuItems = [
    { id: 'gunlugum', label: 'günlüğüm', route: '/gunlugum', icon: 'book-heart-outline' },
    { id: 'ajandam', label: 'ajandam', route: '/ajandam', icon: 'calendar-heart' },
    { id: 'notlarim', label: 'notlarım', route: '/defterlerim', icon: 'notebook-outline' },
    { id: 'todolist', label: 'yapılacaklar', route: '/todolist', icon: 'format-list-checkbox' },
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
          
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setIsThemeModalVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="palette-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Dairesel Butonlar Listesi */}
        <View style={[styles.menuContainer, isTablet && styles.tabletMenuContainer]}>
          {menuItems.map((item) => (
            <CircleMenuButton
              key={item.id}
              label={item.label}
              iconName={item.icon}
              size={isTablet ? 160 : 130}
              onPress={() => handleMenuPress(item)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Tema Seçici Modal */}
      <ThemePickerModal
        visible={isThemeModalVisible}
        onClose={() => setIsThemeModalVisible(false)}
      />
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
    position: 'relative',
    width: '100%',
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
  settingsButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 10,
  },
  tabletMenuContainer: {
    gap: 40,
    paddingHorizontal: 40,
    marginTop: 24,
  },
});
