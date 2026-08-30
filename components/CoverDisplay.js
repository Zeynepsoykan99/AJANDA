import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * CoverDisplay - Ajanda kapağını render eden bileşen
 * Seçili şablona göre arka plan, desen, dekorasyon ve kullanıcı metnini gösterir.
 *
 * @param {object} template - coverTemplates.js'den bir kapak şablonu
 * @param {string} userName - Kullanıcının yazdığı isim
 * @param {string} userNote - Kullanıcının yazdığı not
 */
export default function CoverDisplay({ template, userName, userNote }) {
  if (!template) return null;

  return (
    <View
      style={[
        styles.coverContainer,
        {
          backgroundColor: template.backgroundColor,
          borderColor: template.borderColor,
        },
      ]}
    >
      {/* Desen Katmanı */}
      <View style={styles.patternOverlay}>
        {renderPattern(template.pattern, template.patternColor)}
      </View>

      {/* Üst dekorasyon */}
      <View style={styles.topDecoration}>
        <MaterialCommunityIcons
          name={template.decorationIcon}
          size={40}
          color={template.accentColor}
        />
      </View>

      {/* Kapak İçeriği */}
      <View style={styles.contentContainer}>
        {/* Kullanıcı İsmi */}
        <Text
          style={[
            styles.userName,
            getTitleStyle(template.titleStyle),
            { color: template.accentColor },
          ]}
          numberOfLines={2}
        >
          {userName || 'Ajandom'}
        </Text>

        {/* Ayırıcı çizgi */}
        <View
          style={[styles.divider, { backgroundColor: template.borderColor }]}
        />

        {/* Kullanıcı Notu */}
        {userNote ? (
          <Text
            style={[styles.userNote, { color: template.accentColor + 'CC' }]}
            numberOfLines={3}
          >
            {userNote}
          </Text>
        ) : null}
      </View>

      {/* Alt dekorasyon */}
      <View style={styles.bottomDecoration}>
        <Text style={styles.decorationEmoji}>{template.decorationEmoji}</Text>
        <Text style={styles.decorationEmoji}>{template.decorationEmoji}</Text>
        <Text style={styles.decorationEmoji}>{template.decorationEmoji}</Text>
      </View>
    </View>
  );
}

/**
 * Desen tipine göre dekoratif arka plan elementi render eder
 */
function renderPattern(patternType, patternColor) {
  const elements = [];
  const count = 24;

  for (let i = 0; i < count; i++) {
    const top = (Math.sin(i * 1.7) * 0.5 + 0.5) * 90;
    const left = (i / count) * 95;
    const opacity = 0.3 + Math.sin(i * 0.8) * 0.2;

    let iconName = 'circle-small';
    let size = 16;

    switch (patternType) {
      case 'hearts':
        iconName = 'heart';
        size = 10 + (i % 3) * 4;
        break;
      case 'stars':
        iconName = 'star-four-points';
        size = 8 + (i % 4) * 3;
        break;
      case 'dots':
        iconName = 'circle';
        size = 4 + (i % 3) * 3;
        break;
      case 'lines':
        iconName = 'minus';
        size = 14 + (i % 3) * 4;
        break;
      default:
        break;
    }

    elements.push(
      <MaterialCommunityIcons
        key={`pattern-${i}`}
        name={iconName}
        size={size}
        color={patternColor}
        style={[
          styles.patternElement,
          {
            top: `${top}%`,
            left: `${left}%`,
            opacity,
          },
        ]}
      />
    );
  }

  return elements;
}

/**
 * Başlık stilini seçer
 */
function getTitleStyle(titleStyle) {
  switch (titleStyle) {
    case 'elegant':
      return { fontStyle: 'italic', letterSpacing: 2 };
    case 'modern':
      return { fontWeight: '800', letterSpacing: 1 };
    case 'playful':
      return { fontWeight: '700', letterSpacing: 3 };
    default:
      return { fontWeight: '700', letterSpacing: 1 };
  }
}

const styles = StyleSheet.create({
  coverContainer: {
    width: '85%',
    aspectRatio: 0.72,
    borderRadius: 20,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  patternElement: {
    position: 'absolute',
  },
  topDecoration: {
    position: 'absolute',
    top: 24,
    alignItems: 'center',
  },
  contentContainer: {
    zIndex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  userName: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: {
    width: 60,
    height: 2,
    borderRadius: 1,
    marginVertical: 12,
  },
  userNote: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    gap: 8,
  },
  decorationEmoji: {
    fontSize: 18,
    opacity: 0.6,
  },
});
