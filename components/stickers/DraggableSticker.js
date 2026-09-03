import React from 'react';
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

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

export default function DraggableSticker({
  sticker,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
  canvasWidth = 0,
  canvasHeight = 0,
  onSnapChange,
}) {
  const translateX = useSharedValue(sticker.x || 0);
  const translateY = useSharedValue(sticker.y || 0);
  const scale = useSharedValue(sticker.scale || 1);

  const savedTranslateX = useSharedValue(sticker.x || 0);
  const savedTranslateY = useSharedValue(sticker.y || 0);
  const savedScale = useSharedValue(sticker.scale || 1);
  const isActive = useSharedValue(false);

  const isSnappedV = useSharedValue(false);
  const isSnappedH = useSharedValue(false);

  // Sürükleme gesture'ı + Akıllı Hizalama (Snapping)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      isActive.value = true;
      isSnappedV.value = false;
      isSnappedH.value = false;
    })
    .onUpdate((event) => {
      let nextX = savedTranslateX.value + event.translationX;
      let nextY = savedTranslateY.value + event.translationY;

      // Akıllı Hizalama (Smart Snapping & Haptics)
      if (canvasWidth > 0 && canvasHeight > 0) {
        const itemW = 80 * scale.value;
        const itemH = 80 * scale.value;
        const centerX = nextX + itemW / 2;
        const centerY = nextY + itemH / 2;
        const midX = canvasWidth / 2;
        const midY = canvasHeight / 2;
        const threshold = 14;

        // Dikey eksen (yatay merkez) snap
        if (Math.abs(centerX - midX) < threshold) {
          nextX = midX - itemW / 2;
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
          nextY = midY - itemH / 2;
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

      translateX.value = nextX;
      translateY.value = nextY;
    })
    .onEnd(() => {
      isActive.value = false;
      if (isSnappedV.value || isSnappedH.value) {
        isSnappedV.value = false;
        isSnappedH.value = false;
      }
      if (onSnapChange) {
        runOnJS(onSnapChange)({ v: false, h: false });
      }
      if (onMove) {
        runOnJS(onMove)(sticker.id, translateX.value, translateY.value);
      }
    });

  // Seçim (Tap) gesture'ı
  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onSelect) {
        runOnJS(onSelect)(sticker.id);
      }
    });

  // Ana sticker için tap ve pan aynı anda çalışabilir
  const mainGesture = Gesture.Simultaneous(panGesture, tapGesture);

  // Yeniden boyutlandırma (Resize) gesture'ı
  const resizePanGesture = Gesture.Pan()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const delta = (event.translationX + event.translationY) / 2;
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
            <View style={styles.deleteButton}>
              <MaterialCommunityIcons name="close" size={16} color="#FFF" />
            </View>
          </GestureDetector>

          {/* Boyutlandırma Butonu */}
          <GestureDetector gesture={resizePanGesture}>
            <View style={styles.resizeButton}>
              <MaterialCommunityIcons name="resize-bottom-right" size={16} color="#FFF" />
            </View>
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
