import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import PageThumbnail from '../../components/PageThumbnail';
import AddTodoModal from '../../components/AddTodoModal';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

/**
 * TodoListScreen - Yapılacaklar Ana Ekranı
 * Yalnızca To-Do kategorisindeki sayfaları listeler.
 */
export default function TodoListScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [todoPages, setTodoPages] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // To-Do Sayfalarını yükle
  useEffect(() => {
    loadTodoPages();
  }, []);

  const loadTodoPages = async () => {
    try {
      const allPages = await StorageService.getPages();
      const todos = allPages.filter((page) => page.category === 'todo');
      setTodoPages(todos.sort((a, b) => (a.order || 0) - (b.order || 0)));
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
        setTodoPages(todos.sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
    },
    []
  );

  // To-Do sil
  const handleDeleteTodo = useCallback(
    (page) => {
      Alert.alert(
        'Listeyi Sil',
        `"${page.title}" listesini silmek istediğinize emin misiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              const updated = await StorageService.deletePage(page.id);
              if (updated) {
                const todos = updated.filter((p) => p.category === 'todo');
                setTodoPages(todos.sort((a, b) => (a.order || 0) - (b.order || 0)));
              }
            },
          },
        ]
      );
    },
    []
  );

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
        name="checkbox-marked-circle-outline"
        size={64}
        color={colors.accent + '40'}
      />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Yapılacak iş kalmadı!
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary + '99' }]}>
        Yeni bir yapılacaklar listesi oluşturmak için + butonuna dokunun.
      </Text>
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
          Yapılacaklar
        </Text>

        <View style={styles.backButton} />
      </View>

      {/* To-Do Listesi */}
      <View style={[{ flex: 1 }, isTablet && styles.tabletContainer]}>
        <FlatList
          data={todoPages}
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
            todoPages.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
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
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
