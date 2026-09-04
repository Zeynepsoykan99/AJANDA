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
import ImageTemplatePage from '../../components/pages/ImageTemplatePage';
import DrawingCanvas from '../../components/drawing/DrawingCanvas';
import DrawingToolbar from '../../components/drawing/DrawingToolbar';
import TextCanvas from '../../components/text/TextCanvas';
import StickerCanvas from '../../components/stickers/StickerCanvas';
import StickerMenu from '../../components/stickers/StickerMenu';
import UndoToast from '../../components/ui/UndoToast';
import { recognizeHandwriting, recognizeSelectedStrokes } from '../../services/handwritingService';
import LassoActionMenu from '../../components/drawing/LassoActionMenu';
import RecognitionConfirmationModal from '../../components/drawing/RecognitionConfirmationModal';
import { fitTextToBounds } from '../../utils/lassoGeometry';
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
  const [isStickerMenuVisible, setIsStickerMenuVisible] = useState(false);
  const [undoToast, setUndoToast] = useState({ visible: false, message: '' });
  const pendingStickerDeleteRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const recognitionTimeoutRef = useRef(null);

  // Kement (Lasso) Seçim Durumu — tek obje ile 3 ayrı re-render'ı 1'e indiriyoruz
  const [lassoSelection, setLassoSelection] = useState({ ids: [], bounds: null, strokes: [] });
  const [isRecognizingSelected, setIsRecognizingSelected] = useState(false);
  const [isRecognitionModalVisible, setIsRecognitionModalVisible] = useState(false);
  const [recognizedData, setRecognizedData] = useState({
    text: '',
    candidates: [],
    estimatedFontSize: 16,
  });

  // Kısayol değişkenler — geriye dönük uyumluluk için
  const selectedStrokeIds = lassoSelection.ids;
  const selectionBounds = lassoSelection.bounds;
  const selectedStrokes = lassoSelection.strokes;

  // Atomik El Yazısı Dönüşüm Geçmişi (Undo/Redo)
  const conversionHistoryRef = useRef([]);

  // Çizim Ayarları
  const [activeMode, setActiveMode] = useState('none');
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#C2185B');
  const [drawingWidth, setDrawingWidth] = useState(3);

  // Klavye / Metin Ayarları
  const [textColor, setTextColor] = useState('#4E342E');
  const [textFontSize, setTextFontSize] = useState(16);

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

        // El Yazısı Tanıma (Debounced 1000ms)
        if (recognitionTimeoutRef.current) {
          clearTimeout(recognitionTimeoutRef.current);
        }
        if (!newDrawings || newDrawings.length === 0) {
          StorageService.updatePage(prev.id, { recognizedText: '', recognizedWords: [] });
        } else {
          recognitionTimeoutRef.current = setTimeout(async () => {
            const result = await recognizeHandwriting(newDrawings, { language: 'tr' });
            if (result.success && !result.aborted && !result.stale) {
              setPage((current) => {
                if (current && current.id === prev.id) {
                  return {
                    ...current,
                    recognizedText: result.text,
                    recognizedWords: result.words,
                  };
                }
                return current;
              });
              await StorageService.updatePage(prev.id, {
                recognizedText: result.text,
                recognizedWords: result.words,
              });
            }
          }, 1000);
        }

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

      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
      if (updatedDrawings.length === 0) {
        StorageService.updatePage(prev.id, { recognizedText: '', recognizedWords: [] });
      } else {
        recognitionTimeoutRef.current = setTimeout(async () => {
          const result = await recognizeHandwriting(updatedDrawings, { language: 'tr' });
          if (result.success && !result.aborted && !result.stale) {
            StorageService.updatePage(prev.id, {
              recognizedText: result.text,
              recognizedWords: result.words,
            });
          }
        }, 1000);
      }

      return updated;
    });
  }, []);

  // ─── Kement (Lasso) Seçim ve Dönüştürme İşlemleri ───
  // Tek setState çağrısı → tek re-render → TextInput odak kaybı yok
  const handleSelectionChange = useCallback(({ selectedStrokeIds: ids, bounds, selectedStrokes: strokes }) => {
    setLassoSelection({ ids: ids || [], bounds: bounds || null, strokes: strokes || [] });
  }, []);

  const handleCloseLassoSelection = useCallback(() => {
    setLassoSelection({ ids: [], bounds: null, strokes: [] });
  }, []);

  // Kementle seçilen çizgileri sil
  const handleLassoDelete = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    const toDelete = [...selectedStrokes];

    setPage((prev) => {
      const current = prev.drawings || [];
      const updatedDrawings = current.filter((s) => !selectedStrokeIds.includes(s.id));
      StorageService.updatePage(prev.id, { drawings: updatedDrawings });
      return { ...prev, drawings: updatedDrawings };
    });

    pendingStickerDeleteRef.current = {
      type: 'strokes_delete',
      removedStrokes: toDelete,
      pageId: page?.id,
      timer: setTimeout(() => {
        pendingStickerDeleteRef.current = null;
        setUndoToast({ visible: false, message: '' });
      }, 4500),
    };
    setUndoToast({ visible: true, message: `${toDelete.length} çizim silindi` });
    handleCloseLassoSelection();
  }, [selectedStrokeIds, selectedStrokes, page?.id, handleCloseLassoSelection]);

  // Silgiyle metin kutusu silindiğinde UndoToast göster
  const handleTextBlockDeleted = useCallback(
    (deletedBlocks) => {
      if (!deletedBlocks || deletedBlocks.length === 0) return;
      if (pendingStickerDeleteRef.current?.timer) {
        clearTimeout(pendingStickerDeleteRef.current.timer);
      }
      pendingStickerDeleteRef.current = {
        type: 'text_delete',
        deletedBlocks,
        pageId: page?.id,
        timer: setTimeout(() => {
          pendingStickerDeleteRef.current = null;
          setUndoToast({ visible: false, message: '' });
        }, 5000),
      };
      setUndoToast({
        visible: true,
        message: deletedBlocks.length === 1 ? 'Metin silindi' : `${deletedBlocks.length} metin silindi`,
      });
    },
    [page?.id]
  );

  // Silgiyle metin içinden harf/kelime silindiğinde UndoToast göster
  const handleTextBlockEdited = useCallback(
    (edits) => {
      if (!edits || edits.length === 0) return;
      if (pendingStickerDeleteRef.current?.timer) {
        clearTimeout(pendingStickerDeleteRef.current.timer);
      }

      const prevEdits = pendingStickerDeleteRef.current?.type === 'text_edit'
        ? pendingStickerDeleteRef.current.edits
        : [];

      const mergedEdits = [...prevEdits];
      for (const edit of edits) {
        const existing = mergedEdits.find((e) => e.blockId === edit.blockId);
        if (existing) {
          existing.newText = edit.newText;
        } else {
          mergedEdits.push({ ...edit });
        }
      }

      pendingStickerDeleteRef.current = {
        type: 'text_edit',
        edits: mergedEdits,
        pageId: page?.id,
        timer: setTimeout(() => {
          pendingStickerDeleteRef.current = null;
          setUndoToast({ visible: false, message: '' });
        }, 5000),
      };
      setUndoToast({
        visible: true,
        message: 'Metin silindi',
      });
    },
    [page?.id]
  );

  // Kementle seçilen el yazısını metne dönüştürme başlat
  const handleLassoConvertToText = useCallback(async () => {
    if (selectedStrokes.length === 0) return;

    setIsRecognizingSelected(true);
    setIsRecognitionModalVisible(true);

    const result = await recognizeSelectedStrokes(selectedStrokes, { language: 'tr' });

    const fitted = fitTextToBounds(selectionBounds, result.text || '');
    setRecognizedData({
      text: result.text || '',
      candidates: result.candidates || [],
      estimatedFontSize: fitted.fontSize,
    });
    setIsRecognizingSelected(false);
  }, [selectedStrokes, selectionBounds]);

  // Modal üzerinden onaylanan metni gerçek TextElement olarak ekle
  const handleConfirmConversion = useCallback(
    ({ text, fontFamily, fontSize }) => {
      if (!text.trim() || !selectionBounds) return;

      const fitted = fitTextToBounds(selectionBounds, text);
      const newBlockId = `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newBlock = {
        id: newBlockId,
        x: Math.max(8, selectionBounds.minX),
        y: Math.max(8, selectionBounds.minY),
        width: Math.max(120, fitted.width),
        text,
        color: selectedStrokes[0]?.color || textColor,
        fontSize: fontSize || fitted.fontSize,
        fontFamily,
      };

      const removedStrokesList = [...selectedStrokes];

      setPage((prev) => {
        const remainingDrawings = (prev.drawings || []).filter(
          (s) => !selectedStrokeIds.includes(s.id)
        );
        const updatedTextBlocks = [...(prev.textBlocks || []), newBlock];

        StorageService.updatePage(prev.id, {
          drawings: remainingDrawings,
          textBlocks: updatedTextBlocks,
        });

        return {
          ...prev,
          drawings: remainingDrawings,
          textBlocks: updatedTextBlocks,
        };
      });

      // Atomik İşlem Kaydı (Undo / Redo için)
      conversionHistoryRef.current.push({
        type: 'CONVERT_HANDWRITING_TO_TEXT',
        removedStrokes: removedStrokesList,
        createdTextId: newBlockId,
      });

      // Geri al bildirimi göster
      pendingStickerDeleteRef.current = {
        type: 'handwriting_convert',
        removedStrokes: removedStrokesList,
        createdTextId: newBlockId,
        pageId: page?.id,
        timer: setTimeout(() => {
          pendingStickerDeleteRef.current = null;
          setUndoToast({ visible: false, message: '' });
        }, 5500),
      };
      setUndoToast({ visible: true, message: 'El yazısı metne dönüştürüldü' });

      setIsRecognitionModalVisible(false);
      handleCloseLassoSelection();
      setActiveMode('none');
    },
    [selectionBounds, selectedStrokes, selectedStrokeIds, textColor, page?.id, handleCloseLassoSelection, setActiveMode]
  );

  const handleAddSticker = useCallback((sticker) => {
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
      StorageService.updatePage(prev.id, { stickers: updatedStickers });
      return updated;
    });
    setIsStickerMenuVisible(false);
  }, []);

  const handleStickerMove = useCallback((stickerId, newX, newY) => {
    setPage((prev) => {
      const updatedStickers = (prev.stickers || []).map((s) =>
        s.id === stickerId ? { ...s, x: newX, y: newY } : s
      );
      const updated = { ...prev, stickers: updatedStickers };
      StorageService.updatePage(prev.id, { stickers: updatedStickers });
      return updated;
    });
  }, []);

  const handleStickerResize = useCallback((stickerId, newScale) => {
    setPage((prev) => {
      const updatedStickers = (prev.stickers || []).map((s) =>
        s.id === stickerId ? { ...s, scale: newScale } : s
      );
      const updated = { ...prev, stickers: updatedStickers };
      StorageService.updatePage(prev.id, { stickers: updatedStickers });
      return updated;
    });
  }, []);

  // Sticker sil (Soft Delete + Geri Al)
  const handleStickerDelete = useCallback((stickerId) => {
    setPage((prev) => {
      const deletedSticker = (prev.stickers || []).find((s) => s.id === stickerId);
      if (!deletedSticker) return prev;

      if (pendingStickerDeleteRef.current) {
        clearTimeout(pendingStickerDeleteRef.current.timer);
        pendingStickerDeleteRef.current = null;
      }

      const updatedStickers = (prev.stickers || []).filter((s) => s.id !== stickerId);

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
  }, []);

  // Genel Geri Al (Undo) İşlemi - Çıkartma, Çizim ve Dönüştürmeyi Kapsar
  const handleUndo = useCallback(() => {
    // 1. Bekleyen toast işlemi var mı?
    if (pendingStickerDeleteRef.current) {
      clearTimeout(pendingStickerDeleteRef.current.timer);
      const pending = pendingStickerDeleteRef.current;
      pendingStickerDeleteRef.current = null;
      setUndoToast({ visible: false, message: '' });

      if (pending.type === 'handwriting_convert') {
        setPage((prev) => {
          const updatedTextBlocks = (prev.textBlocks || []).filter(
            (b) => b.id !== pending.createdTextId
          );
          const updatedDrawings = [...(prev.drawings || []), ...pending.removedStrokes];
          StorageService.updatePage(prev.id, {
            drawings: updatedDrawings,
            textBlocks: updatedTextBlocks,
          });
          return { ...prev, drawings: updatedDrawings, textBlocks: updatedTextBlocks };
        });
        return;
      }

      if (pending.type === 'strokes_delete') {
        setPage((prev) => {
          const updatedDrawings = [...(prev.drawings || []), ...pending.removedStrokes];
          StorageService.updatePage(prev.id, { drawings: updatedDrawings });
          return { ...prev, drawings: updatedDrawings };
        });
        return;
      }

      if (pending.type === 'text_delete' && pending.deletedBlocks) {
        setPage((prev) => {
          const updatedTextBlocks = [...(prev.textBlocks || []), ...pending.deletedBlocks];
          StorageService.updatePage(prev.id, { textBlocks: updatedTextBlocks });
          return { ...prev, textBlocks: updatedTextBlocks };
        });
        return;
      }

      if (pending.type === 'text_edit' && pending.edits) {
        setPage((prev) => {
          const editMap = new Map(pending.edits.map((e) => [e.blockId, e.previousText]));
          const updatedTextBlocks = (prev.textBlocks || []).map((b) => {
            if (editMap.has(b.id)) {
              return { ...b, text: editMap.get(b.id) };
            }
            return b;
          });
          StorageService.updatePage(prev.id, { textBlocks: updatedTextBlocks });
          return { ...prev, textBlocks: updatedTextBlocks };
        });
        return;
      }

      if (pending.sticker) {
        setPage((prev) => {
          const updatedStickers = [...(prev.stickers || []), pending.sticker];
          StorageService.updatePage(prev.id, { stickers: updatedStickers });
          return { ...prev, stickers: updatedStickers };
        });
        return;
      }
    }

    // 2. Bekleyen toast yoksa geçmiş dönüşümlere bak
    if (conversionHistoryRef.current.length > 0) {
      const lastConversion = conversionHistoryRef.current.pop();
      setPage((prev) => {
        const updatedTextBlocks = (prev.textBlocks || []).filter(
          (b) => b.id !== lastConversion.createdTextId
        );
        const updatedDrawings = [...(prev.drawings || []), ...lastConversion.removedStrokes];
        StorageService.updatePage(prev.id, {
          drawings: updatedDrawings,
          textBlocks: updatedTextBlocks,
        });
        return { ...prev, drawings: updatedDrawings, textBlocks: updatedTextBlocks };
      });
      return;
    }

    // 3. Normal çizgi geri alma
    handleUndoDrawing();
  }, [handleUndoDrawing]);

  // Toast süresi dolunca veya kapanınca kalıcı güncelle
  const handleDismissUndoToast = useCallback(() => {
    if (pendingStickerDeleteRef.current) {
      clearTimeout(pendingStickerDeleteRef.current.timer);
      const pending = pendingStickerDeleteRef.current;
      pendingStickerDeleteRef.current = null;
      if (pending.type === 'sticker_delete' && pending.sticker) {
        setPage((prev) => {
          StorageService.updatePage(prev.id, { stickers: prev.stickers || [] });
          return prev;
        });
      }
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
        setTimeout(() => {
          executeDelete();
        }, 50);
      }
    } else {
      Alert.alert(
        'Listeyi Sil',
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
            onUndo={handleUndo}
            canUndo={
              (page.drawings || []).length > 0 ||
              conversionHistoryRef.current.length > 0 ||
              !!pendingStickerDeleteRef.current
            }
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
          isEraserActive={activeMode === 'drawing' && drawingTool === 'eraser'}
        />

        {/* Apple Pencil & Çizim Katmanı - Uçtan uca tam hizalı */}
        <DrawingCanvas
          isDrawingMode={activeMode === 'drawing'}
          tool={drawingTool}
          color={drawingColor}
          strokeWidth={drawingWidth}
          drawings={page.drawings || []}
          onDrawingsChange={handleDrawingsChange}
          textBlocks={page.textBlocks || []}
          onTextBlocksChange={handleTextBlocksChange}
          onTextBlockDeleted={handleTextBlockDeleted}
          onTextBlockEdited={handleTextBlockEdited}
          selectedStrokeIds={selectedStrokeIds}
          selectionBounds={selectionBounds}
          onSelectionChange={handleSelectionChange}
          style={styles.fullBleedCanvas}
        />

        {/* Kement (Lasso) Bağlamsal Eylem Menüsü */}
        <LassoActionMenu
          visible={
            activeMode === 'drawing' &&
            drawingTool === 'lasso' &&
            selectedStrokeIds.length > 0 &&
            !!selectionBounds
          }
          bounds={selectionBounds}
          onConvertToText={handleLassoConvertToText}
          onDelete={handleLassoDelete}
          onClose={handleCloseLassoSelection}
          isLoading={isRecognizingSelected}
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

      {/* El Yazısı Tanıma ve Yazı Tipi (Font) Seçici Modalı */}
      <RecognitionConfirmationModal
        visible={isRecognitionModalVisible}
        isLoading={isRecognizingSelected}
        initialText={recognizedData.text}
        candidates={recognizedData.candidates}
        estimatedFontSize={recognizedData.estimatedFontSize}
        onConfirm={handleConfirmConversion}
        onCancel={() => setIsRecognitionModalVisible(false)}
      />

      {/* Geri Al (Undo) Bildirimi */}
      <UndoToast
        visible={undoToast.visible}
        message={undoToast.message}
        onUndo={handleUndo}
        onDismiss={handleDismissUndoToast}
        duration={5000}
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
