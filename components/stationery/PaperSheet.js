import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * PaperSheet - Gerçekçi Kırtasiye Kağıdı Tabanı
 * Fildişi/krem rengi taban, defter çizgileri veya noktalı ızgara dokusu sunar.
 *
 * @param {string} ruling - 'lined' (çizgili) | 'dotted' (noktalı) | 'blank' (düz)
 * @param {string} paperColor - Kağıt rengi (varsayılan: fildişi/krem #FFFDF9)
 * @param {string} lineColor - Çizgi / nokta rengi
 * @param {boolean} showMargin - Sol dikey pembe marj çizgisi
 */
export default function PaperSheet({
  children,
  ruling = 'lined',
  paperColor = '#FFFDF9',
  lineColor = '#F8BBD040',
  showMargin = false,
  style,
}) {
  return (
    <View style={[styles.sheet, { backgroundColor: paperColor }, style]}>
      {/* Çizgili Kağıt Dokusu */}
      {ruling === 'lined' && (
        <View style={styles.rulingContainer} pointerEvents="none">
          {Array.from({ length: 30 }).map((_, i) => (
            <View
              key={i}
              style={[styles.horizontalLine, { backgroundColor: lineColor }]}
            />
          ))}
        </View>
      )}

      {/* Noktalı Kağıt Dokusu (Bullet Journal) */}
      {ruling === 'dotted' && (
        <View style={styles.rulingContainer} pointerEvents="none">
          {Array.from({ length: 24 }).map((_, row) => (
            <View key={row} style={styles.dottedRow}>
              {Array.from({ length: 16 }).map((_, col) => (
                <View
                  key={col}
                  style={[styles.dot, { backgroundColor: lineColor }]}
                />
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Sevimli Sol Marj Çizgisi */}
      {showMargin && (
        <View
          style={[styles.marginLine, { backgroundColor: '#F0629255' }]}
          pointerEvents="none"
        />
      )}

      {/* Sayfa İçeriği */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    // Kağıt kenar gölgesi
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#0000000A',
  },
  rulingContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 36,
    paddingHorizontal: 12,
  },
  horizontalLine: {
    height: 1,
    width: '100%',
    marginBottom: 27,
  },
  dottedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  dot: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
  },
  marginLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 36,
    width: 1.5,
    zIndex: 1,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
});
