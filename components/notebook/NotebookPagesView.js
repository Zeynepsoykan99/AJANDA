import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import useDynamicEdgeColor from '../../hooks/useDynamicEdgeColor';
import {
  getPaperTemplate,
  resolvePagePaperTemplateId,
  DEFAULT_PAPER_TEMPLATE_ID,
} from '../../constants/pageTemplates';

import PaperSheet from '../../components/stationery/PaperSheet';
import PaperTemplateModal from '../../components/PaperTemplateModal';
import NotebookContainer from '../../components/stationery/NotebookContainer';
import DrawingCanvas from '../../components/drawing/DrawingCanvas';
import DrawingToolbar from '../../components/drawing/DrawingToolbar';
import ZoomableCanvas from '../../components/drawing/ZoomableCanvas';
import TextCanvas from '../../components/text/TextCanvas';
import StickerCanvas from '../../components/stickers/StickerCanvas';
import StickerMenu from '../../components/stickers/StickerMenu';
import UndoToast from '../../components/ui/UndoToast';
import LassoActionMenu from '../../components/drawing/LassoActionMenu';
import RecognitionConfirmationModal from '../../components/drawing/RecognitionConfirmationModal';
import NotebookSearchSheet from './NotebookSearchSheet';
import { recognizeSelectedStrokes } from '../../services/handwritingService';
import { fitTextToBounds, clusterStrokesByColorAndProximity } from '../../utils/lassoGeometry';

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

/**
 * NotebookPagesView - Defter Sayfaları (Günlüğüm ve Notlarım ortak ekranı)
 * Yatay kaydırmalı çoklu sayfa, serbest çizim, metin, sticker, el yazısını metne dönüştürme,
 * pinch-to-zoom, sayfa bazlı kağıt şablonu ve geri alma.
 *
 * @param {object} storage - Veri işlemleri (hepsi Promise döndürür)
 *   load() -> defter | null
 *   addPage(pageData) -> { notebook, newPage } | null
 *   updatePage(pageId, updates) -> defter | null
 *   deletePage(pageId) -> defter | null
 *   restorePage(page, index) -> defter | null
 * @param {string|function} title - Üst bardaki başlık: sabit metin veya (notebook) => metin
 * @param {string} singlePageWarning - Son sayfa silinmek istendiğinde gösterilecek uyarı
 * @param {boolean} enableSearch - Sağ üstte defter içi arama butonu gösterilsin mi
 * @param {'activePage'|'notebookDefault'} newPageTemplateSource - "+" seçicisinde seçili gelecek şablon:
 *   aktif sayfanın şablonu (Günlüğüm) veya defterin varsayılan kağıt şablonu (Notlarım)
 * @param {number} [initialPageIndex] - Doğrudan açılacak sayfa indeksi
 * @param {string} [initialPageId] - Doğrudan açılacak sayfa kimliği
 */
