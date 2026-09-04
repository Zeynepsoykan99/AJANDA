import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import {
  PAGE_CATEGORIES,
  PAGE_TEMPLATES,
  getTemplatesForCategory,
  generatePageId,
  createDefaultPageData,
} from '../constants/pageTemplates';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

/**
 * AddPageModal - Yeni sayfa ekleme modal bileşeni
 *
 * Akış: Kategori seç → Şablon seç → Başlık gir → Oluştur
 *
 * @param {boolean} visible
 * @param {function} onClose
 * @param {function} onAdd - (newPage) => void
 */
export default function AddPageModal({ visible, onClose, onAdd }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [step, setStep] = useState(1); // 1: Kategori, 2: Şablon, 3: Başlık
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [title, setTitle] = useState('');

  const resetAndClose = () => {
    setStep(1);
    setSelectedCategory(null);
    setSelectedTemplateId(null);
    setTitle('');
    onClose();
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    const tmpls = getTemplatesForCategory(category.id);
    if (tmpls?.length > 0) {
      setSelectedTemplateId(tmpls[0].id);
    }
    setStep(2);
  };

  const getCategoryName = (cat) => {
    if (!cat) return '';
    if (cat.id === 'todo') return t('agenda.categoryTodo', cat.name);
    if (cat.id === 'monthly') return t('agenda.categoryMonthly', cat.name);
    if (cat.id === 'weekly') return t('agenda.categoryWeekly', cat.name);
    return cat.name;
  };

  const handleCreate = () => {
    if (!selectedCategory || !selectedTemplateId) return;

    const newPage = {
      id: generatePageId(),
      category: selectedCategory.id,
      templateId: selectedTemplateId,
      title: title.trim() || getCategoryName(selectedCategory) || t('agenda.newPageDefault', 'Yeni Sayfa'),
      createdAt: new Date().toISOString(),
      order: Date.now(),
      data: createDefaultPageData(selectedCategory.id),
      stickers: [],
    };

    onAdd(newPage);
    resetAndClose();
  };

  const templates = selectedCategory
    ? getTemplatesForCategory(selectedCategory.id)
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.tabletModalContainer,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Üst Bar */}
          <View style={[styles.header]}>
            <TouchableOpacity
              onPress={step > 1 ? () => setStep(step - 1) : resetAndClose}
              style={styles.headerBtn}
            >
              <MaterialCommunityIcons
                name={step > 1 ? 'arrow-left' : 'close'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {step === 1
                ? t('agenda.typeStep', 'Sayfa Türü Seç')
                : step === 2
                ? t('agenda.templateStep', 'Şablon Seç')
                : t('agenda.finalStep', 'Son Dokunuşlar')}
            </Text>
            <View style={styles.headerBtn} />
          </View>

          {/* Adım göstergesi */}
          <View style={[styles.stepIndicator]}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      s <= step ? colors.accent : colors.border,
                    width: s === step ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
          {/* Adım 1: Kategori Seçimi */}
          {step === 1 && (
            <View style={styles.categoriesGrid}>
              {PAGE_CATEGORIES.filter(c => c.id !== 'todo').map((category) => (
                <TouchableOpacity
                  key={category.id}
                  activeOpacity={0.7}
                  onPress={() => handleCategorySelect(category)}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      shadowColor: colors.textPrimary,
                    },
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                  <MaterialCommunityIcons
                    name={category.icon}
                    size={32}
                    color={colors.accent}
                  />
                  <Text
                    style={[
                      styles.categoryName,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {getCategoryName(category)}
                  </Text>
                  <Text
                    style={[
                      styles.categoryDesc,
                      { color: colors.textSecondary + '99' },
                    ]}
                  >
                    {category.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Adım 2: Şablon Seçimi */}
          {step === 2 && (
            <View>
              {selectedCategory?.id === 'weekly' || templates.every((t) => t.image) ? (
                /* Sade Seçim: Yan yana dikdörtgen kutular, SADECE görsel thumbnail */
                <View style={styles.imageGridList}>
                  {templates.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <TouchableOpacity
                        key={tmpl.id}
                        activeOpacity={0.85}
                        onPress={() => setSelectedTemplateId(tmpl.id)}
                        style={[
                          styles.imageTemplateCard,
                          isSelected && styles.imageTemplateCardSelected,
                        ]}
                      >
                        <Image
                          source={tmpl.image}
                          style={styles.imageCardThumbnail}
                          resizeMode="cover"
                        />
                        {isSelected && (
                          <View style={styles.selectedIndicator}>
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={24}
                              color="#E91E63"
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.templateList}>
                  {templates.map((tmpl) => (
                    <TouchableOpacity
                      key={tmpl.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedTemplateId(tmpl.id)}
                      style={[
                        styles.templateCard,
                        {
                          backgroundColor: tmpl.colors.bg,
                          borderColor:
                            selectedTemplateId === tmpl.id
                              ? tmpl.colors.accent
                              : tmpl.colors.bg,
                          borderWidth: selectedTemplateId === tmpl.id ? 3 : 1.5,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.templatePreview,
                          { backgroundColor: tmpl.colors.accent + '15' },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={selectedCategory?.icon || 'file-outline'}
                          size={36}
                          color={tmpl.colors.accent}
                        />
                      </View>
                      <View style={styles.templateInfo}>
                        <Text
                          style={[
                            styles.templateName,
                            { color: tmpl.colors.accent },
                          ]}
                        >
                          {tmpl.name}
                        </Text>
                      </View>
                      {selectedTemplateId === tmpl.id && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={24}
                          color={tmpl.colors.accent}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* İleri butonu */}
              <TouchableOpacity
                onPress={() => setStep(3)}
                style={[
                  styles.nextButton,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Text style={styles.nextButtonText}>{t('todo.next', 'Devam Et')}</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Adım 3: Başlık ve Oluştur */}
          {step === 3 && (
            <View style={styles.finalStep}>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {t('agenda.pageType', 'Sayfa Türü')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {selectedCategory?.emoji} {getCategoryName(selectedCategory)}
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  {t('agenda.pageTitleOptional', 'Sayfa Başlığı (opsiyonel)')}
                </Text>
                <TextInput
                  style={[
                    styles.titleInput,
                    {
                      borderColor: colors.border,
                      color: colors.textDeep,
                      backgroundColor: colors.card,
                    },
                  ]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={getCategoryName(selectedCategory) || t('agenda.newPageDefault', 'Yeni Sayfa')}
                  placeholderTextColor={colors.border}
                  maxLength={40}
                />
              </View>

              {/* Oluştur butonu */}
              <TouchableOpacity
                onPress={handleCreate}
                style={[
                  styles.createButton,
                  { backgroundColor: colors.accent },
                ]}
              >
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={22}
                  color="#FFFFFF"
                />
                <Text style={styles.createButtonText}>{t('agenda.createPage', 'Sayfayı Oluştur')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  tabletModalContainer: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  // Kategori Kartları
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
    paddingTop: 8,
  },
  categoryCard: {
    width: '47%',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  // Şablon Kartları
  templateList: {
    gap: 12,
    paddingTop: 8,
  },
  // Dikdörtgen Yan Yana Görsel Şablon Grid'i
  imageGridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  imageTemplateCard: {
    width: '47%',
    aspectRatio: 0.70,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E8E0E4',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  imageTemplateCardSelected: {
    borderColor: '#E91E63',
    borderWidth: 3.5,
    shadowColor: '#E91E63',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  imageCardThumbnail: {
    width: '100%',
    height: '100%',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 14,
  },
  templatePreview: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewContainer: {
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#F8BBD0',
  },
  templateThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  templateInfo: {
    flex: 1,
    gap: 4,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalBadge: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  originalBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  templateDesc: {
    fontSize: 12,
    marginTop: -2,
    marginBottom: 2,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: 6,
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00000010',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
    marginTop: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Son Adım
  finalStep: {
    paddingTop: 8,
    gap: 20,
  },
  summaryCard: {
    gap: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  titleInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    gap: 10,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
