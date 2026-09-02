import React from 'react';
import { View, StyleSheet } from 'react-native';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import SpiralBinder from './SpiralBinder';

/**
 * NotebookContainer - Gerçekçi Dijital Defter Kasası
 * iPad ve tablet ekranlarında geniş, iki sayfalı açık ajanda;
 * telefonlarda dikey telli defter görünümü sunar.
 *
 * @param {ReactNode} children - Sayfa içeriği veya sol/sağ sayfalar
 * @param {string} coverColor - Dış kapak kenar rengi
 * @param {boolean} showSpiral - Spiral cilt gösterilsin mi
 * @param {string} spiralPosition - 'center' | 'left' | 'none'
 */
export default function NotebookContainer({
  children,
  coverColor = '#F8BBD0',
  showSpiral = true,
  spiralPosition = 'auto', // 'auto' -> tablette center, telefonda left
  style,
}) {
  const { isTablet, isTwoPage, maxContentWidth, maxContentHeight } = useResponsiveLayout();

  const resolvedSpiralPos =
    spiralPosition === 'auto'
      ? isTwoPage
        ? 'center'
        : 'left'
      : spiralPosition;

  return (
    <View style={[styles.outerWrapper, { maxWidth: maxContentWidth }]}>
      {/* Saten Ayraç Kurdelesi (Üstten sarkan şerit) */}
      <View style={styles.ribbonContainer} pointerEvents="none">
        <View style={styles.ribbonBookmark}>
          <View style={styles.ribbonEnd} />
        </View>
      </View>

      {/* Dış Sert Kapak & Dikişli Kenarlık */}
      <View
        style={[
          styles.coverFrame,
          {
            backgroundColor: coverColor,
            borderColor: coverColor,
          },
          isTablet && { minHeight: maxContentHeight * 0.94 },
          style,
        ]}
      >
        {/* Sayfa Katman Efekti (Alttaki sayfaların hafif taşan beyaz kenarlıkları) */}
        <View style={styles.pageStackBack} />
        <View style={styles.pageStackMiddle} />

        {/* Ana Defter Açıklığı */}
        <View style={styles.notebookBook}>
          {/* Sol kenar spirali (Tek sayfa modunda) */}
          {showSpiral && resolvedSpiralPos === 'left' && (
            <SpiralBinder type="left" ringCount={isTablet ? 18 : 12} />
          )}

          {/* Sayfa İçerik Alanı */}
          <View style={styles.sheetContainer}>{children}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 8,
    position: 'relative',
    flex: 1,
  },
  ribbonContainer: {
    position: 'absolute',
    top: -6,
    right: 48,
    zIndex: 50,
  },
  ribbonBookmark: {
    width: 18,
    height: 48,
    backgroundColor: '#E91E63',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  ribbonEnd: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E91E63',
  },
  coverFrame: {
    borderRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
    flex: 1,
    position: 'relative',
  },
  pageStackBack: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    left: 4,
    top: 4,
    backgroundColor: '#FFF8E1',
    borderRadius: 18,
    opacity: 0.7,
    zIndex: 0,
  },
  pageStackMiddle: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    left: 6,
    top: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    opacity: 0.85,
    zIndex: 1,
  },
  notebookBook: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#FFFDF9',
    overflow: 'hidden',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  sheetContainer: {
    flex: 1,
  },
});
