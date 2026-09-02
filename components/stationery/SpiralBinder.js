import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * SpiralBinder - Gerçekçi Telli Defter / Spiral Cilt Bileşeni
 * Tablette sol ve sağ sayfaların arasında veya sayfanın sol kenarında
 * 3D görünümlü metal/pastel halkalar ve delik izleri çizer.
 *
 * @param {string} type - 'center' (iki sayfa arası) | 'left' (sol kenar)
 * @param {string} ringColor - Halka rengi ('rosegold', 'silver', 'pastelPink')
 * @param {number} ringCount - Halka sayısı (varsayılan: 14)
 */
export default function SpiralBinder({
  type = 'center',
  ringColor = 'rosegold',
  ringCount = 14,
  style,
}) {
  const getColors = () => {
    switch (ringColor) {
      case 'rosegold':
        return {
          highlight: '#FFE0E9',
          main: '#D48B97',
          shadow: '#8C4855',
        };
      case 'silver':
        return {
          highlight: '#FFFFFF',
          main: '#B0BEC5',
          shadow: '#455A64',
        };
      case 'gold':
        return {
          highlight: '#FFF9C4',
          main: '#FFB74D',
          shadow: '#E65100',
        };
      default:
        return {
          highlight: '#FCE4EC',
          main: '#F48FB1',
          shadow: '#AD1457',
        };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.binderContainer, type === 'left' && styles.binderLeft, style]}>
      {Array.from({ length: ringCount }).map((_, index) => (
        <View key={index} style={styles.ringWrapper}>
          {/* Sol delik */}
          <View style={styles.punchHole} />

          {/* 3D Metalik Spiral Halka */}
          <View
            style={[
              styles.spiralRing,
              {
                backgroundColor: colors.main,
                borderTopColor: colors.highlight,
                borderBottomColor: colors.shadow,
              },
            ]}
          >
            {/* Halka üstü ışık parlaması */}
            <View
              style={[
                styles.ringShine,
                { backgroundColor: colors.highlight },
              ]}
            />
          </View>

          {/* Sağ delik (yalnızca iki sayfa arası merkez modunda) */}
          {type === 'center' && <View style={styles.punchHole} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  binderContainer: {
    width: 32,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    zIndex: 20,
    paddingVertical: 12,
  },
  binderLeft: {
    width: 22,
    alignItems: 'flex-start',
  },
  ringWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  punchHole: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3E272330',
    borderWidth: 0.5,
    borderColor: '#00000030',
  },
  spiralRing: {
    width: 24,
    height: 8,
    borderRadius: 4,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    marginHorizontal: -2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringShine: {
    width: '60%',
    height: 1.5,
    borderRadius: 1,
    opacity: 0.8,
  },
});
