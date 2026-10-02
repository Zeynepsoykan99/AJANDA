import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

/** Bildirimin bir kez gösterildiğini kaydeden AsyncStorage anahtarları */
export const HANDWRITING_NOTICE_KEY = '@ajanda_handwriting_notice_v1';
export const VOICE_NOTICE_KEY = '@ajanda_voice_notice_v1';

/**
 * Bildirimin daha önce gösterilip gösterilmediğini sorgular.
 * Okuma başarısız olursa "gösterildi" varsayılır: bildirimi her açılışta
 * tekrar göstermek, bir kez kaçırmaktan daha rahatsız edici olurdu.
 *
 * @param {string} storageKey
 * @returns {Promise<boolean>}
 */
export const hasSeenNotice = async (storageKey) => {
  try {
    return (await AsyncStorage.getItem(storageKey)) !== null;
  } catch (error) {
    console.warn('[PrivacyNotice] goruldu kaydi okunamadi:', error);
    return true;
  }
};

/**
 * Bildirimin görüldüğünü kalıcı olarak işaretler.
 *
 * @param {string} storageKey
 * @returns {Promise<void>}
 */
export const markNoticeSeen = async (storageKey) => {
  try {
    await AsyncStorage.setItem(storageKey, new Date().toISOString());
  } catch (error) {
    // Sessiz kalmamalı: yazılamazsa bildirim bir sonraki açılışta tekrar çıkar
    console.error('[PrivacyNotice] goruldu kaydi yazilamadi:', error);
  }
};

/**
 * PrivacyNoticeModal - El yazısı ve sesli not verisinin cihaz dışında
 * işlendiğini kullanıcıya bir kez bildiren bilgilendirme kartı.
 *
 * Onay akışı DEĞİLDİR: kullanıcı yalnızca okuduğunu onaylar ("Anladım").
 * Kapanınca hiçbir işlem otomatik başlamaz; kullanıcı eylemini kendisi tekrarlar.
 *
 * @param {boolean} visible - Modal açık mı
 * @param {'handwriting' | 'voice'} type - Hangi bildirim gösterilecek
 * @param {function} onDismiss - "Anladım" ile kapatıldığında çağrılır
 */
export default function PrivacyNoticeModal({ visible = false, type, onDismiss }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Çift basışta onDismiss'in iki kez çalışmasını engeller
  const [isDismissing, setIsDismissing] = useState(false);
  useEffect(() => {
    if (visible) setIsDismissing(false);
  }, [visible]);

  const handleDismiss = useCallback(() => {
    if (isDismissing) return;
    setIsDismissing(true);
    onDismiss && onDismiss();
  }, [isDismissing, onDismiss]);

  if (!visible) return null;

  const isVoice = type === 'voice';

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.accent + '18' }]}>
            <MaterialCommunityIcons
              name={isVoice ? 'microphone-outline' : 'draw'}
              size={30}
              color={colors.accent}
            />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isVoice
              ? t('privacy.voiceTitle', 'Sesli Notlar Hakkında')
              : t('privacy.handwritingTitle', 'El Yazısı Tanıma Hakkında')}
          </Text>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {isVoice ? (
              <>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t(
                    'privacy.voiceP1',
                    'Sesli notlarınızı aranabilir metne çevirmek için kaydınız, telefonunuzun ses tanıma özelliğine iletilir.'
                  )}
                </Text>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  <Text style={[styles.inlineLabel, { color: colors.textPrimary }]}>
                    {t('privacy.voiceAndroidLabel', 'Android telefonlarda:')}
                  </Text>
                  {' '}
                  {t(
                    'privacy.voiceAndroidBody',
                    'bu işi telefonun kendi ses tanıma servisi yapar — çoğu cihazda bu servis Google’a aittir. Sesiniz, metne çevrilmek üzere internet üzerinden bu servise gönderilebilir.'
                  )}
                </Text>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  <Text style={[styles.inlineLabel, { color: colors.textPrimary }]}>
                    {t('privacy.voiceIosLabel', 'iPhone ve iPad’de:')}
                  </Text>
                  {' '}
                  {t(
                    'privacy.voiceIosBody',
                    'çevirme öncelikle cihazın içinde yapılır. Ancak cihazınız seçtiğiniz dili kendi başına çeviremiyorsa sesiniz Apple’ın sunucularına gönderilebilir.'
                  )}
                </Text>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t(
                    'privacy.voiceP4',
                    'Kaydettiğiniz ses dosyası yalnızca bu cihazda saklanır. Adınız, hesabınız veya cihaz bilginiz gönderilmez.'
                  )}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t(
                    'privacy.handwritingP1',
                    'El yazınızı aranabilir metne çevirebilmek için, çizgilerinizin koordinatları ve seçtiğiniz dil internet üzerinden Google’ın el yazısı tanıma servisine gönderilir ve metne orada dönüştürülür.'
                  )}
                </Text>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t(
                    'privacy.handwritingP2',
                    'Adınız, hesabınız veya cihaz bilginiz gönderilmez. Dönen metin yalnızca bu cihazda saklanır.'
                  )}
                </Text>
                <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                  {t(
                    'privacy.handwritingP3',
                    'Bu dönüşüm, el yazısı yazdığınız sayfalarda otomatik olarak ve kement aracıyla “metne çevir” dediğinizde çalışır.'
                  )}
                </Text>
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleDismiss}
            disabled={isDismissing}
            style={[
              styles.button,
              { backgroundColor: colors.accent },
              isDismissing && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{t('privacy.understood', 'Anladım')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    maxHeight: 320,
    alignSelf: 'stretch',
  },
  bodyContent: {
    paddingBottom: 4,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  inlineLabel: {
    fontWeight: '700',
  },
  button: {
    marginTop: 8,
    alignSelf: 'stretch',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
