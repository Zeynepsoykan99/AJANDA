import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
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
import ImageTemplatePage from '../../components/pages/ImageTemplatePage';
import StickerCanvas from '../../components/stickers/StickerCanvas';
import StickerMenu from '../../components/stickers/StickerMenu';
import NotebookContainer from '../../components/stationery/NotebookContainer';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import DrawingCanvas from '../../components/drawing/DrawingCanvas';
import DrawingToolbar from '../../components/drawing/DrawingToolbar';
import TextCanvas from '../../components/text/TextCanvas';
import UndoToast from '../../components/ui/UndoToast';

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
  const [undoToast, setUndoToast] = useState({ visible: false, message: '' });
  const pendingStickerDeleteRef = useRef(null);

  // Araç Çubuğu Aktif Mod: 'none' | 'drawing' | 'text'
  const [activeMode, setActiveMode] = useState('none');

  // Çizim Ayarları
  const [drawingTool, setDrawingTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
  const [drawingColor, setDrawingColor] = useState('#C2185B');
  const [drawingWidth, setDrawingWidth] = useState(3);

  // Klavye / Metin Ayarları
  const [textColor, setTextColor] = useState('#4E342E');
  const [textFontSize, setTextFontSize] = useState(16);

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

  // Çizimleri güncelle (debounced auto-save)
  const handleDrawingsChange = useCallback(
    (newDrawings) => {
      setPage((prev) => {
        const updated = { ...prev, drawings: newDrawings };
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(async () => {
          await StorageService.updatePage(prev.id, { drawings: newDrawings });
        }, 500);
        return updated;
      });
    },
    []
  );

  // Serbest metin kutularını güncelle (debounced auto-save)
  const handleTextBlocksChange = useCallback(
    (newTextBlocks) => {
      setPage((prev) => {
        const updated = { ...prev, textBlocks: newTextBlocks };
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(async () => {
          await StorageService.updatePage(prev.id, { textBlocks: newTextBlocks });
        }, 400);
        return updated;
      });
    },
    []
  );

  // Son çizgiyi geri al
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

  const handleStickerResize = useCallback(
    (stickerId, newScale) => {
      setPage((prev) => {
        const updatedStickers = (prev.stickers || []).map((s) =>
          s.id === stickerId ? { ...s, scale: newScale } : s
        );
        const updated = { ...prev, stickers: updatedStickers };
        StorageService.updatePage(prev.id, { stickers: updatedStickers });
        return updated;
      });
    },
    []
  );

  // Sticker sil (Soft Delete + Geri Al)
  const handleStickerDelete = useCallback(
    (stickerId) => {
      setPage((prev) => {
        const deletedSticker = (prev.stickers || []).find((s) => s.id === stickerId);
        if (!deletedSticker) return prev;

        // Önceki bekleyen sticker silme varsa timer'ı durdur
        if (pendingStickerDeleteRef.current) {
          clearTimeout(pendingStickerDeleteRef.current.timer);
          pendingStickerDeleteRef.current = null;
        }

        const updatedStickers = (prev.stickers || []).filter(
          (s) => s.id !== stickerId
        );

        const timer = setTimeout(() => {
          if (pendingStickerDeleteRef.current?.sticker?.id === stickerId) {
            StorageService.updatePage(prev.id, { stickers: updatedStickers });
            pendingStickerDeleteRef.current = null;
            setUndoToast({ visible: false, message: '' });
          }
        }, 4500);

        pendingStickerDeleteRef.current = { sticker: deletedSticker, timer, pageId: prev.id };
        setUndoToast({ visible: true, message: 'Çıkartma silindi' });

        return { ...prev, stickers: updatedStickers };
      });
    },
    []
  );

  // Sticker geri al işlemi
  const handleUndoStickerDelete = useCallback(() => {
    if (pendingStickerDeleteRef.current) {
      clearTimeout(pendingStickerDeleteRef.current.timer);
      const restored = pendingStickerDeleteRef.current.sticker;
      pendingStickerDeleteRef.current = null;
      setPage((prev) => {
        const updatedStickers = [...(prev.stickers || []), restored];
        return { ...prev, stickers: updatedStickers };
      });
      setUndoToast({ visible: false, message: '' });
    }
  }, []);

  // Toast süresi dolunca veya kapanınca kalıcı güncelle
  const handleDismissStickerUndo = useCallback(() => {
    if (pendingStickerDeleteRef.current) {
      clearTimeout(pendingStickerDeleteRef.current.timer);
      const { pageId: pid } = pendingStickerDeleteRef.current;
      pendingStickerDeleteRef.current = null;
      setPage((prev) => {
        StorageService.updatePage(pid, { stickers: prev.stickers || [] });
        return prev;
      });
      setUndoToast({ visible: false, message: '' });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pendingStickerDeleteRef.current) {
        clearTimeout(pendingStickerDeleteRef.current.timer);
      }
    };
  }, []);

  // Sayfayı tamamen sil
  const handleDeletePage = useCallback(() => {
    const message = 'Bu sayfayı silmek istediğinize emin misiniz?';
    
    const executeDelete = async () => {
      await StorageService.deletePage(page.id);
      router.back();
    };

    if (Platform.OS === 'web') {
      const confirmResult = window.confirm(message);
      if (confirmResult) {
        // executeDelete'in hemen router.back()'e neden olması bazen state çakışması yaratabilir
        // bu yüzden kısa bir timeout ile yapıyoruz
        setTimeout(() => {
          executeDelete();
        }, 50);
      }
    } else {
      Alert.alert(
        'Sayfayı Sil',
        message,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: () => {
              setTimeout(() => {
                executeDelete();
              }, 50);
            },
          },
        ]
      );
    }
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
        if (template?.type === 'image_template') {
          return (
            <ImageTemplatePage
              template={template}
              data={page.data}
              onDataChange={handleDataChange}
            />
          );
        }
        return (
          <MonthlyPage
            template={template}
            data={page.data}
            onDataChange={handleDataChange}
          />
        );
      case 'weekly':
        if (template?.type === 'image_template') {
          return (
            <ImageTemplatePage
              template={template}
              data={page.data}
              onDataChange={handleDataChange}
            />
          );
        }
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

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDeletePage}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            style={[
              styles.headerButton,
              {
                backgroundColor: '#FFEbee',
                borderColor: '#FFCDD2',
              },
            ]}
          >
            <View pointerEvents="none">
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#E53935" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sayfa İçeriği + NotebookContainer (normal şablonlar) / Tam Ekran Görsel (image_template) */}
      <View
        style={[
          styles.contentArea,
          isTablet && template?.type !== 'image_template' && {
            maxWidth: maxContentWidth,
            alignSelf: 'center',
            width: '100%',
            paddingVertical: 10,
          },
          template?.type === 'image_template' && styles.fullBleedContentArea,
        ]}
      >
        {template?.type === 'image_template' ? (
          renderPageContent()
        ) : (
          <NotebookContainer
            coverColor={template?.colors?.border || colors.border}
            showSpiral={!isTwoPage}
          >
            {renderPageContent()}
          </NotebookContainer>
        )}

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

        {/* Sticker Katmanı */}
        <StickerCanvas
          stickers={page.stickers || []}
          onStickerMove={handleStickerMove}
          onStickerResize={handleStickerResize}
          onStickerDelete={handleStickerDelete}
        />
      </View>

      {/* Sticker Menüsü */}
      <StickerMenu
        visible={isStickerMenuVisible}
        onClose={() => setIsStickerMenuVisible(false)}
        onSelectSticker={handleAddSticker}
      />

      {/* Geri Al (Undo) Bildirimi */}
      <UndoToast
        visible={undoToast.visible}
        message={undoToast.message}
        onUndo={handleUndoStickerDelete}
        onDismiss={handleDismissStickerUndo}
        duration={4500}
      />
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
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
