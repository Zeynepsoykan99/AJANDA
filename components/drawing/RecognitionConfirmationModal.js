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
  onConfirm,
  onCancel,
}) {
  const { colors } = useTheme();

  const [text, setText] = useState(initialText);
  const [selectedFont, setSelectedFont] = useState(AVAILABLE_FONTS[0].id);
  const [fontSize, setFontSize] = useState(estimatedFontSize);

  useEffect(() => {
    if (visible) {
      setText(initialText || '');
      setFontSize(estimatedFontSize || 16);
      setSelectedFont(AVAILABLE_FONTS[0].id);
    }
  }, [visible, initialText, estimatedFontSize]);

  const activeFontObj = AVAILABLE_FONTS.find((f) => f.id === selectedFont) || AVAILABLE_FONTS[0];

  const handleSelectCandidate = (candidate) => {
    setText(candidate);
  };

  const handleIncreaseFontSize = () => {
    setFontSize((prev) => Math.min(48, prev + 2));
  };

  const handleDecreaseFontSize = () => {
    setFontSize((prev) => Math.max(12, prev - 2));
  };

  const handleConfirm = () => {
    if (!text.trim()) return;
    onConfirm({
      text: text.trim(),
      fontFamily: activeFontObj.fontFamily,
      fontId: activeFontObj.id,
      fontSize,
    });
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
                El Yazısını Metne Dönüştür
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
                El yazınız dijital mürekkep motoruyla taranıyor...
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 1. Metin Giriş / Düzeltme Alanı */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary || '#757575' }]}>
                Tanınan Metin (Gerekiyorsa düzenleyin):
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
                  placeholder="Metin bulunamadı, buraya yazabilirsiniz..."
                  placeholderTextColor={colors.textSecondary + '77'}
                  style={[
                    styles.textInput,
                    {
                      color: colors.textPrimary || '#212121',
                      fontFamily: activeFontObj.fontFamily,
                      fontSize: Math.min(22, Math.max(15, fontSize)),
                    },
                  ]}
                />
              </View>

              {/* 2. Alternatif Adaylar (Candidates) */}
              {candidates && candidates.length > 1 && (
                <View style={styles.candidatesSection}>
                  <Text style={[styles.subLabel, { color: colors.textSecondary || '#757575' }]}>
                    Alternatif Okumalar:
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
                              text === cand ? colors.accent : colors.border || '#DDD',
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

              {/* 3. Yazı Tipi Seçici (Font Picker) */}
              <View style={styles.fontSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary || '#757575' }]}>
                  Yazı Tipi (Font) Seçin:
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
                  Yazı Boyutu:
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
                  Vazgeç
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleConfirm}
                disabled={!text.trim()}
                style={[
                  styles.footerBtn,
                  styles.confirmBtn,
                  {
                    backgroundColor: colors.accent || '#C2185B',
                    opacity: text.trim() ? 1 : 0.5,
                  },
                ]}
              >
                <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Dönüştür ve Ekle</Text>
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
});
