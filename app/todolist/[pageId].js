import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import { getPageTemplate, PAGE_CATEGORIES } from '../../constants/pageTemplates';
import ImageTemplatePage from '../../components/pages/ImageTemplatePage';
import DrawingCanvas from '../../components/drawing/DrawingCanvas';
import DrawingToolbar from '../../components/drawing/DrawingToolbar';
import TextCanvas from '../../components/text/TextCanvas';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

/**
 * TodoViewScreen - Sadece To-Do listesini görüntüler ve düzenler
 */
export default function TodoViewScreen() {
  const router = useRouter();
  const { pageId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { isTablet, isTwoPage, maxContentWidth } = useResponsiveLayout();

  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Çizim Ayarları
  const [activeMode, setActiveMode] = useState('none');
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#C2185B');
  const [drawingWidth, setDrawingWidth] = useState(3);

  // Klavye / Metin Ayarları
  const [textColor, setTextColor] = useState('#4E342E');
  const [textFontSize, setTextFontSize] = useState(16);

  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const pages = await StorageService.getPages();
        const found = pages.find((p) => p.id === pageId);
        if (found) {
          setPage(found);
        }
      } catch (error) {
        console.warn('Liste yüklenirken hata:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [pageId]);

  const handleDataChange = useCallback(
    (newData) => {
      setPage((prev) => {
        const updated = { ...prev, data: newData };
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          await StorageService.updatePage(prev.id, { data: newData });
        }, 500);
        return updated;
      });
    },
    []
  );

  const handleDrawingsChange = useCallback(
    (newDrawings) => {
      setPage((prev) => {
        const updated = { ...prev, drawings: newDrawings };
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          await StorageService.updatePage(prev.id, { drawings: newDrawings });
        }, 500);
        return updated;
      });
    },
    []
  );

  const handleTextBlocksChange = useCallback(
    (newTextBlocks) => {
      setPage((prev) => {
        const updated = { ...prev, textBlocks: newTextBlocks };
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          await StorageService.updatePage(prev.id, { textBlocks: newTextBlocks });
        }, 400);
        return updated;
      });
    },
    []
  );

  const handleUndoDrawing = useCallback(() => {
    setPage((prev) => {
      const current = prev.drawings || [];
      if (current.length === 0) return prev;
      const updatedDrawings = current.slice(0, current.length - 1);
      const updated = { ...prev, drawings: updatedDrawings };
      StorageService.updatePage(prev.id, { drawings: updatedDrawings });
      return updated;
    });
  }, []);

  // Sayfayı tamamen sil
  const handleDeletePage = useCallback(() => {
    Alert.alert(
      'Listeyi Sil',
      'Bu sayfayı silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deletePage(page.id);
            router.back();
          },
        },
      ]
    );
  }, [page, router]);

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
          Liste bulunamadı
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.accent }]}>
            Geri Dön
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const template = getPageTemplate('todo', page.templateId);
  const category = PAGE_CATEGORIES.find((c) => c.id === 'todo');

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
            {category?.emoji} Yapılacaklar
          </Text>
        </View>

        <View style={styles.headerRightGroup}>
          <DrawingToolbar
            isDrawingMode={activeMode === 'drawing'}
            onToggleDrawingMode={() =>
              setActiveMode((prev) => (prev === 'drawing' ? 'none' : 'drawing'))
            }
            isTextMode={activeMode === 'text'}
            onToggleTextMode={() =>
              setActiveMode((prev) => (prev === 'text' ? 'none' : 'text'))
            }
            currentTool={drawingTool}
            onChangeTool={setDrawingTool}
            currentColor={drawingColor}
            onChangeColor={setDrawingColor}
            currentWidth={drawingWidth}
            onChangeWidth={setDrawingWidth}
            textColor={textColor}
            onChangeTextColor={setTextColor}
            textFontSize={textFontSize}
            onChangeTextFontSize={setTextFontSize}
            onUndo={handleUndoDrawing}
            canUndo={(page.drawings || []).length > 0}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDeletePage}
            style={[
              styles.headerButton,
              {
                backgroundColor: '#FFEbee',
                borderColor: '#FFCDD2',
              },
            ]}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#E53935" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste İçeriği */}
      <View
        style={[
          styles.contentArea,
          styles.fullBleedContentArea,
        ]}
      >
        <ImageTemplatePage
          template={template}
          data={page.data}
          onDataChange={handleDataChange}
        />

        {/* Serbest Klavye / Metin Katmanı */}
        <TextCanvas
          isTextMode={activeMode === 'text'}
          textBlocks={page.textBlocks || []}
          onTextBlocksChange={handleTextBlocksChange}
          activeColor={textColor}
          activeFontSize={textFontSize}
        />

        {/* Apple Pencil & Çizim Katmanı - Uçtan uca tam hizalı */}
        <DrawingCanvas
          isDrawingMode={activeMode === 'drawing'}
          tool={drawingTool}
          color={drawingColor}
          strokeWidth={drawingWidth}
          drawings={page.drawings || []}
          onDrawingsChange={handleDrawingsChange}
          style={styles.fullBleedCanvas}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    height: 56,
    minHeight: 56,
    maxHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    zIndex: 100,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contentArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  fullBleedContentArea: {
    flex: 1,
    padding: 0,
    margin: 0,
    overflow: 'hidden',
  },
  fullBleedCanvas: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
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
