import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  unlockSession as bioUnlockSession,
  lockSession as bioLockSession,
  isSessionUnlocked as bioIsSessionUnlocked,
} from './biometricService';

const SECURE_STORE_PIN_KEY = 'ajanda_diary_pin_v1';
const ASYNC_FALLBACK_PIN_KEY = '@ajanda_diary_pin_secure_v1';

// ─── PIN Deneme Sınırı (Kademeli Gecikme) ──────────────────────────
// 4 haneli PIN yalnızca 10.000 kombinasyon demektir; sınırsız deneme kaba kuvvet
// saldırısını mümkün kılar. İlk birkaç deneme serbest bırakılır (kullanıcı kendi
// şifresini karıştırabilir), sonrasında bekleme süresi katlanarak artar.
const PIN_ATTEMPTS_KEY = '@ajanda_pin_attempts_v1';

/** Gecikme başlamadan önce serbest bırakılan yanlış deneme sayısı */
export const PIN_FREE_ATTEMPTS = 3;

/** 4., 5., 6., 7. ve 8+ hatalı denemede uygulanacak bekleme süreleri (ms) */
export const PIN_LOCKOUT_LADDER_MS = [30000, 60000, 120000, 300000, 900000];

/**
 * Toplam yanlış deneme sayısına karşılık gelen bekleme süresini döndürür.
 * Saf fonksiyon: zamandan ve depodan bağımsızdır, doğrudan test edilebilir.
 *
 * @param {number} failedCount - Ardışık yanlış deneme sayısı
 * @returns {number} Bekleme süresi (ms). Serbest aralıktaysa 0.
 */
export const getLockoutDurationMs = (failedCount) => {
  const count = Number(failedCount) || 0;
  if (count <= PIN_FREE_ATTEMPTS) return 0;
  const index = Math.min(count - PIN_FREE_ATTEMPTS - 1, PIN_LOCKOUT_LADDER_MS.length - 1);
  return PIN_LOCKOUT_LADDER_MS[index];
};

/**
 * Kayıttan o anki kilit durumunu hesaplar. Saf fonksiyon.
 *
 * @param {{ failedCount?: number, lockedUntil?: number }} record
 * @param {number} now - Date.now()
 * @returns {{ failedCount: number, isLocked: boolean, remainingMs: number, remainingAttempts: number }}
 */
export const computeAttemptState = (record, now) => {
  const failedCount = Number(record?.failedCount) || 0;
  const lockedUntil = Number(record?.lockedUntil) || 0;
  const remainingMs = Math.max(0, lockedUntil - now);
  return {
    failedCount,
    isLocked: remainingMs > 0,
    remainingMs,
    remainingAttempts: Math.max(0, PIN_FREE_ATTEMPTS - failedCount),
  };
};

