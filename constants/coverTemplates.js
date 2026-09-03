/**
 * AJANDA - Görsel Kapak Şablon Tanımları
 * Her kapak şablonu, kullanıcıların seçebileceği görsel bir tasarımı içerir.
 */

export const COVER_TEMPLATES = [
  {
    id: 'cover_1',
    name: 'Kapak 1',
    imageSource: require('../assets/covers/kapak1.png'),
  },
  {
    id: 'cover_2',
    name: 'Kapak 2',
    imageSource: require('../assets/covers/kapak2.png'),
  },
  {
    id: 'cover_3',
    name: 'Kapak 3',
    imageSource: require('../assets/covers/kapak3.png'),
  },
  {
    id: 'cover_4',
    name: 'Kapak 4',
    imageSource: require('../assets/covers/kapak4.png'),
  },
  {
    id: 'cover_5',
    name: 'Kapak 5',
    imageSource: require('../assets/covers/kapak5.png'),
  },
  {
    id: 'cover_6',
    name: 'Kapak 6',
    imageSource: require('../assets/covers/kapak6.jpg'),
  },
];

export const DEFAULT_COVER_TEMPLATE_ID = 'cover_1';

/**
 * ID'ye göre kapak şablonunu bulur.
 */
export function getCoverTemplateById(templateId) {
  return (
    COVER_TEMPLATES.find((t) => t.id === templateId) ||
    COVER_TEMPLATES.find((t) => t.id === DEFAULT_COVER_TEMPLATE_ID)
  );
}
