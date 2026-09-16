import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { formatDuration } from '../../services/audioService';

/**
 * AudioNotePlayer - Sayfa İçi Sesli Not Oynatıcı Kartı
 *
 * @param {object} props
 * @param {object} props.audioNote - { id, uri, durationMs, createdAt, title }
 * @param {function} props.onDelete - (audioNote) => void
 * @param {string} [props.activeAudioId] - Şu anda çalan ses kaydının kimliği (aynı anda tek çalma için)
 * @param {function} [props.onPlayStart] - (id) => void
 * @param {object} [props.style] - Ek konteyner stili
 */
export default function AudioNotePlayer({
  audioNote,
  onDelete,
  activeAudioId,
  onPlayStart,
  style,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(audioNote?.durationMs || 0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [barWidth, setBarWidth] = useState(160);

  const isSeekingRef = useRef(false);

  // Başka bir ses çalmaya başladıysa bu sesi duraklat
  useEffect(() => {
    if (activeAudioId && activeAudioId !== audioNote?.id && isPlaying && sound) {
      sound.pauseAsync().catch(() => {});
      setIsPlaying(false);
    }
  }, [activeAudioId, audioNote?.id, isPlaying, sound]);

  // Ses dosyasını yükle
  const loadSound = useCallback(async () => {
    if (!audioNote?.uri) return null;

    try {
      // Oynatma modunu garantiye al
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri: audioNote.uri },
        { shouldPlay: false, progressUpdateIntervalMillis: 100 },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoaded(true);

      if (status.isLoaded && status.durationMillis) {
        setDurationMs(status.durationMillis);
      }

      return newSound;
    } catch (error) {
      console.warn('Ses yüklenirken hata:', error);
      return null;
    }
  }, [audioNote?.uri]);

  // Oynatma durum güncellemeleri
  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.warn(`Oynatma hatası: ${status.error}`);
      }
      return;
    }

    if (!isSeekingRef.current) {
      setPositionMs(status.positionMillis);
    }

    if (status.durationMillis && status.durationMillis !== durationMs) {
      setDurationMs(status.durationMillis);
    }

    setIsPlaying(status.isPlaying);

    // Ses sona ulaştığında başa dön
    if (status.didJustFinish && !status.isLooping) {
      setIsPlaying(false);
      setPositionMs(0);
      sound?.setPositionAsync(0).catch(() => {});
    }
  };

  // Ses unmount olduğunda belleği temizle
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  // Oynat / Duraklat
  const handleTogglePlay = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let currentSound = sound;
      if (!currentSound || !isLoaded) {
        currentSound = await loadSound();
      }

      if (!currentSound) return;

      if (isPlaying) {
        await currentSound.pauseAsync();
        setIsPlaying(false);
      } else {
        if (onPlayStart) {
          onPlayStart(audioNote.id);
        }
        await currentSound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.warn('Oynatma/Durdurma hatası:', error);
    }
  };

  // İlerleme çubuğuna tıklama / sarma (Seek)
  const handleSeekTouch = async (event) => {
    if (!durationMs || barWidth <= 0) return;

    try {
      const touchX = Math.max(0, Math.min(event.nativeEvent.locationX, barWidth));
      const percentage = touchX / barWidth;
      const targetMs = Math.round(percentage * durationMs);

      setPositionMs(targetMs);

      let currentSound = sound;
      if (!currentSound) {
        currentSound = await loadSound();
      }

      if (currentSound) {
        await currentSound.setPositionAsync(targetMs);
      }
    } catch (error) {
      console.warn('Sarma hatası:', error);
    }
  };

  // Kaydı Silme
  const handleDeletePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const message = t(
      'audio.deleteConfirmMessage',
      'Bu ses kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
    );

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        if (sound) {
          sound.stopAsync().catch(() => {});
          sound.unloadAsync().catch(() => {});
        }
        onDelete && onDelete(audioNote);
      }
    } else {
      Alert.alert(
        t('audio.deleteConfirmTitle', 'Ses Kaydını Sil'),
        message,
        [
          { text: t('common.cancel', 'Vazgeç'), style: 'cancel' },
          {
            text: t('common.delete', 'Sil'),
            style: 'destructive',
            onPress: () => {
              if (sound) {
                sound.stopAsync().catch(() => {});
                sound.unloadAsync().catch(() => {});
              }
              onDelete && onDelete(audioNote);
            },
          },
        ]
      );
    }
  };

  // İlerleme yüzdesi
  const progressRatio = durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card || '#FFFFFF',
          borderColor: colors.border || '#E0E0E0',
        },
        style,
      ]}
      // Dokunmaların tuvale veya alt katmanlara sızmasını engelleyen izolasyon
      pointerEvents="auto"
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
    >
      {/* Sol: Play / Pause Butonu */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleTogglePlay}
        style={[styles.playButton, { backgroundColor: colors.accent + '15' }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialCommunityIcons
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={colors.accent}
          style={{ marginLeft: isPlaying ? 0 : 2 }}
        />
      </TouchableOpacity>

      {/* Orta: Başlık, İlerleme Çubuğu ve Süre */}
      <View style={styles.centerContainer}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="microphone" size={14} color={colors.accent} />
          <Text
            style={[styles.titleText, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {audioNote.title || t('audio.defaultTitle', 'Sesli Not')}
          </Text>
        </View>

        {/* İlerleme Çubuğu (Scrubbable Progress Bar) */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleSeekTouch}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          style={styles.progressBarWrapper}
          hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
        >
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: colors.border || '#E0E0E0' },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressRatio * 100}%`,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          </View>
        </TouchableOpacity>

        {/* Süre Bilgisi (Geçen / Toplam) */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatDuration(positionMs)}
          </Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatDuration(durationMs)}
          </Text>
        </View>
      </View>

      {/* Sağ: Silme Butonu */}
      {onDelete && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleDeletePress}
          style={styles.deleteButton}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#E53935" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 4,
    // Hafif gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  centerContainer: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarWrapper: {
    height: 14,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: '#FFEbee',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
