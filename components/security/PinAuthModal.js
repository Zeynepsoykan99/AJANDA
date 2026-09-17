import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { SecurityService } from '../../services/securityService';
import {
  authenticateWithBiometrics,
  getBiometricTypeInfo,
} from '../../services/biometricService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * PinAuthModal - 4 Haneli PIN Giriş ve Güvenlik Modalı
 *
 * @param {object} props
 * @param {boolean} props.visible - Modal görünürlüğü
 * @param {'setup'|'verify'|'remove'} [props.mode='verify'] - Çalışma modu
 * @param {string} [props.targetId='diary'] - Hedef kimlik ('diary' veya defter kimliği)
 * @param {string} [props.itemTitle] - Kilitlenen öğe başlığı
 * @param {function} props.onSuccess - Başarılı doğrulama/kurulum callback'i
 * @param {function} props.onClose - Modalı kapatma callback'i
 */
export default function PinAuthModal({
  visible,
  mode = 'verify',
  targetId = 'diary',
  itemTitle = '',
  onSuccess,
  onClose,
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  // Pin Giriş State'leri
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState(''); // Setup modunda ilk girilen PIN
  const [setupStep, setSetupStep] = useState(1); // 1 = PIN belirle, 2 = PIN onayla
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricInfo, setBiometricInfo] = useState({ type: 'none', icon: 'fingerprint' });

  // Sallantı (Shake) Animasyonu
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Biyometrik donanım bilgisini oku
  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const info = await getBiometricTypeInfo();
        if (isActive) setBiometricInfo(info);
      } catch {}
    })();
    return () => {
      isActive = false;
    };
  }, []);

  // Modal her açıldığında state'leri sıfırla
  useEffect(() => {
    if (visible) {
      setPin('');
      setFirstPin('');
      setSetupStep(1);
      setErrorMessage('');
    }
  }, [visible, mode]);

  // Hata sallantı animasyonu
  const triggerShake = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // Biyometrik Kimlik Doğrulama Kısayolu
  const triggerBiometrics = useCallback(async () => {
    try {
      const result = await authenticateWithBiometrics({
        promptMessage: t('security.unlockPrompt', 'İçeriğe erişmek için kimliğinizi doğrulayın'),
        fallbackLabel: t('security.fallbackPasscode', 'PIN Kodunu Kullan'),
        cancelLabel: t('common.cancel', 'Vazgeç'),
      });

      if (result.success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        SecurityService.unlockSession(targetId);
        onSuccess && onSuccess();
        onClose && onClose();
      }
    } catch (err) {
      console.warn('[PinAuthModal] Biyometri hatası:', err);
    }
  }, [targetId, onSuccess, onClose, t]);

  // PIN Girişini Değerlendir (4 hane tamamlandığında otomatik tetiklenir)
  const handleCompletePin = useCallback(
    async (enteredPin) => {
      if (mode === 'setup') {
        if (setupStep === 1) {
          // 1. Adım: İlk PIN kaydedildi, 2. adıma geç
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch {}
          setFirstPin(enteredPin);
          setPin('');
          setSetupStep(2);
          setErrorMessage('');
        } else {
          // 2. Adım: Onaylama
          if (enteredPin === firstPin) {
            const saved = await SecurityService.setPin(enteredPin, targetId);
            if (saved) {
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {}
              SecurityService.unlockSession(targetId);
              onSuccess && onSuccess(true);
              onClose && onClose();
            } else {
              setErrorMessage(t('security.saveError', 'PIN kaydedilemedi'));
              triggerShake();
              setPin('');
            }
          } else {
            // Eşleşmedi
            setErrorMessage(t('security.pinMismatch', 'PIN kodları eşleşmedi. Tekrar deneyin.'));
            triggerShake();
            setPin('');
            setSetupStep(1);
            setFirstPin('');
          }
        }
      } else if (mode === 'verify') {
        // Doğrulama Modu
        const isValid = await SecurityService.verifyPin(enteredPin, targetId);
        if (isValid) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          SecurityService.unlockSession(targetId);
          onSuccess && onSuccess();
          onClose && onClose();
        } else {
          setErrorMessage(t('security.incorrectPin', 'Hatalı PIN kodu. Tekrar deneyin.'));
          triggerShake();
          setPin('');
        }
      } else if (mode === 'remove') {
        // Kilidi Kaldırma Modu (Mevcut PIN doğrulanır ve silinir)
        const isValid = await SecurityService.verifyPin(enteredPin, targetId);
        if (isValid) {
          await SecurityService.removePin(targetId);
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          onSuccess && onSuccess(false);
          onClose && onClose();
        } else {
          setErrorMessage(t('security.incorrectPin', 'Hatalı PIN kodu. Tekrar deneyin.'));
          triggerShake();
          setPin('');
        }
      }
    },
    [mode, setupStep, firstPin, targetId, onSuccess, onClose, triggerShake, t]
  );

  // Sayı Tuşuna Dokunulduğunda
  const handlePressDigit = useCallback(
    (digit) => {
      if (pin.length >= 4) return;
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setErrorMessage('');
      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === 4) {
        setTimeout(() => {
          handleCompletePin(nextPin);
        }, 60);
      }
    },
    [pin, handleCompletePin]
  );

  // Silme (Backspace)
  const handleDeleteDigit = useCallback(() => {
    if (pin.length === 0) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setErrorMessage('');
    setPin((prev) => prev.slice(0, -1));
  }, [pin]);

  // Başlık ve Açıklamalar
  let modalTitle = t('security.unlockTitle', 'Günlüğün Kilidini Aç');
  let modalSubtitle = t('security.verifyPinDesc', 'Devam etmek için 4 haneli PIN kodunuzu girin');

  if (mode === 'setup') {
    if (setupStep === 1) {
      modalTitle = t('security.setPinTitle', 'Yeni PIN Belirleyin');
      modalSubtitle = t('security.setPinDesc', 'Günlüğünüzü korumak için 4 haneli bir şifre girin');
    } else {
      modalTitle = t('security.confirmPinTitle', 'PIN Kodunu Onaylayın');
      modalSubtitle = t('security.confirmPinDesc', 'Lütfen belirlediğiniz PIN kodunu tekrar girin');
    }
  } else if (mode === 'remove') {
    modalTitle = t('security.removePinTitle', 'Kilidi Kaldır');
    modalSubtitle = t('security.removePinDesc', 'Kilidi kaldırmak için mevcut PIN kodunuzu girin');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#1C1226' : '#FFFDF9',
                  borderColor: isDark ? '#3E2A52' : '#EFE8DE',
                },
              ]}
            >
              {/* Kapat Butonu */}
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? '#2B1A3D' : '#F5EFEB' },
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={isDark ? colors.textSecondary : '#6D4C41'}
                />
              </TouchableOpacity>

              {/* Kilit İkonu Rozeti */}
              <View
                style={[
                  styles.lockIconBox,
                  { backgroundColor: isDark ? '#381D45' : '#FCE4EC' },
                ]}
              >
                <MaterialCommunityIcons
                  name={mode === 'setup' ? 'shield-key' : mode === 'remove' ? 'lock-open-outline' : 'lock'}
                  size={28}
                  color="#C2185B"
                />
              </View>

              {/* Başlıklar */}
              <Text
                style={[
                  styles.title,
                  { color: isDark ? colors.textPrimary : '#3E2723' },
                ]}
              >
                {modalTitle}
              </Text>
              {itemTitle ? (
                <Text style={styles.itemTitleText} numberOfLines={1}>
                  {itemTitle}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.subtitle,
                  { color: isDark ? colors.textSecondary : '#8D6E63' },
                ]}
              >
                {modalSubtitle}
              </Text>

              {/* 4 Haneli PIN Noktaları (Dots) */}
              <Animated.View
                style={[
                  styles.dotsContainer,
                  { transform: [{ translateX: shakeAnim }] },
                ]}
              >
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = pin.length > index;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        isFilled
                          ? {
                              backgroundColor: errorMessage ? '#E53935' : '#C2185B',
                              borderColor: errorMessage ? '#E53935' : '#C2185B',
                              transform: [{ scale: 1.15 }],
                            }
                          : {
                              borderColor: isDark ? '#5C3E75' : '#D7CCC8',
                              backgroundColor: 'transparent',
                            },
                      ]}
                    />
                  );
                })}
              </Animated.View>

              {/* Hata Mesajı */}
              <View style={styles.errorContainer}>
                {errorMessage ? (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                ) : null}
              </View>

              {/* Sayısal Tuş Takımı (Numpad) */}
              <View style={styles.numpad}>
                {/* 1, 2, 3 */}
                <View style={styles.numRow}>
                  {['1', '2', '3'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      activeOpacity={0.65}
                      onPress={() => handlePressDigit(d)}
                      style={[
                        styles.numBtn,
                        { backgroundColor: isDark ? '#261736' : '#FAF6F0' },
                      ]}
                    >
                      <Text style={[styles.numText, { color: isDark ? '#FFFFFF' : '#3E2723' }]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 4, 5, 6 */}
                <View style={styles.numRow}>
                  {['4', '5', '6'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      activeOpacity={0.65}
                      onPress={() => handlePressDigit(d)}
                      style={[
                        styles.numBtn,
                        { backgroundColor: isDark ? '#261736' : '#FAF6F0' },
                      ]}
                    >
                      <Text style={[styles.numText, { color: isDark ? '#FFFFFF' : '#3E2723' }]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 7, 8, 9 */}
                <View style={styles.numRow}>
                  {['7', '8', '9'].map((d) => (
                    <TouchableOpacity
                      key={d}
                      activeOpacity={0.65}
                      onPress={() => handlePressDigit(d)}
                      style={[
                        styles.numBtn,
                        { backgroundColor: isDark ? '#261736' : '#FAF6F0' },
                      ]}
                    >
                      <Text style={[styles.numText, { color: isDark ? '#FFFFFF' : '#3E2723' }]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Biyometri, 0, Silme */}
                <View style={styles.numRow}>
                  {/* Biyometri Kısayolu (Varsa) */}
                  {mode === 'verify' && biometricInfo.type !== 'none' ? (
                    <TouchableOpacity
                      activeOpacity={0.65}
                      onPress={triggerBiometrics}
                      style={[styles.numBtn, styles.numBtnSpecial]}
                      accessibilityRole="button"
                      accessibilityLabel="Biyometrik Giriş"
                    >
                      <MaterialCommunityIcons
                        name={biometricInfo.icon || 'fingerprint'}
                        size={26}
                        color="#C2185B"
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.numBtnEmpty} />
                  )}

                  {/* 0 Tuşu */}
                  <TouchableOpacity
                    activeOpacity={0.65}
                    onPress={() => handlePressDigit('0')}
                    style={[
                      styles.numBtn,
                      { backgroundColor: isDark ? '#261736' : '#FAF6F0' },
                    ]}
                  >
                    <Text style={[styles.numText, { color: isDark ? '#FFFFFF' : '#3E2723' }]}>
                      0
                    </Text>
                  </TouchableOpacity>

                  {/* Silme Tuşu */}
                  <TouchableOpacity
                    activeOpacity={0.65}
                    onPress={handleDeleteDigit}
                    style={[styles.numBtn, styles.numBtnSpecial]}
                    accessibilityRole="button"
                    accessibilityLabel="Sil"
                  >
                    <MaterialCommunityIcons
                      name="backspace-outline"
                      size={24}
                      color={isDark ? '#D1C4E9' : '#8D6E63'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#1A0C22',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  lockIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  itemTitleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#C2185B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.8,
  },
  errorContainer: {
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E53935',
    textAlign: 'center',
  },
  numpad: {
    width: '100%',
    gap: 12,
  },
  numRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  numBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2D1F1D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  numBtnSpecial: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  numBtnEmpty: {
    width: 64,
    height: 64,
  },
  numText: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
