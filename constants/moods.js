/**
 * Mood Constants & Configurations (Expanded 12 Moods Palette)
 */
export const MOODS = [
  { key: 'happy', emoji: '😊', labelKey: 'mood.happy', defaultLabel: 'Mutlu' },
  { key: 'energetic', emoji: '⚡', labelKey: 'mood.energetic', defaultLabel: 'Enerjik' },
  { key: 'excited', emoji: '🥳', labelKey: 'mood.excited', defaultLabel: 'Heyecanlı' },
  { key: 'inspired', emoji: '💡', labelKey: 'mood.inspired', defaultLabel: 'İlham Dolu' },
  { key: 'focused', emoji: '🎯', labelKey: 'mood.focused', defaultLabel: 'Odaklanmış' },
  { key: 'calm', emoji: '😌', labelKey: 'mood.calm', defaultLabel: 'Huzurlu' },
  { key: 'grateful', emoji: '🙏', labelKey: 'mood.grateful', defaultLabel: 'Minnettar' },
  { key: 'relaxed', emoji: '☕', labelKey: 'mood.relaxed', defaultLabel: 'Sakin' },
  { key: 'tired', emoji: '😫', labelKey: 'mood.tired', defaultLabel: 'Yorgun' },
  { key: 'anxious', emoji: '😰', labelKey: 'mood.anxious', defaultLabel: 'Endişeli' },
  { key: 'melancholic', emoji: '🌧️', labelKey: 'mood.melancholic', defaultLabel: 'Melankolik' },
  { key: 'sad', emoji: '😔', labelKey: 'mood.sad', defaultLabel: 'Üzgün' },
];

export const MOOD_COLORS = {
  happy: '#FFB300',
  energetic: '#FF9100',
  excited: '#E91E63',
  inspired: '#00B0FF',
  focused: '#1E88E5',
  calm: '#43A047',
  grateful: '#8E24AA',
  relaxed: '#26A69A',
  tired: '#78909C',
  anxious: '#FF5722',
  melancholic: '#5C6BC0',
  sad: '#3949AB',
  default: '#BDBDBD',
};

export const POSITIVE_MOODS = new Set([
  'happy',
  'energetic',
  'excited',
  'inspired',
  'focused',
  'calm',
  'grateful',
  'relaxed',
]);

export const getMoodEmoji = (moodKey) => {
  if (!moodKey) return null;
  const found = MOODS.find((m) => m.key === moodKey);
  return found ? found.emoji : moodKey;
};
