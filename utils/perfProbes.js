/**
 * ⚠️ GEÇİCİ — TEŞHİS — KALDIRILACAK (bkz. utils/diagnosticLog.js listesi)
 *
 * İki ölçüm penceresi; ikisi de sıcak yolda LOG YAZMAZ, pencere kapanınca
 * TEK satır yazar.
 *
 * perf:pageAdd  — Sayfa ekleme dokunuşundan sonraki ilk SAKİN ana kadar.
 *   Sakin: SETTLE_MS (300 ms) boyunca 32 ms'yi aşan kare yok VE uçuşta yazma yok.
 *   settleMs   dokunuştan sakin pencerenin BAŞINA kadar: son uzun karenin bittiği an
 *              veya ekranın bıraktığı son işaret (ör. yazmanın bitişi), hangisi sonraysa
 *   windowMs   ölçümün toplam süresi (settleMs + 300 civarı)
 *   longFrames 32 ms üstü kare sayısı, maxFrameMs en uzun kare
 *   writes, writeBytes   pencere içinde BİTEN AsyncStorage yazmaları (storage:write ile aynı sayaç)
 *   r*         pencere içindeki render sayıları (ekran, kağıt, kağıt dokusu, metin,
 *              çıkartma, çizim, kalıcı çizgi katmanı, liste ekranı, küçük resim)
 *   mark_*     ekranın bıraktığı ara işaretler (ör. yazmanın bittiği an)
 *   timedOut   MAX_WINDOW_MS (10 sn) içinde sakinleşmediyse 1
 *   SINIR: pencere kapandıktan SONRA başlayan yazma (ör. 500 ms gecikmeli
 *   lastPageIndex kaydı sakin pencereden sonra gelirse) sayılmaz.
 *
 * perf:postStroke — Çizgi bittikten sonraki 800 ms.
 *   Aynı alanlar (settleMs yok). Yeni çizgi başlarsa pencere ERKEN kapanır ve
 *   cut=1 yazılır (sonraki çizginin render'ları karışmasın diye).
 */
import { dlog, nowMs, snapshotRenders, diffRenders } from './diagnosticLog';
import { getWriteStats } from './storageWriteProbe';

export const LONG_FRAME_MS = 32;
export const SETTLE_MS = 300;
export const MAX_WINDOW_MS = 10000;
export const POST_STROKE_MS = 800;

const renderFields = (diff) => ({
  rScreen: diff.screen || 0,
  rPaper: diff.paperSheet || 0,
  rRuling: diff.ruling || 0,
  rText: diff.textCanvas || 0,
  rSticker: diff.stickerCanvas || 0,
  rDraw: diff.drawingCanvas || 0,
  rStatic: diff.staticLayer || 0,
  rList: diff.listScreen || 0,
  rThumb: diff.thumbnail || 0,
});

/**
 * Ortak pencere: rAF ile kare aralıklarını izler.
 * @param {object} opts
 * @param {string} opts.label - dlog etiketi
 * @param {object} opts.base - satıra eklenecek sabit alanlar
 * @param {(state) => boolean} opts.shouldClose - her karede çağrılır
 * @param {boolean} [opts.withSettle]
 */
const startWindow = ({ label, base, shouldClose, withSettle = false }) => {
  const t0 = nowMs();
  const renders0 = snapshotRenders();
  const writes0 = getWriteStats();
  const marks = {};
  const state = { t0, last: t0, lastBusyAt: t0, longFrames: 0, maxFrameMs: 0, now: t0 };
  let raf = null;
  let closed = false;

  const close = (extra = {}) => {
    if (closed) return;
    closed = true;
    if (raf) cancelAnimationFrame(raf);
    const writes1 = getWriteStats();
    const line = {
      ...base,
      ...(withSettle ? { settleMs: Math.round(state.lastBusyAt - t0) } : {}),
      windowMs: Math.round(state.now - t0),
      longFrames: state.longFrames,
      maxFrameMs: state.maxFrameMs.toFixed(1),
      writes: writes1.finished - writes0.finished,
      writeBytes: writes1.bytes - writes0.bytes,
      ...renderFields(diffRenders(renders0)),
      ...marks,
      ...extra,
    };
    dlog(label, line);
  };

  const tick = () => {
    if (closed) return;
    const t = nowMs();
    const gap = t - state.last;
    state.last = t;
    state.now = t;
    if (gap > state.maxFrameMs) state.maxFrameMs = gap;
    if (gap > LONG_FRAME_MS) {
      state.longFrames += 1;
      state.lastBusyAt = t;
    }
    const verdict = shouldClose(state, marks);
    if (verdict) {
      close(typeof verdict === 'object' ? verdict : {});
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    /** Ara işaret: dokunuştan bu yana geçen ms */
    mark(name) {
      if (closed) return;
      const t = nowMs();
      marks[`mark_${name}`] = Math.round(t - t0);
      // Isaret de bir "mesgul" andir: sakinlik en erken buradan sayilir
      if (t > state.lastBusyAt) state.lastBusyAt = t;
    },
    close,
  };
};

/**
 * Sayfa ekleme ölçümünü başlatır (dokunuş anında çağrılır).
 *
 * Ekran yazma bitince `mark('writeDone')` çağırmalıdır: okuma (getItem) da
 * yerel ve asenkrondur, o sırada kareler sakin görünür; işaret beklenmezse
 * pencere yazma başlamadan kapanabilirdi.
 *
 * @param {string} screen - 'ajandam' | 'todo' | 'notlarim' | 'gunluk'
 * @param {object} [extra] - satıra eklenecek sabit alanlar (ör. sayfa sayısı)
 */
export const startPageAddProbe = (screen, extra = {}) =>
  startWindow({
    label: 'perf:pageAdd',
    base: { screen, ...extra },
    withSettle: true,
    shouldClose: (s, marks) => {
      if (s.now - s.t0 >= MAX_WINDOW_MS) return { timedOut: 1 };
      if (marks.mark_writeDone === undefined) return false;
      const calmFor = s.now - s.lastBusyAt;
      return calmFor >= SETTLE_MS && getWriteStats().inFlight === 0;
    },
  });

/**
 * Çizgi sonrası ölçümünü başlatır (çizgi bitince çağrılır).
 * Dönen nesnenin close({ cut: 1 }) çağrısı pencereyi erken kapatır.
 */
export const startPostStrokeProbe = (base = {}) =>
  startWindow({
    label: 'perf:postStroke',
    base,
    shouldClose: (s) => s.now - s.t0 >= POST_STROKE_MS,
  });
