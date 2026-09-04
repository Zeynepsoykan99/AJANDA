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
import { useTranslation } from 'react-i18next';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import WashiTape from '../stationery/WashiTape';
import StickyNote from '../stationery/StickyNote';
import PaperSheet from '../stationery/PaperSheet';
import SpiralBinder from '../stationery/SpiralBinder';

const CATEGORIES = [
  { id: 'priority', name: 'Günün Öncelikleri', emoji: '🎀', tapeColor: '#F48FB1' },
  { id: 'study', name: 'Dersler & Ödevler', emoji: '📚', tapeColor: '#CE93D8' },
  { id: 'personal', name: 'Kişisel & Alışkanlıklar', emoji: '🌸', tapeColor: '#FFCC80' },
];

/**
 * TodoPage - Kırtasiye Çalışma ve Görev Planı Şablonu
 * Öğrencilere yönelik kategorize edilmiş (Dersler, Öncelikler, Notlar),
 * iPad'de çok sütunlu açık defter, mobilde kartlı sevimli defter listesi.
 */
export default function TodoPage({ template, data, onDataChange }) {
  const { t } = useTranslation();
  const { isTwoPage, isTablet } = useResponsiveLayout();
  const [selectedCategory, setSelectedCategory] = useState('priority');
  const [newItemText, setNewItemText] = useState('');
  const [activeCategoryInput, setActiveCategoryInput] = useState('priority');

  const items = data?.items || [];
  const reminderNote = data?.reminderNote || '';

  const colors = template?.colors || {
    bg: '#FFF0F5',
    accent: '#E91E63',
    check: '#C2185B',
    line: '#FCE4EC',
  };

  const getCheckboxIcon = (completed) => {
    const style = template?.checkboxStyle || 'heart';
    if (style === 'heart') {
      return completed ? 'heart' : 'heart-outline';
    } else if (style === 'star') {
      return completed ? 'star' : 'star-outline';
    }
    return completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline';
  };

  const handleToggleItem = useCallback(
    (itemId) => {
      const updatedItems = items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      onDataChange({ ...data, items: updatedItems });
    },
    [items, data, onDataChange]
  );

  const handleAddItem = useCallback(
    (targetCategory) => {
      const text = newItemText.trim();
      if (!text) return;

      const newItem = {
        id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        text,
        category: targetCategory || selectedCategory,
        completed: false,
      };
      onDataChange({ ...data, items: [...items, newItem] });
      setNewItemText('');
    },
    [newItemText, selectedCategory, items, data, onDataChange]
  );

  const handleDeleteItem = useCallback(
    (itemId) => {
      const filtered = items.filter((item) => item.id !== itemId);
      onDataChange({ ...data, items: filtered });
    },
    [items, data, onDataChange]
  );

  const handleReminderNoteChange = useCallback(
    (text) => {
      onDataChange({ ...data, reminderNote: text });
    },
    [data, onDataChange]
  );

  // Kategoriye göre filtrelenmiş görevleri getir (kategorisiz olanlar priority'e eklenir)
  const getItemsForCategory = (catId) => {
    return items.filter((item) => (item.category || 'priority') === catId);
  };

  // Bir kategori listesi render fonksiyonu
  // Bir kategori listesi render fonksiyonu
  const renderCategoryCard = (cat) => {
    const catItems = getItemsForCategory(cat.id);
    const completedCount = catItems.filter((i) => i.completed).length;
    const catDisplayName = t(`templates.todoPage.${cat.id}`, cat.name);

    return (
      <View key={cat.id} style={styles.categoryCard}>
        {/* Washi Bant Başlığı */}
        <View style={styles.cardHeader}>
          <WashiTape
            color={cat.tapeColor}
            width={isTablet ? 170 : 150}
            height={24}
            rotation={cat.id === 'study' ? 1.5 : -1.5}
            pattern="dots"
            label={`${cat.emoji} ${catDisplayName}`}
          />
          <Text style={styles.counterText}>
            {completedCount}/{catItems.length}
          </Text>
        </View>

        {/* Görev Satırları */}
        <View style={styles.itemsWrapper}>
          {catItems.map((item) => (
            <View key={item.id} style={styles.todoRow}>
              <TouchableOpacity
                onPress={() => handleToggleItem(item.id)}
                style={styles.checkboxBtn}
              >
                <MaterialCommunityIcons
                  name={getCheckboxIcon(item.completed)}
                  size={20}
                  color={item.completed ? colors.check : colors.accent + '80'}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.itemText,
                  { color: colors.accent },
                  item.completed && styles.itemCompleted,
                ]}
                numberOfLines={2}
              >
                {item.text}
              </Text>
              <TouchableOpacity
                onPress={() => handleDeleteItem(item.id)}
                style={styles.deleteBtn}
              >
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={16}
                  color={colors.accent + '50'}
                />
              </TouchableOpacity>
            </View>
          ))}

          {catItems.length === 0 && (
            <Text style={styles.emptyCatText}>
              {t('templates.todoPage.emptyCategory')}
            </Text>
          )}

          {/* Hızlı Ekleme Çubuğu */}
          <View style={styles.inlineAddRow}>
            <TextInput
              style={[styles.inlineInput, { borderColor: cat.tapeColor }]}
              value={activeCategoryInput === cat.id ? newItemText : ''}
              onChangeText={(text) => {
                setActiveCategoryInput(cat.id);
                setNewItemText(text);
              }}
              placeholder={t('templates.todoPage.addPlaceholder', { name: catDisplayName })}
              placeholderTextColor="#9E9E9E"
              onSubmitEditing={() => handleAddItem(cat.id)}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => handleAddItem(cat.id)}
              style={[styles.inlineAddBtn, { backgroundColor: colors.check }]}
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
        {/* SOL SAYFA: Öncelikler & Dersler */}
        <PaperSheet ruling="lined" style={styles.pageHalf}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.pageWatermark}>
              <Text style={styles.watermarkText}>{t('templates.todoPage.watermark')}</Text>
            </View>
            {renderCategoryCard(CATEGORIES[0])}
            {renderCategoryCard(CATEGORIES[1])}
          </ScrollView>
        </PaperSheet>

        {/* ORTA SPİRAL CİLT */}
        <SpiralBinder type="center" ringColor="rosegold" ringCount={16} />

        {/* SAĞ SAYFA: Kişisel & Yapışkan Notlar */}
        <PaperSheet ruling="lined" style={styles.pageHalf}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderCategoryCard(CATEGORIES[2])}

            <View style={styles.stickySection}>
              <StickyNote
                title={t('templates.todoPage.reminderTitle')}
                content={reminderNote}
                onChangeContent={handleReminderNoteChange}
                color="#FFF9C4"
                tapeColor="#FFCC80"
                placeholder={t('templates.todoPage.reminderPlaceholder')}
              />
            </View>
          </ScrollView>
        </PaperSheet>
      </View>
    );
  }

  // -------------------------------------------------------------
  // MOBİL GÖRÜNÜMÜ (Kartlı ve Sekmeli)
  // -------------------------------------------------------------
  return (
    <PaperSheet ruling="lined" style={styles.singlePage}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mobileScroll}
      >
        {/* Başlık Rozeti */}
        <View style={styles.mobileBadgeWrapper}>
          <WashiTape
            color="#F48FB1"
            width={200}
            height={26}
            pattern="hearts"
            label={t('templates.todoPage.badgeLabel')}
          />
        </View>

        {/* Tüm Kategoriler */}
        {CATEGORIES.map((cat) => renderCategoryCard(cat))}

        {/* Post-it Hatırlatıcı */}
        <View style={styles.mobileStickyWrapper}>
          <StickyNote
            title={t('templates.todoPage.importantNoteTitle')}
            content={reminderNote}
            onChangeContent={handleReminderNoteChange}
            color="#FFF9C4"
            tapeColor="#FFCC80"
            placeholder={t('templates.todoPage.importantNotePlaceholder')}
          />
        </View>
      </ScrollView>
    </PaperSheet>
  );
}

const styles = StyleSheet.create({
  twoPageContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  pageHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  pageWatermark: {
    marginBottom: 8,
    opacity: 0.6,
  },
  watermarkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#AD1457',
    letterSpacing: 2,
  },
  stickySection: {
    marginTop: 10,
  },

  singlePage: {
    flex: 1,
  },
  mobileScroll: {
    padding: 12,
    paddingBottom: 80,
  },
  mobileBadgeWrapper: {
    alignItems: 'center',
    marginVertical: 10,
  },
  mobileStickyWrapper: {
    marginTop: 14,
    marginBottom: 20,
  },

  categoryCard: {
    backgroundColor: '#FFFFFFEE',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F8BBD040',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#AD1457',
    backgroundColor: '#FCE4EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  itemsWrapper: {
    gap: 4,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.8,
    borderBottomColor: '#F8BBD030',
  },
  checkboxBtn: {
    paddingRight: 8,
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  itemCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyCatText: {
    fontSize: 12,
    color: '#BDBDBD',
    fontStyle: 'italic',
    paddingVertical: 6,
    textAlign: 'center',
  },
  inlineAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: '#FFFFFF',
  },
  inlineAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
