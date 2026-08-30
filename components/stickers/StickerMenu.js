import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { STICKER_PACKS } from '../../constants/stickerPacks';

/**
 * StickerMenu - Sticker seçim paneli
 * Alt kısımdan açılan modal, kategori sekmeli sticker seçimi.
 *
 * @param {boolean} visible
 * @param {function} onClose
 * @param {function} onSelectSticker - (sticker) => void
 */
export default function StickerMenu({ visible, onClose, onSelectSticker }) {
  const { colors } = useTheme();
  const [selectedPackId, setSelectedPackId] = useState(STICKER_PACKS[0]?.id);

  const selectedPack = STICKER_PACKS.find((p) => p.id === selectedPackId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View />
      </TouchableOpacity>

      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        {/* Üst çubuk */}
        <View style={styles.handle}>
          <View
            style={[styles.handleBar, { backgroundColor: colors.border }]}
          />
        </View>

        {/* Başlık */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            🎀 Çıkartmalar
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons
              name="close"
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Paket Sekmeleri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {STICKER_PACKS.map((pack) => (
            <TouchableOpacity
              key={pack.id}
              activeOpacity={0.7}
              onPress={() => setSelectedPackId(pack.id)}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    selectedPackId === pack.id
                      ? colors.accent + '20'
                      : colors.background,
                  borderColor:
                    selectedPackId === pack.id
                      ? colors.accent
                      : colors.border,
                },
              ]}
            >
              <Text style={styles.tabEmoji}>{pack.icon}</Text>
              <Text
                style={[
                  styles.tabName,
                  {
                    color:
                      selectedPackId === pack.id
                        ? colors.accent
                        : colors.textSecondary,
                  },
                ]}
              >
                {pack.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sticker Grid */}
        <View style={styles.gridContainer}>
          {selectedPack?.stickers.map((sticker) => (
            <TouchableOpacity
              key={sticker.id}
              activeOpacity={0.6}
              onPress={() => onSelectSticker(sticker)}
              style={[
                styles.stickerButton,
                { backgroundColor: colors.background },
              ]}
            >
              <Text style={styles.stickerEmoji}>{sticker.content}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000040',
  },
  container: {
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 14,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  tabEmoji: {
    fontSize: 16,
  },
  tabName: {
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    justifyContent: 'flex-start',
  },
  stickerButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerEmoji: {
    fontSize: 30,
  },
});
