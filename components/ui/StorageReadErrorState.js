import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

/**
 * StorageReadErrorState - Kayıtlı veri okunamadığında gösterilen durum
 *
 * "Henüz sayfa yok" gibi boş bir durumla karıştırılmasın diye veri okunamadığını
 * açıkça söyler. Bu durumdayken çağıran ekran ekleme/silme/sıralama gibi yazma
 * eylemlerini göstermez; böylece okunamayan verinin üzerine yazılmaz.
 *
 * @param {function} [onBack] - Verilirse "Geri" bağlantısı gösterilir
 */
export default function StorageReadErrorState({ onBack }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container} accessibilityRole="alert">
      <MaterialCommunityIcons name="database-alert-outline" size={56} color={colors.textSecondary} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('storage.readErrorTitle', 'Kayıtlı veriler okunamadı')}
      </Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>
        {t(
          'storage.readErrorDesc',
          'Bu bölümün verileri şu anda okunamıyor. Verilerinizi korumak için burada ekleme, silme ve sıralama kapatıldı.'
        )}
      </Text>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.accent }]}>{t('common.back', 'Geri')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
