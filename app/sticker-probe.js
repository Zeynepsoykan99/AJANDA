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
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableSticker from '../components/stickers/DraggableSticker';
import ZoomableCanvas from '../components/drawing/ZoomableCanvas';
import DrawingCanvas from '../components/drawing/DrawingCanvas';
import { useZoomableCanvas } from '../components/drawing/ZoomableCanvas';
import { useTheme } from '../context/ThemeContext';
import { dlog } from '../utils/diagnosticLog';

const VARIANTS = [
  { id: 'a', label: 'a) Çıplak' },
  { id: 'b', label: 'b) + Zoomable' },
  { id: 'c', label: 'c) + Drawing' },
];

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

  const stage = (() => {
    if (variant === 'a') {
      return <View style={styles.stage}>{stickerNode}</View>;
    }
    if (variant === 'b') {
      return (
        <ZoomableCanvas style={styles.stage}>
          <View style={StyleSheet.absoluteFill}>{stickerNode}</View>
        </ZoomableCanvas>
      );
    }
    return (
      <ZoomableCanvas style={styles.stage}>
        <View style={StyleSheet.absoluteFill}>
          <DrawingCanvas
            isDrawingMode={false}
            tool="pen"
            drawings={[]}
            textBlocks={[]}
            stickers={[]}
            style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
          />
          {stickerNode}
        </View>
      </ZoomableCanvas>
    );
  })();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Çıkartma Teşhis Ekranı (geçici)
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
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tabText: { fontSize: 12, fontWeight: '600' },
  counters: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 3 },
  counterText: { fontSize: 12, fontWeight: '600' },
  stageWrap: { flex: 1, borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  stage: { flex: 1 },
  log: { borderWidth: 1, borderRadius: 10, padding: 8, minHeight: 110 },
  logLine: { fontSize: 11, fontFamily: 'monospace' },
  resetBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
});
