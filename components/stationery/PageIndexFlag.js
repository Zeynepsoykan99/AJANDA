import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getIndexFlagColor } from '../../constants/indexFlagColors';

/**
 * PageIndexFlag - Dijital Post-it Sayfa İşaretleyicisi
 *
 * Klasik yarı saydam gövdeli ve renkli uçlu Post-it Index şeridi tasarımı.
 * Sayfanın sağ veya üst kenarından dışarı taşarak gerçekçi bir kırtasiye deneyimi sunar.
 *
 * @param {object} flag - { id, color, label, position }
 * @param {function} [onPress] - Bayrağa tıklandığında (düzenleme veya sayfaya gitme)
 * @param {string} [mode='page'] - 'page' (tam detaylı sayfa kenarı) | 'mini' (küçük kart önizleme)
 * @param {object} [style]
 */
export default function PageIndexFlag({
  flag,
  onPress,
  mode = 'page',
  style,
}) {
  if (!flag) return null;

  const colorConfig = getIndexFlagColor(flag.color);
  const labelText = typeof flag.label === 'string' && flag.label.trim() ? flag.label.trim() : '';

  if (mode === 'mini') {
    return (
      <TouchableOpacity
        activeOpacity={onPress ? 0.75 : 1}
        onPress={onPress}
        disabled={!onPress}
        style={[
          styles.miniContainer,
          {
            backgroundColor: colorConfig.tabColor,
            borderColor: colorConfig.borderColor,
          },
          style,
        ]}
      >
        <Text
          style={[styles.miniText, { color: colorConfig.textColor }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {labelText || colorConfig.name}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.flagContainer, style]}
    >
      {/* Kağıda Yapışan Yarı Saydam Gövde (Adhesive Base) */}
      <View
        style={[
          styles.adhesiveBase,
          {
            backgroundColor: colorConfig.adhesiveColor,
            borderColor: colorConfig.tabColor + '40',
          },
        ]}
      >
        {/* Minik dekoratif yapışkan çizgisi */}
        <View style={[styles.adhesiveStripe, { backgroundColor: colorConfig.tabColor + '50' }]} />
      </View>

      {/* Dışarı Sarkan Canlı Renkli Kulakçık (Protruding Tab Tip) */}
      <View
        style={[
          styles.tabTip,
          {
            backgroundColor: colorConfig.tabColor,
            borderColor: colorConfig.borderColor,
          },
        ]}
      >
        <Text
          style={[styles.tabLabel, { color: colorConfig.textColor }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {labelText || '📌'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 100,
  },
  adhesiveBase: {
    width: 24,
    height: 24,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    borderWidth: 0.5,
    borderRightWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adhesiveStripe: {
    width: 2,
    height: 14,
    borderRadius: 1,
  },
  tabTip: {
    minWidth: 46,
    maxWidth: 90,
    height: 26,
    paddingHorizontal: 8,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderLeftWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // Kart Önizleme (Mini)
  miniContainer: {
    height: 18,
    minWidth: 32,
    maxWidth: 72,
    paddingHorizontal: 6,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  miniText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
