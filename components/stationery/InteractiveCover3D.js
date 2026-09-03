import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const SPRING_CONFIG = {
  damping: 14,
  stiffness: 180,
  mass: 0.8,
};

/**
 * InteractiveCover3D - Gerçekçi Fiziksel 3D Ciltli Defter (Hardcover Notebook)
 *
 * Özellikler:
 * - 3D Eğim (Tilt) & Dinamik Temas Gölgesi
 * - Defter Sırtı (Spine) kavis gölgesi ve silindirik ışığı
 * - Cilt katlanma oluğu (Hinge Crease: 1px koyu + 1px açık kabartma çizgisi)
 * - Asimetrik kırtasiye köşeleri (Sol düz sırt 3px, sağ oval açılan sayfalar 18px)
 * - Sayfa Kalınlığı (Page Edges: Alttan ve sağdan görünen krem/fildişi sayfa bloğu)
 *
 * @param {React.ReactNode} children - Kapak görseli ve çizim katmanı
 * @param {object} style - Dış boyutlandırma stili
 * @param {function} onPress - Tıklama eylemi
 * @param {boolean} disabled - Çizim/metin modundayken tilte engel olur
 * @param {number} maxTilt - Maksimum eğim açısı (derece)
 * @param {boolean} compact - Mini galeriler için ölçeklendirme
 * @param {boolean} showPages - Alttaki sayfa kalınlığı bloğunu gösterir
 */
