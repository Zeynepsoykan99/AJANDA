import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import PaperSheet from './stationery/PaperSheet';

const PAPER_OPTIONS = [
  {
    id: 'blank_lined',
    titleKey: 'diary.templates.lined',
    defaultTitle: 'Çizgili Sayfa',
    ruling: 'lined',
    icon: 'format-line-spacing',
    desc: 'Düzenli yazı ve günlük notlar için',
  },
  {
    id: 'blank_grid',
    titleKey: 'diary.templates.grid',
    defaultTitle: 'Kareli Sayfa',
    ruling: 'grid',
    icon: 'grid',
    desc: 'Matematik, planlama ve çizimler için',
  },
  {
    id: 'blank_dotted',
    titleKey: 'diary.templates.dotted',
    defaultTitle: 'Noktalı Sayfa',
    ruling: 'dotted',
    icon: 'dots-grid',
    desc: 'Bullet journal ve serbest tasarımlar için',
  },
  {
    id: 'blank_plain',
    titleKey: 'diary.templates.plain',
    defaultTitle: 'Düz Sayfa',
    ruling: 'blank',
    icon: 'file-outline',
    desc: 'Tamamen boş serbest çizim tuvali',
  },
];

export default function PaperTemplateModal({
  visible,
  onClose,
  currentTemplateId = 'blank_lined',
  onSelectTemplate,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [selectedId, setSelectedId] = useState(currentTemplateId);

  const handleSave = () => {
    onSelectTemplate(selectedId);
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
            {t('diary.selectTemplate', 'Sayfa Şablonu Seç')}
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
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('diary.templateDesc', 'Günlüğün tüm sayfalarında kullanılacak iç kağıt düzenini belirleyin:')}
          </Text>

          <View style={styles.grid}>
            {PAPER_OPTIONS.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedId(item.id)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderWidth: isSelected ? 2.5 : 1,
                    },
                  ]}
                >
                  {/* Mini Önizleme Tuvali */}
                  <View style={styles.previewContainer}>
                    <PaperSheet
                      ruling={item.ruling}
                      paperColor="#FFFDF9"
                      lineColor="#F8BBD060"
                      style={styles.miniSheet}
                    >
                      <View style={styles.previewCenterIcon}>
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={28}
                          color={isSelected ? colors.accent : '#C2185B88'}
                        />
                      </View>
                    </PaperSheet>

                    {isSelected && (
                      <View style={[styles.selectedBadge, { backgroundColor: colors.accent }]}>
                        <MaterialCommunityIcons name="check-bold" size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.cardInfo}>
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: isSelected ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {t(item.titleKey, item.defaultTitle)}
                    </Text>
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                      {item.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  tabletContainer: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  grid: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    gap: 16,
  },
  previewContainer: {
    width: 90,
    height: 110,
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  miniSheet: {
    flex: 1,
    borderRadius: 10,
  },
  previewCenterIcon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
