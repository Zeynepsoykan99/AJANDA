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
 *   - eas.json "preview" profili             (SORUN B icin gercek kullanici
 *                                              derlemesi olcumu; ileride acilacak
 *                                              "production" profili taniyi
 *                                              ICERMEMELIDIR - DIAGNOSTICS_ENABLED
 *                                              false yapilmali veya bu dosya silinmeli)
 *   - components/notebook/NotebookPagesView.js (bumpRender + diag* proplari)
 *   - components/text/TextCanvas.js            (bumpRender)
 *   - components/stickers/StickerCanvas.js     (bumpRender)
 *   - components/stationery/PaperSheet.js      (countRulingElements disa aktarimi;
 *                                              YALNIZCA tani icin kullaniliyor)
 *   - tests/perfMeasurement.test.js            (olcum altyapisi testleri)
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
export const BUILD_STAMP = 'perf-2026-10-15-H';

/** Bu damgada neler var (rapordaki adımlarla eşleşsin diye) */
export const BUILD_NOTES =
  'SORUN B: ekran/derleme etiketi + tuval olcusu + render sayaclari + renderCommit';

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
 * ⚠️ GEÇİCİ — Kovayı sıfırlar.
 *
 * NOT: `summarizeTiming` özet alırken kovayı **kendisi** sıfırlar, yani
 * `perf:strokeEnd` yazılan her çizgide ölçüler zaten çizgi başınadır.
 * Bu yardımcı, özetin HİÇ alınmadığı yol için gereklidir: çizgi iptal
 * edilirse (`handleTouchCancel`) `perf:strokeEnd` yazılmaz ve kova dolu
 * kalır; bir sonraki çizgi iptal edilenin ölçülerini devralırdı.
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

/**
 * ⚠️ GEÇİCİ — Derleme türü etiketi.
 *
 * Ölçüm satırlarının hangi derlemeden geldiğini karıştırmamak için. `__DEV__`
 * Metro paketleyicisi tarafından tanımlanır; Node tarafındaki testlerde yoktur,
 * o yüzden varlığı denetlenir.
 */
export const BUILD_KIND =
  typeof __DEV__ !== 'undefined' && __DEV__ ? 'dev' : 'preview';

/**
 * ⚠️ GEÇİCİ — HAFİF RENDER SAYAÇLARI (SORUN B)
 *
 * Bir çizgi boyunca hangi bileşenin kaç kez render olduğunu ayırmak için.
 * Sayaçlar KÜRESELDİR: aynı adda birden çok örnek varsa (Notlarım'da her sayfa
 * için bir DrawingCanvas mount edilir) toplam render sayısını verirler — ekran
 * başına toplam render işini ölçmek istediğimiz için istenen davranış budur.
 *
 * Gövdede çağrılır (ref++ yerine), yalnızca bir sayı artırır; LOG YAZMAZ.
 */
const renderCounts = {
  drawingCanvas: 0,
  staticLayer: 0,
  screen: 0,
  textCanvas: 0,
  stickerCanvas: 0,
};

/** Bilinen sayaç adları (yazım hatası sessizce kaybolmasın diye) */
export const RENDER_COUNTER_KEYS = Object.keys(renderCounts);

/**
 * Bir bileşenin render sayacını artırır. Bilinmeyen ad sessizce yok sayılmaz;
 * sayaç tablosuna eklenir ki ölçüm kaybolmasın.
 * @param {string} key
 */
export const bumpRender = (key) => {
  if (!DIAGNOSTICS_ENABLED) return;
  renderCounts[key] = (renderCounts[key] || 0) + 1;
};

/** Sayaçların o anki kopyası (çizgi başında alınır) */
export const snapshotRenders = () => ({ ...renderCounts });

/**
 * Çizgi başındaki kopya ile şimdiki değerler arasındaki farkı verir.
 * @param {object} before - snapshotRenders() çıktısı
 * @returns {object} ad -> bu çizgi boyunca render sayısı
 */
export const diffRenders = (before) => {
  const out = {};
  Object.keys(renderCounts).forEach((k) => {
    out[k] = renderCounts[k] - ((before && before[k]) || 0);
  });
  return out;
};

/** Yüksek çözünürlüklü saat; yoksa Date.now()'a düşer */
export const nowMs = () =>
  typeof global !== 'undefined' && global.performance && global.performance.now
    ? global.performance.now()
    : Date.now();

export default { dlog, len, textLen, DIAGNOSTICS_ENABLED, bumpRender };
