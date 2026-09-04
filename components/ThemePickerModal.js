import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ColorPicker, { Panel3, Preview } from 'reanimated-color-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { getAllThemes, generateCustomTheme } from '../constants/themes';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

/**
 * ThemePickerModal - Uygulama Teması ve Renk Seçici Menü
 * Ekranın altından veya ortasından açılan, global renk paletini değiştiren bileşen.
 */
export default function ThemePickerModal({ visible, onClose }) {
  const { t } = useTranslation();
  const { theme, setTheme, colors } = useTheme();
  const { isTablet } = useResponsiveLayout();
  const allThemes = getAllThemes();
  
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  // Anlık renk değişimi (Önizleme / Fluid değişim)
  const onSelectColor = ({ hex }) => {
    // anlık değişimi sağla
    setTheme(`custom:${hex}`);
  };

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
              {t('theme.title')}
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
            {t('theme.subtitle')}
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

            {/* Özel Renk Seçici Butonu / Paneli */}
            <View style={styles.customSection}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowColorPicker(!showColorPicker)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: colors.card,
                    borderColor: theme.id.startsWith('custom:') ? colors.accent : colors.border,
                    marginTop: 12,
                  },
                ]}
              >
                <View style={styles.themeInfo}>
                  <View style={[styles.colorPreview, { backgroundColor: theme.id.startsWith('custom:') ? colors.background : colors.border }]} />
                  <Text style={[styles.themeName, { color: colors.textPrimary }]}>
                    {t('theme.customColor')}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={showColorPicker ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {showColorPicker && (
                <View style={[styles.pickerContainer, { backgroundColor: colors.backgroundLight, borderColor: colors.border }]}>
                  <ColorPicker
                    style={{ width: '100%', justifyContent: 'center' }}
                    value={theme.id.startsWith('custom:') ? theme.colors.background : '#FF5733'}
                    onComplete={onSelectColor}
                    onChange={onSelectColor}
                    boundedThumb
                  >
                    <Preview style={styles.pickerPreview} hideInitialColor />
                    <Panel3 style={styles.pickerPanel} centerChannel="saturation" />
                  </ColorPicker>
                  <Text style={[styles.pickerHint, { color: colors.textSecondary }]}>
                    {t('theme.customHint')}
                  </Text>
                </View>
              )}
            </View>

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
  customSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
    marginTop: 8,
  },
  pickerContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  pickerPreview: {
    height: 40,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  pickerPanel: {
    width: 250,
    height: 250,
    borderRadius: 125,
    marginBottom: 16,
  },
  pickerHint: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 8,
  },
});
