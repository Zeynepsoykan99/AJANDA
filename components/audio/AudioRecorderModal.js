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
} from '../../services/audioService';
import {
  transcribeAudioFile,
  isTranscriptionAvailable,
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

  const cleanup = async () => {
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
    setIsPreviewPlaying(false);
    setPreviewPositionMs(0);
    durationMsRef.current = 0;
  };

  // Kayda Başla
  const handleStartRecording = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const result = await startRecording({
        t,
        onStatusUpdate: (status) => {
          if (status.isRecording) {
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

  // Kaydı Durdur
  const handleStopRecording = async () => {
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
      const permanentUri = await saveAudioPermanently(
        tempUriRef.current,
        pageId || 'page'
      );

      const isAvailable = isTranscriptionAvailable();

      const newAudioNote = {
        id: `audio_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        uri: permanentUri,
        durationMs: durationMsRef.current || elapsedMs || 1000,
        createdAt: new Date().toISOString(),
        title: t('audio.defaultTitle', 'Sesli Not'),
        transcript: null,
        transcriptLanguage: resolveTranscriptionLanguage(i18n.language),
        transcriptStatus: isAvailable ? 'pending' : null,
      };

      // Geçici URI ref'ini sıfırla ki cleanup silmesin
      tempUriRef.current = null;

      if (onSave) {
        onSave(newAudioNote);
      }

      onClose && onClose();

      // Arka planda asenkron transkripsiyonu başlat (UI bloklanmaz)
      if (isAvailable && onTranscriptReady) {
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
