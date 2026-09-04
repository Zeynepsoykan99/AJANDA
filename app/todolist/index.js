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
import DatePickerModal from '../../components/ui/DatePickerModal';
import UndoToast from '../../components/ui/UndoToast';
import GlobalSearchModal from '../../components/ui/GlobalSearchModal';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

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
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [undoToast, setUndoToast] = useState({ visible: false, message: '' });

  // Geri al (Undo) için bekleyen silme referansı
  const pendingDeleteRef = useRef(null);

  // Gün bazlı tarih karşılaştırma
  const isSameDay = (dateStr, targetDate) => {
    if (!dateStr || !targetDate) return false;
    const d = new Date(dateStr);
    return (
      d.getFullYear() === targetDate.getFullYear() &&
      d.getMonth() === targetDate.getMonth() &&
      d.getDate() === targetDate.getDate()
    );
  };

  // Filtrelenmiş veri
  const displayPages = useMemo(() => {
    if (!filterDate) return todoPages;
    return todoPages.filter((p) => isSameDay(p.createdAt, filterDate));
  }, [todoPages, filterDate]);

  // Filtre aktifken yerelleştirilmiş tarih metni
  const dateLocaleMap = { tr: 'tr-TR', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR' };
  const currentLocale = dateLocaleMap[i18n.language?.slice(0, 2)] || 'en-US';
  const filterLabel = filterDate
    ? filterDate.toLocaleDateString(currentLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

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
        title: pageToDelete.title || t('todo.defaultTitle', 'Liste'),
        defaultValue: `"${pageToDelete.title || 'Liste'}" silindi`,
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
      {/* Üst Bar */}
      <View style={[styles.headerBar, isTablet && styles.tabletContainer]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
          {t('todo.title', 'Yapılacaklar')}
        </Text>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsSearchModalVisible(true)}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsDatePickerVisible(true)}
            style={[
              styles.backButton,
              {
                backgroundColor: filterDate ? colors.accent + '20' : colors.card,
                borderColor: filterDate ? colors.accent : colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="calendar-search"
              size={20}
              color={filterDate ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtre Aktif Çipi */}
      {filterDate && (
        <View style={[styles.filterChipContainer, isTablet && styles.tabletContainer]}>
          <View style={[styles.filterChip, { backgroundColor: colors.accent + '12' }]}>
            <MaterialCommunityIcons name="calendar-check" size={16} color={colors.accent} />
            <Text style={[styles.filterChipText, { color: colors.accent }]}>
              {filterLabel}
            </Text>
            <TouchableOpacity
              onPress={() => setFilterDate(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.accent + '80'} />
            </TouchableOpacity>
          </View>
        </View>
      )}

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

      {/* Tarih Filtresi Modal */}
      <DatePickerModal
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        onSelectDate={setFilterDate}
        selectedDate={filterDate}
        onClearFilter={() => setFilterDate(null)}
      />

      {/* Geri Al (Undo) Bildirimi */}
      <UndoToast
        visible={undoToast.visible}
        message={undoToast.message}
        onUndo={handleUndoDelete}
        onDismiss={handleDismissUndo}
        duration={4500}
      />

      {/* Global Arama Modalı */}
      <GlobalSearchModal
        visible={isSearchModalVisible}
        onClose={() => setIsSearchModalVisible(false)}
        initialCategory="todo"
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
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
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
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
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
