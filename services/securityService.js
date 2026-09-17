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
