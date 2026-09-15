import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import {
  DEFAULT_COVER_TEMPLATE_ID,
  getCoverTemplateById,
  getCoverEdgeColor,
} from '../../constants/coverTemplates';
import useDynamicEdgeColor from '../../hooks/useDynamicEdgeColor';
import CoverEditor from '../../components/CoverEditor';
import PaperTemplateModal from '../../components/PaperTemplateModal';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import Skeleton from '../../components/ui/Skeleton';
import ImageWithSkeleton from '../../components/ui/ImageWithSkeleton';
import InteractiveCover3D from '../../components/stationery/InteractiveCover3D';

import DrawingCanvas from '../../components/drawing/DrawingCanvas';
import DrawingToolbar from '../../components/drawing/DrawingToolbar';
import TextCanvas from '../../components/text/TextCanvas';

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

export default function GunlugumCoverScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [diary, setDiary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoverEditorVisible, setIsCoverEditorVisible] = useState(false);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);

  // Kapak Şablonu ve Dinamik Kenar Rengi
  const coverTemplate = getCoverTemplateById(diary?.coverTemplateId || DEFAULT_COVER_TEMPLATE_ID);
  const targetEdgeColor = getCoverEdgeColor(coverTemplate, colors.background);
  const { animatedStyle: animatedBgStyle } = useDynamicEdgeColor(targetEdgeColor, colors.background, 300);

  // Araç Çubuğu Aktif Mod: 'none' | 'drawing' | 'text'
  const [activeMode, setActiveMode] = useState('none');

  // Çizim Ayarları
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#C2185B');
  const [drawingWidth, setDrawingWidth] = useState(3);

  // Metin Ayarları
  const [textColor, setTextColor] = useState('#4E342E');
  const [textFontSize, setTextFontSize] = useState(24);

  // Kapak çizimleri ve metinleri ayrı alanlara yazıldığı için ayrı debounce zamanlayıcıları kullanılır
  const drawingsSaveTimeoutRef = useRef(null);
  const textBlocksSaveTimeoutRef = useRef(null);

  // Günlük verilerini yükle: ekran her odaklandığında güncel kayıt okunur.
  // Sayfalar ekranından geri dönüldüğünde kapak state'i bayat kalmaz.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const savedDiary = await StorageService.getDiary();
          if (isActive && savedDiary) setDiary(savedDiary);
        } catch (error) {
          console.warn('Günlük yüklenirken hata:', error);
        } finally {
          if (isActive) setIsLoading(false);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  // Kapak şablonunu güncelle ve kaydet (yalnızca kapak alanı; sayfalara dokunulmaz)
  const handleSaveCover = useCallback(async (newCoverData) => {
    setDiary((prev) => ({ ...prev, coverTemplateId: newCoverData.templateId }));
    await StorageService.updateDiaryMeta({ coverTemplateId: newCoverData.templateId });
  }, []);

  // Yeni sayfaların varsayılan kağıt şablonunu güncelle ve kaydet
  const handleSelectPaperTemplate = useCallback(async (templateId) => {
    setDiary((prev) => ({ ...prev, paperTemplateId: templateId }));
    await StorageService.updateDiaryMeta({ paperTemplateId: templateId });
  }, []);

  // Kapak çizimlerini güncelle (debounced auto-save)
  const handleDrawingsChange = useCallback((newDrawings) => {
    setDiary((prev) => ({ ...prev, coverDrawings: newDrawings }));
    if (drawingsSaveTimeoutRef.current) clearTimeout(drawingsSaveTimeoutRef.current);
    drawingsSaveTimeoutRef.current = setTimeout(() => {
      StorageService.updateDiaryMeta({ coverDrawings: newDrawings });
    }, 500);
  }, []);

  // Kapak serbest metin kutularını güncelle (debounced auto-save)
  const handleTextBlocksChange = useCallback((newTextBlocks) => {
    setDiary((prev) => ({ ...prev, coverTextBlocks: newTextBlocks }));
    if (textBlocksSaveTimeoutRef.current) clearTimeout(textBlocksSaveTimeoutRef.current);
    textBlocksSaveTimeoutRef.current = setTimeout(() => {
      StorageService.updateDiaryMeta({ coverTextBlocks: newTextBlocks });
    }, 400);
  }, []);

  // Son çizgiyi geri al
  const handleUndoDrawing = useCallback(() => {
    const current = diary?.coverDrawings || [];
    if (current.length === 0) return;
    const updatedDrawings = current.slice(0, current.length - 1);
    // Bekleyen çizim kaydı geri alınan çizgiyi tekrar yazmasın
    if (drawingsSaveTimeoutRef.current) clearTimeout(drawingsSaveTimeoutRef.current);
    setDiary((prev) => ({ ...prev, coverDrawings: updatedDrawings }));
    StorageService.updateDiaryMeta({ coverDrawings: updatedDrawings });
  }, [diary?.coverDrawings]);

  // Günlüğün sayfalarını aç
  const handleOpenDiary = useCallback(() => {
    router.push('/gunlugum/pages');
  }, [router]);

  if (isLoading) {
    return (
      <AnimatedSafeAreaView
        style={[styles.safeArea, animatedBgStyle]}
        edges={['top', 'bottom']}
      >
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Skeleton width={140} height={18} borderRadius={4} />
          </View>
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

        <View style={styles.headerCenter}>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
            {t('diary.coverTitle', 'Günlük Kapağı')}
          </Text>
        </View>

        <View style={styles.headerRightGroup}>
          {/* İç Sayfa Kağıt Şablonu Seçimi */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsTemplateModalVisible(true)}
            style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="file-document-edit-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Kapak Görseli Değiştirme */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsCoverEditorVisible(true)}
            style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="image-edit-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Merkezlenmiş Kapak Görseli ve 3D İnteraktif Katmanlar */}
      <View style={[styles.contentArea, { backgroundColor: 'transparent' }]}>
        <InteractiveCover3D
          style={styles.coverContainer}
          disabled={activeMode !== 'none'}
          onPress={handleOpenDiary}
          maxTilt={6}
        >
          <ImageWithSkeleton
            isBackground={true}
            source={coverTemplate.imageSource}
            style={styles.fullBleedBackground}
            resizeMode="cover"
          >
            {/* Metin Katmanı */}
            <TextCanvas
              isTextMode={activeMode === 'text'}
              isDrawingMode={activeMode === 'drawing'}
              textBlocks={diary?.coverTextBlocks || []}
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
              drawings={diary?.coverDrawings || []}
              onDrawingsChange={handleDrawingsChange}
              textBlocks={diary?.coverTextBlocks || []}
              onTextBlocksChange={handleTextBlocksChange}
              style={[
                styles.fullBleedCanvas,
                { zIndex: activeMode === 'drawing' ? 50 : 20 },
              ]}
            />
          </ImageWithSkeleton>
        </InteractiveCover3D>

        {/* Günlüğü Aç Butonu (Girly CTA) */}
        {activeMode === 'none' && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenDiary}
            style={[styles.openDiaryBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.openDiaryBtnText}>
              {t('diary.openDiaryButton', '🌸 Günlüğümü Aç')}
            </Text>
            <MaterialCommunityIcons name="book-open-page-variant" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Kapak Seçim Modalı */}
      <CoverEditor
        visible={isCoverEditorVisible}
        onClose={() => setIsCoverEditorVisible(false)}
        coverData={{ templateId: diary?.coverTemplateId }}
        onSave={handleSaveCover}
      />

      {/* Sayfa Şablonu Seçim Modalı */}
      <PaperTemplateModal
        visible={isTemplateModalVisible}
        onClose={() => setIsTemplateModalVisible(false)}
        currentTemplateId={diary?.paperTemplateId || 'blank_lined'}
        onSelectTemplate={handleSelectPaperTemplate}
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
          onChangeColor={setDrawingColor}
          currentWidth={drawingWidth}
          onChangeWidth={setDrawingWidth}
          textColor={textColor}
          onChangeTextColor={setTextColor}
          textFontSize={textFontSize}
          onChangeTextFontSize={setTextFontSize}
          onUndo={handleUndoDrawing}
          canUndo={(diary?.coverDrawings || []).length > 0}
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 8,
  },
  coverContainer: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 0.72,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: '#FFFFFF',
  },
  fullBleedBackground: {
    width: '100%',
    height: '100%',
  },
  fullBleedCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  openDiaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 18,
    gap: 8,
    shadowColor: '#C2185B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  openDiaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  floatingToolbarContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 990,
    elevation: 15,
  },
});
