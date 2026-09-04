import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { SUPPORTED_LANGUAGES, changeAppLanguage, getDeviceLanguage } from '../i18n';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

/**
 * LanguagePickerModal - Çoklu Dil Seçim Menüsü
 * Kullanıcının Türkçe ve İngilizce dilleri arasında geçiş yapmasını sağlar.
 * Tercihi AsyncStorage'a kalıcı olarak kaydeder.
 */
export default function LanguagePickerModal({ visible, onClose }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const currentLang = i18n.language || 'tr';
  const deviceLang = getDeviceLanguage();

  const handleSelectLanguage = async (code) => {
    triggerHaptic();
    await changeAppLanguage(code);
    if (onClose) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.card, borderColor: colors.border },
            isTablet && styles.modalContentTablet,
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Drag Handle */}
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <MaterialCommunityIcons name="translate" size={22} color={colors.accent} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('language.title', 'Dil Seçin')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.background }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('language.subtitle', 'Uygulama arayüz dilini belirleyin')}
          </Text>

          {/* Language Options List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollWrapper}
            contentContainerStyle={styles.optionsList}
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = currentLang.startsWith(lang.code);
              const isDeviceLang = deviceLang === lang.code;

              return (
                <TouchableOpacity
                  key={lang.code}
                  activeOpacity={0.7}
                  onPress={() => handleSelectLanguage(lang.code)}
                  style={[
                    styles.langCard,
                    {
                      backgroundColor: isSelected ? colors.accent + '12' : colors.background,
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.cardLeft}>
                    <Text style={styles.flagEmoji}>{lang.flag}</Text>
                    <View style={styles.textGroup}>
                      <Text
                        style={[
                          styles.langName,
                          {
                            color: isSelected ? colors.accent : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {lang.label}
                      </Text>
                      {isDeviceLang && (
                        <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                          {t('language.systemDefault', 'Sistem Dili')}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    {isSelected ? (
                      <View style={[styles.checkCircle, { backgroundColor: colors.accent }]}>
                        <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.emptyCircle,
                          { borderColor: colors.border },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalContentTablet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    marginBottom: 40,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollWrapper: {
    maxHeight: 380,
  },
  optionsList: {
    gap: 12,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flagEmoji: {
    fontSize: 26,
  },
  textGroup: {
    gap: 2,
  },
  langName: {
    fontSize: 16,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardRight: {
    marginLeft: 8,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
  },
});
