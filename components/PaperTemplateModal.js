import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import PaperSheet from './stationery/PaperSheet';
import { getPaperTemplates, DEFAULT_PAPER_TEMPLATE_ID } from '../constants/pageTemplates';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PAPER_OPTIONS = getPaperTemplates();

const triggerHaptic = () => {
  try {
    Haptics.selectionAsync();
  } catch (e) {}
};

/**
 * PaperTemplateModal - Günlüğüm Kağıt Şablonu Seçici (Bottom Sheet)
 * ThemePickerModal ile aynı reanimated bottom sheet deseni:
 * yaylanarak açılış, karartma perdesi, tutamaçtan aşağı kaydırarak kapatma.
 *
 * @param {boolean} visible - Sheet görünür mü
 * @param {function} onClose - Kapanış animasyonu bittiğinde çağrılır
 * @param {string} currentTemplateId - Açılışta seçili gelecek şablon
 * @param {function} onSelectTemplate - (templateId) => void, onay butonuyla çağrılır
 * @param {'diaryDefault'|'editPage'|'newPage'} mode
 *   diaryDefault: yeni sayfaların varsayılanı (kapak ekranı)
 *   editPage: aktif sayfanın şablonunu değiştir
 *   newPage: yeni eklenecek sayfanın şablonunu seç
 */
export default function PaperTemplateModal({
  visible,
  onClose,
  currentTemplateId = DEFAULT_PAPER_TEMPLATE_ID,
  onSelectTemplate,
  mode = 'diaryDefault',
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [isRendered, setIsRendered] = useState(visible);
  const [selectedId, setSelectedId] = useState(currentTemplateId);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const handleAnimationFinish = useCallback(() => {
    setIsRendered(false);
    if (onClose) onClose();
  }, [onClose]);

  const closeSheet = useCallback(() => {
    'worklet';
    backdropOpacity.value = withTiming(0, { duration: 220 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 240 }, (finished) => {
      if (finished) {
        runOnJS(handleAnimationFinish)();
      }
    });
  }, [backdropOpacity, translateY, handleAnimationFinish]);

  // visible prop'u değiştiğinde açılış / kapanış animasyonları
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      setSelectedId(currentTemplateId);
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;

      backdropOpacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 160,
        mass: 0.9,
      });
    } else if (isRendered) {
      closeSheet();
    }
  }, [visible]);

  // Sürükleyerek Kapatma (Swipe-to-Dismiss)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 6,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.value = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.8) {
          triggerHaptic();
          closeSheet();
        } else {
          translateY.value = withSpring(0, {
            damping: 20,
            stiffness: 180,
          });
        }
      },
    })
  ).current;

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleSelectOption = (templateId) => {
    triggerHaptic();
    setSelectedId(templateId);
  };

  const handleConfirm = () => {
    if (onSelectTemplate) onSelectTemplate(selectedId);
    closeSheet();
  };

  if (!isRendered) return null;

  const title =
    mode === 'editPage'
      ? t('diary.changeTemplate', 'Şablon Değiştir')
      : mode === 'newPage'
      ? t('diary.addPage', 'Yeni Sayfa Ekle')
      : t('diary.selectTemplate', 'Sayfa Şablonu Seç');

  const subtitle =
    mode === 'editPage'
      ? t('diary.editTemplateDesc', 'Bu sayfanın kağıt düzenini seçin:')
      : mode === 'newPage'
      ? t('diary.newPageTemplateDesc', 'Yeni sayfanın kağıt düzenini seçin:')
      : t('diary.templateDesc', 'Yeni eklenen sayfalarda varsayılan olarak kullanılacak kağıt düzenini belirleyin:');

  const confirmLabel =
    mode === 'newPage' ? t('diary.addPage', 'Yeni Sayfa Ekle') : t('common.save', 'Kaydet');

  return (
    <Modal
      visible={isRendered}
      transparent={true}
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Karartma Perdesi (Backdrop) */}
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeSheet}
          />
        </Animated.View>

        {/* Bottom Sheet Paneli */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            isTablet && styles.sheetContainerTablet,
            animatedSheetStyle,
          ]}
        >
          {/* Sürükleme Tutamacı */}
          <View style={styles.dragHandleWrapper} {...panResponder.panHandlers}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          </View>

          {/* Başlık ve Kapat Butonu */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary + 'B3' }]}>
                {subtitle}
              </Text>
            </View>

            <TouchableOpacity
              onPress={closeSheet}
              style={[
                styles.closeButton,
                { backgroundColor: colors.border + '25', borderColor: colors.border + '40' },
              ]}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.optionsScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {PAPER_OPTIONS.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectOption(item.id)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: isSelected ? colors.accent + '0D' : colors.card,
                      borderColor: isSelected ? colors.accent : colors.border + '80',
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  {/* Mini Önizleme: sayfada kullanılan kağıt verisinin aynısı */}
                  <View style={styles.previewContainer}>
                    <PaperSheet
                      ruling={item.paper.ruling}
                      paperColor={item.paper.paperColor}
                      lineColor={item.paper.lineColor}
                      showMargin={item.paper.ruling === 'lined'}
                      style={styles.miniSheet}
                    >
                      <View style={styles.previewCenterIcon}>
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={22}
                          color={isSelected ? colors.accent : '#C2185B88'}
                        />
                      </View>
                    </PaperSheet>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text
                      style={[
                        styles.cardTitle,
                        { color: isSelected ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {t(item.titleKey, item.name)}
                    </Text>
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                      {t(item.descKey, item.defaultDesc)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radio,
                      { borderColor: isSelected ? colors.accent : colors.border },
                    ]}
                  >
                    {isSelected && (
                      <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Onay Butonu */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleConfirm}
            style={[styles.confirmButton, { backgroundColor: colors.accent }]}
          >
            <MaterialCommunityIcons
              name={mode === 'newPage' ? 'plus' : 'check'}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: SCREEN_HEIGHT * 0.86,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 24,
  },
  sheetContainerTablet: {
    width: 560,
    alignSelf: 'center',
    borderRadius: 28,
    borderBottomWidth: 1,
    marginBottom: 32,
  },
  dragHandleWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerTitleContainer: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 18,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Küçük ekranlarda liste daralıp kayar, onay butonu her zaman görünür kalır
  optionsScroll: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    gap: 14,
  },
  previewContainer: {
    width: 62,
    height: 78,
    borderRadius: 8,
    overflow: 'hidden',
  },
  miniSheet: {
    flex: 1,
    borderRadius: 8,
  },
  previewCenterIcon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 18,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
