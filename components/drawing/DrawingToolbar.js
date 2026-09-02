import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

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

/**
 * DrawingToolbar - Kırtasiye Kalemliği & Çizim Araç Çubuğu
 * Sayfa üstünde veya sağında zarifçe süzülen; kalem, fosforlu, silgi ve renk seçici dock.
 */
export default function DrawingToolbar({
  isDrawingMode,
  onToggleDrawingMode,
  currentTool,
  onChangeTool,
  currentColor,
  onChangeColor,
  currentWidth,
  onChangeWidth,
  onUndo,
  onClear,
  canUndo = false,
  style,
}) {
  const { colors } = useTheme();
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  return (
    <View style={[styles.dockContainer, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {/* 1. Mod Değiştirici: Kalem / Klavye */}
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
          name={isDrawingMode ? 'draw-pen' : 'keyboard-outline'}
          size={18}
          color={isDrawingMode ? '#FFFFFF' : colors.textSecondary}
        />
        <Text
          style={[
            styles.modeBtnText,
            { color: isDrawingMode ? '#FFFFFF' : colors.textSecondary },
          ]}
        >
          {isDrawingMode ? 'Çizim' : 'Yazı'}
        </Text>
      </TouchableOpacity>

      {/* Yalnızca Çizim Modu Aktifken Araçlar Gösterilir */}
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

      {/* Açılır Renk ve Kalınlık Paleti */}
      {isDrawingMode && isColorPickerOpen && (
        <View
          style={[
            styles.palettePopup,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {/* Renkler */}
          <View style={styles.colorsRow}>
            {INK_COLORS.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  onChangeColor(item.color);
                  setIsColorPickerOpen(false);
                }}
                style={[
                  styles.swatchBtn,
                  { backgroundColor: item.color },
                  currentColor === item.color && styles.selectedSwatch,
                ]}
              />
            ))}
          </View>

          {/* Kalınlık Seçimi */}
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
    zIndex: 100,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dockDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#00000015',
    marginHorizontal: 6,
  },
  toolBtn: {
    padding: 6,
    borderRadius: 14,
    marginHorizontal: 1,
  },
  activeToolBtn: {
    borderWidth: 1,
    borderColor: '#E91E6340',
  },
  colorTriggerBtn: {
    padding: 4,
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
    top: 44,
    right: 0,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 120,
    width: 240,
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 10,
  },
  swatchBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  widthsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#00000010',
    paddingTop: 8,
  },
  widthBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  widthIndicator: {
    width: 24,
    borderRadius: 2,
    marginBottom: 4,
  },
  widthText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
