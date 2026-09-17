import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import PageIndexFlag from './PageIndexFlag';
import IndexFlagEditModal from './IndexFlagEditModal';

/**
 * IndexFlagsRail - Sayfa Kenarında Sarkan Post-it Bayraklar Askı Rayı
 *
 * Sayfanın sağ dış kenarına monte edilir. Eklenmiş bayrakları ve "+" ekle butonunu yönetir.
 *
 * @param {Array<object>} flags - [{ id, color, label, position }]
 * @param {function} onSaveFlag - (flagData) => void
 * @param {function} onDeleteFlag - (flagId) => void
 * @param {boolean} [readOnly=false] - Sadece görüntüleme mi
 * @param {object} [style]
 */
export default function IndexFlagsRail({
  flags = [],
  onSaveFlag,
  onDeleteFlag,
  readOnly = false,
  style,
}) {
  const { colors } = useTheme();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);

  const handleOpenNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingFlag(null);
    setIsModalVisible(true);
  };

  const handleOpenEdit = (flag) => {
    if (readOnly) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingFlag(flag);
    setIsModalVisible(true);
  };

  return (
    <View style={[styles.railContainer, style]} pointerEvents="box-none">
      {/* Mevcut Bayraklar Listesi */}
      <View style={styles.flagsStack} pointerEvents="box-none">
        {(flags || []).map((flag) => (
          <PageIndexFlag
            key={flag.id}
            flag={flag}
            onPress={() => handleOpenEdit(flag)}
            mode="page"
          />
        ))}

        {/* Yeni Bayrak Ekle Butonu */}
        {!readOnly && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleOpenNew}
            style={[
              styles.addFlagButton,
              {
                backgroundColor: colors.card || '#FFFFFF',
                borderColor: colors.accent + '60',
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="bookmark-plus"
              size={16}
              color={colors.accent}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Düzenleme / Ekleme Modalı */}
      {!readOnly && (
        <IndexFlagEditModal
          visible={isModalVisible}
          editingFlag={editingFlag}
          onSave={onSaveFlag}
          onDelete={onDeleteFlag}
          onClose={() => {
            setIsModalVisible(false);
            setEditingFlag(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  railContainer: {
    position: 'absolute',
    right: -24, // Kağıdın sağ kenarından hafifçe dışarı taşar
    top: 60,
    zIndex: 90,
  },
  flagsStack: {
    alignItems: 'flex-start',
    gap: 4,
  },
  addFlagButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
