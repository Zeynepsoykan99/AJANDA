/**
 * AJANDA - Depolama Hata Bildirimleri
 *
 * StorageService artık okuma/yazma hatalarını yutmuyor, tipli hata olarak
 * fırlatıyor. Bu modül iki şey sağlar:
 *   - Tipli hata üretimi ve tanıma (okuma hatası ile yazma hatasını ayırmak için)
 *   - Yazma hatasının kullanıcıya bildirilmesi: ekranlar hatayı buraya iletir,
 *     kök yerleşimdeki (app/_layout.js) banner dinleyip "Kaydedilemedi" gösterir.
 *
 * Bildirim SINIRLIDIR: aynı pencere içinde en fazla bir kez gösterilir; her
 * başarısız kayıt denemesinde (ör. her çizgide) kullanıcı boğulmasın diye.
 * Yeniden deneme YAPMAZ.
 */

export const STORAGE_READ_FAILED = 'STORAGE_READ_FAILED';
export const STORAGE_WRITE_FAILED = 'STORAGE_WRITE_FAILED';

// "Kaydedilemedi" uyarısı bu süre içinde en fazla bir kez gösterilir
export const WRITE_ERROR_NOTICE_WINDOW_MS = 30000;

/**
 * Tipli depolama hatası üretir. `instanceof` yerine `code` alanıyla tanınır;
 * Babel/Hermes altında Error alt sınıfları güvenilir değildir.
 * @param {string} code - STORAGE_READ_FAILED | STORAGE_WRITE_FAILED
 * @param {string} key - İlgili AsyncStorage anahtarı
 * @param {any} cause - Asıl hata
 * @returns {Error}
 */
export const createStorageError = (code, key, cause) => {
  const reason = cause?.message || String(cause);
  const error = new Error(`${code} (${key}): ${reason}`);
  error.code = code;
  error.key = key;
  error.cause = cause;
  return error;
};

/** Okuma hatası mı (anahtar var ama okunamadı / ayrıştırılamadı) */
export const isStorageReadError = (error) => error?.code === STORAGE_READ_FAILED;

/** Yazma hatası mı */
export const isStorageWriteError = (error) => error?.code === STORAGE_WRITE_FAILED;

const listeners = new Set();
let lastNoticeAt = -Infinity;

/**
 * Yazma hatası bildirimine abone olur.
 * @param {(error: Error) => void} listener
 * @returns {() => void} aboneliği kaldırır
 */
export const subscribeStorageWriteFailed = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Başarısız bir kaydı bildirir. Hata her zaman loglanır; kullanıcıya gösterim
 * ise pencere başına en fazla bir kez yapılır.
 * @param {Error} error
 * @param {number} [now] - Test için enjekte edilebilir saat
 * @returns {boolean} bu çağrıda kullanıcıya bildirim gönderildi mi
 */
export const reportStorageWriteError = (error, now = Date.now()) => {
  console.warn('Depolama yazma hatasi:', error);
  if (now - lastNoticeAt < WRITE_ERROR_NOTICE_WINDOW_MS) return false;
  lastNoticeAt = now;
  listeners.forEach((listener) => {
    try {
      listener(error);
    } catch (e) {
      console.warn('Depolama hata dinleyicisi basarisiz:', e);
    }
  });
  return true;
};

/**
 * Bir yazma çağrısını korur: başarısız olursa kullanıcıya bildirir ve `null`
 * döner. Ekranın bellekteki durumuna dokunmaz; çağıran `null` sonucu
 * "yazılmadı" olarak yorumlar (mevcut ekranlar zaten böyle davranıyor).
 * @param {Promise<any>} promise
 * @returns {Promise<any|null>}
 */
export const guardWrite = (promise) =>
  Promise.resolve(promise).catch((error) => {
    reportStorageWriteError(error);
    return null;
  });

/**
 * Defter depolama bağdaştırıcısının (NotebookPagesView / NotebookCoverView)
 * `load` dışındaki tüm metotlarını guardWrite ile sarar. `load` sarılmaz:
 * okuma hatası ekranın hata durumuna dönüşmeli, "Kaydedilemedi" değil.
 * @param {object} storage
 * @returns {object}
 */
export const guardStorageWrites = (storage) => {
  if (!storage) return storage;
  const guarded = {};
  Object.keys(storage).forEach((name) => {
    const fn = storage[name];
    guarded[name] =
      name === 'load' || typeof fn !== 'function'
        ? fn
        : (...args) => guardWrite(Promise.resolve().then(() => fn(...args)));
  });
  return guarded;
};
