import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import WashiTape from '../stationery/WashiTape';
import StickyNote from '../stationery/StickyNote';
import SpiralBinder from '../stationery/SpiralBinder';
import PaperSheet from '../stationery/PaperSheet';
import GridPaperSheet from '../stationery/GridPaperSheet';
import { DaisyFlower, RibbonBow, FloralCorner, DoodleHeart } from '../stationery/FloralDecorations';

const DAY_NAMES_FULL = [
  'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar',
];

const DAY_EMOJIS = ['🌸', '✨', '🎀', '🌷', '🧁', '🏖️', '☕'];

const WASHI_PATTERNS = ['dots', 'stripes', 'hearts', 'dots', 'stripes', 'hearts', 'dots'];

/**
 * WeeklyPage - Kırtasiye Haftalık Plan Şablonu
 * iPad/Tablet'te çift sayfalı telli ajanda düzeni,
 * mobilde sevimli washi bantlı günlük kartlar ve post-it notları sunar.
 */
export default function WeeklyPage({ template, data, onDataChange }) {
  const { isTwoPage, isTablet } = useResponsiveLayout();
  const [newItemTexts, setNewItemTexts] = useState({});

  const days = data?.days || DAY_NAMES_FULL.map((_, i) => ({ dayOfWeek: i, items: [] }));
  const weeklyNote = data?.weeklyNote || '';

  const colors = template?.colors || {
    bg: '#FFF0F5',
    accent: '#C2185B',
    header: '#880E4F',
    day: '#FFFFFF',
    border: '#F8BBD0',
  };

  const handleAddItem = useCallback(
    (dayOfWeek) => {
      const text = newItemTexts[dayOfWeek];
      if (!text?.trim()) return;

      const updatedDays = days.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          return {
            ...day,
            items: [
              ...day.items,
              {
                id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                text: text.trim(),
                completed: false,
              },
            ],
          };
        }
        return day;
      });
      onDataChange({ ...data, days: updatedDays });
      setNewItemTexts((prev) => ({ ...prev, [dayOfWeek]: '' }));
    },
    [newItemTexts, days, data, onDataChange]
  );

  const handleToggleItem = useCallback(
    (dayOfWeek, itemId) => {
      const updatedDays = days.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          return {
            ...day,
            items: day.items.map((item) =>
              item.id === itemId
                ? { ...item, completed: !item.completed }
                : item
            ),
          };
        }
        return day;
      });
      onDataChange({ ...data, days: updatedDays });
    },
    [days, data, onDataChange]
  );

  const handleDeleteItem = useCallback(
    (dayOfWeek, itemId) => {
      const updatedDays = days.map((day) => {
        if (day.dayOfWeek === dayOfWeek) {
          return {
            ...day,
            items: day.items.filter((item) => item.id !== itemId),
          };
        }
        return day;
      });
      onDataChange({ ...data, days: updatedDays });
    },
    [days, data, onDataChange]
  );

  const handleWeeklyNoteChange = useCallback(
    (text) => {
      onDataChange({ ...data, weeklyNote: text });
    },
    [data, onDataChange]
  );

  const todayDow = (new Date().getDay() + 6) % 7; // 0=Pazartesi

  const isGrid = Boolean(template?.paperType?.includes('grid'));
  const SheetComponent = isGrid ? GridPaperSheet : PaperSheet;
  const sheetProps = isGrid
    ? { gridColor: template?.colors?.grid || '#F8BBD055' }
    : { ruling: 'lined' };

  // Tek bir gün bloğunu render et
  const renderDayBlock = (dayIndex) => {
    const day = days.find((d) => d.dayOfWeek === dayIndex) || { dayOfWeek: dayIndex, items: [] };
    const isToday = dayIndex === todayDow;
    const dayName = DAY_NAMES_FULL[dayIndex];
    const emoji = DAY_EMOJIS[dayIndex];
    const washiPattern = WASHI_PATTERNS[dayIndex];

    return (
      <View
        key={dayIndex}
        style={[
          styles.dayBox,
          isToday && styles.todayBox,
          { borderColor: colors.border },
        ]}
      >
        {/* Washi Bantlı Gün Başlığı */}
        <View style={styles.washiHeader}>
          <View style={styles.titleWithDeco}>
            <WashiTape
              color={isToday ? '#F48FB1' : colors.border}
              width={isTablet ? 130 : 110}
              height={22}
              rotation={dayIndex % 2 === 0 ? -1.5 : 1.5}
              pattern={washiPattern}
              label={`${emoji} ${dayName}`}
            />
            {template?.decorations === 'daisy_ribbon' && (
              <DaisyFlower size={18} style={{ marginLeft: 4 }} />
            )}
            {template?.decorations === 'lavender_bow' && (
              <RibbonBow size={18} color="#CE93D8" style={{ marginLeft: 4 }} />
            )}
            {template?.decorations === 'buttercup_daisy' && (
              <DaisyFlower size={18} style={{ marginLeft: 4 }} />
            )}
            {template?.decorations === 'cloud_ribbon' && (
              <DoodleHeart size={14} color="#90CAF9" style={{ marginLeft: 4 }} />
            )}
          </View>
          {isToday && (
            <View style={styles.todayPill}>
              <Text style={styles.todayPillText}>Bugün</Text>
            </View>
          )}
        </View>

        {/* Görev Satırları (Defter Çizgisi) */}
        <View style={styles.taskList}>
          {day.items.map((item) => (
            <View key={item.id} style={styles.taskLine}>
              <TouchableOpacity
                onPress={() => handleToggleItem(day.dayOfWeek, item.id)}
                style={styles.checkboxTouch}
              >
                <MaterialCommunityIcons
                  name={item.completed ? 'heart' : 'heart-outline'}
                  size={18}
                  color={item.completed ? colors.accent : colors.accent + '80'}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.taskText,
                  { color: colors.header },
                  item.completed && styles.taskCompleted,
                ]}
                numberOfLines={2}
              >
                {item.text}
              </Text>
              <TouchableOpacity
                onPress={() => handleDeleteItem(day.dayOfWeek, item.id)}
                style={styles.deleteTouch}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={14}
                  color={colors.accent + '60'}
                />
              </TouchableOpacity>
            </View>
          ))}

          {/* Yeni Satır Ekleme */}
          <View style={styles.addRow}>
            <TextInput
              style={[styles.addInput, { color: colors.header, borderColor: colors.border }]}
              value={newItemTexts[day.dayOfWeek] || ''}
              onChangeText={(text) =>
                setNewItemTexts((prev) => ({
                  ...prev,
                  [day.dayOfWeek]: text,
                }))
              }
              placeholder="Yeni plan veya ders yaz..."
              placeholderTextColor={colors.accent + '50'}
              onSubmitEditing={() => handleAddItem(day.dayOfWeek)}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => handleAddItem(day.dayOfWeek)}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // -------------------------------------------------------------
  // TABLET / ÇİFT SAYFA GÖRÜNÜMÜ
  // -------------------------------------------------------------
  if (isTwoPage) {
    return (
      <View style={styles.twoPageContainer}>
        {/* SOL SAYFA: Pazartesi, Salı, Çarşamba */}
        <SheetComponent {...sheetProps} style={styles.pageHalf}>
          {template?.decorations === 'daisy_ribbon' && (
            <FloralCorner position="top-left" />
          )}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pageScrollContent}
          >
            <View style={styles.pageCornerDeco}>
              <Text style={styles.decoWatermark}>
                {template?.name ? template.name.toUpperCase() : 'WEEKLY PLANNER'} 🌸
              </Text>
            </View>
            {[0, 1, 2].map((i) => renderDayBlock(i))}
          </ScrollView>
        </SheetComponent>

        {/* ORTADAKİ SPİRAL BİNDER HALKALARI */}
        <SpiralBinder type="center" ringColor="rosegold" ringCount={16} />

        {/* SAĞ SAYFA: Perşembe, Cuma, Cumartesi, Pazar + Post-it */}
        <SheetComponent {...sheetProps} style={styles.pageHalf}>
          {template?.decorations === 'daisy_ribbon' && (
            <FloralCorner position="top-right" />
          )}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.pageScrollContent}
          >
            {[3, 4].map((i) => renderDayBlock(i))}

            {/* Hafta sonu çiftli blok */}
            <View style={styles.weekendRow}>
              <View style={styles.weekendHalf}>{renderDayBlock(5)}</View>
              <View style={styles.weekendHalf}>{renderDayBlock(6)}</View>
            </View>

            {/* Haftanın Notları / Post-It */}
            <View style={styles.stickyWrapper}>
              <StickyNote
                title="Haftalık Hedefler & Notlar 🎀"
                content={weeklyNote}
                onChangeContent={handleWeeklyNoteChange}
                color="#FFF9C4"
                tapeColor="#FFCC80"
                placeholder="Bu hafta hangi sınavlar var? Hedefler ve motivasyon notları..."
              />
            </View>
          </ScrollView>
        </SheetComponent>
      </View>
    );
  }

  // -------------------------------------------------------------
  // MOBİL / TEK SAYFA GÖRÜNÜMÜ
  // -------------------------------------------------------------
  return (
    <SheetComponent {...sheetProps} style={styles.singlePage}>
      {template?.decorations === 'daisy_ribbon' && (
        <FloralCorner position="top-right" />
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mobileScrollContent}
      >
        <View style={styles.mobileHeaderBadge}>
          <WashiTape
            color="#F48FB1"
            width={180}
            height={26}
            pattern="hearts"
            label={`🎀 ${template?.name || 'HAFTALIK PLAN'} 🎀`}
          />
        </View>

        {/* 7 Günün Tamamı */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => renderDayBlock(i))}

        {/* Alt Post-it Notu */}
        <View style={styles.mobileSticky}>
          <StickyNote
            title="Haftanın Notları 🌸"
            content={weeklyNote}
            onChangeContent={handleWeeklyNoteChange}
            color="#FFF9C4"
            tapeColor="#FFCC80"
            placeholder="Bu haftanın önemli notları, sınavlar ve hatırlatmalar..."
          />
        </View>
      </ScrollView>
    </SheetComponent>
  );
}

