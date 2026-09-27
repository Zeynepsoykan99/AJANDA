import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useTheme } from '../../context/ThemeContext';
import {
  startRecording,
  stopRecording,
  saveAudioPermanently,
  deleteAudioFile,
  formatDuration,
  ensureAudioDirectory,
  AUDIO_DIR,
} from '../../services/audioService';
import {
  transcribeAudioFile,
  isTranscriptionAvailable,
  supportsLiveRecording,
  startLiveRecognition,
  resolveTranscriptionLanguage,
} from '../../services/transcriptionService';

/**
 * AudioRecorderModal - Sesli Not Kayıt Modalı
 *
 * @param {object} props
 * @param {boolean} props.visible - Modal görünürlüğü
 * @param {string} props.pageId - Aktif sayfanın kimliği
 * @param {function} props.onClose - Modalı kapatma
 * @param {function} props.onSave - (audioNoteData) => void
 * @param {function} [props.onTranscriptReady] - (audioNoteId, transcript, status) => void
 */
export default function AudioRecorderModal({
  visible,
  pageId,
  onClose,
  onSave,
  onTranscriptReady,
}) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  // Durumlar: 'idle' | 'recording' | 'recorded'
  const [recordState, setRecordState] = useState('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewSound, setPreviewSound] = useState(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewPositionMs, setPreviewPositionMs] = useState(0);

  const recordingRef = useRef(null);
  const tempUriRef = useRef(null);
  const durationMsRef = useRef(0);

  // Android canlı tanıma oturumu (expo-speech-recognition kendi kayıt motoruyla)
  const liveSessionRef = useRef(null);
  const liveTranscriptRef = useRef(null);
  const elapsedMsRef = useRef(0);
  const timerRef = useRef(null);

  /**
   * Android'de expo-av, konuşma tanımanın kabul ettiği hiçbir formatta kayıt yapamadığı için
   * (WAV/PCM, MP3, OGG-Vorbis desteklenmiyor) kayıt doğrudan tanıma motoruyla yapılır:
   * tek geçişte hem transkript hem de 16 kHz mono PCM WAV dosyası elde edilir.
   * iOS'ta expo-av LINEARPCM üretebildiği için mevcut dosya tabanlı akış korunur.
   */
  const shouldUseLiveRecognition = () =>
    Platform.OS === 'android' && isTranscriptionAvailable() && supportsLiveRecording();

  const startElapsedTimer = () => {
    const startedAt = Date.now();
    elapsedMsRef.current = 0;
    setElapsedMs(0);
    timerRef.current = setInterval(() => {
      const ms = Date.now() - startedAt;
      elapsedMsRef.current = ms;
      setElapsedMs(ms);
    }, 200);
  };

  const stopElapsedTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Nabız (Pulse) Animasyonu Değerleri
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Animasyonu başlat / durdur
  useEffect(() => {
    if (recordState === 'recording') {
      pulseScale.value = withRepeat(
        withTiming(1.5, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = 1;
      pulseOpacity.value = 0.4;
    }
  }, [recordState, pulseScale, pulseOpacity]);

  // Modal açıldığında veya kapandığında temizlik
  useEffect(() => {
    if (!visible) {
      cleanup();
    }
  }, [visible]);

  // Bileşen kaldırılırsa süre sayacının arkada çalışmaya devam etmesini engelle
  useEffect(() => () => stopElapsedTimer(), []);

  const cleanup = async () => {
    stopElapsedTimer();

    // Aktif canlı tanıma oturumu varsa iptal et
    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.abort();
      } catch (e) {}
      liveSessionRef.current = null;
    }
    liveTranscriptRef.current = null;

    // Aktif kayıt varsa durdur
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {}
      recordingRef.current = null;
    }

    // Önizleme sesi varsa kapat
    if (previewSound) {
      try {
        await previewSound.stopAsync();
        await previewSound.unloadAsync();
      } catch (e) {}
      setPreviewSound(null);
    }

    // Geçici dosya kaydedilmemişse temizle
    if (tempUriRef.current) {
      deleteAudioFile(tempUriRef.current).catch(() => {});
      tempUriRef.current = null;
    }

    setRecordState('idle');
    setElapsedMs(0);
    elapsedMsRef.current = 0;
    setIsPreviewPlaying(false);
    setPreviewPositionMs(0);
    durationMsRef.current = 0;
  };

  // Kayda Başla
  const handleStartRecording = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      liveTranscriptRef.current = null;

      // Android: kayıt + tanıma tek geçişte, tanıma motorunun kendi kayıt yoluyla
      if (shouldUseLiveRecognition()) {
        // Kalici dizin hazir olmazsa kutuphane onbellege yazar ve kayit sonradan kaybolur
        await ensureAudioDirectory();

        const session = await startLiveRecognition({
          language: i18n.language,
          outputDirectory: AUDIO_DIR,
          // Proje konvansiyonu: ${prefix}_${Date.now()}_${random}
          outputFileName: `note_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 6)}.wav`,
          onAutoStop: handleLiveAutoStop,
        });

        if (session.success) {
          liveSessionRef.current = session;
          startElapsedTimer();
          setRecordState('recording');
          return;
        }

        // Canlı tanıma başlatılamadıysa sessizce yutmuyoruz; expo-av yoluna düşüyoruz
        console.warn(
          'Canlı tanıma başlatılamadı, expo-av kaydına geçiliyor:',
          session.error
        );
      }

      const result = await startRecording({
        t,
        onStatusUpdate: (status) => {
          if (status.isRecording) {
            elapsedMsRef.current = status.durationMillis;
            setElapsedMs(status.durationMillis);
          }
        },
      });

      if (result.success && result.recording) {
        recordingRef.current = result.recording;
        setRecordState('recording');
      }
    } catch (error) {
      console.warn('handleStartRecording hatası:', error);
    }
  };

  /**
   * Tanıma motoru kullanıcı durdurmadan kendiliğinden bittiğinde (sessizlik, süre limiti)
   * eldeki kayıt ve transkript korunur, arayüz 'recorded' durumuna geçer.
   */
  const handleLiveAutoStop = (result) => {
    liveSessionRef.current = null;
    stopElapsedTimer();

    if (result?.uri) {
      tempUriRef.current = result.uri;
      liveTranscriptRef.current = result.transcript || null;
      durationMsRef.current = elapsedMsRef.current;
      setRecordState('recorded');
    } else {
      console.warn('Canlı tanıma ses dosyası üretmeden sona erdi:', result?.error);
      setRecordState('idle');
    }
  };

  // Kaydı Durdur
  const handleStopRecording = async () => {
    // Android canlı tanıma oturumu: durdur, dosya yazımını bekle, transkripti al
    if (liveSessionRef.current) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const session = liveSessionRef.current;
        liveSessionRef.current = null;
        const result = await session.stop();
        stopElapsedTimer();

        if (result?.uri) {
          tempUriRef.current = result.uri;
          liveTranscriptRef.current = result.transcript || null;
          durationMsRef.current = elapsedMsRef.current;
          setRecordState('recorded');
        } else {
          console.warn('Canlı tanıma ses dosyası döndürmedi:', result?.error);
          setRecordState('idle');
        }
      } catch (error) {
        console.warn('Canlı tanıma durdurma hatası:', error);
        stopElapsedTimer();
        setRecordState('idle');
      }
      return;
    }

    if (!recordingRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await stopRecording(recordingRef.current);
      recordingRef.current = null;

      if (result.success && result.tempUri) {
        tempUriRef.current = result.tempUri;
        durationMsRef.current = result.durationMs || elapsedMs;
        setRecordState('recorded');
      } else {
        setRecordState('idle');
      }
    } catch (error) {
      console.warn('handleStopRecording hatası:', error);
      setRecordState('idle');
    }
  };

  // Önizlemeyi Oynat / Duraklat
  const handleTogglePreview = async () => {
    if (!tempUriRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (!previewSound) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: tempUriRef.current },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setPreviewPositionMs(status.positionMillis);
              setIsPreviewPlaying(status.isPlaying);
              if (status.didJustFinish) {
                setIsPreviewPlaying(false);
                setPreviewPositionMs(0);
              }
            }
          }
        );
        setPreviewSound(sound);
        setIsPreviewPlaying(true);
      } else {
        if (isPreviewPlaying) {
          await previewSound.pauseAsync();
          setIsPreviewPlaying(false);
        } else {
          await previewSound.playAsync();
          setIsPreviewPlaying(true);
        }
      }
    } catch (error) {
      console.warn('handleTogglePreview hatası:', error);
    }
  };

  // Yeniden Kaydet (Silip baştan başla)
  const handleResetRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    stopElapsedTimer();
    if (liveSessionRef.current) {
      try {
        liveSessionRef.current.abort();
      } catch (e) {}
      liveSessionRef.current = null;
    }
    liveTranscriptRef.current = null;
    elapsedMsRef.current = 0;

    if (previewSound) {
      await previewSound.stopAsync().catch(() => {});
      await previewSound.unloadAsync().catch(() => {});
      setPreviewSound(null);
    }

    if (tempUriRef.current) {
      await deleteAudioFile(tempUriRef.current);
      tempUriRef.current = null;
    }

    setRecordState('idle');
    setElapsedMs(0);
    setIsPreviewPlaying(false);
    setPreviewPositionMs(0);
    durationMsRef.current = 0;
  };

  // Sayfaya Kaydet & Kapat
  const handleSaveToPage = async () => {
    if (!tempUriRef.current) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (previewSound) {
        await previewSound.stopAsync().catch(() => {});
        await previewSound.unloadAsync().catch(() => {});
        setPreviewSound(null);
      }

      // Dosyayı kalıcı doküman alanına taşı
      const saved = await saveAudioPermanently(tempUriRef.current, pageId || 'page');

      const isAvailable = isTranscriptionAvailable();

      // Android canlı tanıma yolunda transkript kayıtla birlikte zaten üretildi
      const liveTranscript = liveTranscriptRef.current;
      const hasLiveTranscript = Boolean(liveTranscript && liveTranscript.trim());

      const newAudioNote = {
        id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        // Veri modeli: yalnizca dosya adi saklanir; tam yol okuma aninda
        // AudioService.resolveAudioUri ile o anki AUDIO_DIR uzerinden kurulur.
        // Boylece iOS'ta uygulama guncellemesi container yolunu degistirse bile
        // kayit bulunabilir kalir.
        fileName: saved?.fileName || null,
        // Kalici tasima basarisiz olduysa dosya onbellekte kalir; tek erisim yolu
        // mutlak URI oldugu icin yalnizca o durumda saklanir.
        uri: saved?.isPersistent ? null : saved?.uri || null,
        durationMs: durationMsRef.current || elapsedMs || 1000,
        createdAt: new Date().toISOString(),
        title: t('audio.defaultTitle', 'Sesli Not'),
        transcript: hasLiveTranscript ? liveTranscript.trim() : null,
        transcriptLanguage: resolveTranscriptionLanguage(i18n.language),
        transcriptStatus: hasLiveTranscript
          ? 'completed'
          : isAvailable
          ? 'pending'
          : null,
      };

      // Geçici URI ref'ini sıfırla ki cleanup silmesin
      tempUriRef.current = null;
      liveTranscriptRef.current = null;

      if (onSave) {
        onSave(newAudioNote);
      }

      onClose && onClose();

      // Arka planda asenkron transkripsiyonu başlat (UI bloklanmaz)
      if (!hasLiveTranscript && isAvailable && onTranscriptReady) {
        transcribeAudioFile(permanentUri, { language: i18n.language })
          .then((res) => {
            if (res.success && res.transcript) {
              onTranscriptReady(newAudioNote.id, res.transcript, 'completed');
            } else {
              onTranscriptReady(newAudioNote.id, null, 'failed');
            }
          })
          .catch((err) => {
            console.warn('Asenkron transkripsiyon hatası:', err);
            onTranscriptReady(newAudioNote.id, null, 'failed');
          });
      }
    } catch (error) {
      console.warn('handleSaveToPage hatası:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: colors.card || '#FFFFFF' },
              ]}
            >
              {/* Başlık ve Kapatma Butonu */}
              <View style={styles.headerRow}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  {t('audio.recordTitle', 'Sesli Not Kaydet')}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={22}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Süre Göstergesi */}
              <View style={styles.timerContainer}>
                <Text style={[styles.timerText, { color: colors.textPrimary }]}>
                  {formatDuration(
                    recordState === 'recorded'
                      ? isPreviewPlaying
                        ? previewPositionMs
                        : durationMsRef.current
                      : elapsedMs
                  )}
                </Text>
                <Text style={[styles.timerSub, { color: colors.textSecondary }]}>
                  {recordState === 'recording'
                    ? t('audio.recording', 'Kaydediliyor...')
                    : recordState === 'recorded'
                    ? t('audio.readyToSave', 'Kayıt hazır')
                    : t('audio.tapToRecord', 'Kayda başlamak için mikrofona dokunun')}
                </Text>
              </View>

              {/* Orta: Mikrofon / Nabız Animasyonu */}
              <View style={styles.micCenterWrapper}>
                {recordState === 'recording' && (
                  <Animated.View
                    style={[
                      styles.pulseCircle,
                      { backgroundColor: colors.accent },
                      pulseAnimatedStyle,
                    ]}
                  />
                )}

                {recordState === 'idle' && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleStartRecording}
                    style={[
                      styles.micBigButton,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <MaterialCommunityIcons name="microphone" size={44} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {recordState === 'recording' && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleStopRecording}
                    style={[styles.micBigButton, { backgroundColor: '#E53935' }]}
                  >
                    <MaterialCommunityIcons name="stop" size={44} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {recordState === 'recorded' && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleTogglePreview}
                    style={[
                      styles.micBigButton,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isPreviewPlaying ? 'pause' : 'play'}
                      size={44}
                      color="#FFFFFF"
                      style={{ marginLeft: isPreviewPlaying ? 0 : 4 }}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Alt: Aksiyon Butonları */}
              <View style={styles.actionsRow}>
                {recordState === 'idle' && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onClose}
                    style={[styles.secondaryBtn, { borderColor: colors.border }]}
                  >
                    <Text
                      style={[styles.secondaryBtnText, { color: colors.textSecondary }]}
                    >
                      {t('common.cancel', 'Vazgeç')}
                    </Text>
                  </TouchableOpacity>
                )}

                {recordState === 'recording' && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleStopRecording}
                    style={[styles.primaryBtn, { backgroundColor: '#E53935' }]}
                  >
                    <MaterialCommunityIcons name="stop-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>
                      {t('audio.stopRecord', 'Kaydı Durdur')}
                    </Text>
                  </TouchableOpacity>
                )}

                {recordState === 'recorded' && (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleResetRecording}
                      style={[styles.secondaryBtn, { borderColor: colors.border }]}
                    >
                      <MaterialCommunityIcons
                        name="refresh"
                        size={18}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.secondaryBtnText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t('audio.reRecord', 'Yeniden')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleSaveToPage}
                      style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                    >
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.primaryBtnText}>
                        {t('audio.saveToPage', 'Sayfaya Ekle')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timerText: {
    fontSize: 36,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  micCenterWrapper: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  micBigButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
