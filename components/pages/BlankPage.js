import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * BlankPage - Boş Sayfa şablon bileşeni
 * Serbest metin alanı: çizgili, noktalı veya düz.
 *
 * @param {object} template - Şablon tanımı
 * @param {object} data - { content: string }
 * @param {function} onDataChange - Veri değişiklik fonksiyonu
 */
export default function BlankPage({ template, data, onDataChange }) {
  const content = data?.content || '';

  const colors = template?.colors || {
    bg: '#FFFFFF',
    accent: '#C2185B',
    line: '#FCE4EC',
  };

  const lineStyle = template?.lineStyle || 'horizontal';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Desen arka planı */}
      {lineStyle === 'horizontal' && (
        <View style={styles.linesContainer}>
          {Array.from({ length: 30 }).map((_, i) => (
            <View
              key={`line-${i}`}
              style={[styles.horizontalLine, { backgroundColor: colors.line }]}
            />
          ))}
        </View>
      )}

      {lineStyle === 'dots' && (
        <View style={styles.dotsContainer}>
          {Array.from({ length: 20 }).map((_, row) =>
            Array.from({ length: 12 }).map((_, col) => (
              <View
                key={`dot-${row}-${col}`}
                style={[
                  styles.dot,
                  {
                    backgroundColor: colors.line,
                    top: 28 + row * 28,
                    left: 20 + col * 28,
                  },
                ]}
              />
            ))
          )}
        </View>
      )}

      {/* Metin Alanı */}
      <TextInput
        style={[
          styles.textArea,
          {
            color: colors.accent,
            lineHeight: lineStyle === 'horizontal' ? 28 : 24,
          },
        ]}
        value={content}
        onChangeText={(text) => onDataChange({ ...data, content: text })}
        placeholder="Yazmaya başla..."
        placeholderTextColor={colors.accent + '40'}
        multiline
        textAlignVertical="top"
        scrollEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  linesContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 20,
  },
  horizontalLine: {
    height: 1,
    width: '100%',
    marginBottom: 27,
  },
  dotsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  dot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  textArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 20,
    fontSize: 16,
    zIndex: 1,
  },
});
