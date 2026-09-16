import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Alert, Linking, Platform } from 'react-native';

/**
 * AudioService - AJANDA Sesli Notlar ve Ses Yönetim Servisi
 *
 * expo-av ve expo-file-system kullanarak:
 * - Mikrofon izin yönetimi
 * - Yüksek kaliteli ses kaydı başlatma ve durdurma
 * - Ses dosyalarını kalıcı doküman dizinine taşıma (FileSystem.documentDirectory)
 * - Sayfa veya ses silindiğinde fiziksel dosya temizliği (zombi dosya engelleme)
 * - Süre formatlama (MM:SS)
 */

const AUDIO_DIR = `${FileSystem.documentDirectory}audio_notes/`;

/**
 * Kalıcı ses dizininin varlığını garanti eder
 */
export const ensureAudioDirectory = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(AUDIO_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
    }
  } catch (error) {
    console.warn('ensureAudioDirectory hatası:', error);
  }
};

/**
 * Mevcut mikrofon izin durumunu kontrol eder
 * @returns {Promise<{ granted: boolean, canAskAgain: boolean }>}
 */
export const getPermissions = async () => {
  try {
    const settings = await Audio.getPermissionsAsync();
    return {
      granted: settings.granted,
      canAskAgain: settings.canAskAgain,
    };
  } catch (error) {
    console.warn('Audio.getPermissionsAsync hatası:', error);
    return { granted: false, canAskAgain: true };
  }
};

/**
 * Mikrofon izni talep eder
 * İzin reddedilmişse kullanıcı dostu bir Alert ile ayarlara yönlendirir.
 * @param {object} [options]
 * @param {boolean} [options.showAlertIfDenied=false]
 * @param {function} [options.t] - Çeviri fonksiyonu
 * @returns {Promise<{ granted: boolean, canAskAgain: boolean }>}
 */
export const requestPermissions = async ({ showAlertIfDenied = false, t } = {}) => {
  try {
    const current = await getPermissions();
    if (current.granted) {
      return { granted: true, canAskAgain: true };
    }

    const requested = await Audio.requestPermissionsAsync();

    if (!requested.granted && showAlertIfDenied) {
      const title = t
        ? t('audio.micPermissionTitle', 'Mikrofon İzni Gerekli')
        : 'Mikrofon İzni Gerekli';
      const message = t
        ? t(
            'audio.micPermissionMessage',
            'Ses kaydı alabilmek için lütfen ayarlardan mikrofon erişimine izin verin.'
          )
        : 'Ses kaydı alabilmek için lütfen ayarlardan mikrofon erişimine izin verin.';
      const cancelText = t ? t('common.cancel', 'Vazgeç') : 'Vazgeç';
      const settingsText = t ? t('reminder.goToSettings', 'Ayarlara Git') : 'Ayarlara Git';

      Alert.alert(title, message, [
        { text: cancelText, style: 'cancel' },
        { text: settingsText, onPress: () => Linking.openSettings().catch(() => {}) },
      ]);
    }

    return {
      granted: requested.granted,
      canAskAgain: requested.canAskAgain,
    };
  } catch (error) {
    console.warn('Audio.requestPermissionsAsync hatası:', error);
    return { granted: false, canAskAgain: true };
  }
};

/**
 * Yeni bir ses kaydı başlatır
 * @param {object} [options]
 * @param {function} [options.t]
 * @param {function} [options.onStatusUpdate] - Kayıt süresi ve seviye dinleyicisi
 * @returns {Promise<{ success: boolean, recording?: Audio.Recording, error?: string }>}
 */
export const startRecording = async ({ t, onStatusUpdate } = {}) => {
  try {
    const { granted } = await requestPermissions({ showAlertIfDenied: true, t });
    if (!granted) {
      return { success: false, error: 'permission_denied' };
    }

    // iOS ve Android için ses modunu kayıt moduna al
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

    if (onStatusUpdate) {
      recording.setOnRecordingStatusUpdate(onStatusUpdate);
      recording.setProgressUpdateInterval(200);
    }

    await recording.startAsync();

    return {
      success: true,
      recording,
    };
  } catch (error) {
    console.warn('startRecording hatası:', error);
    // Ses modunu güvenli varsayılana sıfırla
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (e) {}
    return { success: false, error: error.message };
  }
};

