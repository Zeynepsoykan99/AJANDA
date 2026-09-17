import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  authenticateWithBiometrics,
  isSessionUnlocked,
  unlockSession,
  lockSession,
} from '../../services/biometricService';
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
import DatePickerModal from '../../components/ui/DatePickerModal';
import GlobalSearchModal from '../../components/ui/GlobalSearchModal';
import MonthlyMoodAnalyticsModal from '../diary/MonthlyMoodAnalyticsModal';
import { isSameDay, formatFilterDate } from '../../components/ui/GlobalFilterHeader';

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

/**
 * NotebookCoverView - Defter Kapağı (Günlüğüm ve Notlarım ortak ekranı)
 * 3D interaktif kapak, kapak üzerine çizim/metin, kapak galerisi, yeni sayfalar için varsayılan kağıt seçimi
 * ve defteri açma butonu.
 *
 * @param {object} storage - Veri işlemleri (Promise döndürür)
 *   load() -> defter | null
 *   updateMeta(fields) -> defter | null  (yalnızca kapak / varsayılan şablon alanları)
 * @param {(notebook) => string} getTitle - Üst bardaki başlık
 * @param {string} openButtonLabel - Defteri açma butonunun metni
 * @param {function} onOpen - Sayfalara geçiş
 * @param {boolean} [showSearch=false] - Sağ üstte arama butonu gösterilsin mi
 * @param {boolean} [showDatePicker=false] - Sağ üstte tarih filtreleme butonu gösterilsin mi
 * @param {string} [searchCategory='gunlugum'] - GlobalSearchModal varsayılan sekmesi
 * @param {function} [onSelectDate] - Özel tarih seçimi callback'i
 */
