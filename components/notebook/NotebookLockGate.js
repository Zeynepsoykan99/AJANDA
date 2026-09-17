import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import {
  authenticateWithBiometrics,
  getBiometricTypeInfo,
  unlockSession,
} from '../../services/biometricService';
import { SecurityService } from '../../services/securityService';
import PinAuthModal from '../security/PinAuthModal';

/**
 * NotebookLockGate - Kilitli Günlük ve Defterler için Tam Ekran Güvenlik Duvarı
 * Kullanıcı kimliğini doğrulayana kadar sayfa içeriğinin hiçbir şekilde render edilmemesini garanti eder.
 *
 * @param {string} targetId 'diary' veya defter kimliği (oturum açıldığında hafızada saklamak için)
 * @param {string} title Defter başlığı
 * @param {string} edgeColor Kapağa/şablona uyumlu arka plan kenar rengi (isteğe bağlı)
 * @param {function} onUnlock Doğrulama başarılı olduğunda çağrılır
 * @param {function} [onBack] Geri tuşuna basıldığında çağrılır (varsayılan router.back())
 */
export default function NotebookLockGate({
  targetId,
  title,
  edgeColor,
  onUnlock,
  onBack,
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { maxContentWidth } = useResponsiveLayout();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState({
    type: 'passcode',
    label: 'Cihaz Parolası',
    icon: 'lock-outline',
  });

  // Cihazın biyometrik tipini oku (Face ID, Touch ID vb.)
  useEffect(() => {
    let isActive = true;
    (async () => {
      const info = await getBiometricTypeInfo();
      if (isActive) setBiometricInfo(info);
    })();
    return () => {
      isActive = false;
    };
  }, []);

  // Kimlik doğrulama işlemi
  const handleAuthenticate = useCallback(async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const promptTitle = title
        ? t('security.unlockPromptWithTitle', {
            title,
            defaultValue: `"${title}" kilidini açmak için kimliğinizi doğrulayın`,
          })
        : t('security.unlockPrompt', 'İçeriğe erişmek için kimliğinizi doğrulayın');

      const result = await authenticateWithBiometrics({
        promptMessage: promptTitle,
        fallbackLabel: t('security.fallbackPasscode', 'Cihaz Parolasını Kullan'),
        cancelLabel: t('common.cancel', 'Vazgeç'),
      });

      if (result.success) {
        if (targetId) unlockSession(targetId);
        if (onUnlock) onUnlock();
      } else if (result.error && result.error !== 'user_cancel' && result.error !== 'system_cancel') {
        setAuthError(t('security.authFailed', 'Kimlik doğrulanamadı. Lütfen tekrar deneyin.'));
      }
    } catch (err) {
      setAuthError(t('security.authFailed', 'Kimlik doğrulanamadı. Lütfen tekrar deneyin.'));
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, title, targetId, onUnlock, t]);

  // Ekran ilk açıldığında otomatik olarak FaceID / PIN promptunu tetikle
  useEffect(() => {
    const timer = setTimeout(() => {
      handleAuthenticate();
    }, 350);
    return () => clearTimeout(timer);
  }, [handleAuthenticate]);

  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const backgroundColor = edgeColor || colors.background;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'bottom']}>
      {/* Üst Geri Butonu */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBackPress}
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityLabel={t('common.back', 'Geri')}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Merkez Güvenlik Kartı */}
      <View style={styles.centerWrapper}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              maxWidth: Math.min(maxContentWidth, 420),
            },
          ]}
        >
          {/* Kilit Rozeti / İkonu */}
          <View style={[styles.iconContainer, { backgroundColor: colors.accent + '18' }]}>
            <MaterialCommunityIcons name="shield-lock-outline" size={54} color={colors.accent} />
          </View>

          {/* Başlık ve Açıklama */}
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {title || t('security.lockedNotebook', 'Kilitli Defter')}
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {t(
              'security.lockedDesc',
              'Bu defterin sayfaları ve kişisel notları cihazınızın yerel güvenliğiyle korunmaktadır.'
            )}
          </Text>

          {/* Hata Mesajı */}
          {authError ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#E53935" />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          ) : null}

          {/* Doğrulama / Kilidi Aç Butonu */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAuthenticate}
            disabled={isAuthenticating}
            style={[
              styles.unlockButton,
              { backgroundColor: colors.accent },
              isAuthenticating && { opacity: 0.7 },
            ]}
          >
            {isAuthenticating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={biometricInfo.icon || 'lock-open-outline'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.unlockButtonText}>
                  {t('security.unlockWithBiometric', {
                    type: biometricInfo.label,
                    defaultValue: `${biometricInfo.label} ile Kilidi Aç`,
                  })}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* PIN ile Kilidi Aç Butonu */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsPinModalVisible(true)}
            style={[styles.pinButton, { borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="dialpad" size={18} color={colors.textPrimary} style={{ marginRight: 8 }} />
            <Text style={[styles.pinButtonText, { color: colors.textPrimary }]}>
              {t('security.unlockWithPin', 'PIN ile Kilidi Aç')}
            </Text>
          </TouchableOpacity>

          {/* Vazgeç / Geri Dön */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleBackPress}
            style={styles.cancelLink}
          >
            <Text style={[styles.cancelLinkText, { color: colors.textSecondary }]}>
              {t('common.back', 'Geri')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 Haneli PIN Doğrulama Modalı */}
      <PinAuthModal
        visible={isPinModalVisible}
        mode="verify"
        targetId={targetId || 'diary'}
        itemTitle={title}
        onSuccess={() => {
          setIsPinModalVisible(false);
          if (targetId) {
            SecurityService.unlockSession(targetId);
            unlockSession(targetId);
          }
          if (onUnlock) onUnlock();
        }}
        onClose={() => setIsPinModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '500',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pinButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  pinButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelLink: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
