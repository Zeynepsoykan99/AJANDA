import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

/**
 * InAppNotificationBanner - Foreground (Uygulama Açıkken) Ekranın Üstünden Düşen Şık Bildirim Banner'ı
 *
 * @param {boolean} visible - Görünürlük
 * @param {string} title - Bildirim başlığı
 * @param {string} message - Bildirim mesajı / sayfa adı
 * @param {object} [data] - Ek yönlendirme verisi ({ pageId, route, category })
 * @param {function} onDismiss - Kapanma callback'i
 * @param {number} [duration=5000] - Otomatik kapanma süresi (ms)
 */
export default function InAppNotificationBanner({
  visible,
  title,
  message,
  data,
  onDismiss,
  duration = 5000,
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // Titreşim
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}

      // Aşağı kayma animasyonu
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 120,
      });
      opacity.value = withTiming(1, { duration: 250 });

      // Otomatik kapanma zamanlayıcısı
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else {
      translateY.value = withTiming(-200, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    translateY.value = withTiming(-200, { duration: 250 }, () => {
      if (onDismiss) runOnJS(onDismiss)();
    });
    opacity.value = withTiming(0, { duration: 200 });
  };

  const handlePress = () => {
    handleDismiss();
    // Eğer bildirimde rota veya sayfa bilgisi varsa doğrudan sayfaya yönlendir
    if (data?.route) {
      setTimeout(() => {
        router.push(data.route);
      }, 150);
    } else if (data?.pageId && data?.category === 'todo') {
      setTimeout(() => {
        router.push(`/todolist/${data.pageId}`);
      }, 150);
    } else if (data?.pageId && data?.category) {
      setTimeout(() => {
        router.push(`/ajandam/${data.pageId}`);
      }, 150);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible && opacity.value === 0) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { top: insets.top + (Platform.OS === 'ios' ? 6 : 12) },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        style={[
          styles.bannerCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.accent + '35',
          },
          isTablet && styles.tabletCard,
        ]}
      >
        {/* Sol: Animasyonlu Zil İkonu */}
        <View style={[styles.iconBox, { backgroundColor: colors.accent + '18' }]}>
          <MaterialCommunityIcons name="bell-ring" size={22} color={colors.accent} />
        </View>

        {/* Orta: Başlık ve Metin */}
        <View style={styles.textContainer}>
          <Text
            style={[styles.bannerTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {title || 'AJANDA Hatırlatıcısı'}
          </Text>
          <Text
            style={[styles.bannerMessage, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {message || 'Zamanı gelen bir göreviniz var!'}
          </Text>
        </View>

        {/* Sağ: Kapat Butonu */}
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.closeButton, { backgroundColor: colors.background }]}
        >
          <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 520,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    // Premium Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
  tabletCard: {
    maxWidth: 600,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
