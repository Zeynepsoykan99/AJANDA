import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import { useTheme } from '../../context/ThemeContext';
import ColorPicker, { Panel3, Preview } from 'reanimated-color-picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const INK_COLORS = [
  { id: 'rose', color: '#C2185B', name: 'Gül Kurusu' },
  { id: 'lavender', color: '#7B1FA2', name: 'Lavanta Moru' },
  { id: 'mocha', color: '#4E342E', name: 'Moka Kahve' },
  { id: 'navy', color: '#1A237E', name: 'Gece Mavisi' },
  { id: 'sage', color: '#2E7D32', name: 'Adaçayı Yeşili' },
  { id: 'yellowHighlighter', color: '#FDD835', name: 'Fosforlu Sarı' },
  { id: 'peachHighlighter', color: '#FF7043', name: 'Fosforlu Şeftali' },
];

const STROKE_WIDTHS = [
  { id: 'thin', width: 2, label: 'İnce' },
  { id: 'medium', width: 4, label: 'Orta' },
  { id: 'thick', width: 7, label: 'Kalın' },
];

const FONT_SIZES = [
  { id: 'sm', size: 13, label: 'Küçük' },
  { id: 'md', size: 16, label: 'Orta' },
  { id: 'lg', size: 21, label: 'Büyük' },
];

const triggerHaptic = () => {
  try {
    Haptics.selectionAsync();
  } catch (e) {}
};

/**
 * DrawingToolbar - Yüzen, Sürüklenebilir ve Katlanabilir Araç Çubuğu
 * 
 * - Kapalıyken (FAB): 50x50 boyutunda dairesel, aktif aracın ikonunu ve rengini gösteren yüzen buton.
 * - Açıkken: Tüm çizim ve klavye araçlarını barındıran lüks kapsül çubuk.
 * - Sürükle ve Bırak: react-native-gesture-handler (Gesture.Pan) ile ekranın her yerine taşınabilir.
 * - Ekran Sınırları: Bounding box kısıtlaması ile ekran dışına çıkması engellenir.
 * - Çakışma Önleme: Yalnızca kendi sınırları içinde touch event alır, tuvali bloke etmez.
 */
