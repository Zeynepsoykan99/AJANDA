/**
 * TranscriptionService - AJANDA Sesli Not Transkripsiyon (Speech-to-Text) Servisi
 *
 * Cihaz üzerinde yerel (on-device) ses tanıma motorunu (iOS: SFSpeechRecognizer, Android: SpeechRecognizer)
 * kullanarak kaydedilen .m4a ses dosyalarını metne dönüştürür.
 *
 * Güvenli Mimari:
 * - Expo Go veya yerel modül bulunmayan ortamlarda çökmeyi önleyen yalıtım (safe fallback).
 * - Çoklu dil desteği (Türkçe tr-TR, İngilizce en-US, Almanca de-DE vb.).
 * - Zaman aşımı koruması (timeout) ile asılı kalmayan asenkron yaşam döngüsü.
 */

import { Platform } from 'react-native';

// Modülü güvenli şekilde yükle (Expo Go veya unlinked ortamlarda çökme olmaması için)
let ExpoSpeechRecognitionModule = null;
try {
  const speechRecognitionModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechRecognitionModule.ExpoSpeechRecognitionModule;
} catch (e) {
  ExpoSpeechRecognitionModule = null;
}

// Clipboard modülünü güvenli yükle
let ExpoClipboard = null;
try {
  ExpoClipboard = require('expo-clipboard');
} catch (e) {
  ExpoClipboard = null;
}

/**
 * i18n dil kodunu BCP-47 bölgesel ses tanıma dil koduna dönüştürür
 * @param {string} lang - 'tr' | 'en' | 'de' | 'es' | 'fr'
 * @returns {string} - 'tr-TR' | 'en-US' vb.
 */
export const resolveTranscriptionLanguage = (lang = 'tr') => {
  if (!lang || typeof lang !== 'string') return 'tr-TR';
  const clean = lang.toLowerCase().trim();

  if (clean.startsWith('tr')) return 'tr-TR';
  if (clean.startsWith('en')) return 'en-US';
  if (clean.startsWith('de')) return 'de-DE';
  if (clean.startsWith('es')) return 'es-ES';
  if (clean.startsWith('fr')) return 'fr-FR';

  return 'tr-TR';
};

/**
 * Cihazda ses tanıma desteğinin aktif olup olmadığını kontrol eder
 * @returns {boolean}
 */
export const isTranscriptionAvailable = () => {
  if (!ExpoSpeechRecognitionModule) return false;
  try {
    return typeof ExpoSpeechRecognitionModule.isRecognitionAvailable === 'function'
      ? Boolean(ExpoSpeechRecognitionModule.isRecognitionAvailable())
      : true;
  } catch (error) {
    console.warn('isTranscriptionAvailable kontrol hatası:', error);
    return false;
  }
};

/**
 * Ses tanıma izni talep eder
 * @returns {Promise<{ granted: boolean, canAskAgain: boolean }>}
 */
export const requestTranscriptionPermissions = async () => {
  if (!ExpoSpeechRecognitionModule) {
    return { granted: false, canAskAgain: false };
  }

  try {
    if (typeof ExpoSpeechRecognitionModule.requestPermissionsAsync === 'function') {
      const response = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return {
        granted: response.granted,
        canAskAgain: response.canAskAgain,
      };
    }
    return { granted: true, canAskAgain: true };
  } catch (error) {
    console.warn('requestTranscriptionPermissions hatası:', error);
    return { granted: false, canAskAgain: false };
  }
};

/**
 * Kaydedilen yerel ses dosyasını metne dönüştürür (Speech-to-Text)
 *
 * @param {string} fileUri - Kaydedilmiş ses dosyasının kalıcı URI'si
 * @param {object} [options]
 * @param {string} [options.language='tr-TR'] - Transkripsiyon dili
 * @param {number} [options.timeoutMs=20000] - Maksimum bekleme süresi
 * @returns {Promise<{ success: boolean, transcript?: string, language?: string, error?: string, isUnavailable?: boolean }>}
 */
