import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

export const ZoomableCanvasContext = createContext({
  scale: { value: 1 },
  translateX: { value: 0 },
  translateY: { value: 0 },
  screenToCanvas: (x, y) => ({ x, y }),
  canvasToScreen: (x, y) => ({ x, y }),
  pageToCanvas: (x, y) => ({ x, y }),
  resetZoom: () => {},
});

export const useZoomableCanvas = () => useContext(ZoomableCanvasContext);

/**
 * ZoomableCanvas - Pinch-to-Zoom ve Pan (Kaydırma) Sarmalayıcı Bileşeni
 * - react-native-gesture-handler v2 ve Reanimated 4 ile 60/120 FPS GPU destekli dönüşüm.
 * - Çizim / Metin modlarında tek parmak çizim yaparken iki parmak sayfayı yakınlaştırır ve kaydırır.
 * - Gezinme modunda tek parmakla da serbest kaydırma sağlar.
 * - Sınır aşımlarında rubber-band direnci ve yaylanma (withSpring) ile sayfayı ekranda tutar.
 * - Ekran dokunuşlarını orijinal tuval koordinatlarına dönüştüren Context sunar.
 */
const ZoomableCanvas = forwardRef(function ZoomableCanvas(
  {
    children,
    isDrawingMode = false,
    isTextMode = false,
    minScale = 1.0,
    maxScale = 4.0,
    style,
    onTransformChange,
  },
  ref
) {
  const scale = useSharedValue(1.0);
  const savedScale = useSharedValue(1.0);

  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);

  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const isPinching = useSharedValue(false);

  const viewportWidth = useSharedValue(0);
  const viewportHeight = useSharedValue(0);

  // JavaScript tarafında anlık koordinat okuması için ref
  const transformRef = useRef({
    scale: 1.0,
    translateX: 0,
    translateY: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    viewportOffsetX: 0,
    viewportOffsetY: 0,
  });

  const viewportRef = useRef(null);
  const [displayScale, setDisplayScale] = useState(100);
  const [showBadge, setShowBadge] = useState(false);

  // Zoom rozetini yalnızca anlamlı değişimlerde güncelle
  useAnimatedReaction(
    () => Math.round(scale.value * 100),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplayScale)(current);
        const shouldShow = current > 105;
        runOnJS(setShowBadge)(shouldShow);
        if (onTransformChange) {
          runOnJS(onTransformChange)({
            scale: scale.value,
            translateX: translateX.value,
            translateY: translateY.value,
          });
        }
      }
    },
    [onTransformChange]
  );

  // Yaylanarak sınırlara dönme (Clamp & Bounce back)
  const clampAndSpringBack = useCallback(() => {
    'worklet';
    let targetScale = scale.value;
    if (targetScale < minScale) {
      targetScale = minScale;
      scale.value = withSpring(minScale, { damping: 18, stiffness: 180 });
    } else if (targetScale > maxScale) {
      targetScale = maxScale;
      scale.value = withSpring(maxScale, { damping: 18, stiffness: 180 });
    }

    const maxTx = Math.max(0, (viewportWidth.value * (targetScale - 1)) / 2);
    const maxTy = Math.max(0, (viewportHeight.value * (targetScale - 1)) / 2);

    if (translateX.value > maxTx) {
      translateX.value = withSpring(maxTx, { damping: 18, stiffness: 180 });
    } else if (translateX.value < -maxTx) {
      translateX.value = withSpring(-maxTx, { damping: 18, stiffness: 180 });
    }

    if (translateY.value > maxTy) {
      translateY.value = withSpring(maxTy, { damping: 18, stiffness: 180 });
    } else if (translateY.value < -maxTy) {
      translateY.value = withSpring(-maxTy, { damping: 18, stiffness: 180 });
    }
  }, [minScale, maxScale, scale, translateX, translateY, viewportWidth, viewportHeight]);

  // %100 Orijinal Boyuta Sıfırla
  const resetZoom = useCallback(() => {
    scale.value = withSpring(1.0, { damping: 18, stiffness: 180 });
    translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    transformRef.current.scale = 1.0;
    transformRef.current.translateX = 0;
    transformRef.current.translateY = 0;
    triggerHaptic();
  }, [scale, translateX, translateY]);

  useImperativeHandle(ref, () => ({
    resetZoom,
    getTransform: () => ({
      scale: scale.value,
      translateX: translateX.value,
      translateY: translateY.value,
    }),
  }));

  // ─── GESTURE 1: Pinch (İki parmakla odak noktalı büyütme) ───
  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      'worklet';
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
      isPinching.value = true;
    })
    .onUpdate((event) => {
      'worklet';
      const nextScale = Math.min(
        Math.max(savedScale.value * event.scale, minScale * 0.85),
        maxScale * 1.15
      );
      scale.value = nextScale;

      // Odak noktasının parmakların altında sabit kalması:
      const scaleRatio = nextScale / savedScale.value;
      const cx = viewportWidth.value / 2;
      const cy = viewportHeight.value / 2;

      const diffX = event.focalX - cx - savedTranslateX.value;
      const diffY = event.focalY - cy - savedTranslateY.value;

      translateX.value = event.focalX - cx - diffX * scaleRatio;
      translateY.value = event.focalY - cy - diffY * scaleRatio;
    })
    .onEnd(() => {
      'worklet';
      isPinching.value = false;
      clampAndSpringBack();
    });

  // ─── GESTURE 2: Pan (Sayfayı kaydırma) ───
  // Çizim veya metin modunda 2 parmak zorunlu; gezinme modunda tek parmak yeterli
  const panGesture = Gesture.Pan()
    .minPointers(isDrawingMode || isTextMode ? 2 : 1)
    .maxPointers(2)
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      // %100 boyuttayken ve çizim/metin modu açıkken tek parmak kaydırmaya izin verme
      if (scale.value <= 1.0 && (isDrawingMode || isTextMode)) return;

      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      'worklet';
      clampAndSpringBack();
    });

  // ─── GESTURE 3: Double Tap (Çift Tıklamayla Yakınlaştır / Sıfırla) ───
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd((event) => {
      'worklet';
      if (scale.value > 1.05) {
        // %100'e sıfırla
        scale.value = withSpring(1.0, { damping: 18, stiffness: 180 });
        translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
      } else {
        // Dokunulan noktaya 2x yakınlaştır
        const targetScale = 2.0;
        const cx = viewportWidth.value / 2;
        const cy = viewportHeight.value / 2;
        const tapX = event.x;
        const tapY = event.y;

        const targetTx = (cx - tapX) * (targetScale - 1);
        const targetTy = (cy - tapY) * (targetScale - 1);

        const maxTx = Math.max(0, (viewportWidth.value * (targetScale - 1)) / 2);
        const maxTy = Math.max(0, (viewportHeight.value * (targetScale - 1)) / 2);

        scale.value = withSpring(targetScale, { damping: 18, stiffness: 180 });
        translateX.value = withSpring(Math.max(-maxTx, Math.min(maxTx, targetTx)), {
          damping: 18,
          stiffness: 180,
        });
        translateY.value = withSpring(Math.max(-maxTy, Math.min(maxTy, targetTy)), {
          damping: 18,
          stiffness: 180,
        });
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  // ─── KOORDİNAT TRANSFORMASYONU FONKSİYONLARI ───
  const screenToCanvas = useCallback(
    (screenX, screenY) => {
      const s = scale.value || 1.0;
      const tx = translateX.value || 0;
      const ty = translateY.value || 0;
      const vw = viewportWidth.value || transformRef.current.viewportWidth || 0;
      const vh = viewportHeight.value || transformRef.current.viewportHeight || 0;
      const cx = vw / 2;
      const cy = vh / 2;

      return {
        x: (screenX - tx - cx) / s + cx,
        y: (screenY - ty - cy) / s + cy,
      };
    },
    [scale, translateX, translateY, viewportWidth, viewportHeight]
  );

  const canvasToScreen = useCallback(
    (canvasX, canvasY) => {
      const s = scale.value || 1.0;
      const tx = translateX.value || 0;
      const ty = translateY.value || 0;
      const vw = viewportWidth.value || transformRef.current.viewportWidth || 0;
      const vh = viewportHeight.value || transformRef.current.viewportHeight || 0;
      const cx = vw / 2;
      const cy = vh / 2;

      return {
        x: cx + (canvasX - cx) * s + tx,
        y: cy + (canvasY - cy) * s + ty,
      };
    },
    [scale, translateX, translateY, viewportWidth, viewportHeight]
  );

  const pageToCanvas = useCallback(
    (pageX, pageY) => {
      const screenX = pageX - (transformRef.current.viewportOffsetX || 0);
      const screenY = pageY - (transformRef.current.viewportOffsetY || 0);
      return screenToCanvas(screenX, screenY);
    },
    [screenToCanvas]
  );

  const onLayout = useCallback(
    (e) => {
      const { width, height } = e.nativeEvent.layout;
      viewportWidth.value = width;
      viewportHeight.value = height;
      transformRef.current.viewportWidth = width;
      transformRef.current.viewportHeight = height;

      if (viewportRef.current && viewportRef.current.measureInWindow) {
        viewportRef.current.measureInWindow((x, y) => {
          transformRef.current.viewportOffsetX = x;
          transformRef.current.viewportOffsetY = y;
        });
      }
    },
    [viewportWidth, viewportHeight]
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const contextValue = {
    scale,
    translateX,
    translateY,
    screenToCanvas,
    canvasToScreen,
    pageToCanvas,
    resetZoom,
  };

  return (
    <ZoomableCanvasContext.Provider value={contextValue}>
      <View
        ref={viewportRef}
        style={[styles.viewport, style]}
        onLayout={onLayout}
        collapsable={false}
      >
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
            {children}
          </Animated.View>
        </GestureDetector>

        {/* Büyütme Seviyesi Rozeti ve Sıfırlama Butonu */}
        {showBadge && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={resetZoom}
            style={styles.zoomBadge}
          >
            <MaterialCommunityIcons name="magnify" size={13} color="#C2185B" />
            <Text style={styles.zoomBadgeText}>%{displayScale}</Text>
            <View style={styles.zoomResetIcon}>
              <MaterialCommunityIcons name="close" size={11} color="#666" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </ZoomableCanvasContext.Provider>
  );
});

export default ZoomableCanvas;

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
    position: 'relative',
  },
  canvasWrapper: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(194, 24, 91, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  zoomBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2185B',
    marginLeft: 3,
    marginRight: 4,
  },
  zoomResetIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
