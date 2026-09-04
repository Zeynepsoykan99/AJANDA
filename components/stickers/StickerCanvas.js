import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import DraggableSticker from './DraggableSticker';

/**
 * StickerCanvas - Sayfa üzerindeki sticker overlay katmanı
 * Sayfanın üzerine absolute pozisyonla yerleşir.
 * pointerEvents="box-none" ile sticker olmayan alanlara dokunma geçiş yapar.
 * Akıllı hizalama (snapping) sırasında kılavuz çizgileri görüntüler.
 *
 * @param {Array} stickers - Yerleştirilmiş sticker listesi
 * @param {function} onStickerMove - Konum güncelleme callback
 * @param {function} onStickerResize - Boyutlandırma callback
 * @param {function} onStickerDelete - Silme callback
 */
export default function StickerCanvas({
  stickers,
  onStickerMove,
  onStickerResize,
  onStickerDelete,
  isDrawingMode = false,
}) {
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });
  const [guideLines, setGuideLines] = useState({ v: false, h: false });

  const handleSnapChange = useCallback((snap) => {
    setGuideLines((prev) => ({ ...prev, ...snap }));
  }, []);

  return (
    <View
      style={styles.canvas}
      pointerEvents={isDrawingMode ? 'none' : 'box-none'}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setCanvasLayout({ width, height });
      }}
    >
      {/* Akıllı Hizalama Kılavuz Çizgileri */}
      {guideLines.v && canvasLayout.width > 0 && (
        <View
          style={[styles.guideLineVertical, { left: canvasLayout.width / 2 }]}
          pointerEvents="none"
        />
      )}
      {guideLines.h && canvasLayout.height > 0 && (
        <View
          style={[styles.guideLineHorizontal, { top: canvasLayout.height / 2 }]}
          pointerEvents="none"
        />
      )}

      {selectedStickerId && (
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => {
            setSelectedStickerId(null);
            return true;
          }}
        />
      )}

      {(stickers || []).map((sticker) => (
        <DraggableSticker
          key={sticker.id}
          sticker={sticker}
          isSelected={selectedStickerId === sticker.id}
          onSelect={(id) => setSelectedStickerId(id)}
          onMove={onStickerMove}
          onResize={onStickerResize}
          onDelete={(id) => {
            setSelectedStickerId(null);
            if (onStickerDelete) onStickerDelete(id);
          }}
          canvasWidth={canvasLayout.width}
          canvasHeight={canvasLayout.height}
          onSnapChange={handleSnapChange}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  guideLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#E91E63',
    zIndex: 5,
    opacity: 0.6,
  },
  guideLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: '#E91E63',
    zIndex: 5,
    opacity: 0.6,
  },
});
