import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import {
  DEFAULT_COVER_TEMPLATE_ID,
  getCoverTemplateById,
} from '../../constants/coverTemplates';
import CoverEditor from '../../components/CoverEditor';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import Skeleton from '../../components/ui/Skeleton';
import ImageWithSkeleton from '../../components/ui/ImageWithSkeleton';
import InteractiveCover3D from '../../components/stationery/InteractiveCover3D';

import DrawingCanvas from '../../components/drawing/DrawingCanvas';
import DrawingToolbar from '../../components/drawing/DrawingToolbar';
import TextCanvas from '../../components/text/TextCanvas';
import { recognizeHandwriting } from '../../services/handwritingService';

/**
 * AjandamScreen - Ajanda Kapağı Ekranı (Full-Bleed ve Çizilebilir)
 * Kullanıcıyı tam sayfa bir kapak karşılar.
 * Kapağın üzerine çizim yapabilir, metin ekleyebilir ve kapağı değiştirebilir.
 */
export default function AjandamScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [coverData, setCoverData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorVisible, setIsEditorVisible] = useState(false);

  // Araç Çubuğu Aktif Mod: 'none' | 'drawing' | 'text'
  const [activeMode, setActiveMode] = useState('none');

  // Çizim Ayarları
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#C2185B');
  const [drawingWidth, setDrawingWidth] = useState(3);

  // Klavye / Metin Ayarları
  const [textColor, setTextColor] = useState('#4E342E');
  const [textFontSize, setTextFontSize] = useState(24); // Kapakta font biraz daha büyük olabilir

  const saveTimeoutRef = useRef(null);
  const recognitionTimeoutRef = useRef(null);

  // Kapak verilerini yükle
  useEffect(() => {
    (async () => {
      try {
        const saved = await StorageService.getCover();
        if (saved) {
          setCoverData(saved);
        } else {
          // Varsayılan kapak
          setCoverData({
            templateId: DEFAULT_COVER_TEMPLATE_ID,
            drawings: [],
            textBlocks: [],
          });
        }
      } catch (error) {
        console.warn('Kapak yüklenirken hata:', error);
        setCoverData({
          templateId: DEFAULT_COVER_TEMPLATE_ID,
          drawings: [],
          textBlocks: [],
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Kapak şablonunu kaydet
  const handleSaveCover = useCallback(async (newCoverData) => {
    setCoverData(newCoverData);
    await StorageService.setCover(newCoverData);
  }, []);

  // Çizimleri güncelle (debounced auto-save & digital ink recognition)
  const handleDrawingsChange = useCallback((newDrawings) => {
    setCoverData((prev) => {
      const updated = { ...prev, drawings: newDrawings };
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await StorageService.setCover(updated);
      }, 500);

      // Kapak El Yazısı Tanıma
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      if (!newDrawings || newDrawings.length === 0) {
        StorageService.getCover().then((cov) => {
          if (cov) StorageService.setCover({ ...cov, recognizedText: '', recognizedWords: [] });
        });
      } else {
        recognitionTimeoutRef.current = setTimeout(async () => {
          const result = await recognizeHandwriting(newDrawings, { language: 'tr' });
          if (result.success && !result.aborted && !result.stale) {
            setCoverData((current) => ({
              ...current,
              recognizedText: result.text,
              recognizedWords: result.words,
            }));
            const currentCover = await StorageService.getCover();
            if (currentCover) {
              await StorageService.setCover({
                ...currentCover,
                recognizedText: result.text,
                recognizedWords: result.words,
              });
            }
          }
        }, 1000);
      }

      return updated;
    });
  }, []);

  // Serbest metin kutularını güncelle (debounced auto-save)
  const handleTextBlocksChange = useCallback((newTextBlocks) => {
    setCoverData((prev) => {
      const updated = { ...prev, textBlocks: newTextBlocks };
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await StorageService.setCover(updated);
      }, 400);
      return updated;
    });
  }, []);

  // Son çizgiyi geri al
  const handleUndoDrawing = useCallback(() => {
    setCoverData((prev) => {
      const current = prev.drawings || [];
      if (current.length === 0) return prev;
      const updatedDrawings = current.slice(0, current.length - 1);
      const updated = { ...prev, drawings: updatedDrawings };
      StorageService.setCover(updated);

      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      if (updatedDrawings.length === 0) {
        StorageService.setCover({ ...updated, recognizedText: '', recognizedWords: [] });
      } else {
        recognitionTimeoutRef.current = setTimeout(async () => {
          const result = await recognizeHandwriting(updatedDrawings, { language: 'tr' });
          if (result.success && !result.aborted && !result.stale) {
            StorageService.setCover({
              ...updated,
              recognizedText: result.text,
              recognizedWords: result.words,
            });
          }
        }, 1000);
      }

      return updated;
    });
  }, []);

  // Ajandayı aç
  const handleOpenAgenda = useCallback(() => {
    router.push('/ajandam/pages');
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <Skeleton width={38} height={38} borderRadius={19} />
          <Skeleton width={120} height={20} borderRadius={6} />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Skeleton width={38} height={38} borderRadius={19} />
            <Skeleton width={38} height={38} borderRadius={19} />
          </View>
        </View>
        <View style={[styles.contentArea, { backgroundColor: colors.background }]}>
          <Skeleton 
            width="82%" 
            height={undefined} 
            style={{ aspectRatio: 0.72, maxWidth: 420, borderRadius: 8, alignSelf: 'center' }} 
          />
        </View>
      </SafeAreaView>
    );
  }

  const template = getCoverTemplateById(coverData?.templateId);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* Üst Bar / Araç Çubuğu */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Ajanda Kapağı</Text>
        </View>

        <View style={styles.headerRightGroup}>
          <DrawingToolbar
            isDrawingMode={activeMode === 'drawing'}
            onToggleDrawingMode={() => setActiveMode((prev) => (prev === 'drawing' ? 'none' : 'drawing'))}
            isTextMode={activeMode === 'text'}
            onToggleTextMode={() => setActiveMode((prev) => (prev === 'text' ? 'none' : 'text'))}
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
            canUndo={(coverData?.drawings || []).length > 0}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsEditorVisible(true)}
            style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="image-edit-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Merkezlenmiş Kapak Görseli ve İnteraktif Katmanlar */}
      <View style={[styles.contentArea, { backgroundColor: colors.background }]}>
        <InteractiveCover3D
          style={styles.coverContainer}
          disabled={activeMode !== 'none'}
          onPress={handleOpenAgenda}
          maxTilt={6}
        >
          <ImageWithSkeleton
            isBackground={true}
            source={template.imageSource}
            style={styles.fullBleedBackground}
            resizeMode="cover"
          >
            {/* Metin Katmanı */}
            <TextCanvas
              isTextMode={activeMode === 'text'}
              textBlocks={coverData?.textBlocks || []}
              onTextBlocksChange={handleTextBlocksChange}
              activeColor={textColor}
              activeFontSize={textFontSize}
            />

            {/* Çizim Katmanı */}
            <DrawingCanvas
              isDrawingMode={activeMode === 'drawing'}
              tool={drawingTool}
              color={drawingColor}
              strokeWidth={drawingWidth}
              drawings={coverData?.drawings || []}
              onDrawingsChange={handleDrawingsChange}
              textBlocks={coverData?.textBlocks || []}
              onTextBlocksChange={handleTextBlocksChange}
              style={styles.fullBleedCanvas}
            />
          </ImageWithSkeleton>
        </InteractiveCover3D>
      </View>

      {/* Kapak Seçim Modalı */}
      <CoverEditor
        visible={isEditorVisible}
        onClose={() => setIsEditorVisible(false)}
        coverData={coverData}
        onSave={handleSaveCover}
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
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverContainer: {
    width: '82%',
    maxWidth: 420,
    aspectRatio: 0.72, // A4 defter oranı
  },
  fullBleedBackground: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  fullBleedCanvas: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});
