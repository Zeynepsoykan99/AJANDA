import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * drawingPreferencesService - Çizim davranışı tercihleri.
 *
 * Şu an tek tercih var: karalayarak silme. Dört ekran (Ajandam, Yapılacaklar,
 * Günlüğüm, Notlarım) aynı değeri paylaşsın diye ekran state'i yerine burada
 * tutulur; kullanıcı bir kez kapatınca her yerde kapalı olur.
 *
 * Desen bilinçli olarak `privacySettingsService` ile aynıdır: önbellek +
 * açılışta tek okuma + dinleyici.
 */

const SCRIBBLE_ERASE_KEY = '@ajanda_scribble_erase_v1';

/** Karalayarak silme varsayılanı. Değiştirmek için yalnızca bu satır. */
export const SCRIBBLE_ERASE_DEFAULT = true;

let cache = { scribbleErase: SCRIBBLE_ERASE_DEFAULT };
let loadPromise = null;
const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try {
      fn({ ...cache });
    } catch (error) {
      console.warn('[DrawingPrefs] dinleyici hatasi:', error);
    }
  });
};

/**
 * Tercihleri diskten okur ve önbelleğe alır.
 * @returns {Promise<{ scribbleErase: boolean }>}
 */
export const loadDrawingPreferences = () => {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(SCRIBBLE_ERASE_KEY);
      if (raw === '1' || raw === '0') cache = { scribbleErase: raw === '1' };
    } catch (error) {
      console.error('[DrawingPrefs] tercihler okunamadi, varsayilan kullaniliyor:', error);
    }
    return { ...cache };
  })();

  return loadPromise;
};

/**
 * Yüklemeyi bekler ve GÜNCEL önbelleği döndürür.
 *
 * `loadDrawingPreferences()`in dönüşü doğrudan verilmez: o promise bir kez
 * çözülür ve çözüldüğü andaki kopyayı taşır, tercih sonradan değişirse eski
 * kalırdı.
 *
 * @returns {Promise<{ scribbleErase: boolean }>}
 */
export const getDrawingPreferences = async () => {
  await loadDrawingPreferences();
  return { ...cache };
};

/** Yüklenmiş önbellekten senkron okuma (arayüz için) */
export const isScribbleEraseEnabled = () => cache.scribbleErase;

/**
 * Karalayarak silmeyi açar/kapatır.
 * @param {boolean} enabled
 */
export const setScribbleEraseEnabled = async (enabled) => {
  const value = Boolean(enabled);
  await loadDrawingPreferences();
  cache = { ...cache, scribbleErase: value };
  notify();
  try {
    await AsyncStorage.setItem(SCRIBBLE_ERASE_KEY, value ? '1' : '0');
  } catch (error) {
    console.error('[DrawingPrefs] tercih yazilamadi:', error);
  }
};

/**
 * Tercih değişikliklerini dinler.
 * @param {(prefs: { scribbleErase: boolean }) => void} listener
 * @returns {() => void}
 */
export const addDrawingPreferencesListener = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
