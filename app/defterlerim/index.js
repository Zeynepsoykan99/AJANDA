import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import { getCoverTemplateById } from '../../constants/coverTemplates';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import ImageWithSkeleton from '../../components/ui/ImageWithSkeleton';
import UndoToast from '../../components/ui/UndoToast';
import NotebookFormSheet from '../../components/notebook/NotebookFormSheet';
import NotebookActionSheet from '../../components/notebook/NotebookActionSheet';
import {
  authenticateWithBiometrics,
  unlockSession,
  lockSession,
} from '../../services/biometricService';

// Bir sheet kapanırken diğeri açılacaksa, iki Modal'ın aynı anda geçiş yapmaması için bekleme süresi
const SHEET_SWITCH_DELAY = 300;

/**
 * NotebooksScreen - Notlarım (Defter Rafı)
 * Kullanıcının defterlerini kapak görselli ızgarada listeler (en son düzenlenen üstte).
 * Sağ üstten defter eklenir; uzun basınca yeniden adlandırma / silme menüsü açılır.
 */
export default function NotebooksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [notebooks, setNotebooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [undoToast, setUndoToast] = useState({ visible: false, message: '' });
  const undoActionRef = useRef(null);

  const numColumns = isTablet ? 4 : 2;

  const loadNotebooks = useCallback(async () => {
    const list = await StorageService.getNotebooks();
    setNotebooks(list || []);
    setIsLoading(false);
  }, []);

  // Ekran her odaklandığında güncel listeyi oku (defter içinde yapılan düzenlemeler sıralamaya yansır)
  useFocusEffect(
    useCallback(() => {
      loadNotebooks();
    }, [loadNotebooks])
  );

  const handleCreate = useCallback(
    async ({ title, coverTemplateId }) => {
      setIsCreateVisible(false);
      const created = await StorageService.createNotebook({ title, coverTemplateId });
      if (created) await loadNotebooks();
    },
    [loadNotebooks]
  );

  const handleOpenRename = useCallback(() => {
    const target = actionTarget;
    setActionTarget(null);
    setTimeout(() => setRenameTarget(target), SHEET_SWITCH_DELAY);
  }, [actionTarget]);

  const handleRename = useCallback(
    async ({ title }) => {
      const target = renameTarget;
      setRenameTarget(null);
      if (!target) return;
      await StorageService.updateNotebookMeta(target.id, { title });
      await loadNotebooks();
    },
    [renameTarget, loadNotebooks]
  );

  // Kilit durumunu değiştir (biyometrik onay gerektirir)
  const handleToggleLock = useCallback(async () => {
    const target = actionTarget;
    setActionTarget(null);
    if (!target) return;

    const isCurrentlyLocked = !!target.isLocked;
    const promptMessage = isCurrentlyLocked
      ? t('security.unlockToRemoveLock', 'Kilidi kaldırmak için kimliğinizi doğrulayın')
      : t('security.lockConfirm', 'Bu defteri kilitlemek için kimliğinizi doğrulayın');

    const result = await authenticateWithBiometrics({
      promptMessage,
      fallbackLabel: t('security.fallbackPasscode', 'Cihaz Parolasını Kullan'),
      cancelLabel: t('common.cancel', 'Vazgeç'),
    });

    if (result.success) {
      const nextLocked = !isCurrentlyLocked;
      await StorageService.updateNotebookMeta(target.id, { isLocked: nextLocked });
      if (nextLocked) {
        unlockSession(target.id);
      } else {
        lockSession(target.id);
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      await loadNotebooks();
    } else if (result.error && result.error !== 'user_cancel' && result.error !== 'system_cancel') {
      Alert.alert(
        t('common.error', 'Hata'),
        t('security.authFailed', 'Kimlik doğrulanamadı. Lütfen tekrar deneyin.')
      );
    }
  }, [actionTarget, loadNotebooks, t]);

  // Silme: hemen kalıcı silinir, "Geri Al" ile içeriği ve son düzenlenme zamanıyla geri eklenir
  const handleDelete = useCallback(async () => {
    const target = actionTarget;
    setActionTarget(null);
    if (!target) return;
    const deleted = await StorageService.deleteNotebook(target.id);
    if (!deleted) return;
    setNotebooks((prev) => prev.filter((nb) => nb.id !== target.id));
    undoActionRef.current = deleted;
    setUndoToast({
      visible: true,
      id: Date.now(),
      message: t('notebooks.deleted', {
        title: deleted.title,
        defaultValue: `"${deleted.title}" silindi`,
      }),
    });
  }, [actionTarget, t]);

  const handleUndoDelete = useCallback(async () => {
    const notebook = undoActionRef.current;
    undoActionRef.current = null;
    setUndoToast({ visible: false, message: '' });
    if (!notebook) return;
    await StorageService.restoreNotebook(notebook);
    await loadNotebooks();
  }, [loadNotebooks]);

  const handleDismissUndo = useCallback(() => {
    undoActionRef.current = null;
    setUndoToast({ visible: false, message: '' });
  }, []);

  const renderNotebook = ({ item }) => {
    const cover = getCoverTemplateById(item.coverTemplateId);
    return (
      <View style={[styles.cell, { width: `${100 / numColumns}%` }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push(`/defterlerim/${item.id}`)}
          onLongPress={() => setActionTarget(item)}
          delayLongPress={350}
          style={styles.cardTouchable}
          accessibilityLabel={item.title}
        >
          <View style={styles.coverShadow}>
            <ImageWithSkeleton source={cover.imageSource} style={styles.coverImage} resizeMode="cover" />
            {/* Cilt sırtı */}
            <View style={styles.coverSpine} pointerEvents="none" />
            {/* Kilit Rozeti */}
            {item.isLocked ? (
              <View style={styles.shelfLockBadge} pointerEvents="none">
                <MaterialCommunityIcons name="lock" size={14} color="#FFFFFF" />
              </View>
            ) : null}
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="bookshelf" size={64} color={colors.accent + '40'} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {t('notebooks.emptyTitle', 'Henüz defter yok')}
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary + '99' }]}>
        {t('notebooks.emptyDesc', 'Sağ üstteki + butonuyla ilk defterini oluştur.')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Üst Bar */}
      <View style={[styles.headerBar, isTablet && styles.tabletContainer]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityLabel={t('common.back', 'Geri')}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
          {t('subpages.notebooks', 'defterlerim')}
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsCreateVisible(true)}
          style={[styles.headerButton, styles.addButton, { backgroundColor: colors.accent, borderColor: colors.accent }]}
          accessibilityLabel={t('notebooks.addNotebook', 'Defter Ekle')}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Defter Rafı */}
      <View style={[styles.listWrapper, isTablet && styles.tabletContainer]}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
        ) : (
          <FlatList
            key={`shelf_${numColumns}`}
            data={notebooks}
            numColumns={numColumns}
            keyExtractor={(item) => item.id}
            renderItem={renderNotebook}
            contentContainerStyle={[styles.listContent, notebooks.length === 0 && styles.emptyListContent]}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <NotebookFormSheet
        visible={isCreateVisible}
        mode="create"
        onClose={() => setIsCreateVisible(false)}
        onSubmit={handleCreate}
      />

      <NotebookFormSheet
        visible={!!renameTarget}
        mode="rename"
        initialTitle={renameTarget?.title || ''}
        onClose={() => setRenameTarget(null)}
        onSubmit={handleRename}
      />

      <NotebookActionSheet
        visible={!!actionTarget}
        notebookTitle={actionTarget?.title}
        isLocked={!!actionTarget?.isLocked}
        onClose={() => setActionTarget(null)}
        onRename={handleOpenRename}
        onToggleLock={handleToggleLock}
        onDelete={handleDelete}
      />

      <UndoToast
        key={undoToast.id}
        visible={undoToast.visible}
        message={undoToast.message}
        onUndo={handleUndoDelete}
        onDismiss={handleDismissUndo}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    shadowColor: '#C2185B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabletContainer: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  listWrapper: {
    flex: 1,
  },
  loader: {
    marginTop: 60,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  cell: {
    padding: 10,
  },
  cardTouchable: {
    alignItems: 'center',
  },
  coverShadow: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverSpine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  shelfLockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
