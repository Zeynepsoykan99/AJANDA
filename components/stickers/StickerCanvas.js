import React from 'react';
import { View, StyleSheet } from 'react-native';
import DraggableSticker from './DraggableSticker';

/**
 * StickerCanvas - Sayfa üzerindeki sticker overlay katmanı
 * Sayfanın üzerine absolute pozisyonla yerleşir.
 * pointerEvents="box-none" ile sticker olmayan alanlara dokunma geçiş yapar.
 *
 * @param {Array} stickers - Yerleştirilmiş sticker listesi
 * @param {function} onStickerMove - Konum güncelleme callback
 * @param {function} onStickerDelete - Silme callback
 */
export default function StickerCanvas({ stickers, onStickerMove, onStickerResize, onStickerDelete }) {
  const [selectedStickerId, setSelectedStickerId] = React.useState(null);

  if (!stickers || stickers.length === 0) return null;

  return (
    <View style={styles.canvas} pointerEvents="box-none">
      {selectedStickerId && (
        <View 
          style={StyleSheet.absoluteFill} 
          onStartShouldSetResponder={() => {
            setSelectedStickerId(null);
            return true;
          }} 
        />
      )}
      {stickers.map((sticker) => (
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
});
