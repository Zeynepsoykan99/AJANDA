import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

/**
 * DraggableSticker - Sürüklenebilir sticker bileşeni
 * Gesture Handler ile sürükle-bırak ve uzun basma ile silme desteği.
 *
 * @param {object} sticker - Yerleştirilmiş sticker verisi { id, content, x, y, scale }
 * @param {function} onMove - (stickerId, newX, newY) => void
 * @param {function} onDelete - (stickerId) => void
 */
export default function DraggableSticker({ sticker, onMove, onDelete }) {
  const translateX = useSharedValue(sticker.x || 0);
  const translateY = useSharedValue(sticker.y || 0);
  const scale = useSharedValue(sticker.scale || 1);
  const savedTranslateX = useSharedValue(sticker.x || 0);
  const savedTranslateY = useSharedValue(sticker.y || 0);
  const isActive = useSharedValue(false);

  // Sürükleme gesture'ı
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      isActive.value = true;
      scale.value = withSpring(1.2);
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      isActive.value = false;
      scale.value = withSpring(1);
      // Konum güncelleme callback
      if (onMove) {
        runOnJS(onMove)(sticker.id, translateX.value, translateY.value);
      }
    });

  // Uzun basma gesture'ı (silme)
  const longPressGesture = Gesture.LongPress()
    .minDuration(600)
    .onEnd((_event, success) => {
      if (success && onDelete) {
        runOnJS(onDelete)(sticker.id);
      }
    });

  // Gesture'ları birleştir
  const composedGesture = Gesture.Race(panGesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: isActive.value ? 100 : 10,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.stickerContainer, animatedStyle]}>
        <Text style={styles.stickerEmoji}>{sticker.content}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stickerContainer: {
    position: 'absolute',
    padding: 4,
  },
  stickerEmoji: {
    fontSize: 36,
  },
});
