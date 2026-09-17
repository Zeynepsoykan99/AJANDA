import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import {
  INDEX_FLAG_COLORS,
  INDEX_FLAG_COLOR_KEYS,
  getIndexFlagColor,
} from '../../constants/indexFlagColors';
import PageIndexFlag from './PageIndexFlag';

/**
 * IndexFlagEditModal - Post-it Sayfa İşaretleyicisi Ekleme ve Düzenleme Modalı
 *
 * @param {boolean} visible
 * @param {object} [editingFlag] - Düzenlenen mevcut bayrak (null ise yeni oluşturma)
 * @param {function} onSave - (flagData) => void
 * @param {function} [onDelete] - (flagId) => void
 * @param {function} onClose - () => void
 */
export default function IndexFlagEditModal({
  visible,
  editingFlag = null,
  onSave,
  onDelete,
  onClose,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [selectedColor, setSelectedColor] = useState('yellow');
  const [label, setLabel] = useState('');

  const QUICK_SUGGESTIONS = [
    t('indexFlags.suggestionImportant', 'Önemli'),
    t('indexFlags.suggestionExam', 'Sınav'),
    t('indexFlags.suggestionMeeting', 'Toplantı'),
    t('indexFlags.suggestionIdea', 'Fikir'),
    t('indexFlags.suggestionUrgent', 'Acil'),
  ];

  useEffect(() => {
    if (visible) {
      if (editingFlag) {
        setSelectedColor(editingFlag.color || 'yellow');
        setLabel(editingFlag.label || '');
      } else {
        setSelectedColor('yellow');
        setLabel('');
      }
    }
  }, [visible, editingFlag]);

  const handleSelectColor = (colorKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColor(colorKey);
  };

  const handleApplySuggestion = (text) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLabel(text);
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const flagData = {
      id: editingFlag?.id || `flag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      color: selectedColor,
      label: label.trim(),
      createdAt: editingFlag?.createdAt || new Date().toISOString(),
      position: editingFlag?.position !== undefined ? editingFlag.position : 0.2,
    };
    onSave && onSave(flagData);
    onClose && onClose();
  };

  const handleDelete = () => {
    if (editingFlag && onDelete) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onDelete(editingFlag.id);
      onClose && onClose();
    }
  };

  const currentColorConfig = getIndexFlagColor(selectedColor);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalCard,
                  { backgroundColor: colors.card || '#FFFFFF' },
                ]}
              >
                {/* Başlık ve Kapatma Butonu */}
                <View style={styles.headerRow}>
                  <View style={styles.titleWithIcon}>
                    <MaterialCommunityIcons
                      name="bookmark-plus-outline"
                      size={20}
                      color={colors.accent}
                    />
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                      {editingFlag
                        ? t('indexFlags.editTitle', 'Sayfa İşaretini Düzenle')
                        : t('indexFlags.newTitle', 'Yeni Post-it Sayfa İşareti')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Canlı Bayrak Önizlemesi */}
                <View style={[styles.previewArea, { backgroundColor: colors.background + '80' }]}>
                  <Text style={[styles.previewCaption, { color: colors.textSecondary }]}>
                    {t('indexFlags.preview', 'Önizleme')}
                  </Text>
                  <PageIndexFlag
                    flag={{
                      id: 'preview',
                      color: selectedColor,
                      label: label || t('indexFlags.defaultLabel', 'İşaret'),
                    }}
                    mode="page"
                  />
                </View>

                {/* Renk Seçimi (5 Klasik Post-it Rengi) */}
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  {t('indexFlags.selectColor', 'Post-it Rengi Seç')}
                </Text>
                <View style={styles.colorRow}>
                  {INDEX_FLAG_COLOR_KEYS.map((key) => {
                    const c = INDEX_FLAG_COLORS[key];
                    const isSelected = selectedColor === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        activeOpacity={0.8}
                        onPress={() => handleSelectColor(key)}
                        style={[
                          styles.colorCircle,
                          {
                            backgroundColor: c.tabColor,
                            borderColor: isSelected ? colors.accent : c.borderColor,
                            borderWidth: isSelected ? 3 : 1,
                            transform: [{ scale: isSelected ? 1.15 : 1 }],
                          },
                        ]}
                      >
                        {isSelected && (
                          <MaterialCommunityIcons
                            name="check"
                            size={16}
                            color={c.textColor}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Etiket / Not Girişi */}
                <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                  {t('indexFlags.labelTitle', 'Etiket / Not (İsteğe bağlı)')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      backgroundColor: colors.background || '#F5F5F5',
                      borderColor: colors.border || '#E0E0E0',
                    },
                  ]}
                  value={label}
                  onChangeText={setLabel}
                  placeholder={t('indexFlags.labelPlaceholder', 'Örn: Önemli, Sınav, Fikir...')}
                  placeholderTextColor={colors.textSecondary + '70'}
                  maxLength={20}
                  returnKeyType="done"
                />

                {/* Hızlı Etiket Önerileri */}
                <View style={styles.suggestionsRow}>
                  {QUICK_SUGGESTIONS.map((sug, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => handleApplySuggestion(sug)}
                      style={[
                        styles.sugChip,
                        {
                          backgroundColor:
                            label === sug ? currentColorConfig.tabColor + '25' : colors.background,
                          borderColor:
                            label === sug ? currentColorConfig.tabColor : colors.border || '#E0E0E0',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sugText,
                          {
                            color:
                              label === sug ? currentColorConfig.darkTextColor : colors.textSecondary,
                            fontWeight: label === sug ? '700' : '500',
                          },
                        ]}
                      >
                        {sug}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Alt Aksiyon Butonları */}
                <View style={styles.actionRow}>
                  {editingFlag && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleDelete}
                      style={[styles.deleteButton, { backgroundColor: '#FFEBEE' }]}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#D32F2F" />
                      <Text style={styles.deleteButtonText}>
                        {t('common.delete', 'Sil')}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onClose}
                    style={[styles.cancelButton, { borderColor: colors.border || '#E0E0E0' }]}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                      {t('common.cancel', 'Vazgeç')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleSave}
                    style={[
                      styles.saveButton,
                      { backgroundColor: currentColorConfig.tabColor },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={currentColorConfig.textColor}
                    />
                    <Text
                      style={[
                        styles.saveButtonText,
                        { color: currentColorConfig.textColor },
                      ]}
                    >
                      {editingFlag
                        ? t('common.save', 'Kaydet')
                        : t('indexFlags.addBtn', 'Bayrak Ekle')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoid: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewArea: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  previewCaption: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 10,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  sugChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  sugText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginRight: 'auto',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D32F2F',
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
