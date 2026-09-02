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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  PAGE_CATEGORIES,
  PAGE_TEMPLATES,
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
    const templates = PAGE_TEMPLATES[category.id];
    if (templates?.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
    setStep(2);
  };

  const handleCreate = () => {
    if (!selectedCategory || !selectedTemplateId) return;

    const newPage = {
      id: generatePageId(),
      category: selectedCategory.id,
      templateId: selectedTemplateId,
      title: title.trim() || `${selectedCategory.name}`,
      createdAt: new Date().toISOString(),
      order: Date.now(),
      data: createDefaultPageData(selectedCategory.id),
      stickers: [],
    };

    onAdd(newPage);
    resetAndClose();
  };

  const templates = selectedCategory
    ? PAGE_TEMPLATES[selectedCategory.id] || []
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
        {/* Üst Bar */}
        <View style={[styles.header, isTablet && styles.tabletModalContainer]}>
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
              ? 'Sayfa Türü Seç'
              : step === 2
              ? 'Şablon Seç'
              : 'Son Dokunuşlar'}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Adım göstergesi */}
        <View style={[styles.stepIndicator, isTablet && styles.tabletModalContainer]}>
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

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.tabletModalContainer,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Adım 1: Kategori Seçimi */}
          {step === 1 && (
            <View style={styles.categoriesGrid}>
              {PAGE_CATEGORIES.map((category) => (
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
                    {category.name}
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
                    <View style={styles.colorSwatches}>
                      {Object.values(tmpl.colors)
                        .slice(0, 4)
                        .map((color, i) => (
                          <View
                            key={i}
                            style={[
                              styles.colorSwatch,
                              { backgroundColor: color },
                            ]}
                          />
                        ))}
                    </View>
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

              {/* İleri butonu */}
              <TouchableOpacity
                onPress={() => setStep(3)}
                style={[
                  styles.nextButton,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Text style={styles.nextButtonText}>Devam Et</Text>
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
                  Sayfa Türü
                </Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                  {selectedCategory?.emoji} {selectedCategory?.name}
                </Text>
              </View>

              <View style={styles.inputSection}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Sayfa Başlığı (opsiyonel)
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
                  placeholder={`${selectedCategory?.name || 'Yeni Sayfa'}`}
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
                <Text style={styles.createButtonText}>Sayfayı Oluştur</Text>
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
    paddingHorizontal: 16,
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
  templateInfo: {
    flex: 1,
    gap: 6,
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
