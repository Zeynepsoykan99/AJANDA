import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Defs, Pattern, Rect } from 'react-native-svg';

/**
 * GridPaperSheet - Kareli (Grid) Defter Kağıdı Bileşeni
 * SVG pattern kullanarak pürüzsüz açık pembe, lila veya sarı kareli kırtasiye kağıdı dokusu çizer.
 *
 * @param {string} paperColor - Kağıt zemin rengi (varsayılan: '#FFFDF9' fildişi/krem)
 * @param {string} gridColor - Kare çizgilerinin rengi (varsayılan: '#F8BBD060' açık pembe)
 * @param {number} gridSize - Karelerin boyutu (varsayılan: 20px)
 * @param {boolean} showMargin - Sol dikey marj çizgisi
 */
export default function GridPaperSheet({
  children,
  paperColor = '#FFFDF9',
  gridColor = '#F8BBD060',
  gridSize = 20,
  showMargin = true,
  marginColor = '#F0629255',
  style,
}) {
  return (
    <View style={[styles.sheetContainer, { backgroundColor: paperColor }, style]}>
      {/* SVG Tabanlı Kareli Grid Deseni */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern
              id="gridPattern"
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              {/* Yatay çizgi */}
              <Line
                x1="0"
                y1="0"
                x2={gridSize}
                y2="0"
                stroke={gridColor}
                strokeWidth="0.8"
              />
              {/* Dikey çizgi */}
              <Line
                x1="0"
                y1="0"
                x2="0"
                y2={gridSize}
                stroke={gridColor}
                strokeWidth="0.8"
              />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#gridPattern)" />
        </Svg>
      </View>

      {/* Sol Pembe Marj Çizgisi */}
      {showMargin && (
        <View
          style={[styles.marginLine, { backgroundColor: marginColor }]}
          pointerEvents="none"
        />
      )}

      {/* Sayfa İçerik Katmanı */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#00000008',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
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
