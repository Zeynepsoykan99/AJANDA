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
import Animated from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import { guardWrite, isStorageReadError } from '../../services/storageErrorEvents';
import StorageReadErrorState from '../../components/ui/StorageReadErrorState';
import {
  DEFAULT_COVER_TEMPLATE_ID,
  getCoverTemplateById,
  getCoverEdgeColor,
} from '../../constants/coverTemplates';
import useDynamicEdgeColor from '../../hooks/useDynamicEdgeColor';
import CoverEditor from '../../components/CoverEditor';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import Skeleton from '../../components/ui/Skeleton';
import ImageWithSkeleton from '../../components/ui/ImageWithSkeleton';
import InteractiveCover3D from '../../components/stationery/InteractiveCover3D';

import DrawingCanvas from '../../components/drawing/DrawingCanvas';
import DrawingToolbar from '../../components/drawing/DrawingToolbar';
import TextCanvas from '../../components/text/TextCanvas';
import { recognizeHandwriting } from '../../services/handwritingService';
import { getPrivacySettings } from '../../services/privacySettingsService';

/**
 * AjandamScreen - Ajanda Kapağı Ekranı (Full-Bleed ve Çizilebilir)
 * Kullanıcıyı tam sayfa bir kapak karşılar.
 * Kapağın üzerine çizim yapabilir, metin ekleyebilir ve kapağı değiştirebilir.
 */
/**
 * Kapagi diske yazar. Basarisiz olursa "Kaydedilemedi" bildirilir ve null doner;
 * ekrandaki kapak durumu DEGISTIRILMEZ.
 */
const persistCover = (cover) => guardWrite(StorageService.setCover(cover));

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

