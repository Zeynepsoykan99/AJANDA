import React, { useState, useCallback } from 'react';
import { View, StyleSheet, PixelRatio } from 'react-native';
import { PAPER_RULING_CONFIG } from '../../constants/paperRulings';

// Donanımsal Retina/HDPI 1-fiziksel piksel inceliği
const HAIRLINE = StyleSheet.hairlineWidth;

// Doku ölçüleri (Retina/HDPI donanım ızgarasıyla eşleşmesi için yuvarlanır)
const RULING_TOP = PixelRatio.roundToNearestPixel(PAPER_RULING_CONFIG.lined.rulingTop); // 36
const RULING_SIDE = PixelRatio.roundToNearestPixel(12); // rulingContainer paddingHorizontal
const LINE_PITCH = PixelRatio.roundToNearestPixel(PAPER_RULING_CONFIG.lined.linePitch); // 32
const GRID_PITCH = PixelRatio.roundToNearestPixel(PAPER_RULING_CONFIG.grid.linePitch); // 24
const DOT_SIZE = PixelRatio.roundToNearestPixel(2.5);
const DOT_PITCH = PixelRatio.roundToNearestPixel(PAPER_RULING_CONFIG.dotted.linePitch); // 28
const DOT_ROW_SIDE = PixelRatio.roundToNearestPixel(8); // dottedRow paddingHorizontal
const MARGIN_LEFT = PixelRatio.roundToNearestPixel(PAPER_RULING_CONFIG.lined.marginLineLeft || 40);


// Ölçüm gelmeden önceki ilk render için eski sabit değerler (Tabletler için de yeterli tavan)
const FALLBACK_COUNTS = { lines: 50, gridRows: 60, gridCols: 40, dotRows: 40, dotCols: 30 };

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
    dotRows: Math.ceil(Math.max(0, height - RULING_TOP) / DOT_PITCH) + 1,
    // Satıra sığan tam aralık sayısı kadar sütun; kalan boşluk satırın iki yanına eşit dağıtılır
    dotCols:
      Math.floor(
        Math.max(0, width - 2 * RULING_SIDE - 2 * DOT_ROW_SIDE - DOT_SIZE) / DOT_PITCH
      ) + 1,
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
              {Array.from({ length: counts.dotCols }).map((_, col) => (
                <View
                  key={col}
                  style={[styles.dot, col > 0 && styles.dotSpacing, { backgroundColor: lineColor }]}
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
    height: '100%',
    minHeight: '100%',
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
    height: HAIRLINE,
    width: '100%',
    marginBottom: Math.max(0, LINE_PITCH - HAIRLINE),
  },
  gridHorizontalLine: {
    height: HAIRLINE,
    width: '100%',
    marginBottom: Math.max(0, GRID_PITCH - HAIRLINE),
  },
  gridVerticalLine: {
    width: HAIRLINE,
    height: '100%',
    marginRight: Math.max(0, GRID_PITCH - HAIRLINE),
  },
  dottedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Math.max(0, DOT_PITCH - DOT_SIZE),
    paddingHorizontal: DOT_ROW_SIDE,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotSpacing: {
    marginLeft: Math.max(0, DOT_PITCH - DOT_SIZE),
  },
  marginLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: MARGIN_LEFT,
    width: Math.max(HAIRLINE * 2, 1),
    zIndex: 1,
  },

  content: {
    flex: 1,
    height: '100%',
    zIndex: 2,
  },
});
