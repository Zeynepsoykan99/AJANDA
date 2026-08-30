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

/**
 * TodoPage - To-Do List şablon bileşeni
 * Kalpli/yıldızlı checkbox'lar ile yapılacaklar listesi.
 *
 * @param {object} template - Şablon tanımı (pageTemplates.js'den)
 * @param {object} data - Sayfa verisi { items: [{ id, text, completed }] }
 * @param {function} onDataChange - Veri değişiklik fonksiyonu
 */
export default function TodoPage({ template, data, onDataChange }) {
  const [newItemText, setNewItemText] = useState('');

  const items = data?.items || [];

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

  const handleAddItem = useCallback(() => {
    if (newItemText.trim()) {
      const newItem = {
        id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        text: newItemText.trim(),
        completed: false,
      };
      onDataChange({ ...data, items: [...items, newItem] });
      setNewItemText('');
    }
  }, [newItemText, items, data, onDataChange]);

  const handleDeleteItem = useCallback(
    (itemId) => {
      const filtered = items.filter((item) => item.id !== itemId);
      onDataChange({ ...data, items: filtered });
    },
    [items, data, onDataChange]
  );

  const colors = template?.colors || {
    bg: '#FFF0F5',
    accent: '#E91E63',
    check: '#C2185B',
    line: '#FCE4EC',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* To-Do Liste */}
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[styles.todoItem, { borderBottomColor: colors.line }]}
          >
            <TouchableOpacity
              onPress={() => handleToggleItem(item.id)}
              style={styles.checkbox}
            >
              <MaterialCommunityIcons
                name={getCheckboxIcon(item.completed)}
                size={24}
                color={item.completed ? colors.check : colors.accent + '80'}
              />
            </TouchableOpacity>
            <Text
              style={[
                styles.todoText,
                { color: colors.accent },
                item.completed && styles.completedText,
              ]}
              numberOfLines={2}
            >
              {item.text}
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteItem(item.id)}
              style={styles.deleteButton}
            >
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={18}
                color={colors.accent + '60'}
              />
            </TouchableOpacity>
          </View>
        ))}

        {/* Boş liste mesajı */}
        {items.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name={template?.checkboxStyle === 'star' ? 'star-outline' : 'heart-outline'}
              size={48}
              color={colors.accent + '40'}
            />
            <Text style={[styles.emptyText, { color: colors.accent + '80' }]}>
              Henüz bir görev eklemediniz
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Yeni görev ekleme alanı */}
      <View
        style={[
          styles.addContainer,
          {
            backgroundColor: colors.bg,
            borderTopColor: colors.line,
          },
        ]}
      >
        <TextInput
          style={[
            styles.addInput,
            {
              borderColor: colors.line,
              color: colors.accent,
              backgroundColor: '#FFFFFF',
            },
          ]}
          value={newItemText}
          onChangeText={setNewItemText}
          placeholder="Yeni görev ekle..."
          placeholderTextColor={colors.accent + '60'}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={handleAddItem}
          style={[styles.addButton, { backgroundColor: colors.check }]}
          disabled={!newItemText.trim()}
        >
          <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  checkbox: {
    marginRight: 12,
    padding: 2,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  addContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  addInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
