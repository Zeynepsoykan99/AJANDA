import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getAllThemes } from '../constants/themes';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

/**
 * ThemePickerModal - Uygulama Teması ve Renk Seçici Menü
 * Ekranın altından veya ortasından açılan, global renk paletini değiştiren bileşen.
 */
export default function ThemePickerModal({ visible, onClose }) {
  const { theme, setTheme, colors } = useTheme();
  const { isTablet } = useResponsiveLayout();
  const allThemes = getAllThemes();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.card, borderColor: colors.border },
            isTablet && styles.modalContentTablet,
          ]}
          onStartShouldSetResponder={() => true} // Tıklamaların arkaya geçmesini engelle
        >
          {/* Sürükleme Tutamacı / Handle */}
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Uygulama Teması
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={28}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary + '99' }]}>
            AJANDA'nın görünümünü kendi zevkine göre kişiselleştir.
          </Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.themeList}
          >
            {allThemes.map((t) => {
              const isSelected = theme.id === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.7}
                  onPress={() => setTheme(t.id)}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: t.colors.backgroundLight,
                      borderColor: isSelected ? t.colors.accent : 'transparent',
                    },
                  ]}
                >
                  <View style={styles.themeInfo}>
                    <View
                      style={[
                        styles.colorPreview,
                        { backgroundColor: t.colors.accent },
                      ]}
                    />
                    <Text
                      style={[
                        styles.themeName,
                        { color: t.colors.textPrimary },
                      ]}
                    >
                      {t.emoji} {t.name}
                    </Text>
                  </View>

                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={t.colors.accent}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '80%',
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalContentTablet: {
    width: 600,
    alignSelf: 'center',
    borderRadius: 32,
    marginBottom: 40,
    borderBottomWidth: 1,
  },
  dragHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
  themeList: {
    gap: 12,
    paddingBottom: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
  },
});
