import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Share,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import MoodPieChart from './MoodPieChart';
import {
  getAvailableMonths,
  getMonthlyMoodAnalytics,
  generateDynamicMoodCopy,
} from '../../services/moodAnalyticsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MONTH_NAMES = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
};

/**
 * MonthlyMoodAnalyticsModal - "Spotify Wrapped" Tarzı Aylık Duygu Özeti
 *
 * @param {object} props
 * @param {boolean} props.visible - Modal açık mı
 * @param {function} props.onClose - Modalı kapatma callback'i
 * @param {Array} props.pages - Günlük sayfaları listesi
 * @param {number} [props.initialYear] - Başlangıç yılı
 * @param {number} [props.initialMonth] - Başlangıç ayı (0-11)
 */
export default function MonthlyMoodAnalyticsModal({
  visible,
  onClose,
  pages = [],
  initialYear,
  initialMonth,
}) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();

  const currentLang = (i18n.language || 'tr').slice(0, 2);
  const monthNamesList = MONTH_NAMES[currentLang] || MONTH_NAMES.tr;

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(
    initialYear !== undefined ? initialYear : now.getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth !== undefined ? initialMonth : now.getMonth()
  );
  const [selectedSliceKey, setSelectedSliceKey] = useState(null);

  // Available months with data
  const availableMonths = useMemo(() => getAvailableMonths(pages), [pages]);

  // Current analytics calculation
  const analytics = useMemo(() => {
    return getMonthlyMoodAnalytics(pages, selectedYear, selectedMonth);
  }, [pages, selectedYear, selectedMonth]);

  // Dynamic copywriting
  const copy = useMemo(() => {
    return generateDynamicMoodCopy(analytics, t);
  }, [analytics, t]);

  const monthLabel = `${monthNamesList[selectedMonth]} ${selectedYear}`;

  // Month navigation: previous / next
  const handlePrevMonth = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setSelectedSliceKey(null);
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    setSelectedSliceKey(null);
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Share summary as text message
  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const appTitle = t('common.appName', 'AJANDA');
      const shareMessage = [
        `✨ ${monthLabel} Duygu Özeti (${appTitle}) ✨`,
        `🏆 Ayın Duygusu: ${copy.heroTitle}`,
        `💡 Günün Tespiti: ${copy.correlationTitle} — ${copy.correlationDesc}`,
        `💌 Ayın Mektubu: ${copy.letterText}`,
        analytics.positivityScore > 0 ? `🌟 Pozitif Gün Skoru: %${analytics.positivityScore}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      await Share.share({
        message: shareMessage,
        title: `${monthLabel} Duygu Özeti`,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: isDark ? '#120D1A' : '#FAF6F0' },
        ]}
        edges={['top', 'bottom']}
      >
        {/* Üst Bar: Başlık, Ay Gezintisi & Butonlar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={[styles.iconButton, { backgroundColor: isDark ? '#261B33' : '#EFE8DE' }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', 'Kapat')}
          >
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={isDark ? '#F5EDE0' : '#4E342E'}
            />
          </TouchableOpacity>

          <View style={styles.monthNavigator}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={styles.navArrow}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={22}
                color={isDark ? '#D1C4E9' : '#5D4037'}
              />
            </TouchableOpacity>

            <Text style={[styles.monthTitle, { color: isDark ? '#FFFFFF' : '#3E2723' }]}>
              {monthLabel}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={styles.navArrow}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={isDark ? '#D1C4E9' : '#5D4037'}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleShare}
            style={[styles.iconButton, { backgroundColor: isDark ? '#261B33' : '#EFE8DE' }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.share', 'Paylaş')}
          >
            <MaterialCommunityIcons
              name="share-variant-outline"
              size={20}
              color={isDark ? '#F5EDE0' : '#4E342E'}
            />
          </TouchableOpacity>
        </View>

        {/* Ana İçerik Kaydırma Alanı */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Spotify Wrapped Rozet Başlığı */}
          <View style={styles.wrappedTagContainer}>
            <MaterialCommunityIcons name="sparkles" size={15} color="#D81B60" />
            <Text style={styles.wrappedTagText}>
              {t('analytics.badgeTitle', 'DUYGU WRAPPED')}
            </Text>
          </View>

          {/* Kart 1: Ayın Şampiyon Duygusu (Hero Mood Banner) */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: isDark ? '#241432' : '#FFFDF9',
                borderColor: isDark ? '#3D2852' : '#EFE4D6',
              },
            ]}
          >
            <Text style={styles.heroEmoji}>
              {analytics.dominantMood?.emoji || '✨'}
            </Text>
            <Text
              style={[
                styles.heroTitle,
                { color: isDark ? '#FFFFFF' : '#3E2723' },
              ]}
            >
              {copy.heroTitle}
            </Text>
            <Text
              style={[
                styles.heroDesc,
                { color: isDark ? '#D1C4E9' : '#6D4C41' },
              ]}
            >
              {copy.heroDesc}
            </Text>

            {/* İstatistik Rozetleri */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: isDark ? '#1C0F28' : '#FAF5EE' }]}>
                <Text style={styles.statNumber}>{analytics.trackedMoodCount}</Text>
                <Text style={styles.statLabel}>{t('analytics.trackedDays', 'Kayıtlı Gün')}</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: isDark ? '#1C0F28' : '#FAF5EE' }]}>
                <Text style={styles.statNumber}>%{analytics.trackingRate}</Text>
                <Text style={styles.statLabel}>{t('analytics.consistency', 'İstikrar')}</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: isDark ? '#1C0F28' : '#FAF5EE' }]}>
                <Text style={styles.statNumber}>%{analytics.positivityScore}</Text>
                <Text style={styles.statLabel}>{t('analytics.positivity', 'Pozitiflik')}</Text>
              </View>
            </View>
          </View>

          {/* Kart 2: İnteraktif Donut Pasta Grafik */}
          {analytics.hasData ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#241432' : '#FFFDF9',
                  borderColor: isDark ? '#3D2852' : '#EFE4D6',
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="chart-donut" size={20} color="#AB47BC" />
                <Text
                  style={[
                    styles.cardTitle,
                    { color: isDark ? '#FFFFFF' : '#3E2723' },
                  ]}
                >
                  {t('analytics.chartTitle', 'Duygu Dağılımı')}
                </Text>
              </View>

              <MoodPieChart
                distribution={analytics.distribution}
                dominantMood={analytics.dominantMood}
                selectedKey={selectedSliceKey}
                onSelectKey={setSelectedSliceKey}
              />
            </View>
          ) : null}

          {/* Kart 3: Günün Tespiti (Korelasyon Kartı) */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#241432' : '#FFFDF9',
                borderColor: isDark ? '#3D2852' : '#EFE4D6',
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#FF7043" />
              <Text
                style={[
                  styles.cardTitle,
                  { color: isDark ? '#FFFFFF' : '#3E2723' },
                ]}
              >
                {copy.correlationTitle}
              </Text>
            </View>
            <Text
              style={[
                styles.cardBodyText,
                { color: isDark ? '#E1BEE7' : '#5D4037' },
              ]}
            >
              {copy.correlationDesc}
            </Text>
          </View>

          {/* Kart 4: Ayın Mektubu (Samimi & Motive Edici Özet) */}
          <View
            style={[
              styles.letterCard,
              {
                backgroundColor: isDark ? '#291838' : '#FAF3EB',
                borderColor: isDark ? '#4A2E66' : '#E6DACB',
              },
            ]}
          >
            <View style={styles.letterHeader}>
              <MaterialCommunityIcons name="email-heart-outline" size={20} color="#D81B60" />
              <Text style={styles.letterTitle}>
                {t('analytics.letterTitle', 'Ayın Sana Notu 💌')}
              </Text>
            </View>
            <Text style={styles.letterBodyText}>
              "{copy.letterText}"
            </Text>
          </View>

          {/* Alt Paylaş Butonu */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleShare}
            style={styles.bottomShareBtn}
          >
            <MaterialCommunityIcons name="share-variant" size={18} color="#FFFFFF" />
            <Text style={styles.bottomShareText}>
              {t('analytics.shareBadge', 'Özetimi Paylaş')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navArrow: {
    padding: 4,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  wrappedTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FCE4EC',
    alignSelf: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 14,
  },
  wrappedTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C2185B',
    letterSpacing: 1,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1.2,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  heroEmoji: {
    fontSize: 54,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#D81B60',
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8D6E63',
    marginTop: 2,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  cardBodyText: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  letterCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 20,
    borderStyle: 'dashed',
  },
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  letterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D81B60',
  },
  letterBodyText: {
    fontSize: 13.5,
    lineHeight: 21,
    fontStyle: 'italic',
    color: '#4E342E',
  },
  bottomShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C2185B',
    paddingVertical: 13,
    borderRadius: 24,
    shadowColor: '#C2185B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomShareText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
