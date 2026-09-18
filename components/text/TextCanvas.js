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
import { useSmartSnapping } from '../canvas/SmartSnappingContext';

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
  isSelected,
  onSelect,
  onEdit,
  onChange,
  onBlur,
  onDelete,
  onMoveEnd,
  onGroupMoveEnd,
  onResizeEnd,
  canvasWidth = 0,
  canvasHeight = 0,
  onSnapChange,
  isEraserActive = false,
  isDrawingMode = false,
  groupDragDeltaX,
  groupDragDeltaY,
  activeLeaderId,
  selectedBlockIds = [],
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

  const isSelectedShared = useSharedValue(isSelected);
  useEffect(() => {
    isSelectedShared.value = isSelected;
  }, [isSelected]);

  const smartSnapping = useSmartSnapping();
  const snapTargetsX = useSharedValue([]);
  const snapTargetsY = useSharedValue([]);

  const prepareSnapTargets = useCallback(() => {
    if (smartSnapping?.getSnapTargets) {
      const { targetsX, targetsY } = smartSnapping.getSnapTargets(block.id);
      snapTargetsX.value = targetsX;
      snapTargetsY.value = targetsY;
    }
  }, [smartSnapping, block.id]);

  const [boxWidth, setBoxWidth] = useState(block.width || 120);

  const fontSize = block.fontSize || activeFontSize || 16;
  // Tipografik Baseline: Fontun taban çizgisinin kutu tepesine uzaklığı
  const baselineOffset = Math.round(fontSize * 0.82);
  const itemH = Math.round(fontSize * 1.25);

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

  // Sürükleme (Pan) Gesture'ı: Zoom ölçeğine göre dengeli, grup taşıma ve baseline snap destekli
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
      if (activeLeaderId) activeLeaderId.value = block.id;
      if (groupDragDeltaX) groupDragDeltaX.value = 0;
      if (groupDragDeltaY) groupDragDeltaY.value = 0;
      runOnJS(setIsDraggingState)(true);
      isSnappedV.value = false;
      isSnappedH.value = false;
      runOnJS(prepareSnapTargets)();

      // Eğer taşınan öğe seçili grupta değilse tekli seçime geçir
      if (!isSelectedShared.value && onSelect) {
        runOnJS(onSelect)(block.id, false);
      }
    })
    .onUpdate((event) => {
      'worklet';
      const s = (zoomScale && zoomScale.value) || 1.0;
      let rawX = savedTranslateX.value + event.translationX / s;
      let rawY = savedTranslateY.value + event.translationY / s;

      const itemW = boxWidth;

      // Akıllı Manyetik Taban Çizgisi ve Merkez Hizalaması (Baseline & Center Snapping)
      if (smartSnapping?.calculateSnapping && (snapTargetsX.value.length > 0 || snapTargetsY.value.length > 0)) {
        const res = smartSnapping.calculateSnapping(
          rawX,
          rawY,
          itemW,
          itemH,
          snapTargetsX.value,
          snapTargetsY.value,
          6,
          baselineOffset // <--- Yazının alt çizgisi defter çizgisine yapışır!
        );

        rawX = res.snappedX;
        rawY = res.snappedY;

        if (res.hasSnapX) {
          smartSnapping.guideLineX.value = res.guideX;
          smartSnapping.guideLineXVisible.value = 1;
          if (!isSnappedV.value) {
            isSnappedV.value = true;
            runOnJS(triggerHaptic)();
            if (onSnapChange) runOnJS(onSnapChange)({ v: true });
          }
        } else {
          smartSnapping.guideLineXVisible.value = 0;
          if (isSnappedV.value) {
            isSnappedV.value = false;
            if (onSnapChange) runOnJS(onSnapChange)({ v: false });
          }
        }

        if (res.hasSnapY) {
          smartSnapping.guideLineY.value = res.guideY;
          smartSnapping.guideLineYVisible.value = 1;
          if (!isSnappedH.value) {
            isSnappedH.value = true;
            runOnJS(triggerHaptic)();
            if (onSnapChange) runOnJS(onSnapChange)({ h: true });
          }
        } else {
          smartSnapping.guideLineYVisible.value = 0;
          if (isSnappedH.value) {
            isSnappedH.value = false;
            if (onSnapChange) runOnJS(onSnapChange)({ h: false });
          }
        }
      }

      translateX.value = rawX;
      translateY.value = rawY;

      // Grup Taşıma: Lider bloğun anlık deplasmanı tüm seçili bloklara 120 FPS UI Thread'de yansıtılır
      if (groupDragDeltaX) groupDragDeltaX.value = rawX - savedTranslateX.value;
      if (groupDragDeltaY) groupDragDeltaY.value = rawY - savedTranslateY.value;
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
      runOnJS(setIsDraggingState)(false);
      isSnappedV.value = false;
      isSnappedH.value = false;
      if (smartSnapping) {
        smartSnapping.guideLineXVisible.value = 0;
        smartSnapping.guideLineYVisible.value = 0;
      }
      if (onSnapChange) {
        runOnJS(onSnapChange)({ v: false, h: false });
      }

      const deltaX = Math.round(groupDragDeltaX ? groupDragDeltaX.value : 0);
      const deltaY = Math.round(groupDragDeltaY ? groupDragDeltaY.value : 0);
      const finalX = Math.round(translateX.value);
      const finalY = Math.round(translateY.value);

      savedTranslateX.value = finalX;
      savedTranslateY.value = finalY;

      if (activeLeaderId) activeLeaderId.value = null;
      if (groupDragDeltaX) groupDragDeltaX.value = 0;
      if (groupDragDeltaY) groupDragDeltaY.value = 0;

      // Çoklu Seçim Grubu Varsa Hepsini Senkronize Kaydet
      if (
        onGroupMoveEnd &&
        selectedBlockIds &&
        selectedBlockIds.length > 1 &&
        isSelectedShared.value
      ) {
        runOnJS(onGroupMoveEnd)(selectedBlockIds, deltaX, deltaY);
      } else if (onMoveEnd) {
        runOnJS(onMoveEnd)(block.id, finalX, finalY);
      }
    })
    .onFinalize(() => {
      'worklet';
      isDragging.value = false;
      runOnJS(setIsDraggingState)(false);
      isSnappedV.value = false;
      isSnappedH.value = false;
      if (smartSnapping) {
        smartSnapping.guideLineXVisible.value = 0;
        smartSnapping.guideLineYVisible.value = 0;
      }
      if (onSnapChange) {
        runOnJS(onSnapChange)({ v: false, h: false });
      }
      if (activeLeaderId && activeLeaderId.value === block.id) {
        activeLeaderId.value = null;
        if (groupDragDeltaX) groupDragDeltaX.value = 0;
        if (groupDragDeltaY) groupDragDeltaY.value = 0;
      }
    });

  // Tıklama (Tap) Gesture'ı: Seçme veya Düzenleme Moduna Girme
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .enabled(!isEditing && !isEraserActive && !isDrawingMode)
    .onEnd(() => {
      'worklet';
      if (isSelectedShared.value) {
        // Zaten seçiliyse düzenleme moduna gir
        if (onEdit) runOnJS(onEdit)(block.id);
      } else {
        // Seçili değilse seç
        if (onSelect) runOnJS(onSelect)(block.id, false);
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
      const newWidth = Math.max(50, initialWidth.value + event.translationX / s);
      currentResizeWidth.value = newWidth;
      runOnJS(setBoxWidth)(newWidth);
    })
    .onEnd(() => {
      'worklet';
      if (onResizeEnd) {
        runOnJS(onResizeEnd)(block.id, Math.round(currentResizeWidth.value));
      }
    });

  // GPU-Hızlandırmalı Transform ve Çoklu Taşıma Senkronizasyonu
  const animatedStyle = useAnimatedStyle(() => {
    const isLeader = activeLeaderId ? activeLeaderId.value === block.id : false;
    let curX = translateX.value;
    let curY = translateY.value;

    // Eğer bu blok gruptaki takipçi ise, liderin delta hareketini UI thread'de eşzamanlı takip et
    if (!isLeader && isSelectedShared.value && activeLeaderId && activeLeaderId.value !== null) {
      curX = savedTranslateX.value + (groupDragDeltaX ? groupDragDeltaX.value : 0);
      curY = savedTranslateY.value + (groupDragDeltaY ? groupDragDeltaY.value : 0);
    }

    return {
      transform: [
        { translateX: curX },
        { translateY: curY },
      ],
      zIndex: isDragging.value ? 100 : isSelectedShared.value ? 80 : isEditing ? 50 : 10,
      opacity: isDragging.value ? 0.95 : 1.0,
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
          isSelected && !isEditing && styles.blockSelected,
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
                  fontSize: fontSize,
                  lineHeight: itemH,
                  fontFamily: block.fontFamily || undefined,
                },
              ]}
            />

            {/* Sağ Taraftaki Boyutlandırma Tutamacı (Resize Handle) */}
            <GestureDetector gesture={resizePanGesture}>
              <View style={styles.resizeHandleContainer}>
                <MaterialCommunityIcons name="drag-vertical" size={18} color="#007AFF" />
              </View>
            </GestureDetector>

            {/* Sol Üst Köşede Sil Butonu */}
            <TouchableOpacity
              onPress={() => onDelete(block.id)}
              style={styles.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color="#E53935" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.viewBlock}>
            <Text
              style={[
                styles.savedText,
                {
                  color: block.color || activeColor,
                  fontSize: fontSize,
                  lineHeight: itemH,
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
  selectedBlockIds: externalSelectedBlockIds,
  onSelectedBlockIdsChange,
}) {
  const { pageToCanvas, screenToCanvas } = useZoomableCanvas();
  const [editingId, setEditingId] = useState(null);
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });

  // Çoklu Seçim State'i (Harici prop varsa onu kullan, yoksa yerel state)
  const [internalSelectedIds, setInternalSelectedIds] = useState([]);
  const selectedBlockIds = externalSelectedBlockIds !== undefined ? externalSelectedBlockIds : internalSelectedIds;
  const setSelectedBlockIds = onSelectedBlockIdsChange || setInternalSelectedIds;

  // Reanimated UI-Thread Çoklu Grup Taşıma Shared Value'ları
  const groupDragDeltaX = useSharedValue(0);
  const groupDragDeltaY = useSharedValue(0);
  const activeLeaderId = useSharedValue(null);

  const handleSelectBlock = useCallback((id, isMulti = false) => {
    if (isMulti) {
      setSelectedBlockIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setSelectedBlockIds([id]);
    }
  }, [setSelectedBlockIds]);

  const handleCanvasPress = (evt) => {
    if (editingId) {
      setEditingId(null);
      return;
    }
    if (selectedBlockIds.length > 0) {
      setSelectedBlockIds([]);
      return;
    }
    if (!isTextMode) return;

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
      y: Math.max(10, Math.round(coordY - 10)),
      text: '',
      color: activeColor,
      fontSize: activeFontSize,
      fontFamily: activeFontFamily || undefined,
      width: 120,
    };

    onTextBlocksChange([...textBlocks, newBlock]);
    setEditingId(newId);
    setSelectedBlockIds([newId]);
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

  // Grup Halinde Toplu Konum Güncelleme
  const handleGroupMoveEnd = useCallback((blockIds, deltaX, deltaY) => {
    if (!deltaX && !deltaY) return;
    const updated = textBlocks.map((b) => {
      if (blockIds.includes(b.id)) {
        return {
          ...b,
          x: Math.round((b.x || 0) + deltaX),
          y: Math.round((b.y || 0) + deltaY),
        };
      }
      return b;
    });
    if (onTextBlocksChange) {
      onTextBlocksChange(updated);
    }
  }, [textBlocks, onTextBlocksChange]);

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
    setSelectedBlockIds((prev) => prev.filter((item) => item !== id));
  };

  // Boş alana dokunulduğunda seçimi kaldırma jesti (Deselect Tap)
  const backdropTapGesture = Gesture.Tap()
    .maxDuration(250)
    .maxDistance(8)
    .onEnd(() => {
      'worklet';
      if (editingId) {
        runOnJS(setEditingId)(null);
      }
      runOnJS(setSelectedBlockIds)([]);
    });

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
      {/* Tuvale dokunarak seçimi ve düzenlemeyi kaldırma katmanı */}
      {(selectedBlockIds.length > 0 || editingId) && (
        <GestureDetector gesture={backdropTapGesture}>
          <View style={StyleSheet.absoluteFill} />
        </GestureDetector>
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
          isSelected={selectedBlockIds.includes(block.id)}
          onSelect={handleSelectBlock}
          onEdit={setEditingId}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onDelete={handleDeleteBlock}
          onMoveEnd={handleMoveEnd}
          onGroupMoveEnd={handleGroupMoveEnd}
          onResizeEnd={handleResizeEnd}
          canvasWidth={canvasLayout.width}
          canvasHeight={canvasLayout.height}
          isEraserActive={isEraserActive}
          isDrawingMode={isDrawingMode}
          groupDragDeltaX={groupDragDeltaX}
          groupDragDeltaY={groupDragDeltaY}
          activeLeaderId={activeLeaderId}
          selectedBlockIds={selectedBlockIds}
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
    minWidth: 40,
    padding: 0,
    margin: 0,
    zIndex: 10,
  },
  blockSelected: {
    borderWidth: 1.2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 3,
    backgroundColor: '#007AFF0D',
  },
  blockEditing: {
    zIndex: 50,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    backgroundColor: '#FFFFFFEE',
    borderRadius: 4,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  blockDragging: {
    zIndex: 100,
    opacity: 0.95,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    borderRadius: 3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    padding: 0,
    margin: 0,
  },
  textInput: {
    flex: 1,
    padding: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'normal',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  resizeHandleContainer: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF15',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#007AFF30',
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
    padding: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    backgroundColor: 'transparent',
  },
  savedText: {
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'normal',
    includeFontPadding: false,
    padding: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    ...(Platform.OS === 'web' ? { userSelect: 'none' } : {}),
  },
});
