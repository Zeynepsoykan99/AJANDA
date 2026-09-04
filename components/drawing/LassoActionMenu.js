import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

/**
 * LassoActionMenu - Kement ile Seçilen Çizimler İçin Bağlamsal Eylem Menüsü (Callout)
 * Seçilen çizimlerin hemen üstünde veya altında yüzer vaziyette belirir.
 */
export default function LassoActionMenu({
  visible = false,
  bounds,
  onConvertToText,
  onDelete,
  onClose,
  isLoading = false,
}) {
  const { colors } = useTheme();

  if (!visible || !bounds || bounds.width <= 0) {
    return null;
  }

  // Menünün konumunu hesapla (Yukarı sığıyorsa yukarı, sığmıyorsa seçimin altına yerleştir)
  const isTooHigh = bounds.minY < 65;
  const menuTop = isTooHigh ? bounds.maxY + 10 : Math.max(8, bounds.minY - 52);
  // Ekran dışına taşmaması için sol kenarı sınırla
  const menuLeft = Math.max(12, bounds.minX + Math.max(0, (bounds.width - 240) / 2));

  return (
    <View
      style={[
        styles.container,
        {
          top: menuTop,
          left: menuLeft,
          backgroundColor: colors.card || '#FFFFFF',
          borderColor: colors.border || '#E0E0E0',
        },
      ]}
      pointerEvents="box-none"
    >
      {/* 1. Metne Dönüştür Butonu */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onConvertToText}
        disabled={isLoading}
        style={[
          styles.actionBtn,
          styles.primaryActionBtn,
          { backgroundColor: colors.accent || '#C2185B' },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <MaterialCommunityIcons name="format-text" size={16} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Metne Dönüştür</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.border || '#EEE' }]} />

      {/* 2. Çizimleri Sil Butonu */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onDelete}
        disabled={isLoading}
        style={[styles.actionBtn, styles.deleteBtn]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={17} color="#E53935" />
        <Text style={styles.deleteText}>Sil</Text>
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.border || '#EEE' }]} />

      {/* 3. Seçimi Kapat / İptal Butonu */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onClose}
        disabled={isLoading}
        style={styles.closeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary || '#757575'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 24,
    borderWidth: 1,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  primaryActionBtn: {
    paddingHorizontal: 14,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 10,
  },
  deleteText: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 18,
    marginHorizontal: 4,
  },
});
