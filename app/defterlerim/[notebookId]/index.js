import React, { useMemo, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StorageService } from '../../../services/storageService';
import NotebookCoverView from '../../../components/notebook/NotebookCoverView';

/**
 * Notlarım - Defter kapağı
 * Seçilen defteri (@ajanda_notebooks_v1) ortak defter kapak görünümüne bağlar.
 */
export default function NotebookCoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notebookId } = useLocalSearchParams();

  const storage = useMemo(
    () => ({
      load: () => StorageService.getNotebook(notebookId),
      updateMeta: (fields) => StorageService.updateNotebookMeta(notebookId, fields),
    }),
    [notebookId]
  );

  const handleOpen = useCallback(
    () => router.push(`/defterlerim/${notebookId}/pages`),
    [router, notebookId]
  );

  return (
    <NotebookCoverView
      storage={storage}
      openButtonLabel={t('notebooks.openButton', '📓 Defteri Aç')}
      onOpen={handleOpen}
    />
  );
}
