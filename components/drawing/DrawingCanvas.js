import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * DrawingCanvas - Apple Pencil ve Serbest El Yazısı / Çizim Katmanı
 * Sayfa üzerinde şeffaf bir katman olarak yer alır.
 * Çizim modunda Quadratic Bézier eğrileri ile pürüzsüz hatlar üretir.
 *
 * @param {boolean} isDrawingMode - Çizim modu aktif mi (true ise dokunuşları yakalar)
 * @param {string} tool - 'pen' | 'highlighter' | 'eraser'
 * @param {string} color - Mürekkep rengi
 * @param {number} strokeWidth - Çizgi kalınlığı
 * @param {Array} drawings - Mevcut çizim listesi [{ id, d, color, strokeWidth, strokeOpacity }]
 * @param {function} onDrawingsChange - Çizim listesi güncellendiğinde çağrılır
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

  // Fosforlu kalem için saydamlık
  const resolvedOpacity = tool === 'highlighter' ? 0.42 : 0.95;
  const resolvedWidth = tool === 'highlighter' ? strokeWidth * 3.5 : strokeWidth;

  // Nokta dizisinden pürüzsüz Quadratic Bézier SVG path stringi üretir
  const pointsToSvgPath = (points) => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
    }
    d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return d;
  };

  // Silgi: Dokunulan noktanın yakınındaki çizgiyi bulup siler
  const eraseNearPoint = useCallback(
    (x, y) => {
      if (!onDrawingsChange || drawings.length === 0) return;
      // Silgi yarıçapı
      const radius = 24;
      // Son çizgiden başlayarak kontrol et
      const remaining = drawings.filter((stroke) => {
        if (!stroke.points || stroke.points.length === 0) return true;
        const hit = stroke.points.some(
          (p) => Math.hypot(p.x - x, p.y - y) < radius
        );
        return !hit;
      });

      if (remaining.length !== drawings.length) {
        onDrawingsChange(remaining);
      }
    },
    [drawings, onDrawingsChange]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isDrawingMode,
      onMoveShouldSetPanResponder: () => isDrawingMode,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (tool === 'eraser') {
          eraseNearPoint(locationX, locationY);
          return;
        }

        pointsRef.current = [{ x: locationX, y: locationY }];
        setCurrentPath(`M ${locationX} ${locationY}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (tool === 'eraser') {
          eraseNearPoint(locationX, locationY);
          return;
        }

        pointsRef.current.push({ x: locationX, y: locationY });
        const newPath = pointsToSvgPath(pointsRef.current);
        setCurrentPath(newPath);
      },
      onPanResponderRelease: () => {
        if (tool === 'eraser') return;

        if (pointsRef.current.length > 0 && onDrawingsChange) {
          const finalPath = pointsToSvgPath(pointsRef.current);
          if (finalPath) {
            const newStroke = {
              id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              d: finalPath,
              color,
              strokeWidth: resolvedWidth,
              strokeOpacity: resolvedOpacity,
              points: [...pointsRef.current],
            };
            onDrawingsChange([...drawings, newStroke]);
          }
        }
        pointsRef.current = [];
        setCurrentPath('');
      },
    })
  ).current;

  return (
    <View
      style={[styles.container, style]}
      pointerEvents={isDrawingMode ? 'auto' : 'none'}
      {...(isDrawingMode ? panResponder.panHandlers : {})}
    >
      <Svg style={StyleSheet.absoluteFill}>
        {/* Tamamlanmış Çizgiler */}
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
            strokeWidth={resolvedWidth}
            strokeOpacity={resolvedOpacity}
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
