import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ImageWithSkeleton from '../ui/ImageWithSkeleton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STICKER_PACKS } from '../../constants/stickerPacks';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useZoomableCanvas } from '../drawing/ZoomableCanvas';
import { useSmartSnapping } from '../canvas/SmartSnappingContext';

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

export default function DraggableSticker({
  sticker,
  isSelected,
  onSelect,
  onDeselect,
  onMove,
  onResize,
  onDelete,
  canvasWidth = 0,
  canvasHeight = 0,
  onSnapChange,
}) {
  const { scale: canvasScale } = useZoomableCanvas();
  const translateX = useSharedValue(sticker.x || 0);
  const translateY = useSharedValue(sticker.y || 0);
  const scale = useSharedValue(sticker.scale || 1);

  const savedTranslateX = useSharedValue(sticker.x || 0);
  const savedTranslateY = useSharedValue(sticker.y || 0);
  const savedScale = useSharedValue(sticker.scale || 1);
  const isActive = useSharedValue(false);

  const isSnappedV = useSharedValue(false);
  const isSnappedH = useSharedValue(false);

  const smartSnapping = useSmartSnapping();
  const snapTargetsX = useSharedValue([]);
  const snapTargetsY = useSharedValue([]);

  const prepareSnapTargets = useCallback(() => {
    if (smartSnapping?.getSnapTargets) {
      const { targetsX, targetsY } = smartSnapping.getSnapTargets(sticker.id);
      snapTargetsX.value = targetsX;
      snapTargetsY.value = targetsY;
    }
  }, [smartSnapping, sticker.id]);

  // Sürükleme gesture'ı + Akıllı Hizalama (Snapping)
  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-5, 5])
    .activeOffsetY([-5, 5])
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      isActive.value = true;
      isSnappedV.value = false;
      isSnappedH.value = false;
      runOnJS(prepareSnapTargets)();
    })
    .onUpdate((event) => {
      'worklet';
      const s = (canvasScale && canvasScale.value) || 1.0;
      let nextX = savedTranslateX.value + event.translationX / s;
      let nextY = savedTranslateY.value + event.translationY / s;

      const itemW = 80 * scale.value;
      const itemH = 80 * scale.value;

      // Akıllı Hizalama (Smart Snapping & Guides)
      if (smartSnapping?.calculateSnapping && (snapTargetsX.value.length > 0 || snapTargetsY.value.length > 0)) {
        const res = smartSnapping.calculateSnapping(
          nextX,
          nextY,
          itemW,
          itemH,
          snapTargetsX.value,
          snapTargetsY.value,
          6
        );

        nextX = res.snappedX;
        nextY = res.snappedY;

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

      translateX.value = nextX;
      translateY.value = nextY;
    })
    .onEnd(() => {
      'worklet';
      isActive.value = false;
      isSnappedV.value = false;
      isSnappedH.value = false;
      if (smartSnapping) {
        smartSnapping.guideLineXVisible.value = 0;
        smartSnapping.guideLineYVisible.value = 0;
      }
      if (onSnapChange) {
        runOnJS(onSnapChange)({ v: false, h: false });
      }
      if (onMove) {
        runOnJS(onMove)(sticker.id, translateX.value, translateY.value);
      }
      // Sürükleme bittiğinde kesikli seçim çerçevesini kaldır
      if (onDeselect) {
        runOnJS(onDeselect)();
      }
    })
    .onFinalize(() => {
      'worklet';
      isActive.value = false;
      isSnappedV.value = false;
      isSnappedH.value = false;
      if (smartSnapping) {
        smartSnapping.guideLineXVisible.value = 0;
        smartSnapping.guideLineYVisible.value = 0;
      }
      if (onSnapChange) {
        runOnJS(onSnapChange)({ v: false, h: false });
      }
      if (onDeselect) {
        runOnJS(onDeselect)();
      }
    });

  // Seçim (Tap) gesture'ı - Sadece parmak 5px'den az hareket ettiğinde çalışır
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .maxDistance(5)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(triggerHaptic)();
        if (onSelect) {
          runOnJS(onSelect)(sticker.id);
        }
      }
    });

  // Jest Önceliği: Sürükleme (Pan) başladığında Tap jesti iptal edilir (Exclusive).
  // Böylece sürükle-bırak sonrasında sticker yanlışlıkla seçili kalmaz.
  const mainGesture = Gesture.Exclusive(panGesture, tapGesture);

  // Yeniden boyutlandırma (Resize) gesture'ı
  const resizePanGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const s = (canvasScale && canvasScale.value) || 1.0;
      const delta = (event.translationX / s + event.translationY / s) / 2;
      const factor = 1 + (delta / 80);
      const newScale = savedScale.value * factor;
      scale.value = Math.max(0.3, Math.min(newScale, 5));
    })
    .onEnd(() => {
      if (onResize) {
        runOnJS(onResize)(sticker.id, scale.value);
      }
    });

  // Silme (Delete) gesture'ı
  const deleteTapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onDelete) {
        runOnJS(onDelete)(sticker.id);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: isSelected || isActive.value ? 100 : 10,
  }));

  // Ters Ölçek (Inverse Scale): Silme ve boyutlandırma butonları sticker büyüse de
  // sabit piksel boyutunda kalır; böylece devasa buton sorunu ortadan kalkar.
  const inverseScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / scale.value }],
  }));

  let imageSource = null;
  if (sticker.type === 'image') {
    for (const pack of STICKER_PACKS) {
      const found = pack.stickers.find((s) => s.id === sticker.stickerId);
      if (found) {
        imageSource = found.source;
        break;
      }
    }
  }

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      {isSelected && (
        <View style={styles.selectionBorder} pointerEvents="none" />
      )}
      
      <GestureDetector gesture={mainGesture}>
        <View style={styles.stickerContainer}>
          {sticker.type === 'image' && imageSource ? (
            <ImageWithSkeleton source={imageSource} style={styles.stickerImage} resizeMode="contain" />
          ) : (
            <Text style={styles.stickerEmoji}>{sticker.content}</Text>
          )}
        </View>
      </GestureDetector>

      {/* Kontroller (Sadece seçiliyse görünür) */}
      {isSelected && (
        <>
          {/* Silme Butonu */}
          <GestureDetector gesture={deleteTapGesture}>
            <Animated.View style={[styles.deleteButton, inverseScaleStyle]}>
              <MaterialCommunityIcons name="close" size={16} color="#FFF" />
            </Animated.View>
          </GestureDetector>

          {/* Boyutlandırma Butonu */}
          <GestureDetector gesture={resizePanGesture}>
            <Animated.View style={[styles.resizeButton, inverseScaleStyle]}>
              <MaterialCommunityIcons name="resize-bottom-right" size={16} color="#FFF" />
            </Animated.View>
          </GestureDetector>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  selectionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#E91E63',
    borderStyle: 'dashed',
    borderRadius: 8,
    margin: -4,
  },
  stickerContainer: {
    padding: 4,
  },
  stickerEmoji: {
    fontSize: 36,
  },
  stickerImage: {
    width: 80,
    height: 80,
  },
  deleteButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  resizeButton: {
    position: 'absolute',
    bottom: -12,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});
