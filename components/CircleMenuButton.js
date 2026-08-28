import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

/**
 * CircleMenuButton bileşeni
 * @param {string} label - Butonun altında yer alacak metin ("günlüğüm", "defterlerim", "ajandam")
 * @param {function} onPress - Butona tıklandığında çalışacak fonksiyon
 * @param {number} size - Dairenin çapı (varsayılan: 120)
 */
export default function CircleMenuButton({ label, onPress, size = 120 }) {
  return (
    <View className="items-center justify-center my-4" style={styles.wrapper}>
      {/* Daire şeklinde boş buton alanı */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
        className="bg-white/80 border-2 border-[#F8BBD0] items-center justify-center shadow-md"
      >
        {/* İleride içine görsel eklenecek, şu anda boş */}
        <View style={styles.innerPlaceholder} />
      </TouchableOpacity>

      {/* Dairenin altındaki koyu pembe metin */}
      <Text
        style={styles.label}
        className="mt-3 text-lg font-semibold tracking-wide text-[#AD1457]"
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
    backgroundColor: '#FFFFFF',
    borderColor: '#F8BBD0',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS ve Android için yumuşak gölge
    shadowColor: '#C2185B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  innerPlaceholder: {
    width: '100%',
    height: '100%',
  },
  label: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '600',
    color: '#AD1457',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
});
