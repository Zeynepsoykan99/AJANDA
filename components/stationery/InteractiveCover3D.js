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
 * InteractiveCover3D - 3 Boyutlu Fiziksel Kapak Etkileşimi
 * Dokunulduğunda parmak konumuna göre eğilen (tilt), hafifçe çöken (scale)
 * ve gölgesi masaya sıkışıp yayılan (dynamic shadow) premium defter bileşeni.
 *
 * @param {React.ReactNode} children - Kapak içeriği
 * @param {object} style - Dış stil (boyut, en-boy oranı vs.)
 * @param {function} onPress - Tıklama fonksiyonu
 * @param {boolean} disabled - Çizim/metin modunda dokunmayı devre dışı bırakır
 * @param {number} maxTilt - Maksimum eğim açısı (derece, varsayılan 6)
 * @param {number} borderRadius - Kenar yuvarlaklığı (varsayılan 10)
 */
export default function InteractiveCover3D({
  children,
  style,
  onPress,
  disabled = false,
  maxTilt = 6,
  borderRadius = 10,
}) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  // 3D Transform & Gölge Shared Değerleri (UI Thread)
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  // Dinamik Temas Gölgesi
  const shadowHeight = useSharedValue(14);
  const shadowRadius = useSharedValue(18);
  const shadowOpacity = useSharedValue(0.22);
  const elevation = useSharedValue(10);

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

      // Gölgenin masaya yaklaşması ve koyulaşması
      shadowHeight.value = withSpring(5, SPRING_CONFIG);
      shadowRadius.value = withSpring(8, SPRING_CONFIG);
      shadowOpacity.value = withSpring(0.38, SPRING_CONFIG);
      elevation.value = withSpring(4, SPRING_CONFIG);
    },
    [disabled, layout, maxTilt]
  );

  const handlePressOut = useCallback(() => {
    if (disabled) return;

    // Masadan eski orijinal konumuna yaylanarak dönüş
    scale.value = withSpring(1, SPRING_CONFIG);
    rotateX.value = withSpring(0, SPRING_CONFIG);
    rotateY.value = withSpring(0, SPRING_CONFIG);

    shadowHeight.value = withSpring(14, SPRING_CONFIG);
    shadowRadius.value = withSpring(18, SPRING_CONFIG);
    shadowOpacity.value = withSpring(0.22, SPRING_CONFIG);
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
        style={[styles.pressableContainer, { borderRadius }]}
      >
        <View style={[styles.innerContentWrapper, { borderRadius }]}>
          {children}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerShadowContainer: {
    shadowColor: '#000',
    backgroundColor: '#FFFFFF',
    // iOS'ta gölgelerin kırpılmaması için dış container'da overflow: 'visible' olmalıdır
    overflow: 'visible',
  },
  pressableContainer: {
    width: '100%',
    height: '100%',
  },
  innerContentWrapper: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
});
