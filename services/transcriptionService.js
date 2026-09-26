/**
 * TranscriptionService - AJANDA Sesli Not Transkripsiyon (Speech-to-Text) Servisi
 *
 * Cihaz üzerinde yerel (on-device) ses tanıma motorunu (iOS: SFSpeechRecognizer, Android: SpeechRecognizer)
 * kullanarak sesi metne dönüştürür. Motor yalnızca 16 kHz mono PCM WAV (ayrıca 16 kHz MP3/OGG)
 * girdisini kabul ettiği için tüm kayıt zinciri bu formata göre kurulmuştur.
 *
 * İki çalışma yolu:
 * - Dosya tabanlı tanıma (`transcribeAudioFile`): iOS'ta expo-av LINEARPCM üretebildiği için
 *   kaydedilmiş WAV dosyası sonradan metne dönüştürülür.
 * - Canlı tanıma + persist (`startLiveRecognition`): Android'de expo-av STT-uyumlu hiçbir format
 *   üretemediği için kayıt doğrudan tanıma motoruyla yapılır; tek geçişte hem transkript hem de
 *   16 kHz mono PCM WAV dosyası elde edilir.
 *
 * Güvenli Mimari:
 * - Expo Go veya yerel modül bulunmayan ortamlarda çökmeyi önleyen yalıtım (safe fallback).
 * - Çoklu dil desteği (Türkçe tr-TR, İngilizce en-US, Almanca de-DE vb.).
 * - Zaman aşımı koruması (timeout) ile asılı kalmayan asenkron yaşam döngüsü.
 */

import { Platform } from 'react-native';

// Modülü güvenli şekilde yükle (Expo Go veya unlinked ortamlarda çökme olmaması için)
// NOT: Paketin index'i modül gövdesinde requireNativeModule çağırdığı için, yerel modül
// bulunmayan ortamlarda bu require hata fırlatır. Sabitler de aynı require üzerinden alınır.
let ExpoSpeechRecognitionModule = null;
let AudioEncodingAndroid = null;
try {
  const speechRecognitionModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechRecognitionModule.ExpoSpeechRecognitionModule;
  AudioEncodingAndroid = speechRecognitionModule.AudioEncodingAndroid || null;
} catch (e) {
  ExpoSpeechRecognitionModule = null;
  AudioEncodingAndroid = null;
}

