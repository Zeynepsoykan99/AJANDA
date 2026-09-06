import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

/**
 * useDynamicEdgeColor
 * Hedeflenen renk (targetColor) her değiştiğinde Reanimated UI thread üzerinde
 * interpolateColor ile yumuşak bir fade animasyonu (varsayılan 300ms) uygular.
 *
 * @param {string} targetColor - Geçilmek istenen hex renk (Örn: '#FFF5F8', '#FFFDE7')
 * @param {string} fallbackColor - Başlangıç / yedek renk (Örn: colors.background)
 * @param {number} duration - Animasyon süresi milisaniye cinsinden (varsayılan: 300)
 * @returns {object} { animatedStyle, resolvedColor }
 */
export default function useDynamicEdgeColor(
  targetColor,
  fallbackColor = '#FFFFFF',
  duration = 300
) {
  const initial = targetColor || fallbackColor;
  const fromColor = useSharedValue(initial);
  const toColor = useSharedValue(initial);
  const progress = useSharedValue(1);

  useEffect(() => {
    const next = targetColor || fallbackColor;
    if (next && next !== toColor.value) {
      fromColor.value = toColor.value;
      toColor.value = next;
      progress.value = 0;
      progress.value = withTiming(1, { duration });
    }
  }, [targetColor, fallbackColor, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [fromColor.value, toColor.value]
      ),
    };
  });

  return {
    animatedStyle,
    resolvedColor: targetColor || fallbackColor,
  };
}
