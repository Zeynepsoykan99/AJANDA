import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useResponsiveLayout from '../hooks/useResponsiveLayout';

/**
 * CoverDisplay - Ajanda kapağını render eden bileşen
 * Seçili şablona göre arka plan, desen, dekorasyon ve kullanıcı metnini gösterir.
 *
 * @param {object} template - coverTemplates.js'den bir kapak şablonu
 * @param {string} userName - Kullanıcının yazdığı isim
 * @param {string} userNote - Kullanıcının yazdığı not
 */
export default function CoverDisplay({ template, userName, userNote }) {
  const { isTablet } = useResponsiveLayout();
  if (!template) return null;

  return (
    <View
      style={[
        styles.coverContainer,
        {
          backgroundColor: template.backgroundColor,
          borderColor: template.borderColor,
        },
        isTablet && styles.tabletCover,
      ]}
    >
      {/* Desen Katmanı */}
      <View style={styles.patternOverlay}>
        {renderPattern(template.pattern, template.patternColor)}
      </View>

      {/* Dikişli İç Çerçeve Efekti (Stitched Border) */}
      <View
        style={[
          styles.stitchedFrame,
          { borderColor: template.borderColor + '90' },
        ]}
      />

      {/* Metalik Köşe Koruyucuları (Corner Protectors) */}
      <View style={[styles.cornerProtector, styles.cornerTopLeft]} />
      <View style={[styles.cornerProtector, styles.cornerTopRight]} />
      <View style={[styles.cornerProtector, styles.cornerBottomLeft]} />
      <View style={[styles.cornerProtector, styles.cornerBottomRight]} />

      {/* Defter Kapatma Lastiği (Elastic Closure Band) */}
      <View
        style={[
          styles.elasticClosureBand,
          { backgroundColor: template.borderColor + 'BB' },
        ]}
      />

      {/* Üst dekorasyon */}
      <View style={styles.topDecoration}>
        <MaterialCommunityIcons
          name={template.decorationIcon}
          size={isTablet ? 48 : 40}
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
    maxWidth: 460,
    aspectRatio: 0.72,
    borderRadius: 20,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  tabletCover: {
    maxWidth: 520,
    maxHeight: 740,
    borderWidth: 4,
    borderRadius: 26,
  },
  stitchedFrame: {
    ...StyleSheet.absoluteFillObject,
    margin: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    zIndex: 1,
    pointerEvents: 'none',
  },
  cornerProtector: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#FFD54F', // Altın rengi köşe koruyucusu
    zIndex: 5,
  },
  cornerTopLeft: {
    top: 4,
    left: 4,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 10,
  },
  cornerTopRight: {
    top: 4,
    right: 4,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 10,
  },
  cornerBottomLeft: {
    bottom: 4,
    left: 4,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 10,
  },
  cornerBottomRight: {
    bottom: 4,
    right: 4,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 10,
  },
  elasticClosureBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 28,
    width: 14,
    zIndex: 2,
    opacity: 0.75,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: '#00000020',
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
