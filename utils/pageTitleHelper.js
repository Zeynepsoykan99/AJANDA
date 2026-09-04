/**
 * pageTitleHelper.js - Dinamik Sayfa Başlığı ve Kategori Çeviri Yardımcısı
 * 
 * Veritabanında (AsyncStorage) boş veya geçmişte varsayılan adlarla ("Yeni Liste", "New List" vb.)
 * kaydedilmiş sayfaların başlıklarını render anında kullanıcının o anki aktif diline dinamik olarak çevirir.
 * Kullanıcının özel olarak yazdığı başlıkları (örn: "Market Alışverişi") korur.
 */

// Sistem tarafından atanmış / bilinen tüm varsayılan başlıklar seti
export const DEFAULT_PAGE_TITLES = new Set([
  // Türkçe
  'Yeni Liste',
  'Yeni Sayfa',
  'Aylık Ajanda',
  'Haftalık Ajanda',
  'To-Do List',
  'Boş Defter',
  'İsimsiz Sayfa',
  'Ajanda Kapağı',
  'Sayfa',
  'Liste',

  // İngilizce
  'New List',
  'New Page',
  'Monthly Planner',
  'Weekly Planner',
  'Blank Notebook',
  'Untitled Page',
  'Planner Cover',
  'Page',
  'List',

  // Almanca
  'Neue Liste',
  'Neue Seite',
  'Monatsplaner',
  'Wochenplaner',
  'To-Do-Liste',
  'To-Do Liste',
  'Leeres Notizbuch',
  'Unbenannte Seite',
  'Planer-Cover',
  'Seite',

  // İspanyolca
  'Nueva Lista',
  'Nueva Página',
  'Planificador Mensual',
  'Planificador Semanal',
  'Lista de Tareas',
  'Cuaderno en Blanco',
  'Página sin título',
  'Portada de Agenda',
  'Portada de la Agenda',
  'Página',

  // Fransızca
  'Nouvelle Liste',
  'Nouvelle Page',
  'Agenda Mensuel',
  'Agenda Hebdomadaire',
  'Liste de Tâches',
  'Carnet Vierge',
  'Page sans titre',
  'Couverture de l\'Agenda',
]);

/**
 * Bir başlığın sistem varsayılanı veya boş olup olmadığını denetler.
 * @param {string} title
 * @returns {boolean}
 */
export const isDefaultTitle = (title) => {
  if (!title || typeof title !== 'string') return true;
  const trimmed = title.trim();
  if (trimmed === '') return true;
  return DEFAULT_PAGE_TITLES.has(trimmed);
};

/**
 * Sayfanın ekranda gösterilecek başlığını dinamik olarak döndürür.
 * - Özel kullanıcı başlığı varsa aynen döner.
 * - Başlık boşsa veya varsayılan başlıklardan biriyse, o anki aktif dildeki çevirisini döner.
 * 
 * @param {object} page - Sayfa veya arama sonucu objesi ({ id, title, category, ... })
 * @param {function} t - i18next çeviri fonksiyonu
 * @returns {string} Ekranda gösterilecek dinamik başlık
 */
export const getPageDisplayTitle = (page, t) => {
  if (!page) return '';

  // Kapak kontrolü
  if (page.id === 'cover' || page.category === 'cover') {
    return t ? t('agenda.coverTitle', 'Ajanda Kapağı') : 'Ajanda Kapağı';
  }

  const rawTitle = typeof page.title === 'string' ? page.title.trim() : '';

  // Kullanıcı özel bir başlık belirlediyse (ve bu başlık varsayılan listemizde değilse)
  if (rawTitle && !DEFAULT_PAGE_TITLES.has(rawTitle)) {
    return rawTitle;
  }

  // Varsayılan başlık veya boş: Kategoriye göre aktif dilde döndür
  const category = page.category;
  if (category === 'todo') {
    return t ? t('todo.defaultTitle', 'Yeni Liste') : 'Yeni Liste';
  }
  if (category === 'monthly') {
    return t ? t('agenda.categoryMonthly', 'Aylık Ajanda') : 'Aylık Ajanda';
  }
  if (category === 'weekly') {
    return t ? t('agenda.categoryWeekly', 'Haftalık Ajanda') : 'Haftalık Ajanda';
  }
  if (category === 'blank') {
    return t ? t('agenda.categoryBlank', 'Boş Defter') : 'Boş Defter';
  }

  // Genel varsayılan
  return t ? t('agenda.newPageDefault', 'Yeni Sayfa') : 'Yeni Sayfa';
};

/**
 * Kategori kimliğine (catId) göre aktif dilde kategori adını döndürür.
 * 
 * @param {string} catId - 'todo' | 'monthly' | 'weekly' | 'blank' | 'cover'
 * @param {function} t - i18next çeviri fonksiyonu
 * @param {string} fallback - Çeviri bulunamazsa kullanılacak metin
 * @returns {string}
 */
export const getCategoryDisplayName = (catId, t, fallback = '') => {
  if (!t) return fallback || catId || '';

  switch (catId) {
    case 'todo':
      return t('agenda.categoryTodo', fallback || 'Yapılacaklar');
    case 'monthly':
      return t('agenda.categoryMonthly', fallback || 'Aylık Ajanda');
    case 'weekly':
      return t('agenda.categoryWeekly', fallback || 'Haftalık Ajanda');
    case 'blank':
      return t('agenda.categoryBlank', fallback || 'Boş Defter');
    case 'cover':
      return t('search.tabCover', fallback || 'Kapak');
    default:
      return fallback || catId || '';
  }
};