const styles = StyleSheet.create({
  // Tablet Çift Sayfa Düzeni
  twoPageContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  pageHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  pageScrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  pageCornerDeco: {
    alignItems: 'flex-start',
    marginBottom: 8,
    opacity: 0.6,
  },
  decoWatermark: {
    fontSize: 11,
    fontWeight: '800',
    color: '#AD1457',
    letterSpacing: 2,
  },
  weekendRow: {
    flexDirection: 'row',
    gap: 8,
  },
  weekendHalf: {
    flex: 1,
  },
  stickyWrapper: {
    marginTop: 12,
  },

  // Mobil Tek Sayfa Düzeni
  singlePage: {
    flex: 1,
  },
  mobileScrollContent: {
    padding: 12,
    paddingBottom: 80,
  },
  mobileHeaderBadge: {
    alignItems: 'center',
    marginVertical: 10,
  },
  mobileSticky: {
    marginTop: 16,
    marginBottom: 24,
  },

  // Ortak Gün Bloğu
  dayBox: {
    backgroundColor: '#FFFFFFEE',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1.5,
  },
  todayBox: {
    borderWidth: 1.5,
    borderColor: '#E91E63',
    backgroundColor: '#FFF8F9',
  },
  washiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleWithDeco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayPill: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  taskList: {
    gap: 4,
  },
  taskLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.8,
    borderBottomColor: '#F8BBD040',
  },
  checkboxTouch: {
    paddingRight: 8,
  },
  taskText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  deleteTouch: {
    padding: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  addInput: {
    flex: 1,
    borderWidth: 0.8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    backgroundColor: '#FFFFFF',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