const readAttemptMap = async () => {
  try {
    const raw = await AsyncStorage.getItem(PIN_ATTEMPTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('[SecurityService] deneme kaydı okunamadı:', error);
    return {};
  }
};

const writeAttemptMap = async (map) => {
  try {
    await AsyncStorage.setItem(PIN_ATTEMPTS_KEY, JSON.stringify(map));
  } catch (error) {
    // Sessiz kalmamalı: yazılamazsa sınır uygulama yeniden başlayınca sıfırlanır
    console.error('[SecurityService] deneme kaydı yazılamadı, sınır kalıcı olmayacak:', error);
  }
};

/**
 * Standardizes target ID across all screens and storage records.
 * 'my_diary', 'diary', null, or undefined will always map to 'diary'.
 */
export const normalizeTargetId = (targetId) => {
  if (!targetId || targetId === 'my_diary' || targetId === 'diary') {
    return 'diary';
  }
  return String(targetId);
};

/**
 * Checks if SecureStore is available in current runtime
 */
const isSecureStoreAvailable = async () => {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

/**
 * SecurityService - Günlük ve Defterler için PIN / Şifreleme Servisi
 *
 * iOS Keychain ve Android Keystore donanım şifrelemesi kullanır.
 * Web ortamında güvenli AsyncStorage fallback'i sağlar.
 * Kesinlikle hiçbir varsayılan/otomatik PIN barındırmaz.
 */
export const SecurityService = {
  normalizeTargetId,

  /**
   * 4 haneli kullanıcı PIN kodunu güvenli alana kaydeder
   * @param {string} pin
   * @param {string} [targetId='diary']
   * @returns {Promise<boolean>}
   */
  async setPin(pin, targetId = 'diary') {
    if (!pin || typeof pin !== 'string') return false;
    const cleanPin = pin.trim();
    if (cleanPin.length !== 4) return false;

    const normId = normalizeTargetId(targetId);
    const key = `${SECURE_STORE_PIN_KEY}_${normId}`;
    const fallbackKey = `${ASYNC_FALLBACK_PIN_KEY}_${normId}`;

    try {
      const secureAvailable = await isSecureStoreAvailable();
      if (secureAvailable) {
        await SecureStore.setItemAsync(key, cleanPin, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      } else {
        await AsyncStorage.setItem(fallbackKey, cleanPin);
      }
      return true;
    } catch (error) {
      console.warn('[SecurityService] setPin error:', error);
      try {
        await AsyncStorage.setItem(fallbackKey, cleanPin);
        return true;
      } catch {
        return false;
      }
    }
  },

  /**
   * Girilen PIN kodunun doğruluğunu kontrol eder.
   * Kayıtlı bir PIN yoksa her zaman false döner (asla varsayılan PIN yoktur).
   * @param {string} pin
   * @param {string} [targetId='diary']
   * @returns {Promise<boolean>}
   */
  async verifyPin(pin, targetId = 'diary') {
    if (!pin || typeof pin !== 'string') return false;
    const cleanPin = pin.trim();

    const normId = normalizeTargetId(targetId);
    const key = `${SECURE_STORE_PIN_KEY}_${normId}`;
    const fallbackKey = `${ASYNC_FALLBACK_PIN_KEY}_${normId}`;

    try {
      let storedPin = null;
      const secureAvailable = await isSecureStoreAvailable();
      if (secureAvailable) {
        storedPin = await SecureStore.getItemAsync(key);
      }

      if (!storedPin) {
        storedPin = await AsyncStorage.getItem(fallbackKey);
      }

      if (!storedPin) return false;
      return storedPin === cleanPin;
    } catch (error) {
      console.warn('[SecurityService] verifyPin error:', error);
      return false;
    }
  },

  /**
   * Hedef için kayıtlı bir PIN olup olmadığını sorgular
   * @param {string} [targetId='diary']
   * @returns {Promise<boolean>}
   */
  async hasPin(targetId = 'diary') {
    const normId = normalizeTargetId(targetId);
    const key = `${SECURE_STORE_PIN_KEY}_${normId}`;
    const fallbackKey = `${ASYNC_FALLBACK_PIN_KEY}_${normId}`;

    try {
      let storedPin = null;
      const secureAvailable = await isSecureStoreAvailable();
      if (secureAvailable) {
        storedPin = await SecureStore.getItemAsync(key);
      }
      if (!storedPin) {
        storedPin = await AsyncStorage.getItem(fallbackKey);
      }
      return !!storedPin;
    } catch (error) {
      console.warn('[SecurityService] hasPin error:', error);
      return false;
    }
  },

  /**
   * Mevcut PIN kodunu doğrulayıp yeni PIN ile günceller (Change PIN)
   * @param {string} oldPin
   * @param {string} newPin
   * @param {string} [targetId='diary']
   * @returns {Promise<{ success: boolean, reason?: 'invalid_old_pin' | 'invalid_new_pin' | 'save_failed' }>}
   */
  async changePin(oldPin, newPin, targetId = 'diary') {
    if (!oldPin || !newPin) {
      return { success: false, reason: 'invalid_new_pin' };
    }
    const isOldValid = await this.verifyPin(oldPin, targetId);
    if (!isOldValid) {
      return { success: false, reason: 'invalid_old_pin' };
    }
    const saved = await this.setPin(newPin, targetId);
    if (!saved) {
      return { success: false, reason: 'save_failed' };
    }
    this.unlockSession(targetId);
    return { success: true };
  },

  /**
   * Kayıtlı PIN kodunu siler (Kilidi kaldırır)
   * @param {string} [targetId='diary']
   * @returns {Promise<boolean>}
   */
  async removePin(targetId = 'diary') {
    const normId = normalizeTargetId(targetId);
    const key = `${SECURE_STORE_PIN_KEY}_${normId}`;
    const fallbackKey = `${ASYNC_FALLBACK_PIN_KEY}_${normId}`;

    try {
      const secureAvailable = await isSecureStoreAvailable();
      if (secureAvailable) {
        await SecureStore.deleteItemAsync(key);
      }
      await AsyncStorage.removeItem(fallbackKey);
      this.lockSession(normId);
      return true;
    } catch (error) {
      console.warn('[SecurityService] removePin error:', error);
      try {
        await AsyncStorage.removeItem(fallbackKey);
        this.lockSession(normId);
        return true;
      } catch {
        return false;
      }
    }
  },

  // ─── PIN Deneme Sınırı ───────────────────────────────────────────
  getLockoutDurationMs,
  computeAttemptState,

  /**
   * Hedefin o anki deneme/kilit durumunu döndürür.
   * @param {string} [targetId='diary']
   */
  async getAttemptState(targetId = 'diary') {
    const normId = normalizeTargetId(targetId);
    const map = await readAttemptMap();
    return computeAttemptState(map[normId], Date.now());
  },

  /**
   * Yanlış denemeyi kaydeder ve gerekiyorsa kilit başlatır.
   * Sayaç diske yazılır; uygulamayı kapatıp açmak sınırı atlatmaz.
   * @param {string} [targetId='diary']
   */
  async registerFailedAttempt(targetId = 'diary') {
    const normId = normalizeTargetId(targetId);
    const map = await readAttemptMap();
    const failedCount = (Number(map[normId]?.failedCount) || 0) + 1;
    const lockoutMs = getLockoutDurationMs(failedCount);
    const now = Date.now();

    map[normId] = {
      failedCount,
      lockedUntil: lockoutMs > 0 ? now + lockoutMs : 0,
    };
    await writeAttemptMap(map);

    return computeAttemptState(map[normId], now);
  },

  /**
   * Doğru PIN girildiğinde sayacı sıfırlar.
   * @param {string} [targetId='diary']
   */
  async clearAttempts(targetId = 'diary') {
    const normId = normalizeTargetId(targetId);
    const map = await readAttemptMap();
    if (map[normId]) {
      delete map[normId];
      await writeAttemptMap(map);
    }
  },

  unlockSession(targetId = 'diary') {
    bioUnlockSession(normalizeTargetId(targetId));
  },

  lockSession(targetId = 'diary') {
    bioLockSession(normalizeTargetId(targetId));
  },

  isSessionUnlocked(targetId = 'diary') {
    return bioIsSessionUnlocked(normalizeTargetId(targetId));
  },
};
