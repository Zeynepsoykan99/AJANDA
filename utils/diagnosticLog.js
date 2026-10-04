/**
 * ⚠️ GEÇİCİ — TEŞHİS AMAÇLI — KALDIRILACAK
 *
 * SORUN 2 (yazarken metin kaybolup geri geliyor) ve SORUN 4 (silgi metin
 * üzerinde çalışmıyor) sorunlarının kök nedeni kanıtlanamadı. Bu modül,
 * cihazda bir kez tetiklenecek akışların izini çıkarmak için eklendi.
 *
 * Kök neden bulunup düzeltildikten sonra:
 *   - bu dosya silinecek,
 *   - `dlog(` çağrılarının tamamı kaldırılacak (`grep -rn "dlog(" .` ile bulunur).
 *
 * Çıktı `console.log` ile yazılır; Metro terminalinde görünür.
 * Her satır `[AJANDA-TANI]` ile başlar, böylece kolay süzülür:
 *   npx expo start  →  terminalde logları izle
 *   veya: adb logcat -s ReactNativeJS | findstr AJANDA-TANI
 */

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

export default { dlog, len, textLen, DIAGNOSTICS_ENABLED };
