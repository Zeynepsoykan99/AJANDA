import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * privacySettingsService - Cihaz dışına veri gönderen OTOMATİK özelliklerin
 * aç/kapa tercihleri.
 *
 * Yalnızca kullanıcının istemediği hâlde kendiliğinden çalışan iki akışı kapatır:
 *   1. Ajandam / Yapılacaklar'daki otomatik el yazısı tanıma (arama indeksi için)
 *   2. Sesli not kaydından otomatik metne çevirme
 *
 * Kement ile "metne çevir" ve başarısız bir transkripti yeniden deneme gibi
 * KULLANICININ KENDİ başlattığı işlemler bu ayarlardan ETKİLENMEZ; kullanıcı
 * o anda ne olduğunu bilerek tetiklediği için engellemek yanlış olurdu.
 */

const AUTO_HANDWRITING_KEY = '@ajanda_auto_handwriting_v1';
const AUTO_TRANSCRIBE_KEY = '@ajanda_auto_transcribe_v1';

// ─── Varsayılanlar ─────────────────────────────────────────────────
// Varsayılanı değiştirmek için YALNIZCA bu iki satırı değiştirmek yeterlidir.
// Mağaza formundaki "Optional" sınıflandırması varsayılana değil, kullanıcının
// KAPATABİLİYOR olmasına bağlıdır; bu yüzden varsayılan açık kalabilir.
/** Otomatik el yazısı tanıma varsayılanı */
export const AUTO_HANDWRITING_DEFAULT = true;
/** Otomatik sesli not → metin varsayılanı */
export const AUTO_TRANSCRIBE_DEFAULT = true;

let cache = {
  autoHandwriting: AUTO_HANDWRITING_DEFAULT,
  autoTranscribe: AUTO_TRANSCRIBE_DEFAULT,
};

/** Yükleme tamamlandı mı; tamamlanmadan senkron okuyucular varsayılanı döndürür */
let loadPromise = null;

const listeners = new Set();

const notify = () => {
  listeners.forEach((fn) => {
    try {
      fn({ ...cache });
    } catch (error) {
      console.warn('[PrivacySettings] dinleyici hatasi:', error);
    }
  });
};

/** '1' / '0' metnini boolean'a çevirir; kayıt yoksa varsayılanı döndürür */
const parseStored = (raw, fallback) => {
  if (raw === '1') return true;
  if (raw === '0') return false;
  return fallback;
};

/**
 * Tercihleri diskten okur ve önbelleğe alır. Birden fazla çağrı aynı okumayı
 * paylaşır. Uygulama açılışında bir kez çağrılır.
 *
 * @returns {Promise<{ autoHandwriting: boolean, autoTranscribe: boolean }>}
 */
export const loadPrivacySettings = () => {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const [handwriting, transcribe] = await AsyncStorage.multiGet([
        AUTO_HANDWRITING_KEY,
        AUTO_TRANSCRIBE_KEY,
      ]);
      cache = {
        autoHandwriting: parseStored(handwriting?.[1], AUTO_HANDWRITING_DEFAULT),
        autoTranscribe: parseStored(transcribe?.[1], AUTO_TRANSCRIBE_DEFAULT),
      };
    } catch (error) {
      // Sessiz kalmamalı: okunamazsa varsayılanla devam edilir
      console.error('[PrivacySettings] tercihler okunamadi, varsayilan kullaniliyor:', error);
    }
    return { ...cache };
  })();

  return loadPromise;
};

/**
 * Otomatik akışları kapılarken kullanılır. Tercihlerin diskten okunmasını
 * BEKLER; yükleme bitmeden bir çizim/kayıt tetiklenirse kapalı bir ayarın
 * yanlışlıkla atlanmasını engeller.
 *
 * DİKKAT: `loadPrivacySettings()`'in dönüşünü doğrudan vermez. O promise bir
 * kez çözülür ve çözüldüğü andaki önbellek kopyasını taşır; kullanıcı ayarı
 * sonradan değiştirirse o kopya ESKİ kalır ve kapılar uygulama yeniden
 * başlayana kadar yanlış değeri görürdü. Bu yüzden yükleme beklenip
 * GÜNCEL önbellek döndürülür.
 *
 * @returns {Promise<{ autoHandwriting: boolean, autoTranscribe: boolean }>}
 */
export const getPrivacySettings = async () => {
  await loadPrivacySettings();
  return { ...cache };
};

/** Yüklenmiş önbellekten senkron okuma (arayüz için) */
export const isAutoHandwritingEnabled = () => cache.autoHandwriting;

/** Yüklenmiş önbellekten senkron okuma (arayüz için) */
export const isAutoTranscribeEnabled = () => cache.autoTranscribe;

const persist = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value ? '1' : '0');
  } catch (error) {
    // Sessiz kalmamalı: yazılamazsa tercih sonraki açılışta kaybolur
    console.error('[PrivacySettings] tercih yazilamadi:', key, error);
  }
};

/**
 * Otomatik el yazısı tanımayı açar/kapatır.
 * @param {boolean} enabled
 */
export const setAutoHandwritingEnabled = async (enabled) => {
  const value = Boolean(enabled);
  await loadPrivacySettings();
  cache = { ...cache, autoHandwriting: value };
  notify();
  await persist(AUTO_HANDWRITING_KEY, value);
};

/**
 * Otomatik sesli not → metin dönüşümünü açar/kapatır.
 * @param {boolean} enabled
 */
export const setAutoTranscribeEnabled = async (enabled) => {
  const value = Boolean(enabled);
  await loadPrivacySettings();
  cache = { ...cache, autoTranscribe: value };
  notify();
  await persist(AUTO_TRANSCRIBE_KEY, value);
};

/**
 * Tercih değişikliklerini dinler.
 * @param {(settings: { autoHandwriting: boolean, autoTranscribe: boolean }) => void} listener
 * @returns {() => void} Aboneliği kaldıran fonksiyon
 */
export const addPrivacySettingsListener = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Yalnızca testler için: modül durumunu sıfırlar */
export const __resetForTests = () => {
  cache = {
    autoHandwriting: AUTO_HANDWRITING_DEFAULT,
    autoTranscribe: AUTO_TRANSCRIBE_DEFAULT,
  };
  loadPromise = null;
  listeners.clear();
};
