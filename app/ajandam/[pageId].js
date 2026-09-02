import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import { getPageTemplate, PAGE_CATEGORIES } from '../../constants/pageTemplates';
import TodoPage from '../../components/pages/TodoPage';
import MonthlyPage from '../../components/pages/MonthlyPage';
import WeeklyPage from '../../components/pages/WeeklyPage';
import BlankPage from '../../components/pages/BlankPage';
import StickerCanvas from '../../components/stickers/StickerCanvas';
import StickerMenu from '../../components/stickers/StickerMenu';
import NotebookContainer from '../../components/stationery/NotebookContainer';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

/**
 * PageViewScreen - Dinamik sayfa görüntüleme ve düzenleme
 * URL parametresinden pageId alır, ilgili sayfayı yükler.
 */
export default function PageViewScreen() {
  const router = useRouter();
  const { pageId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { isTablet, isTwoPage, maxContentWidth } = useResponsiveLayout();

  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStickerMenuVisible, setIsStickerMenuVisible] = useState(false);

  // Auto-save timer ref
  const saveTimeoutRef = useRef(null);

  // Sayfa yükle
  useEffect(() => {
    (async () => {
      try {
        const pages = await StorageService.getPages();
        const found = pages.find((p) => p.id === pageId);
        if (found) {
          setPage(found);
        }
      } catch (error) {
        console.warn('Sayfa yüklenirken hata:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [pageId]);

  // Sayfa verilerini güncelle (debounced auto-save)
  const handleDataChange = useCallback(
    (newData) => {
      setPage((prev) => {
        const updated = { ...prev, data: newData };

        // Debounced kaydetme
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(async () => {
          await StorageService.updatePage(prev.id, { data: newData });
        }, 500);

        return updated;
      });
    },
    []
  );

  // Sticker ekle
  const handleAddSticker = useCallback(
    (sticker) => {
      setPage((prev) => {
        const newSticker = {
          id: `stk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          stickerId: sticker.id,
          type: sticker.type,
          content: sticker.content,
          x: 150,
          y: 300,
          scale: 1.0,
          rotation: 0,
        };
        const updatedStickers = [...(prev.stickers || []), newSticker];
        const updated = { ...prev, stickers: updatedStickers };

        // Kaydet
        StorageService.updatePage(prev.id, { stickers: updatedStickers });

        return updated;
      });
      setIsStickerMenuVisible(false);
    },
    []
  );

  // Sticker konumunu güncelle
  const handleStickerMove = useCallback(
    (stickerId, newX, newY) => {
      setPage((prev) => {
        const updatedStickers = (prev.stickers || []).map((s) =>
          s.id === stickerId ? { ...s, x: newX, y: newY } : s
        );
        const updated = { ...prev, stickers: updatedStickers };
        StorageService.updatePage(prev.id, { stickers: updatedStickers });
        return updated;
      });
    },
    []
  );

  // Sticker sil
  const handleStickerDelete = useCallback(
    (stickerId) => {
      setPage((prev) => {
        const updatedStickers = (prev.stickers || []).filter(
          (s) => s.id !== stickerId
        );
        const updated = { ...prev, stickers: updatedStickers };
        StorageService.updatePage(prev.id, { stickers: updatedStickers });
        return updated;
      });
    },
    []
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!page) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Sayfa bulunamadı
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.accent }]}>
            Geri Dön
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const template = getPageTemplate(page.category, page.templateId);
  const category = PAGE_CATEGORIES.find((c) => c.id === page.category);

  // Kategoriye göre doğru sayfa bileşenini render et
  const renderPageContent = () => {
    switch (page.category) {
      case 'todo':
        return (
          <TodoPage
            template={template}
            data={page.data}
            onDataChange={handleDataChange}
          />
        );
      case 'monthly':
        return (
          <MonthlyPage
            template={template}
            data={page.data}
            onDataChange={handleDataChange}
          />
        );
      case 'weekly':
        return (
          <WeeklyPage
            template={template}
            data={page.data}
            onDataChange={handleDataChange}
          />
        );
      case 'blank':
        return (
          <BlankPage
            template={template}
            data={page.data}
            onDataChange={handleDataChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Üst Bar */}
      <View
        style={[
          styles.headerBar,
          { borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[
            styles.headerButton,
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

        <View style={styles.headerCenter}>
          <Text
            style={[styles.pageTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {page.title}
          </Text>
          <Text style={[styles.categoryLabel, { color: colors.textSecondary + '99' }]}>
            {category?.emoji} {category?.name}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsStickerMenuVisible(true)}
          style={[
            styles.headerButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={{ fontSize: 18 }}>🎀</Text>
        </TouchableOpacity>
      </View>

      {/* Sayfa İçeriği + NotebookContainer + Sticker Canvas */}
      <View
        style={[
          styles.contentArea,
          isTablet && {
            maxWidth: maxContentWidth,
            alignSelf: 'center',
            width: '100%',
            paddingVertical: 10,
          },
        ]}
      >
        <NotebookContainer
          coverColor={template?.colors?.border || colors.border}
          showSpiral={!isTwoPage}
        >
          {renderPageContent()}
        </NotebookContainer>

        <StickerCanvas
          stickers={page.stickers || []}
          onStickerMove={handleStickerMove}
          onStickerDelete={handleStickerDelete}
        />
      </View>

      {/* Sticker Menüsü */}
      <StickerMenu
        visible={isStickerMenuVisible}
        onClose={() => setIsStickerMenuVisible(false)}
        onSelectSticker={handleAddSticker}
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
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  backLink: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
});
