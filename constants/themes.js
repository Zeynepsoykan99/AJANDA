/**
 * AJANDA - Tema Tanımları
 * Her tema, uygulamanın tüm renklerini içeren bir paletten oluşur.
 * ThemeContext bu dosyayı kullanarak aktif temayı yönetir.
 */

export const THEMES = {
  powderPink: {
    id: 'powderPink',
    name: 'Pudra Pembe',
    emoji: '🌸',
    colors: {
      background: '#FDEEF2',
      backgroundLight: '#FFF5F8',
      card: '#FFFFFF',
      border: '#F8BBD0',
      shadow: '#E1BEE7',
      textPrimary: '#C2185B',
      textSecondary: '#AD1457',
      textDeep: '#880E4F',
      accent: '#D81B60',
      white: '#FFFFFF',
    },
  },
  lavender: {
    id: 'lavender',
    name: 'Lavanta',
    emoji: '💜',
    colors: {
      background: '#F3E5F5',
      backgroundLight: '#F8F0FA',
      card: '#FFFFFF',
      border: '#CE93D8',
      shadow: '#BA68C8',
      textPrimary: '#7B1FA2',
      textSecondary: '#6A1B9A',
      textDeep: '#4A148C',
      accent: '#AB47BC',
      white: '#FFFFFF',
    },
  },
  peach: {
    id: 'peach',
    name: 'Şeftali',
    emoji: '🍑',
    colors: {
      background: '#FFF3E0',
      backgroundLight: '#FFF8F0',
      card: '#FFFFFF',
      border: '#FFCC80',
      shadow: '#FFB74D',
      textPrimary: '#E65100',
      textSecondary: '#BF360C',
      textDeep: '#8D2C0B',
      accent: '#FF7043',
      white: '#FFFFFF',
    },
  },
  mintGreen: {
    id: 'mintGreen',
    name: 'Nane Yeşili',
    emoji: '🌿',
    colors: {
      background: '#E8F5E9',
      backgroundLight: '#F1F8F2',
      card: '#FFFFFF',
      border: '#A5D6A7',
      shadow: '#81C784',
      textPrimary: '#2E7D32',
      textSecondary: '#1B5E20',
      textDeep: '#0D3B12',
      accent: '#66BB6A',
      white: '#FFFFFF',
    },
  },
  babyBlue: {
    id: 'babyBlue',
    name: 'Bebek Mavisi',
    emoji: '🦋',
    colors: {
      background: '#E3F2FD',
      backgroundLight: '#F0F7FE',
      card: '#FFFFFF',
      border: '#90CAF9',
      shadow: '#64B5F6',
      textPrimary: '#1565C0',
      textSecondary: '#0D47A1',
      textDeep: '#0A3276',
      accent: '#42A5F5',
      white: '#FFFFFF',
    },
  },
};

export const DEFAULT_THEME_ID = 'powderPink';

/**
 * Tema ID'sine göre tema nesnesini döndürür.
 * Geçersiz ID verilirse varsayılan temayı döndürür.
 */
export function getThemeById(themeId) {
  return THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
}

/**
 * Tüm temaları dizi olarak döndürür (tema seçici UI için).
 */
export function getAllThemes() {
  return Object.values(THEMES);
}
