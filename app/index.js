import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import CircleMenuButton from '../components/CircleMenuButton';
import ThemePickerModal from '../components/ThemePickerModal';
import GlobalSearchModal from '../components/ui/GlobalSearchModal';
import LanguagePickerModal from '../components/LanguagePickerModal';
import PrivacySettingsModal from '../components/PrivacySettingsModal';
import { useTheme } from '../context/ThemeContext';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { getPrivacyPolicyUrl } from '../constants/links';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();
  const { t, i18n } = useTranslation();

  const [isThemeModalVisible, setIsThemeModalVisible] = React.useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = React.useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = React.useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = React.useState(false);

  const currentLang = (i18n.language || 'tr').substring(0, 2).toUpperCase();

  const menuItems = [
    { id: 'gunlugum', label: t('home.menuDiary', 'günlüğüm'), route: '/gunlugum', icon: 'book-heart-outline' },
    { id: 'ajandam', label: t('home.menuAgenda', 'ajandam'), route: '/ajandam', icon: 'calendar-heart' },
    { id: 'notlarim', label: t('home.menuNotes', 'notlarım'), route: '/defterlerim', icon: 'notebook-outline' },
    { id: 'todolist', label: t('home.menuTodoList', 'yapılacaklar'), route: '/todolist', icon: 'format-list-checkbox' },
  ];

  const handleMenuPress = (item) => {
    router.push(item.route);
  };

  // Gizlilik politikasi uygulama icinde degil tarayicida acilir: metin repodaki
  // docs/ klasorunde tutulup GitHub Pages ile yayinlanir, boylece magaza
  // formlarindaki adresle birebir ayni metin gosterilir.
  const handleOpenPrivacy = () => {
    const url = getPrivacyPolicyUrl(i18n.language);
    Linking.openURL(url).catch((error) => {
      // Sessiz kalmamali: tarayici acilamazsa kullanici neden olmadigini anlamaz
      console.warn('Gizlilik politikasi acilamadi:', url, error);
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık Bölümü */}
        <View style={styles.headerContainer}>
          {/* Buton Grubu (Dil / Tema / Gizlilik) — basligin USTUNDE kendi satirinda */}
          <View style={styles.headerRightButtons}>
            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setIsLanguageModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.langBadgeText, { color: colors.accent }]}>
                {currentLang}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setIsThemeModalVisible(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="palette-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setIsPrivacyModalVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel={t('privacy.settingsTitle', 'Gizlilik ve Veri')}
            >
              <MaterialCommunityIcons name="shield-lock-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.appTitle, { color: colors.textPrimary }]}>
            {t('home.appTitle', 'AJANDA')}
          </Text>
          <View style={[styles.titleUnderline, { backgroundColor: colors.border }]} />

        </View>

        {/* Hızlı Arama Çubuğu (Spotlight Search Bar) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsSearchModalVisible(true)}
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            isTablet && styles.tabletSearchBar,
          ]}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={colors.accent} />
          <Text style={[styles.searchBarPlaceholder, { color: colors.textSecondary + '99' }]}>
            {t('home.searchPlaceholder', 'Sayfa, not veya yapılacaklarda ara...')}
          </Text>
          <View style={[styles.searchBadge, { backgroundColor: colors.accent + '15' }]}>
            <MaterialCommunityIcons name="arrow-right" size={14} color={colors.accent} />
          </View>
        </TouchableOpacity>

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

        {/* Gizlilik Politikasi — menunun en altinda kucuk bir satir */}
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={handleOpenPrivacy}
          style={styles.privacyLink}
          accessibilityRole="link"
        >
          <Text style={[styles.privacyLinkText, { color: colors.textSecondary }]}>
            {t('home.privacyPolicy', 'Gizlilik Politikası')}
          </Text>
          <MaterialCommunityIcons
            name="open-in-new"
            size={12}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </ScrollView>

      {/* Dil Seçici Modal */}
      <LanguagePickerModal
        visible={isLanguageModalVisible}
        onClose={() => setIsLanguageModalVisible(false)}
      />

      {/* Gizlilik ve Veri Ayarları */}
      <PrivacySettingsModal
        visible={isPrivacyModalVisible}
        onClose={() => setIsPrivacyModalVisible(false)}
      />

      {/* Tema Seçici Modal */}
      <ThemePickerModal
        visible={isThemeModalVisible}
        onClose={() => setIsThemeModalVisible(false)}
      />

      {/* Global Arama Modalı */}
      <GlobalSearchModal
        visible={isSearchModalVisible}
        onClose={() => setIsSearchModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  privacyLink: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 28,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  privacyLinkText: {
    fontSize: 12,
    opacity: 0.75,
    textDecorationLine: 'underline',
  },
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
  // Butonlar MUTLAK konumlandirilmaz. Onceden `position: 'absolute'` ile sag
  // uste sabitlenmislerdi; basligin ortalanmis genisligiyle dar ekranlarda
  // kaciniimaz olarak cakisiyorlardi (ucuncu buton eklenince daha da kotulesti).
  // Artik kendi satirlarinda, akisin icinde duruyorlar: hicbir genislikte
  // cakisma olusamaz.
  headerRightButtons: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  langBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  searchBar: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 28,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tabletSearchBar: {
    maxWidth: 520,
    paddingVertical: 14,
    marginBottom: 36,
  },
  searchBarPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  searchBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