export const transcribeAudioFile = async (
  fileUri,
  { language = 'tr-TR', timeoutMs = 20000 } = {}
) => {
  if (!fileUri) {
    return { success: false, error: 'no_file_uri' };
  }

  // Yerel ses tanıma modülü mevcut mu?
  if (!ExpoSpeechRecognitionModule || !isTranscriptionAvailable()) {
    return {
      success: false,
      isUnavailable: true,
      error: 'transcription_not_available',
    };
  }

  const targetLang = resolveTranscriptionLanguage(language);

  return new Promise((resolve) => {
    let isSettled = false;
    let finalTranscript = '';
    const subscriptions = [];

    const cleanup = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
      subscriptions.forEach((sub) => {
        try {
          if (typeof sub?.remove === 'function') {
            sub.remove();
          }
        } catch (e) {}
      });
      subscriptions.length = 0;

      try {
        if (ExpoSpeechRecognitionModule?.abort) {
          ExpoSpeechRecognitionModule.abort();
        }
      } catch (e) {}
    };

    const finish = (result) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      resolve(result);
    };

    // Zaman aşımı koruması (asılı kalmayı engeller)
    const timeoutTimer = setTimeout(() => {
      if (finalTranscript.trim().length > 0) {
        finish({
          success: true,
          transcript: finalTranscript.trim(),
          language: targetLang,
        });
      } else {
        finish({
          success: false,
          error: 'timeout',
        });
      }
    }, timeoutMs);

    try {
      // 1. Sonuç dinleyicisi
      if (typeof ExpoSpeechRecognitionModule.addListener === 'function') {
        const resultSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
          if (event?.results && event.results.length > 0) {
            const bestResult = event.results[0]?.transcript || '';
            if (bestResult) {
              finalTranscript = bestResult;
            }
          }

          if (event?.isFinal) {
            finish({
              success: true,
              transcript: finalTranscript.trim(),
              language: targetLang,
            });
          }
        });
        subscriptions.push(resultSub);

        // 2. Hata dinleyicisi
        const errorSub = ExpoSpeechRecognitionModule.addListener('error', (event) => {
          console.warn('SpeechRecognition hata olayı:', event?.error);
          if (finalTranscript.trim().length > 0) {
            finish({
              success: true,
              transcript: finalTranscript.trim(),
              language: targetLang,
            });
          } else {
            finish({
              success: false,
              error: event?.error || 'recognition_failed',
            });
          }
        });
        subscriptions.push(errorSub);

        // 3. Bitiş dinleyicisi
        const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
          if (finalTranscript.trim().length > 0) {
            finish({
              success: true,
              transcript: finalTranscript.trim(),
              language: targetLang,
            });
          } else {
            finish({
              success: false,
              error: 'no_speech_detected',
            });
          }
        });
        subscriptions.push(endSub);
      }

      // Tanıma motorunu dosya kaynağıyla başlat
      ExpoSpeechRecognitionModule.start({
        lang: targetLang,
        addsPunctuation: true,
        continuous: false,
        audioSource: {
          uri: fileUri,
          sampleRate: 44100,
          audioChannels: 1,
        },
      });
    } catch (startError) {
      console.warn('ExpoSpeechRecognition start hatası:', startError);
      finish({
        success: false,
        error: startError.message || 'start_failed',
      });
    }
  });
};

/**
 * Metni cihaz panosuna kopyalar (expo-clipboard ve fallback ile)
 * @param {string} text - Kopyalanacak metin
 * @returns {Promise<boolean>}
 */
export const copyTextToClipboard = async (text) => {
  if (!text || typeof text !== 'string') return false;

  try {
    if (ExpoClipboard?.setStringAsync) {
      await ExpoClipboard.setStringAsync(text);
      return true;
    }

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    return false;
  } catch (error) {
    console.warn('copyTextToClipboard hatası:', error);
    return false;
  }
};

export const TranscriptionService = {
  isTranscriptionAvailable,
  requestTranscriptionPermissions,
  transcribeAudioFile,
  resolveTranscriptionLanguage,
  copyTextToClipboard,
};

export default TranscriptionService;
