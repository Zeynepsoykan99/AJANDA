import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';

/**
 * DaisyFlower - Sevimli Papatya Çiçeği Vektörü
 */
export function DaisyFlower({ size = 28, style }) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <G>
          {/* Beyaz Taç Yapraklar */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <Path
              key={i}
              d="M20 20 C18 10, 22 10, 20 5 C18 10, 22 10, 20 20"
              fill="#FFFFFF"
              stroke="#F8BBD0"
              strokeWidth="0.8"
              transform={`rotate(${angle} 20 20)`}
            />
          ))}
          {/* Altın Sarı Çiçek Göbeği */}
          <Circle cx="20" cy="20" r="5" fill="#FFD54F" stroke="#FFA000" strokeWidth="0.6" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * RibbonBow - Sevimli Fiyonk / Kurdele Vektörü
 */
export function RibbonBow({ size = 32, color = '#F48FB1', style }) {
  return (
    <View style={[{ width: size, height: size * 0.75 }, style]}>
      <Svg width={size} height={size * 0.75} viewBox="0 0 48 36">
        <G fill={color} stroke="#AD1457" strokeWidth="0.6">
          {/* Sol Kanat */}
          <Path d="M24 16 C16 4, 2 8, 8 18 C14 24, 20 18, 24 16 Z" opacity="0.95" />
          {/* Sağ Kanat */}
          <Path d="M24 16 C32 4, 46 8, 40 18 C34 24, 28 18, 24 16 Z" opacity="0.95" />
          {/* Sol Kuyruk */}
          <Path d="M22 18 C18 24, 12 32, 10 34 C14 32, 18 28, 22 20 Z" />
          {/* Sağ Kuyruk */}
          <Path d="M26 18 C30 24, 36 32, 38 34 C34 32, 30 28, 26 20 Z" />
          {/* Orta Düğüm */}
          <Circle cx="24" cy="16" r="3.5" fill={color} stroke="#880E4F" strokeWidth="0.8" />
        </G>
      </Svg>
    </View>
  );
}

/**
 * DoodleHeart - Sevimli El Çizimi Kalp
 */
export function DoodleHeart({ size = 18, color = '#F06292', style }) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={color}
          opacity="0.85"
        />
      </Svg>
    </View>
  );
}

/**
 * FloralCorner - Sayfa köşelerine oturan papatya ve fiyonk aranjmanı
 */
export function FloralCorner({ position = 'top-left', style }) {
  const isRight = position.includes('right');
  const isBottom = position.includes('bottom');

  return (
    <View
      style={[
        styles.cornerContainer,
        isRight ? { right: 8 } : { left: 8 },
        isBottom ? { bottom: 8 } : { top: 8 },
        style,
      ]}
      pointerEvents="none"
    >
      <View style={styles.flowerCluster}>
        <DaisyFlower size={26} />
        <RibbonBow size={24} color="#F8BBD0" style={{ marginLeft: -6, marginTop: 4 }} />
        <DoodleHeart size={14} color="#F48FB1" style={{ marginLeft: 2 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cornerContainer: {
    position: 'absolute',
    zIndex: 10,
    opacity: 0.9,
  },
  flowerCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
