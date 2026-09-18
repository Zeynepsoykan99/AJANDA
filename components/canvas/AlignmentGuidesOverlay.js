import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSmartSnapping } from './SmartSnappingContext';

/**
 * AlignmentGuidesOverlay - GPU Destekli 120 FPS Akıllı Hizalama Çizgileri
 * Sayfa üzerinde sürüklenen nesnelerin manyetik kilitlendiği hatları çizer.
 */
export default function AlignmentGuidesOverlay() {
  const snapping = useSmartSnapping();

  const verticalLineStyle = useAnimatedStyle(() => {
    if (!snapping || !snapping.guideLineX || !snapping.guideLineXVisible) {
      return { opacity: 0, transform: [{ translateX: -9999 }] };
    }
    return {
      opacity: snapping.guideLineXVisible.value,
      transform: [{ translateX: snapping.guideLineX.value }],
    };
  });

  const horizontalLineStyle = useAnimatedStyle(() => {
    if (!snapping || !snapping.guideLineY || !snapping.guideLineYVisible) {
      return { opacity: 0, transform: [{ translateY: -9999 }] };
    }
    return {
      opacity: snapping.guideLineYVisible.value,
      transform: [{ translateY: snapping.guideLineY.value }],
    };
  });

  if (!snapping) return null;

  return (
    <>
      <Animated.View
        style={[styles.guideLineVertical, verticalLineStyle]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.guideLineHorizontal, horizontalLineStyle]}
        pointerEvents="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  guideLineVertical: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1.2,
    backgroundColor: '#007AFF',
    zIndex: 75,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 6,
  },
  guideLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1.2,
    backgroundColor: '#007AFF',
    zIndex: 75,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 6,
  },
});
