import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import BottomSheet from '../ui/BottomSheet';

/**
 * NotebookActionSheet - Defter rafında uzun basma menüsü (Yeniden adlandır / Sil)
 * Web'de Alert butonları çalışmadığı için tüm platformlarda aynı bottom sheet kullanılır.
 *
 * @param {boolean} visible
 * @param {string} notebookTitle
 * @param {function} onClose
 * @param {function} onRename
 * @param {function} onDelete
 */
export default function NotebookActionSheet({ visible, notebookTitle, onClose, onRename, onDelete }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title={notebookTitle}>
      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onRename}
          style={[styles.actionRow, { borderColor: colors.border + '80', backgroundColor: colors.card }]}
        >
          <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.accent} />
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>
            {t('notebooks.rename', 'Yeniden Adlandır')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onDelete}
          style={[styles.actionRow, styles.deleteRow]}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#E53935" />
          <Text style={[styles.actionText, styles.deleteText]}>{t('common.delete', 'Sil')}</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    paddingTop: 14,
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteRow: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  deleteText: {
    color: '#E53935',
  },
});
