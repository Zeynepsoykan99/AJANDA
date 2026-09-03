import React, { useState } from 'react';
import { View, StyleSheet, ImageBackground, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Skeleton from './Skeleton';

export default function ImageWithSkeleton({
  source,
  style,
  resizeMode = 'cover',
  isBackground = false,
  children,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const skeletonOpacity = useSharedValue(1);

  const handleLoad = () => {
    setIsLoaded(true);
    skeletonOpacity.value = withTiming(0, { duration: 400 });
  };

  const animatedSkeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  const ImageComponent = isBackground ? ImageBackground : Image;

  return (
    <View style={[styles.container, style]}>
      <ImageComponent
        source={source}
        style={styles.image}
        resizeMode={resizeMode}
        onLoad={handleLoad}
      >
        {isBackground && children}
      </ImageComponent>

      {!isLoaded && (
        <Animated.View style={[styles.skeletonOverlay, animatedSkeletonStyle]} pointerEvents="none">
          <Skeleton width="100%" height="100%" borderRadius={0} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  skeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
