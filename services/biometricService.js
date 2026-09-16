/**
 * AJANDA - Biyometrik Güvenlik Servisi (Face ID / Touch ID / Cihaz Parolası)
 * expo-local-authentication kullanarak günlük ve defterleri yerel donanım güvenliğiyle korur.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

// Oturum bazlı açık kilitler (sayfa geçişlerinde tekrar tekrar sormamak için in-memory tutulur)
const unlockedSessions = new Set();

/**
 * Cihazın biyometrik veya PIN/parola güvenliği destekleyip desteklemediğini kontrol eder.
 * @returns {Promise<{ hasHardware: boolean, isEnrolled: boolean, available: boolean }>}
 */
export const checkBiometricsAvailability = async () => {
  try {
    if (Platform.OS === 'web') {
      return { hasHardware: false, isEnrolled: false, available: false };
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    return {
      hasHardware,
      isEnrolled,
      available: hasHardware && isEnrolled,
    };
  } catch (error) {
    console.warn('[BiometricService] Güvenlik donanımı kontrol edilirken hata:', error);
    return { hasHardware: false, isEnrolled: false, available: false };
  }
};

/**
 * Cihazın desteklediği birincil biyometrik türünü ve uygun UI ikonunu döndürür.
 * @returns {Promise<{ type: 'face'|'fingerprint'|'iris'|'passcode'|'none', label: string, icon: string }>}
 */
export const getBiometricTypeInfo = async () => {
  try {
    if (Platform.OS === 'web') {
      return { type: 'none', label: 'Cihaz Kilidi', icon: 'shield-lock-outline' };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return {
        type: 'face',
        label: Platform.OS === 'ios' ? 'Face ID' : 'Yüz Tanıma',
        icon: 'face-recognition',
      };
    }

    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return {
        type: 'fingerprint',
        label: Platform.OS === 'ios' ? 'Touch ID' : 'Parmak İzi',
        icon: 'fingerprint',
      };
    }

    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return {
        type: 'iris',
        label: 'İris Tanıma',
        icon: 'eye-outline',
      };
    }

    return {
      type: 'passcode',
      label: 'Cihaz Parolası',
      icon: 'lock-outline',
    };
  } catch (error) {
    console.warn('[BiometricService] Biyometri türü alınırken hata:', error);
    return { type: 'passcode', label: 'Cihaz Parolası', icon: 'lock-outline' };
  }
};

/**
 * Biyometrik kimlik doğrulamayı (veya cihaz PIN/parola yedeğini) tetikler.
 *
 * @param {object} options
 * @param {string} options.promptMessage Kullanıcıya gösterilecek başlık/sebep
 * @param {string} options.fallbackLabel Alternatif şifre butonu etiketi
 * @param {string} options.cancelLabel İptal butonu etiketi
 * @returns {Promise<{ success: boolean, error?: string, warning?: string }>}
 */
export const authenticateWithBiometrics = async ({
  promptMessage = 'Kimliğinizi Doğrulayın',
  fallbackLabel = 'Cihaz Parolasını Kullan',
  cancelLabel = 'Vazgeç',
} = {}) => {
  try {
    if (Platform.OS === 'web') {
      // Web ortamında geliştirici/simülatör onayı
      return { success: true };
    }

    const { available } = await checkBiometricsAvailability();

    if (!available) {
      // Donanım veya kayıtlı biyometri yoksa, sistem yine de cihaz PIN'iyle denesin
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel,
        cancelLabel,
        disableDeviceFallback: false,
      });
      return { success: !!result.success, error: result.error };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel,
      cancelLabel,
      disableDeviceFallback: false, // Biyometrik başarısız olursa sistem PIN/desen koduna izin ver
    });

    return {
      success: !!result.success,
      error: result.error,
    };
  } catch (error) {
    console.warn('[BiometricService] Doğrulama hatası:', error);
    return { success: false, error: error?.message || 'auth_failed' };
  }
};

// ─── Oturum Yönetimi (In-Memory Unlocked Sessions) ───────────────────

/**
 * Belirli bir defter veya günlüğün kilidini oturum süresince açık olarak işaretler.
 * @param {string} targetId 'diary' veya notebookId
 */
export const unlockSession = (targetId) => {
  if (targetId) unlockedSessions.add(String(targetId));
};

/**
 * Belirli bir defter veya günlüğün oturum kilidini kaldırır (tekrar kilitler).
 * @param {string} targetId 'diary' veya notebookId
 */
export const lockSession = (targetId) => {
  if (targetId) unlockedSessions.delete(String(targetId));
};

/**
 * Belirli bir defter veya günlüğün bu oturumda kilidi açılmış mı kontrol eder.
 * @param {string} targetId 'diary' veya notebookId
 * @returns {boolean}
 */
export const isSessionUnlocked = (targetId) => {
  if (!targetId) return false;
  return unlockedSessions.has(String(targetId));
};

/**
 * Tüm oturum kilitlerini sıfırlar.
 */
export const clearAllUnlockedSessions = () => {
  unlockedSessions.clear();
};
