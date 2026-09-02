import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * DrawingCanvas - Apple Pencil ve Serbest El Yazısı / Çizim Katmanı
 * Sayfa üzerinde şeffaf bir katman olarak yer alır.
 * Çizim modunda Quadratic Bézier eğrileri ile pürüzsüz hatlar üretir.
 */
export default function DrawingCanvas({
  isDrawingMode = false,
  tool = 'pen',
  color = '#C2185B',
  strokeWidth = 3,
  drawings = [],
  onDrawingsChange,
  style,
}) {
  const [currentPath, setCurrentPath] = useState('');
  const pointsRef = useRef([]);

  // Stale Closure problemini çözmek için en güncel propları bir ref'te tutuyoruz
  const stateRef = useRef({
    isDrawingMode,
    tool,
    color,
    strokeWidth,
    drawings,
    onDrawingsChange,
  });

  // Her render'da ref'i güncelliyoruz
  useEffect(() => {
    stateRef.current = {
      isDrawingMode,
      tool,
      color,
      strokeWidth,
      drawings,
      onDrawingsChange,
    };
  }, [isDrawingMode, tool, color, strokeWidth, drawings, onDrawingsChange]);

  // Nokta dizisinden pürüzsüz Quadratic Bézier SVG path stringi üretir
  const pointsToSvgPath = (points) => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      // Sadece tek nokta varsa nokta koy
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
    }
    // Son noktayı ekle
    d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return d;
  };

  // Silgi algoritması: Dokunulan noktanın yakınındaki çizgileri bulup siler
  const eraseNearPoint = useCallback((x, y) => {
    const state = stateRef.current;
    if (!state.onDrawingsChange || state.drawings.length === 0) return;
    
    const radius = 25; // Silgi etki alanı yarıçapı
    const remaining = state.drawings.filter((stroke) => {
      if (!stroke.points || stroke.points.length === 0) return true;
      const isHit = stroke.points.some(
        (p) => Math.hypot(p.x - x, p.y - y) < radius
      );
      return !isHit; // Vurulanı sil (filtrele)
    });

    if (remaining.length !== state.drawings.length) {
      state.onDrawingsChange(remaining);
    }
  }, []);

  // PanResponder yalnızca bir kez oluşturulur ve her zaman güncel ref değerlerini okur
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => stateRef.current.isDrawingMode,
      onMoveShouldSetPanResponder: () => stateRef.current.isDrawingMode,
      
      onPanResponderGrant: (evt) => {
        const state = stateRef.current;
        const { locationX, locationY } = evt.nativeEvent;
        
        if (state.tool === 'eraser') {
          eraseNearPoint(locationX, locationY);
          return;
        }

        pointsRef.current = [{ x: locationX, y: locationY }];
        setCurrentPath(`M ${locationX} ${locationY}`);
      },
      
      onPanResponderMove: (evt) => {
        const state = stateRef.current;
        const { locationX, locationY } = evt.nativeEvent;
        
        if (state.tool === 'eraser') {
          eraseNearPoint(locationX, locationY);
          return;
        }

        pointsRef.current.push({ x: locationX, y: locationY });
        const newPath = pointsToSvgPath(pointsRef.current);
        setCurrentPath(newPath);
      },
      
      onPanResponderRelease: () => {
        const state = stateRef.current;
        if (state.tool === 'eraser') return;

        if (pointsRef.current.length > 0 && state.onDrawingsChange) {
          const finalPath = pointsToSvgPath(pointsRef.current);
          if (finalPath) {
            // Fosforlu kalemse daha saydam ve kalın, normal kalemse net ve ince
            const resolvedOpacity = state.tool === 'highlighter' ? 0.4 : 0.95;
            const resolvedWidth = state.tool === 'highlighter' ? state.strokeWidth * 3.5 : state.strokeWidth;

            const newStroke = {
              id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              d: finalPath,
              color: state.color,
              strokeWidth: resolvedWidth,
              strokeOpacity: resolvedOpacity,
              points: [...pointsRef.current],
            };
            
            state.onDrawingsChange([...state.drawings, newStroke]);
          }
        }
        pointsRef.current = [];
        setCurrentPath('');
      },
    })
  ).current;

  // Fosforlu Kalem için anlık saydamlık
  const currentOpacity = tool === 'highlighter' ? 0.4 : 0.95;
  const currentDrawWidth = tool === 'highlighter' ? strokeWidth * 3.5 : strokeWidth;

  return (
    <View
      style={[styles.container, style]}
      pointerEvents={isDrawingMode ? 'auto' : 'none'}
      {...(isDrawingMode ? panResponder.panHandlers : {})}
    >
      <Svg style={StyleSheet.absoluteFill}>
        {/* Tamamlanmış Kalıcı Çizgiler */}
        {drawings.map((stroke) => (
          <Path
            key={stroke.id}
            d={stroke.d}
            stroke={stroke.color}
            strokeWidth={stroke.strokeWidth}
            strokeOpacity={stroke.strokeOpacity || 0.95}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}

        {/* Halen Çizilmekte Olan Anlık Çizgi */}
        {currentPath ? (
          <Path
            d={currentPath}
            stroke={color}
            strokeWidth={currentDrawWidth}
            strokeOpacity={currentOpacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
  },
});
