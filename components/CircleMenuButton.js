import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * CircleMenuButton bileşeni
 * @param {string} label - Butonun altında yer alacak metin
 * @param {string} iconName - MaterialCommunityIcons ikon adı
 * @param {function} onPress - Butona tıklandığında çalışacak fonksiyon
 * @param {number} size - Dairenin çapı (varsayılan: 120)
 */
export default function CircleMenuButton({ label, iconName, onPress, size = 120 }) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      {/* Daire şeklinde ikon buton alanı */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.textPrimary,
          },
        ]}
      >
        {iconName ? (
          <MaterialCommunityIcons
            name={iconName}
            size={size * 0.38}
            color={colors.accent}
          />
        ) : (
          <View style={{ width: size * 0.5, height: size * 0.5 }} />
        )}
      </TouchableOpacity>

      {/* Dairenin altındaki metin */}
      <Text
        style={[
          styles.label,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 14,
  },
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS ve Android için yumuşak gölge
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
});
