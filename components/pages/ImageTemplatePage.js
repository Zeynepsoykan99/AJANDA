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

  return (
    <View style={styles.container}>
      <ImageWithSkeleton
        isBackground={true}
        source={imageSource}
        style={styles.fullBleedImage}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    margin: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  fullBleedImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
