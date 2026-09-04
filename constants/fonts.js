import { Platform } from 'react-native';

/**
 * AJANDA - Merkezi Yazı Tipi (Font) Kataloğu
 * Tablet, iPad, Android ve Web platformlarında ek yerel paket kurulumu
 * gerektirmeden doğal olarak çalışan, estetik ve yasal yazı tipleri.
 */
export const AVAILABLE_FONTS = [
  {
    id: 'system',
    name: 'Varsayılan',
    category: 'Sans-Serif',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
    sample: 'Bugün harika bir gün',
  },
  {
    id: 'handwriting',
    name: 'El Yazısı',
    category: 'Cursive',
    fontFamily: Platform.select({
      ios: 'Snell Roundhand',
      android: 'casual',
      default: '"Caveat", "Brush Script MT", "Segoe Script", cursive',
    }),
    sample: 'Zarif el yazısı notları',
  },
  {
    id: 'casual',
    name: 'Serbest Not',
    category: 'Casual',
    fontFamily: Platform.select({
      ios: 'Chalkboard SE',
      android: 'casual',
      default: '"Chalkboard SE", "Comic Sans MS", cursive, sans-serif',
    }),
    sample: 'Günlük yapılacaklar listesi',
  },
  {
    id: 'serif',
    name: 'Zarif Kitap',
    category: 'Serif',
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'Georgia, "Times New Roman", Times, serif',
    }),
    sample: 'Kitap ve makale alıntıları',
  },
  {
    id: 'mono',
    name: 'Daktilo',
    category: 'Monospace',
    fontFamily: Platform.select({
      ios: 'Courier New',
      android: 'monospace',
      default: '"Courier New", Courier, monospace',
    }),
    sample: 'Kod ve planlama satırları',
  },
  {
    id: 'rounded',
    name: 'Modern Düz',
    category: 'Sans-Serif',
    fontFamily: Platform.select({
      ios: 'Helvetica Neue',
      android: 'sans-serif-medium',
      default: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    }),
    sample: 'Net ve belirgin başlıklar',
  },
];

/**
 * Font ID'sine göre font tanımını döndürür.
 */
export function getFontById(fontId) {
  return AVAILABLE_FONTS.find((f) => f.id === fontId) || AVAILABLE_FONTS[0];
}