export default function InteractiveCover3D({
  children,
  style,
  onPress,
  disabled = false,
  maxTilt = 6,
  compact = false,
  showPages = true,
}) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  // 3D Transform & Gölge Shared Değerleri (UI Thread)
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  // Dinamik Temas Gölgesi (Masa Yüzeyi)
  const shadowHeight = useSharedValue(14);
  const shadowRadius = useSharedValue(18);
  const shadowOpacity = useSharedValue(0.24);
  const elevation = useSharedValue(10);

  // Asimetrik Köşe Oranları
  const topLeftRadius = compact ? 2 : 3;
  const bottomLeftRadius = compact ? 2 : 3;
  const topRightRadius = compact ? 10 : 18;
  const bottomRightRadius = compact ? 10 : 18;

  // Sayfa kalınlığı ve sırt kanalı ölçüleri
  const pageOffset = compact ? 3 : 6;
  const spineCreaseLeft = compact ? 10 : 20;

  const handlePressIn = useCallback(
    (event) => {
      if (disabled) return;

      const { locationX, locationY } = event.nativeEvent;
      let normX = 0;
      let normY = 0;

      if (layout.width > 0 && layout.height > 0) {
        normX = Math.max(-1, Math.min(1, (locationX / layout.width) * 2 - 1));
        normY = Math.max(-1, Math.min(1, (locationY / layout.height) * 2 - 1));
      }

      // Dokunulan yöne doğru 3D eğilme
      const targetRotateY = normX * maxTilt;
      const targetRotateX = -normY * maxTilt;

      scale.value = withSpring(0.965, SPRING_CONFIG);
      rotateX.value = withSpring(targetRotateX, SPRING_CONFIG);
      rotateY.value = withSpring(targetRotateY, SPRING_CONFIG);

      // Gölgenin masaya yapışması ve koyulaşması
      shadowHeight.value = withSpring(5, SPRING_CONFIG);
      shadowRadius.value = withSpring(8, SPRING_CONFIG);
      shadowOpacity.value = withSpring(0.38, SPRING_CONFIG);
      elevation.value = withSpring(4, SPRING_CONFIG);
    },
    [disabled, layout, maxTilt]
  );

  const handlePressOut = useCallback(() => {
    if (disabled) return;

    // Masadaki orijinal konumuna yaylanarak dönüş
    scale.value = withSpring(1, SPRING_CONFIG);
    rotateX.value = withSpring(0, SPRING_CONFIG);
    rotateY.value = withSpring(0, SPRING_CONFIG);

    shadowHeight.value = withSpring(14, SPRING_CONFIG);
    shadowRadius.value = withSpring(18, SPRING_CONFIG);
    shadowOpacity.value = withSpring(0.24, SPRING_CONFIG);
    elevation.value = withSpring(10, SPRING_CONFIG);
  }, [disabled]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { scale: scale.value },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
      ],
      shadowOffset: {
        width: 0,
        height: shadowHeight.value,
      },
      shadowRadius: shadowRadius.value,
      shadowOpacity: shadowOpacity.value,
      elevation: elevation.value,
    };
  });

  return (
    <Animated.View
      style={[styles.outerShadowContainer, style, animatedStyle]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ width, height });
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={styles.pressableContainer}
      >
        {/* ── KATMAN 1: Sayfa Bloğu (Alttan Görünen Krem Kağıtlar) ── */}
        {showPages && (
          <>
            {/* Arka Kapak Tabanı */}
            <View
              style={[
                styles.pageBlockOuter,
                {
                  top: pageOffset + 2,
                  left: 2,
                  right: -(pageOffset + 2),
                  bottom: -(pageOffset + 2),
                  borderTopLeftRadius: topLeftRadius,
                  borderBottomLeftRadius: bottomLeftRadius,
                  borderTopRightRadius: Math.max(2, topRightRadius - 2),
                  borderBottomRightRadius: Math.max(2, bottomRightRadius - 2),
                },
              ]}
              pointerEvents="none"
            />
            {/* Ana Kağıt Bloğu (Sayfa kalınlığı katmanı) */}
            <View
              style={[
                styles.pageBlockMain,
                {
                  top: pageOffset,
                  left: 1,
                  right: -pageOffset,
                  bottom: -pageOffset,
                  borderTopLeftRadius: topLeftRadius,
                  borderBottomLeftRadius: bottomLeftRadius,
                  borderTopRightRadius: topRightRadius,
                  borderBottomRightRadius: bottomRightRadius,
                },
              ]}
              pointerEvents="none"
            >
              {/* Sayfa kat çizgileri efekti */}
              <View style={styles.pageRibbingRight} />
              <View style={styles.pageRibbingBottom} />
            </View>
          </>
        )}

        {/* ── KATMAN 2: Ön Kapak (Hardcover) ── */}
        <View
          style={[
            styles.innerContentWrapper,
            {
              borderTopLeftRadius: topLeftRadius,
              borderBottomLeftRadius: bottomLeftRadius,
              borderTopRightRadius: topRightRadius,
              borderBottomRightRadius: bottomRightRadius,
            },
          ]}
        >
          {children}

          {/* ── KATMAN 3: Defter Sırtı İllüzyonu & Işık/Gölge Efektleri ── */}
          {/* A. Sol sırt kenar kavis gölgesi */}
          <View
            style={[
              styles.spineEdgeShadow,
              { width: compact ? 4 : 8 },
            ]}
            pointerEvents="none"
          />

          {/* B. Sol sırt silindirik ışık parlaması */}
          <View
            style={[
              styles.spineHighlight,
              {
                left: compact ? 4 : 8,
                width: compact ? 5 : 10,
              },
            ]}
            pointerEvents="none"
          />

          {/* C. Cilt Katlanma Kanalı (Hinge Crease: 1px koyu + 1px açık çizgi) */}
          <View
            style={[
              styles.spineCreaseDark,
              { left: spineCreaseLeft },
            ]}
            pointerEvents="none"
          />
          <View
            style={[
              styles.spineCreaseLight,
              { left: spineCreaseLeft + 1 },
            ]}
            pointerEvents="none"
          />

          {/* D. Kapak Çevre Pah Parlaması (Bevel) */}
          <View
            style={[
              styles.coverBevel,
              {
                borderTopLeftRadius: topLeftRadius,
                borderBottomLeftRadius: bottomLeftRadius,
                borderTopRightRadius: topRightRadius,
                borderBottomRightRadius: bottomRightRadius,
              },
            ]}
            pointerEvents="none"
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerShadowContainer: {
    shadowColor: '#000',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  pressableContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  // Sayfa Bloğu (Page Thickness)
  pageBlockOuter: {
    position: 'absolute',
    backgroundColor: '#EBE5D6',
    borderWidth: 1,
    borderColor: '#DDD4C0',
  },
  pageBlockMain: {
    position: 'absolute',
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#E6DFC9',
    overflow: 'hidden',
  },
  pageRibbingRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderLeftWidth: 1,
    borderLeftColor: '#EBE4D2',
    backgroundColor: '#F3EDE0',
  },
  pageRibbingBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    borderTopWidth: 1,
    borderTopColor: '#EBE4D2',
    backgroundColor: '#F3EDE0',
  },
  // Ön Kapak Taşıyıcı
  innerContentWrapper: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  // Defter Sırtı Katmanları
  spineEdgeShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0, 0, 0, 0.08)',
  },
  spineHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
  },
  spineCreaseDark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  spineCreaseLight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  coverBevel: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
});
