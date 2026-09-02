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
    id: 'vintage_rose',
    name: 'Vintage Pembe Güllü',
    backgroundColor: '#FFFDF9',
    borderColor: '#E8A7B8',
    accentColor: '#B71C1C',
    pattern: 'floral',
    patternColor: '#F8BBD0',
    titleStyle: 'elegant',
    decorationIcon: 'flower-rose',
    decorationEmoji: '🌹',
  },
  {
    id: 'botanical_olive',
    name: 'Minimal Okaliptüs',
    backgroundColor: '#F9FBE7',
    borderColor: '#C5E1A5',
    accentColor: '#33691E',
    pattern: 'leaves',
    patternColor: '#DCEDC8',
    titleStyle: 'modern',
    decorationIcon: 'leaf',
    decorationEmoji: '🌿',
  },
  {
    id: 'watercolor_dream',
    name: 'Suluboya Hayal',
    backgroundColor: '#FCE4EC',
    borderColor: '#F48FB1',
    accentColor: '#6A1B9A',
    pattern: 'watercolor',
    patternColor: '#F8BBD0',
    titleStyle: 'elegant',
    decorationIcon: 'palette-outline',
    decorationEmoji: '🎨',
  },
  {
    id: 'coquette_bows',
    name: 'Coquette İnci & Fiyonk',
    backgroundColor: '#FFF0F5',
    borderColor: '#F48FB1',
    accentColor: '#880E4F',
    pattern: 'bows',
    patternColor: '#F8BBD0',
    titleStyle: 'playful',
    decorationIcon: 'bow-tie',
    decorationEmoji: '🎀',
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
