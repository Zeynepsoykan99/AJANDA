import React, { useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StorageService } from '../../services/storageService';
import NotebookCoverView from '../../components/notebook/NotebookCoverView';

/**
 * Günlüğüm - Kapak ekranı
 * Tek günlük kaydını (@ajanda_diary_v1) ortak defter kapak görünümüne bağlar.
 */
export default function GunlugumCoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const storage = useMemo(
    () => ({
      load: () => StorageService.getDiary(),
      updateMeta: (fields) => StorageService.updateDiaryMeta(fields),
    }),
    []
  );

  const getTitle = useCallback(() => t('diary.coverTitle', 'Günlük Kapağı'), [t]);
  const handleOpen = useCallback(() => router.push('/gunlugum/pages'), [router]);

  return (
    <NotebookCoverView
      storage={storage}
      getTitle={getTitle}
      openButtonLabel={t('diary.openDiaryButton', '🌸 Günlüğümü Aç')}
      onOpen={handleOpen}
    />
  );
}
