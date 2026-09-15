/**
 * AJANDA - AsyncStorage CRUD Servisi
 * Tüm veri okuma/yazma işlemleri bu servis üzerinden gerçekleştirilir.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  THEME: '@ajanda_theme',
  COVER: '@ajanda_cover',
  PAGES: '@ajanda_pages',
  LANGUAGE: '@ajanda_language',
  DIARY: '@ajanda_diary_v1',
};

// Günlük kaydı tek bir JSON anahtarında tutulur ve her yazma "oku -> değiştir -> yaz" yapar.
// Farklı ekranlardan eşzamanlı gelen yazmalar birbirinin değişikliğini ezmesin diye
// tüm günlük okuma/yazma işlemleri bu kuyrukta sırayla çalıştırılır.
let diaryQueue = Promise.resolve();
const withDiaryLock = (task) => {
  const run = diaryQueue.then(task, task);
  diaryQueue = run.catch(() => {});
  return run;
};

// Kapak ekranının yazabileceği üst düzey günlük alanları (pages asla buradan yazılmaz)
const DIARY_META_FIELDS = ['title', 'coverTemplateId', 'paperTemplateId', 'coverDrawings', 'coverTextBlocks'];

const createEmptyDiaryPage = (paperTemplateId) => ({
  pageId: `page_${Date.now()}`,
  pageNumber: 1,
  paperTemplateId: paperTemplateId || 'blank_lined',
  createdAt: new Date().toISOString(),
  drawings: [],
  textBlocks: [],
  stickers: [],
  data: { content: '' },
});

// Kilitsiz okuma: yalnızca withDiaryLock içinden çağrılmalıdır
const readDiary = async () => {
  const data = await AsyncStorage.getItem(KEYS.DIARY);
  if (data) {
    const diary = JSON.parse(data);
    if (!diary.pages || !Array.isArray(diary.pages) || diary.pages.length === 0) {
      diary.pages = [createEmptyDiaryPage(diary.paperTemplateId)];
    } else if (diary.pages.some((p) => !p.paperTemplateId)) {
      // Kendi şablonu olmayan eski sayfalar, günlük varsayılanı sonradan değişse
      // bile görünümlerini korusunlar diye mevcut varsayılanı sayfaya sabitle
      diary.pages = diary.pages.map((p) =>
        p.paperTemplateId
          ? p
          : { ...p, paperTemplateId: diary.paperTemplateId || 'blank_lined' }
      );
      await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(diary));
    }
    return diary;
  }
  // Varsayılan yeni günlük kaydı
  const defaultDiary = {
    id: 'my_diary',
    title: 'Günlüğüm',
    coverTemplateId: 'cover_1',
    paperTemplateId: 'blank_lined',
    coverDrawings: [],
    coverTextBlocks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pages: [createEmptyDiaryPage('blank_lined')],
  };
  await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(defaultDiary));
  return defaultDiary;
};

// Kilitsiz yazma: yalnızca withDiaryLock içinden çağrılmalıdır
const writeDiary = async (diary) => {
  const updated = { ...diary, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(updated));
  return updated;
};

export const StorageService = {
  // ─── Dil (Language) ──────────────────────────────────
  getLanguage: async () => {
    try {
      return await AsyncStorage.getItem(KEYS.LANGUAGE);
    } catch (error) {
      console.warn('StorageService.getLanguage hata:', error);
      return null;
    }
  },

  setLanguage: async (languageCode) => {
    try {
      await AsyncStorage.setItem(KEYS.LANGUAGE, languageCode);
    } catch (error) {
      console.warn('StorageService.setLanguage hata:', error);
    }
  },

  // ─── Tema ─────────────────────────────────────────────
  getTheme: async () => {
    try {
      return await AsyncStorage.getItem(KEYS.THEME);
    } catch (error) {
      console.warn('StorageService.getTheme hata:', error);
      return null;
    }
  },

  setTheme: async (themeId) => {
    try {
      await AsyncStorage.setItem(KEYS.THEME, themeId);
    } catch (error) {
      console.warn('StorageService.setTheme hata:', error);
    }
  },

  // ─── Kapak (Cover) ───────────────────────────────────
  getCover: async () => {
    try {
      const data = await AsyncStorage.getItem(KEYS.COVER);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('StorageService.getCover hata:', error);
      return null;
    }
  },

  setCover: async (coverData) => {
    try {
      await AsyncStorage.setItem(KEYS.COVER, JSON.stringify(coverData));
    } catch (error) {
      console.warn('StorageService.setCover hata:', error);
    }
  },

  // ─── Sayfalar ─────────────────────────────────────────
  getPages: async () => {
    try {
      const data = await AsyncStorage.getItem(KEYS.PAGES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('StorageService.getPages hata:', error);
      return [];
    }
  },

  addPage: async (page) => {
    try {
      const pages = await StorageService.getPages();
      pages.push(page);
      await AsyncStorage.setItem(KEYS.PAGES, JSON.stringify(pages));
      return pages;
    } catch (error) {
      console.warn('StorageService.addPage hata:', error);
      return null;
    }
  },

  updatePage: async (pageId, updates) => {
    try {
      const pages = await StorageService.getPages();
      const index = pages.findIndex((p) => p.id === pageId);
      if (index !== -1) {
        pages[index] = { ...pages[index], ...updates };
        await AsyncStorage.setItem(KEYS.PAGES, JSON.stringify(pages));
      }
      return pages;
    } catch (error) {
      console.warn('StorageService.updatePage hata:', error);
      return null;
    }
  },

  deletePage: async (pageId) => {
    try {
      const pages = await StorageService.getPages();
      const filtered = pages.filter((p) => p.id !== pageId);
      await AsyncStorage.setItem(KEYS.PAGES, JSON.stringify(filtered));
      return filtered;
    } catch (error) {
      console.warn('StorageService.deletePage hata:', error);
      return null;
    }
  },

  reorderPages: async (orderedIds) => {
    try {
      const pages = await StorageService.getPages();
      const reordered = orderedIds
        .map((id, index) => {
          const page = pages.find((p) => p.id === id);
          return page ? { ...page, order: index } : null;
        })
        .filter(Boolean);
      await AsyncStorage.setItem(KEYS.PAGES, JSON.stringify(reordered));
      return reordered;
    } catch (error) {
      console.warn('StorageService.reorderPages hata:', error);
      return null;
    }
  },

  // ─── Günlüğüm (My Diary - Çoklu Sayfa) ─────────────────
  // Tüm günlük işlemleri withDiaryLock kuyruğunda sırayla çalışır.
  getDiary: async () =>
    withDiaryLock(async () => {
      try {
        return await readDiary();
      } catch (error) {
        console.warn('StorageService.getDiary hata:', error);
        return null;
      }
    }),

  saveDiary: async (diaryData) =>
    withDiaryLock(async () => {
      try {
        return await writeDiary(diaryData);
      } catch (error) {
        console.warn('StorageService.saveDiary hata:', error);
        return null;
      }
    }),

  /**
   * Günlüğün yalnızca üst düzey (kapak / varsayılan şablon) alanlarını güncel kayıt üzerine birleştirir.
   * pages dizisine dokunmaz; böylece bayat bir ekran state'i sayfa içeriklerini ezemez.
   * @param {object} fields - DIARY_META_FIELDS içindeki alanlar
   */
  updateDiaryMeta: async (fields = {}) =>
    withDiaryLock(async () => {
      try {
        const diary = await readDiary();
        const safeFields = {};
        for (const key of DIARY_META_FIELDS) {
          if (Object.prototype.hasOwnProperty.call(fields, key)) {
            safeFields[key] = fields[key];
          }
        }
        return await writeDiary({ ...diary, ...safeFields });
      } catch (error) {
        console.warn('StorageService.updateDiaryMeta hata:', error);
        return null;
      }
    }),

  addDiaryPage: async (pageData = {}) =>
    withDiaryLock(async () => {
      try {
        const diary = await readDiary();
        const newPageNumber = (diary.pages?.length || 0) + 1;
        const newPage = {
          pageId: pageData.pageId || `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          pageNumber: newPageNumber,
          paperTemplateId: pageData.paperTemplateId || diary.paperTemplateId || 'blank_lined',
          createdAt: new Date().toISOString(),
          drawings: pageData.drawings || [],
          textBlocks: pageData.textBlocks || [],
          stickers: pageData.stickers || [],
          data: pageData.data || { content: '' },
          ...pageData,
        };
        const updatedDiary = await writeDiary({
          ...diary,
          pages: [...(diary.pages || []), newPage],
        });
        return { updatedDiary, newPage };
      } catch (error) {
        console.warn('StorageService.addDiaryPage hata:', error);
        return null;
      }
    }),

  updateDiaryPage: async (pageId, pageUpdates) =>
    withDiaryLock(async () => {
      try {
        const diary = await readDiary();
        const updatedPages = (diary.pages || []).map((p) => {
          if (p.pageId === pageId) {
            return { ...p, ...pageUpdates };
          }
          return p;
        });
        return await writeDiary({ ...diary, pages: updatedPages });
      } catch (error) {
        console.warn('StorageService.updateDiaryPage hata:', error);
        return null;
      }
    }),

  deleteDiaryPage: async (pageId) =>
    withDiaryLock(async () => {
      try {
        const diary = await readDiary();
        let filtered = (diary.pages || []).filter((p) => p.pageId !== pageId);
        // Günlükte en az 1 sayfa bulunmasını garantiye al
        if (filtered.length === 0) {
          filtered = [createEmptyDiaryPage(diary.paperTemplateId)];
        } else {
          // Sayfa numaralarını yeniden sırala
          filtered = filtered.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
        }
        return await writeDiary({ ...diary, pages: filtered });
      } catch (error) {
        console.warn('StorageService.deleteDiaryPage hata:', error);
        return null;
      }
    }),

  /**
   * Silinen bir günlük sayfasını içeriğiyle birlikte eski sırasına geri ekler (Geri Al).
   * @param {object} page - Silinmeden önceki tam sayfa nesnesi
   * @param {number} index - Sayfanın eski sıra indeksi
   */
  restoreDiaryPage: async (page, index) =>
    withDiaryLock(async () => {
      try {
        if (!page?.pageId) return null;
        const diary = await readDiary();
        const pages = (diary.pages || []).filter((p) => p.pageId !== page.pageId);
        const insertAt = Math.max(0, Math.min(typeof index === 'number' ? index : pages.length, pages.length));
        pages.splice(insertAt, 0, page);
        const renumbered = pages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
        return await writeDiary({ ...diary, pages: renumbered });
      } catch (error) {
        console.warn('StorageService.restoreDiaryPage hata:', error);
        return null;
      }
    }),
};