export default function AjandamScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [coverData, setCoverData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Kayitli kapak okunamadiysa varsayilan kapak GOSTERILMEZ: gosterilseydi ilk
  // duzenleme okunamayan kapagin uzerine yazardi
  const [loadError, setLoadError] = useState(false);
  const [isEditorVisible, setIsEditorVisible] = useState(false);

  // Şablon ve Dinamik Kenar Rengi (Edge Color)
  const template = getCoverTemplateById(coverData?.templateId);
  const targetEdgeColor = getCoverEdgeColor(template, colors.background);
  const { animatedStyle: animatedBgStyle } = useDynamicEdgeColor(targetEdgeColor, colors.background, 300);

  // Araç Çubuğu Aktif Mod: 'none' | 'drawing' | 'text'
  const [activeMode, setActiveMode] = useState('none');

  // Çizim Ayarları
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#1A1A1A');
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
        const savedColor = await StorageService.getLastDrawingColor();
        if (savedColor) {
          setDrawingColor(savedColor);
        }
      } catch (error) {
        console.warn('Kapak yüklenirken hata:', error);
        if (isStorageReadError(error)) {
          setLoadError(true);
          return;
        }
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
    await persistCover(newCoverData);
  }, []);

  // Çizimleri güncelle (debounced auto-save & digital ink recognition)
  const handleDrawingsChange = useCallback((newDrawings) => {
    setCoverData((prev) => {
      const updated = { ...prev, drawings: newDrawings };
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await persistCover(updated);
      }, 500);

      // Kapak El Yazısı Tanıma
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      if (!newDrawings || newDrawings.length === 0) {
        // Okuma da yazma da basarisiz olabilir: ikisi de "Kaydedilemedi" olarak bildirilir
        guardWrite(
          StorageService.getCover().then((cov) =>
            cov ? StorageService.setCover({ ...cov, recognizedText: '', recognizedWords: [] }) : null
          )
        );
      } else {
        recognitionTimeoutRef.current = setTimeout(async () => {
          // Kullanici otomatik taniimayi kapattiysa cizgiler cihaz disina cikmaz.
          // Kement ile "metne cevir" bundan ETKILENMEZ (kullanici kendi tetikler).
          if (!(await getPrivacySettings()).autoHandwriting) return;
          const result = await recognizeHandwriting(newDrawings, { language: i18n.language || 'tr' });
          if (result.success && !result.aborted && !result.stale) {
            setCoverData((current) => ({
              ...current,
              recognizedText: result.text,
              recognizedWords: result.words,
            }));
            await guardWrite(
              StorageService.getCover().then((currentCover) =>
                currentCover
                  ? StorageService.setCover({
                      ...currentCover,
                      recognizedText: result.text,
                      recognizedWords: result.words,
                    })
                  : null
              )
            );
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
        await persistCover(updated);
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
      persistCover(updated);

      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      if (updatedDrawings.length === 0) {
        persistCover({ ...updated, recognizedText: '', recognizedWords: [] });
      } else {
        recognitionTimeoutRef.current = setTimeout(async () => {
          // Kullanici otomatik taniimayi kapattiysa cizgiler cihaz disina cikmaz.
          // Kement ile "metne cevir" bundan ETKILENMEZ (kullanici kendi tetikler).
          if (!(await getPrivacySettings()).autoHandwriting) return;
          const result = await recognizeHandwriting(updatedDrawings, { language: i18n.language || 'tr' });
          if (result.success && !result.aborted && !result.stale) {
            persistCover({
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
      <AnimatedSafeAreaView
        style={[styles.safeArea, animatedBgStyle]}
        edges={['top', 'bottom']}
      >
        {/* Skeleton Yükleme Durumu */}
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerCenter} />
          <View style={styles.headerRightGroup}>
            <Skeleton width={38} height={38} borderRadius={19} />
          </View>
        </View>

        <View style={[styles.contentArea, { backgroundColor: 'transparent' }]}>
          <Skeleton 
            width="82%" 
            height={undefined} 
            style={{ aspectRatio: 0.72, maxWidth: 420, borderRadius: 8, alignSelf: 'center' }} 
          />
        </View>
      </AnimatedSafeAreaView>
    );
  }

  if (loadError) {
    return (
      <AnimatedSafeAreaView style={[styles.safeArea, animatedBgStyle]} edges={['top', 'bottom']}>
        <StorageReadErrorState
          onBack={() => router.back()}
          secondaryAction={{
            label: t('storage.openAgendaPages', 'Ajanda sayfalarına git'),
            onPress: handleOpenAgenda,
          }}
        />
      </AnimatedSafeAreaView>
    );
  }

  return (
    <AnimatedSafeAreaView
      style={[styles.safeArea, { backgroundColor: targetEdgeColor }, animatedBgStyle]}
      edges={['top', 'bottom']}
    >
      <StatusBar style="dark" backgroundColor={targetEdgeColor} />
      {/* Üst Bar / Araç Çubuğu */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter} />

        <View style={styles.headerRightGroup}>
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
      <View style={[styles.contentArea, { backgroundColor: 'transparent' }]}>
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
              isDrawingMode={activeMode === 'drawing'}
              textBlocks={coverData?.textBlocks || []}
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
              style={[
                styles.fullBleedCanvas,
                { zIndex: activeMode === 'drawing' ? 50 : 20 },
              ]}
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

      {/* Yüzen, Sürüklenebilir ve Katlanabilir Araç Çubuğu */}
      <View style={styles.floatingToolbarContainer} pointerEvents="box-none">
        <DrawingToolbar
          isDrawingMode={activeMode === 'drawing'}
          onToggleDrawingMode={() => setActiveMode((prev) => (prev === 'drawing' ? 'none' : 'drawing'))}
          isTextMode={activeMode === 'text'}
          onToggleTextMode={() => setActiveMode((prev) => (prev === 'text' ? 'none' : 'text'))}
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
          onUndo={handleUndoDrawing}
          canUndo={(coverData?.drawings || []).length > 0}
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
  floatingToolbarContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 990,
    elevation: 15,
  },
  headerBar: {
    height: 56,
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
