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
  getTemplatesForCategory,
  generatePageId,
  createDefaultPageData,
} from '../constants/pageTemplates';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

/**
 * AddTodoModal - Sadece To-Do listeleri için özel modal
 *
 * Akış: Şablon seç → Başlık gir → Oluştur
 */
export default function AddTodoModal({ visible, onClose, onAdd }) {
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [step, setStep] = useState(1); // 1: Şablon, 2: Başlık
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [title, setTitle] = useState('');

  const templates = getTemplatesForCategory('todo');

  const resetAndClose = () => {
    setStep(1);
    setSelectedTemplateId(null);
    setTitle('');
    onClose();
  };

  const handleCreate = () => {
    if (!selectedTemplateId) return;

    const newPage = {
      id: generatePageId(),
      category: 'todo',
      templateId: selectedTemplateId,
      title: title.trim() || 'Yeni Liste',
      createdAt: new Date().toISOString(),
      order: Date.now(),
      data: createDefaultPageData('todo'),
      stickers: [],
    };

    onAdd(newPage);
    resetAndClose();
  };

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
            {step === 1 ? 'Şablon Seç' : 'Liste Başlığı'}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.tabletModalContainer,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Adım 1: Şablon Seçimi */}
          {step === 1 && (
            <View>
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
                        name="checkbox-marked-outline"
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

              {/* İleri butonu */}
              <TouchableOpacity
                onPress={() => {
                  if (selectedTemplateId) setStep(2);
                }}
                style={[
                  styles.nextButton,
                  { backgroundColor: selectedTemplateId ? colors.accent : colors.border },
                ]}
                disabled={!selectedTemplateId}
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

          {/* Adım 2: Başlık ve Oluştur */}
          {step === 2 && (
            <View style={styles.finalStep}>
              <View style={styles.inputSection}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Liste Adı (opsiyonel)
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
                  placeholder="Market Alışverişi, Günlük Görevler..."
                  placeholderTextColor={colors.border}
                  maxLength={40}
                  autoFocus={true}
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
                <Text style={styles.createButtonText}>Listeyi Oluştur</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  tabletModalContainer: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  templateList: {
    gap: 12,
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
    gap: 4,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '700',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
    marginTop: 24,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  finalStep: {
    gap: 20,
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
    marginTop: 16,
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
