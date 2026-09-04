import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import ColorPicker, { Panel3, Preview } from 'reanimated-color-picker';

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

/**
 * DrawingToolbar - Kalemlik & Klavye Araç Çubuğu
 * Çizim ve serbest Klavye metin modları arasında geçiş sağlar.
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
  const { colors } = useTheme();
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isCustomColorModalVisible, setIsCustomColorModalVisible] = useState(false);
  const [customColors, setCustomColors] = useState([]);
  const [tempColor, setTempColor] = useState('#FF0000'); // Modal içindeki geçici renk

  const onSelectColor = (colorHex) => {
    setTempColor(colorHex);
  };

  const applyCustomColor = () => {
    // Aynı rengi tekrar eklememek için kontrol
    if (!customColors.includes(tempColor)) {
      setCustomColors((prev) => [...prev, tempColor].slice(-5)); // Son 5 özel rengi sakla
    }
    
    if (isDrawingMode) onChangeColor(tempColor);
    if (isTextMode) onChangeTextColor(tempColor);
    
    setIsCustomColorModalVisible(false);
    setIsColorPickerOpen(false);
  };

  return (
    <View style={[styles.dockContainer, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {/* 1. Çizim Modu Butonu */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleDrawingMode}
        style={[
          styles.modeBtn,
          isDrawingMode
            ? { backgroundColor: colors.accent }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <MaterialCommunityIcons
          name="draw-pen"
          size={16}
          color={isDrawingMode ? '#FFFFFF' : colors.textSecondary}
        />
        <Text
          style={[
            styles.modeBtnText,
            { color: isDrawingMode ? '#FFFFFF' : colors.textSecondary },
          ]}
        >
          Çizim
        </Text>
      </TouchableOpacity>

      {/* 2. Klavye / Metin Modu Butonu */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggleTextMode}
        style={[
          styles.modeBtn,
          isTextMode
            ? { backgroundColor: colors.accent }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <MaterialCommunityIcons
          name="keyboard-outline"
          size={16}
          color={isTextMode ? '#FFFFFF' : colors.textSecondary}
        />
        <Text
          style={[
            styles.modeBtnText,
            { color: isTextMode ? '#FFFFFF' : colors.textSecondary },
          ]}
        >
          Klavye
        </Text>
      </TouchableOpacity>

      {/* ─── Çizim Araçları (Yalnızca Çizim Modu Aktifken) ─── */}
      {isDrawingMode && (
        <>
          <View style={styles.dockDivider} />

          {/* Kalem Seçimi */}
          <TouchableOpacity
            onPress={() => onChangeTool('pen')}
            style={[
              styles.toolBtn,
              currentTool === 'pen' && [styles.activeToolBtn, { backgroundColor: colors.accent + '20' }],
            ]}
          >
            <MaterialCommunityIcons
              name="fountain-pen-tip"
              size={18}
              color={currentTool === 'pen' ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Fosforlu Kalem Seçimi */}
          <TouchableOpacity
            onPress={() => onChangeTool('highlighter')}
            style={[
              styles.toolBtn,
              currentTool === 'highlighter' && [styles.activeToolBtn, { backgroundColor: colors.accent + '20' }],
            ]}
          >
            <MaterialCommunityIcons
              name="marker"
              size={18}
              color={currentTool === 'highlighter' ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Silgi Seçimi */}
          <TouchableOpacity
            onPress={() => onChangeTool('eraser')}
            style={[
              styles.toolBtn,
              currentTool === 'eraser' && [styles.activeToolBtn, { backgroundColor: colors.accent + '20' }],
            ]}
          >
            <MaterialCommunityIcons
              name="eraser"
              size={18}
              color={currentTool === 'eraser' ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Kement / Seçim Aracı (Lasso) */}
          <TouchableOpacity
            onPress={() => onChangeTool('lasso')}
            style={[
              styles.toolBtn,
              currentTool === 'lasso' && [styles.activeToolBtn, { backgroundColor: colors.accent + '20' }],
            ]}
          >
            <MaterialCommunityIcons
              name="lasso"
              size={18}
              color={currentTool === 'lasso' ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={styles.dockDivider} />

          {/* Renk Seçici Buton */}
          <TouchableOpacity
            onPress={() => setIsColorPickerOpen(!isColorPickerOpen)}
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
            onPress={onUndo}
            disabled={!canUndo}
            style={[styles.toolBtn, !canUndo && { opacity: 0.35 }]}
          >
            <MaterialCommunityIcons
              name="undo"
              size={18}
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
                onPress={() => onChangeTextFontSize(f.size)}
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
            onPress={() => setIsColorPickerOpen(!isColorPickerOpen)}
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

      {/* Açılır Renk Paleti (Dropdown) */}
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
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Sınırsız Renk Seçici (Color Picker) Modalı */}
      <Modal
        visible={isCustomColorModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCustomColorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Özel Renk Seç</Text>
            
            <View style={styles.colorPickerContainer}>
              <ColorPicker style={{ width: '100%', alignItems: 'center', gap: 20 }} value={tempColor} onComplete={(c) => onSelectColor(c.hex)}>
                <Panel3 style={styles.panel3Style} thumbSize={28} />
                <Preview style={styles.previewStyle} hideInitialColor />
              </ColorPicker>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setIsCustomColorModalVisible(false)}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                onPress={applyCustomColor}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    position: 'relative',
    zIndex: 100,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
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
    marginHorizontal: 4,
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
    gap: 3,
  },
  fontSizeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fontSizeText: {
    fontSize: 11,
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
  palettePopup: {
    position: 'absolute',
    top: 40,
    right: 0,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
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
