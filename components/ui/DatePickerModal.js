import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const TURKISH_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const DATE_LOCALE_MAP = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
};

/**
 * DatePickerModal - Özel Türkçe/Çok Dilli takvim seçici
 * Dışarıdan bağımlılık gerektirmez, tema renklerine tam uyumludur.
 *
 * @param {boolean} visible
 * @param {function} onClose
 * @param {function} onSelectDate - (Date) => void
 * @param {Date|null} selectedDate - Seçili tarih
 * @param {function} onClearFilter - Filtreyi temizle
 */
export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate,
  onClearFilter,
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const today = new Date();

  const currentLang = i18n.language?.slice(0, 2) || 'tr';
  const activeLocale = DATE_LOCALE_MAP[currentLang] || 'tr-TR';

  const [viewYear, setViewYear] = useState(
    selectedDate ? selectedDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(
    selectedDate ? selectedDate.getMonth() : today.getMonth()
  );

  const monthName = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(activeLocale, { month: 'long' }).format(
        new Date(viewYear, viewMonth, 1)
      );
    } catch {
      return TURKISH_MONTHS[viewMonth];
    }
  }, [activeLocale, viewYear, viewMonth]);

  const weekDayLabels = useMemo(() => {
    try {
      const formatter = new Intl.DateTimeFormat(activeLocale, { weekday: 'short' });
      return [1, 2, 3, 4, 5, 6, 7].map((d) =>
        formatter.format(new Date(2026, 7, 30 + d))
      );
    } catch {
      return TURKISH_DAYS;
    }
  }, [activeLocale]);

  // Ay değiştirme
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Takvim grid verisi
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Pazartesi = 0 olacak şekilde ayarla (JS'de Pazar=0)
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const cells = [];

    // Önceki ayın boş hücreleri
    for (let i = 0; i < startDow; i++) {
      cells.push({ day: null, key: `empty-${i}` });
    }

    // Bu ayın günleri
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, key: `day-${d}` });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const isSameDay = (d1Year, d1Month, d1Day, d2) => {
    if (!d2) return false;
    return (
      d1Year === d2.getFullYear() &&
      d1Month === d2.getMonth() &&
      d1Day === d2.getDate()
    );
  };

  const handleDayPress = (day) => {
    const selected = new Date(viewYear, viewMonth, day);
    onSelectDate(selected);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.overlay}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}} // İç tıklamayı yutma
          style={[styles.container, { backgroundColor: colors.card }]}
        >
          {/* Başlık */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('datePicker.title')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Ay Navigasyonu */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
              <MaterialCommunityIcons name="chevron-left" size={28} color={colors.accent} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
              {monthName} {viewYear}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
              <MaterialCommunityIcons name="chevron-right" size={28} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Gün Başlıkları */}
          <View style={styles.weekRow}>
            {weekDayLabels.map((d, index) => (
              <Text key={`weekday-${index}`} style={[styles.weekDayLabel, { color: colors.textSecondary }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Gün Grid'i */}
          <View style={styles.daysGrid}>
            {calendarDays.map((cell) => {
              if (cell.day === null) {
                return <View key={cell.key} style={styles.dayCell} />;
              }

              const isToday = isSameDay(viewYear, viewMonth, cell.day, today);
              const isSelected = isSameDay(viewYear, viewMonth, cell.day, selectedDate);

              return (
                <TouchableOpacity
                  key={cell.key}
                  onPress={() => handleDayPress(cell.day)}
                  style={[
                    styles.dayCell,
                    isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.accent, borderRadius: 20 },
                    isSelected && { backgroundColor: colors.accent, borderRadius: 20 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.textPrimary },
                      isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      isToday && !isSelected && { color: colors.accent, fontWeight: '700' },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Alt Butonlar */}
          <View style={styles.footer}>
            {selectedDate && onClearFilter && (
              <TouchableOpacity
                onPress={() => {
                  onClearFilter();
                  onClose();
                }}
                style={[styles.clearBtn, { borderColor: colors.accent }]}
              >
                <MaterialCommunityIcons name="filter-off" size={16} color={colors.accent} />
                <Text style={[styles.clearBtnText, { color: colors.accent }]}>
                  {t('datePicker.clearFilter')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                handleDayPress(today.getDate());
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
              }}
              style={[styles.todayBtn, { backgroundColor: colors.accent + '15' }]}
            >
              <Text style={[styles.todayBtnText, { color: colors.accent }]}>
                {t('datePicker.today')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const CELL_SIZE = Math.floor((Dimensions.get('window').width - 80) / 7);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 20,
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 44,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  todayBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
