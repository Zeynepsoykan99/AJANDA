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

export function getAllThemes() {
  return Object.values(THEMES);
}

/**
 * Renk HEX kodunu R, G, B değerlerine dönüştürür
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 }; // Hatalı format gelirse beyaz dön
}

/**
 * Verilen HEX koduna göre, parlaklığı ölçer ve en uyumlu/kontrast temayı dinamik üretir.
 */
export function generateCustomTheme(hexColor) {
  // Eğer hex 3 haneliyse veya hatalıysa normalize et
  let hex = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  } else if (hex.length !== 7) {
    hex = '#FFFFFF';
  }

  const { r, g, b } = hexToRgb(hex);

  // Parlaklık / Luminance (W3C Standard)
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 128 eşik değeri. Eğer luminance > 128 ise renk açıktır, koyu metin gerekir.
  const isLight = luminance > 140; 

  return {
    id: `custom:${hex}`,
    name: 'Özel Renk',
    emoji: '✨',
    colors: {
      background: hex,
      backgroundLight: isLight ? '#FFFFFF99' : '#00000033', // Yarı saydam beyaz veya siyah katman
      card: isLight ? '#FFFFFF' : '#222222', // Arka plan çok koyuysa kartı çok az gri yap
      border: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
      shadow: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.4)',
      textPrimary: isLight ? '#222222' : '#FFFFFF',
      textSecondary: isLight ? '#444444' : '#E0E0E0',
      textDeep: isLight ? '#111111' : '#FFFFFF',
      accent: isLight ? '#444444' : '#FFFFFF',
      white: '#FFFFFF',
    },
  };
}

/**
 * Tema ID'sine göre tema nesnesini döndürür.
 * Eğer ID 'custom:#HEX' formatındaysa dinamik tema üretip döndürür.
 * Geçersiz ID verilirse varsayılan temayı döndürür.
 */
export function getThemeById(themeId) {
  if (typeof themeId === 'string' && themeId.startsWith('custom:')) {
    const hexColor = themeId.replace('custom:', '');
    return generateCustomTheme(hexColor);
  }
  return THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
}
