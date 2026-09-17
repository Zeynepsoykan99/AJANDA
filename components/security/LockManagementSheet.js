import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import BottomSheet from '../ui/BottomSheet';

/**
 * LockManagementSheet - Kilit Yönetimi Paneli (Şifreyi Değiştir / Kilidi Kaldır)
 *
 * @param {object} props
 * @param {boolean} props.visible - Panel görünürlüğü
 * @param {function} props.onClose - Paneli kapatma callback'i
 * @param {function} props.onChangePin - "Şifreyi Değiştir" seçildiğinde tetiklenen callback
 * @param {function} props.onRemovePin - "Kilidi Kaldır" seçildiğinde tetiklenen callback
 * @param {string} [props.title] - Panel başlığı
 */
export default function LockManagementSheet({
  visible,
  onClose,
  onChangePin,
  onRemovePin,
  title,
}) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const handlePressChangePin = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose && onClose();
    setTimeout(() => {
      onChangePin && onChangePin();
    }, 150);
  };

  const handlePressRemovePin = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose && onClose();
    setTimeout(() => {
      onRemovePin && onRemovePin();
    }, 150);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title || t('security.lockManagement', 'Kilit Yönetimi')}
      subtitle={t('security.lockedDesc', 'Bu defter yerel güvenlik kilidiyle korunmaktadır.')}
    >
      <View style={styles.contentContainer}>
        {/* Şifreyi Değiştir Seçeneği */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePressChangePin}
          style={[
            styles.actionCard,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.card,
              borderColor: colors.border,
            },
          ]}
          accessibilityLabel={t('security.changePin', 'Şifreyi Değiştir')}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.accent + '15' }]}>
            <MaterialCommunityIcons name="lock-reset" size={22} color={colors.accent} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
              {t('security.changePin', 'Şifreyi Değiştir')}
            </Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              {t('security.changePinDesc', 'Mevcut PIN kodunuzu yenileyin')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Kilidi Kaldır Seçeneği */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePressRemovePin}
          style={[
            styles.actionCard,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.card,
              borderColor: colors.border,
            },
          ]}
          accessibilityLabel={t('security.removePinAction', 'Kilidi Kaldır')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#E5393515' }]}>
            <MaterialCommunityIcons name="lock-open-outline" size={22} color="#E53935" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.actionTitle, { color: '#E53935' }]}>
              {t('security.removePinAction', 'Kilidi Kaldır')}
            </Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              {t('security.removePinActionDesc', 'PIN korumasını devre dışı bırakın')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Vazgeç Butonu */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
            {t('common.cancel', 'Vazgeç')}
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  actionSubtitle: {
    fontSize: 12,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
