/**
 * AJANDA - Sayfa Şablon Kayıt Sistemi
 * Her sayfa kategorisi (todo, monthly, weekly, blank) için
 * girly konsepte uygun şablon alternatifleri tanımlar.
 */

export const PAGE_CATEGORIES = [
  {
    id: 'todo',
    name: 'To-Do List',
    icon: 'checkbox-marked-outline',
    emoji: '📋',
    description: 'Yapılacaklar listesi',
  },
  {
    id: 'monthly',
    name: 'Aylık Ajanda',
    icon: 'calendar-month-outline',
    emoji: '📅',
    description: 'Aylık takvim planı',
  },
  {
    id: 'weekly',
    name: 'Haftalık Ajanda',
    icon: 'calendar-week',
    emoji: '🗓️',
    description: 'Haftalık plan',
  },
  {
    id: 'blank',
    name: 'Boş Sayfa',
    icon: 'file-document-outline',
    emoji: '📝',
    description: 'Serbest not alanı',
  },
];

export const PAGE_TEMPLATES = {
  todo: [
    {
      id: 'todo_hearts',
      name: 'Kalpli Checklist',
      colors: { bg: '#FFF0F5', accent: '#E91E63', check: '#C2185B', line: '#FCE4EC' },
      pattern: 'hearts',
      checkboxStyle: 'heart',
    },
    {
      id: 'todo_stars',
      name: 'Yıldızlı Checklist',
      colors: { bg: '#F3E5F5', accent: '#9C27B0', check: '#7B1FA2', line: '#E1BEE7' },
      pattern: 'stars',
      checkboxStyle: 'star',
    },
    {
      id: 'todo_ribbon',
      name: 'Kurdeleli Checklist',
      colors: { bg: '#FFF8E1', accent: '#FF8F00', check: '#E65100', line: '#FFECB3' },
      pattern: 'dots',
      checkboxStyle: 'circle',
    },
  ],
  monthly: [
    {
      id: 'monthly_floral',
      name: 'Çiçekli Takvim',
      colors: { bg: '#FFF0F5', accent: '#C2185B', header: '#880E4F', cell: '#FFFFFF', border: '#F8BBD0' },
      pattern: 'flowers',
    },
    {
      id: 'monthly_lavender',
      name: 'Lavanta Takvim',
      colors: { bg: '#F3E5F5', accent: '#7B1FA2', header: '#4A148C', cell: '#FFFFFF', border: '#CE93D8' },
      pattern: 'dots',
    },
    {
      id: 'monthly_mint',
      name: 'Nane Takvim',
      colors: { bg: '#E8F5E9', accent: '#2E7D32', header: '#1B5E20', cell: '#FFFFFF', border: '#A5D6A7' },
      pattern: 'lines',
    },
  ],
  weekly: [
    {
      id: 'weekly_pink',
      name: 'Pembe Haftalık',
      colors: { bg: '#FFF0F5', accent: '#C2185B', header: '#880E4F', day: '#FFFFFF', border: '#F8BBD0' },
      pattern: 'hearts',
    },
    {
      id: 'weekly_sky',
      name: 'Gök Mavisi Haftalık',
      colors: { bg: '#E3F2FD', accent: '#1565C0', header: '#0D47A1', day: '#FFFFFF', border: '#90CAF9' },
      pattern: 'stars',
    },
    {
      id: 'weekly_peach',
      name: 'Şeftali Haftalık',
      colors: { bg: '#FFF3E0', accent: '#E65100', header: '#BF360C', day: '#FFFFFF', border: '#FFCC80' },
      pattern: 'dots',
    },
  ],
  blank: [
    {
      id: 'blank_lined',
      name: 'Çizgili Sayfa',
      colors: { bg: '#FFFFFF', accent: '#C2185B', line: '#FCE4EC' },
      lineStyle: 'horizontal',
    },
    {
      id: 'blank_dotted',
      name: 'Noktalı Sayfa',
      colors: { bg: '#FFFFFF', accent: '#7B1FA2', line: '#F3E5F5' },
      lineStyle: 'dots',
    },
    {
      id: 'blank_plain',
      name: 'Düz Sayfa',
      colors: { bg: '#FFFFFF', accent: '#2E7D32', line: 'transparent' },
      lineStyle: 'none',
    },
  ],
};

/**
 * Kategori ID ve şablon ID'ye göre şablon detayını döndürür.
 */
export function getPageTemplate(categoryId, templateId) {
  const categoryTemplates = PAGE_TEMPLATES[categoryId];
  if (!categoryTemplates) return null;
  return categoryTemplates.find((t) => t.id === templateId) || categoryTemplates[0];
}

/**
 * Kategorinin tüm şablonlarını döndürür.
 */
export function getTemplatesForCategory(categoryId) {
  return PAGE_TEMPLATES[categoryId] || [];
}

/**
 * Benzersiz sayfa ID'si oluşturur.
 */
export function generatePageId() {
  return `page_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Kategoriye göre varsayılan sayfa verisi oluşturur.
 */
export function createDefaultPageData(categoryId) {
  switch (categoryId) {
    case 'todo':
      return { items: [] };
    case 'monthly':
      return {
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        events: [],
      };
    case 'weekly':
      return {
        weekStartDate: new Date().toISOString(),
        days: [
          { dayOfWeek: 0, items: [] },
          { dayOfWeek: 1, items: [] },
          { dayOfWeek: 2, items: [] },
          { dayOfWeek: 3, items: [] },
          { dayOfWeek: 4, items: [] },
          { dayOfWeek: 5, items: [] },
          { dayOfWeek: 6, items: [] },
        ],
      };
    case 'blank':
      return { content: '' };
    default:
      return {};
  }
}
