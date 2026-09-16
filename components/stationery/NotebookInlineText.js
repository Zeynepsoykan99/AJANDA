import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  TextInput,
  StyleSheet,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { getRulingMetrics } from '../../constants/paperRulings';

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

/**
 * NotebookInlineText - Gerçekçi Kağıt Üzerine Satır Uyumlu Metin Girişi
 *
 * Kağıt şablonunun (çizgili, kareli, noktalı, düz) satır aralıkları ve marjına
 * BİREBİR kenetlenen şeffaf ve pürüzsüz metin giriş bileşeni.
 *
 * Özellikler:
 * - Çerçevesiz, şeffaf zemin: Kullanıcı sanki kağıdın fiziksel dokusuna yazıyormuş gibi hisseder.
 * - Dinamik Line Height Sync: Kağıt şablonunun piksel aralığı ile TextInput lineHeight birebir eşlenir.
 * - Matematiksel Baseline Kalibrasyonu: Her yeni satır ve "Enter" vuruşu bir sonraki çizginin üzerine oturur.
 * - Çift Tıklama / Araç Çubuğu Odağı: Sayfaya çift dokunulduğunda veya klavye butonu seçildiğinde otomatik odaklanır.
 * - Çizim & Zum Güvenliği: Çizim modunda yazım kilitlenir, 2 parmaklı zum/pan ile asla çakışmaz.
 */
export default function NotebookInlineText({
  content = '',
  onChangeContent,
  ruling = 'lined',
  showMargin = false,
  isActive = true,
  isTextMode = false,
  isDrawingMode = false,
  onActivateTextMode,
  textColor = '#4E342E',
  textFontSize = null,
  placeholder,
  style,
}) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [localText, setLocalText] = useState(content || '');
  const lastTapRef = useRef(0);
  const debounceTimerRef = useRef(null);

  // Dışarıdan gelen content değiştiğinde (ör. sayfa değişimi veya geri al) yerel durumu senkronize et
  useEffect(() => {
    setLocalText(content || '');
  }, [content]);

  // Metin modu aktifleştiğinde otomatik odaklan (Klavye butonuna tıklandığında)
  useEffect(() => {
    if (isActive && isTextMode && !isDrawingMode) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isActive, isTextMode, isDrawingMode]);

  // Çizim moduna geçildiğinde klavyeyi kapat ve odağı bırak
  useEffect(() => {
    if (isDrawingMode && inputRef.current) {
      inputRef.current.blur();
    }
  }, [isDrawingMode]);

  // Kağıt şablonuna ve yazı boyutuna göre dinamik satır ve marj metrikleri
  const metrics = useMemo(() => {
    return getRulingMetrics(ruling, showMargin, textFontSize);
  }, [ruling, showMargin, textFontSize]);

  // 400ms debounced kayıt
  const handleTextChange = useCallback(
    (newText) => {
      setLocalText(newText);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (onChangeContent) {
          onChangeContent(newText);
        }
      }, 400);
    },
    [onChangeContent]
  );

  // Çift Tıklama (Double Tap) ile Doğrudan Yazmaya Başlama
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      triggerHaptic();
      if (onActivateTextMode) {
        onActivateTextMode();
      }
      if (inputRef.current) {
        inputRef.current.focus();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [onActivateTextMode]);

  const isEditable = isActive && !isDrawingMode;

  return (
    <Pressable
      style={styles.container}
      onPress={isEditable && !isTextMode ? handleDoubleTap : undefined}
      pointerEvents={isDrawingMode ? 'none' : 'auto'}
    >
      <TextInput
        ref={inputRef}
        value={localText}
        onChangeText={handleTextChange}
        editable={isEditable}
        multiline={true}
        scrollEnabled={false}
        textAlignVertical="top"
        placeholder={
          placeholder !== undefined
            ? placeholder
            : t('notebooks.inlinePlaceholder', 'Buraya yazmaya başlayın...')
        }
        placeholderTextColor="#BDBDBD88"
        selectionColor={textColor + '99'}
        cursorColor={textColor}
        style={[
          styles.textInput,
          {
            color: textColor,
            fontSize: metrics.fontSize,
            lineHeight: metrics.lineHeight,
            paddingTop: metrics.paddingTop,
            paddingLeft: metrics.paddingLeft,
            paddingRight: metrics.paddingRight,
            fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'normal',
          },
          Platform.select({
            android: {
              includeFontPadding: false,
            },
            web: {
              outlineStyle: 'none',
              outlineWidth: 0,
              cursor: isEditable ? 'text' : 'default',
            },
          }),
          style,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  textInput: {
    flex: 1,
    margin: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontWeight: '400',
  },
});
