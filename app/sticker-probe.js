/**
 * ⚠️ GEÇİCİ TEŞHİS EKRANI — KALICI DEĞİL, KALDIRILACAK
 *
 * Çıkartma etkileşimi (seçme / sürükleme / büyütme) üretimde hiç çalışmıyor.
 * Belirtileri tek tek yamamak yerine, hangi KATMAN eklenince bozulduğunu
 * ölçmek için GERÇEK `DraggableSticker` bileşeni üç ayrı sarmalayıcıda
 * çalıştırılır:
 *
 *   (a) ÇIPLAK            — yalnızca DraggableSticker
 *   (b) + ZoomableCanvas  — tuval dönüşümü/sağlayıcı eklenir
 *   (c) + DrawingCanvas   — çizim katmanı da eklenir (çizim modu KAPALI)
 *
 * StickerCanvas, depolama ve kaydetme yoktur: değişken sayısı en aza indirilmiştir.
 * Sayaçlar ekranda canlı gösterilir; Metro açmadan da sonuç okunabilir.
 *
 * Kök neden bulunup düzeltilince BU DOSYA ve ana menüdeki bağlantı silinecek.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableSticker from '../components/stickers/DraggableSticker';
import StickerCanvas from '../components/stickers/StickerCanvas';
import ZoomableCanvas from '../components/drawing/ZoomableCanvas';
import DrawingCanvas from '../components/drawing/DrawingCanvas';
import { useZoomableCanvas } from '../components/drawing/ZoomableCanvas';
import { useTheme } from '../context/ThemeContext';
import { dlog } from '../utils/diagnosticLog';

const VARIANTS = [
  { id: 'a', label: 'a)Çıplak' },
  { id: 'b', label: 'b)Zoom' },
  { id: 'c', label: 'c)Draw-' },
  { id: 'd', label: 'd)Draw+' },
  { id: 'e', label: 'e)Canvas' },
];

/**
 * Varyant (e) GERÇEK StickerCanvas'i kullanir. Probe'un (a-d) kurulumunda
 * OLMAYAN ve yalnizca StickerCanvas'ta bulunan dort sey vardir:
 *   1. useAnimatedReaction(isDrawingActive) -> secimi aninda kaldirir
 *   2. useEffect: isDrawingMode/isExporting degisince secimi kaldirir
 *   3. backdropTapGesture: secili iken TUM tuvali kaplayan bir dokunma katmani
 *   4. canvasWidth/Height onLayout'tan gelir
 * (e) sekmesi bu dordunu birlikte olcer.
 */

const TEST_STICKER = {
  id: 'probe_sticker',
  stickerId: 'probe',
  type: 'emoji',
  content: '⭐',
  x: 120,
  y: 160,
  scale: 1.4,
  rotation: 0,
};