// Kayıt ve tanıma zincirinin tamamı bu örnekleme hızına göre kurulur
// (expo-speech-recognition dosyadan tanıma için 16 kHz mono PCM bekliyor).
const SPEECH_SAMPLE_RATE = 16000;

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
    // Canlı tanımadaki ile aynı kural: final sonuçlar üzerine yazılmaz, biriktirilir.
    let finalizedTranscript = '';
    let interimTranscript = '';
    const subscriptions = [];
    const composeTranscript = () =>
      `${finalizedTranscript} ${interimTranscript}`.replace(/\s+/g, ' ').trim();

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
      if (composeTranscript().length > 0) {
        finish({
          success: true,
          transcript: composeTranscript(),
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
          const text = event?.results?.[0]?.transcript || '';

          if (event?.isFinal) {
            if (text) {
              finalizedTranscript = `${finalizedTranscript} ${text}`.trim();
            }
            interimTranscript = '';
          } else {
            interimTranscript = text;
          }

          if (event?.isFinal) {
            finish({
              success: true,
              transcript: composeTranscript(),
              language: targetLang,
            });
          }
        });
        subscriptions.push(resultSub);

        // 2. Hata dinleyicisi
        const errorSub = ExpoSpeechRecognitionModule.addListener('error', (event) => {
          console.warn('SpeechRecognition hata olayı:', event?.error);
          if (composeTranscript().length > 0) {
            finish({
              success: true,
              transcript: composeTranscript(),
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
          if (composeTranscript().length > 0) {
            finish({
              success: true,
              transcript: composeTranscript(),
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

      // Tanıma motorunu dosya kaynağıyla başlat.
      // sampleRate/audioEncoding, kaydın gerçek formatıyla (16 kHz mono PCM) eşleşmek
      // zorunda; eşleşmezse motor 'audio-capture' hatası veriyor veya boş sonuç dönüyor.
      ExpoSpeechRecognitionModule.start({
        lang: targetLang,
        addsPunctuation: true,
        continuous: false,
        // Uzun kayıtlarda ağ tabanlı tanıma kesildiği için iOS'ta cihaz üzeri tanıma tercih edilir
        requiresOnDeviceRecognition: Platform.OS === 'ios',
        audioSource: {
          uri: fileUri,
          sampleRate: SPEECH_SAMPLE_RATE,
          audioChannels: 1,
          ...(AudioEncodingAndroid
            ? { audioEncoding: AudioEncodingAndroid.ENCODING_PCM_16BIT }
            : {}),
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
 * Cihazın canlı tanıma sırasında sesi dosyaya kaydedebilmesini (persist) destekleyip
 * desteklemediğini bildirir. Bu özellik Android 13+ ve iOS gerektirir.
 * @returns {boolean}
 */
export const supportsLiveRecording = () => {
  if (!ExpoSpeechRecognitionModule) return false;
  try {
    return typeof ExpoSpeechRecognitionModule.supportsRecording === 'function'
      ? Boolean(ExpoSpeechRecognitionModule.supportsRecording())
      : false;
  } catch (error) {
    console.warn('supportsLiveRecording kontrol hatası:', error);
    return false;
  }
};

/**
 * Canlı mikrofon tanıması başlatır ve aynı anda sesi WAV dosyasına kaydeder.
 *
 * Android'de expo-av hiçbir STT-uyumlu format üretemediği için kayıt bu yolla yapılır:
 * tek geçişte hem transkript hem de 16 kHz mono PCM WAV dosyası elde edilir.
 *
 * @param {object} [options]
 * @param {string} [options.language='tr-TR'] - i18n dil kodu veya BCP-47 kodu
 * @param {string} [options.outputFileName] - Kaydedilecek dosya adı (ör. 'note_123.wav')
 * @param {function} [options.onPartialTranscript] - (text) => void, canlı ara sonuçlar
 * @param {function} [options.onAutoStop] - Motor kendiliğinden durursa çağrılır
 * @returns {Promise<{ success: boolean, stop?: function, abort?: function, error?: string, isUnavailable?: boolean }>}
 */
export const startLiveRecognition = async ({
  language = 'tr-TR',
  outputFileName,
  onPartialTranscript,
  onAutoStop,
} = {}) => {
  if (!ExpoSpeechRecognitionModule || !isTranscriptionAvailable()) {
    return { success: false, isUnavailable: true, error: 'transcription_not_available' };
  }

  if (!supportsLiveRecording()) {
    return { success: false, isUnavailable: true, error: 'recording_not_supported' };
  }

  const permission = await requestTranscriptionPermissions();
  if (!permission.granted) {
    return { success: false, error: 'permission_denied' };
  }

  const targetLang = resolveTranscriptionLanguage(language);

  const subscriptions = [];
  // Motor `continuous` modda BİRDEN FAZLA final sonuç yayar ve her olay yalnızca
  // o segmentin metnini taşır (bkz. paket README'si: "multiple final results will
  // likely be returned so you'll need to concatenate previous final results").
  // Bu yüzden final sonuçlar biriktirilir; ara sonuç yalnızca o anki segmenti temsil eder.
  let finalizedTranscript = '';
  let interimTranscript = '';
  let audioUri = null;
  let recognitionError = null;
  let endReceived = false;
  let audioEndReceived = false;
  let isFinished = false;
  let pendingResult = null;
  let resolveStop = null;
  let stopTimer = null;

  const removeListeners = () => {
    subscriptions.forEach((sub) => {
      try {
        if (typeof sub?.remove === 'function') sub.remove();
      } catch (e) {}
    });
    subscriptions.length = 0;
  };

  // Biriken final metinle o anki ara segmenti birleştirir
  const composeTranscript = () =>
    `${finalizedTranscript} ${interimTranscript}`.replace(/\s+/g, ' ').trim();

  const buildResult = () => ({
    success: true,
    transcript: composeTranscript(),
    uri: audioUri,
    language: targetLang,
    error: recognitionError,
  });

  const settle = () => {
    if (isFinished) return;
    isFinished = true;
    if (stopTimer) clearTimeout(stopTimer);
    removeListeners();

    const result = buildResult();
    if (resolveStop) {
      resolveStop(result);
    } else {
      // Motor kullanıcı durdurmadan kendiliğinden bitti (sessizlik, süre limiti vb.)
      pendingResult = result;
      if (onAutoStop) onAutoStop(result);
    }
  };

  const maybeSettle = () => {
    if (endReceived && audioEndReceived) settle();
  };

  try {
    if (typeof ExpoSpeechRecognitionModule.addListener === 'function') {
      subscriptions.push(
        ExpoSpeechRecognitionModule.addListener('result', (event) => {
          const text = event?.results?.[0]?.transcript || '';

          if (event?.isFinal) {
            // Segment kesinleşti: üzerine yazmak yerine biriktir
            if (text) {
              finalizedTranscript = `${finalizedTranscript} ${text}`.trim();
            }
            interimTranscript = '';
          } else {
            // Ara sonuç yalnızca o anki segmenti temsil eder, biriktirilmez
            interimTranscript = text;
          }

          if (onPartialTranscript) onPartialTranscript(composeTranscript());
        })
      );

      subscriptions.push(
        ExpoSpeechRecognitionModule.addListener('error', (event) => {
          // Hata yutulmuyor: kaydedilip sonuçla birlikte çağırana bildiriliyor
          console.warn('Canlı tanıma hata olayı:', event?.error, event?.message);
          recognitionError = event?.error || 'recognition_failed';
        })
      );

      subscriptions.push(
        ExpoSpeechRecognitionModule.addListener('audioend', (event) => {
          audioUri = event?.uri || audioUri;
          audioEndReceived = true;
          maybeSettle();
        })
      );

      subscriptions.push(
        ExpoSpeechRecognitionModule.addListener('end', () => {
          endReceived = true;
          maybeSettle();
        })
      );
    }

    ExpoSpeechRecognitionModule.start({
      lang: targetLang,
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      // Uzun kayıtlarda ağ tabanlı tanıma kesilebildiği için iOS'ta cihaz üzeri tanıma tercih edilir
      requiresOnDeviceRecognition: Platform.OS === 'ios',
      recordingOptions: {
        persist: true,
        ...(outputFileName ? { outputFileName } : {}),
        // Aşağıdaki iki alan yalnızca iOS'ta geçerli; Android zaten 16 kHz mono PCM üretiyor
        outputSampleRate: SPEECH_SAMPLE_RATE,
        outputEncoding: 'pcmFormatInt16',
      },
    });
  } catch (startError) {
    console.warn('startLiveRecognition start hatası:', startError);
    removeListeners();
    return { success: false, error: startError.message || 'start_failed' };
  }

  return {
    success: true,
    /**
     * Kaydı ve tanımayı durdurur, dosya yazımının bitmesini bekler.
     * @returns {Promise<{ success, transcript, uri, language, error }>}
     */
    stop: () =>
      new Promise((resolve) => {
        if (pendingResult) {
          resolve(pendingResult);
          return;
        }
        if (isFinished) {
          resolve(buildResult());
          return;
        }

        resolveStop = resolve;

        // Güvenlik zamanlayıcısı: 'audioend'/'end' gelmezse asılı kalmayı engeller
        stopTimer = setTimeout(() => {
          if (isFinished) return;
          console.warn('Canlı tanıma durdurma zaman aşımı; eldeki sonuçla devam ediliyor.');
          isFinished = true;
          removeListeners();
          resolve(buildResult());
        }, 8000);

        try {
          ExpoSpeechRecognitionModule.stop();
        } catch (e) {
          console.warn('Canlı tanıma stop hatası:', e);
        }
      }),

    /**
     * Kaydı iptal eder (sonuç beklenmez).
     */
    abort: () => {
      if (stopTimer) clearTimeout(stopTimer);
      isFinished = true;
      removeListeners();
      try {
        if (ExpoSpeechRecognitionModule?.abort) ExpoSpeechRecognitionModule.abort();
      } catch (e) {}
    },
  };
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
  supportsLiveRecording,
  requestTranscriptionPermissions,
  transcribeAudioFile,
  startLiveRecognition,
  resolveTranscriptionLanguage,
  copyTextToClipboard,
};

export default TranscriptionService;
