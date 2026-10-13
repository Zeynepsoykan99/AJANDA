import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ImageWithSkeleton from '../ui/ImageWithSkeleton';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STICKER_PACKS } from '../../constants/stickerPacks';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useZoomableCanvas } from '../drawing/ZoomableCanvas';

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

/**
 * Uzun basisla surukleme AKTIFLESTIGINDE "cikartmayi aldim" geri bildirimi.
 * Secimdeki Light'tan ayirmak icin Medium: kullanici hareketi baslatmadan once
 * suruklemenin devraldigini parmaginda hissetmeli.
 */
const triggerDragHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {}
};

/** Cizim modunda cikartmayi surukleyebilmek icin gereken basili tutma suresi (ms) */
const STICKER_DRAG_LONG_PRESS_MS = 300;

export default function DraggableSticker({
  sticker,
  isSelected,
  onSelect,
  onDeselect,
  onMove,
  onResize,
  onDelete,
  canvasWidth = 0,
  canvasHeight = 0,
  isDrawingMode = false,
}) {
  const { scale: canvasScale, isStickerDragging, drawingGestureRef } = useZoomableCanvas();
  const translateX = useSharedValue(sticker.x || 0);
  const translateY = useSharedValue(sticker.y || 0);
  const scale = useSharedValue(sticker.scale || 1);

  const savedTranslateX = useSharedValue(sticker.x || 0);
  const savedTranslateY = useSharedValue(sticker.y || 0);
  const savedScale = useSharedValue(sticker.scale || 1);
  const isActive = useSharedValue(false);


  // Sürükleme gesture'ı (serbest yerleşim; hizalama/yapışma yoktur)
  // Cizim modunda (kalem/fosforlu/silgi secili) cizim katmani dokunuslari
  // yakalar ve pan'i 1px'te aktifleştirir; cikartmanin 5px esigi bu yarisi
  // her zaman kaybeder. Bu yuzden cizim modunda cikartma UZUN BASISLA
  // suruklenir: boylece hem cikartma tasinabilir hem cikartmanin UZERINE
  // cizilebilir (ikisinden birini feda etmeden).
  // Cizim modu DISINDA jest yapilandirmasi a40ab0ca ile BIREBIR AYNI olmak
  // zorunda. Bu yuzden uzun basisa ozgu ayarlar zincire KOSULLU eklenir;
  // `activateAfterLongPress(0)` gibi "etkisiz" gorunen cagrilar bile
  // yapilandirmaya anahtar ekledigi ve `onTouchesDown` needsPointerData'yi
  // actigi icin kosulsuz uygulanmazlar.
  const panBase = isDrawingMode
    ? Gesture.Pan()
        .maxPointers(1)
        // Mesafeyle aktiflesme pratikte devre disi; aktiflesmeyi uzun basis saglar
        .activeOffsetX([-9999, 9999])
        .activeOffsetY([-9999, 9999])
        .activateAfterLongPress(STICKER_DRAG_LONG_PRESS_MS)
        // Cizim pan'i +-1 nokta'da aktiflesiyor (DrawingCanvas: activeOffsetX);
        // bizim esigimiz ise mesafeyle ASLA aktiflesmiyor, yalnizca 300 ms
        // zamanlayicisi var. RNGH Android PanGestureHandler.kt:135 geregi parmak
        // scaledTouchSlop (~8dp) kadar kayarsa zamanlayici IPTAL edilir. Bu
        // yuzden cizim her zaman once kazaniyor ve uzun basis hic atesleneMIYOR.
        // blocksExternalGesture ile cizim jesti, bu jest basarisiz olana kadar
        // BEKLEMEK zorunda kalir; yaris artik esik buyuklugune gore cozulmez.
        .blocksExternalGesture(drawingGestureRef)
    : Gesture.Pan().maxPointers(1).activeOffsetX([-5, 5]).activeOffsetY([-5, 5]);

  const panGesture = panBase
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      if (isStickerDragging) {
        isStickerDragging.value = true;
      }
      // Yalnizca UZUN BASIS yolunda: cizim modu disinda surukleme dogrudan
      // basladigi icin ek bir geri bildirim gereksiz olurdu.
      if (isDrawingMode) {
        runOnJS(triggerDragHaptic)();
      }
      isActive.value = true;
    })
    .onUpdate((event) => {
      'worklet';
      // SERBEST YERLEŞİM: çıkartma için hizalama kılavuzu ve yapışma YOKTUR;
      // parmağın bıraktığı koordinata gider. Metin kutusu tarafındaki akıllı
      // hizalama (TextCanvas + SmartSnappingContext) olduğu gibi durur.
      const s = (canvasScale && canvasScale.value) || 1.0;
      translateX.value = savedTranslateX.value + event.translationX / s;
      translateY.value = savedTranslateY.value + event.translationY / s;
    })
    .onEnd(() => {
      'worklet';
      isActive.value = false;
      if (onMove) {
        runOnJS(onMove)(sticker.id, translateX.value, translateY.value);
      }
      // Sürükleme bittiğinde kesikli seçim çerçevesini kaldır
      if (onDeselect) {
        runOnJS(onDeselect)();
      }
    })
    // DIKKAT: Bir jest zincirinde `onFinalize` TEK SLOT'tur
    // (react-native-gesture-handler/gesture.js: `this.handlers.onFinalize = callback`).
    // Ikinci bir .onFinalize() cagrisi birincinin UZERINE YAZAR. Daha once
    // bayrak birakma ayri bir .onFinalize() olarak eklenmis ve asagidaki
    // temizligi (isActive, onDeselect, isStickerDragging) sessizce yok etmisti.
    // Bu yuzden hepsi TEK govdede toplanmistir.
    .onFinalize(() => {
      'worklet';
      isActive.value = false;
      if (onDeselect) {
        runOnJS(onDeselect)();
      }
      // Jest iptal edilse bile cizim kalici kilitlenmesin
      if (isStickerDragging) {
        isStickerDragging.value = false;
      }
    });

  // Seçim (Tap) gesture'ı - Sadece parmak 5px'den az hareket ettiğinde çalışır
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .maxDistance(5)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(triggerHaptic)();
        if (onSelect) {
          runOnJS(onSelect)(sticker.id);
        }
      }
    });

  // Jest Önceliği: Sürükleme (Pan) başladığında Tap jesti iptal edilir (Exclusive).
  // Böylece sürükle-bırak sonrasında sticker yanlışlıkla seçili kalmaz.
  const mainGesture = Gesture.Exclusive(panGesture, tapGesture);

  // Yeniden boyutlandırma (Resize) gesture'ı
  const resizePanGesture = Gesture.Pan()
    .maxPointers(1)
    // Tutamak varsayilan esikle (~8dp scaledTouchSlop) aktiflesiyor, cizim pan'i
    // +-1 nokta'da; yani cizim 8x daha erken kazanip tutamagi iptal ediyordu.
    // Kosulsuz uygulanir: cizim modu kapaliyken cizim jesti .enabled(false)
    // oldugu icin iliski etkisizdir - bu yuzden takassizdir.
    .blocksExternalGesture(drawingGestureRef)
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const s = (canvasScale && canvasScale.value) || 1.0;
      const delta = (event.translationX / s + event.translationY / s) / 2;
      const factor = 1 + (delta / 80);
      const newScale = savedScale.value * factor;
      scale.value = Math.max(0.3, Math.min(newScale, 5));
    })
    .onEnd(() => {
      if (onResize) {
        runOnJS(onResize)(sticker.id, scale.value);
      }
    });

  // Silme (Delete) gesture'ı
  const deleteTapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onDelete) {
        runOnJS(onDelete)(sticker.id);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: isSelected || isActive.value ? 100 : 10,
  }));

  // Ters Ölçek (Inverse Scale): Silme ve boyutlandırma butonları sticker büyüse de
  // sabit piksel boyutunda kalır; böylece devasa buton sorunu ortadan kalkar.
  const inverseScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / scale.value }],
  }));

  let imageSource = null;
  if (sticker.type === 'image') {
    for (const pack of STICKER_PACKS) {
      const found = pack.stickers.find((s) => s.id === sticker.stickerId);
      if (found) {
        imageSource = found.source;
        break;
      }
    }
  }

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      {isSelected && (
        <View style={styles.selectionBorder} pointerEvents="none" />
      )}
      
      <GestureDetector gesture={mainGesture}>
        <View style={styles.stickerContainer}>
          {sticker.type === 'image' && imageSource ? (
            <ImageWithSkeleton source={imageSource} style={styles.stickerImage} resizeMode="contain" />
          ) : (
            <Text style={styles.stickerEmoji}>{sticker.content}</Text>
          )}
        </View>
      </GestureDetector>

      {/* Kontroller (Sadece seçiliyse görünür) */}
      {isSelected && (
        <>
          {/* Silme Butonu */}
          <GestureDetector gesture={deleteTapGesture}>
            <Animated.View style={[styles.deleteButton, inverseScaleStyle]}>
              <MaterialCommunityIcons name="close" size={16} color="#FFF" />
            </Animated.View>
          </GestureDetector>

          {/* Boyutlandırma Butonu */}
          <GestureDetector gesture={resizePanGesture}>
            <Animated.View style={[styles.resizeButton, inverseScaleStyle]}>
              <MaterialCommunityIcons name="resize-bottom-right" size={16} color="#FFF" />
            </Animated.View>
          </GestureDetector>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  selectionBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#E91E63',
    borderStyle: 'dashed',
    borderRadius: 8,
    margin: -4,
  },
  stickerContainer: {
    padding: 4,
  },
  stickerEmoji: {
    fontSize: 36,
  },
  stickerImage: {
    width: 80,
    height: 80,
  },
  deleteButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  resizeButton: {
    position: 'absolute',
    bottom: -12,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});
