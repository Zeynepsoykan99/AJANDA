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
import { COVER_TEMPLATES } from '../constants/coverTemplates';
import CoverDisplay from './CoverDisplay';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

/**
 * CoverEditor - Kapak düzenleme modal bileşeni
 * Kullanıcı kapak şablonunu değiştirebilir ve isim/not yazabilir.
 *
 * @param {boolean} visible - Modal görünürlük durumu
 * @param {function} onClose - Kapatma fonksiyonu
 * @param {object} coverData - Mevcut kapak verileri { templateId, userName, userNote }
 * @param {function} onSave - Kaydetme fonksiyonu (coverData) => void
 */
export default function CoverEditor({ visible, onClose, coverData, onSave }) {
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    coverData?.templateId || COVER_TEMPLATES[0].id
  );
  const [userName, setUserName] = useState(coverData?.userName || '');
  const [userNote, setUserNote] = useState(coverData?.userNote || '');

  const selectedTemplate = COVER_TEMPLATES.find(
    (t) => t.id === selectedTemplateId
  );

  const handleSave = () => {
    onSave({
      templateId: selectedTemplateId,
      userName: userName.trim(),
      userNote: userNote.trim(),
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Üst Bar */}
        <View style={[styles.header, isTablet && styles.tabletContainer]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Kapağı Düzenle
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: colors.accent }]}
          >
            <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.tabletContainer,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Kapak Önizleme */}
          <View style={styles.previewContainer}>
            <CoverDisplay
              template={selectedTemplate}
              userName={userName || 'Ajandom'}
              userNote={userNote}
            />
          </View>

          {/* İsim Girişi */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              <MaterialCommunityIcons
                name="account-heart-outline"
                size={16}
                color={colors.textSecondary}
              />{' '}
              İsminiz
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor: colors.border,
                  color: colors.textDeep,
                  backgroundColor: colors.card,
                },
              ]}
              value={userName}
              onChangeText={setUserName}
              placeholder="Ajandom"
              placeholderTextColor={colors.border}
              maxLength={30}
            />
          </View>

          {/* Not Girişi */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              <MaterialCommunityIcons
                name="note-text-outline"
                size={16}
                color={colors.textSecondary}
              />{' '}
              Küçük Notunuz
            </Text>
            <TextInput
              style={[
                styles.textInput,
                styles.multilineInput,
                {
                  borderColor: colors.border,
                  color: colors.textDeep,
                  backgroundColor: colors.card,
                },
              ]}
              value={userNote}
              onChangeText={setUserNote}
              placeholder="İlham veren bir söz yazın..."
              placeholderTextColor={colors.border}
              multiline
              numberOfLines={3}
              maxLength={100}
            />
          </View>

          {/* Şablon Galerisi */}
          <View style={styles.templateSection}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              <MaterialCommunityIcons
                name="palette-outline"
                size={16}
                color={colors.textSecondary}
              />{' '}
              Kapak Şablonu
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateGallery}
            >
              {COVER_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTemplateId(template.id)}
                  style={[
                    styles.templateCard,
                    {
                      backgroundColor: template.backgroundColor,
                      borderColor:
                        selectedTemplateId === template.id
                          ? template.accentColor
                          : template.borderColor,
                      borderWidth:
                        selectedTemplateId === template.id ? 3 : 1.5,
                    },
                  ]}
                >
                  <Text style={styles.templateEmoji}>
                    {template.decorationEmoji}
                  </Text>
                  <Text
                    style={[
                      styles.templateName,
                      { color: template.accentColor },
                    ]}
                    numberOfLines={1}
                  >
                    {template.name}
                  </Text>
                  {selectedTemplateId === template.id && (
                    <View
                      style={[
                        styles.selectedBadge,
                        { backgroundColor: template.accentColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="check"
                        size={12}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
    paddingBottom: 12,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabletContainer: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  inputSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  templateSection: {
    paddingLeft: 24,
    marginBottom: 20,
  },
  templateGallery: {
    paddingRight: 24,
    gap: 12,
    paddingVertical: 8,
  },
  templateCard: {
    width: 90,
    height: 110,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  templateEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  templateName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
