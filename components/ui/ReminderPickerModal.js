import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import DatePickerModal from './DatePickerModal';
import { formatFilterDate } from './GlobalFilterHeader';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

/**
 * ReminderPickerModal - Şık, çok dilli ve temaya uyumlu Tarih/Saat Hatırlatıcı Seçici
 *
 * @param {boolean} visible - Modal açık mı
 * @param {function} onClose - Kapatma
 * @param {function} onSave - (Date) => void
 * @param {function} [onRemove] - Mevcut hatırlatıcıyı silme callback'i
 * @param {string|Date|null} [initialDate] - Varsa mevcut hatırlatıcı tarihi
 * @param {string} [itemTitle] - Hatırlatıcı kurulan liste veya sayfa başlığı
 */
export default function ReminderPickerModal({
  visible,
  onClose,
  onSave,
  onRemove,
  initialDate = null,
  itemTitle = '',
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  // Seçili tarih & saat
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);

  // İç DatePickerModal (Takvim) durumu
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Modal her açıldığında veya initialDate değiştiğinde state'i başlat
  useEffect(() => {
    if (visible) {
      if (initialDate) {
        const d = new Date(initialDate);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          setSelectedHour(d.getHours());
          setSelectedMinute(Math.round(d.getMinutes() / 5) * 5 % 60);
          return;
        }
      }
      // Varsayılan: 1 saat sonra
      const defaultTime = new Date(Date.now() + 60 * 60 * 1000);
      setSelectedDate(defaultTime);
      setSelectedHour(defaultTime.getHours());
      setSelectedMinute(Math.round(defaultTime.getMinutes() / 5) * 5 % 60);
    }
  }, [visible, initialDate]);

  // Hızlı Seçenekler (Quick presets)
  const handleQuickPreset = useCallback((presetType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    const now = new Date();
    let target = new Date();

    switch (presetType) {
      case 'in_1_hour':
        target = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'tonight':
        target.setHours(20, 0, 0, 0);
        if (target.getTime() <= now.getTime()) {
          // Bugün 20:00 geçtiyse yarın 20:00 yap
          target.setDate(target.getDate() + 1);
        }
        break;
      case 'tomorrow_morning':
        target.setDate(target.getDate() + 1);
        target.setHours(9, 0, 0, 0);
        break;
      case 'tomorrow_evening':
        target.setDate(target.getDate() + 1);
        target.setHours(20, 0, 0, 0);
        break;
      default:
        break;
    }

    setSelectedDate(target);
    setSelectedHour(target.getHours());
    setSelectedMinute(target.getMinutes());
  }, []);

  // Saat / Dakika artırma & azaltma
  const changeHour = (delta) => {
    try {
      Haptics.selectionAsync();
    } catch (e) {}
    setSelectedHour((prev) => (prev + delta + 24) % 24);
  };

  const changeMinute = (delta) => {
    try {
      Haptics.selectionAsync();
    } catch (e) {}
    setSelectedMinute((prev) => (prev + delta + 60) % 60);
  };

  // Nihai hedef Date nesnesini oluştur
  const finalDateTime = useMemo(() => {
    const result = new Date(selectedDate);
    result.setHours(selectedHour, selectedMinute, 0, 0);
    return result;
  }, [selectedDate, selectedHour, selectedMinute]);

  const isPast = finalDateTime.getTime() <= Date.now();

  // Biçimlendirilmiş tarih & saat etiketi
  const formattedDateLabel = useMemo(() => {
    const dateStr = formatFilterDate(selectedDate, i18n.language);
    const hourStr = String(selectedHour).padStart(2, '0');
    const minStr = String(selectedMinute).padStart(2, '0');
    return `${dateStr} · ${hourStr}:${minStr}`;
  }, [selectedDate, selectedHour, selectedMinute, i18n.language]);

  const handleSave = () => {
    if (isPast) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {}
      return;
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {}
    if (onSave) onSave(finalDateTime);
    onClose();
  };

  const handleRemove = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}
    if (onRemove) onRemove();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
            isTablet && styles.tabletContainer,
          ]}
        >
          {/* Üst Başlık & Kapat Butonu */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View
                style={[
                  styles.bellIconBox,
                  { backgroundColor: colors.accent + '15' },
                ]}
              >
                <MaterialCommunityIcons
                  name="bell-ring"
                  size={22}
                  color={colors.accent}
                />
              </View>
              <View style={styles.titleTextContainer}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {t('reminder.title', 'Hatırlatıcı Kur')}
                </Text>
                {itemTitle ? (
                  <Text
                    style={[styles.subtitle, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {itemTitle}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.background }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Hızlı Ön Ayarlar */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t('reminder.quickOptions', 'Hızlı Seçenekler')}
            </Text>
            <View style={styles.presetsGrid}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleQuickPreset('in_1_hour')}
                style={[styles.presetChip, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <MaterialCommunityIcons name="clock-fast" size={16} color={colors.accent} />
                <Text style={[styles.presetText, { color: colors.textPrimary }]}>
                  {t('reminder.quickIn1Hour', '1 saat sonra')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleQuickPreset('tonight')}
                style={[styles.presetChip, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <MaterialCommunityIcons name="weather-night" size={16} color={colors.accent} />
                <Text style={[styles.presetText, { color: colors.textPrimary }]}>
                  {t('reminder.quickTonight', 'Bu akşam (20:00)')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleQuickPreset('tomorrow_morning')}
                style={[styles.presetChip, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <MaterialCommunityIcons name="weather-sunset-up" size={16} color={colors.accent} />
                <Text style={[styles.presetText, { color: colors.textPrimary }]}>
                  {t('reminder.quickTomorrowMorning', 'Yarın sabah (09:00)')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleQuickPreset('tomorrow_evening')}
                style={[styles.presetChip, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <MaterialCommunityIcons name="moon-waning-crescent" size={16} color={colors.accent} />
                <Text style={[styles.presetText, { color: colors.textPrimary }]}>
                  {t('reminder.quickTomorrowEvening', 'Yarın akşam (20:00)')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tarih Seçimi Kartı */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
              {t('reminder.customDateTime', 'Tarih & Saat Belirle')}
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsCalendarOpen(true)}
              style={[
                styles.dateSelectorCard,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View style={styles.dateSelectorLeft}>
                <MaterialCommunityIcons
                  name="calendar-month"
                  size={22}
                  color={colors.accent}
                />
                <Text style={[styles.dateSelectorText, { color: colors.textPrimary }]}>
                  {formatFilterDate(selectedDate, i18n.language)}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Saat & Dakika Seçici Çarkları */}
            <View style={[styles.timePickerContainer, { backgroundColor: colors.background }]}>
              {/* Saat Sütunu */}
              <View style={styles.timeColumn}>
                <TouchableOpacity
                  onPress={() => changeHour(1)}
                  style={styles.timeArrowBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="chevron-up" size={24} color={colors.accent} />
                </TouchableOpacity>

                <View style={[styles.timeBox, { backgroundColor: colors.card, borderColor: colors.accent + '40' }]}>
                  <Text style={[styles.timeNumber, { color: colors.accent }]}>
                    {String(selectedHour).padStart(2, '0')}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => changeHour(-1)}
                  style={styles.timeArrowBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="chevron-down" size={24} color={colors.accent} />
                </TouchableOpacity>
                <Text style={[styles.timeUnitLabel, { color: colors.textSecondary }]}>
                  {t('reminder.hour', 'Saat')}
                </Text>
              </View>

              <Text style={[styles.timeSeparator, { color: colors.accent }]}>:</Text>

              {/* Dakika Sütunu */}
              <View style={styles.timeColumn}>
                <TouchableOpacity
                  onPress={() => changeMinute(5)}
                  style={styles.timeArrowBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="chevron-up" size={24} color={colors.accent} />
                </TouchableOpacity>

                <View style={[styles.timeBox, { backgroundColor: colors.card, borderColor: colors.accent + '40' }]}>
                  <Text style={[styles.timeNumber, { color: colors.accent }]}>
                    {String(selectedMinute).padStart(2, '0')}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => changeMinute(-5)}
                  style={styles.timeArrowBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="chevron-down" size={24} color={colors.accent} />
                </TouchableOpacity>
                <Text style={[styles.timeUnitLabel, { color: colors.textSecondary }]}>
                  {t('reminder.minute', 'Dakika')}
                </Text>
              </View>
            </View>

            {/* Seçili Zaman Özeti & Uyarı */}
            <View
              style={[
                styles.summaryBadge,
                {
                  backgroundColor: isPast ? '#FFEBEE' : colors.accent + '12',
                  borderColor: isPast ? '#EF5350' : colors.accent + '30',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={isPast ? 'alert-circle' : 'bell-check'}
                size={18}
                color={isPast ? '#D32F2F' : colors.accent}
              />
              <Text
                style={[
                  styles.summaryText,
                  { color: isPast ? '#D32F2F' : colors.accent },
                ]}
              >
                {isPast
                  ? t('reminder.pastWarning', 'Geçmiş bir saat seçtiniz, lütfen ileri bir saat seçin.')
                  : formattedDateLabel}
              </Text>
            </View>
          </ScrollView>

          {/* Aksiyon Butonları */}
          <View style={styles.footer}>
            {initialDate && onRemove ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRemove}
                style={[styles.removeBtn, { borderColor: '#FFCDD2' }]}
              >
                <MaterialCommunityIcons name="bell-cancel" size={18} color="#D32F2F" />
                <Text style={styles.removeBtnText}>
                  {t('reminder.removeReminder', 'Kaldır')}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isPast}
              onPress={handleSave}
              style={[
                styles.saveBtn,
                { backgroundColor: isPast ? colors.border : colors.accent },
              ]}
            >
              <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {t('reminder.save', 'Hatırlatıcıyı Kaydet')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Dahili Takvim Seçici */}
      <DatePickerModal
        visible={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => {
          if (newDate) setSelectedDate(newDate);
          setIsCalendarOpen(false);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  tabletContainer: {
    maxWidth: 480,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  bellIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  dateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateSelectorText: {
    fontSize: 15,
    fontWeight: '600',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginBottom: 14,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeArrowBtn: {
    padding: 6,
  },
  timeBox: {
    width: 64,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeNumber: {
    fontSize: 26,
    fontWeight: '800',
  },
  timeUnitLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  timeSeparator: {
    fontSize: 28,
    fontWeight: '800',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#FFEBEE',
  },
  removeBtnText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
