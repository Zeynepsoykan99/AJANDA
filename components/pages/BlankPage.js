import React, { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Text } from 'react-native';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';
import PaperSheet from '../stationery/PaperSheet';
import SpiralBinder from '../stationery/SpiralBinder';
import WashiTape from '../stationery/WashiTape';
import StickyNote from '../stationery/StickyNote';

/**
 * BlankPage - Kırtasiye Boş Defter & Bullet Journal Şablonu
 * iPad'de iki açık sayfalı telli defter, mobilde kaliteli krem renkli çizgili/noktalı kağıt.
 */
export default function BlankPage({ template, data, onDataChange }) {
  const { isTwoPage, isTablet } = useResponsiveLayout();

  const content = data?.content || '';
  const rightContent = data?.rightContent || '';
  const quickNote = data?.quickNote || '';

  const colors = template?.colors || {
    bg: '#FFFDF9',
    accent: '#C2185B',
    line: '#F8BBD040',
  };

  const lineStyle = template?.lineStyle || 'horizontal';
  const rulingType =
    lineStyle === 'horizontal' ? 'lined' : lineStyle === 'dots' ? 'dotted' : 'blank';

  // -------------------------------------------------------------
  // TABLET / ÇİFT SAYFA DEFTER
  // -------------------------------------------------------------
  if (isTwoPage) {
    return (
      <View style={styles.twoPageContainer}>
        {/* SOL SAYFA */}
        <PaperSheet
          ruling={rulingType}
          paperColor="#FFFDF9"
          lineColor={colors.line}
          showMargin={rulingType === 'lined'}
          style={styles.pageHalf}
        >
          <View style={styles.washiCorner}>
            <WashiTape
              color="#F8BBD0"
              width={140}
              height={22}
              pattern="dots"
              label="🎀 GÜNLÜK & NOTLAR"
            />
          </View>
          <TextInput
            style={[styles.textArea, { color: colors.accent }]}
            value={content}
            onChangeText={(text) => onDataChange({ ...data, content: text })}
            placeholder="Sevgili Ajandam, bugün..."
            placeholderTextColor="#BDBDBD"
            multiline
            textAlignVertical="top"
          />
        </PaperSheet>

        {/* ORTA SPİRAL CİLT */}
        <SpiralBinder type="center" ringColor="rosegold" ringCount={16} />

        {/* SAĞ SAYFA */}
        <PaperSheet
          ruling={rulingType}
          paperColor="#FFFDF9"
          lineColor={colors.line}
          style={styles.pageHalf}
        >
          <View style={styles.rightPageContent}>
            <View style={styles.washiCornerRight}>
              <WashiTape
                color="#CE93D8"
                width={130}
                height={22}
                pattern="stripes"
                label="✨ DÜŞÜNCELER"
              />
            </View>

            <TextInput
              style={[styles.textArea, { color: colors.accent, flex: 1 }]}
              value={rightContent}
              onChangeText={(text) =>
                onDataChange({ ...data, rightContent: text })
              }
              placeholder="Fikirler, şiirler, çizim notları..."
              placeholderTextColor="#BDBDBD"
              multiline
              textAlignVertical="top"
            />

            <View style={styles.stickyCorner}>
              <StickyNote
                title="Günün İlhamı 🌸"
                content={quickNote}
                onChangeContent={(text) =>
                  onDataChange({ ...data, quickNote: text })
                }
                color="#FFF9C4"
                tapeColor="#FFCC80"
                placeholder="Bugün beni gülümseten bir şey..."
              />
            </View>
          </View>
        </PaperSheet>
      </View>
    );
  }

  // -------------------------------------------------------------
  // MOBİL / TEK SAYFA
  // -------------------------------------------------------------
  return (
    <PaperSheet
      ruling={rulingType}
      paperColor="#FFFDF9"
      lineColor={colors.line}
      showMargin={rulingType === 'lined'}
      style={styles.singlePage}
    >
      <View style={styles.mobileWashiHeader}>
        <WashiTape
          color="#F8BBD0"
          width={160}
          height={24}
          pattern="hearts"
          label="🌸 SEVGİLİ GÜNLÜK 🌸"
        />
      </View>

      <TextInput
        style={[styles.textArea, { color: colors.accent }]}
        value={content}
        onChangeText={(text) => onDataChange({ ...data, content: text })}
        placeholder="Yazmaya başla..."
        placeholderTextColor="#BDBDBD"
        multiline
        textAlignVertical="top"
      />
    </PaperSheet>
  );
}

const styles = StyleSheet.create({
  twoPageContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  pageHalf: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
  },
  rightPageContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  washiCorner: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  washiCornerRight: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  stickyCorner: {
    marginTop: 10,
    width: '100%',
    maxWidth: 240,
    alignSelf: 'flex-end',
  },

  singlePage: {
    flex: 1,
    padding: 12,
  },
  mobileWashiHeader: {
    alignItems: 'center',
    marginVertical: 6,
  },

  textArea: {
    flex: 1,
    fontSize: 14,
    lineHeight: 28, // Kağıt çizgilerine tam oturması için 28px
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
