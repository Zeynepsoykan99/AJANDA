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
import Animated from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import { getPageTemplate, getTemplateEdgeColor, PAGE_CATEGORIES } from '../../constants/pageTemplates';
import useDynamicEdgeColor from '../../hooks/useDynamicEdgeColor';
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
import ZoomableCanvas from '../../components/drawing/ZoomableCanvas';
import TextCanvas from '../../components/text/TextCanvas';
import UndoToast from '../../components/ui/UndoToast';
import ReminderPickerModal from '../../components/ui/ReminderPickerModal';
import AudioRecorderModal from '../../components/audio/AudioRecorderModal';
import AudioNotesDeck from '../../components/audio/AudioNotesDeck';
import IndexFlagsRail from '../../components/stationery/IndexFlagsRail';
import { recognizeHandwriting, recognizeSelectedStrokes } from '../../services/handwritingService';
import { NotificationService } from '../../services/notificationService';
import { AudioService } from '../../services/audioService';
import { transcribeAudioFile } from '../../services/transcriptionService';
import LassoActionMenu from '../../components/drawing/LassoActionMenu';
import RecognitionConfirmationModal from '../../components/drawing/RecognitionConfirmationModal';
import { fitTextToBounds, clusterStrokesByColorAndProximity } from '../../utils/lassoGeometry';
import { getPageDisplayTitle, getCategoryDisplayName } from '../../utils/pageTitleHelper';

/**
 * PageViewScreen - Dinamik sayfa görüntüleme ve düzenleme
 * URL parametresinden pageId alır, ilgili sayfayı yükler.
 */
const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

