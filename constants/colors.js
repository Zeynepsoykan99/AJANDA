/**
 * AJANDA - Renk Sabitleri (Geriye dönük uyumluluk)
 *
 * Bu dosya artık themes.js'deki varsayılan temadan renkleri re-export eder.
 * Yeni kodlarda useTheme() hook'unu kullanmayı tercih edin.
 */

import { THEMES, DEFAULT_THEME_ID } from './themes';

const defaultTheme = THEMES[DEFAULT_THEME_ID];

// Eski COLORS formatıyla uyumluluk
export const COLORS = {
  // Arka plan pudra pembe tonları
  powderPink: {
    background: defaultTheme.colors.background,
    light: defaultTheme.colors.backgroundLight,
    card: defaultTheme.colors.card,
    border: defaultTheme.colors.border,
    shadow: defaultTheme.colors.shadow,
  },
  // Koyu pembe metin ve vurgu tonları
  darkPink: {
    text: defaultTheme.colors.textSecondary,
    primary: defaultTheme.colors.textPrimary,
    deep: defaultTheme.colors.textDeep,
    accent: defaultTheme.colors.accent,
  },
  white: defaultTheme.colors.white,
};

export default COLORS;