/**
 * Aktif ses kaydını durdurur ve geçici URI ile süreyi döner
 * @param {Audio.Recording} recording
 * @returns {Promise<{ success: boolean, tempUri?: string, durationMs?: number, error?: string }>}
 */
export const stopRecording = async (recording) => {
  if (!recording) {
    return { success: false, error: 'no_recording' };
  }

  try {
    const status = await recording.getStatusAsync();
    const durationMs = status.durationMillis || 0;

    await recording.stopAndUnloadAsync();
    const tempUri = recording.getURI();

    // Kayıt bittikten sonra ses modunu oynatma moduna geri döndür
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    return {
      success: true,
      tempUri,
      durationMs,
    };
  } catch (error) {
    console.warn('stopRecording hatası:', error);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (e) {}
    return { success: false, error: error.message };
  }
};

/**
 * Geçici önbellekteki ses dosyasını kalıcı doküman dizinine kopyalar
 * @param {string} tempUri - Geçici kayıt URI'si
 * @param {string} [pageId='page'] - İlgili sayfa kimliği
 * @returns {Promise<string>} Kalıcı dosya URI'si
 */
export const saveAudioPermanently = async (tempUri, pageId = 'page') => {
  if (!tempUri) return null;

  try {
    await ensureAudioDirectory();

    const cleanPageId = String(pageId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const fileName = `${cleanPageId}_${Date.now()}_${randomSuffix}.m4a`;
    const destUri = `${AUDIO_DIR}${fileName}`;

    await FileSystem.copyAsync({
      from: tempUri,
      to: destUri,
    });

    return destUri;
  } catch (error) {
    console.warn('saveAudioPermanently hatası:', error);
    return tempUri; // Hata durumunda geçici URI fallback olarak korunur
  }
};

/**
 * Tek bir ses dosyasını cihaz hafızasından kalıcı olarak siler
 * @param {string} uri - Silinecek dosya URI'si
 * @returns {Promise<boolean>}
 */
export const deleteAudioFile = async (uri) => {
  if (!uri) return false;

  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    }
    return false;
  } catch (error) {
    console.warn('deleteAudioFile hatası:', error);
    return false;
  }
};

/**
 * Birden fazla ses dosyasını (örn: sayfa silindiğinde veya liste temizlendiğinde) kalıcı olarak siler
 * @param {Array<{ uri: string }|string>} audioNotes - Sesli not nesneleri veya URI dizisi
 * @returns {Promise<number>} Silinen dosya sayısı
 */
export const deleteAudioFiles = async (audioNotes = []) => {
  if (!Array.isArray(audioNotes) || audioNotes.length === 0) {
    return 0;
  }

  let deletedCount = 0;
  for (const item of audioNotes) {
    const uri = typeof item === 'string' ? item : item?.uri;
    if (uri) {
      const ok = await deleteAudioFile(uri);
      if (ok) deletedCount++;
    }
  }
  return deletedCount;
};

/**
 * Milisaniye cinsinden süreyi "MM:SS" formatına dönüştürür
 * @param {number} durationMs
 * @returns {string} Örn: "01:24"
 */
export const formatDuration = (durationMs) => {
  if (!durationMs || isNaN(durationMs) || durationMs <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const paddedMin = String(minutes).padStart(2, '0');
  const paddedSec = String(seconds).padStart(2, '0');

  return `${paddedMin}:${paddedSec}`;
};

export const AudioService = {
  getPermissions,
  requestPermissions,
  startRecording,
  stopRecording,
  saveAudioPermanently,
  deleteAudioFile,
  deleteAudioFiles,
  formatDuration,
};

export default AudioService;
