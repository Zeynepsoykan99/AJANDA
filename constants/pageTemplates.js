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
];

export const TEMPLATE_IMAGES = {
  weekly_cute_pink_planner: require('../assets/templates/planner_pink_cute.webp'),
  weekly_floral_grid_planner: require('../assets/templates/planner_floral_grid.webp'),
  weekly_flower_cloud_planner: require('../assets/templates/planner_flower_cloud.webp'),
  weekly_ribbon_envelope_planner: require('../assets/templates/planner_ribbon_envelope.webp'),
  weekly_cozy_botanical_planner: require('../assets/templates/planner_cozy_botanical.webp'),
  weekly_kawaii_cats_planner: require('../assets/templates/planner_kawaii_cats.webp'),
  weekly_blue_floral_planner: require('../assets/templates/planner_blue_floral.webp'),
  weekly_new_planner_1: require('../assets/templates/planner_new_1.webp'),
  weekly_new_planner_2: require('../assets/templates/planner_new_2.webp'),
  todo_template_1: require('../assets/templates/todo_1.webp'),
  todo_template_2: require('../assets/templates/todo_2.webp'),
  todo_template_4: require('../assets/templates/todo_4.webp'),
  todo_template_5: require('../assets/templates/todo_5.webp'),
  todo_template_6: require('../assets/templates/todo_6.webp'),
  monthly_1: require('../assets/templates/monthly_1.webp'),
  monthly_2: require('../assets/templates/monthly_2.webp'),
  monthly_3: require('../assets/templates/monthly_3.webp'),
  monthly_4: require('../assets/templates/monthly_4.webp'),
  monthly_5: require('../assets/templates/monthly_5.webp'),
  monthly_6: require('../assets/templates/monthly_6.webp'),
};

