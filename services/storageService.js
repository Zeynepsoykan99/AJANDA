/**
 * AJANDA - AsyncStorage CRUD Servisi
 * Tüm veri okuma/yazma işlemleri bu servis üzerinden gerçekleştirilir.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from './notificationService';

const KEYS = {
  THEME: '@ajanda_theme',
  COVER: '@ajanda_cover',
  PAGES: '@ajanda_pages',
  LANGUAGE: '@ajanda_language',
  DIARY: '@ajanda_diary_v1',
  NOTEBOOKS: '@ajanda_notebooks_v1',
};

// ─── Defter (Günlüğüm / Notlarım) Ortak Altyapısı ─────────────────
// Günlüğüm tek bir defterdir (@ajanda_diary_v1); Notlarım ise aynı yapıdaki defterlerin dizisidir
// (@ajanda_notebooks_v1). Her ikisi de "oku -> değiştir -> yaz" yaptığı için farklı ekranlardan
// eşzamanlı gelen yazmalar birbirini ezmesin diye tüm defter işlemleri tek kuyrukta sırayla çalışır.
let journalQueue = Promise.resolve();
const withJournalLock = (task) => {
  const run = journalQueue.then(task, task);
  journalQueue = run.catch(() => {});
  return run;
};

// Kapak ekranının yazabileceği üst düzey defter alanları (pages asla buradan yazılmaz)
const NOTEBOOK_META_FIELDS = ['title', 'coverTemplateId', 'paperTemplateId', 'coverDrawings', 'coverTextBlocks', 'lastPageIndex', 'isLocked'];

const DEFAULT_PAPER_TEMPLATE_ID = 'blank_lined';
const DEFAULT_COVER_TEMPLATE_ID = 'cover_1';

const createEmptyNotebookPage = (paperTemplateId) => ({
  pageId: `page_${Date.now()}`,
  pageNumber: 1,
  paperTemplateId: paperTemplateId || DEFAULT_PAPER_TEMPLATE_ID,
  createdAt: new Date().toISOString(),
  drawings: [],
  textBlocks: [],
  stickers: [],
  data: { content: '' },
});

// Eski hatalı ekleme akışının yazdığı, hangi sticker olduğu bilgisini taşımayan (hiç görünmeyen) kayıt
const isUnrenderableSticker = (sticker) =>
  !sticker || (!sticker.type && !sticker.content && !sticker.stickerId);

/**
 * Defter kaydını okunabilir hale getirir.
 * @returns {{ notebook: object, changed: boolean }} changed: kalıcı olarak yazılması gereken bir düzeltme yapıldı mı
 */
const normalizeNotebook = (source) => {
  const notebook = { ...source };
  let changed = false;

  if (!Array.isArray(notebook.pages) || notebook.pages.length === 0) {
    notebook.pages = [createEmptyNotebookPage(notebook.paperTemplateId)];
    return { notebook, changed };
  }

  if (notebook.pages.some((p) => !p.paperTemplateId)) {
    // Kendi şablonu olmayan eski sayfalar, varsayılan sonradan değişse
    // bile görünümlerini korusunlar diye mevcut varsayılanı sayfaya sabitle
    notebook.pages = notebook.pages.map((p) =>
      p.paperTemplateId
        ? p
        : { ...p, paperTemplateId: notebook.paperTemplateId || DEFAULT_PAPER_TEMPLATE_ID }
    );
    changed = true;
  }

  if (notebook.pages.some((p) => Array.isArray(p.stickers) && p.stickers.some(isUnrenderableSticker))) {
    // Kurtarılamayan görünmez sticker kayıtlarını bir kez temizle
    notebook.pages = notebook.pages.map((p) =>
      Array.isArray(p.stickers) && p.stickers.some(isUnrenderableSticker)
        ? { ...p, stickers: p.stickers.filter((s) => !isUnrenderableSticker(s)) }
        : p
    );
    changed = true;
  }

  return { notebook, changed };
};

// Yalnızca izinli üst düzey alanları seçer; boş başlık yazılmaz
const pickNotebookMeta = (fields = {}) => {
  const safeFields = {};
  for (const key of NOTEBOOK_META_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      safeFields[key] = fields[key];
    }
  }
  if (Object.prototype.hasOwnProperty.call(safeFields, 'title')) {
    const title = typeof safeFields.title === 'string' ? safeFields.title.trim() : '';
    if (title) safeFields.title = title;
    else delete safeFields.title;
  }
  return safeFields;
};

const renumberPages = (pages) => pages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));