export default function NotebookCoverView({
  storage,
  getTitle,
  openButtonLabel,
  onOpen,
  showSearch = false,
  showDatePicker = false,
  showMoodAnalytics = false,
  searchCategory = 'gunlugum',
  onSelectDate,
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { isTablet } = useResponsiveLayout();

  const [notebook, setNotebook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoverEditorVisible, setIsCoverEditorVisible] = useState(false);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [isMoodAnalyticsVisible, setIsMoodAnalyticsVisible] = useState(false);
  const [filterDate, setFilterDate] = useState(null);


  // Kapak Şablonu ve Dinamik Kenar Rengi
  const coverTemplate = getCoverTemplateById(notebook?.coverTemplateId || DEFAULT_COVER_TEMPLATE_ID);
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

  const storageRef = useRef(storage);
  storageRef.current = storage;

  // Kapak çizimleri ve metinleri ayrı alanlara yazıldığı için ayrı debounce zamanlayıcıları kullanılır
  const drawingsSaveTimeoutRef = useRef(null);
  const textBlocksSaveTimeoutRef = useRef(null);

  // Defter verilerini yükle: ekran her odaklandığında güncel kayıt okunur.
  // Sayfalar ekranından geri dönüldüğünde kapak state'i bayat kalmaz.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const savedNotebook = await storageRef.current.load();
          if (isActive) setNotebook(savedNotebook || null);
        } catch (error) {
          console.warn('Defter yüklenirken hata:', error);
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
    setNotebook((prev) => ({ ...prev, coverTemplateId: newCoverData.templateId }));
    await storageRef.current.updateMeta({ coverTemplateId: newCoverData.templateId });
  }, []);

  // Yeni sayfaların varsayılan kağıt şablonunu güncelle ve kaydet
  const handleSelectPaperTemplate = useCallback(async (templateId) => {
    setNotebook((prev) => ({ ...prev, paperTemplateId: templateId }));
    await storageRef.current.updateMeta({ paperTemplateId: templateId });
  }, []);

  // Kapak çizimlerini güncelle (debounced auto-save)
  const handleDrawingsChange = useCallback((newDrawings) => {
    setNotebook((prev) => ({ ...prev, coverDrawings: newDrawings }));
    if (drawingsSaveTimeoutRef.current) clearTimeout(drawingsSaveTimeoutRef.current);
    drawingsSaveTimeoutRef.current = setTimeout(() => {
      storageRef.current.updateMeta({ coverDrawings: newDrawings });
    }, 500);
  }, []);

  // Kapak serbest metin kutularını güncelle (debounced auto-save)
  const handleTextBlocksChange = useCallback((newTextBlocks) => {
    setNotebook((prev) => ({ ...prev, coverTextBlocks: newTextBlocks }));
    if (textBlocksSaveTimeoutRef.current) clearTimeout(textBlocksSaveTimeoutRef.current);
    textBlocksSaveTimeoutRef.current = setTimeout(() => {
      storageRef.current.updateMeta({ coverTextBlocks: newTextBlocks });
    }, 400);
  }, []);

  // Son çizgiyi geri al
  const handleUndoDrawing = useCallback(() => {
    const current = notebook?.coverDrawings || [];
    if (current.length === 0) return;
    const updatedDrawings = current.slice(0, current.length - 1);
    // Bekleyen çizim kaydı geri alınan çizgiyi tekrar yazmasın
    if (drawingsSaveTimeoutRef.current) clearTimeout(drawingsSaveTimeoutRef.current);
    setNotebook((prev) => ({ ...prev, coverDrawings: updatedDrawings }));
    storageRef.current.updateMeta({ coverDrawings: updatedDrawings });
  }, [notebook?.coverDrawings]);

  // Kilit durumunu değiştir (biyometrik onay gerektirir)
  const handleToggleLock = useCallback(async () => {
    if (!notebook) return;
    const targetId = notebook?.id || 'diary';
    const isCurrentlyLocked = !!notebook?.isLocked;

    const promptMessage = isCurrentlyLocked
      ? t('security.unlockToRemoveLock', 'Kilidi kaldırmak için kimliğinizi doğrulayın')
      : t('security.lockConfirm', 'Bu defteri kilitlemek için kimliğinizi doğrulayın');

    const result = await authenticateWithBiometrics({
      promptMessage,
      fallbackLabel: t('security.fallbackPasscode', 'Cihaz Parolasını Kullan'),
      cancelLabel: t('common.cancel', 'Vazgeç'),
    });

    if (result.success) {
      const nextLocked = !isCurrentlyLocked;
      setNotebook((prev) => ({ ...prev, isLocked: nextLocked }));
      await storageRef.current.updateMeta({ isLocked: nextLocked });
      if (nextLocked) {
        unlockSession(targetId);
      } else {
        lockSession(targetId);
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } else if (result.error && result.error !== 'user_cancel' && result.error !== 'system_cancel') {
      Alert.alert(
        t('common.error', 'Hata'),
        t('security.authFailed', 'Kimlik doğrulanamadı. Lütfen tekrar deneyin.')
      );
    }
  }, [notebook, t]);

  // Defterin sayfalarını aç (kilitliyse önce doğrula)
  const handleOpenNotebook = useCallback(async () => {
    if (!notebook) return;
    const targetId = notebook?.id || 'diary';
    if (notebook?.isLocked && !isSessionUnlocked(targetId)) {
      const result = await authenticateWithBiometrics({
        promptMessage: t('security.unlockToOpen', {
          title: notebook?.title || '',
          defaultValue: 'Defteri açmak için kimliğinizi doğrulayın',
        }),
        fallbackLabel: t('security.fallbackPasscode', 'Cihaz Parolasını Kullan'),
        cancelLabel: t('common.cancel', 'Vazgeç'),
      });

      if (!result.success) {
        return;
      }
      unlockSession(targetId);
    }

    if (onOpen) onOpen();
  }, [notebook, onOpen, t]);

  // Tarih seçildiğinde ilgili sayfayı bul ve yönlendir
  const handleDateSelect = useCallback(
    async (selectedDate) => {
      setIsDatePickerVisible(false);
      setFilterDate(selectedDate);
      if (onSelectDate) {
        onSelectDate(selectedDate);
        return;
      }
      if (!selectedDate) return;

      // Kilit kontrolü
      const targetId = notebook?.id || 'diary';
      if (notebook?.isLocked && !isSessionUnlocked(targetId)) {
        const result = await authenticateWithBiometrics({
          promptMessage: t('security.unlockToOpen', {
            title: notebook?.title || '',
            defaultValue: 'Defteri açmak için kimliğinizi doğrulayın',
          }),
          fallbackLabel: t('security.fallbackPasscode', 'Cihaz Parolasını Kullan'),
          cancelLabel: t('common.cancel', 'Vazgeç'),
        });
        if (!result.success) return;
        unlockSession(targetId);
      }

      const matchPage = notebook?.pages?.find((p) => isSameDay(p.createdAt, selectedDate));
      if (matchPage) {
        if (onOpen) {
          onOpen(matchPage);
        } else {
          router.push(`/gunlugum/pages?pageId=${matchPage.pageId}`);
        }
      } else {
        const dateStr = formatFilterDate(selectedDate, i18n.language);
        Alert.alert(
          t('diary.noEntryTitle', 'Kayıt Bulunamadı'),
          t('diary.noEntryForDate', {
            date: dateStr,
            defaultValue: `${dateStr} tarihine ait bir sayfa bulunamadı.`,
          })
        );
      }
    },
    [notebook, onOpen, onSelectDate, router, i18n.language, t]
  );


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

  if (!notebook) {
    return (
      <AnimatedSafeAreaView style={[styles.safeArea, animatedBgStyle]} edges={['top', 'bottom']}>
        <View style={[styles.contentArea, { backgroundColor: 'transparent' }]}>
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
          {/* Biyometrik Kilit Butonu */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleToggleLock}
            style={[
              styles.headerButton,
              { backgroundColor: colors.card, borderColor: colors.border },
              notebook?.isLocked && { backgroundColor: colors.accent + '20', borderColor: colors.accent },
            ]}
            accessibilityLabel={
              notebook?.isLocked
                ? t('security.unlockNotebook', 'Kilidi Kaldır')
                : t('security.lockNotebook', 'Bu Defteri Kilitle')
            }
          >
            <MaterialCommunityIcons
              name={notebook?.isLocked ? 'lock' : 'lock-open-outline'}
              size={20}
              color={notebook?.isLocked ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>

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

          {/* Arama Butonu */}
          {showSearch && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsSearchModalVisible(true)}
              style={[styles.headerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityLabel={t('common.search', 'Ara...')}
            >
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Tarih Filtresi / Atlama Butonu */}
          {showDatePicker && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsDatePickerVisible(true)}
              style={[
                styles.headerButton,
                {
                  backgroundColor: filterDate ? colors.accent + '20' : colors.card,
                  borderColor: filterDate ? colors.accent : colors.border,
                },
              ]}
              accessibilityLabel={t('datePicker.title', 'Tarihe Göre Filtrele')}
            >
              <MaterialCommunityIcons
                name="calendar-search"
                size={20}
                color={filterDate ? colors.accent : colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* Aylık Duygu Özeti (Spotify Wrapped) Butonu */}
          {showMoodAnalytics && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsMoodAnalyticsVisible(true)}
              style={[
                styles.headerButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              accessibilityLabel={t('analytics.badgeTitle', 'Aylık Duygu Özeti')}
            >
              <MaterialCommunityIcons name="sparkles" size={20} color="#C2185B" />
            </TouchableOpacity>
          )}
        </View>
      </View>


      {/* Merkezlenmiş Kapak Görseli ve 3D İnteraktif Katmanlar */}
      <View style={[styles.contentArea, { backgroundColor: 'transparent' }]}>
        <InteractiveCover3D
          style={styles.coverContainer}
          disabled={activeMode !== 'none'}
          onPress={handleOpenNotebook}
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
              textBlocks={notebook?.coverTextBlocks || []}
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
              drawings={notebook?.coverDrawings || []}
              onDrawingsChange={handleDrawingsChange}
              textBlocks={notebook?.coverTextBlocks || []}
              onTextBlocksChange={handleTextBlocksChange}
              style={[
                styles.fullBleedCanvas,
                { zIndex: activeMode === 'drawing' ? 50 : 20 },
              ]}
            />
          </ImageWithSkeleton>

          {/* Kilitli Defter Rozeti */}
          {notebook?.isLocked ? (
            <View style={styles.coverLockBadge} pointerEvents="none">
              <MaterialCommunityIcons name="lock" size={18} color="#FFFFFF" />
            </View>
          ) : null}
        </InteractiveCover3D>

      </View>

      {/* Kapak Seçim Modalı */}
      <CoverEditor
        visible={isCoverEditorVisible}
        onClose={() => setIsCoverEditorVisible(false)}
        coverData={{ templateId: notebook?.coverTemplateId }}
        onSave={handleSaveCover}
      />

      {/* Sayfa Şablonu Seçim Modalı */}
      <PaperTemplateModal
        visible={isTemplateModalVisible}
        onClose={() => setIsTemplateModalVisible(false)}
        currentTemplateId={notebook?.paperTemplateId || 'blank_lined'}
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
          canUndo={(notebook?.coverDrawings || []).length > 0}
        />
      </View>

      {/* Tarih Seçici Modal */}
      {showDatePicker && (
        <DatePickerModal
          visible={isDatePickerVisible}
          onClose={() => setIsDatePickerVisible(false)}
          onSelectDate={handleDateSelect}
          selectedDate={filterDate}
          onClearFilter={() => {
            setFilterDate(null);
            setIsDatePickerVisible(false);
          }}
        />
      )}

      {/* Global Arama Modalı */}
      {showSearch && (
        <GlobalSearchModal
          visible={isSearchModalVisible}
          onClose={() => setIsSearchModalVisible(false)}
          initialCategory={searchCategory}
        />
      )}

      {/* Aylık Duygu Özeti (Spotify Wrapped) Modalı */}
      {showMoodAnalytics && (
        <MonthlyMoodAnalyticsModal
          visible={isMoodAnalyticsVisible}
          onClose={() => setIsMoodAnalyticsVisible(false)}
          pages={notebook?.pages || []}
        />
      )}
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
  notFoundText: {
    fontSize: 16,
    textAlign: 'center',
  },
  notFoundBack: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
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
  coverLockBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  floatingToolbarContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 990,
    elevation: 15,
  },
});