export const PAGE_TEMPLATES = {
  todo: [
    {
      id: 'todo_template_1',
      name: 'To-Do Şablonu 1',
      description: 'Özel yapılacaklar listesi tasarımı 1',
      type: 'image_template',
      colors: { bg: '#FEF2F4', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      edgeColor: '#FEF2F4',
      aspectRatio: 0.70,
    },
    {
      id: 'todo_template_2',
      name: 'To-Do Şablonu 2',
      description: 'Özel yapılacaklar listesi tasarımı 2',
      type: 'image_template',
      colors: { bg: '#FFFAF4', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      edgeColor: '#FFFAF4',
      aspectRatio: 0.70,
    },
    {
      id: 'todo_template_4',
      name: 'To-Do Şablonu 4',
      description: 'Özel yapılacaklar listesi tasarımı 4',
      type: 'image_template',
      colors: { bg: '#FFFFFF', accent: '#1976D2', header: '#0D47A1', day: '#FFFFFF', border: '#BBDEFB' },
      edgeColor: '#FFFFFF',
      aspectRatio: 0.70,
    },
    {
      id: 'todo_template_5',
      name: 'To-Do Şablonu 5',
      description: 'Özel yapılacaklar listesi tasarımı 5',
      type: 'image_template',
      colors: { bg: '#ACCFE7', accent: '#1565C0', header: '#0D47A1', day: '#FFFFFF', border: '#90CAF9' },
      edgeColor: '#ACCFE7',
      aspectRatio: 0.70,
    },
    {
      id: 'todo_template_6',
      name: 'To-Do Şablonu 6',
      description: 'Özel yapılacaklar listesi tasarımı 6',
      type: 'image_template',
      colors: { bg: '#FDF5F1', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      edgeColor: '#FDF5F1',
      aspectRatio: 0.70,
    },
  ],
  monthly: [
    {
      id: 'monthly_1',
      name: 'Aylık Ajanda 1',
      description: 'El çizimi şık aylık ajanda tasarımı 1',
      type: 'image_template',
      colors: { bg: '#FEF5F8', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      edgeColor: '#FEF5F8',
      aspectRatio: 0.70,
    },
    {
      id: 'monthly_2',
      name: 'Aylık Ajanda 2',
      description: 'El çizimi şık aylık ajanda tasarımı 2',
      type: 'image_template',
      colors: { bg: '#FEF7F7', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      edgeColor: '#FEF7F7',
      aspectRatio: 0.70,
    },
    {
      id: 'monthly_3',
      name: 'Aylık Ajanda 3',
      description: 'El çizimi şık aylık ajanda tasarımı 3',
      type: 'image_template',
      colors: { bg: '#FFFFFF', accent: '#F57F17', header: '#E65100', day: '#FFFFFF', border: '#FFE082' },
      edgeColor: '#FFFFFF',
      aspectRatio: 0.70,
    },
    {
      id: 'monthly_4',
      name: 'Aylık Ajanda 4',
      description: 'El çizimi şık aylık ajanda tasarımı 4',
      type: 'image_template',
      colors: { bg: '#FFFFFF', accent: '#7B1FA2', header: '#4A148C', day: '#FFFFFF', border: '#E1BEE7' },
      edgeColor: '#FFFFFF',
      aspectRatio: 0.70,
    },
    {
      id: 'monthly_5',
      name: 'Aylık Ajanda 5',
      description: 'El çizimi şık aylık ajanda tasarımı 5',
      type: 'image_template',
      colors: { bg: '#FFFFFF', accent: '#1976D2', header: '#0D47A1', day: '#FFFFFF', border: '#BBDEFB' },
      edgeColor: '#FFFFFF',
      aspectRatio: 0.70,
    },
    {
      id: 'monthly_6',
      name: 'Aylık Ajanda 6',
      description: 'El çizimi şık aylık ajanda tasarımı 6',
      type: 'image_template',
      colors: { bg: '#F9F3EE', accent: '#8D6E63', header: '#4E342E', day: '#FFFFFF', border: '#D7CCC8' },
      edgeColor: '#F9F3EE',
      aspectRatio: 0.70,
    },
  ],
  weekly: [
    {
      id: 'weekly_cute_pink_planner',
      name: 'Pembe & Çilekli Şablon 🍓',
      description: 'Birebir orijinal el çizimi pembe haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#FFFCF9', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      edgeColor: '#FFFCF9',
      aspectRatio: 0.703,
    },
    {
      id: 'weekly_floral_grid_planner',
      name: 'Papatyalı Grid Şablon 🌼',
      description: 'Birebir orijinal çiçekli kareli haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#FBF2F5', accent: '#F57F17', header: '#E65100', day: '#FFFFFF', border: '#FFE082' },
      edgeColor: '#FBF2F5',
      aspectRatio: 0.66,
    },
    {
      id: 'weekly_flower_cloud_planner',
      name: 'Çiçekli Bulut Şablon 🌸',
      description: 'Pastel çiçekli ve çay fincanlı haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#FEF4EE', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      edgeColor: '#FEF4EE',
      aspectRatio: 0.707,
    },
    {
      id: 'weekly_ribbon_envelope_planner',
      name: 'Kurdeleli & Zarflı Şablon 🎀',
      description: 'Pembe saten kurdeleli ve mektup zarflı haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#FBF8F0', accent: '#D81B60', header: '#880E4F', day: '#FFFFFF', border: '#F8BBD0' },
      edgeColor: '#FBF8F0',
      aspectRatio: 0.707,
    },
    {
      id: 'weekly_cozy_botanical_planner',
      name: 'Cozy Botanik To-Do Şablon 🌿',
      description: 'Kahve fincanı, kitaplar ve botanik yapraklar',
      type: 'image_template',
      colors: { bg: '#FDF5EB', accent: '#8D6E63', header: '#4E342E', day: '#FFFFFF', border: '#D7CCC8' },
      edgeColor: '#FDF5EB',
      aspectRatio: 0.77,
    },
    {
      id: 'weekly_kawaii_cats_planner',
      name: 'Sevimli Kedili & Washi Bantlı Şablon 🐱',
      description: 'Pati izleri, sevimli kedicikler ve renkli bantlar',
      type: 'image_template',
      colors: { bg: '#FFF6EC', accent: '#FB8C00', header: '#E65100', day: '#FFFFFF', border: '#FFE0B2' },
      edgeColor: '#FFF6EC',
      aspectRatio: 0.67,
    },
    {
      id: 'weekly_blue_floral_planner',
      name: 'Mavi Çiçekli Şablon 💙',
      description: 'Sade pastel mavi çiçek detaylı haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#F1F5FB', accent: '#4682B4', header: '#2C5282', day: '#FFFFFF', border: '#BEE3F8' },
      edgeColor: '#F1F5FB',
      aspectRatio: 0.707,
    },
    {
      id: 'weekly_new_planner_1',
      name: 'Orijinal Haftalık Şablon 1',
      description: 'Özel eklenen el çizimi haftalık planlayıcı',
      type: 'image_template',
      colors: { bg: '#FFFCF9', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      edgeColor: '#FFFCF9',
      aspectRatio: 0.70,
    },
    {
      id: 'weekly_new_planner_2',
      name: 'Orijinal Haftalık Şablon 2',
      description: 'Özel eklenen el çizimi haftalık planlayıcı 2',
      type: 'image_template',
      colors: { bg: '#FBF2F5', accent: '#E91E63', header: '#C2185B', day: '#FFFFFF', border: '#F8BBD0' },
      edgeColor: '#FBF2F5',
      aspectRatio: 0.70,
    },
  ],
  blank: [
    {
      id: 'blank_lined',
      name: 'Çizgili Sayfa',
      colors: { bg: '#FFFFFF', accent: '#C2185B', line: '#FCE4EC' },
      edgeColor: '#FFFFFF',
      lineStyle: 'horizontal',
    },
    {
      id: 'blank_grid',
      name: 'Kareli Sayfa',
      colors: { bg: '#FFFFFF', accent: '#3F51B5', line: '#E8EAF6' },
      edgeColor: '#FFFFFF',
      lineStyle: 'grid',
    },
    {
      id: 'blank_dotted',
      name: 'Noktalı Sayfa',
      colors: { bg: '#FFFFFF', accent: '#7B1FA2', line: '#F3E5F5' },
      edgeColor: '#FFFFFF',
      lineStyle: 'dots',
    },
    {
      id: 'blank_plain',
      name: 'Düz Sayfa',
      colors: { bg: '#FFFFFF', accent: '#2E7D32', line: 'transparent' },
      edgeColor: '#FFFFFF',
      lineStyle: 'none',
    },
  ],
};

/**
 * Şablonun dış kenar rengini (edgeColor) döndürür.
 * Güvenli geri dönüş mekanizmasıyla (edgeColor -> colors.bg -> fallback) çalışır.
 */
export function getTemplateEdgeColor(template, fallback = '#FFF5F8') {
  if (!template) return fallback;
  return template.edgeColor || template.colors?.bg || fallback;
}

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
