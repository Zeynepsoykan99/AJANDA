import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/**
 * MonthlyPage - Aylık Ajanda şablon bileşeni
 * Aylık takvim görünümü ile günlere etkinlik ekleme.
 *
 * @param {object} template - Şablon tanımı
 * @param {object} data - { year, month, events: [{ day, text }] }
 * @param {function} onDataChange - Veri değişiklik fonksiyonu
 */
export default function MonthlyPage({ template, data, onDataChange }) {
  const year = data?.year || new Date().getFullYear();
  const month = data?.month || new Date().getMonth();
  const events = data?.events || [];

  const colors = template?.colors || {
    bg: '#FFF0F5',
    accent: '#C2185B',
    header: '#880E4F',
    cell: '#FFFFFF',
    border: '#F8BBD0',
  };

  // Ay değiştirme
  const changeMonth = useCallback(
    (direction) => {
      let newMonth = month + direction;
      let newYear = year;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
      onDataChange({ ...data, year: newYear, month: newMonth });
    },
    [month, year, data, onDataChange]
  );

  // Gün sayısını hesapla
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Ayın ilk gününün haftanın kaçıncı günü olduğu (Pazartesi=0)
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  // Takvim grid'ini oluştur
  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null); // Boş hücreler
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  // Belirli bir günün etkinliğini bul
  const getEventForDay = (day) => {
    return events.find((e) => e.day === day);
  };

  // Etkinlik ekle/güncelle
  const handleEventChange = useCallback(
    (day, text) => {
      const existingIndex = events.findIndex((e) => e.day === day);
      let updatedEvents;
      if (existingIndex !== -1) {
        if (text.trim()) {
          updatedEvents = events.map((e) =>
            e.day === day ? { ...e, text: text } : e
          );
        } else {
          updatedEvents = events.filter((e) => e.day !== day);
        }
      } else if (text.trim()) {
        updatedEvents = [...events, { day, text: text.trim() }];
      } else {
        return;
      }
      onDataChange({ ...data, events: updatedEvents });
    },
    [events, data, onDataChange]
  );

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const currentDay = today.getDate();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Ay Başlığı */}
        <View style={styles.monthHeader}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            style={styles.navButton}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={colors.accent}
            />
          </TouchableOpacity>
          <View style={styles.monthTitleContainer}>
            <Text style={[styles.monthName, { color: colors.header }]}>
              {MONTH_NAMES[month]}
            </Text>
            <Text style={[styles.yearText, { color: colors.accent + '99' }]}>
              {year}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={styles.navButton}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color={colors.accent}
            />
          </TouchableOpacity>
        </View>

        {/* Gün Başlıkları */}
        <View style={styles.dayNamesRow}>
          {DAY_NAMES.map((dayName) => (
            <View key={dayName} style={styles.dayNameCell}>
              <Text style={[styles.dayNameText, { color: colors.accent }]}>
                {dayName}
              </Text>
            </View>
          ))}
        </View>

        {/* Takvim Grid'i */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const event = getEventForDay(day);
            const isToday = isCurrentMonth && day === currentDay;

            return (
              <View
                key={`day-${day}`}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: colors.cell,
                    borderColor: isToday ? colors.accent : colors.border,
                    borderWidth: isToday ? 2 : 0.5,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    {
                      color: isToday ? colors.accent : colors.header,
                      fontWeight: isToday ? '800' : '600',
                    },
                  ]}
                >
                  {day}
                </Text>
                {event && (
                  <Text
                    style={[styles.eventText, { color: colors.accent }]}
                    numberOfLines={2}
                  >
                    {event.text}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navButton: {
    padding: 4,
  },
  monthTitleContainer: {
    alignItems: 'center',
  },
  monthName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  yearText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  dayNamesRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  dayCell: {
    width: '14.28%',
    minHeight: 52,
    padding: 4,
    borderRadius: 8,
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 13,
    textAlign: 'center',
  },
  eventText: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 12,
  },
});
