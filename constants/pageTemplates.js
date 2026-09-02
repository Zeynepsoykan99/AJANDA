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

export const TEMPLATE_IMAGES = {
  weekly_cute_pink_planner: require('../assets/templates/planner_pink_cute.jpg'),
  weekly_floral_grid_planner: require('../assets/templates/planner_floral_grid.jpg'),
  weekly_flower_cloud_planner: require('../assets/templates/planner_flower_cloud.jpg'),
  weekly_ribbon_envelope_planner: require('../assets/templates/planner_ribbon_envelope.jpg'),
  weekly_cozy_botanical_planner: require('../assets/templates/planner_cozy_botanical.jpg'),
  weekly_kawaii_cats_planner: require('../assets/templates/planner_kawaii_cats.jpg'),
  weekly_blue_floral_planner: require('../assets/templates/planner_blue_floral.jpg'),
  weekly_new_planner_1: require('../assets/templates/planner_new_1.jpg'),
  weekly_new_planner_2: require('../assets/templates/planner_new_2.jpg'),
  todo_template_1: require('../assets/templates/todo_1.jpg'),
  todo_template_2: require('../assets/templates/todo_2.jpg'),
  todo_template_4: require('../assets/templates/todo_4.jpg'),
  todo_template_5: require('../assets/templates/todo_5.jpg'),
  todo_template_6: require('../assets/templates/todo_6.jpg'),
};

export const PAGE_TEMPLATES = {
  todo: [
    {
      id: 'todo_template_1',
      name: 'To-Do Şablonu 1',
      description: 'Özel yapılacaklar listesi tasarımı 1',
      type: 'image_template',
      colors: { bg: '#FFF5F8', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      aspectRatio: 0.70,
    },
    {
      id: 'todo_template_2',
      name: 'To-Do Şablonu 2',
      description: 'Özel yapılacaklar listesi tasarımı 2',
      type: 'image_template',
      colors: { bg: '#FFF5F8', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      aspectRatio: 0.70,
    },
    {
      id: 'todo_template_4',
      name: 'To-Do Şablonu 4',
      description: 'Özel yapılacaklar listesi tasarımı 4',
      type: 'image_template',
      colors: { bg: '#FFF5F8', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      aspectRatio: 0.70,
    },
    {
      id: 'todo_template_5',
      name: 'To-Do Şablonu 5',
      description: 'Özel yapılacaklar listesi tasarımı 5',
      type: 'image_template',
      colors: { bg: '#FFF5F8', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      aspectRatio: 0.70,
    },
    {
      id: 'todo_template_6',
      name: 'To-Do Şablonu 6',
      description: 'Özel yapılacaklar listesi tasarımı 6',
      type: 'image_template',
      colors: { bg: '#FFF5F8', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      aspectRatio: 0.70,
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
      id: 'weekly_cute_pink_planner',
      name: 'Pembe & Çilekli Şablon 🍓',
      description: 'Birebir orijinal el çizimi pembe haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#FFF5F8', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      aspectRatio: 0.703,
    },
    {
      id: 'weekly_floral_grid_planner',
      name: 'Papatyalı Grid Şablon 🌼',
      description: 'Birebir orijinal çiçekli kareli haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#FFFDE7', accent: '#F57F17', header: '#E65100', day: '#FFFFFF', border: '#FFE082' },
      aspectRatio: 0.66,
    },
    {
      id: 'weekly_flower_cloud_planner',
      name: 'Çiçekli Bulut Şablon 🌸',
      description: 'Pastel çiçekli ve çay fincanlı haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#FFF5F8', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      aspectRatio: 0.707,
    },
    {
      id: 'weekly_ribbon_envelope_planner',
      name: 'Kurdeleli & Zarflı Şablon 🎀',
      description: 'Pembe saten kurdeleli ve mektup zarflı haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#FFFDF9', accent: '#D81B60', header: '#880E4F', day: '#FFFFFF', border: '#F8BBD0' },
      aspectRatio: 0.707,
    },
    {
      id: 'weekly_cozy_botanical_planner',
      name: 'Cozy Botanik To-Do Şablon 🌿',
      description: 'Kahve fincanı, kitaplar ve botanik yapraklar',
      type: 'image_template',
      colors: { bg: '#FDFBF7', accent: '#8D6E63', header: '#4E342E', day: '#FFFFFF', border: '#D7CCC8' },
      aspectRatio: 0.77,
    },
    {
      id: 'weekly_kawaii_cats_planner',
      name: 'Sevimli Kedili & Washi Bantlı Şablon 🐱',
      description: 'Pati izleri, sevimli kedicikler ve renkli bantlar',
      type: 'image_template',
      colors: { bg: '#FFFDF5', accent: '#FB8C00', header: '#E65100', day: '#FFFFFF', border: '#FFE0B2' },
      aspectRatio: 0.67,
    },
    {
      id: 'weekly_blue_floral_planner',
      name: 'Mavi Çiçekli Şablon 💙',
      description: 'Sade pastel mavi çiçek detaylı haftalık planlayıcı',
      type: 'image_template',
      aspectRatio: 0.707,
    },
    {
      id: 'weekly_new_planner_1',
      name: 'Orijinal Haftalık Şablon 1',
      description: 'Özel eklenen el çizimi haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#FFF5F8', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      aspectRatio: 0.70,
    },
    {
      id: 'weekly_new_planner_2',
      name: 'Orijinal Haftalık Şablon 2',
      description: 'Özel eklenen el çizimi haftalık planlayıcı 2',
      type: 'image_template',
      colors: { bg: '#FFF5F8', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      aspectRatio: 0.70,
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
  const tmpl = categoryTemplates.find((t) => t.id === templateId) || categoryTemplates[0];
  if (tmpl && TEMPLATE_IMAGES[tmpl.id]) {
    return { ...tmpl, image: TEMPLATE_IMAGES[tmpl.id] };
  }
  return tmpl;
}

/**
 * Kategorinin tüm şablonlarını döndürür.
 */
export function getTemplatesForCategory(categoryId) {
  const templates = PAGE_TEMPLATES[categoryId] || [];
  return templates.map((tmpl) =>
    TEMPLATE_IMAGES[tmpl.id] ? { ...tmpl, image: TEMPLATE_IMAGES[tmpl.id] } : tmpl
  );
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
