/**
 * INDEX_FLAG_COLORS - Klasik Post-it Index Şerit Renkleri
 * Mor, Pembe, Sarı, Yeşil ve Turuncu
 */

export const INDEX_FLAG_COLORS = {
  purple: {
    id: 'purple',
    name: 'Mor',
    tabColor: '#BA68C8',
    adhesiveColor: 'rgba(186, 104, 200, 0.28)',
    textColor: '#FFFFFF',
    darkTextColor: '#4A148C',
    borderColor: '#AB47BC',
    dotColor: '#E1BEE7',
  },
  pink: {
    id: 'pink',
    name: 'Pembe',
    tabColor: '#F06292',
    adhesiveColor: 'rgba(240, 98, 146, 0.28)',
    textColor: '#FFFFFF',
    darkTextColor: '#880E4F',
    borderColor: '#E91E63',
    dotColor: '#F8BBD0',
  },
  yellow: {
    id: 'yellow',
    name: 'Sarı',
    tabColor: '#FFD54F',
    adhesiveColor: 'rgba(255, 213, 79, 0.35)',
    textColor: '#5D4037', // Sarı üzerinde yüksek kontrast için koyu kahve
    darkTextColor: '#E65100',
    borderColor: '#FFC107',
    dotColor: '#FFF59D',
  },
  green: {
    id: 'green',
    name: 'Yeşil',
    tabColor: '#81C784',
    adhesiveColor: 'rgba(129, 199, 132, 0.28)',
    textColor: '#FFFFFF',
    darkTextColor: '#1B5E20',
    borderColor: '#66BB6A',
    dotColor: '#C8E6C9',
  },
  orange: {
    id: 'orange',
    name: 'Turuncu',
    tabColor: '#FFB74D',
    adhesiveColor: 'rgba(255, 183, 77, 0.30)',
    textColor: '#FFFFFF',
    darkTextColor: '#BF360C',
    borderColor: '#FFA726',
    dotColor: '#FFE0B2',
  },
};

export const INDEX_FLAG_COLOR_KEYS = ['purple', 'pink', 'yellow', 'green', 'orange'];

export const getIndexFlagColor = (colorKey = 'yellow') => {
  return INDEX_FLAG_COLORS[colorKey] || INDEX_FLAG_COLORS.yellow;
};

export default INDEX_FLAG_COLORS;
