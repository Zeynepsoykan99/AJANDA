/**
 * AJANDA - Kalem Etkinliği
 *
 * Hangi tuvalde kalem (çizim dokunuşu) basılı olduğunu tutar. DrawingCanvas
 * dokunuş başında ve sonunda bildirir; tuval kaldırılırken de kendini siler,
 * böylece "kalem basılı" durumu asılı kalamaz.
 *
 * Birden çok tuval aynı anda mount olabilir (Notlarım'da sayfa başına bir tane);
 * bu yüzden tek bir bayrak yerine sahip (owner) kümesi tutulur.
 *
 * SINIR: Durum JS tarafında, dokunuşun JS'e ULAŞTIĞI anda değişir. JS meşgulken
 * kalem değmişse, olay kuyrukta beklerken burası hâlâ "basılı değil" der.
 */

const activeOwners = new Set();
const upListeners = new Set();

/**
 * Bir tuvalin kalem durumunu bildirir.
 * @param {object} owner - Tuvale özgü sabit nesne (ör. useRef ile)
 * @param {boolean} isDown
 */
export const setPenDown = (owner, isDown) => {
  if (isDown) {
    activeOwners.add(owner);
    return;
  }
  if (!activeOwners.delete(owner) || activeOwners.size > 0) return;
  const listeners = [...upListeners];
  upListeners.clear();
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (error) {
      console.warn('[PenActivity] dinleyici hatasi:', error);
    }
  });
};

/** Herhangi bir tuvalde kalem basılı mı */
export const isPenDown = () => activeOwners.size > 0;

/**
 * Kalem kalktığında BİR KEZ çağrılır. Kalem zaten kalkıksa çağrılmaz;
 * çağıran önce isPenDown() ile bakmalıdır.
 * @param {() => void} listener
 * @returns {() => void} aboneliği iptal eder
 */
export const onNextPenUp = (listener) => {
  upListeners.add(listener);
  return () => upListeners.delete(listener);
};

// ─── Kalem farkında kayıt zamanlayıcısı ─────────────────────────────────
// Debounce'lu kayıt (okuma sonrası JSON.parse + JSON.stringify) JS'i onlarca ms
// kilitler; çizgi sırasında başlarsa kalemin izi takılır. Bu zamanlayıcı süre
// dolduğunda kalem basılıysa kaydı BAŞLATMAZ, kalem kalkınca aynı gecikmeyle
// yeniden kurar. Zaten başlamış bir kaydı durdurmaz (yalnızca başlangıcı erteler).

/**
 * Erteleme üst sınırı: ilk ertelemeden bu kadar sonra kayıt kalem durumuna
 * BAKMADAN çalışır (kalem uzun süre basılı kalsa da veri bekletilmez).
 * Veri kaybı penceresi en fazla `gecikme + MAX_PEN_DEFER_MS` olur.
 */
export const MAX_PEN_DEFER_MS = 2000;

const clearHandle = (handle) => {
  if (handle.timer) clearTimeout(handle.timer);
  if (handle.capTimer) clearTimeout(handle.capTimer);
  if (handle.unsubscribe) handle.unsubscribe();
  handle.timer = null;
  handle.capTimer = null;
  handle.unsubscribe = null;
};

/**
 * setTimeout gibi zamanlar; süre dolduğunda kalem basılıysa geri çağrıyı
 * erteler (bkz. yukarıdaki açıklama).
 * @param {() => void} callback
 * @param {number} delay - ms
 * @returns {object} cancelPenAwareTimeout ile iptal edilen tutamaç
 */
export const setPenAwareTimeout = (callback, delay) => {
  const handle = { timer: null, capTimer: null, unsubscribe: null, done: false };
  const run = () => {
    if (handle.done) return;
    handle.done = true;
    clearHandle(handle);
    callback();
  };
  const fire = () => {
    handle.timer = null;
    if (handle.done) return;
    if (!isPenDown()) {
      run();
      return;
    }
    if (!handle.capTimer) handle.capTimer = setTimeout(run, MAX_PEN_DEFER_MS);
    if (!handle.unsubscribe) {
      handle.unsubscribe = onNextPenUp(() => {
        handle.unsubscribe = null;
        if (!handle.done) handle.timer = setTimeout(fire, delay);
      });
    }
  };
  handle.timer = setTimeout(fire, delay);
  return handle;
};

/**
 * setPenAwareTimeout ile kurulan kaydı iptal eder (bekleyen erteleme dahil).
 * @param {object|null} handle
 */
export const cancelPenAwareTimeout = (handle) => {
  if (!handle) return;
  handle.done = true;
  clearHandle(handle);
};
