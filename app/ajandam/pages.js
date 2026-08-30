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
import AddPageModal from '../../components/AddPageModal';

/**
 * PagesScreen - Ajanda Sayfa Listesi
 * Eklenen sayfaları listeler, yeni sayfa ekleme ve silme imkanı sunar.
 */
export default function PagesScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [pages, setPages] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sayfaları yükle
  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const savedPages = await StorageService.getPages();
      setPages(savedPages.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (error) {
      console.warn('Sayfalar yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Yeni sayfa ekle
  const handleAddPage = useCallback(
    async (newPage) => {
      const updatedPages = await StorageService.addPage(newPage);
      if (updatedPages) {
        setPages(updatedPages.sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
    },
    []
  );

  // Sayfa sil
  const handleDeletePage = useCallback(
    (page) => {
      Alert.alert(
        'Sayfayı Sil',
        `"${page.title}" sayfasını silmek istediğinize emin misiniz?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              const updated = await StorageService.deletePage(page.id);
              if (updated) {
                setPages(updated.sort((a, b) => (a.order || 0) - (b.order || 0)));
              }
            },
          },
        ]
      );
    },
    []
  );

  // Sayfayı aç
  const handleOpenPage = useCallback(
    (page) => {
      router.push(`/ajandam/${page.id}`);
    },
    [router]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="notebook-outline"
        size={64}
        color={colors.accent + '40'}
      />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Henüz sayfa eklenmedi
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary + '99' }]}>
        Aşağıdaki + butonuna basarak ilk sayfanı ekle!
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Üst Bar */}
      <View style={styles.headerBar}>
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
          Sayfalarım
        </Text>

        <View style={styles.backButton} />
      </View>

      {/* Sayfa Listesi */}
      <FlatList
        data={pages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PageThumbnail
            page={item}
            onPress={() => handleOpenPage(item)}
            onLongPress={() => handleDeletePage(item)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          pages.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Yeni Sayfa Ekle */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setIsAddModalVisible(true)}
        style={[styles.fab, { backgroundColor: colors.accent }]}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Sayfa Ekleme Modal */}
      <AddPageModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onAdd={handleAddPage}
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
