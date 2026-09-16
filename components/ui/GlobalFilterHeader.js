import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import DatePickerModal from './DatePickerModal';
import GlobalSearchModal from './GlobalSearchModal';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

export const DATE_LOCALE_MAP = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
};

/**
 * Filtre tarihi için yerelleştirilmiş metin formatlayıcı
 */
export const formatFilterDate = (date, language = 'tr') => {
  if (!date) return '';
  const langKey = language?.slice(0, 2);
  const locale = DATE_LOCALE_MAP[langKey] || 'tr-TR';
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Gün bazlı tarih karşılaştırma yardımcısı
 */
export const isSameDay = (dateStr, targetDate) => {
  if (!dateStr || !targetDate) return false;
  const d = new Date(dateStr);
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
};


/**
 * GlobalFilterHeader - Uygulama Geneli Ortak Arama ve Tarih Filtreleme Başlık Bileşeni
 *
 * @param {string} [title] - Sayfa başlığı
 * @param {string} [searchCategory='all'] - GlobalSearchModal varsayılan sekmesi ('todo' | 'ajandam' | 'notlarim' | 'gunlugum' | 'all')
 * @param {Date|null} [filterDate=null] - Seçili filtre tarihi
 * @param {function} [onSelectDate] - Tarih seçildiğinde veya temizlendiğinde çağrılır: (date: Date | null) => void
 * @param {function} [onBack] - Geri butonuna basıldığında çağrılır (varsayılan: router.back())
 * @param {boolean} [showBack=true] - Geri butonu gösterilsin mi
 * @param {boolean} [showSearch=true] - Arama butonu gösterilsin mi
 * @param {boolean} [showDatePicker=true] - Tarih filtre butonu gösterilsin mi
 * @param {function} [onSearchPress] - Arama butonuna basıldığında özel callback (verilmezse dahili modal açılır)
 * @param {function} [onDatePickerPress] - Tarih butonuna basıldığında özel callback (verilmezse dahili modal açılır)
 * @param {React.ReactNode} [rightActions] - Sağ gruba eklenecek ilave butonlar (+ ekle butonu vb.)
 * @param {object} [containerStyle] - İlave stil
 */
export default function GlobalFilterHeader({
  title,
  searchCategory = 'all',
  filterDate = null,
  onSelectDate,
  onBack,
  showBack = true,
  showSearch = true,
  showDatePicker = true,
  onSearchPress,
  onDatePickerPress,
  rightActions,
  containerStyle,
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);

  // Filtre aktifken yerelleştirilmiş tarih metni
  const currentLocale = DATE_LOCALE_MAP[i18n.language?.slice(0, 2)] || 'tr-TR';
  const filterLabel = filterDate
    ? filterDate.toLocaleDateString(currentLocale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const handleSearchPress = () => {
    if (onSearchPress) onSearchPress();
    else setIsSearchModalVisible(true);
  };

  const handleDatePickerPress = () => {
    if (onDatePickerPress) onDatePickerPress();
    else setIsDatePickerVisible(true);
  };

  const handleDateSelect = (selectedDate) => {
    setIsDatePickerVisible(false);
    if (onSelectDate) onSelectDate(selectedDate);
  };

  const handleClearFilter = () => {
    if (onSelectDate) onSelectDate(null);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Üst Bar */}
      <View style={[styles.headerBar, isTablet && styles.tabletContainer]}>
        {showBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleBack}
            style={[
              styles.iconButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            accessibilityLabel={t('common.back', 'Geri')}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}

        {title ? (
          <Text
            style={[styles.pageTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : (
          <View style={styles.spacer} />
        )}

        <View style={styles.headerRightGroup}>
          {rightActions}

          {showSearch && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSearchPress}
              style={[
                styles.iconButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              accessibilityLabel={t('common.search', 'Ara...')}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {showDatePicker && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDatePickerPress}
              style={[
                styles.iconButton,
                {
                  backgroundColor: filterDate ? colors.accent + '20' : colors.card,
                  borderColor: filterDate ? colors.accent : colors.border,
                },
              ]}
              accessibilityLabel={t('datePicker.title', 'Tarihe Göre Filtrele')}
            >
              <MaterialCommunityIcons
                name="calendar-search"
                size={20}
                color={filterDate ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtre Aktif Çipi */}
      {filterDate && (
        <View style={[styles.filterChipContainer, isTablet && styles.tabletContainer]}>
          <View style={[styles.filterChip, { backgroundColor: colors.accent + '12' }]}>
            <MaterialCommunityIcons name="calendar-check" size={16} color={colors.accent} />
            <Text style={[styles.filterChipText, { color: colors.accent }]}>
              {filterLabel}
            </Text>
            <TouchableOpacity
              onPress={handleClearFilter}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('datePicker.clearFilter', 'Filtreyi Temizle')}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.accent + '80'} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Dahili Tarih Seçici Modal */}
      {showDatePicker && !onDatePickerPress && (
        <DatePickerModal
          visible={isDatePickerVisible}
          onClose={() => setIsDatePickerVisible(false)}
          onSelectDate={handleDateSelect}
          selectedDate={filterDate}
          onClearFilter={handleClearFilter}
        />
      )}

      {/* Dahili Global Arama Modalı */}
      {showSearch && !onSearchPress && (
        <GlobalSearchModal
          visible={isSearchModalVisible}
          onClose={() => setIsSearchModalVisible(false)}
          initialCategory={searchCategory}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabletContainer: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  spacer: {
    width: 38,
    height: 38,
  },
  pageTitle: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChipContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
