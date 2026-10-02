import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  getPrivacySettings,
  setAutoHandwritingEnabled,
  setAutoTranscribeEnabled,
} from '../services/privacySettingsService';

/**
 * PrivacySettingsModal - Cihaz dışına veri gönderen OTOMATİK özelliklerin
 * aç/kapa ekranı.
 *
 * Kapatıldığında ne kaybedildiği her satırın altında açıkça yazılır; kullanıcı
 * bir özelliği farkında olmadan kaybetmesin.
 *
 * Kement ile "metne çevir" ve başarısız bir transkripti yeniden deneme gibi
 * kullanıcının kendi başlattığı işlemler bu ayarlardan etkilenmez.
 *
 * @param {boolean} visible
 * @param {function} onClose
 */
export default function PrivacySettingsModal({ visible, onClose }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [settings, setSettings] = useState(null);
  // Yazma sürerken gelen ikinci dokunuş ilkini ezmesin
  const [pendingKey, setPendingKey] = useState(null);

  useEffect(() => {
    if (!visible) return;
    let isActive = true;
    getPrivacySettings().then((loaded) => {
      if (isActive) setSettings(loaded);
    });
    return () => {
      isActive = false;
    };
  }, [visible]);

  const handleToggle = useCallback(
    async (key, value) => {
      if (pendingKey) return;
      setPendingKey(key);
      // Anahtar hemen hareket etsin; yazma arkada tamamlanır
      setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
      try {
        Haptics.selectionAsync();
      } catch (e) {}
      try {
        if (key === 'autoHandwriting') {
          await setAutoHandwritingEnabled(value);
        } else {
          await setAutoTranscribeEnabled(value);
        }
      } catch (error) {
        console.warn('Gizlilik ayari yazilamadi:', key, error);
        // Yazma başarısızsa anahtarı geri al, yoksa arayüz yalan söyler
        setSettings((prev) => (prev ? { ...prev, [key]: !value } : prev));
      } finally {
        setPendingKey(null);
      }
    },
    [pendingKey]
  );

  if (!visible) return null;

  const rows = [
    {
      key: 'autoHandwriting',
      icon: 'draw',
      label: t('privacy.autoHandwritingLabel', 'Otomatik el yazısı tanıma'),
      note: t(
        'privacy.autoHandwritingNote',
        'Kapatırsanız Ajandam ve Yapılacaklar sayfalarında el yazınız aranabilir olmaz. Kement aracıyla "metne çevir" yine çalışır.'
      ),
    },
    {
      key: 'autoTranscribe',
      icon: 'microphone-outline',
      label: t('privacy.autoTranscribeLabel', 'Sesli notları otomatik metne çevir'),
      note: t(
        'privacy.autoTranscribeNote',
        'Kapatırsanız kayıt yine çalışır ama metin üretilmez. Bir notu daha sonra kendiniz çevirebilirsiniz.'
      ),
    },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('privacy.settingsTitle', 'Gizlilik ve Veri')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t(
              'privacy.settingsDesc',
              'Bu iki özellik yazdıklarınızı metne çevirmek için internet üzerinden bir servise gönderir. İstemiyorsanız kapatabilirsiniz.'
            )}
          </Text>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {rows.map((row) => (
              <View
                key={row.key}
                style={[styles.row, { borderColor: colors.border }]}
              >
                <View style={styles.rowHeader}>
                  <MaterialCommunityIcons
                    name={row.icon}
                    size={18}
                    color={colors.accent}
                    style={styles.rowIcon}
                  />
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>
                    {row.label}
                  </Text>
                  <Switch
                    value={settings ? settings[row.key] : false}
                    onValueChange={(value) => handleToggle(row.key, value)}
                    disabled={!settings || pendingKey !== null}
                    trackColor={{ false: colors.border, true: colors.accent + '88' }}
                    thumbColor={
                      settings && settings[row.key] ? colors.accent : colors.textSecondary
                    }
                  />
                </View>
                <Text style={[styles.rowNote, { color: colors.textSecondary }]}>
                  {row.note}
                </Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={[styles.button, { backgroundColor: colors.accent }]}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{t('common.ok', 'Tamam')}</Text>
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
    maxWidth: 400,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  body: {
    maxHeight: 340,
    alignSelf: 'stretch',
  },
  bodyContent: {
    paddingBottom: 2,
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingBottom: 14,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: 8,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingRight: 8,
  },
  rowNote: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    paddingRight: 4,
  },
  button: {
    marginTop: 16,
    alignSelf: 'stretch',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