export default function PageViewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { pageId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { isTablet, isTwoPage, maxContentWidth } = useResponsiveLayout();

  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Şablon ve Dinamik Kenar Rengi (Edge Color)
  const template = page ? getPageTemplate(page.category, page.templateId) : null;
  const targetEdgeColor = template ? getTemplateEdgeColor(template, colors.background) : colors.background;
  const { animatedStyle: animatedBgStyle } = useDynamicEdgeColor(targetEdgeColor, colors.background, 300);
  const [isStickerMenuVisible, setIsStickerMenuVisible] = useState(false);
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);
  const [isAudioModalVisible, setIsAudioModalVisible] = useState(false);
  const [undoToast, setUndoToast] = useState({ visible: false, message: '' });
  const pendingStickerDeleteRef = useRef(null);

  // Kement (Lasso) Seçim Durumu — tek obje ile 3 ayrı re-render'ı 1'e indiriyoruz
  const [lassoSelection, setLassoSelection] = useState({ ids: [], bounds: null, strokes: [] });
  const [isRecognizingSelected, setIsRecognizingSelected] = useState(false);
  const [isRecognitionModalVisible, setIsRecognitionModalVisible] = useState(false);
  const [recognizedData, setRecognizedData] = useState({
    text: '',
    candidates: [],
    estimatedFontSize: 16,
    clusters: [],
  });

  // Kısayol değişkenler — geriye dönük uyumluluk için
  const selectedStrokeIds = lassoSelection.ids;
  const selectionBounds = lassoSelection.bounds;
  const selectedStrokes = lassoSelection.strokes;

  // Atomik El Yazısı Dönüşüm Geçmişi (Undo/Redo)
  const conversionHistoryRef = useRef([]);

  // Araç Çubuğu Aktif Mod: 'none' | 'drawing' | 'text'
  const [activeMode, setActiveMode] = useState('none');

  // Çizim Ayarları
  const [drawingTool, setDrawingTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
  const [drawingColor, setDrawingColor] = useState('#1A1A1A');
  const [drawingWidth, setDrawingWidth] = useState(3);

  // Klavye / Metin Ayarları
  const [textColor, setTextColor] = useState('#4E342E');
  const [textFontSize, setTextFontSize] = useState(16);

  // Auto-save timer ref
  const saveTimeoutRef = useRef(null);
  const recognitionTimeoutRef = useRef(null);

  // Canvas ref ve sayfa geçişinde zoom sıfırlama
  const canvasRef = useRef(null);
  useEffect(() => {
    canvasRef.current?.resetZoomImmediate?.();
  }, [pageId]);

  // Sayfa yükle
  useEffect(() => {
    (async () => {
      try {
        const pages = await StorageService.getPages();
        const found = pages.find((p) => p.id === pageId);
        if (found) {
          setPage(found);
        }
        const savedColor = await StorageService.getLastDrawingColor();
        if (savedColor) {
          setDrawingColor(savedColor);
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

  // Çizimleri güncelle (debounced auto-save & digital ink recognition)
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

        // El Yazısı Tanıma (Debounced 1000ms - Çizim akışını asla yavaşlatmaz)
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

      // Geri alınınca tanımayı yeniden çalıştır
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
      if (updatedDrawings.length === 0) {
        StorageService.updatePage(prev.id, { recognizedText: '', recognizedWords: [] });
      } else {
        recognitionTimeoutRef.current = setTimeout(async () => {
          const result = await recognizeHandwriting(updatedDrawings, { language: i18n.language || 'tr' });
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
    setUndoToast({
      visible: true,
      message: t('drawing.strokesDeleted', { count: toDelete.length, defaultValue: `${toDelete.length} çizim silindi` }),
    });
    handleCloseLassoSelection();
  }, [selectedStrokeIds, selectedStrokes, page?.id, handleCloseLassoSelection, t]);

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
        message: deletedBlocks.length === 1
          ? t('drawing.textDeleted', 'Metin silindi')
          : t('drawing.textsDeleted', { count: deletedBlocks.length, defaultValue: `${deletedBlocks.length} metin silindi` }),
      });
    },
    [page?.id, t]
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
        message: t('drawing.textDeleted', 'Metin silindi'),
      });
    },
    [page?.id, t]
  );

  // Kementle seçilen el yazısını metne dönüştürme başlat (Renk & Mesafe Kümelemeli)
  const handleLassoConvertToText = useCallback(async () => {
    if (selectedStrokes.length === 0) return;

    setIsRecognizingSelected(true);
    setIsRecognitionModalVisible(true);

    // 1. Çizimleri renk ve mekansal yakınlığa göre kümelere ayır
    const clusters = clusterStrokesByColorAndProximity(selectedStrokes);
    const lang = i18n.language || 'tr';

    // 2. Her kümeyi bağımsız ve paralel olarak tanı (Batch Recognition)
    const clusterResults = await Promise.all(
      clusters.map(async (cluster) => {
        const result = await recognizeSelectedStrokes(cluster.strokes, { language: lang });
        const fitted = fitTextToBounds(cluster.bounds, result.text || '');
        return {
          id: cluster.id,
          color: cluster.color,
          strokes: cluster.strokes,
          strokeIds: cluster.strokeIds,
          bounds: cluster.bounds,
          text: result.text || '',
          candidates: result.candidates || [],
          estimatedFontSize: fitted.fontSize,
          fontSize: fitted.fontSize,
          fittedWidth: fitted.width,
        };
      })
    );

    const combinedText = clusterResults.map((c) => c.text).filter(Boolean).join(' ');
    const firstFitted = clusterResults[0]
      ? fitTextToBounds(clusterResults[0].bounds, clusterResults[0].text)
      : { fontSize: 18 };

    setRecognizedData({
      text: combinedText,
      candidates: clusterResults[0]?.candidates || [],
      estimatedFontSize: firstFitted.fontSize || 18,
      clusters: clusterResults,
    });
    setIsRecognizingSelected(false);
  }, [selectedStrokes, i18n.language]);

  // Modal üzerinden onaylanan metni gerçek TextElement olarak ekle (Konum, Renk & Bireysel Boyut Mirası)
  const handleConfirmConversion = useCallback(
    ({ text, fontFamily, fontSize, clusters: confirmedClusters }) => {
      const activeClusters =
        confirmedClusters && confirmedClusters.length > 0
          ? confirmedClusters
          : recognizedData.clusters;

      let newBlocks = [];

      if (activeClusters && activeClusters.length > 0) {
        newBlocks = activeClusters
          .filter((c) => (c.text || '').trim().length > 0)
          .map((c, idx) => {
            const fitted = fitTextToBounds(c.bounds, c.text);
            const blockId = `text_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
            // Bireysel Dinamik Punto: Her bloğun fiziksel çizim yüksekliğinden üretilen kendi font boyutu
            const individualFontSize =
              c.fontSize || c.estimatedFontSize || fitted.fontSize || fontSize || 18;

            return {
              id: blockId,
              x: Math.max(8, c.bounds.minX), // 1. Konum Mirası: Orijinal X koordinatı
              y: Math.max(8, c.bounds.minY), // 1. Konum Mirası: Orijinal Y koordinatı
              width: Math.max(100, fitted.width),
              text: c.text,
              color: c.color || textColor,   // 2. Renk Mirası: Orijinal el yazısı çizim rengi
              fontSize: individualFontSize,  // 3. Bireysel Boyut: Dinamik Punto
              fontFamily,
            };
          });
      }

      // Güvenlik fallback'i: Eğer küme verisi yoksa tek blok oluştur
      if (newBlocks.length === 0) {
        if (!text || !text.trim() || !selectionBounds) return;
        const fitted = fitTextToBounds(selectionBounds, text);
        const blockId = `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        newBlocks = [
          {
            id: blockId,
            x: Math.max(8, selectionBounds.minX),
            y: Math.max(8, selectionBounds.minY),
            width: Math.max(120, fitted.width),
            text: text.trim(),
            color: selectedStrokes[0]?.color || textColor,
            fontSize: fontSize || fitted.fontSize,
            fontFamily,
          },
        ];
      }

      const createdTextIds = newBlocks.map((b) => b.id);
      const removedStrokesList = [...selectedStrokes];

      setPage((prev) => {
        const remainingDrawings = (prev.drawings || []).filter(
          (s) => !selectedStrokeIds.includes(s.id)
        );
        const updatedTextBlocks = [...(prev.textBlocks || []), ...newBlocks];

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
        createdTextIds,
        createdTextId: createdTextIds[0],
      });

      // Geri al bildirimi göster
      pendingStickerDeleteRef.current = {
        type: 'handwriting_convert',
        removedStrokes: removedStrokesList,
        createdTextIds,
        createdTextId: createdTextIds[0],
        pageId: page?.id,
        timer: setTimeout(() => {
          pendingStickerDeleteRef.current = null;
          setUndoToast({ visible: false, message: '' });
        }, 5500),
      };
      setUndoToast({
        visible: true,
        message:
          newBlocks.length > 1
            ? t('drawing.multipleTextsConverted', {
                count: newBlocks.length,
                defaultValue: `${newBlocks.length} metin dönüştürüldü`,
              })
            : t('drawing.handwritingConverted', 'El yazısı metne dönüştürüldü'),
      });

      setIsRecognitionModalVisible(false);
      handleCloseLassoSelection();
      setActiveMode('none');
    },
    [
      recognizedData.clusters,
      selectionBounds,
      selectedStrokes,
      selectedStrokeIds,
      textColor,
      page?.id,
      handleCloseLassoSelection,
      setActiveMode,
      t,
    ]
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
        setUndoToast({ visible: true, message: t('drawing.stickerDeleted', 'Çıkartma silindi') });

        return { ...prev, stickers: updatedStickers };
      });
    },
    [t]
  );

  // Genel Geri Al (Undo) İşlemi - Çıkartma, Çizim ve Dönüştürmeyi Kapsar
  const handleUndo = useCallback(() => {
    // 1. Bekleyen toast işlemi var mı?
    if (pendingStickerDeleteRef.current) {
      clearTimeout(pendingStickerDeleteRef.current.timer);
      const pending = pendingStickerDeleteRef.current;
      pendingStickerDeleteRef.current = null;
      setUndoToast({ visible: false, message: '' });

      if (pending.type === 'handwriting_convert') {
        const idsToDelete =
          pending.createdTextIds || (pending.createdTextId ? [pending.createdTextId] : []);
        setPage((prev) => {
          const updatedTextBlocks = (prev.textBlocks || []).filter(
            (b) => !idsToDelete.includes(b.id)
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
      const idsToDelete =
        lastConversion.createdTextIds ||
        (lastConversion.createdTextId ? [lastConversion.createdTextId] : []);
      setPage((prev) => {
        const updatedTextBlocks = (prev.textBlocks || []).filter(
          (b) => !idsToDelete.includes(b.id)
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
    const message = t('agenda.deleteConfirmMessage', 'Bu sayfayı silmek istediğinize emin misiniz?');
    
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
        t('agenda.deleteConfirmTitle', 'Sayfayı Sil'),
        message,
        [
          { text: t('common.cancel', 'İptal'), style: 'cancel' },
          {
            text: t('common.delete', 'Sil'),
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
  }, [page, router, t]);

  // Hatırlatıcı Kaydet
  const handleSaveReminder = useCallback(
    async (selectedDate) => {
      if (!page) return;
      try {
        if (page.reminder?.notificationId) {
          await NotificationService.cancelScheduledNotification(page.reminder.notificationId);
        }

        const notifResult = await NotificationService.scheduleReminderNotification({
          title: getPageDisplayTitle(page, t),
          body: t('reminder.agendaNotificationBody', 'Ajanda sayfanız için hatırlatıcı!'),
          date: selectedDate,
          t,
          data: {
            pageId: page.id,
            category: page.category,
            route: `/ajandam/${page.id}`,
          },
        });

        if (!notifResult?.success || !notifResult?.notificationId) {
          return;
        }

        const updatedReminder = {
          notificationId: notifResult.notificationId,
          date: selectedDate.toISOString(),
        };

        const updated = {
          ...page,
          reminder: updatedReminder,
        };

        await StorageService.updatePage(page.id, { reminder: updatedReminder });
        setPage(updated);
        setIsReminderModalVisible(false);
      } catch (error) {
        console.warn('Hatırlatıcı kaydedilirken hata:', error);
      }
    },
    [page, t]
  );

  // Hatırlatıcı Kaldır
  const handleRemoveReminder = useCallback(
    async () => {
      if (!page) return;
      try {
        if (page.reminder?.notificationId) {
          await NotificationService.cancelScheduledNotification(page.reminder.notificationId);
        }

        const updated = {
          ...page,
          reminder: null,
        };

        await StorageService.updatePage(page.id, { reminder: null });
        setPage(updated);
        setIsReminderModalVisible(false);
      } catch (error) {
        console.warn('Hatırlatıcı kaldırılırken hata:', error);
      }
    },
    [page]
  );

  // Sesli Not Ekle
  const handleAddAudioNote = useCallback((newAudioNote) => {
    setPage((prev) => {
      const updatedAudioNotes = [...(prev.audioNotes || []), newAudioNote];
      StorageService.updatePage(prev.id, { audioNotes: updatedAudioNotes });
      return { ...prev, audioNotes: updatedAudioNotes };
    });
  }, []);

  // Sesli Not Sil
  const handleDeleteAudioNote = useCallback(async (audioNote) => {
    await AudioService.deleteAudioFile(audioNote.uri);
    setPage((prev) => {
      const updatedAudioNotes = (prev.audioNotes || []).filter((n) => n.id !== audioNote.id);
      StorageService.updatePage(prev.id, { audioNotes: updatedAudioNotes });
      return { ...prev, audioNotes: updatedAudioNotes };
    });
  }, []);

  // Sesli Not Transkripsiyonunu Güncelle (Arka plan asenkron STT)
  const handleTranscriptReady = useCallback((audioNoteId, transcript, status = 'completed') => {
    setPage((prev) => {
      if (!prev?.audioNotes) return prev;
      const noteIndex = prev.audioNotes.findIndex((n) => n.id === audioNoteId);
      if (noteIndex === -1) return prev;
      const updatedNotes = [...prev.audioNotes];
      updatedNotes[noteIndex] = {
        ...updatedNotes[noteIndex],
        transcript: transcript || updatedNotes[noteIndex].transcript,
        transcriptStatus: status,
      };
      StorageService.updatePage(prev.id, { audioNotes: updatedNotes });
      return { ...prev, audioNotes: updatedNotes };
    });
  }, []);

  // Başarısız Transkripsiyonu Yeniden Dene
  const handleRetryTranscription = useCallback(
    async (audioNote) => {
      if (!audioNote?.uri || !audioNote?.id) return;
      handleTranscriptReady(audioNote.id, null, 'pending');
      try {
        const lang = i18n?.language || 'tr';
        const res = await transcribeAudioFile(audioNote.uri, { language: lang });
        if (res.success && res.transcript) {
          handleTranscriptReady(audioNote.id, res.transcript, 'completed');
        } else {
          handleTranscriptReady(audioNote.id, null, 'failed');
        }
      } catch (err) {
        console.warn('Yeniden transkripsiyon denemesi hatası:', err);
        handleTranscriptReady(audioNote.id, null, 'failed');
      }
    },
    [handleTranscriptReady, i18n?.language]
  );

  // Post-it Sayfa İşareti Kaydet (Ekle veya Güncelle)
  const handleSaveIndexFlag = useCallback((flagData) => {
    setPage((prev) => {
      const existingFlags = prev.indexFlags || [];
      const flagIdx = existingFlags.findIndex((f) => f.id === flagData.id);
      let updatedFlags;
      if (flagIdx >= 0) {
        updatedFlags = [...existingFlags];
        updatedFlags[flagIdx] = flagData;
      } else {
        updatedFlags = [...existingFlags, flagData];
      }
      StorageService.updatePage(prev.id, { indexFlags: updatedFlags });
      return { ...prev, indexFlags: updatedFlags };
    });
  }, []);

  // Post-it Sayfa İşareti Sil
  const handleDeleteIndexFlag = useCallback((flagId) => {
    setPage((prev) => {
      const updatedFlags = (prev.indexFlags || []).filter((f) => f.id !== flagId);
      StorageService.updatePage(prev.id, { indexFlags: updatedFlags });
      return { ...prev, indexFlags: updatedFlags };
    });
  }, []);

  if (isLoading) {
    return (
      <AnimatedSafeAreaView
        style={[styles.safeArea, { backgroundColor: targetEdgeColor }, animatedBgStyle]}
        edges={['top', 'bottom']}
      >
        <StatusBar style="dark" backgroundColor={targetEdgeColor} />
        <ActivityIndicator size="large" color={colors.accent} />
      </AnimatedSafeAreaView>
    );
  }

  if (!page) {
    return (
      <AnimatedSafeAreaView
        style={[styles.safeArea, { backgroundColor: targetEdgeColor }, animatedBgStyle]}
        edges={['top', 'bottom']}
      >
        <StatusBar style="dark" backgroundColor={targetEdgeColor} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {t('agenda.notFound', 'Sayfa bulunamadı')}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.accent }]}>
            {t('todo.goBack', 'Geri Dön')}
          </Text>
        </TouchableOpacity>
      </AnimatedSafeAreaView>
    );
  }

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
    <AnimatedSafeAreaView
      style={[styles.safeArea, { backgroundColor: targetEdgeColor }, animatedBgStyle]}
      edges={['top', 'bottom']}
    >
      <StatusBar style="dark" backgroundColor={targetEdgeColor} />
      {/* Üst Bar */}
      <View style={styles.headerBar}>
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
            {getPageDisplayTitle(page, t)}
          </Text>
          <Text style={[styles.categoryLabel, { color: colors.textSecondary + '99' }]}>
            {category?.emoji} {getCategoryDisplayName(page?.category, t, category?.name)}
          </Text>
        </View>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsAudioModalVisible(true)}
            style={[
              styles.headerButton,
              {
                backgroundColor: page?.audioNotes?.length ? colors.accent + '20' : colors.card,
                borderColor: page?.audioNotes?.length ? colors.accent : colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="microphone"
              size={18}
              color={page?.audioNotes?.length ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsReminderModalVisible(true)}
            style={[
              styles.headerButton,
              {
                backgroundColor: page?.reminder?.date ? colors.accent + '20' : colors.card,
                borderColor: page?.reminder?.date ? colors.accent : colors.border,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={page?.reminder?.date ? 'bell-ring' : 'bell-outline'}
              size={18}
              color={page?.reminder?.date ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>

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

      {/* Sayfa İçeriği + NotebookContainer (normal şablonlar) / Tam Ekran Görsel (image_template) - Zoomable Canvas */}
      <ZoomableCanvas
        key={pageId}
        ref={canvasRef}
        isDrawingMode={activeMode === 'drawing'}
        isTextMode={activeMode === 'text'}
        minScale={1.0}
        maxScale={4.0}
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
          isDrawingMode={activeMode === 'drawing'}
          textBlocks={page.textBlocks || []}
          onTextBlocksChange={handleTextBlocksChange}
          activeColor={textColor}
          activeFontSize={textFontSize}
          isEraserActive={activeMode === 'drawing' && drawingTool === 'eraser'}
          pointerEvents={
            activeMode === 'drawing'
              ? 'none'
              : activeMode === 'text'
              ? 'auto'
              : 'box-none'
          }
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
          style={[
            styles.fullBleedCanvas,
            { zIndex: activeMode === 'drawing' ? 50 : 20 },
          ]}
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
          isDrawingMode={activeMode === 'drawing'}
        />

        {/* Post-it Sayfa İşaretleyicileri Rayı */}
        <IndexFlagsRail
          flags={page.indexFlags || []}
          onSaveFlag={handleSaveIndexFlag}
          onDeleteFlag={handleDeleteIndexFlag}
        />
      </ZoomableCanvas>

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
        clusters={recognizedData.clusters}
        onConfirm={handleConfirmConversion}
        onCancel={() => setIsRecognitionModalVisible(false)}
      />

      {/* Hatırlatıcı Seçim Modalı */}
      <ReminderPickerModal
        visible={isReminderModalVisible}
        itemTitle={page ? getPageDisplayTitle(page, t) : ''}
        initialDate={page?.reminder?.date}
        onSave={handleSaveReminder}
        onRemove={handleRemoveReminder}
        onClose={() => setIsReminderModalVisible(false)}
      />

      {/* Ses Kayıt Modalı */}
      <AudioRecorderModal
        visible={isAudioModalVisible}
        pageId={page?.id}
        onClose={() => setIsAudioModalVisible(false)}
        onSave={handleAddAudioNote}
        onTranscriptReady={handleTranscriptReady}
      />

      {/* Sayfa Sesli Notlar Güvertesi */}
      <AudioNotesDeck
        audioNotes={page.audioNotes || []}
        onDelete={handleDeleteAudioNote}
        onOpenRecorder={() => setIsAudioModalVisible(true)}
        onRetryTranscription={handleRetryTranscription}
      />

      {/* Geri Al (Undo) Bildirimi */}
      <UndoToast
        visible={undoToast.visible}
        message={undoToast.message}
        onUndo={handleUndo}
        onDismiss={handleDismissUndoToast}
        duration={5000}
      />

      {/* Yüzen, Sürüklenebilir ve Katlanabilir Araç Çubuğu */}
      <View style={styles.floatingToolbarContainer} pointerEvents="box-none">
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
          onChangeColor={(color) => {
            setDrawingColor(color);
            StorageService.setLastDrawingColor(color);
          }}
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
      </View>
    </AnimatedSafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    padding: 0,
    margin: 0,
    height: '100%',
    minHeight: '100%',
    ...Platform.select({
      web: {
        overflow: 'hidden',
        overscrollBehavior: 'none',
      },
    }),
  },
  floatingToolbarContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 990,
    elevation: 15,
  },
  headerBar: {
    height: 56,
    minHeight: 56,
    maxHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
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
    height: '100%',
    minHeight: '100%',
    ...Platform.select({
      web: {
        touchAction: 'none',
        overscrollBehavior: 'none',
      },
    }),
  },
  fullBleedContentArea: {
    flex: 1,
    padding: 0,
    margin: 0,
    overflow: 'hidden',
    height: '100%',
    minHeight: '100%',
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
