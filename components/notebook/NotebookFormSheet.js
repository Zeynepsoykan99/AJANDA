import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import BottomSheet from '../ui/BottomSheet';
import ImageWithSkeleton from '../ui/ImageWithSkeleton';
import { COVER_TEMPLATES, DEFAULT_COVER_TEMPLATE_ID } from '../../constants/coverTemplates';

/**
 * NotebookFormSheet - Defter ekleme / yeniden adlandırma paneli
 * create: ad alanı + kapak seçici; rename: yalnızca ad alanı. Ad boşken onay butonu pasiftir.
 *
 * @param {boolean} visible
 * @param {'create'|'rename'} mode
 * @param {string} initialTitle - Yeniden adlandırmada mevcut ad
 * @param {function} onClose
 * @param {(data: { title: string, coverTemplateId?: string }) => void} onSubmit
 */
export default function NotebookFormSheet({ visible, mode = 'create', initialTitle = '', onClose, onSubmit }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [title, setTitle] = useState(initialTitle);
  const [coverTemplateId, setCoverTemplateId] = useState(DEFAULT_COVER_TEMPLATE_ID);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle || '');
      setCoverTemplateId(DEFAULT_COVER_TEMPLATE_ID);
    }
  }, [visible, initialTitle]);

  const isCreate = mode === 'create';
  const canSubmit = title.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(isCreate ? { title: title.trim(), coverTemplateId } : { title: title.trim() });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isCreate ? t('notebooks.addNotebook', 'Defter Ekle') : t('notebooks.renameTitle', 'Defteri Yeniden Adlandır')}
      footer={
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={[styles.submitButton, { backgroundColor: colors.accent, opacity: canSubmit ? 1 : 0.45 }]}
        >
          <MaterialCommunityIcons name={isCreate ? 'plus' : 'check'} size={20} color="#FFFFFF" />
          <Text style={styles.submitText}>
            {isCreate ? t('notebooks.create', 'Oluştur') : t('common.save', 'Kaydet')}
          </Text>
        </TouchableOpacity>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('notebooks.nameLabel', 'Defter Adı')}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('notebooks.namePlaceholder', 'Defterine bir ad ver')}
          placeholderTextColor={colors.textSecondary + '80'}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
          autoFocus
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        {isCreate && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('notebooks.coverLabel', 'Kapak')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.coverList}
              keyboardShouldPersistTaps="handled"
            >
              {COVER_TEMPLATES.map((cover) => {
                const isSelected = cover.id === coverTemplateId;
                return (
                  <TouchableOpacity
                    key={cover.id}
                    activeOpacity={0.8}
                    onPress={() => setCoverTemplateId(cover.id)}
                    style={[
                      styles.coverOption,
                      { borderColor: isSelected ? colors.accent : 'transparent' },
                    ]}
                    accessibilityLabel={cover.name}
                  >
                    <ImageWithSkeleton source={cover.imageSource} style={styles.coverImage} resizeMode="cover" />
                    {isSelected && (
                      <View style={[styles.selectedBadge, { backgroundColor: colors.accent }]}>
                        <MaterialCommunityIcons name="check-bold" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  coverList: {
    gap: 12,
    paddingVertical: 4,
    paddingRight: 4,
  },
  coverOption: {
    width: 86,
    aspectRatio: 0.72,
    borderRadius: 10,
    borderWidth: 3,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  selectedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 18,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
