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

const DAY_NAMES_FULL = [
  'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar',
];

/**
 * WeeklyPage - Haftalık Ajanda şablon bileşeni
 * 7 günlük plan ile her güne görev ekleme.
 *
 * @param {object} template - Şablon tanımı
 * @param {object} data - { weekStartDate, days: [{ dayOfWeek, items }] }
 * @param {function} onDataChange - Veri değişiklik fonksiyonu
 */
export default function WeeklyPage({ template, data, onDataChange }) {
  const [expandedDay, setExpandedDay] = useState(null);
  const [newItemTexts, setNewItemTexts] = useState({});

  const days = data?.days || DAY_NAMES_FULL.map((_, i) => ({ dayOfWeek: i, items: [] }));

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

  const todayDow = (new Date().getDay() + 6) % 7; // 0=Pazartesi

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {days.map((day) => {
          const isToday = day.dayOfWeek === todayDow;
          const isExpanded = expandedDay === day.dayOfWeek;

          return (
            <View key={day.dayOfWeek} style={styles.daySection}>
              {/* Gün Başlığı */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  setExpandedDay(isExpanded ? null : day.dayOfWeek)
                }
                style={[
                  styles.dayHeader,
                  {
                    backgroundColor: isToday ? colors.accent : colors.day,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.dayHeaderLeft}>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-down' : 'chevron-right'}
                    size={20}
                    color={isToday ? '#FFFFFF' : colors.accent}
                  />
                  <Text
                    style={[
                      styles.dayName,
                      { color: isToday ? '#FFFFFF' : colors.header },
                    ]}
                  >
                    {DAY_NAMES_FULL[day.dayOfWeek]}
                  </Text>
                  {isToday && (
                    <View
                      style={[
                        styles.todayBadge,
                        { backgroundColor: '#FFFFFF30' },
                      ]}
                    >
                      <Text style={styles.todayBadgeText}>Bugün</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.itemCount,
                    { color: isToday ? '#FFFFFF99' : colors.accent + '80' },
                  ]}
                >
                  {day.items.length} görev
                </Text>
              </TouchableOpacity>

              {/* Genişletilmiş İçerik */}
              {isExpanded && (
                <View
                  style={[
                    styles.dayContent,
                    {
                      backgroundColor: colors.day,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Mevcut görevler */}
                  {day.items.map((item) => (
                    <View key={item.id} style={styles.weekItem}>
                      <TouchableOpacity
                        onPress={() =>
                          handleToggleItem(day.dayOfWeek, item.id)
                        }
                      >
                        <MaterialCommunityIcons
                          name={
                            item.completed
                              ? 'checkbox-marked-circle'
                              : 'checkbox-blank-circle-outline'
                          }
                          size={20}
                          color={
                            item.completed
                              ? colors.accent
                              : colors.accent + '60'
                          }
                        />
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.weekItemText,
                          { color: colors.header },
                          item.completed && styles.completedItem,
                        ]}
                      >
                        {item.text}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteItem(day.dayOfWeek, item.id)
                        }
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={16}
                          color={colors.accent + '60'}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Yeni görev ekleme */}
                  <View style={styles.addRow}>
                    <TextInput
                      style={[
                        styles.addInput,
                        {
                          borderColor: colors.border,
                          color: colors.header,
                        },
                      ]}
                      value={newItemTexts[day.dayOfWeek] || ''}
                      onChangeText={(text) =>
                        setNewItemTexts((prev) => ({
                          ...prev,
                          [day.dayOfWeek]: text,
                        }))
                      }
                      placeholder="Görev ekle..."
                      placeholderTextColor={colors.accent + '50'}
                      onSubmitEditing={() => handleAddItem(day.dayOfWeek)}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      onPress={() => handleAddItem(day.dayOfWeek)}
                      style={[
                        styles.addBtn,
                        { backgroundColor: colors.accent },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={18}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  daySection: {
    marginBottom: 6,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '700',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  itemCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  dayContent: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  weekItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  weekItemText: {
    flex: 1,
    fontSize: 14,
  },
  completedItem: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
