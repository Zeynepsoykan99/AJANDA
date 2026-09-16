import React from 'react';
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * ExportLoadingModal - PDF hazırlanırken gösterilen modern yükleniyor kartı
 *
 * @param {boolean} visible - Modal açık mı
 * @param {string} [title] - Özel başlık (isteğe bağlı)
 * @param {string} [description] - Özel açıklama (isteğe bağlı)
 */
export default function ExportLoadingModal({
  visible = false,
  title,
  description,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.accent + '18' }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={32} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title || t('export.loadingTitle', 'PDF Hazırlanıyor...')}
          </Text>

          <Text style={[styles.desc, { color: colors.textSecondary }]}>
            {description || t('export.loadingDesc', 'Sayfanız yüksek kalitede dönüştürülüyor, lütfen bekleyin.')}
          </Text>

          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
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
    maxWidth: 320,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  spinnerContainer: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
