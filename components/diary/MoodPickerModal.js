import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { MOODS, formatBadgeDate } from './DiaryDateMoodBadge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * MoodPickerModal - Günlük sayfaları için şık ve nostaljik Duygu Durumu Seçici
 *
 * @param {object} props
 * @param {boolean} props.visible - Modal görünürlüğü
 * @param {function} props.onClose - Modalı kapatma callback'i
 * @param {string|null} props.currentMood - Sayfada halihazırda seçili mood ('happy', 'calm' vb.)
 * @param {function} props.onSelectMood - Mood seçildiğinde tetiklenen callback: (moodKey | null) => void
 * @param {string|Date} [props.pageDate] - Sayfanın tarihi
 */
export default function MoodPickerModal({
  visible,
  onClose,
  currentMood = null,
  onSelectMood,
  pageDate,
}) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();

  const formattedDate = formatBadgeDate(pageDate || new Date(), i18n.language);

  const handleSelect = (moodKey) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    if (onSelectMood) {
      onSelectMood(moodKey);
    }
    onClose && onClose();
  };

  const handleClear = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    if (onSelectMood) {
      onSelectMood(null);
    }
    onClose && onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? colors.card : '#FFFDF9',
                  borderColor: isDark ? colors.border : '#EFE8DE',
                },
              ]}
            >
              {/* Tutamaç / Pull indicator */}
              <View style={styles.handleBar} />

              {/* Üst Bilgi Başlığı */}
              <View style={styles.header}>
                <View style={styles.headerTextGroup}>
                  <View style={styles.dateTag}>
                    <MaterialCommunityIcons
                      name="calendar-heart"
                      size={14}
                      color="#8D6E63"
                    />
                    <Text style={styles.dateTagText}>{formattedDate}</Text>
                  </View>
                  <Text
                    style={[
                      styles.title,
                      { color: isDark ? colors.textPrimary : '#4E342E' },
                    ]}
                  >
                    {t('mood.title', 'Bugün Nasıl Hissediyorsun?')}
                  </Text>
                  <Text
                    style={[
                      styles.subtitle,
                      { color: isDark ? colors.textSecondary : '#8D6E63' },
                    ]}
                  >
                    {t(
                      'mood.subtitle',
                      'Günlük sayfana o anki ruh halini yansıtan bir duygu ekle'
                    )}
                  </Text>
                </View>

                {/* Kapat Butonu */}
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: isDark ? colors.background : '#F5EFEB' },
                  ]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close', 'Kapat')}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={18}
                    color={isDark ? colors.textSecondary : '#6D4C41'}
                  />
                </TouchableOpacity>
              </View>

              {/* 12'li Duygu Izgarası */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 370 }}
                contentContainerStyle={styles.moodsGrid}
              >
                {MOODS.map((item) => {
                  const isSelected = currentMood === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      activeOpacity={0.7}
                      onPress={() => handleSelect(item.key)}
                      style={[
                        styles.moodCard,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? '#5D403760'
                              : '#F5EDE0'
                            : isDark
                            ? colors.background
                            : '#FAF6EE',
                          borderColor: isSelected
                            ? '#8D6E63'
                            : isDark
                            ? colors.border
                            : '#EFE8DE',
                          borderWidth: isSelected ? 1.8 : 1,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={t(item.labelKey, item.defaultLabel)}
                    >
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <MaterialCommunityIcons
                            name="check"
                            size={11}
                            color="#FFFFFF"
                          />
                        </View>
                      )}
                      <Text style={styles.moodEmoji}>{item.emoji}</Text>
                      <Text
                        style={[
                          styles.moodLabel,
                          {
                            color: isSelected
                              ? isDark
                                ? '#FFFFFF'
                                : '#4E342E'
                              : isDark
                              ? colors.textPrimary
                              : '#6D4C41',
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {t(item.labelKey, item.defaultLabel)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Alt Butonlar: Duyguyu Kaldır */}
              {currentMood ? (
                <View style={styles.bottomActions}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleClear}
                    style={[
                      styles.clearButton,
                      {
                        backgroundColor: isDark
                          ? colors.background
                          : '#FAF5EE',
                        borderColor: isDark ? colors.border : '#E2D8CC',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={16}
                      color="#A1887F"
                    />
                    <Text
                      style={[
                        styles.clearButtonText,
                        { color: isDark ? colors.textSecondary : '#8D6E63' },
                      ]}
                    >
                      {t('mood.clear', 'Duyguyu Kaldır')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    shadowColor: '#2D1F1D',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D7CCC8',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dateTagText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#8D6E63',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  moodCard: {
    width: (Math.min(SCREEN_WIDTH, 520) - 40 - 30) / 4,
    aspectRatio: 0.92,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'relative',
    shadowColor: '#3E2723',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#8D6E63',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  bottomActions: {
    marginTop: 16,
    alignItems: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  clearButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
