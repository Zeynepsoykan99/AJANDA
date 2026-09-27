import { Audio } from 'expo-av';
// SDK 54'te 'expo-file-system' ana girisi yeni File/Directory API'sini yayiyor;
// documentDirectory sabiti export EDILMIYOR ve eski metotlar calisma aninda hata
// firlatiyor. Legacy giris bu metotlari saglar ve native FileSystemLegacyModule
// SDK 54 ile birlikte paketlenir.
import * as FileSystem from 'expo-file-system/legacy';
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

export const AUDIO_DIR = `${FileSystem.documentDirectory}audio_notes/`;

/**
 * Konuşma tanıma (STT) ile uyumlu kayıt ayarları.
 *
 * iOS: `expo-speech-recognition` dosyadan tanıma için 16 kHz mono PCM WAV bekliyor.
 * expo-av iOS'ta LINEARPCM'i desteklediği için bu format doğrudan üretilebiliyor.
 *
 * Android: expo-av hiçbir STT-uyumlu format üretemiyor (`AndroidOutputFormat` içinde
 * WAV/PCM yok, `AndroidAudioEncoder` içinde PCM/MP3/Vorbis yok). Bu yüzden Android'de
 * kayıt + tanıma `expo-speech-recognition`ın kendi motoruyla (canlı tanıma + persist)
 * yapılır; buradaki AAC/.m4a ayarları yalnızca o motorun kullanılamadığı yedek yolda
 * (Expo Go veya Android 12 ve altı) devreye girer.
 */
export const SPEECH_RECORDING_OPTIONS = {
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.MAX,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

/**
 * Bir deger (mutlak URI veya dosya adi) icinden yalnizca dosya adini cikarir.
 * Sorgu parametresi ve fragment yok sayilir.
 * @param {string} value
 * @returns {string}
 */
export const getAudioFileName = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const withoutQuery = raw.split('?')[0].split('#')[0];
  const segments = withoutQuery.split('/');
  return segments[segments.length - 1] || '';
};

/**
 * Sesli notun O ANKI cihazdaki tam dosya yolunu uretir.
 *
 * Veri modelinde yalnizca `fileName` saklanir. Tam yol her okumada
 * `AUDIO_DIR` (yani o anki `documentDirectory`) ile yeniden kurulur.
 * iOS'ta uygulama guncellemesinde container UUID'si degisse bile dogru yol
 * olusur; mutlak URI saklansaydi eski UUID'ye isaret edip bozulurdu.
 *
 * Eski kayitlar mutlak `uri` tuttugu icin geriye donuk olarak onun dosya adi
 * kullanilir.
 *
 * @param {{ fileName?: string, uri?: string }|string} audioNote
 * @returns {string|null}
 */
export const resolveAudioUri = (audioNote) => {
  if (!audioNote) return null;
  const source =
    typeof audioNote === 'string' ? audioNote : audioNote.fileName || audioNote.uri;
  const fileName = getAudioFileName(source);
  if (!fileName) return null;
  return `${AUDIO_DIR}${fileName}`;
};

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
    // Bu basarisiz olursa kayitlar kalici dizine yazilamaz; sessiz kalmamali
    console.error('ensureAudioDirectory hatası, kalıcı ses dizini hazırlanamadı:', AUDIO_DIR, error);
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
    await recording.prepareToRecordAsync(SPEECH_RECORDING_OPTIONS);

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
 * Bir dosya URI'sinden uzantiyi (nokta dahil) cikarir.
 * Sorgu parametresi veya fragment varsa yok sayilir. Bulunamazsa .m4a varsayilir.
 * @param {string} uri
 * @returns {string}
 */
const getFileExtension = (uri) => {
  const match = /\.([a-zA-Z0-9]+)(?:[?#].*)?$/.exec(String(uri || ''));
  return match ? `.${match[1].toLowerCase()}` : '.m4a';
};

/**
 * Geçici önbellekteki ses dosyasını kalıcı doküman dizinine kopyalar
 * @param {string} tempUri - Geçici kayıt URI'si
 * @param {string} [pageId='page'] - İlgili sayfa kimliği
 * @returns {Promise<{ fileName: string|null, uri: string|null, isPersistent: boolean }>}
 */
export const saveAudioPermanently = async (tempUri, pageId = 'page') => {
  if (!tempUri) return { fileName: null, uri: null, isPersistent: false };

  // Canli tanima yolunda dosya zaten dogrudan kalici dizine yaziliyor.
  // Yeniden kopyalamak ayni sesin ikinci bir kopyasini birakirdi.
  if (String(tempUri).startsWith(AUDIO_DIR)) {
    return { fileName: getAudioFileName(tempUri), uri: tempUri, isPersistent: true };
  }

  try {
    await ensureAudioDirectory();

    const cleanPageId = String(pageId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    // Uzanti kaynak dosyadan turetilir: kayitlar artik platforma gore .wav da
    // olabiliyor, sabit .m4a yazmak dosyayi yanlis etiketliyordu.
    const fileName = `${cleanPageId}_${Date.now()}_${randomSuffix}${getFileExtension(tempUri)}`;
    const destUri = `${AUDIO_DIR}${fileName}`;

    await FileSystem.copyAsync({
      from: tempUri,
      to: destUri,
    });

    return { fileName, uri: destUri, isPersistent: true };
  } catch (error) {
    // KRITIK: Buraya dusuldugunde kayit kalici dizine TASINAMAMIS demektir ve
    // donen URI gecici (cache) bir dosyayi isaret eder. Isletim sistemi onbellegi
    // bosalttiginda ses kaybolur. Sessiz kalmamasi icin error seviyesinde loglanir.
    console.error(
      'saveAudioPermanently BASARISIZ: ses kalıcı dizine taşınamadı, geçici URI kullanılıyor.',
      { tempUri, audioDir: AUDIO_DIR, error }
    );
    // isPersistent=false: cagiran taraf mutlak URI'yi yedek olarak saklar,
    // cunku dosya kalici dizinde DEGIL, gecici onbellekte duruyor.
    return { fileName: null, uri: tempUri, isPersistent: false };
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
    const uri = typeof item === 'string' ? item : resolveAudioUri(item);
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
  getAudioFileName,
  resolveAudioUri,
  deleteAudioFile,
  deleteAudioFiles,
  formatDuration,
};

export default AudioService;
