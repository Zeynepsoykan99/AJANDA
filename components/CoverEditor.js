import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { COVER_TEMPLATES } from '../constants/coverTemplates';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import InteractiveCover3D from './stationery/InteractiveCover3D';

/**
 * CoverEditor - Görsel Kapak Seçim Galerisi
 * Metin girişleri kaldırılmıştır; kullanıcı sadece temiz bir galeriden şablon seçer.
 */
export default function CoverEditor({ visible, onClose, coverData, onSave }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    coverData?.templateId || COVER_TEMPLATES[0].id
  );

  const handleSave = () => {
    // coverData içerisindeki olası çizim/metin datalarını ezmemek için destructuring ile birleştiriyoruz
    onSave({
      ...coverData,
      templateId: selectedTemplateId,
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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            {t('agenda.selectCover', 'Kapak Seç')}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: colors.accent }]}
          >
            <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>{t('common.save', 'Kaydet')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet && styles.tabletContainer,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Şablon Galerisi (Izgara Yapısı) */}
          <View style={styles.templateSection}>
            <View style={styles.gridContainer}>
              {COVER_TEMPLATES.map((template) => (
                <InteractiveCover3D
                  key={template.id}
                  onPress={() => setSelectedTemplateId(template.id)}
                  style={[
                    styles.templateCard,
                    selectedTemplateId === template.id && {
                      borderColor: colors.accent,
                      borderWidth: 3,
                    },
                  ]}
                  compact={true}
                  maxTilt={8}
                >
                  <Image
                    source={template.imageSource}
                    style={styles.templateImage}
                    resizeMode="cover"
                  />
                  {selectedTemplateId === template.id && (
                    <View
                      style={[
                        styles.selectedBadge,
                        { backgroundColor: colors.accent },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                  )}
                </InteractiveCover3D>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  tabletContainer: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  templateSection: {
    paddingHorizontal: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  templateCard: {
    width: '45%',
    aspectRatio: 0.72, // Defter/A4 oranına yakın
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateImage: {
    width: '100%',
    height: '100%',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
