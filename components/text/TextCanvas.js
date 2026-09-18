import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useZoomableCanvas } from '../drawing/ZoomableCanvas';

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

const DraggableTextBlock = React.memo(function DraggableTextBlock({
  block,
  activeColor,
  activeFontSize,
  isEditing,
  onEdit,
  onChange,
  onBlur,
  onDelete,
  onMoveEnd,
  onResizeEnd,
  canvasWidth = 0,
  canvasHeight = 0,
  onSnapChange,
  isEraserActive = false,
  isDrawingMode = false,
}) {
  const { t } = useTranslation();
  const { scale: zoomScale } = useZoomableCanvas();

  const translateX = useSharedValue(block.x || 0);
  const translateY = useSharedValue(block.y || 0);
  const savedTranslateX = useSharedValue(block.x || 0);
  const savedTranslateY = useSharedValue(block.y || 0);
  const isDragging = useSharedValue(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  const isSnappedV = useSharedValue(false);
  const isSnappedH = useSharedValue(false);

  const [boxWidth, setBoxWidth] = useState(block.width || 120);

  // Parent'tan gelen x veya y değiştiğinde SharedValue'ları senkronize et
  useEffect(() => {
    translateX.value = block.x || 0;
    translateY.value = block.y || 0;
    savedTranslateX.value = block.x || 0;
    savedTranslateY.value = block.y || 0;
  }, [block.x, block.y]);

  useEffect(() => {
    if (block.width) setBoxWidth(block.width);
  }, [block.width]);

  // Sürükleme (Pan) Gesture'ı: Zoom ölçeğine göre dengeli ve akıllı snap destekli
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-4, 4])
    .activeOffsetY([-4, 4])
    .enabled(!isEditing && !isEraserActive && !isDrawingMode)
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      isDragging.value = true;
      runOnJS(setIsDraggingState)(true);
      isSnappedV.value = false;
      isSnappedH.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      const s = (zoomScale && zoomScale.value) || 1.0;
      let rawX = savedTranslateX.value + event.translationX / s;
      let rawY = savedTranslateY.value + event.translationY / s;

      // Akıllı Hizalama (Snapping)
      if (canvasWidth > 0 && canvasHeight > 0) {
        const itemW = boxWidth;
        const itemH = 40;
        const centerX = rawX + itemW / 2;
        const centerY = rawY + itemH / 2;
        const midX = canvasWidth / 2;
        const midY = canvasHeight / 2;
        const threshold = 14;

        // Dikey eksen (yatay merkez) snap
        if (Math.abs(centerX - midX) < threshold) {
          rawX = midX - itemW / 2;
          if (!isSnappedV.value) {
            isSnappedV.value = true;
            runOnJS(triggerHaptic)();
            if (onSnapChange) runOnJS(onSnapChange)({ v: true });
          }
        } else {
          if (isSnappedV.value) {
            isSnappedV.value = false;
            if (onSnapChange) runOnJS(onSnapChange)({ v: false });
          }
        }

        // Yatay eksen (dikey merkez) snap
        if (Math.abs(centerY - midY) < threshold) {
          rawY = midY - itemH / 2;
          if (!isSnappedH.value) {
            isSnappedH.value = true;
            runOnJS(triggerHaptic)();
            if (onSnapChange) runOnJS(onSnapChange)({ h: true });
          }
        } else {
          if (isSnappedH.value) {
            isSnappedH.value = false;
            if (onSnapChange) runOnJS(onSnapChange)({ h: false });
          }
        }
      }

      translateX.value = rawX;
      translateY.value = rawY;
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
      runOnJS(setIsDraggingState)(false);
      if (isSnappedV.value || isSnappedH.value) {
        isSnappedV.value = false;
        isSnappedH.value = false;
      }
      if (onSnapChange) {
        runOnJS(onSnapChange)({ v: false, h: false });
      }
      const finalX = Math.round(translateX.value);
      const finalY = Math.round(translateY.value);
      savedTranslateX.value = finalX;
      savedTranslateY.value = finalY;
      if (onMoveEnd) {
        runOnJS(onMoveEnd)(block.id, finalX, finalY);
      }
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      runOnJS(setIsDraggingState)(false);
      if (isSnappedV.value || isSnappedH.value) {
        isSnappedV.value = false;
        isSnappedH.value = false;
      }
      if (onSnapChange) {
        runOnJS(onSnapChange)({ v: false, h: false });
      }
    });

  // Tıklama (Tap) Gesture'ı: Düzenleme moduna girme
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .enabled(!isEditing && !isEraserActive && !isDrawingMode)
    .onEnd(() => {
      'worklet';
      if (onEdit) {
        runOnJS(onEdit)(block.id);
      }
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Yeniden Boyutlandırma (Resize) Gesture'ı
  const initialWidth = useSharedValue(boxWidth);
  const currentResizeWidth = useSharedValue(boxWidth);
  const resizePanGesture = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-2, 2])
    .onStart(() => {
      'worklet';
      initialWidth.value = boxWidth;
      currentResizeWidth.value = boxWidth;
    })
    .onUpdate((event) => {
      'worklet';
      const s = (zoomScale && zoomScale.value) || 1.0;
      const newWidth = Math.max(60, initialWidth.value + event.translationX / s);
      currentResizeWidth.value = newWidth;
      runOnJS(setBoxWidth)(newWidth);
    })
    .onEnd(() => {
      'worklet';
      if (onResizeEnd) {
        runOnJS(onResizeEnd)(block.id, Math.round(currentResizeWidth.value));
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      zIndex: isDragging.value ? 100 : isEditing ? 50 : 10,
      opacity: isDragging.value ? 0.94 : 1.0,
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.blockContainer,
          animatedStyle,
          { width: boxWidth },
          Platform.OS === 'web' && { cursor: isEditing ? 'text' : 'grab', userSelect: 'none' },
          isEditing && styles.blockEditing,
          isDraggingState && styles.blockDragging,
        ]}
      >
        {isEditing ? (
          <View style={styles.inputWrapper}>
            <TextInput
              value={block.text}
              onChangeText={(txt) => onChange(block.id, txt)}
              onBlur={() => onBlur(block.id)}
              autoFocus
              multiline
              placeholder={t('drawing.typeNotePlaceholder', 'Notunu yaz...')}
              placeholderTextColor={block.color + '55'}
              style={[
                styles.textInput,
                {
                  color: block.color || activeColor,
                  fontSize: block.fontSize || activeFontSize,
                  fontFamily: block.fontFamily || undefined,
                },
              ]}
            />

            {/* Sağ Taraftaki Boyutlandırma Tutamacı (Resize Handle) */}
            <GestureDetector gesture={resizePanGesture}>
              <View style={styles.resizeHandleContainer}>
                <MaterialCommunityIcons name="drag-vertical" size={20} color="#E91E63" />
              </View>
            </GestureDetector>

            {/* Sol Üst Köşede Sil Butonu */}
            <TouchableOpacity
              onPress={() => onDelete(block.id)}
              style={styles.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#E91E63" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.viewBlock}>
            <Text
              style={[
                styles.savedText,
                {
                  color: block.color || activeColor,
                  fontSize: block.fontSize || activeFontSize,
                  fontFamily: block.fontFamily || undefined,
                },
              ]}
            >
              {block.text}
            </Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
});

export default function TextCanvas({
  isTextMode = false,
  isDrawingMode = false,
  textBlocks = [],
  onTextBlocksChange,
  activeColor = '#4E342E',
  activeFontSize = 15,
  activeFontFamily,
  isEraserActive = false,
  pointerEvents,
}) {
  const { pageToCanvas, screenToCanvas } = useZoomableCanvas();
  const [editingId, setEditingId] = useState(null);
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });
  const [guideLines, setGuideLines] = useState({ v: false, h: false });

  const handleSnapChange = useCallback((snap) => {
    setGuideLines((prev) => ({ ...prev, ...snap }));
  }, []);

  const handleCanvasPress = (evt) => {
    if (!isTextMode) return;
    if (editingId) {
      setEditingId(null);
      return;
    }

    const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
    let coordX = locationX;
    let coordY = locationY;
    if (pageX !== undefined && pageY !== undefined && pageToCanvas) {
      const pt = pageToCanvas(pageX, pageY);
      coordX = pt.x;
      coordY = pt.y;
    } else if (screenToCanvas) {
      const pt = screenToCanvas(locationX, locationY);
      coordX = pt.x;
      coordY = pt.y;
    }

    const newId = `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBlock = {
      id: newId,
      x: Math.max(10, Math.round(coordX)),
      y: Math.max(10, Math.round(coordY - 15)),
      text: '',
      color: activeColor,
      fontSize: activeFontSize,
      fontFamily: activeFontFamily || undefined,
      width: 120,
    };

    onTextBlocksChange([...textBlocks, newBlock]);
    setEditingId(newId);
  };

  const handleTextChange = (id, newText) => {
    onTextBlocksChange(
      textBlocks.map((b) => (b.id === id ? { ...b, text: newText } : b))
    );
  };

  const handleMoveEnd = (id, newX, newY) => {
    onTextBlocksChange(
      textBlocks.map((b) => (b.id === id ? { ...b, x: newX, y: newY } : b))
    );
  };

  const handleResizeEnd = (id, newWidth) => {
    onTextBlocksChange(
      textBlocks.map((b) => (b.id === id ? { ...b, width: newWidth } : b))
    );
  };

  const handleBlur = (id) => {
    setEditingId(null);
    const block = textBlocks.find((b) => b.id === id);
    if (block && !block.text.trim()) {
      handleDeleteBlock(id);
    }
  };

  const handleDeleteBlock = (id) => {
    onTextBlocksChange(textBlocks.filter((b) => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const resolvedPointerEvents =
    pointerEvents !== undefined
      ? pointerEvents
      : isDrawingMode
      ? 'none'
      : 'box-none';

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      pointerEvents={resolvedPointerEvents}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setCanvasLayout({ width, height });
      }}
    >
      {/* Akıllı Hizalama Kılavuz Çizgileri */}
      {guideLines.v && canvasLayout.width > 0 && (
        <View
          style={[styles.guideLineVertical, { left: canvasLayout.width / 2 }]}
          pointerEvents="none"
        />
      )}
      {guideLines.h && canvasLayout.height > 0 && (
        <View
          style={[styles.guideLineHorizontal, { top: canvasLayout.height / 2 }]}
          pointerEvents="none"
        />
      )}

      {isTextMode && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleCanvasPress}
        />
      )}

      {textBlocks.map((block) => (
        <DraggableTextBlock
          key={block.id}
          block={block}
          activeColor={activeColor}
          activeFontSize={activeFontSize}
          isEditing={editingId === block.id}
          onEdit={setEditingId}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onDelete={handleDeleteBlock}
          onMoveEnd={handleMoveEnd}
          onResizeEnd={handleResizeEnd}
          canvasWidth={canvasLayout.width}
          canvasHeight={canvasLayout.height}
          onSnapChange={handleSnapChange}
          isEraserActive={isEraserActive}
          isDrawingMode={isDrawingMode}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blockContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    minWidth: 60,
    zIndex: 10,
  },
  blockEditing: {
    zIndex: 50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E91E6388',
    backgroundColor: '#FFFFFFEE',
    borderRadius: 8,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  blockDragging: {
    zIndex: 100,
    opacity: 0.94,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E91E63AA',
    backgroundColor: '#FFFFFF99',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 40,
    position: 'relative',
  },
  textInput: {
    flex: 1,
    padding: 8,
    margin: 0,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'normal',
    textAlignVertical: 'top',
  },
  resizeHandleContainer: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E91E6315',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#E91E6330',
  },
  deleteBtn: {
    position: 'absolute',
    top: -10,
    left: -10,
    backgroundColor: '#FFF',
    borderRadius: 10,
    overflow: 'hidden',
  },
  viewBlock: {
    padding: 8,
    backgroundColor: 'transparent',
  },
  savedText: {
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'normal',
    ...(Platform.OS === 'web' ? { userSelect: 'none' } : {}),
  },
  guideLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#E91E63',
    zIndex: 20,
    opacity: 0.6,
  },
  guideLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#E91E63',
    zIndex: 20,
    opacity: 0.6,
  },
});
