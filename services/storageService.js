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
  getDiary: async () => {
    try {
      const data = await AsyncStorage.getItem(KEYS.DIARY);
      if (data) {
        const diary = JSON.parse(data);
        if (!diary.pages || !Array.isArray(diary.pages) || diary.pages.length === 0) {
          diary.pages = [
            {
              pageId: `page_${Date.now()}`,
              pageNumber: 1,
              createdAt: new Date().toISOString(),
              drawings: [],
              textBlocks: [],
              stickers: [],
              data: { content: '' },
            },
          ];
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
        pages: [
          {
            pageId: `page_${Date.now()}`,
            pageNumber: 1,
            createdAt: new Date().toISOString(),
            drawings: [],
            textBlocks: [],
            stickers: [],
            data: { content: '' },
          },
        ],
      };
      await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(defaultDiary));
      return defaultDiary;
    } catch (error) {
      console.warn('StorageService.getDiary hata:', error);
      return null;
    }
  },

  saveDiary: async (diaryData) => {
    try {
      const updated = {
        ...diaryData,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.warn('StorageService.saveDiary hata:', error);
      return null;
    }
  },

  addDiaryPage: async (pageData = {}) => {
    try {
      const diary = await StorageService.getDiary();
      const newPageNumber = (diary.pages?.length || 0) + 1;
      const newPage = {
        pageId: pageData.pageId || `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        pageNumber: newPageNumber,
        createdAt: new Date().toISOString(),
        drawings: pageData.drawings || [],
        textBlocks: pageData.textBlocks || [],
        stickers: pageData.stickers || [],
        data: pageData.data || { content: '' },
        ...pageData,
      };
      const updatedPages = [...(diary.pages || []), newPage];
      const updatedDiary = {
        ...diary,
        pages: updatedPages,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(updatedDiary));
      return { updatedDiary, newPage };
    } catch (error) {
      console.warn('StorageService.addDiaryPage hata:', error);
      return null;
    }
  },

  updateDiaryPage: async (pageId, pageUpdates) => {
    try {
      const diary = await StorageService.getDiary();
      const updatedPages = (diary.pages || []).map((p) => {
        if (p.pageId === pageId) {
          return { ...p, ...pageUpdates };
        }
        return p;
      });
      const updatedDiary = {
        ...diary,
        pages: updatedPages,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(updatedDiary));
      return updatedDiary;
    } catch (error) {
      console.warn('StorageService.updateDiaryPage hata:', error);
      return null;
    }
  },

  deleteDiaryPage: async (pageId) => {
    try {
      const diary = await StorageService.getDiary();
      let filtered = (diary.pages || []).filter((p) => p.pageId !== pageId);
      // Günlükte en az 1 sayfa bulunmasını garantiye al
      if (filtered.length === 0) {
        filtered = [
          {
            pageId: `page_${Date.now()}`,
            pageNumber: 1,
            createdAt: new Date().toISOString(),
            drawings: [],
            textBlocks: [],
            stickers: [],
            data: { content: '' },
          },
        ];
      } else {
        // Sayfa numaralarını yeniden sırala
        filtered = filtered.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
      }
      const updatedDiary = {
        ...diary,
        pages: filtered,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(updatedDiary));
      return updatedDiary;
    } catch (error) {
      console.warn('StorageService.deleteDiaryPage hata:', error);
      return null;
    }
  },
};
