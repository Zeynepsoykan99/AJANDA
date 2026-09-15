import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StorageService } from '../../services/storageService';
import NotebookPagesView from '../../components/notebook/NotebookPagesView';

/**
 * Günlüğüm - Çoklu sayfa ekranı
 * Tek günlük kaydını (@ajanda_diary_v1) ortak defter sayfa görünümüne bağlar.
 */
export default function GunlugumPagesScreen() {
  const { t } = useTranslation();

  const storage = useMemo(
    () => ({
      load: () => StorageService.getDiary(),
      addPage: async (pageData) => {
        const result = await StorageService.addDiaryPage(pageData);
        return result ? { notebook: result.updatedDiary, newPage: result.newPage } : null;
      },
      updatePage: (pageId, updates) => StorageService.updateDiaryPage(pageId, updates),
      deletePage: (pageId) => StorageService.deleteDiaryPage(pageId),
      restorePage: (page, index) => StorageService.restoreDiaryPage(page, index),
    }),
    []
  );

  return (
    <NotebookPagesView
      storage={storage}
      title={t('diary.title', 'Günlüğüm')}
      singlePageWarning={t('diary.singlePageWarning', 'Günlükte en az bir sayfa bulunmalıdır.')}
    />
  );
}
