import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import PageThumbnail from '../../components/PageThumbnail';
import AddTodoModal from '../../components/AddTodoModal';
import ListSkeleton from '../../components/ui/ListSkeleton';
import UndoToast from '../../components/ui/UndoToast';
import ReminderPickerModal from '../../components/ui/ReminderPickerModal';
import GlobalFilterHeader, { isSameDay, formatFilterDate } from '../../components/ui/GlobalFilterHeader';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import { getPageDisplayTitle } from '../../utils/pageTitleHelper';
import { NotificationService } from '../../services/notificationService';

/**
 * TodoListScreen - Yapılacaklar Ana Ekranı
 * Yalnızca To-Do kategorisindeki sayfaları listeler.
 */
export default function TodoListScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [todoPages, setTodoPages] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(null);
  const [undoToast, setUndoToast] = useState({ visible: false, message: '' });
  const [reminderTarget, setReminderTarget] = useState(null);

  // Geri al (Undo) için bekleyen silme referansı
  const pendingDeleteRef = useRef(null);

  // Filtre aktifken yerelleştirilmiş tarih etiketi
  const filterLabel = useMemo(
    () => formatFilterDate(filterDate, i18n.language),
    [filterDate, i18n.language]
  );

  // Filtrelenmiş veri
  const displayPages = useMemo(() => {
    if (!filterDate) return todoPages;
    return todoPages.filter((p) => isSameDay(p.createdAt, filterDate));
  }, [todoPages, filterDate]);

  // Verileri yükle (Ekran her odaklandığında çalışır)
  useFocusEffect(
    useCallback(() => {
      loadTodoPages();
    }, [])
  );

  const loadTodoPages = async () => {
    try {
      const allPages = await StorageService.getPages();
      const todos = allPages.filter((page) => page.category === 'todo');
      setTodoPages(todos.sort((a, b) => (b.order || 0) - (a.order || 0)));
    } catch (error) {
      console.warn('To-Do sayfaları yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Yeni To-Do ekle
  const handleAddTodo = useCallback(
    async (newPage) => {
      const updatedPages = await StorageService.addPage(newPage);
      if (updatedPages) {
        const todos = updatedPages.filter((page) => page.category === 'todo');
        setTodoPages(todos.sort((a, b) => (b.order || 0) - (a.order || 0)));
      }
    },
    []
  );

  // Hatırlatıcı Kaydet
  const handleSaveReminder = useCallback(
    async (selectedDate) => {
      if (!reminderTarget) return;
      try {
        if (reminderTarget.reminder?.notificationId) {
          await NotificationService.cancelScheduledNotification(reminderTarget.reminder.notificationId);
        }

        const notifResult = await NotificationService.scheduleReminderNotification({
          title: getPageDisplayTitle(reminderTarget, t),
          body: t('reminder.notificationBody', 'Yapılacaklar listeniz için hatırlatıcı!'),
          date: selectedDate,
          t,
          data: {
            pageId: reminderTarget.id,
            category: reminderTarget.category,
            route: `/todolist/${reminderTarget.id}`,
          },
        });

        if (!notifResult?.success || !notifResult?.notificationId) {
          return;
        }

        const updatedReminder = {
          notificationId: notifResult.notificationId,
          date: selectedDate.toISOString(),
        };

        const updatedPage = {
          ...reminderTarget,
          reminder: updatedReminder,
        };

        await StorageService.updatePage(reminderTarget.id, { reminder: updatedReminder });
        setTodoPages((prev) =>
          prev.map((p) => (p.id === reminderTarget.id ? updatedPage : p))
        );
        setReminderTarget(null);
      } catch (error) {
        console.warn('Hatırlatıcı kaydedilirken hata:', error);
      }
    },
    [reminderTarget, t]
  );

  // Hatırlatıcı Kaldır
  const handleRemoveReminder = useCallback(
    async () => {
      if (!reminderTarget) return;
      try {
        if (reminderTarget.reminder?.notificationId) {
          await NotificationService.cancelScheduledNotification(reminderTarget.reminder.notificationId);
        }

        const updatedPage = {
          ...reminderTarget,
          reminder: null,
        };

        await StorageService.updatePage(reminderTarget.id, { reminder: null });
        setTodoPages((prev) =>
          prev.map((p) => (p.id === reminderTarget.id ? updatedPage : p))
        );
        setReminderTarget(null);
      } catch (error) {
        console.warn('Hatırlatıcı kaldırılırken hata:', error);
      }
    },
    [reminderTarget]
  );

  // To-Do sil (Soft Delete + Geri Al)
  const handleDeleteTodo = useCallback((pageToDelete) => {
    // Önceki bekleyen silme varsa hemen kalıcılaştır
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      StorageService.deletePage(pendingDeleteRef.current.item.id);
      pendingDeleteRef.current = null;
    }

    // Ekrandan anında kaldır (soft delete)
    setTodoPages((prev) => prev.filter((p) => p.id !== pageToDelete.id));

    // 4.5 saniye sonra kalıcı silme zamanlayıcısı
    const timer = setTimeout(async () => {
      if (pendingDeleteRef.current?.item?.id === pageToDelete.id) {
        await StorageService.deletePage(pageToDelete.id);
        pendingDeleteRef.current = null;
        setUndoToast({ visible: false, message: '' });
      }
    }, 4500);

    pendingDeleteRef.current = { item: pageToDelete, timer };
    setUndoToast({
      visible: true,
      message: t('todo.deletedToast', {
        title: getPageDisplayTitle(pageToDelete, t),
        defaultValue: `"${getPageDisplayTitle(pageToDelete, t)}" silindi`,
      }),
    });
  }, [t]);

  // Geri al işlemi
  const handleUndoDelete = useCallback(() => {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      const restored = pendingDeleteRef.current.item;
      pendingDeleteRef.current = null;
      setTodoPages((prev) =>
        [...prev, restored].sort((a, b) => (b.order || 0) - (a.order || 0))
      );
      setUndoToast({ visible: false, message: '' });
    }
  }, []);

  // Toast süresi dolunca veya kapanınca kalıcı sil
  const handleDismissUndo = useCallback(async () => {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      const itemToDelete = pendingDeleteRef.current.item;
      pendingDeleteRef.current = null;
      await StorageService.deletePage(itemToDelete.id);
      setUndoToast({ visible: false, message: '' });
    }
  }, []);

  // Ekrandan ayrılırken bekleyen silmeyi kalıcılaştır
  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timer);
        StorageService.deletePage(pendingDeleteRef.current.item.id);
      }
    };
  }, []);

  // To-Do aç
  const handleOpenTodo = useCallback(
    (page) => {
      router.push(`/todolist/${page.id}`);
    },
    [router]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name={filterDate ? 'calendar-remove' : 'checkbox-marked-circle-outline'}
        size={64}
        color={colors.accent + '40'}
      />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {filterDate ? t('todo.emptyFilterTitle', 'Liste bulunamadı') : t('todo.emptyTitle', 'Yapılacak iş kalmadı!')}
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary + '99' }]}>
        {filterDate
          ? t('todo.emptyFilterDesc', { date: filterLabel, defaultValue: `${filterLabel} tarihinde oluşturulmuş liste yok.` })
          : t('todo.emptyDesc', 'Yeni bir yapılacaklar listesi oluşturmak için + butonuna dokunun.')}
      </Text>
      {filterDate && (
        <TouchableOpacity
          onPress={() => setFilterDate(null)}
          style={[styles.clearFilterInlineBtn, { borderColor: colors.accent }]}
        >
          <Text style={[styles.clearFilterInlineText, { color: colors.accent }]}>
            {t('todo.clearFilter', 'Filtreyi Temizle')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Üst Bar & Arama/Filtreleme Başlığı */}
      <GlobalFilterHeader
        title={t('todo.title', 'Yapılacaklar')}
        searchCategory="todo"
        filterDate={filterDate}
        onSelectDate={setFilterDate}
      />

      {/* To-Do Listesi */}
      <View style={[{ flex: 1 }, isTablet && styles.tabletContainer]}>
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : (
          <FlatList
            data={displayPages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PageThumbnail
                page={item}
                onPress={() => handleOpenTodo(item)}
                onLongPress={() => handleDeleteTodo(item)}
                onDelete={() => handleDeleteTodo(item)}
                onReminder={() => setReminderTarget(item)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              displayPages.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* FAB - Yeni To-Do Ekle */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setIsAddModalVisible(true)}
        style={[styles.fab, { backgroundColor: colors.accent }]}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Sayfa Ekleme Modal */}
      <AddTodoModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onAdd={handleAddTodo}
      />

      {/* Hatırlatıcı Seçim Modalı */}
      <ReminderPickerModal
        visible={!!reminderTarget}
        itemTitle={reminderTarget ? getPageDisplayTitle(reminderTarget, t) : ''}
        initialDate={reminderTarget?.reminder?.date}
        onSave={handleSaveReminder}
        onRemove={handleRemoveReminder}
        onClose={() => setReminderTarget(null)}
      />

      {/* Geri Al (Undo) Bildirimi */}
      <UndoToast
        visible={undoToast.visible}
        message={undoToast.message}
        onUndo={handleUndoDelete}
        onDismiss={handleDismissUndo}
        duration={4500}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  clearFilterInlineBtn: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  clearFilterInlineText: {
    fontSize: 13,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
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
  tabletContainer: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 36,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
