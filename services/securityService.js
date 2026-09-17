import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { unlockSession, lockSession, isSessionUnlocked } from './biometricService';

const SECURE_STORE_PIN_KEY = 'ajanda_diary_pin_v1';
const ASYNC_FALLBACK_PIN_KEY = '@ajanda_diary_pin_secure_v1';

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
 */
export const SecurityService = {
  /**
   * 4 haneli PIN kodunu güvenli alana kaydeder
   * @param {string} pin
   * @param {string} [targetId='diary']
   * @returns {Promise<boolean>}
   */
  async setPin(pin, targetId = 'diary') {
    if (!pin || typeof pin !== 'string') return false;
    const key = `${SECURE_STORE_PIN_KEY}_${targetId}`;
    const fallbackKey = `${ASYNC_FALLBACK_PIN_KEY}_${targetId}`;

    try {
      const secureAvailable = await isSecureStoreAvailable();
      if (secureAvailable) {
        await SecureStore.setItemAsync(key, pin, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      } else {
        await AsyncStorage.setItem(fallbackKey, pin);
      }
      return true;
    } catch (error) {
      console.warn('[SecurityService] setPin error:', error);
      // Fallback to AsyncStorage on failure
      try {
        await AsyncStorage.setItem(fallbackKey, pin);
        return true;
      } catch {
        return false;
      }
    }
  },

  /**
   * Girilen PIN kodunun doğruluğunu kontrol eder
   * @param {string} pin
   * @param {string} [targetId='diary']
   * @returns {Promise<boolean>}
   */
  async verifyPin(pin, targetId = 'diary') {
    if (!pin) return false;
    const key = `${SECURE_STORE_PIN_KEY}_${targetId}`;
    const fallbackKey = `${ASYNC_FALLBACK_PIN_KEY}_${targetId}`;

    try {
      let storedPin = null;
      const secureAvailable = await isSecureStoreAvailable();
      if (secureAvailable) {
        storedPin = await SecureStore.getItemAsync(key);
      }

      if (!storedPin) {
        storedPin = await AsyncStorage.getItem(fallbackKey);
      }

      return storedPin === pin;
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
    const key = `${SECURE_STORE_PIN_KEY}_${targetId}`;
    const fallbackKey = `${ASYNC_FALLBACK_PIN_KEY}_${targetId}`;

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
    const key = `${SECURE_STORE_PIN_KEY}_${targetId}`;
    const fallbackKey = `${ASYNC_FALLBACK_PIN_KEY}_${targetId}`;

    try {
      const secureAvailable = await isSecureStoreAvailable();
      if (secureAvailable) {
        await SecureStore.deleteItemAsync(key);
      }
      await AsyncStorage.removeItem(fallbackKey);
      lockSession(targetId);
      return true;
    } catch (error) {
      console.warn('[SecurityService] removePin error:', error);
      try {
        await AsyncStorage.removeItem(fallbackKey);
        lockSession(targetId);
        return true;
      } catch {
        return false;
      }
    }
  },

  unlockSession,
  lockSession,
  isSessionUnlocked,
};