export default function StickerProbeScreen() {
  const { colors } = useTheme();
  const [variant, setVariant] = useState('a');
  const [selectedId, setSelectedId] = useState(null);
  const [counts, setCounts] = useState({
    select: 0,
    deselect: 0,
    panStart: 0,
    move: 0,
    resize: 0,
    finalize: 0,
  });
  // Son olaylar listesi (ekranda okunabilsin diye)
  const [events, setEvents] = useState([]);
  const seqRef = useRef(0);

  const bump = useCallback((key, extra) => {
    seqRef.current += 1;
    const seq = seqRef.current;
    setCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    setEvents((prev) => [(seq + '. ' + key + (extra ? ' ' + extra : '')), ...prev].slice(0, 10));
    dlog('probe:' + key, { variant, ...(extra ? { extra } : {}) });
  }, [variant]);

  const reset = useCallback(() => {
    setCounts({ select: 0, deselect: 0, panStart: 0, move: 0, resize: 0, finalize: 0 });
    setEvents([]);
    seqRef.current = 0;
    setSelectedId(null);
    dlog('probe:reset', { variant });
  }, [variant]);

  const switchVariant = useCallback(
    (id) => {
      setVariant(id);
      setCounts({ select: 0, deselect: 0, panStart: 0, move: 0, resize: 0, finalize: 0 });
      setEvents([]);
      seqRef.current = 0;
      setSelectedId(null);
      dlog('probe:variant', { variant: id });
    },
    []
  );

  // Gerçek DraggableSticker — üç varyantta da AYNI bileşen, aynı prop'lar.
  // `onMove`/`onResize` yalnızca sayaç artırır; depolama yoktur.
  const stickerNode = useMemo(
    () => (
      <DraggableSticker
        key="probe"
        sticker={TEST_STICKER}
        isSelected={selectedId === TEST_STICKER.id}
        isDrawingMode={false}
        onSelect={(id) => {
          setSelectedId((prev) => (prev === id ? null : id));
          bump('select');
        }}
        onDeselect={() => {
          setSelectedId(null);
          bump('deselect');
        }}
        onMove={() => bump('move')}
        onResize={(_id, s) => bump('resize', 'scale=' + Number(s).toFixed(2))}
        onDelete={() => bump('finalize', 'delete')}
        canvasWidth={320}
        canvasHeight={420}
      />
    ),
    [selectedId, bump]
  );

  // (d) icin ayni cikartma ama isDrawingMode={true}: uzun basis yolu devreye girer
  const stickerNodeDrawing = useMemo(
    () => (
      <DraggableSticker
        key="probe-draw"
        sticker={TEST_STICKER}
        isSelected={selectedId === TEST_STICKER.id}
        isDrawingMode
        onSelect={(id) => {
          setSelectedId((prev) => (prev === id ? null : id));
          bump('select');
        }}
        onDeselect={() => {
          setSelectedId(null);
          bump('deselect');
        }}
        onMove={() => bump('move')}
        onResize={(_id, sc) => bump('resize', 'scale=' + Number(sc).toFixed(2))}
        onDelete={() => bump('finalize', 'delete')}
        canvasWidth={320}
        canvasHeight={420}
      />
    ),
    [selectedId, bump]
  );

  const stage = (() => {
    if (variant === 'a') {
      return <View style={styles.stage}>{stickerNode}</View>;
    }
    if (variant === 'b') {
      return (
        <ZoomableCanvas style={styles.stage}>
          <View style={StyleSheet.absoluteFill}>
            <RefProbe />
            {stickerNode}
          </View>
        </ZoomableCanvas>
      );
    }
    if (variant === 'e') {
      // GERCEK StickerCanvas: secimi KENDISI yonetir, bu yuzden sec/secimKalk
      // sayaclari artmaz. Belirleyici sinyal `tasi` ve `buyut` sayaclari ile
      // ekranda gorunen kesikli secim cercevesidir.
      return (
        <ZoomableCanvas style={styles.stage} isDrawingMode={false}>
          <View style={StyleSheet.absoluteFill}>
            <DrawingCanvas
              isDrawingMode={false}
              tool="pen"
              drawings={[]}
              textBlocks={[]}
              stickers={[]}
              style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
            />
            <RefProbe />
            <StickerCanvas
              stickers={[TEST_STICKER]}
              isDrawingMode={false}
              onStickerMove={() => bump('move')}
              onStickerResize={(_id, sc) => bump('resize', 'scale=' + Number(sc).toFixed(2))}
              onStickerDelete={() => bump('finalize', 'delete')}
            />
          </View>
        </ZoomableCanvas>
      );
    }

    // (c) cizim modu KAPALI, (d) cizim modu ACIK
    const drawingOn = variant === 'd';
    return (
      <ZoomableCanvas style={styles.stage} isDrawingMode={drawingOn}>
        <View style={StyleSheet.absoluteFill}>
          <DrawingCanvas
            isDrawingMode={drawingOn}
            tool="pen"
            drawings={[]}
            textBlocks={[]}
            stickers={[]}
            style={[StyleSheet.absoluteFill, { zIndex: drawingOn ? 50 : 20 }]}
          />
          <RefProbe />
          {drawingOn ? stickerNodeDrawing : stickerNode}
        </View>
      </ZoomableCanvas>
    );
  })();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Çıkartma Teşhis Ekranı (geçici)
      </Text>

      <Text style={[styles.legend, { color: colors.textSecondary }]}>
        a: çıplak · b: +Zoomable · c: +Drawing (mod KAPALI) · d: +Drawing (mod AÇIK) ·
        e: gerçek StickerCanvas
      </Text>

      <View style={styles.tabs}>
        {VARIANTS.map((v) => (
          <TouchableOpacity
            key={v.id}
            onPress={() => switchVariant(v.id)}
            style={[
              styles.tab,
              { borderColor: colors.border },
              variant === v.id && { backgroundColor: colors.accent },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: variant === v.id ? '#FFF' : colors.textSecondary },
              ]}
            >
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.counters, { borderColor: colors.border }]}>
        <Text style={[styles.counterText, { color: colors.textPrimary }]}>
          seç {counts.select} · seçimKalk {counts.deselect} · taşı {counts.move} · büyüt{' '}
          {counts.resize}
        </Text>
        <Text style={[styles.counterText, { color: colors.textSecondary }]}>
          seçili: {selectedId ? 'EVET' : 'hayır'}
          {variant === 'e' ? '  (e: seçimi StickerCanvas yönetir, bu sayaç artmaz)' : ''}
        </Text>
      </View>

      <ContextProbe />

      <View style={[styles.stageWrap, { borderColor: colors.border }]}>{stage}</View>

      <View style={[styles.log, { borderColor: colors.border }]}>
        {events.length === 0 ? (
          <Text style={[styles.logLine, { color: colors.textSecondary }]}>
            Çıkartmaya dokun, sürükle, köşeden büyüt.
          </Text>
        ) : (
          events.map((e, i) => (
            <Text key={i} style={[styles.logLine, { color: colors.textPrimary }]}>
              {e}
            </Text>
          ))
        )}
      </View>

      <TouchableOpacity
        onPress={reset}
        style={[styles.resetBtn, { borderColor: colors.border }]}
      >
        <Text style={[styles.tabText, { color: colors.textSecondary }]}>Sayaçları sıfırla</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/**
 * Varyant (a)'da DraggableSticker bir ZoomableCanvas sağlayıcısı ALTINDA
 * değildir; `useZoomableCanvas()` varsayılan bağlamı döndürür ve oradaki
 * `isStickerDragging` GERÇEK bir shared value değil, düz bir nesnedir.
 * Worklet içinden düz nesneye yazmak hata verebilir. Bu satır, sonucun
 * yanlış yorumlanmaması için durumu ekranda gösterir.
 */
/**
 * GECICI (teshis). Cizim pan jestinin RNGH handlerTag'ini SAGLAYICININ ICINDEN
 * okur. Duzeltmenin tamami bu referansin gercek bir tag'e cozumlenmesine bagli:
 *   tag > 0  -> blocksExternalGesture iliskisi native tarafa gitti
 *   YOK / -1 -> iliski ETKISIZ, duzeltme devrede DEGIL
 * RNGH tag'leri mikrotask icinde cikardigi icin (attachHandlers.js:25,39)
 * olcum setTimeout(0) ile mount sonrasina birakilir.
 */
function RefProbe() {
  const { drawingGestureRef } = useZoomableCanvas();
  const [tag, setTag] = useState('...');
  useEffect(() => {
    const t = setTimeout(() => {
      setTag(String(drawingGestureRef?.current?.handlerTag ?? 'YOK'));
    }, 0);
    return () => clearTimeout(t);
  }, [drawingGestureRef]);
  const ok = Number(tag) > 0;
  return (
    <View style={styles.refProbe} pointerEvents="none">
      <Text style={[styles.refProbeText, { color: ok ? '#2E7D32' : '#E53935' }]}>
        çizimJesti tag: {tag} {ok ? '(iliski kurulu)' : '(ETKISIZ)'}
      </Text>
    </View>
  );
}

function ContextProbe() {
  const { colors } = useTheme();
  const ctx = useZoomableCanvas();
  const isReal = typeof ctx?.scale?.modify === 'function';
  return (
    <Text style={[styles.counterText, { color: isReal ? colors.textSecondary : '#E53935' }]}>
      bağlam: {isReal ? 'gerçek sağlayıcı' : 'VARSAYILAN (shared value değil)'}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 14, gap: 10 },
  title: { fontSize: 15, fontWeight: '700' },
  legend: { fontSize: 10, lineHeight: 14 },
  refProbe: {
    position: 'absolute',
    top: 2,
    left: 2,
    zIndex: 999,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  refProbeText: { fontSize: 10, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 5 },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabText: { fontSize: 10, fontWeight: '700' },
  counters: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 3 },
  counterText: { fontSize: 12, fontWeight: '600' },
  stageWrap: { flex: 1, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  stage: { flex: 1 },
  log: { borderWidth: 1, borderRadius: 10, padding: 8, minHeight: 110 },
  logLine: { fontSize: 11, fontFamily: 'monospace' },
  resetBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
});
