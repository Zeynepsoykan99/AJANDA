import React, { useMemo, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StorageService } from '../../../services/storageService';
import NotebookPagesView from '../../../components/notebook/NotebookPagesView';

/**
 * Notlarım - Defter sayfaları
 * Seçilen defteri ortak defter sayfa görünümüne bağlar; sağ üstte defter içi arama açıktır.
 * "+" ile yeni sayfa eklerken seçicide defterin varsayılan kağıt şablonu seçili gelir.
 */
export default function NotebookPagesScreen() {
  const { t } = useTranslation();
  const { notebookId } = useLocalSearchParams();

  const storage = useMemo(
    () => ({
      load: () => StorageService.getNotebook(notebookId),
      addPage: async (pageData) => {
        const result = await StorageService.addNotebookPage(notebookId, pageData);
        return result ? { notebook: result.updatedNotebook, newPage: result.newPage } : null;
      },
      updatePage: (pageId, updates) => StorageService.updateNotebookPage(notebookId, pageId, updates),
      deletePage: (pageId) => StorageService.deleteNotebookPage(notebookId, pageId),
      restorePage: (page, index) => StorageService.restoreNotebookPage(notebookId, page, index),
    }),
    [notebookId]
  );

  const getTitle = useCallback((notebook) => notebook?.title || '', []);

  return (
    <NotebookPagesView
      storage={storage}
      title={getTitle}
      singlePageWarning={t('notebooks.singlePageWarning', 'Defterde en az bir sayfa bulunmalıdır.')}
      enableSearch
      newPageTemplateSource="notebookDefault"
    />
  );
}
