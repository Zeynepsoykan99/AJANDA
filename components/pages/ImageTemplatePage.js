import React from 'react';
import { View, StyleSheet } from 'react-native';
import ImageWithSkeleton from '../ui/ImageWithSkeleton';

/**
 * ImageTemplatePage - Tam Sayfa (Full Bleed) Görsel Şablonu
 * Kullanıcının orijinal haftalık planlayıcı görselini (planner.jpg, planner2.jpg)
 * sıfır boşlukla uçtan uca kaplar; görsel doğrudan kağıdın kendisidir.
 */
export default function ImageTemplatePage({ template }) {
  const imageSource = template?.image;
  const edgeColor = template?.edgeColor || 'transparent';

  return (
    <View style={[styles.container, { backgroundColor: edgeColor }]}>
      <ImageWithSkeleton
        isBackground={true}
        source={imageSource}
        style={[styles.fullBleedImage, { backgroundColor: edgeColor }]}
        imageStyle={styles.imageStyle}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: '100%',
    padding: 0,
    margin: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  fullBleedImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: '100%',
  },
  imageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});
