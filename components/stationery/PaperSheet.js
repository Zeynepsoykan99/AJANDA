import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

// Doku ölçüleri (stillerle birebir uyumlu olmalı)
const RULING_TOP = 36; // rulingContainer paddingTop
const RULING_SIDE = 12; // rulingContainer paddingHorizontal
const LINE_PITCH = 28; // çizgi yüksekliği 1 + marginBottom 27
const GRID_PITCH = 24; // ızgara çizgisi 1 + margin 23
const DOT_ROW_PITCH = 26.5; // nokta 2.5 + marginBottom 24

// Ölçüm gelmeden önceki ilk render için eski sabit değerler
const FALLBACK_COUNTS = { lines: 30, gridRows: 40, gridCols: 30, dotRows: 24 };
const DOT_COLUMNS = 16;

/**
 * Kağıdın gerçek boyutuna göre doku elemanı sayılarını hesaplar.
 * Her sayı bir fazladan eleman içerir; taşan kısım sheet'in overflow: hidden'ı ile kırpılır.
 */
function getRulingCounts(width, height) {
  if (!width || !height) return FALLBACK_COUNTS;
  return {
    lines: Math.ceil(Math.max(0, height - RULING_TOP) / LINE_PITCH) + 1,
    gridRows: Math.ceil(height / GRID_PITCH) + 1,
    gridCols: Math.ceil(width / GRID_PITCH) + 1,
    dotRows: Math.ceil(Math.max(0, height - RULING_TOP) / DOT_ROW_PITCH) + 1,
  };
}

/**
 * PaperSheet - Gerçekçi Kırtasiye Kağıdı Tabanı
 * Fildişi/krem rengi taban, defter çizgileri veya noktalı ızgara dokusu sunar.
 * Çizgi / ızgara / nokta sayısı kağıdın ölçülen boyutuna göre hesaplanır;
 * böylece her ekran boyutunda sayfa tamamen dokulu kalır.
 *
 * @param {string} ruling - 'lined' (çizgili) | 'grid' (kareli) | 'dotted' (noktalı) | 'blank' (düz)
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
  const [sheetSize, setSheetSize] = useState({ width: 0, height: 0 });

  const handleLayout = useCallback((e) => {
    const width = Math.round(e.nativeEvent.layout.width);
    const height = Math.round(e.nativeEvent.layout.height);
    setSheetSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
  }, []);

  const counts = getRulingCounts(sheetSize.width, sheetSize.height);

  return (
    <View
      style={[styles.sheet, { backgroundColor: paperColor }, style]}
      onLayout={handleLayout}
    >
      {/* Çizgili Kağıt Dokusu */}
      {ruling === 'lined' && (
        <View style={styles.rulingContainer} pointerEvents="none">
          {Array.from({ length: counts.lines }).map((_, i) => (
            <View
              key={i}
              style={[styles.horizontalLine, { backgroundColor: lineColor }]}
            />
          ))}
        </View>
      )}

      {/* Kareli Kağıt Dokusu (Grid) */}
      {ruling === 'grid' && (
        <View style={[styles.rulingContainer, { overflow: 'hidden' }]} pointerEvents="none">
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {Array.from({ length: counts.gridRows }).map((_, i) => (
              <View
                key={`gh_${i}`}
                style={[styles.gridHorizontalLine, { backgroundColor: lineColor }]}
              />
            ))}
          </View>
          <View style={[StyleSheet.absoluteFillObject, { flexDirection: 'row' }]} pointerEvents="none">
            {Array.from({ length: counts.gridCols }).map((_, i) => (
              <View
                key={`gv_${i}`}
                style={[styles.gridVerticalLine, { backgroundColor: lineColor }]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Noktalı Kağıt Dokusu (Bullet Journal) */}
      {ruling === 'dotted' && (
        <View style={styles.rulingContainer} pointerEvents="none">
          {Array.from({ length: counts.dotRows }).map((_, row) => (
            <View key={row} style={styles.dottedRow}>
              {Array.from({ length: DOT_COLUMNS }).map((_, col) => (
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
    paddingTop: RULING_TOP,
    paddingHorizontal: RULING_SIDE,
  },
  horizontalLine: {
    height: 1,
    width: '100%',
    marginBottom: LINE_PITCH - 1,
  },
  gridHorizontalLine: {
    height: 1,
    width: '100%',
    marginBottom: GRID_PITCH - 1,
  },
  gridVerticalLine: {
    width: 1,
    height: '100%',
    marginRight: GRID_PITCH - 1,
  },
  dottedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: DOT_ROW_PITCH - 2.5,
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
