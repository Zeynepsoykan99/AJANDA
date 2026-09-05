import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { AVAILABLE_FONTS } from '../../constants/fonts';

/**
 * RecognitionConfirmationModal
 * El yazısı tanıma sonucunu kullanıcıya sunan, metni düzeltmesine,
 * alternatif adayları seçmesine, yazı tipi (Font) ve boyut belirlemesine olanak tanıyan modal.
 */
export default function RecognitionConfirmationModal({
  visible = false,
  isLoading = false,
  initialText = '',
  candidates = [],
  estimatedFontSize = 16,
  clusters = [],
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [text, setText] = useState(initialText);
  const [clusterList, setClusterList] = useState([]);
  const [selectedFont, setSelectedFont] = useState(AVAILABLE_FONTS[0].id);
  const [fontSize, setFontSize] = useState(estimatedFontSize);

  useEffect(() => {
    if (visible) {
      if (Array.isArray(clusters) && clusters.length > 0) {
        setClusterList(
          clusters.map((c) => ({
            ...c,
            text: c.text != null ? c.text : '',
            fontSize: c.fontSize || c.estimatedFontSize || 18,
          }))
        );
        const combined = clusters.map((c) => c.text || '').filter(Boolean).join(' ');
        setText(combined || initialText || '');
      } else {
        setClusterList([]);
        setText(initialText || '');
      }
      setFontSize(estimatedFontSize || 18);
      setSelectedFont(AVAILABLE_FONTS[0].id);
    }
  }, [visible, initialText, estimatedFontSize, clusters]);

  const activeFontObj = AVAILABLE_FONTS.find((f) => f.id === selectedFont) || AVAILABLE_FONTS[0];

  const handleSelectCandidate = (candidate) => {
    setText(candidate);
  };

  const handleClusterTextChange = (index, newText) => {
    setClusterList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, text: newText } : item))
    );
  };

  const handleSelectClusterCandidate = (index, candidate) => {
    setClusterList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, text: candidate } : item))
    );
  };

  const handleClusterFontSizeChange = (index, delta) => {
    setClusterList((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const current = item.fontSize || item.estimatedFontSize || 18;
        const next = Math.max(12, Math.min(72, current + delta));
        return { ...item, fontSize: next };
      })
    );
  };

  const handleIncreaseFontSize = () => {
    if (isMultiCluster) {
      setClusterList((prev) =>
        prev.map((item) => {
          const current = item.fontSize || item.estimatedFontSize || 18;
          return { ...item, fontSize: Math.min(72, current + 2) };
        })
      );
    }
    setFontSize((prev) => Math.min(72, prev + 2));
  };

  const handleDecreaseFontSize = () => {
    if (isMultiCluster) {
      setClusterList((prev) =>
        prev.map((item) => {
          const current = item.fontSize || item.estimatedFontSize || 18;
          return { ...item, fontSize: Math.max(12, current - 2) };
        })
      );
    }
    setFontSize((prev) => Math.max(12, prev - 2));
  };

  const isMultiCluster = clusterList.length > 1;
  const hasValidText = isMultiCluster
    ? clusterList.some((c) => (c.text || '').trim().length > 0)
    : text.trim().length > 0;

  const handleConfirm = () => {
    if (!hasValidText) return;
    if (isMultiCluster) {
      onConfirm({
        text: clusterList.map((c) => c.text).filter(Boolean).join(' '),
        fontFamily: activeFontObj.fontFamily,
        fontId: activeFontObj.id,
        fontSize,
        clusters: clusterList.map((c) => ({
          ...c,
          fontSize: c.fontSize || c.estimatedFontSize || fontSize,
        })),
      });
    } else {
      onConfirm({
        text: text.trim(),
        fontFamily: activeFontObj.fontFamily,
        fontId: activeFontObj.id,
        fontSize,
        clusters:
          clusterList.length === 1
            ? [{ ...clusterList[0], text: text.trim(), fontSize }]
            : undefined,
      });
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.card || '#FFFFFF',
              borderColor: colors.border || '#E0E0E0',
            },
          ]}
        >
          {/* Başlık ve Kapat Butonu */}
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <MaterialCommunityIcons
                name="auto-fix"
                size={22}
                color={colors.accent || '#C2185B'}
              />
              <Text style={[styles.title, { color: colors.textPrimary || '#212121' }]}>
                {t('recognition.title', 'El Yazısını Metne Dönüştür')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={colors.textSecondary || '#757575'}
              />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent || '#C2185B'} />
              <Text style={[styles.loadingText, { color: colors.textSecondary || '#757575' }]}>
                {t('recognition.scanning', 'El yazınız dijital mürekkep motoruyla taranıyor...')}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {isMultiCluster ? (
                /* Çoklu Küme (Multi-Cluster) Görünümü */
                <View style={styles.multiClusterContainer}>
                  <View
                    style={[
                      styles.clustersBadge,
                      {
                        backgroundColor: (colors.accent || '#C2185B') + '15',
                        borderColor: (colors.accent || '#C2185B') + '35',
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="layers-triple-outline"
                      size={18}
                      color={colors.accent || '#C2185B'}
                    />
                    <Text
                      style={[styles.clustersBadgeText, { color: colors.accent || '#C2185B' }]}
                    >
                      {t('recognition.multipleClustersDetected', {
                        count: clusterList.length,
                        defaultValue: `${clusterList.length} el yazısı grubu tespit edildi`,
                      })}
                    </Text>
                  </View>

                  {clusterList.map((cluster, index) => {
                    const strokeColor = cluster.color || colors.textPrimary || '#212121';
                    return (
                      <View
                        key={cluster.id || index}
                        style={[
                          styles.clusterCard,
                          {
                            backgroundColor: colors.background || '#F8F9FA',
                            borderColor: colors.border || '#E0E0E0',
                          },
                        ]}
                      >
                        <View style={styles.clusterCardHeader}>
                          <View style={styles.clusterColorRow}>
                            <View
                              style={[
                                styles.colorDot,
                                { backgroundColor: strokeColor },
                              ]}
                            />
                            <Text
                              style={[
                                styles.clusterTitle,
                                { color: colors.textPrimary || '#212121' },
                              ]}
                            >
                              {t('recognition.groupTitle', {
                                number: index + 1,
                                defaultValue: `Grup #${index + 1}`,
                              })}
                            </Text>
                          </View>
                          <View style={styles.clusterHeaderRight}>
                            <Text
                              style={[
                                styles.clusterCoord,
                                { color: colors.textSecondary || '#888888' },
                              ]}
                            >
                              X: {cluster.bounds?.minX ?? 0}, Y: {cluster.bounds?.minY ?? 0}
                            </Text>
                            <View
                              style={[
                                styles.clusterFontSizeBadge,
                                {
                                  backgroundColor: colors.card || '#FFFFFF',
                                  borderColor: colors.border || '#E0E0E0',
                                },
                              ]}
                            >
                              <TouchableOpacity
                                onPress={() => handleClusterFontSizeChange(index, -2)}
                                style={styles.clusterMiniBtn}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <MaterialCommunityIcons
                                  name="minus"
                                  size={12}
                                  color={colors.textSecondary || '#666'}
                                />
                              </TouchableOpacity>
                              <Text
                                style={[
                                  styles.clusterFontSizeText,
                                  { color: colors.textPrimary || '#212121' },
                                ]}
                              >
                                {cluster.fontSize || cluster.estimatedFontSize || 18} px
                              </Text>
                              <TouchableOpacity
                                onPress={() => handleClusterFontSizeChange(index, +2)}
                                style={styles.clusterMiniBtn}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <MaterialCommunityIcons
                                  name="plus"
                                  size={12}
                                  color={colors.textSecondary || '#666'}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.clusterInputContainer,
                            {
                              backgroundColor: colors.card || '#FFFFFF',
                              borderColor: colors.border || '#E0E0E0',
                            },
                          ]}
                        >
                          <TextInput
                            value={cluster.text}
                            onChangeText={(val) => handleClusterTextChange(index, val)}
                            multiline
                            placeholder={t(
                              'recognition.placeholder',
                              'Metin bulunamadı...'
                            )}
                            placeholderTextColor={colors.textSecondary + '77'}
                            style={[
                              styles.textInput,
                              {
                                color: strokeColor,
                                fontFamily: activeFontObj.fontFamily,
                                fontSize: Math.min(
                                  32,
                                  Math.max(
                                    14,
                                    cluster.fontSize || cluster.estimatedFontSize || 18
                                  )
                                ),
                              },
                            ]}
                          />
                        </View>

                        {cluster.candidates && cluster.candidates.length > 1 && (
                          <View style={styles.candidatesSectionSmall}>
                            <Text
                              style={[
                                styles.subLabelSmall,
                                { color: colors.textSecondary || '#757575' },
                              ]}
                            >
                              {t('recognition.candidates', 'Alternatif Okumalar:')}
                            </Text>
                            <View style={styles.candidateChips}>
                              {cluster.candidates.slice(0, 4).map((cand, cIdx) => (
                                <TouchableOpacity
                                  key={cIdx}
                                  onPress={() =>
                                    handleSelectClusterCandidate(index, cand)
                                  }
                                  style={[
                                    styles.chip,
                                    {
                                      backgroundColor:
                                        cluster.text === cand
                                          ? strokeColor + '20'
                                          : colors.card,
                                      borderColor:
                                        cluster.text === cand
                                          ? strokeColor
                                          : colors.border || '#DDD',
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.chipText,
                                      {
                                        color:
                                          cluster.text === cand
                                            ? strokeColor
                                            : colors.textPrimary || '#333',
                                      },
                                    ]}
                                  >
                                    {cand}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : (
                /* Tek Küme Görünümü */
                <>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.textSecondary || '#757575' },
                    ]}
                  >
                    {t(
                      'recognition.recognizedLabel',
                      'Tanınan Metin (Gerekiyorsa düzenleyin):'
                    )}
                  </Text>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: colors.background || '#F5F5F5',
                        borderColor: colors.border || '#E0E0E0',
                      },
                    ]}
                  >
                    <TextInput
                      value={text}
                      onChangeText={setText}
                      multiline
                      placeholder={t(
                        'recognition.placeholder',
                        'Metin bulunamadı, buraya yazabilirsiniz...'
                      )}
                      placeholderTextColor={colors.textSecondary + '77'}
                      style={[
                        styles.textInput,
                        {
                          color:
                            clusterList[0]?.color || colors.textPrimary || '#212121',
                          fontFamily: activeFontObj.fontFamily,
                          fontSize: Math.min(22, Math.max(15, fontSize)),
                        },
                      ]}
                    />
                  </View>

                  {candidates && candidates.length > 1 && (
                    <View style={styles.candidatesSection}>
                      <Text
                        style={[
                          styles.subLabel,
                          { color: colors.textSecondary || '#757575' },
                        ]}
                      >
                        {t('recognition.candidates', 'Alternatif Okumalar:')}
                      </Text>
                      <View style={styles.candidateChips}>
                        {candidates.slice(0, 5).map((cand, idx) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => handleSelectCandidate(cand)}
                            style={[
                              styles.chip,
                              {
                                backgroundColor:
                                  text === cand ? colors.accent + '20' : colors.card,
                                borderColor:
                                  text === cand
                                    ? colors.accent
                                    : colors.border || '#DDD',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                {
                                  color:
                                    text === cand
                                      ? colors.accent || '#C2185B'
                                      : colors.textPrimary || '#333',
                                },
                              ]}
                            >
                              {cand}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* 3. Yazı Tipi Seçici (Font Picker) */}
              <View style={styles.fontSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary || '#757575' }]}>
                  {t('recognition.selectFont', 'Yazı Tipi (Font) Seçin:')}
                </Text>
                <View style={styles.fontsGrid}>
                  {AVAILABLE_FONTS.map((font) => {
                    const isSelected = selectedFont === font.id;
                    return (
                      <TouchableOpacity
                        key={font.id}
                        activeOpacity={0.7}
                        onPress={() => setSelectedFont(font.id)}
                        style={[
                          styles.fontCard,
                          {
                            backgroundColor: colors.card || '#FFFFFF',
                            borderColor: isSelected
                              ? colors.accent || '#C2185B'
                              : colors.border || '#E0E0E0',
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                      >
                        <View style={styles.fontCardHeader}>
                          <Text
                            style={[
                              styles.fontName,
                              {
                                color: isSelected
                                  ? colors.accent || '#C2185B'
                                  : colors.textPrimary || '#212121',
                              },
                            ]}
                          >
                            {font.name}
                          </Text>
                          {isSelected && (
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={16}
                              color={colors.accent || '#C2185B'}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.fontPreviewText,
                            {
                              fontFamily: font.fontFamily,
                              color: colors.textSecondary || '#616161',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {font.sample}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. Font Boyutu Ayarlayıcı */}
              <View style={styles.fontSizeRow}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary || '#757575', marginBottom: 0 }]}>
                  {isMultiCluster
                    ? t('recognition.fontSizeScale', 'Genel Yazı Boyutu (Ölçek):')
                    : t('recognition.fontSize', 'Yazı Boyutu:')}
                </Text>
                <View style={styles.fontSizeControls}>
                  <TouchableOpacity
                    onPress={handleDecreaseFontSize}
                    style={[styles.sizeBtn, { borderColor: colors.border || '#DDD' }]}
                  >
                    <MaterialCommunityIcons name="minus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.fontSizeValue, { color: colors.textPrimary }]}>
                    {fontSize} px
                  </Text>
                  <TouchableOpacity
                    onPress={handleIncreaseFontSize}
                    style={[styles.sizeBtn, { borderColor: colors.border || '#DDD' }]}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Alt Aksiyon Butonları */}
          {!isLoading && (
            <View style={styles.footer}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onCancel}
                style={[styles.footerBtn, styles.cancelBtn, { borderColor: colors.border || '#DDD' }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary || '#757575' }]}>
                  {t('common.cancel', 'Vazgeç')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleConfirm}
                disabled={!hasValidText}
                style={[
                  styles.footerBtn,
                  styles.confirmBtn,
                  {
                    backgroundColor: colors.accent || '#C2185B',
                    opacity: hasValidText ? 1 : 0.5,
                  },
                ]}
              >
                <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>{t('recognition.confirm', 'Dönüştür ve Ekle')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '88%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
  },
  scrollArea: {
    maxHeight: 460,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 70,
    maxHeight: 120,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    textAlignVertical: 'top',
    padding: 0,
    margin: 0,
  },
  candidatesSection: {
    marginBottom: 16,
  },
  subLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  candidateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  fontSection: {
    marginBottom: 16,
  },
  fontsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fontCard: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
  },
  fontCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fontName: {
    fontSize: 13,
    fontWeight: '600',
  },
  fontPreviewText: {
    fontSize: 14,
  },
  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sizeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 46,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 14,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    paddingHorizontal: 20,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  multiClusterContainer: {
    marginBottom: 16,
    gap: 12,
  },
  clustersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  clustersBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  clusterCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  clusterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clusterColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  clusterTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  clusterCoord: {
    fontSize: 11,
    fontWeight: '500',
  },
  clusterInputContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 52,
    maxHeight: 100,
  },
  candidatesSectionSmall: {
    marginTop: 2,
  },
  clusterHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clusterFontSizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  clusterMiniBtn: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterFontSizeText: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  subLabelSmall: {
    fontSize: 11,
    marginBottom: 4,
  },
});
