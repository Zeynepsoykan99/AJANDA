import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import AudioNotePlayer from './AudioNotePlayer';

/**
 * AudioNotesDeck - Sayfa Üzerindeki Sesli Notları Toplu Gösteren Katlanabilir Panel
 *
 * @param {object} props
 * @param {Array<object>} props.audioNotes - [{ id, uri, durationMs, createdAt, title }]
 * @param {function} props.onDelete - (audioNote) => void
 * @param {function} props.onOpenRecorder - () => void
 * @param {function} [props.onRetryTranscription] - (audioNote) => void
 * @param {object} [props.containerStyle]
 */
export default function AudioNotesDeck({
  audioNotes = [],
  onDelete,
  onOpenRecorder,
  onRetryTranscription,
  containerStyle,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState(null);

  if (!audioNotes || audioNotes.length === 0) {
    return null;
  }

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded((prev) => !prev);
  };

  return (
    <View
      style={[styles.container, containerStyle]}
      pointerEvents="box-none"
    >
      {/* Genişletilmiş Liste */}
      {isExpanded && (
        <View
          style={[
            styles.expandedDeck,
            {
              backgroundColor: colors.card || '#FFFFFF',
              borderColor: colors.border || '#E0E0E0',
            },
          ]}
          pointerEvents="auto"
        >
          <View style={styles.deckHeader}>
            <View style={styles.deckTitleRow}>
              <MaterialCommunityIcons name="microphone" size={16} color={colors.accent} />
              <Text style={[styles.deckTitle, { color: colors.textPrimary }]}>
                {t('audio.notesDeckTitle', {
                  count: audioNotes.length,
                  defaultValue: `Sesli Notlar (${audioNotes.length})`,
                })}
              </Text>
            </View>

            <View style={styles.deckHeaderActions}>
              {onOpenRecorder && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onOpenRecorder();
                  }}
                  style={[styles.addBtn, { backgroundColor: colors.accent + '15' }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="plus" size={18} color={colors.accent} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={toggleExpand}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {audioNotes.map((note) => (
              <AudioNotePlayer
                key={note.id}
                audioNote={note}
                onDelete={onDelete}
                activeAudioId={activeAudioId}
                onPlayStart={setActiveAudioId}
                onRetryTranscription={onRetryTranscription}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Katlanmış Pill / Rozet Butonu */}
      {!isExpanded && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleExpand}
          style={[
            styles.collapsedPill,
            {
              backgroundColor: colors.card || '#FFFFFF',
              borderColor: colors.accent + '40',
            },
          ]}
          pointerEvents="auto"
        >
          <View style={[styles.pillIconBadge, { backgroundColor: colors.accent + '20' }]}>
            <MaterialCommunityIcons name="microphone" size={16} color={colors.accent} />
          </View>
          <Text style={[styles.pillText, { color: colors.textPrimary }]}>
            {t('audio.notesPill', {
              count: audioNotes.length,
              defaultValue: `${audioNotes.length} Sesli Not`,
            })}
          </Text>
          <MaterialCommunityIcons
            name="chevron-up"
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    alignItems: 'flex-start',
    zIndex: 900,
    elevation: 10,
  },
  collapsedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  pillIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  expandedDeck: {
    width: '100%',
    maxHeight: 280,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  deckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    marginBottom: 6,
  },
  deckTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deckTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  deckHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 2,
  },
  scrollList: {
    maxHeight: 220,
  },
  scrollContent: {
    paddingVertical: 4,
  },
});
