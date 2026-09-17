import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { MOODS, getMoodEmoji } from '../../constants/moods';
export { MOODS, getMoodEmoji };

const LOCALE_MAP = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
};

/**
 * Format date for diary page badge (e.g., "17 Eyl 2026")
 */
export const formatBadgeDate = (dateVal, language = 'tr') => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const langKey = (language || 'tr').slice(0, 2);
    const locale = LOCALE_MAP[langKey] || 'tr-TR';
    return d.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

/**
 * DiaryDateMoodBadge - Günlük Sayfası Sağ Üst Tarih ve Duygu Durumu Rozeti
 *
 * Tıpkı fiziksel bir günlükte olduğu gibi kağıdın sağ üst köşesine oturan,
 * sayfa ile birlikte orantılı büyüyen nostaljik mühür rozeti.
 *
 * @param {object} props
 * @param {string|Date} props.createdAt - Sayfanın tarihi
 * @param {string|null} props.mood - Sayfanın duygu durumu ('happy', 'tired' vb.)
 * @param {function} props.onPress - Tıklandığında MoodPickerModal açar
 * @param {boolean} [props.disabled=false] - Çizim veya export modunda dokunmayı devre dışı bırakır
 * @param {object} [props.style] - Ek stil
 */
export default function DiaryDateMoodBadge({
  createdAt,
  mood,
  onPress,
  disabled = false,
  style,
}) {
  const { t, i18n } = useTranslation();

  const formattedDate = formatBadgeDate(createdAt || new Date(), i18n.language);
  const moodEmoji = getMoodEmoji(mood);

  const handlePress = () => {
    if (disabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    onPress && onPress();
  };

  return (
    <View
      style={[styles.container, style]}
      pointerEvents={disabled ? 'none' : 'box-none'}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handlePress}
        disabled={disabled}
        style={styles.badge}
        accessibilityRole="button"
        accessibilityLabel={`${formattedDate}, ${mood ? t(`mood.${mood}`, mood) : t('mood.title', 'Duygu')}`}
      >
        {/* Tarih Bölümü */}
        <View style={styles.dateRow}>
          <MaterialCommunityIcons
            name="calendar-today"
            size={11}
            color="#8D6E63"
            style={styles.calendarIcon}
          />
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        {/* İnce Ayraç */}
        <View style={styles.divider} />

        {/* Duygu Durumu Emojisi veya Ekle Rozeti */}
        <View style={styles.moodRow}>
          {moodEmoji ? (
            <Text style={styles.moodEmoji}>{moodEmoji}</Text>
          ) : (
            <View style={styles.addMoodWrapper}>
              <Text style={styles.addMoodPlaceholder}>💭</Text>
              <Text style={styles.addMoodText}>{t('mood.addMood', 'His')}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 6,
    right: 14,
    zIndex: 35,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE85',
    borderColor: '#8D6E6330',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 3,
    paddingHorizontal: 8,
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    gap: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calendarIcon: {
    opacity: 0.85,
  },
  dateText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#6D4C41',
    letterSpacing: 0.2,
  },
  divider: {
    width: 1,
    height: 10,
    backgroundColor: '#8D6E6330',
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 13,
    lineHeight: 15,
  },
  addMoodWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addMoodPlaceholder: {
    fontSize: 10,
  },
  addMoodText: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#8D6E63',
  },
});
