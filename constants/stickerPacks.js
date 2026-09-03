/**
 * AJANDA - Sticker Paketleri
 * Emoji tabanlı sticker koleksiyonları.
 * İleride 'type: image' ile özel görseller de eklenebilir.
 */

export const STICKER_PACKS = [
  {
    id: 'hearts',
    name: 'Kalpler',
    icon: '💕',
    stickers: [
      { id: 'h1', type: 'emoji', content: '❤️' },
      { id: 'h2', type: 'emoji', content: '💖' },
      { id: 'h3', type: 'emoji', content: '💝' },
      { id: 'h4', type: 'emoji', content: '💗' },
      { id: 'h5', type: 'emoji', content: '🩷' },
      { id: 'h6', type: 'emoji', content: '💞' },
      { id: 'h7', type: 'emoji', content: '💘' },
      { id: 'h8', type: 'emoji', content: '💓' },
    ],
  },
  {
    id: 'stars',
    name: 'Yıldızlar',
    icon: '⭐',
    stickers: [
      { id: 's1', type: 'emoji', content: '⭐' },
      { id: 's2', type: 'emoji', content: '🌟' },
      { id: 's3', type: 'emoji', content: '✨' },
      { id: 's4', type: 'emoji', content: '💫' },
      { id: 's5', type: 'emoji', content: '🌠' },
      { id: 's6', type: 'emoji', content: '☀️' },
    ],
  },
  {
    id: 'nature',
    name: 'Doğa',
    icon: '🌸',
    stickers: [
      { id: 'n1', type: 'emoji', content: '🌸' },
      { id: 'n2', type: 'emoji', content: '🌺' },
      { id: 'n3', type: 'emoji', content: '🦋' },
      { id: 'n4', type: 'emoji', content: '🌷' },
      { id: 'n5', type: 'emoji', content: '🍀' },
      { id: 'n6', type: 'emoji', content: '🌻' },
      { id: 'n7', type: 'emoji', content: '🌈' },
      { id: 'n8', type: 'emoji', content: '🍃' },
    ],
  },
  {
    id: 'decorative',
    name: 'Dekoratif',
    icon: '🎀',
    stickers: [
      { id: 'd1', type: 'emoji', content: '🎀' },
      { id: 'd2', type: 'emoji', content: '🎁' },
      { id: 'd3', type: 'emoji', content: '🧸' },
      { id: 'd4', type: 'emoji', content: '🩰' },
      { id: 'd5', type: 'emoji', content: '👑' },
      { id: 'd6', type: 'emoji', content: '💎' },
      { id: 'd7', type: 'emoji', content: '🪄' },
      { id: 'd8', type: 'emoji', content: '🎪' },
    ],
  },
  {
    id: 'food',
    name: 'Yiyecekler',
    icon: '🧁',
    stickers: [
      { id: 'f1', type: 'emoji', content: '🧁' },
      { id: 'f2', type: 'emoji', content: '🍰' },
      { id: 'f3', type: 'emoji', content: '🍩' },
      { id: 'f4', type: 'emoji', content: '🍓' },
      { id: 'f5', type: 'emoji', content: '🍒' },
      { id: 'f6', type: 'emoji', content: '🫧' },
      { id: 'f7', type: 'emoji', content: '☕' },
      { id: 'f8', type: 'emoji', content: '🧋' },
    ],
  },
  {
    id: 'mood',
    name: 'Ruh Hali',
    icon: '😊',
    stickers: [
      { id: 'm1', type: 'emoji', content: '😊' },
      { id: 'm2', type: 'emoji', content: '🥰' },
      { id: 'm3', type: 'emoji', content: '😍' },
      { id: 'm4', type: 'emoji', content: '🤗' },
      { id: 'm5', type: 'emoji', content: '😇' },
      { id: 'm6', type: 'emoji', content: '🥺' },
      { id: 'm7', type: 'emoji', content: '😴' },
      { id: 'm8', type: 'emoji', content: '🤩' },
    ],
  },
  {
    id: 'custom_images',
    name: 'Özel Görseller',
    icon: '🖼️',
    stickers: [
      { id: 'i1', type: 'image', source: require('../assets/stickers/sticker1.jpg') },
      { id: 'i2', type: 'image', source: require('../assets/stickers/sticker2.jpg') },
      { id: 'i3', type: 'image', source: require('../assets/stickers/sticker3.jpg') },
      { id: 'i4', type: 'image', source: require('../assets/stickers/sticker4.png') },
      { id: 'i5', type: 'image', source: require('../assets/stickers/sticker5.jpg') },
    ],
  },
];
