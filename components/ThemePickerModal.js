import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
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
import ColorPicker, { Panel3, Preview } from 'reanimated-color-picker';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { getAllThemes } from '../constants/themes';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const triggerHaptic = () => {
  try {
    Haptics.selectionAsync();
  } catch (e) {}
};

/**
 * ThemePickerModal - Lüks ve Akıcı Bottom Sheet Renk Seçici
 * 
 * - react-native-reanimated ile akıcı açılış ve yaylanma (spring) animasyonları
 * - Tutamaç (drag handle) üzerinden aşağı kaydırarak kapatma (swipe-to-dismiss)
 * - Yatay kaydırılabilir lüks renk swatch'ları ve aktif halka vurgusu (halo ring)
 * - Katlanabilir özel renk seçici (reanimated-color-picker) ve anlık HEX önizlemesi
 * - Dokunsal geri bildirim (Haptics)
 */
export default function ThemePickerModal({ visible, onClose }) {
  const { t } = useTranslation();
  const { theme, setTheme, colors } = useTheme();
  const { isTablet } = useResponsiveLayout();
  const allThemes = getAllThemes();

  const [isRendered, setIsRendered] = useState(visible);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Reanimated Paylaşımlı Değerler
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Kapanış animasyonunu tamamlayıp onClose tetikleme
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
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;

      // Açılış yaylanma animasyonu (spring)
      backdropOpacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 160,
        mass: 0.9,
      });

      // Eğer mevcut tema özel bir renkse renk çarkını açık başlat
      if (theme.id && theme.id.startsWith('custom:')) {
        setShowColorPicker(true);
      }
    } else if (isRendered) {
      closeSheet();
    }
  }, [visible]);

  // Sürükleyerek Kapatma (PanResponder Swipe-to-Dismiss)
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

  // Animasyonlu Stiller
  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Tema seçildiğinde
  const handleSelectTheme = (themeId) => {
    triggerHaptic();
    setTheme(themeId);
    if (themeId.startsWith('custom:')) {
      setShowColorPicker(true);
    } else {
      setShowColorPicker(false);
    }
  };

  // Özel Renk Değişimi
  const onSelectColor = ({ hex }) => {
    setTheme(`custom:${hex}`);
  };

  if (!isRendered) return null;

  const isCustomActive = Boolean(theme.id && theme.id.startsWith('custom:'));
  const currentCustomHex = isCustomActive ? theme.colors.background : '#FF85A2';

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
          {/* Sürükleme Tutamacı Alanı (PanResponder Hedefi) */}
          <View style={styles.dragHandleWrapper} {...panResponder.panHandlers}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          </View>

          {/* Başlık ve Kapat Butonu */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t('theme.title', 'Uygulama Teması')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary + 'B3' }]}>
                {t('theme.subtitle', "AJANDA'nın görünümünü kendi zevkine göre kişiselleştir.")}
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
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Bölüm Başlığı: Hazır Temalar */}
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="palette" size={16} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('theme.presetThemes', 'Hazır Temalar')}
              </Text>
            </View>

            {/* Yatay Kaydırılabilir Lüks Swatches */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.swatchesScrollList}
            >
              {allThemes.map((tItem) => {
                const isSelected = theme.id === tItem.id;
                return (
                  <TouchableOpacity
                    key={tItem.id}
                    activeOpacity={0.75}
                    onPress={() => handleSelectTheme(tItem.id)}
                    style={styles.swatchItem}
                  >
                    {/* Dış Halka Vurgusu (Halo Ring) */}
                    <View
                      style={[
                        styles.swatchOuterRing,
                        {
                          borderColor: isSelected ? tItem.colors.accent : 'transparent',
                          backgroundColor: isSelected ? tItem.colors.accent + '15' : 'transparent',
                        },
                      ]}
                    >
                      {/* Renk Çemberi */}
                      <View
                        style={[
                          styles.swatchCircle,
                          {
                            backgroundColor: tItem.colors.background,
                            borderColor: isSelected ? tItem.colors.accent : colors.border + '70',
                          },
                        ]}
                      >
                        {isSelected ? (
                          <View
                            style={[
                              styles.checkBadge,
                              { backgroundColor: tItem.colors.accent },
                            ]}
                          >
                            <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                          </View>
                        ) : (
                          <Text style={styles.swatchEmoji}>{tItem.emoji}</Text>
                        )}
                      </View>
                    </View>

                    {/* Tema İsmi */}
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.swatchLabel,
                        {
                          color: isSelected ? tItem.colors.accent : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {tItem.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Özel Renk Swatch Butonu */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  triggerHaptic();
                  setShowColorPicker((prev) => !prev);
                  if (!isCustomActive) {
                    setTheme(`custom:${currentCustomHex}`);
                  }
                }}
                style={styles.swatchItem}
              >
                <View
                  style={[
                    styles.swatchOuterRing,
                    {
                      borderColor: isCustomActive ? colors.accent : (showColorPicker ? colors.border : 'transparent'),
                      backgroundColor: isCustomActive ? colors.accent + '15' : 'transparent',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.swatchCircle,
                      styles.customSwatchCircle,
                      {
                        backgroundColor: isCustomActive ? theme.colors.background : colors.backgroundLight,
                        borderColor: isCustomActive ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    {isCustomActive ? (
                      <View
                        style={[
                          styles.checkBadge,
                          { backgroundColor: colors.accent },
                        ]}
                      >
                        <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                      </View>
                    ) : (
                      <MaterialCommunityIcons
                        name="auto-fix"
                        size={20}
                        color={colors.accent}
                      />
                    )}
                  </View>
                </View>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.swatchLabel,
                    {
                      color: isCustomActive ? colors.accent : colors.textSecondary,
                      fontWeight: isCustomActive ? '700' : '500',
                    },
                  ]}
                >
                  {t('theme.customColor', '✨ Özel')}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Özel Renk Seçici Akordeon Paneli */}
            {showColorPicker && (
              <View
                style={[
                  styles.pickerCard,
                  {
                    backgroundColor: colors.backgroundLight,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Seçili HEX Bilgi Rozeti */}
                <View style={styles.pickerHeaderRow}>
                  <View style={styles.colorPreviewGroup}>
                    <View
                      style={[
                        styles.colorBox,
                        {
                          backgroundColor: currentCustomHex,
                          borderColor: colors.border,
                        },
                      ]}
                    />
                    <View>
                      <Text style={[styles.colorCodeLabel, { color: colors.textSecondary }]}>
                        {t('theme.currentColor', 'Seçili Renk')}
                      </Text>
                      <Text style={[styles.colorCodeHex, { color: colors.textPrimary }]}>
                        {currentCustomHex.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.liveBadge,
                      { backgroundColor: colors.accent + '18' },
                    ]}
                  >
                    <Text style={[styles.liveBadgeText, { color: colors.accent }]}>
                      {t('theme.applyColor', 'Canlı Önizleme')}
                    </Text>
                  </View>
                </View>

                {/* Reanimated Color Picker Paneli */}
                <View style={styles.colorPickerWrapper}>
                  <ColorPicker
                    style={styles.pickerStyle}
                    value={currentCustomHex}
                    onComplete={onSelectColor}
                    onChange={onSelectColor}
                    boundedThumb
                  >
                    <Preview style={styles.pickerPreview} hideInitialColor />
                    <Panel3 style={styles.pickerPanel} centerChannel="saturation" />
                  </ColorPicker>
                </View>

                <Text style={[styles.pickerHint, { color: colors.textSecondary + 'B0' }]}>
                  {t('theme.customHint', 'İstediğin rengi seç, uygulama anında uyum sağlasın.')}
                </Text>
              </View>
            )}
          </ScrollView>
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
    maxHeight: SCREEN_HEIGHT * 0.82,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    // Premium soft drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 24,
  },
  sheetContainerTablet: {
    width: 520,
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
    paddingBottom: 16,
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
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  swatchesScrollList: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 14,
  },
  swatchItem: {
    alignItems: 'center',
    width: 68,
  },
  swatchOuterRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  swatchCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  customSwatchCircle: {
    borderStyle: 'dashed',
  },
  swatchEmoji: {
    fontSize: 20,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchLabel: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 68,
  },
  pickerCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  colorPreviewGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  colorCodeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  colorCodeHex: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  colorPickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerStyle: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerPreview: {
    height: 36,
    borderRadius: 10,
    marginBottom: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  pickerPanel: {
    width: 220,
    height: 220,
    borderRadius: 110,
    marginBottom: 8,
  },
  pickerHint: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 8,
  },
});
