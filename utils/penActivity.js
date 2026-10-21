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
