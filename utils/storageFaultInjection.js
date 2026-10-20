/**
 * ⚠️ GEÇİCİ — TEŞHİS AMAÇLI — KALDIRILACAK (depolama hata enjeksiyonu)
 *
 * Cihazda "okunamayan anahtar" ve "yazılamayan anahtar" senaryolarını elle
 * denemek için. Gerçekte bu hatalar Android'de ~2 MB'ı aşan satırda
 * (CursorWindow) ve 6 MB veritabanı sınırında oluşur; elle üretmek pratik değil.
 *
 * YALNIZCA GELİŞTİRME DERLEMESİNDE (__DEV__) çalışır. Release/preview
 * derlemesinde Metro `__DEV__`'i false tanımlar: FAULT_INJECTION_AVAILABLE
 * false olur, açma çağrıları hiçbir şey yapmaz ve sorgular her zaman false
 * döner (bkz. tests/storageFaultInjection.test.js).
 *
 * Durum yalnızca bellektedir: uygulama yeniden yüklenince tüm enjeksiyonlar kapanır.
 * Diskteki veriye DOKUNMAZ; yalnızca StorageService'in okuma/yazma çağrısını
 * gerçek AsyncStorage'a gitmeden hata ile sonlandırır.
 */

export const FAULT_INJECTION_AVAILABLE = typeof __DEV__ !== 'undefined' && __DEV__ === true;

/** Enjeksiyon yapılabilen anahtarlar (sözleşme kapsamındaki depolar) */
export const FAULT_KEYS = ['@ajanda_pages', '@ajanda_diary_v1', '@ajanda_notebooks_v1', '@ajanda_cover'];

const state = { read: new Set(), write: new Set() };
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      // Dinleyici hatası enjeksiyonu bozmasın
    }
  });
};

/**
 * Bir anahtar için okuma veya yazma hatasını açar/kapatır.
 * @param {'read'|'write'} kind
 * @param {string} key - FAULT_KEYS içinden
 * @param {boolean} enabled
 * @returns {boolean} değişiklik uygulandı mı (release'te her zaman false)
 */
export const setFault = (kind, key, enabled) => {
  if (!FAULT_INJECTION_AVAILABLE) return false;
  if (!state[kind] || !FAULT_KEYS.includes(key)) return false;
  if (enabled) state[kind].add(key);
  else state[kind].delete(key);
  notify();
  return true;
};

/** Tüm enjeksiyonları kapatır */
export const clearAllFaults = () => {
  state.read.clear();
  state.write.clear();
  notify();
};

/** Bu anahtarın okuması hata ile sonlanmalı mı */
export const shouldFailRead = (key) => FAULT_INJECTION_AVAILABLE && state.read.has(key);

/** Bu anahtarın yazması hata ile sonlanmalı mı */
export const shouldFailWrite = (key) => FAULT_INJECTION_AVAILABLE && state.write.has(key);

/** Herhangi bir enjeksiyon açık mı (ekrandaki gösterge için) */
export const isAnyFaultActive = () =>
  FAULT_INJECTION_AVAILABLE && state.read.size + state.write.size > 0;

/** Anlık durum kopyası */
export const getFaultState = () => ({ read: [...state.read], write: [...state.write] });

/**
 * Durum değişikliğine abone olur.
 * @returns {() => void} aboneliği kaldırır
 */
export const subscribeFaults = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
