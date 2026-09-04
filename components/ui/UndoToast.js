import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

/**
 * UndoToast - Silme işlemi sonrası "Geri Al" seçeneği sunan alt bildirim
 *
 * @param {boolean} visible - Toast görünür mü
 * @param {string} message - Gösterilecek mesaj (Örn: "Sayfa silindi")
 * @param {function} onUndo - Geri Al butonuna basılınca çalışır
 * @param {function} onDismiss - Süre dolunca veya kapatılınca çalışır
 * @param {number} duration - Otomatik kapanma süresi (ms), varsayılan 4000
 */
export default function UndoToast({
  visible,
  message,
  onUndo,
  onDismiss,
  duration = 4000,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  const displayMessage = message || t('common.emptyItem', 'Öğe silindi');

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(100, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible]);

  // Otomatik kapanma
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.textPrimary },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons name="delete-outline" size={18} color="#FFF" />
        <Text style={styles.message} numberOfLines={1}>
          {displayMessage}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onUndo}
        style={[styles.undoBtn, { backgroundColor: colors.accent }]}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="undo" size={16} color="#FFF" />
        <Text style={styles.undoBtnText}>{t('common.undoUpper', 'GERİ AL')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    zIndex: 9999,
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  undoBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
