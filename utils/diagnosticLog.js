/**
 * ⚠️ GEÇİCİ — TEŞHİS AMAÇLI — KALDIRILACAK
 *
 * SORUN 4 (silgi metin üzerinde çalışmıyor) ve SORUN B (kalemle yazma
 * yavaşlığı) henüz kapanmadı. Bu modül, cihazda bir kez tetiklenecek
 * akışların izini çıkarmak için duruyor.
 *
 * ✅ KAPANDI ve tanıları KALDIRILDI:
 *   - Çıkartma etkileşimi (sticker:*, stickerCanvas:*, drawing:blockedBySticker)
 *     ve app/sticker-probe.js — kök neden: çizim pan'inin ±1 nokta eşiği;
 *     düzeltme blocksExternalGesture, cihazda doğrulandı.
 *   - Karalama ile silme (ayrı tur) — scribble:* izleri SORUN B için duruyor.
 *
 * ⏳ KALAN tanı çağrıları (kök neden bulununca kaldırılacak):
 *   - app/_layout.js                          (logBuildStamp)
 *   - app/ajandam/[pageId].js                 (dlog)
 *   - app/todolist/[pageId].js                (dlog)
 *   - components/drawing/DrawingCanvas.js     (perf:/scribble:/eraser: + ölçüm
 *                                              kovaları + renderCountRef +
 *                                              eventLagRef/frameGapRef/
 *                                              startFrameMonitor + onUpdate'teki
 *                                              Date.now() zaman damgası)
 *   - app/pdf-probe.js                        (TUM DOSYA + ana menu baglantisi;
 *                                              tam PDF özelliği turunda silinecek)
 *   - tests/pendingSaveFlush.test.js          (dlog/len/textLen no-op enjeksiyonu)
 * Bulmak için: grep -rn "diagnosticLog" --include=*.js .
 *
 * Çıktı `console.log` ile yazılır; Metro terminalinde görünür.
 * Her satır `[AJANDA-TANI]` ile başlar, böylece kolay süzülür:
 *   npx expo start  →  terminalde logları izle
 *   veya: adb logcat -s ReactNativeJS | findstr AJANDA-TANI
 */

/**
 * ⚠️ GEÇİCİ — YAPIM DAMGASI
 *
 * Cihazın GERÇEKTEN güncel JS paketini çalıştırdığını tek bakışta görmek için.
 * Her tanı turunda elle güncellenir; Metro'ya bağlandığınızda açılışta yazılır.
 * Konsolda bu damgayı görmüyorsanız cihaz ESKİ paketi çalıştırıyor demektir.
 */
export const BUILD_STAMP = 'perf-2026-10-13-F';

/** Bu damgada neler var (rapordaki adımlarla eşleşsin diye) */
export const BUILD_NOTES =
  'SORUN B: artimli SVG yol + kare birlestirme; iz gecikmesi olcumu eklendi';

/** Teşhis loglarını tek yerden kapatmak için. Kaldırmadan önce false yapılabilir. */
export const DIAGNOSTICS_ENABLED = true;

const counters = new Map();
const startedAt = Date.now();

/**
 * Teşhis satırı yazar ve aynı etiketin kaç kez çağrıldığını sayar.
 *
 * @param {string} label - Olay etiketi (ör. 'handleTextBlocksChange')
 * @param {object} [data] - Sayısal/kısa alanlar; uzun metin YAZMAYIN
 */
export const dlog = (label, data) => {
  if (!DIAGNOSTICS_ENABLED) return;
  const count = (counters.get(label) || 0) + 1;
  counters.set(label, count);
  const ms = Date.now() - startedAt;
  let suffix = '';
  if (data && typeof data === 'object') {
    suffix =
      ' ' +
      Object.entries(data)
        .map(([k, v]) => k + '=' + (v === undefined ? 'undefined' : String(v)))
        .join(' ');
  }
  console.log(`[AJANDA-TANI ${ms}ms] ${label} #${count}${suffix}`);
};

/** Bir dizinin güvenli uzunluğu (undefined/null ayrımını korur) */
export const len = (arr) => (Array.isArray(arr) ? arr.length : arr === undefined ? 'undefined' : 'null');

/** Metin kutularının toplam karakter sayısı — kısmi silmeyi izlemek için */
export const textLen = (blocks) =>
  Array.isArray(blocks) ? blocks.reduce((sum, b) => sum + (b?.text ? b.text.length : 0), 0) : 0;

/**
 * Açılışta yapım damgasını yazar. `app/_layout.js` içinden bir kez çağrılır.
 */
export const logBuildStamp = () => {
  if (!DIAGNOSTICS_ENABLED) return;
  console.log('[AJANDA-TANI] ===== YAPIM DAMGASI: ' + BUILD_STAMP + ' =====');
  console.log('[AJANDA-TANI] icerik: ' + BUILD_NOTES);
};

/**
 * Sıcak yollarda (her hareket olayı) log YAZMAZ; süreleri biriktirir ve
 * yalnızca hareket bitiminde tek bir özet satırı yazar.
 *
 * Neden: Metro'ya giden her log WebSocket üzerinden gider ve geliştirme
 * derlemesinde ölçmek istediğimiz yavaşlığı KENDİSİ yaratır.
 */
export const createTimingBucket = () => ({ count: 0, totalMs: 0, maxMs: 0 });

/**
 * Bir ölçüm kovasına süre ekler.
 * @param {object} bucket
 * @param {number} ms
 */
/**
 * ⚠️ GEÇİCİ — Kovayı sıfırlar. Her çizgi için ayrı özet çıkarmak gerekir;
 * sıfırlanmazsa `perf:strokeEnd` mount'tan beri birikmiş değer yazar.
 */
export const resetTiming = (bucket) => {
  if (!bucket) return;
  bucket.count = 0;
  bucket.totalMs = 0;
  bucket.maxMs = 0;
};

export const addTiming = (bucket, ms) => {
  if (!bucket) return;
  bucket.count += 1;
  bucket.totalMs += ms;
  if (ms > bucket.maxMs) bucket.maxMs = ms;
};

/**
 * Kovayı özetler ve sıfırlar.
 * @param {object} bucket
 * @returns {{ n: number, avg: string, max: string, total: string }}
 */
export const summarizeTiming = (bucket) => {
  if (!bucket || bucket.count === 0) return { n: 0, avg: '0.00', max: '0.00', total: '0.00' };
  const out = {
    n: bucket.count,
    avg: (bucket.totalMs / bucket.count).toFixed(2),
    max: bucket.maxMs.toFixed(2),
    total: bucket.totalMs.toFixed(2),
  };
  bucket.count = 0;
  bucket.totalMs = 0;
  bucket.maxMs = 0;
  return out;
};

/** Yüksek çözünürlüklü saat; yoksa Date.now()'a düşer */
export const nowMs = () =>
  typeof global !== 'undefined' && global.performance && global.performance.now
    ? global.performance.now()
    : Date.now();

export default { dlog, len, textLen, DIAGNOSTICS_ENABLED };
