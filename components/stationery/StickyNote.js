import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import WashiTape from './WashiTape';

/**
 * StickyNote - Pastel Yapışkan Post-it Not Bileşeni
 * Kırtasiye konseptinde sayfa üzerine tutturulmuş sevimli not kağıdı.
 *
 * @param {string} title - Not başlığı (örn. "Önemli!", "Günün Hatırlatıcısı")
 * @param {string} content - Not içeriği
 * @param {function} onChangeContent - İçerik değiştirme
 * @param {string} color - Arka plan pastel rengi ('#FFF9C4', '#F8BBD0', '#E1BEE7', '#C8E6C9')
 * @param {string} tapeColor - Üstteki washi bant rengi
 * @param {number} rotation - Hafif eğik duruş açısı (-2, 1, 2)
 */
export default function StickyNote({
  title = 'Günün Notu 🌸',
  content = '',
  onChangeContent = null,
  color = '#FFF9C4', // Pastel vanilya sarısı
  tapeColor = '#FFCC80',
  rotation = 1.5,
  placeholder = 'Aklındakileri buraya not al...',
  style,
}) {
  return (
    <View
      style={[
        styles.noteContainer,
        {
          backgroundColor: color,
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    >
      {/* Üstteki yapıştırıcı Washi Bant */}
      <View style={styles.tapeAnchor}>
        <WashiTape
          color={tapeColor}
          width={70}
          height={16}
          rotation={-rotation}
          pattern="dots"
        />
      </View>

      {/* Başlık */}
      <Text style={styles.titleText}>{title}</Text>

      {/* Not Alanı */}
      {onChangeContent ? (
        <TextInput
          style={styles.textInput}
          value={content}
          onChangeText={onChangeContent}
          placeholder={placeholder}
          placeholderTextColor="#79554866"
          multiline
          textAlignVertical="top"
        />
      ) : (
        <Text style={styles.contentText}>
          {content || placeholder}
        </Text>
      )}

      {/* Hafif kıvrık köşe gölgesi efekti */}
      <View style={styles.cornerFold} />
    </View>
  );
}

const styles = StyleSheet.create({
  noteContainer: {
    borderRadius: 6,
    padding: 12,
    paddingTop: 16,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#00000008',
    position: 'relative',
  },
  tapeAnchor: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    zIndex: 15,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5D4037',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  textInput: {
    fontSize: 13,
    color: '#3E2723',
    lineHeight: 18,
    flex: 1,
    padding: 0,
  },
  contentText: {
    fontSize: 13,
    color: '#3E2723',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  cornerFold: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderRightWidth: 12,
    borderTopWidth: 12,
    borderRightColor: '#00000012',
    borderTopColor: 'transparent',
  },
});