export default function DrawingToolbar({
  isDrawingMode,
  onToggleDrawingMode,
  isTextMode,
  onToggleTextMode,
  currentTool,
  onChangeTool,
  currentColor,
  onChangeColor,
  currentWidth,
  onChangeWidth,
  textColor,
  onChangeTextColor,
  textFontSize,
  onChangeTextFontSize,
  onUndo,
  canUndo = false,
  style,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Katlanabilirlik State'i (Varsayılan olarak çizim/metin aktifse açık, değilse kapalı başlar)
  const [isExpanded, setIsExpanded] = useState(isDrawingMode || isTextMode);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isCustomColorModalVisible, setIsCustomColorModalVisible] = useState(false);
  const [customColors, setCustomColors] = useState([]);
  const [tempColor, setTempColor] = useState('#FF0000');

  // Sürükleme Koordinatları (Başlangıçta ekranın sağ üst-orta kenarında)
  const INITIAL_X = SCREEN_WIDTH - 66;
  const INITIAL_Y = 110;

  const translateX = useSharedValue(INITIAL_X);
  const translateY = useSharedValue(INITIAL_Y);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Sınır Sabitleri (Safe Bounding Box)
  const MIN_X = 12;
  const MIN_Y = 50;
  const MAX_Y = SCREEN_HEIGHT - 120;

  // Açılıp kapanma fonksiyonu
  const toggleExpanded = useCallback(() => {
    triggerHaptic();
    setIsExpanded((prev) => {
      const next = !prev;
      // Eğer açılıyorsa ve sağ kenara çok yakınsa ekran içine doğru yaylandır
      if (next && translateX.value > SCREEN_WIDTH - 330) {
        translateX.value = withSpring(Math.max(MIN_X, SCREEN_WIDTH - 340), {
          damping: 18,
          stiffness: 150,
        });
      }
      return next;
    });
    setIsColorPickerOpen(false);
  }, [translateX]);

  // Pan Gesture (react-native-gesture-handler)
  const panGesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .activeOffsetY([-6, 6])
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      const rawX = startX.value + event.translationX;
      const rawY = startY.value + event.translationY;

      // Genişliğe göre sınır hesaplama (Kapalıyken ~52px, açıkken ~320px)
      const currentWidgetWidth = isExpanded ? 320 : 52;
      const maxX = SCREEN_WIDTH - currentWidgetWidth - MIN_X;

      translateX.value = Math.max(MIN_X, Math.min(maxX, rawX));
      translateY.value = Math.max(MIN_Y, Math.min(MAX_Y, rawY));
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
    });

  // Reanimated Animasyonlu Stil
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: withSpring(isDragging.value ? 1.05 : 1, { damping: 15, stiffness: 200 }) },
    ],
  }));

  const onSelectColor = (colorHex) => {
    setTempColor(colorHex);
  };

  const applyCustomColor = () => {
    if (!customColors.includes(tempColor)) {
      setCustomColors((prev) => [...prev, tempColor].slice(-5));
    }
    if (isDrawingMode) onChangeColor(tempColor);
    if (isTextMode) onChangeTextColor(tempColor);
    setIsCustomColorModalVisible(false);
    setIsColorPickerOpen(false);
  };

  // FAB Üzerindeki Aktif İkon ve Renk Belirleme
  const getFabIcon = () => {
    if (isDrawingMode) {
      switch (currentTool) {
        case 'highlighter':
          return 'marker';
        case 'eraser':
          return 'eraser';
        case 'lasso':
          return 'lasso';
        default:
          return 'fountain-pen-tip';
      }
    }
    if (isTextMode) return 'keyboard-outline';
    return 'draw-pen';
  };

  const getFabBadgeColor = () => {
    if (isDrawingMode) return currentColor || colors.accent;
    if (isTextMode) return textColor || colors.textPrimary;
    return colors.accent;
  };

  return (
    <>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.floatingWrapper,
            animatedStyle,
            style,
          ]}
          pointerEvents="box-none"
        >
          {/* ─── DURUM 1: KAPALI HAL (FLOATING ACTION BUTTON - FAB) ─── */}
          {!isExpanded ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleExpanded}
              style={[
                styles.fabCircle,
                {
                  backgroundColor: colors.card,
                  borderColor: (isDrawingMode || isTextMode) ? colors.accent : colors.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={getFabIcon()}
                size={22}
                color={(isDrawingMode || isTextMode) ? colors.accent : colors.textSecondary}
              />
              {/* Aktif Renk Rozeti */}
              <View
                style={[
                  styles.fabColorDot,
                  {
                    backgroundColor: getFabBadgeColor(),
                    borderColor: colors.card,
                  },
                ]}
              />
            </TouchableOpacity>
          ) : (
            /* ─── DURUM 2: AÇIK HAL (GENİŞLETİLMİŞ ARAÇ ÇUBUĞU) ─── */
            <View
              style={[
                styles.dockContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              pointerEvents="auto"
            >
              {/* Sürükleme Tutamacı (Drag Handle Grip) */}
              <View style={styles.dragGripArea}>
                <MaterialCommunityIcons
                  name="drag-vertical"
                  size={20}
                  color={colors.textSecondary + '70'}
                />
              </View>

              {/* 1. Çizim Modu Butonu */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic();
                  onToggleDrawingMode();
                }}
                style={[
                  styles.modeBtn,
                  isDrawingMode
                    ? { backgroundColor: colors.accent }
                    : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <MaterialCommunityIcons
                  name="draw-pen"
                  size={15}
                  color={isDrawingMode ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    { color: isDrawingMode ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {t('drawing.modeDrawing', 'Çizim')}
                </Text>
              </TouchableOpacity>

              {/* 2. Klavye / Metin Modu Butonu */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic();
                  onToggleTextMode();
                }}
                style={[
                  styles.modeBtn,
                  isTextMode
                    ? { backgroundColor: colors.accent }
                    : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                <MaterialCommunityIcons
                  name="keyboard-outline"
                  size={15}
                  color={isTextMode ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    { color: isTextMode ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {t('drawing.modeText', 'Klavye')}
                </Text>
              </TouchableOpacity>

              {/* ─── Çizim Araçları (Yalnızca Çizim Modu Aktifken) ─── */}
              {isDrawingMode && (
                <>
                  <View style={styles.dockDivider} />

                  {/* Kalem Seçimi */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      onChangeTool('pen');
                    }}
                    style={[
                      styles.toolBtn,
                      currentTool === 'pen' && [styles.activeToolBtn, { backgroundColor: colors.accent + '20' }],
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="fountain-pen-tip"
                      size={17}
                      color={currentTool === 'pen' ? colors.accent : colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Fosforlu Kalem Seçimi */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      onChangeTool('highlighter');
                    }}
                    style={[
                      styles.toolBtn,
                      currentTool === 'highlighter' && [styles.activeToolBtn, { backgroundColor: colors.accent + '20' }],
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="marker"
                      size={17}
                      color={currentTool === 'highlighter' ? colors.accent : colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Silgi Seçimi */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      onChangeTool('eraser');
                    }}
                    style={[
                      styles.toolBtn,
                      currentTool === 'eraser' && [styles.activeToolBtn, { backgroundColor: colors.accent + '20' }],
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="eraser"
                      size={17}
                      color={currentTool === 'eraser' ? colors.accent : colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Kement / Seçim Aracı (Lasso) */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      onChangeTool('lasso');
                    }}
                    style={[
                      styles.toolBtn,
                      currentTool === 'lasso' && [styles.activeToolBtn, { backgroundColor: colors.accent + '20' }],
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="lasso"
                      size={17}
                      color={currentTool === 'lasso' ? colors.accent : colors.textSecondary}
                    />
                  </TouchableOpacity>

                  <View style={styles.dockDivider} />

                  {/* Renk Seçici Buton */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      setIsColorPickerOpen(!isColorPickerOpen);
                    }}
                    style={styles.colorTriggerBtn}
                  >
                    <View
                      style={[
                        styles.activeColorCircle,
                        { backgroundColor: currentColor, borderColor: colors.border },
                      ]}
                    />
                  </TouchableOpacity>

                  {/* Geri Al (Undo) */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      onUndo();
                    }}
                    disabled={!canUndo}
                    style={[styles.toolBtn, !canUndo && { opacity: 0.35 }]}
                  >
                    <MaterialCommunityIcons
                      name="undo"
                      size={17}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </>
              )}

              {/* ─── Klavye / Metin Araçları (Yalnızca Metin Modu Aktifken) ─── */}
              {isTextMode && (
                <>
                  <View style={styles.dockDivider} />

                  {/* Yazı Boyutu Seçimi */}
                  <View style={styles.fontSizeGroup}>
                    {FONT_SIZES.map((f) => (
                      <TouchableOpacity
                        key={f.id}
                        onPress={() => {
                          triggerHaptic();
                          onChangeTextFontSize(f.size);
                        }}
                        style={[
                          styles.fontSizeBtn,
                          textFontSize === f.size && { backgroundColor: colors.accent + '25', borderColor: colors.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.fontSizeText,
                            { color: textFontSize === f.size ? colors.accent : colors.textSecondary },
                          ]}
                        >
                          {f.id.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.dockDivider} />

                  {/* Yazı Rengi Seçici */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerHaptic();
                      setIsColorPickerOpen(!isColorPickerOpen);
                    }}
                    style={styles.colorTriggerBtn}
                  >
                    <View
                      style={[
                        styles.activeColorCircle,
                        { backgroundColor: textColor || '#4E342E', borderColor: colors.border },
                      ]}
                    />
                  </TouchableOpacity>
                </>
              )}

              {/* ─── Katlama / Küçültme Butonu (Collapse Button) ─── */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={toggleExpanded}
                style={[styles.collapseBtn, { backgroundColor: colors.border + '30' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Açılır Renk Paleti (Dropdown Popup) */}
              {isColorPickerOpen && (
                <View
                  style={[
                    styles.palettePopup,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.colorsRow}>
                    {INK_COLORS.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          triggerHaptic();
                          if (isDrawingMode) onChangeColor(item.color);
                          if (isTextMode) onChangeTextColor(item.color);
                          setIsColorPickerOpen(false);
                        }}
                        style={[
                          styles.swatchBtn,
                          { backgroundColor: item.color },
                          (isDrawingMode ? currentColor === item.color : textColor === item.color) && styles.selectedSwatch,
                        ]}
                      />
                    ))}

                    {/* Eklenen Özel Renkler */}
                    {customColors.map((customColor, index) => (
                      <TouchableOpacity
                        key={`custom_${index}`}
                        onPress={() => {
                          triggerHaptic();
                          if (isDrawingMode) onChangeColor(customColor);
                          if (isTextMode) onChangeTextColor(customColor);
                          setIsColorPickerOpen(false);
                        }}
                        style={[
                          styles.swatchBtn,
                          { backgroundColor: customColor },
                          (isDrawingMode ? currentColor === customColor : textColor === customColor) && styles.selectedSwatch,
                        ]}
                      />
                    ))}

                    {/* Yeni Özel Renk Ekle Butonu */}
                    <TouchableOpacity
                      onPress={() => {
                        setTempColor(isDrawingMode ? currentColor : textColor);
                        setIsCustomColorModalVisible(true);
                      }}
                      style={styles.addCustomColorBtn}
                    >
                      <MaterialCommunityIcons name="plus" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Çizim modundaysa kalınlık seçimi */}
                  {isDrawingMode && (
                    <View style={styles.widthsRow}>
                      {STROKE_WIDTHS.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => {
                            triggerHaptic();
                            onChangeWidth(item.width);
                            setIsColorPickerOpen(false);
                          }}
                          style={[
                            styles.widthBtn,
                            currentWidth === item.width && {
                              backgroundColor: colors.accent + '20',
                              borderColor: colors.accent,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.widthIndicator,
                              { height: item.width, backgroundColor: currentColor },
                            ]}
                          />
                          <Text style={[styles.widthText, { color: colors.textSecondary }]}>
                            {item.id === 'thin' ? t('drawing.strokeThin', item.label) : item.id === 'medium' ? t('drawing.strokeMedium', item.label) : t('drawing.strokeThick', item.label)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </GestureDetector>

      {/* Sınırsız Renk Seçici (Color Picker) Modalı */}
      <Modal
        visible={isCustomColorModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCustomColorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {t('drawing.customColorTitle', 'Özel Renk Seç')}
            </Text>

            <View style={styles.colorPickerContainer}>
              <ColorPicker
                style={{ width: '100%', alignItems: 'center', gap: 20 }}
                value={tempColor}
                onComplete={(c) => onSelectColor(c.hex)}
              >
                <Panel3 style={styles.panel3Style} thumbSize={28} />
                <Preview style={styles.previewStyle} hideInitialColor />
              </ColorPicker>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setIsCustomColorModalVisible(false)}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                  {t('common.cancel', 'İptal')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                onPress={applyCustomColor}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  {t('drawing.apply', 'Uygula')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
  },
  fabCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 8,
  },
  fabColorDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
  },
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: 25,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 100,
  },
  dragGripArea: {
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 3,
    marginHorizontal: 2,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dockDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#00000015',
    marginHorizontal: 3,
  },
  toolBtn: {
    padding: 5,
    borderRadius: 12,
    marginHorizontal: 1,
  },
  activeToolBtn: {
    borderWidth: 1,
    borderColor: '#E91E6340',
  },
  fontSizeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  fontSizeBtn: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fontSizeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  colorTriggerBtn: {
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeColorCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  collapseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 3,
  },
  palettePopup: {
    position: 'absolute',
    top: 48,
    right: 0,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 120,
    width: 230,
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  swatchBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#00000015',
  },
  selectedSwatch: {
    borderColor: '#C2185B',
    transform: [{ scale: 1.15 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  addCustomColorBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#00000030',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  widthsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#00000010',
    paddingTop: 6,
    marginTop: 4,
  },
  widthBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  widthIndicator: {
    width: 20,
    borderRadius: 2,
    marginBottom: 3,
  },
  widthText: {
    fontSize: 9,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 280,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  colorPickerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewStyle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  panel3Style: {
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 25,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
});
