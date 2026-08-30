/**
 * AJANDA - Kapak Şablon Tanımları
 * Her kapak şablonu, renk paleti, desen ve dekorasyon bilgilerini içerir.
 */

export const COVER_TEMPLATES = [
  {
    id: 'classic_floral',
    name: 'Çiçekli Klasik',
    backgroundColor: '#FFF0F5',
    borderColor: '#F8BBD0',
    accentColor: '#C2185B',
    pattern: 'dots',
    patternColor: '#FCE4EC',
    titleStyle: 'elegant',
    decorationIcon: 'flower-tulip-outline',
    decorationEmoji: '🌷',
  },
  {
    id: 'minimal_heart',
    name: 'Minimal Kalp',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1BEE7',
    accentColor: '#7B1FA2',
    pattern: 'hearts',
    patternColor: '#F3E5F5',
    titleStyle: 'modern',
    decorationIcon: 'heart-outline',
    decorationEmoji: '💜',
  },
  {
    id: 'starry_night',
    name: 'Yıldızlı Gece',
    backgroundColor: '#F3E5F5',
    borderColor: '#BA68C8',
    accentColor: '#6A1B9A',
    pattern: 'stars',
    patternColor: '#E1BEE7',
    titleStyle: 'playful',
    decorationIcon: 'star-four-points-outline',
    decorationEmoji: '✨',
  },
  {
    id: 'butterfly_garden',
    name: 'Kelebek Bahçesi',
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
    accentColor: '#2E7D32',
    pattern: 'dots',
    patternColor: '#C8E6C9',
    titleStyle: 'elegant',
    decorationIcon: 'butterfly-outline',
    decorationEmoji: '🦋',
  },
  {
    id: 'sweet_ribbon',
    name: 'Tatlı Kurdele',
    backgroundColor: '#FFF8E1',
    borderColor: '#FFCC80',
    accentColor: '#E65100',
    pattern: 'lines',
    patternColor: '#FFECB3',
    titleStyle: 'modern',
    decorationIcon: 'gift-outline',
    decorationEmoji: '🎀',
  },
];

export const DEFAULT_COVER_TEMPLATE_ID = 'classic_floral';

/**
 * ID'ye göre kapak şablonunu bulur.
 */
export function getCoverTemplateById(templateId) {
  return (
    COVER_TEMPLATES.find((t) => t.id === templateId) ||
    COVER_TEMPLATES.find((t) => t.id === DEFAULT_COVER_TEMPLATE_ID)
  );
}
