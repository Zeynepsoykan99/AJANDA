import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useZoomableCanvas } from '../drawing/ZoomableCanvas';
// GECICI (teshis): kaldirilacak
import { dlog } from '../../utils/diagnosticLog';
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
  isExporting = false,
  pointerEvents = 'box-none',
  style,
}) {
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  // GECICI (teshis): secim durumu her degistiginde yazilir; "secildi mi,
  // ne zaman kalkti" sorusunu dogrudan cevaplar.
  useEffect(() => {
    dlog('stickerCanvas:selection', { selected: selectedStickerId || 'yok' });
  }, [selectedStickerId]);
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });
  const { isDrawingActive } = useZoomableCanvas();

  // Çizim başladığında aktif sticker seçimini anında kaldır (0ms gecikme, akıcı UX)
  useAnimatedReaction(
    () => isDrawingActive?.value,
    (active) => {
      if (active && selectedStickerId) {
        runOnJS(setSelectedStickerId)(null);
      }
    }
  );

  // Mod değiştiğinde veya dışa aktarım başladığında seçimi kaldır
  // GECICI (teshis): cizim modunun GERCEK degeri. Senaryolari ayirt etmek icin
  // her degisimde yazilir.
  useEffect(() => {
    dlog('stickerCanvas:mode', { isDrawingMode, isExporting, stickers: stickers?.length });
  }, [isDrawingMode, isExporting, stickers?.length]);

  useEffect(() => {
    if ((isDrawingMode || isExporting) && selectedStickerId) {
      // GECICI (teshis/hipotez a): secim MOD yuzunden mi kalkiyor?
      dlog('stickerCanvas:deselectByMode', { isDrawingMode, isExporting });
      setSelectedStickerId(null);
    }
  }, [isDrawingMode, isExporting]);

  // Tuval boşluğuna dokunulduğunda seçimi kaldırma jesti (Deselect on Outside Tap)
  const backdropTapGesture = Gesture.Tap()
    .maxDuration(300)
    .maxDistance(8)
    .onEnd(() => {
      'worklet';
      runOnJS(setSelectedStickerId)(null);
    });

  return (
    <View
      style={[styles.canvas, style]}
      pointerEvents={pointerEvents}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setCanvasLayout({ width, height });
      }}
    >
      {/* Tuvale dokunarak seçimi kaldırma katmanı (yalnızca bir sticker seçiliyken aktiftir) */}
      {selectedStickerId && (
        <GestureDetector gesture={backdropTapGesture}>
          <View style={StyleSheet.absoluteFill} />
        </GestureDetector>
      )}

      {(stickers || []).map((sticker) => (
        <DraggableSticker
          isDrawingMode={isDrawingMode}
          key={sticker.id}
          sticker={sticker}
          isSelected={selectedStickerId === sticker.id}
          onSelect={(id) => setSelectedStickerId((prev) => (prev === id ? null : id))}
          onDeselect={() => setSelectedStickerId(null)}
          onMove={onStickerMove}
          onResize={onStickerResize}
          onDelete={(id) => {
            setSelectedStickerId(null);
            if (onStickerDelete) onStickerDelete(id);
          }}
          canvasWidth={canvasLayout.width}
          canvasHeight={canvasLayout.height}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
});
