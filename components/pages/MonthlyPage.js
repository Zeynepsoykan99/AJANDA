import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import WashiTape from '../stationery/WashiTape';
import StickyNote from '../stationery/StickyNote';
import PaperSheet from '../stationery/PaperSheet';
import SpiralBinder from '../stationery/SpiralBinder';
import { useTranslation } from 'react-i18next';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const DATE_LOCALE_MAP = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
};

/**
 * MonthlyPage - Kırtasiye Masa Takvimi & Aylık Ajanda Şablonu
 * iPad'de geniş masa takvimi ve yan not paneli;
 * fosforlu kalem (highlighter) ve washi bant efektleriyle zenginleştirilmiştir.
 */
export default function MonthlyPage({ template, data, onDataChange }) {
  const { t, i18n } = useTranslation();
  const { isTwoPage, isTablet } = useResponsiveLayout();

  const currentLang = i18n.language?.slice(0, 2) || 'tr';
  const activeLocale = DATE_LOCALE_MAP[currentLang] || 'tr-TR';

  const year = data?.year || new Date().getFullYear();
  const month = data?.month || new Date().getMonth();
  const events = data?.events || [];
  const monthlyGoals = data?.monthlyGoals || '';

  const monthDisplayName = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat(activeLocale, { month: 'long' }).format(new Date(year, month, 1));
    } catch {
      return MONTH_NAMES[month];
    }
  }, [activeLocale, year, month]);

  const dayNames = React.useMemo(() => {
    try {
      const formatter = new Intl.DateTimeFormat(activeLocale, { weekday: 'short' });
      return [1, 2, 3, 4, 5, 6, 7].map((d) =>
        formatter.format(new Date(2026, 7, 30 + d))
      );
    } catch {
      return DAY_NAMES;
    }
  }, [activeLocale]);

  // Gün seçimi ve etkinlik düzenleme modalı
  const [selectedDay, setSelectedDay] = useState(null);
  const [eventInputText, setEventInputText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Gün hesaplamaları
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const getEventForDay = (day) => {
    return events.find((e) => e.day === day);
  };

  const handleOpenDayModal = (day) => {
    const existing = getEventForDay(day);
    setSelectedDay(day);
    setEventInputText(existing ? existing.text : '');
    setIsModalOpen(true);
  };

  const handleSaveDayEvent = () => {
    if (selectedDay === null) return;
    const text = eventInputText.trim();
    const existingIndex = events.findIndex((e) => e.day === selectedDay);
    let updatedEvents;

    if (existingIndex !== -1) {
      if (text) {
        updatedEvents = events.map((e) =>
          e.day === selectedDay ? { ...e, text } : e
        );
      } else {
        updatedEvents = events.filter((e) => e.day !== selectedDay);
      }
    } else if (text) {
      updatedEvents = [...events, { day: selectedDay, text }];
    } else {
      setIsModalOpen(false);
      return;
    }

    onDataChange({ ...data, events: updatedEvents });
    setIsModalOpen(false);
  };

  const handleGoalsChange = useCallback(
    (text) => {
      onDataChange({ ...data, monthlyGoals: text });
    },
    [data, onDataChange]
  );

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const currentDay = today.getDate();

  // Takvim grid render fonksiyonu
  const renderCalendarGrid = () => (
    <View style={styles.calendarSection}>
      {/* Ay Değiştirici Başlık */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => changeMonth(-1)}
          style={styles.navArrowBtn}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={colors.accent}
          />
        </TouchableOpacity>

        <WashiTape
          color="#F8BBD0"
          width={isTablet ? 180 : 150}
          height={26}
          rotation={-1}
          pattern="hearts"
          label={`🌸 ${monthDisplayName} ${year}`}
        />

        <TouchableOpacity
          onPress={() => changeMonth(1)}
          style={styles.navArrowBtn}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Gün İsimleri */}
      <View style={styles.dayNamesRow}>
        {dayNames.map((name, idx) => (
          <View key={`dayname-${idx}`} style={styles.dayNameCell}>
            <Text style={[styles.dayNameText, { color: colors.header }]}>
              {name}
            </Text>
          </View>
        ))}
      </View>

      {/* Gün Hücreleri */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.emptyCell} />;
          }

          const event = getEventForDay(day);
          const isToday = isCurrentMonth && day === currentDay;

          return (
            <TouchableOpacity
              key={`day-${day}`}
              activeOpacity={0.7}
              onPress={() => handleOpenDayModal(day)}
              style={[
                styles.dayCell,
                isToday && styles.todayCell,
                event && styles.eventCell,
              ]}
            >
              {/* Gün Numarası & Highlighter Efekti */}
              <View
                style={[
                  styles.dayNumWrapper,
                  isToday && styles.todayHighlighter,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumText,
                    isToday ? styles.todayText : { color: colors.header },
                  ]}
                >
                  {day}
                </Text>
              </View>

              {/* Varsa Etkinlik / Hatırlatma Şeridi */}
              {event && (
                <View style={styles.eventHighlighterTag}>
                  <Text style={styles.eventText} numberOfLines={2}>
                    {event.text}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // TABLET / İKİ BÖLMELİ AÇIK TAKVİM AJANDASI
  // -------------------------------------------------------------
  if (isTwoPage) {
    return (
      <View style={styles.twoPageContainer}>
        {/* SOL: Geniş Masa Takvimi */}
        <PaperSheet ruling="blank" style={styles.leftPageHalf}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPad}>
            {renderCalendarGrid()}
          </ScrollView>
        </PaperSheet>

        {/* ORTA SPİRAL CİLT */}
        <SpiralBinder type="center" ringColor="rosegold" ringCount={16} />

        {/* SAĞ: Aylık Notlar, Sınavlar ve Hedefler Paneli */}
        <PaperSheet ruling="lined" style={styles.rightPageHalf}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPad}>
            <View style={styles.sideHeader}>
              <WashiTape
                color="#CE93D8"
                width={160}
                height={24}
                rotation={1}
                pattern="dots"
                label={t('templates.monthlyPage.goalsTitle')}
              />
            </View>

            {/* Ayın Hedefleri Post-it */}
            <StickyNote
              title={t('templates.monthlyPage.notesTitle', { month: monthDisplayName })}
              content={monthlyGoals}
              onChangeContent={handleGoalsChange}
              color="#FFF9C4"
              tapeColor="#FFCC80"
              placeholder={t('templates.monthlyPage.goalsPlaceholder')}
              style={styles.stickyPanel}
            />

            {/* Ayın Etkinlik Özeti Listesi */}
            <View style={styles.eventsListCard}>
              <Text style={styles.eventsListTitle}>{t('templates.monthlyPage.eventsTitle')}</Text>
              {events.length > 0 ? (
                events
                  .sort((a, b) => a.day - b.day)
                  .map((ev) => (
                    <View key={ev.day} style={styles.eventRowItem}>
                      <View style={styles.eventDayBadge}>
                        <Text style={styles.eventDayBadgeText}>{ev.day}</Text>
                      </View>
                      <Text style={styles.eventRowDesc} numberOfLines={1}>
                        {ev.text}
                      </Text>
                    </View>
                  ))
              ) : (
                <Text style={styles.noEventsText}>
                  {t('templates.monthlyPage.noEvents')}
                </Text>
              )}
            </View>
          </ScrollView>
        </PaperSheet>

        {renderDayEditModal()}
      </View>
    );
  }

  // -------------------------------------------------------------
  // MOBİL / TEK SAYFA DÜZENİ
  // -------------------------------------------------------------
  return (
    <PaperSheet ruling="blank" style={styles.singleContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mobileScroll}
      >
        {renderCalendarGrid()}

        {/* Mobil Alt Notluk */}
        <View style={styles.mobileStickySection}>
          <StickyNote
            title={t('templates.monthlyPage.mobileGoalsTitle', { month: monthDisplayName })}
            content={monthlyGoals}
            onChangeContent={handleGoalsChange}
            color="#FFF9C4"
            tapeColor="#FFCC80"
            placeholder={t('templates.monthlyPage.mobileGoalsPlaceholder')}
          />
        </View>
      </ScrollView>

      {renderDayEditModal()}
    </PaperSheet>
  );

  // Gün Etkinliği Ekleme/Düzenleme Modalı
  function renderDayEditModal() {
    return (
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsModalOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <WashiTape
              color="#F8BBD0"
              width={140}
              height={22}
              pattern="dots"
              label={`🌸 ${selectedDay} ${monthDisplayName}`}
            />
            <Text style={styles.modalSub}>
              {t('templates.monthlyPage.modalPrompt')}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={eventInputText}
              onChangeText={setEventInputText}
              placeholder={t('templates.monthlyPage.modalInputPlaceholder')}
              placeholderTextColor="#9E9E9E"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setEventInputText('');
                  handleSaveDayEvent();
                }}
                style={styles.deleteModalBtn}
              >
                <Text style={styles.deleteModalText}>{t('common.delete')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveDayEvent}
                style={[styles.saveModalBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.saveModalText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  twoPageContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  leftPageHalf: {
    flex: 1.3,
    marginHorizontal: 4,
  },
  rightPageHalf: {
    flex: 0.9,
    marginHorizontal: 4,
  },
  scrollPad: {
    padding: 12,
  },
  sideHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  stickyPanel: {
    marginBottom: 16,
  },
  eventsListCard: {
    backgroundColor: '#FFFFFFEE',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F8BBD040',
  },
  eventsListTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#880E4F',
    marginBottom: 8,
  },
  eventRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F8BBD030',
    gap: 8,
  },
  eventDayBadge: {
    backgroundColor: '#FCE4EC',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2185B',
  },
  eventRowDesc: {
    flex: 1,
    fontSize: 12,
    color: '#424242',
  },
  noEventsText: {
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },

  singleContainer: {
    flex: 1,
  },
  mobileScroll: {
    padding: 12,
    paddingBottom: 60,
  },
  mobileStickySection: {
    marginTop: 16,
    marginBottom: 20,
  },

  calendarSection: {
    paddingVertical: 4,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF80',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 0.95,
    padding: 2,
    borderRadius: 8,
    borderWidth: 0.6,
    borderColor: '#0000000A',
    backgroundColor: '#FFFFFF99',
    alignItems: 'center',
  },
  todayCell: {
    borderColor: '#E91E63',
    borderWidth: 1.2,
    backgroundColor: '#FFF5F8',
  },
  eventCell: {
    backgroundColor: '#FFFFFF',
  },
  dayNumWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayHighlighter: {
    backgroundColor: '#F06292',
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '600',
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  eventHighlighterTag: {
    width: '94%',
    backgroundColor: '#FFF9C4',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 2,
    borderLeftWidth: 2,
    borderLeftColor: '#FBC02D',
  },
  eventText: {
    fontSize: 8.5,
    color: '#5D4037',
    fontWeight: '600',
    lineHeight: 10,
    textAlign: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000045',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFDF9',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  modalSub: {
    fontSize: 13,
    color: '#616161',
    marginVertical: 10,
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#F8BBD0',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#FFFFFF',
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  deleteModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFEBEE',
  },
  deleteModalText: {
    color: '#D32F2F',
    fontWeight: '600',
    fontSize: 13,
  },
  saveModalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveModalText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
