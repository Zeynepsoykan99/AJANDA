import React from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';

/**
 * ImageTemplatePage - Tam Sayfa (Full Bleed) Görsel Şablonu
 * Kullanıcının orijinal haftalık planlayıcı görselini (planner.jpg, planner2.jpg)
 * sıfır boşlukla uçtan uca kaplar; görsel doğrudan kağıdın kendisidir.
 */
export default function ImageTemplatePage({ template }) {
  const imageSource = template?.image;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={imageSource}
        style={styles.fullBleedImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    padding: 0,
    margin: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  fullBleedImage: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
});