export default function NotebookPagesView({
  storage,
  title,
  singlePageWarning,
  enableSearch = false,
  newPageTemplateSource = 'activePage',
  initialPageIndex,
  initialPageId,
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { isTablet, isTwoPage, maxContentWidth } = useResponsiveLayout();
  const compactHeader = enableSearch && windowWidth < 480;

  const [notebook, setNotebook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Araç Çubuğu Aktif Mod: 'none' | 'drawing' | 'text'
  const [activeMode, setActiveMode] = useState('none');

  // Çizim Ayarları
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#C2185B');
  const [drawingWidth, setDrawingWidth] = useState(3);

  // Metin Ayarları
  const [textColor, setTextColor] = useState('#4E342E');
  const [textFontSize, setTextFontSize] = useState(16);

  // Sticker Menüsü ve Toast
  const [isStickerMenuVisible, setIsStickerMenuVisible] = useState(false);
  // Kağıt şablonu seçici: null (kapalı) | 'newPage' (+ ile yeni sayfa) | 'editPage' (aktif sayfa)
  const [templateSheetMode, setTemplateSheetMode] = useState(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [undoToast, setUndoToast] = useState({ visible: false, message: '' });

  // Kement (Lasso) Seçim Durumu
  const [lassoSelection, setLassoSelection] = useState({ ids: [], bounds: null, strokes: [] });
  const [isRecognizingSelected, setIsRecognizingSelected] = useState(false);
  const [isRecognitionModalVisible, setIsRecognitionModalVisible] = useState(false);
  const [recognizedData, setRecognizedData] = useState({
    text: '',
    candidates: [],
    estimatedFontSize: 16,
    clusters: [],
  });

  const selectedStrokeIds = lassoSelection.ids;
  const selectionBounds = lassoSelection.bounds;
  const selectedStrokes = lassoSelection.strokes;

  const storageRef = useRef(storage);
  storageRef.current = storage;

  const scrollViewRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Sayfa başına ZoomableCanvas referansları (pageId -> ref)
  const canvasRefs = useRef({});

  // Yatay sayfa kaydırma kilitleri: aktif sayfa büyütülmüşse veya ekranda 2+ parmak varsa
  // yatay swipe kapanır; böylece iki parmakla pinch/pan sayfa değiştirmeyle çakışmaz
  const [isActivePageZoomed, setIsActivePageZoomed] = useState(false);
  const [isMultiTouch, setIsMultiTouch] = useState(false);

  // Yatay kaydırma alanının ölçülen yüksekliği: her sayfaya açık height olarak verilir.
  // Satır yönlü içerik kapsayıcısında flex: 1 yalnızca genişliği etkilediği için sayfalar
  // aksi halde içerikleri kadar kısa kalıyordu (web ve mobil için aynı düzen kuralı).
  const [pagesViewportHeight, setPagesViewportHeight] = useState(0);
  const handlePagesViewportLayout = useCallback((e) => {
    const height = Math.round(e.nativeEvent.layout.height);
    setPagesViewportHeight((prev) => (prev === height ? prev : height));
  }, []);

  // Defter verilerini yükle
  useEffect(() => {
    (async () => {
      try {
        const savedNotebook = await storageRef.current.load();
        setNotebook(savedNotebook);

        // Doğrudan arama sonucundan gelen sayfaya konumlan
        const pList = savedNotebook?.pages || [];
        let targetIdx = 0;
        if (initialPageId) {
          const foundIdx = pList.findIndex((p) => p.pageId === initialPageId);
          if (foundIdx >= 0) targetIdx = foundIdx;
        } else if (typeof initialPageIndex === 'number' && initialPageIndex >= 0 && initialPageIndex < pList.length) {
          targetIdx = initialPageIndex;
        }

        if (targetIdx > 0 && targetIdx < pList.length) {
          setCurrentPageIndex(targetIdx);
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              x: targetIdx * windowWidth,
              animated: false,
            });
          }, 100);
        }
      } catch (error) {
        console.warn('Defter yüklenirken hata:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [windowWidth, initialPageIndex, initialPageId]);

  const pages = notebook?.pages || [];
  const headerTitle = typeof title === 'function' ? title(notebook) : title;
  const activePage = pages[currentPageIndex] || pages[0];

  // Aktif sayfanın kağıt şablonu (sayfanın kendi şablonu -> günlük varsayılanı -> çizgili)
  const activePaperTemplateId = resolvePagePaperTemplateId(activePage, notebook);
  const activePaperTemplate = getPaperTemplate(activePaperTemplateId);

  // Seamless Blend: Ekran arka planı aktif sayfanın kağıt rengiyle birebir eşleşir
  const targetEdgeColor = activePaperTemplate.paper.paperColor;
  const { animatedStyle: animatedBgStyle } = useDynamicEdgeColor(targetEdgeColor, colors.background, 300);

  // Aktif sayfanın ekran ofsetini yeniden ölç: yatay ScrollView'de sayfaların pencere içindeki X konumu
  // kaydırdıkça değişir; ölçüm güncellenmezse dokunma -> tuval koordinat dönüşümü kayar
  const remeasureActiveCanvas = useCallback(() => {
    const pageId = pages[currentPageIndex]?.pageId;
    if (pageId) canvasRefs.current[pageId]?.remeasure?.();
  }, [pages, currentPageIndex]);

  // Kaydırma animasyonunun süresi platforma göre değişir; ölçümü kaydırma durduktan sonra yap.
  // Throttle nedeniyle son scroll olayı düşebildiği için ikinci bir gecikmeli ölçüm de yapılır.
  const remeasureRef = useRef(remeasureActiveCanvas);
  remeasureRef.current = remeasureActiveCanvas;
  const scrollSettleTimersRef = useRef([]);

  const clearScrollSettleTimers = useCallback(() => {
    scrollSettleTimersRef.current.forEach(clearTimeout);
    scrollSettleTimersRef.current = [];
  }, []);

  const handleScroll = useCallback(() => {
    clearScrollSettleTimers();
    scrollSettleTimersRef.current = [150, 500].map((delay) =>
      setTimeout(() => remeasureRef.current(), delay)
    );
  }, [clearScrollSettleTimers]);

  useEffect(() => clearScrollSettleTimers, [clearScrollSettleTimers]);

  const activePageId = activePage?.pageId;
  useEffect(() => {
    // Sayfa değişince önceki sayfanın kement seçimini temizle
    setLassoSelection({ ids: [], bounds: null, strokes: [] });

    // Yeni aktif sayfanın büyütme durumunu oku
    const transform = activePageId ? canvasRefs.current[activePageId]?.getTransform?.() : null;
    setIsActivePageZoomed((transform?.scale || 1) > 1.01);

    // Kaydırma animasyonu bittikten sonra ofseti ölç
    const timer = setTimeout(remeasureActiveCanvas, 400);
    return () => clearTimeout(timer);
  }, [activePageId, pages.length, windowWidth]);

  const handleActiveTransformChange = useCallback(({ scale }) => {
    setIsActivePageZoomed(scale > 1.01);
  }, []);

  const handleScrollTouchStart = useCallback((e) => {
    if ((e.nativeEvent.touches?.length || 0) >= 2) setIsMultiTouch(true);
  }, []);

  const handleScrollTouchEnd = useCallback((e) => {
    if ((e.nativeEvent.touches?.length || 0) < 2) setIsMultiTouch(false);
  }, []);

  // Sayfa Değiştirme
  const goToPage = useCallback(
    (index) => {
      if (index >= 0 && index < pages.length) {
        setCurrentPageIndex(index);
        scrollViewRef.current?.scrollTo({
          x: index * windowWidth,
          animated: true,
        });
      }
    },
    [pages.length, windowWidth]
  );

  // URL parametresiyle gelen sayfa sonradan değişirse o sayfaya kaydır
  useEffect(() => {
    if (!pages.length) return;
    let targetIdx = -1;
    if (initialPageId) {
      targetIdx = pages.findIndex((p) => p.pageId === initialPageId);
    } else if (typeof initialPageIndex === 'number' && initialPageIndex >= 0 && initialPageIndex < pages.length) {
      targetIdx = initialPageIndex;
    }
    if (targetIdx >= 0 && targetIdx !== currentPageIndex) {
      goToPage(targetIdx);
    }
  }, [initialPageId, initialPageIndex, pages, goToPage, currentPageIndex]);

  // Yatay Kaydırma Bittiğinde İndeks Güncelleme
  const handleMomentumScrollEnd = useCallback(
    (e) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / windowWidth);
      if (newIndex >= 0 && newIndex < pages.length && newIndex !== currentPageIndex) {
        setCurrentPageIndex(newIndex);
      } else {
        remeasureActiveCanvas();
      }
    },
    [pages.length, currentPageIndex, windowWidth, remeasureActiveCanvas]
  );

  // Bildirim + geri alınabilir işlem kaydı. Her bildirime benzersiz id verilir; böylece art arda gelen
  // bildirimlerde otomatik kapanma süresi yeniden başlar ve Geri Al yalnızca son işlemi geri alır.
  const undoActionRef = useRef(null);
  const showUndoToast = useCallback((message, undoAction) => {
    undoActionRef.current = undoAction || null;
    setUndoToast({ visible: true, message, id: Date.now() });
  }, []);

  const handleDismissUndoToast = useCallback(() => {
    undoActionRef.current = null;
    setUndoToast({ visible: false, message: '' });
  }, []);

  // Belirtilen sayfaya (varsa animasyonla) kaydır
  const scrollToPageIndex = useCallback(
    (index, delay = 0) => {
      setCurrentPageIndex(index);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: index * windowWidth, animated: true });
      }, delay);
    },
    [windowWidth]
  );

  // Yeni Sayfa Ekleme (+)
  const handleAddPage = useCallback(async (paperTemplateId) => {
    // Yeni sayfa, seçici sheet'te seçilen kağıt şablonuyla StorageService üzerinden eklenir
    const result = await storageRef.current.addPage(paperTemplateId ? { paperTemplateId } : {});
    if (!result) return;

    // Henüz kaydedilmemiş (debounce bekleyen) çizimler kaybolmasın diye yalnızca yeni sayfayı state'e ekle
    const { notebook: updatedNotebook, newPage } = result;
    setNotebook((prev) => ({ ...prev, pages: [...(prev?.pages || []), newPage] }));

    scrollToPageIndex(updatedNotebook.pages.length - 1, 100);

    showUndoToast(t('diary.pageAdded', 'Yeni sayfa eklendi'), {
      type: 'page_added',
      pageId: newPage.pageId,
    });
  }, [scrollToPageIndex, showUndoToast, t]);

  // Sayfa Silme (Çöp Kutusu)
  const handleDeletePage = useCallback(() => {
    if (pages.length <= 1) {
      Alert.alert(
        headerTitle,
        singlePageWarning
      );
      return;
    }

    const executeDelete = async () => {
      const deleteIndex = currentPageIndex;
      // Ekrandaki sayfa nesnesi, debounce bekleyen son içerikleri de taşır; geri alma bununla yapılır
      const pageToDelete = pages[deleteIndex];
      const updatedNotebook = await storageRef.current.deletePage(pageToDelete.pageId);
      if (updatedNotebook) {
        // Diğer sayfaların kaydedilmemiş değişiklikleri kaybolmasın diye yalnızca silinen sayfayı state'ten çıkar
        setNotebook((prev) => ({
          ...prev,
          pages: (prev?.pages || [])
            .filter((p) => p.pageId !== pageToDelete.pageId)
            .map((p, idx) => ({ ...p, pageNumber: idx + 1 })),
        }));
        scrollToPageIndex(Math.max(0, Math.min(deleteIndex, updatedNotebook.pages.length - 1)));
        showUndoToast(t('diary.pageDeleted', 'Sayfa silindi'), {
          type: 'page_deleted',
          page: pageToDelete,
          index: deleteIndex,
        });
      }
    };

    const message = t('diary.deletePageConfirmMessage', 'Bu sayfayı silmek istediğinize emin misiniz?');

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        t('diary.deletePageConfirmTitle', 'Sayfayı Sil'),
        message,
        [
          { text: t('common.cancel', 'İptal'), style: 'cancel' },
          { text: t('common.delete', 'Sil'), style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  }, [pages, currentPageIndex, scrollToPageIndex, showUndoToast, headerTitle, singlePageWarning, t]);

  // Aktif Sayfanın Kağıt Şablonunu Değiştir
  const handleChangePageTemplate = useCallback(
    (templateId) => {
      const pageToUpdate = pages[currentPageIndex];
      if (!pageToUpdate || !templateId) return;

      const previousTemplateId = resolvePagePaperTemplateId(pageToUpdate, notebook);
      if (previousTemplateId === templateId) return;

      setNotebook((prev) => ({
        ...prev,
        pages: (prev?.pages || []).map((p) =>
          p.pageId === pageToUpdate.pageId ? { ...p, paperTemplateId: templateId } : p
        ),
      }));
      storageRef.current.updatePage(pageToUpdate.pageId, { paperTemplateId: templateId });

      showUndoToast(t('diary.templateChanged', 'Sayfa şablonu güncellendi'), {
        type: 'template_changed',
        pageId: pageToUpdate.pageId,
        previousTemplateId,
      });
    },
    [pages, currentPageIndex, notebook, showUndoToast, t]
  );

  // Geri Al: bildirimdeki son işlemi tersine çevir
  const handleUndoLastAction = useCallback(async () => {
    const action = undoActionRef.current;
    undoActionRef.current = null;
    setUndoToast({ visible: false, message: '' });
    if (!action) return;

    switch (action.type) {
      case 'page_added': {
        const updatedNotebook = await storageRef.current.deletePage(action.pageId);
        if (!updatedNotebook) return;
        const removedIndex = pages.findIndex((p) => p.pageId === action.pageId);
        setNotebook((prev) => ({
          ...prev,
          pages: (prev?.pages || [])
            .filter((p) => p.pageId !== action.pageId)
            .map((p, idx) => ({ ...p, pageNumber: idx + 1 })),
        }));
        const fallbackIndex = removedIndex > 0 ? removedIndex - 1 : 0;
        scrollToPageIndex(Math.min(fallbackIndex, Math.max(0, updatedNotebook.pages.length - 1)));
        break;
      }
      case 'page_deleted': {
        const updatedNotebook = await storageRef.current.restorePage(action.page, action.index);
        if (!updatedNotebook) return;
        setNotebook((prev) => {
          const restoredPages = (prev?.pages || []).filter((p) => p.pageId !== action.page.pageId);
          const insertAt = Math.max(0, Math.min(action.index, restoredPages.length));
          restoredPages.splice(insertAt, 0, action.page);
          return {
            ...prev,
            pages: restoredPages.map((p, idx) => ({ ...p, pageNumber: idx + 1 })),
          };
        });
        const restoredIndex = updatedNotebook.pages.findIndex((p) => p.pageId === action.page.pageId);
        scrollToPageIndex(Math.max(0, restoredIndex), 100);
        break;
      }
      case 'template_changed': {
        setNotebook((prev) => ({
          ...prev,
          pages: (prev?.pages || []).map((p) =>
            p.pageId === action.pageId ? { ...p, paperTemplateId: action.previousTemplateId } : p
          ),
        }));
        await storageRef.current.updatePage(action.pageId, {
          paperTemplateId: action.previousTemplateId,
        });
        break;
      }
      default:
        break;
    }
  }, [pages, scrollToPageIndex]);

  // Çizimleri Güncelle (Sayfa bazlı debounced auto-save)
  const handleDrawingsChange = useCallback(
    (pageIndex, newDrawings) => {
      setNotebook((prev) => {
        const currentPages = [...(prev?.pages || [])];
        if (!currentPages[pageIndex]) return prev;

        currentPages[pageIndex] = {
          ...currentPages[pageIndex],
          drawings: newDrawings,
        };

        const updated = { ...prev, pages: currentPages };

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          await storageRef.current.updatePage(currentPages[pageIndex].pageId, {
            drawings: newDrawings,
          });
        }, 500);

        return updated;
      });
    },
    []
  );

  // Serbest Metin Kutularını Güncelle
  const handleTextBlocksChange = useCallback(
    (pageIndex, newTextBlocks) => {
      setNotebook((prev) => {
        const currentPages = [...(prev?.pages || [])];
        if (!currentPages[pageIndex]) return prev;

        currentPages[pageIndex] = {
          ...currentPages[pageIndex],
          textBlocks: newTextBlocks,
        };

        const updated = { ...prev, pages: currentPages };

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
          await storageRef.current.updatePage(currentPages[pageIndex].pageId, {
            textBlocks: newTextBlocks,
          });
        }, 400);

        return updated;
      });
    },
    []
  );

  // Çizimi Geri Al
  const handleUndoDrawing = useCallback(() => {
    if (!activePage) return;
    const currentDrawings = activePage.drawings || [];
    if (currentDrawings.length === 0) return;

    const updatedDrawings = currentDrawings.slice(0, currentDrawings.length - 1);
    handleDrawingsChange(currentPageIndex, updatedDrawings);
  }, [activePage, currentPageIndex, handleDrawingsChange]);

  // Sticker Ekleme
  // Kayıt yapısı DraggableSticker'ın okuduğu alanlarla (type, content, stickerId, scale) ve Ajandam ile aynıdır.
  // Görsel sticker'ın kaynağı kayda yazılmaz; çizilirken stickerId ile STICKER_PACKS'ten bulunur.
  const handleSelectSticker = useCallback(
    (sticker) => {
      setIsStickerMenuVisible(false);
      const newSticker = {
        id: `stk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        stickerId: sticker.id,
        type: sticker.type,
        content: sticker.content,
        x: 100,
        y: 150,
        scale: 1.0,
        rotation: 0,
      };

      setNotebook((prev) => {
        const currentPages = [...(prev?.pages || [])];
        const pageToUpdate = currentPages[currentPageIndex];
        if (!pageToUpdate) return prev;

        const updatedStickers = [...(pageToUpdate.stickers || []), newSticker];
        currentPages[currentPageIndex] = {
          ...pageToUpdate,
          stickers: updatedStickers,
        };

        const updated = { ...prev, pages: currentPages };
        storageRef.current.updatePage(pageToUpdate.pageId, {
          stickers: updatedStickers,
        });
        return updated;
      });
    },
    [currentPageIndex]
  );

  // Sticker Güncelleme (Taşıma / Boyut)
  const handleStickerMove = useCallback(
    (stickerId, x, y) => {
      setNotebook((prev) => {
        const currentPages = [...(prev?.pages || [])];
        const pageToUpdate = currentPages[currentPageIndex];
        if (!pageToUpdate) return prev;

        const updatedStickers = (pageToUpdate.stickers || []).map((s) =>
          s.id === stickerId ? { ...s, x, y } : s
        );
        currentPages[currentPageIndex] = {
          ...pageToUpdate,
          stickers: updatedStickers,
        };

        const updated = { ...prev, pages: currentPages };
        storageRef.current.updatePage(pageToUpdate.pageId, {
          stickers: updatedStickers,
        });
        return updated;
      });
    },
    [currentPageIndex]
  );

  // DraggableSticker boyutlandırma bitince onResize(id, scale) çağırır
  const handleStickerResize = useCallback(
    (stickerId, newScale) => {
      setNotebook((prev) => {
        const currentPages = [...(prev?.pages || [])];
        const pageToUpdate = currentPages[currentPageIndex];
        if (!pageToUpdate) return prev;

        const updatedStickers = (pageToUpdate.stickers || []).map((s) =>
          s.id === stickerId ? { ...s, scale: newScale } : s
        );
        currentPages[currentPageIndex] = {
          ...pageToUpdate,
          stickers: updatedStickers,
        };

        const updated = { ...prev, pages: currentPages };
        storageRef.current.updatePage(pageToUpdate.pageId, {
          stickers: updatedStickers,
        });
        return updated;
      });
    },
    [currentPageIndex]
  );

  const handleStickerDelete = useCallback(
    (stickerId) => {
      setNotebook((prev) => {
        const currentPages = [...(prev?.pages || [])];
        const pageToUpdate = currentPages[currentPageIndex];
        if (!pageToUpdate) return prev;

        const updatedStickers = (pageToUpdate.stickers || []).filter(
          (s) => s.id !== stickerId
        );
        currentPages[currentPageIndex] = {
          ...pageToUpdate,
          stickers: updatedStickers,
        };

        const updated = { ...prev, pages: currentPages };
        storageRef.current.updatePage(pageToUpdate.pageId, {
          stickers: updatedStickers,
        });
        return updated;
      });
    },
    [currentPageIndex]
  );

  // Kement Seçimi
  const handleSelectionChange = useCallback(
    ({ selectedStrokeIds: ids, bounds, selectedStrokes: strokes }) => {
      setLassoSelection({ ids: ids || [], bounds: bounds || null, strokes: strokes || [] });
    },
    []
  );

  const handleCloseLassoSelection = useCallback(() => {
    setLassoSelection({ ids: [], bounds: null, strokes: [] });
  }, []);

  const handleLassoDelete = useCallback(() => {
    if (selectedStrokeIds.length === 0 || !activePage) return;
    const current = activePage.drawings || [];
    const updated = current.filter((s) => !selectedStrokeIds.includes(s.id));
    handleDrawingsChange(currentPageIndex, updated);
    handleCloseLassoSelection();
  }, [selectedStrokeIds, activePage, currentPageIndex, handleDrawingsChange, handleCloseLassoSelection]);

  // Kementle seçilen el yazısını metne dönüştürme başlat (Renk & Mesafe Kümelemeli)
  // Ajandam ile aynı akış: app/ajandam/[pageId].js -> handleLassoConvertToText
  const handleLassoConvertToText = useCallback(async () => {
    if (selectedStrokes.length === 0 || !activePage) return;

    setIsRecognizingSelected(true);
    setIsRecognitionModalVisible(true);

    try {
      // 1. Çizimleri renk ve mekansal yakınlığa göre kümelere ayır
      const clusters = clusterStrokesByColorAndProximity(selectedStrokes);
      const lang = i18n.language || 'tr';

      // 2. Her kümeyi bağımsız ve paralel olarak tanı; puntoyu kümenin fiziksel yüksekliğinden üret
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
    } catch (error) {
      console.warn('Defter el yazısı tanıma hatası:', error);
    } finally {
      setIsRecognizingSelected(false);
    }
  }, [selectedStrokes, activePage, i18n.language]);

  // Modal üzerinden onaylanan metni gerçek metin kutularına dönüştür (Konum, Renk & Bireysel Boyut Mirası)
  // Ajandam ile aynı akış: app/ajandam/[pageId].js -> handleConfirmConversion
  const handleConfirmConversion = useCallback(
    ({ text, fontFamily, fontSize, clusters: confirmedClusters }) => {
      if (!activePage) return;

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
              color: c.color || textColor, // 2. Renk Mirası: Orijinal el yazısı çizim rengi
              fontSize: individualFontSize, // 3. Bireysel Boyut: Dinamik Punto
              fontFamily,
            };
          });
      }

      // Güvenlik fallback'i: Eğer küme verisi yoksa tek blok oluştur
      if (newBlocks.length === 0) {
        if (!text || !text.trim() || !selectionBounds) return;
        const fitted = fitTextToBounds(selectionBounds, text);
        newBlocks = [
          {
            id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

      const targetPageId = activePage.pageId;

      // Çizgi silme ve metin ekleme tek seferde kaydedilir; bekleyen debounce kaydı
      // eski çizimleri geri yazmasın diye iptal edilir
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      setNotebook((prev) => {
        const currentPages = [...(prev?.pages || [])];
        const pageIndex = currentPages.findIndex((pg) => pg.pageId === targetPageId);
        if (pageIndex === -1) return prev;

        const pageToUpdate = currentPages[pageIndex];
        const remainingDrawings = (pageToUpdate.drawings || []).filter(
          (stroke) => !selectedStrokeIds.includes(stroke.id)
        );
        const updatedTextBlocks = [...(pageToUpdate.textBlocks || []), ...newBlocks];

        currentPages[pageIndex] = {
          ...pageToUpdate,
          drawings: remainingDrawings,
          textBlocks: updatedTextBlocks,
        };

        storageRef.current.updatePage(targetPageId, {
          drawings: remainingDrawings,
          textBlocks: updatedTextBlocks,
        });

        return { ...prev, pages: currentPages };
      });

      setIsRecognitionModalVisible(false);
      handleCloseLassoSelection();
      setActiveMode('none');
    },
    [
      activePage,
      recognizedData.clusters,
      selectionBounds,
      selectedStrokes,
      selectedStrokeIds,
      textColor,
      handleCloseLassoSelection,
    ]
  );

  if (isLoading) {
    return (
      <AnimatedSafeAreaView
        style={[styles.safeArea, { backgroundColor: targetEdgeColor }, animatedBgStyle]}
        edges={['top', 'bottom']}
      >
        <StatusBar style="dark" backgroundColor={targetEdgeColor} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </AnimatedSafeAreaView>
    );
  }

  if (!notebook) {
    return (
      <AnimatedSafeAreaView
        style={[styles.safeArea, { backgroundColor: targetEdgeColor }, animatedBgStyle]}
        edges={['top', 'bottom']}
      >
        <StatusBar style="dark" backgroundColor={targetEdgeColor} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            {t('notebooks.notFound', 'Defter bulunamadı')}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.notFoundBack, { color: colors.accent }]}>{t('common.back', 'Geri')}</Text>
          </TouchableOpacity>
        </View>
      </AnimatedSafeAreaView>
    );
  }

  return (
    <AnimatedSafeAreaView
      style={[styles.safeArea, { backgroundColor: targetEdgeColor }, animatedBgStyle]}
      edges={['top', 'bottom']}
    >
      <StatusBar style="dark" backgroundColor={targetEdgeColor} />

      {/* Üst Menü Bar */}
      <View style={[styles.headerBar, compactHeader && styles.headerBarCompact]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[styles.headerButton, compactHeader && styles.headerButtonCompact, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Merkez: Defter Başlığı ve Sayfa İndikatörü */}
        <View style={styles.headerCenter}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          <View style={styles.pageIndicatorContainer}>
            <TouchableOpacity
              activeOpacity={0.6}
              disabled={currentPageIndex === 0}
              onPress={() => goToPage(currentPageIndex - 1)}
              style={[
                styles.arrowBtn,
                currentPageIndex === 0 && styles.arrowBtnDisabled,
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={20}
                color={currentPageIndex === 0 ? '#BDBDBD' : colors.accent}
              />
            </TouchableOpacity>

            <Text style={[styles.pageIndicatorText, { color: colors.textSecondary }]}>
              {t('diary.page', 'Sayfa')} {currentPageIndex + 1} / {pages.length}
            </Text>

            <TouchableOpacity
              activeOpacity={0.6}
              disabled={currentPageIndex === pages.length - 1}
              onPress={() => goToPage(currentPageIndex + 1)}
              style={[
                styles.arrowBtn,
                currentPageIndex === pages.length - 1 && styles.arrowBtnDisabled,
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={currentPageIndex === pages.length - 1 ? '#BDBDBD' : colors.accent}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sağ Buton Grubu: Yeni Sayfa (+), Şablon, Sticker (🎀), Silme (🗑️) */}
        <View style={[styles.headerRightGroup, compactHeader && styles.headerRightGroupCompact]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setTemplateSheetMode('newPage')}
            style={[styles.headerButton, compactHeader && styles.headerButtonCompact, styles.addPageBtn, { backgroundColor: colors.accent }]}
            accessibilityLabel={t('diary.addPage', 'Yeni Sayfa Ekle')}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setTemplateSheetMode('editPage')}
            style={[styles.headerButton, compactHeader && styles.headerButtonCompact, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityLabel={t('diary.changeTemplate', 'Şablon Değiştir')}
          >
            <MaterialCommunityIcons name="file-document-edit-outline" size={19} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsStickerMenuVisible(true)}
            style={[styles.headerButton, compactHeader && styles.headerButtonCompact, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ fontSize: 18 }}>🎀</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDeletePage}
            style={[styles.headerButton, compactHeader && styles.headerButtonCompact, styles.deleteBtn]}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={19} color="#E53935" />
          </TouchableOpacity>

          {enableSearch && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsSearchVisible(true)}
              style={[styles.headerButton, compactHeader && styles.headerButtonCompact, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityLabel={t('notebooks.search', 'Defterde Ara')}
            >
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Yatay Çoklu Sayfa Kaydırma Alanı (Paging ScrollView) */}
      <ScrollView
        ref={scrollViewRef}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={handleScroll}
        onTouchStart={handleScrollTouchStart}
        onTouchEnd={handleScrollTouchEnd}
        onTouchCancel={handleScrollTouchEnd}
        // Çizim/metin modunda, sayfa büyütülmüşken veya iki parmak ekrandayken yatay swipe kilitlenir
        scrollEnabled={activeMode === 'none' && !isActivePageZoomed && !isMultiTouch}
        onLayout={handlePagesViewportLayout}
        style={styles.horizontalScrollView}
      >
        {pages.map((p, index) => {
          const isActive = index === currentPageIndex;
          const { paper } = getPaperTemplate(resolvePagePaperTemplateId(p, notebook));

          return (
            <View
              key={p.pageId || `page_${index}`}
              style={[
                styles.pageSlide,
                { width: windowWidth },
                pagesViewportHeight > 0 && { height: pagesViewportHeight },
              ]}
            >
              <ZoomableCanvas
                ref={(r) => {
                  if (r) canvasRefs.current[p.pageId] = r;
                  else delete canvasRefs.current[p.pageId];
                }}
                onTransformChange={isActive ? handleActiveTransformChange : undefined}
                isDrawingMode={isActive && activeMode === 'drawing'}
                isTextMode={isActive && activeMode === 'text'}
                minScale={1.0}
                maxScale={4.0}
                style={[
                  styles.canvasContainer,
                  isTablet && {
                    maxWidth: maxContentWidth,
                    alignSelf: 'center',
                    width: '100%',
                    paddingVertical: 10,
                  },
                ]}
              >
                <NotebookContainer
                  coverColor="#FCE4EC"
                  showSpiral={!isTwoPage}
                >
                  <PaperSheet
                    ruling={paper.ruling}
                    paperColor={paper.paperColor}
                    lineColor={paper.lineColor}
                    showMargin={paper.ruling === 'lined'}
                    style={styles.paperSheet}
                  >
                    {/* Boş alan - PaperSheet ruling dokusu içerir */}
                    <View style={styles.sheetInner} />
                  </PaperSheet>
                </NotebookContainer>

                {/* Serbest Metin Katmanı */}
                <TextCanvas
                  isTextMode={isActive && activeMode === 'text'}
                  isDrawingMode={isActive && activeMode === 'drawing'}
                  textBlocks={p.textBlocks || []}
                  onTextBlocksChange={(blocks) => handleTextBlocksChange(index, blocks)}
                  activeColor={textColor}
                  activeFontSize={textFontSize}
                  isEraserActive={activeMode === 'drawing' && drawingTool === 'eraser'}
                  pointerEvents={
                    !isActive
                      ? 'none'
                      : activeMode === 'drawing'
                      ? 'none'
                      : activeMode === 'text'
                      ? 'auto'
                      : 'box-none'
                  }
                />

                {/* Çizim Katmanı */}
                <DrawingCanvas
                  isDrawingMode={isActive && activeMode === 'drawing'}
                  tool={drawingTool}
                  color={drawingColor}
                  strokeWidth={drawingWidth}
                  drawings={p.drawings || []}
                  onDrawingsChange={(drawings) => handleDrawingsChange(index, drawings)}
                  textBlocks={p.textBlocks || []}
                  onTextBlocksChange={(blocks) => handleTextBlocksChange(index, blocks)}
                  selectedStrokeIds={isActive ? selectedStrokeIds : []}
                  selectionBounds={isActive ? selectionBounds : null}
                  onSelectionChange={isActive ? handleSelectionChange : undefined}
                  pointerEvents={!isActive ? 'none' : undefined}
                  style={[
                    styles.fullBleedCanvas,
                    { zIndex: isActive && activeMode === 'drawing' ? 50 : 20 },
                  ]}
                />

                {/* Kement Menüsü (Sadece aktif sayfada) */}
                {isActive && (
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
                )}

                {/* Sticker Katmanı */}
                <StickerCanvas
                  stickers={p.stickers || []}
                  onStickerMove={isActive ? handleStickerMove : () => {}}
                  onStickerResize={isActive ? handleStickerResize : () => {}}
                  onStickerDelete={isActive ? handleStickerDelete : () => {}}
                  isDrawingMode={!isActive || activeMode === 'drawing'}
                />
              </ZoomableCanvas>
            </View>
          );
        })}
      </ScrollView>

      {/* Kağıt Şablonu Seçici (Yeni sayfa / Aktif sayfa) - yeni sayfada newPageTemplateSource'a göre seçili gelir */}
      <PaperTemplateModal
        visible={templateSheetMode !== null}
        onClose={() => setTemplateSheetMode(null)}
        currentTemplateId={
          templateSheetMode === 'newPage' && newPageTemplateSource === 'notebookDefault'
            ? notebook?.paperTemplateId || DEFAULT_PAPER_TEMPLATE_ID
            : activePaperTemplateId
        }
        onSelectTemplate={templateSheetMode === 'newPage' ? handleAddPage : handleChangePageTemplate}
        mode={templateSheetMode || 'editPage'}
      />

      {/* Defter İçi Arama: sonuca dokununca o sayfaya gidilir ve arama kapanır */}
      {enableSearch && (
        <NotebookSearchSheet
          visible={isSearchVisible}
          onClose={() => setIsSearchVisible(false)}
          pages={pages}
          onSelectResult={(pageIndex) => {
            setIsSearchVisible(false);
            goToPage(pageIndex);
          }}
        />
      )}

      {/* Sticker Menüsü */}
      <StickerMenu
        visible={isStickerMenuVisible}
        onClose={() => setIsStickerMenuVisible(false)}
        onSelectSticker={handleSelectSticker}
      />

      {/* El Yazısı Tanıma Onay Modalı */}
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

      {/* Geri Al / Bildirim Toast'ı */}
      <UndoToast
        key={undoToast.id}
        visible={undoToast.visible}
        message={undoToast.message}
        onUndo={handleUndoLastAction}
        onDismiss={handleDismissUndoToast}
      />

      {/* Yüzen Çizim ve Metin Araç Çubuğu */}
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
          onChangeColor={setDrawingColor}
          currentWidth={drawingWidth}
          onChangeWidth={setDrawingWidth}
          textColor={textColor}
          onChangeTextColor={setTextColor}
          textFontSize={textFontSize}
          onChangeTextFontSize={setTextFontSize}
          onUndo={handleUndoDrawing}
          canUndo={(activePage?.drawings || []).length > 0}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    textAlign: 'center',
  },
  notFoundBack: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addPageBtn: {
    borderWidth: 0,
    shadowColor: '#C2185B',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteBtn: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  arrowBtn: {
    padding: 2,
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBarCompact: {
    paddingHorizontal: 10,
  },
  headerButtonCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerRightGroupCompact: {
    gap: 5,
  },
  horizontalScrollView: {
    flex: 1,
  },
  pageSlide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  paperSheet: {
    flex: 1,
  },
  sheetInner: {
    flex: 1,
  },
  fullBleedCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingToolbarContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 990,
    elevation: 15,
  },
});
