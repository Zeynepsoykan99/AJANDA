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
};
