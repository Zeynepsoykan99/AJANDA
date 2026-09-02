import React from 'react';
import {
  View,
  ImageBackground,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import useResponsiveLayout from '../../hooks/useResponsiveLayout';

/**
 * ImageTemplatePage - Birebir görsel tabanlı sayfa şablonu
 * Kullanıcının ilettiği orijinal planlayıcı grafiklerini (planner.jpg, planner2.jpg)
 * tam sayfa arka plan olarak gösterir ve üzerine çizim/not katmanı oturur.
 */
export default function ImageTemplatePage({ template }) {
  const { isTablet } = useResponsiveLayout();
  const screenWidth = Dimensions.get('window').width;

  const imageSource = template?.image;
  const aspectRatio = template?.aspectRatio || 0.7;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.tabletScrollContent,
        ]}
      >
        <View
          style={[
            styles.imageWrapper,
            isTablet ? styles.tabletWrapper : { width: screenWidth - 24 },
            { aspectRatio },
          ]}
        >
          <ImageBackground
            source={imageSource}
            style={styles.backgroundImage}
            imageStyle={styles.imageInner}
            resizeMode="contain"
          >
            {/* 
              Görselin üzerine DrawingCanvas (ve StickerCanvas) 
              [pageId].js seviyesinde tam ekran absolute olarak yerleşir.
            */}
          </ImageBackground>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabletScrollContent: {
    paddingVertical: 20,
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#C2185B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  tabletWrapper: {
    width: 680,
    maxWidth: '92%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  imageInner: {
    borderRadius: 16,
  },
});