// ─── Saf sayfa işlemleri (defter nesnesi alır, yeni defter nesnesi döndürür) ───
const notebookWithAddedPage = (notebook, pageData = {}) => {
  const newPage = {
    pageId: pageData.pageId || `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    pageNumber: (notebook.pages?.length || 0) + 1,
    paperTemplateId:
      pageData.paperTemplateId ||
      (notebook.pages?.length ? notebook.pages[notebook.pages.length - 1]?.paperTemplateId : null) ||
      notebook.paperTemplateId ||
      DEFAULT_PAPER_TEMPLATE_ID,
    createdAt: new Date().toISOString(),
    drawings: pageData.drawings || [],
    textBlocks: pageData.textBlocks || [],
    stickers: pageData.stickers || [],
    data: pageData.data || { content: '' },
    ...pageData,
  };
  return { notebook: { ...notebook, pages: [...(notebook.pages || []), newPage] }, newPage };
};

const notebookWithUpdatedPage = (notebook, pageId, pageUpdates) => ({
  ...notebook,
  pages: (notebook.pages || []).map((p) => (p.pageId === pageId ? { ...p, ...pageUpdates } : p)),
});

const notebookWithDeletedPage = (notebook, pageId) => {
  const filtered = (notebook.pages || []).filter((p) => p.pageId !== pageId);
  // Defterde en az 1 sayfa bulunmasını garantiye al
  return {
    ...notebook,
    pages: filtered.length === 0 ? [createEmptyNotebookPage(notebook.paperTemplateId)] : renumberPages(filtered),
  };
};

const notebookWithRestoredPage = (notebook, page, index) => {
  const pages = (notebook.pages || []).filter((p) => p.pageId !== page.pageId);
  const insertAt = Math.max(0, Math.min(typeof index === 'number' ? index : pages.length, pages.length));
  pages.splice(insertAt, 0, page);
  return { ...notebook, pages: renumberPages(pages) };
};

const touchNotebook = (notebook) => ({ ...notebook, updatedAt: new Date().toISOString() });

// Sayfada çizim, dolu metin kutusu veya sticker yoksa boş sayılır (boş metin kutuları metin sayılmaz)
const isNotebookPageEmpty = (page) =>
  !(Array.isArray(page?.drawings) && page.drawings.length > 0) &&
  !(Array.isArray(page?.textBlocks) && page.textBlocks.some((b) => typeof b?.text === 'string' && b.text.trim())) &&
  !(Array.isArray(page?.stickers) && page.stickers.length > 0);

/**
 * Notlarım: Kapakta varsayılan kağıt şablonu değişince defterin otomatik oluşturulmuş ilk sayfasını da günceller.
 * Yalnızca şu durumda uygulanır: defterde tek sayfa var, o sayfa boş ve şablonu önceki varsayılanla aynı.
 * Aksi halde "varsayılan yalnızca yeni sayfaları etkiler" kuralı geçerlidir.
 */
const notebookWithDefaultPaperApplied = (previous, next) => {
  const previousDefault = previous.paperTemplateId || DEFAULT_PAPER_TEMPLATE_ID;
  const nextDefault = next.paperTemplateId || DEFAULT_PAPER_TEMPLATE_ID;
  const pages = next.pages || [];
  if (nextDefault === previousDefault || pages.length !== 1) return next;

  const [onlyPage] = pages;
  const pageTemplate = onlyPage.paperTemplateId || previousDefault;
  if (pageTemplate !== previousDefault || !isNotebookPageEmpty(onlyPage)) return next;

  return { ...next, pages: [{ ...onlyPage, paperTemplateId: nextDefault }] };
};

// ─── Günlüğüm kaydı (kilitsiz okuma/yazma: yalnızca withJournalLock içinden çağrılmalıdır) ───
const readDiary = async () => {
  const data = await AsyncStorage.getItem(KEYS.DIARY);
  if (data) {
    const { notebook: diary, changed } = normalizeNotebook(JSON.parse(data));
    if (changed) {
      await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(diary));
    }
    return diary;
  }
  // Varsayılan yeni günlük kaydı
  const defaultDiary = {
    id: 'my_diary',
    title: 'Günlüğüm',
    coverTemplateId: DEFAULT_COVER_TEMPLATE_ID,
    paperTemplateId: DEFAULT_PAPER_TEMPLATE_ID,
    coverDrawings: [],
    coverTextBlocks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pages: [createEmptyNotebookPage(DEFAULT_PAPER_TEMPLATE_ID)],
  };
  await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(defaultDiary));
  return defaultDiary;
};

const writeDiary = async (diary) => {
  const updated = touchNotebook(diary);
  await AsyncStorage.setItem(KEYS.DIARY, JSON.stringify(updated));
  return updated;
};

// ─── Notlarım defter listesi (kilitsiz okuma/yazma: yalnızca withJournalLock içinden çağrılmalıdır) ───
const readNotebooks = async () => {
  const data = await AsyncStorage.getItem(KEYS.NOTEBOOKS);
  if (!data) return [];
  const parsed = JSON.parse(data);
  if (!Array.isArray(parsed)) return [];
  let anyChanged = false;
  const notebooks = parsed.filter(Boolean).map((raw) => {
    const { notebook, changed } = normalizeNotebook(raw);
    if (changed) anyChanged = true;
    return notebook;
  });
  if (anyChanged) {
    await AsyncStorage.setItem(KEYS.NOTEBOOKS, JSON.stringify(notebooks));
  }
  return notebooks;
};

const writeNotebooks = async (notebooks) => {
  await AsyncStorage.setItem(KEYS.NOTEBOOKS, JSON.stringify(notebooks));
  return notebooks;
};

// En son düzenlenen defter en üstte
const sortNotebooksByUpdatedAt = (notebooks) =>
  [...notebooks].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

/**
 * Tek bir defteri güncel liste üzerinde değiştirip kaydeder.
 * @param {string} notebookId
 * @param {(notebook) => { notebook: object, [key: string]: any }} mutate - saf dönüşüm
 * @returns {Promise<object|null>} mutate sonucu (notebook alanı kaydedilmiş defterdir) veya defter yoksa null
 */
const mutateNotebook = async (notebookId, mutate) => {
  const notebooks = await readNotebooks();
  const index = notebooks.findIndex((nb) => nb.id === notebookId);
  if (index === -1) return null;
  const result = mutate(notebooks[index]);
  const saved = touchNotebook(result.notebook);
  notebooks[index] = saved;
  await writeNotebooks(notebooks);
  return { ...result, notebook: saved };
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
      const pageToDelete = pages.find((p) => p.id === pageId);
      if (pageToDelete?.reminder?.notificationId) {
        NotificationService.cancelScheduledNotification(pageToDelete.reminder.notificationId).catch(() => {});
      }
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
  // Tüm defter işlemleri withJournalLock kuyruğunda sırayla çalışır.
  getDiary: async () =>
    withJournalLock(async () => {
      try {
        return await readDiary();
      } catch (error) {
        console.warn('StorageService.getDiary hata:', error);
        return null;
      }
    }),

  saveDiary: async (diaryData) =>
    withJournalLock(async () => {
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
   * @param {object} fields - NOTEBOOK_META_FIELDS içindeki alanlar
   */
  updateDiaryMeta: async (fields = {}) =>
    withJournalLock(async () => {
      try {
        const diary = await readDiary();
        const merged = { ...diary, ...pickNotebookMeta(fields) };
        return await writeDiary(notebookWithDefaultPaperApplied(diary, merged));
      } catch (error) {
        console.warn('StorageService.updateDiaryMeta hata:', error);
        return null;
      }
    }),

  addDiaryPage: async (pageData = {}) =>
    withJournalLock(async () => {
      try {
        const diary = await readDiary();
        const { notebook, newPage } = notebookWithAddedPage(diary, pageData);
        const updatedDiary = await writeDiary(notebook);
        return { updatedDiary, newPage };
      } catch (error) {
        console.warn('StorageService.addDiaryPage hata:', error);
        return null;
      }
    }),

  updateDiaryPage: async (pageId, pageUpdates) =>
    withJournalLock(async () => {
      try {
        const diary = await readDiary();
        return await writeDiary(notebookWithUpdatedPage(diary, pageId, pageUpdates));
      } catch (error) {
        console.warn('StorageService.updateDiaryPage hata:', error);
        return null;
      }
    }),

  deleteDiaryPage: async (pageId) =>
    withJournalLock(async () => {
      try {
        const diary = await readDiary();
        return await writeDiary(notebookWithDeletedPage(diary, pageId));
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
    withJournalLock(async () => {
      try {
        if (!page?.pageId) return null;
        const diary = await readDiary();
        return await writeDiary(notebookWithRestoredPage(diary, page, index));
      } catch (error) {
        console.warn('StorageService.restoreDiaryPage hata:', error);
        return null;
      }
    }),

  // ─── Notlarım (Çoklu Defter) ───────────────────────────
  /**
   * Tüm defterleri en son düzenlenen üstte olacak şekilde döndürür.
   */
  getNotebooks: async () =>
    withJournalLock(async () => {
      try {
        return sortNotebooksByUpdatedAt(await readNotebooks());
      } catch (error) {
        console.warn('StorageService.getNotebooks hata:', error);
        return [];
      }
    }),

  getNotebook: async (notebookId) =>
    withJournalLock(async () => {
      try {
        const notebooks = await readNotebooks();
        return notebooks.find((nb) => nb.id === notebookId) || null;
      } catch (error) {
        console.warn('StorageService.getNotebook hata:', error);
        return null;
      }
    }),

  /**
   * Yeni defter oluşturur. Başlık boşsa oluşturulmaz (null döner).
   * @param {{ title: string, coverTemplateId?: string }} data
   */
  createNotebook: async ({ title, coverTemplateId } = {}) =>
    withJournalLock(async () => {
      try {
        const cleanTitle = typeof title === 'string' ? title.trim() : '';
        if (!cleanTitle) return null;
        const now = new Date().toISOString();
        const notebook = {
          id: `nb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: cleanTitle,
          coverTemplateId: coverTemplateId || DEFAULT_COVER_TEMPLATE_ID,
          paperTemplateId: DEFAULT_PAPER_TEMPLATE_ID,
          coverDrawings: [],
          coverTextBlocks: [],
          createdAt: now,
          updatedAt: now,
          pages: [createEmptyNotebookPage(DEFAULT_PAPER_TEMPLATE_ID)],
        };
        const notebooks = await readNotebooks();
        await writeNotebooks([...notebooks, notebook]);
        return notebook;
      } catch (error) {
        console.warn('StorageService.createNotebook hata:', error);
        return null;
      }
    }),

  /**
   * Defterin yalnızca üst düzey alanlarını (ad, kapak, varsayılan şablon, kapak çizimi/metni) günceller.
   */
  updateNotebookMeta: async (notebookId, fields = {}) =>
    withJournalLock(async () => {
      try {
        const result = await mutateNotebook(notebookId, (nb) => ({
          notebook: notebookWithDefaultPaperApplied(nb, { ...nb, ...pickNotebookMeta(fields) }),
        }));
        return result ? result.notebook : null;
      } catch (error) {
        console.warn('StorageService.updateNotebookMeta hata:', error);
        return null;
      }
    }),

  /**
   * Defteri siler ve silinen defter nesnesini döndürür (Geri Al için).
   */
  deleteNotebook: async (notebookId) =>
    withJournalLock(async () => {
      try {
        const notebooks = await readNotebooks();
        const deleted = notebooks.find((nb) => nb.id === notebookId);
        if (!deleted) return null;
        await writeNotebooks(notebooks.filter((nb) => nb.id !== notebookId));
        return deleted;
      } catch (error) {
        console.warn('StorageService.deleteNotebook hata:', error);
        return null;
      }
    }),

  /**
   * Silinen defteri içeriği ve son düzenlenme zamanıyla geri ekler (Geri Al).
   */
  restoreNotebook: async (notebook) =>
    withJournalLock(async () => {
      try {
        if (!notebook?.id) return null;
        const notebooks = await readNotebooks();
        if (notebooks.some((nb) => nb.id === notebook.id)) return notebook;
        await writeNotebooks([...notebooks, notebook]);
        return notebook;
      } catch (error) {
        console.warn('StorageService.restoreNotebook hata:', error);
        return null;
      }
    }),

  addNotebookPage: async (notebookId, pageData = {}) =>
    withJournalLock(async () => {
      try {
        const result = await mutateNotebook(notebookId, (nb) => notebookWithAddedPage(nb, pageData));
        return result ? { updatedNotebook: result.notebook, newPage: result.newPage } : null;
      } catch (error) {
        console.warn('StorageService.addNotebookPage hata:', error);
        return null;
      }
    }),

  updateNotebookPage: async (notebookId, pageId, pageUpdates) =>
    withJournalLock(async () => {
      try {
        const result = await mutateNotebook(notebookId, (nb) => ({
          notebook: notebookWithUpdatedPage(nb, pageId, pageUpdates),
        }));
        return result ? result.notebook : null;
      } catch (error) {
        console.warn('StorageService.updateNotebookPage hata:', error);
        return null;
      }
    }),

  deleteNotebookPage: async (notebookId, pageId) =>
    withJournalLock(async () => {
      try {
        const result = await mutateNotebook(notebookId, (nb) => ({
          notebook: notebookWithDeletedPage(nb, pageId),
        }));
        return result ? result.notebook : null;
      } catch (error) {
        console.warn('StorageService.deleteNotebookPage hata:', error);
        return null;
      }
    }),

  restoreNotebookPage: async (notebookId, page, index) =>
    withJournalLock(async () => {
      try {
        if (!page?.pageId) return null;
        const result = await mutateNotebook(notebookId, (nb) => ({
          notebook: notebookWithRestoredPage(nb, page, index),
        }));
        return result ? result.notebook : null;
      } catch (error) {
        console.warn('StorageService.restoreNotebookPage hata:', error);
        return null;
      }
    }),
};
