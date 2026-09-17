/**
 * Mood Constants & Configurations
 */
export const MOODS = [
  { key: 'happy', emoji: '😊', labelKey: 'mood.happy', defaultLabel: 'Mutlu' },
  { key: 'focused', emoji: '🎯', labelKey: 'mood.focused', defaultLabel: 'Odaklanmış' },
  { key: 'excited', emoji: '🥳', labelKey: 'mood.excited', defaultLabel: 'Heyecanlı' },
  { key: 'calm', emoji: '😌', labelKey: 'mood.calm', defaultLabel: 'Huzurlu' },
  { key: 'grateful', emoji: '🙏', labelKey: 'mood.grateful', defaultLabel: 'Minnettar' },
  { key: 'tired', emoji: '😫', labelKey: 'mood.tired', defaultLabel: 'Yorgun' },
  { key: 'stressed', emoji: '😰', labelKey: 'mood.stressed', defaultLabel: 'Stresli' },
  { key: 'sad', emoji: '😔', labelKey: 'mood.sad', defaultLabel: 'Üzgün' },
];

export const MOOD_COLORS = {
  happy: '#FFB300',
  focused: '#1E88E5',
  excited: '#E91E63',
  calm: '#43A047',
  grateful: '#8E24AA',
  tired: '#78909C',
  stressed: '#FF7043',
  sad: '#5C6BC0',
  default: '#BDBDBD',
};

export const POSITIVE_MOODS = new Set(['happy', 'focused', 'excited', 'calm', 'grateful']);

export const getMoodEmoji = (moodKey) => {
  if (!moodKey) return null;
  const found = MOODS.find((m) => m.key === moodKey);
  return found ? found.emoji : moodKey;
};
