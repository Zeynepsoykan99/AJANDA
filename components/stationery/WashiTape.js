import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

/**
 * WashiTape - Kırtasiye Washi Bant Bileşeni
 * Sayfa veya kart köşelerine yapıştırılmış, hafif şeffaf, sevimli pastel dekoratif bant.
 *
 * @param {string} color - Bant ana rengi
 * @param {number} width - Genişlik
 * @param {number} height - Yükseklik
 * @param {number} rotation - Eğim açısı (örn. -3, 4)
 * @param {string} pattern - 'dots' | 'stripes' | 'hearts' | 'plain'
 * @param {string} label - Bant üzerinde yazı (opsiyonel)
 */
export default function WashiTape({
  color = '#F8BBD0',
  width = 90,
  height = 22,
  rotation = -2,
  pattern = 'dots',
  label = null,
  style,
}) {
  return (
    <View
      style={[
        styles.tapeContainer,
        {
          width,
          height,
          backgroundColor: color,
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    >
      {/* Tırtıklı sol kenar simülasyonu */}
      <View style={[styles.tornEdge, styles.tornLeft]} />

      {/* Desen Katmanı */}
      <View style={styles.patternLayer}>
        {pattern === 'dots' && (
          <View style={styles.dotsRow}>
            {Array.from({ length: Math.floor(width / 14) }).map((_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        )}
        {pattern === 'stripes' && (
          <View style={styles.stripesRow}>
            {Array.from({ length: Math.floor(width / 10) }).map((_, i) => (
              <View key={i} style={styles.stripe} />
            ))}
          </View>
        )}
        {pattern === 'hearts' && (
          <View style={styles.heartsRow}>
            {Array.from({ length: Math.floor(width / 24) }).map((_, i) => (
              <Text key={i} style={styles.heart}>♡</Text>
            ))}
          </View>
        )}
      </View>

      {/* Varsa üzerindeki metin */}
      {label && (
        <Text style={styles.labelText} numberOfLines={1}>
          {label}
        </Text>
      )}

      {/* Tırtıklı sağ kenar simülasyonu */}
      <View style={[styles.tornEdge, styles.tornRight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tapeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.88,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
    overflow: 'hidden',
  },
  tornEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#FFFFFF66',
  },
  tornLeft: {
    left: 0,
    borderRightWidth: 1,
    borderRightColor: '#00000010',
  },
  tornRight: {
    right: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#00000010',
  },
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 6,
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#FFFFFF88',
  },
  stripesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  stripe: {
    width: 2,
    height: '100%',
    backgroundColor: '#FFFFFF66',
    transform: [{ skewX: '-25deg' }],
  },
  heartsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 4,
  },
  heart: {
    fontSize: 10,
    color: '#FFFFFFBB',
    fontWeight: '700',
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A148C',
    letterSpacing: 0.5,
    zIndex: 2,
  },
});
