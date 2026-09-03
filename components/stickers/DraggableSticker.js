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
  withTiming,
} from 'react-native-reanimated';

export default function DraggableSticker({ sticker, isSelected, onSelect, onMove, onResize, onDelete }) {
  const translateX = useSharedValue(sticker.x || 0);
  const translateY = useSharedValue(sticker.y || 0);
  const scale = useSharedValue(sticker.scale || 1);
  
  const savedTranslateX = useSharedValue(sticker.x || 0);
  const savedTranslateY = useSharedValue(sticker.y || 0);
  const savedScale = useSharedValue(sticker.scale || 1);
  const isActive = useSharedValue(false);

  // Sürükleme gesture'ı
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      isActive.value = true;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      isActive.value = false;
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
      // Çapraz sürükleme: sağa ve aşağı hareket scale artırır
      const delta = (event.translationX + event.translationY) / 2;
      const factor = 1 + (delta / 80); // 80 referans genişlik
      const newScale = savedScale.value * factor;
      scale.value = Math.max(0.3, Math.min(newScale, 5)); // Min 0.3x, Max 5x
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
          {/* Silme Butonu (Sol Üst veya Sağ Üst) */}
          <GestureDetector gesture={deleteTapGesture}>
            <View style={styles.deleteButton}>
              <MaterialCommunityIcons name="close" size={16} color="#FFF" />
            </View>
          </GestureDetector>

          {/* Boyutlandırma Butonu (Sağ Alt) */}
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
