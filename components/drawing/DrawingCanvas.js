import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  isStrokeInsidePolygon,
  getMultiStrokeBounds,
  isEraserHittingTextBlock,
} from '../../utils/lassoGeometry';

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

/**
 * DrawingCanvas - Apple Pencil ve Serbest El Yazısı / Çizim Katmanı
 * Sayfa üzerinde şeffaf bir katman olarak yer alır.
 * Çizim modunda Quadratic Bézier eğrileri ile pürüzsüz hatlar üretir.
 * Kement (Lasso) modunda el yazısı seçimini ve sınırlayıcı kutuyu yönetir.
 * Silgi modunda hem çizimleri (strokes) hem de dijital metin kutularını (textBlocks) siler.
 */
export default function DrawingCanvas({
  isDrawingMode = false,
  tool = 'pen',
  color = '#C2185B',
  strokeWidth = 3,
  drawings = [],
  onDrawingsChange,
  textBlocks = [],
  onTextBlocksChange,
  onTextBlockDeleted,
  selectedStrokeIds = [],
  selectionBounds = null,
  onSelectionChange,
  style,
}) {
  const [currentPath, setCurrentPath] = useState('');
  const [lassoPath, setLassoPath] = useState('');
  const pointsRef = useRef([]);
  const strokeStartTimeRef = useRef(0);

  // Silgi optimizasyonu için RAF ve koordinat ref'leri
  const lastEraseCoordRef = useRef(null);
  const eraseRafIdRef = useRef(null);

  // Stale Closure problemini çözmek için en güncel propları bir ref'te tutuyoruz
  const stateRef = useRef({
    isDrawingMode,
    tool,
    color,
    strokeWidth,
    drawings,
    onDrawingsChange,
    textBlocks,
    onTextBlocksChange,
    onTextBlockDeleted,
    selectedStrokeIds,
    selectionBounds,
    onSelectionChange,
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
      textBlocks,
      onTextBlocksChange,
      onTextBlockDeleted,
      selectedStrokeIds,
      selectionBounds,
      onSelectionChange,
    };
  }, [
    isDrawingMode,
    tool,
    color,
    strokeWidth,
    drawings,
    onDrawingsChange,
    textBlocks,
    onTextBlocksChange,
    onTextBlockDeleted,
    selectedStrokeIds,
    selectionBounds,
    onSelectionChange,
  ]);

  // Unmount anında bekleyen RAF varsa temizle
  useEffect(() => {
    return () => {
      if (eraseRafIdRef.current) {
        cancelAnimationFrame(eraseRafIdRef.current);
      }
    };
  }, []);

  // Araç lasso'dan başka bir şeye değiştiğinde seçimi temizle
  useEffect(() => {
    if (tool !== 'lasso' && selectedStrokeIds.length > 0 && onSelectionChange) {
      onSelectionChange({ selectedStrokeIds: [], bounds: null, selectedStrokes: [] });
    }
  }, [tool]);

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

  // Kement noktalarından SVG poligon çizgisi üretir
  const pointsToLassoSvgPath = (points) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    // Kapalı çokgen hissi için başlangıca bağla
    if (points.length > 2) {
      d += ' Z';
    }
    return d;
  };

  // Silgi algoritması: Dokunulan noktanın yakınındaki çizgileri ve metin kutularını bulup siler
  const eraseNearPoint = useCallback((x, y) => {
    const state = stateRef.current;
    const radius = 25; // Silgi etki alanı yarıçapı

    // 1. Çizim çizgilerini (el yazısı) silme kontrolü
    if (state.onDrawingsChange && state.drawings && state.drawings.length > 0) {
      const remainingStrokes = state.drawings.filter((stroke) => {
        if (!stroke.points || stroke.points.length === 0) return true;
        const isHit = stroke.points.some(
          (p) => Math.hypot(p.x - x, p.y - y) < radius
        );
        return !isHit;
      });

      if (remainingStrokes.length !== state.drawings.length) {
        stateRef.current.drawings = remainingStrokes;
        state.onDrawingsChange(remainingStrokes);
      }
    }

    // 2. Dijital metin kutularını (textBlocks) silme kontrolü
    if (state.onTextBlocksChange && state.textBlocks && state.textBlocks.length > 0) {
      const erasedBlocks = [];
      const remainingBlocks = [];

      for (const block of state.textBlocks) {
        if (isEraserHittingTextBlock(x, y, radius, block)) {
          erasedBlocks.push(block);
        } else {
          remainingBlocks.push(block);
        }
      }

      if (erasedBlocks.length > 0) {
        // Mükerrer tetiklemeyi önlemek için ref'i hemen güncelle
        stateRef.current.textBlocks = remainingBlocks;
        state.onTextBlocksChange(remainingBlocks);
        triggerHaptic();
        if (state.onTextBlockDeleted) {
          state.onTextBlockDeleted(erasedBlocks);
        }
      }
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
          // Dokunulduğu an anında sil (0 gecikme)
          eraseNearPoint(locationX, locationY);
          return;
        }

        if (state.tool === 'lasso') {
          // Önceki seçimi temizle ve yeni kement başlat
          if (state.selectedStrokeIds.length > 0 && state.onSelectionChange) {
            state.onSelectionChange({ selectedStrokeIds: [], bounds: null, selectedStrokes: [] });
          }
          pointsRef.current = [{ x: locationX, y: locationY }];
          setLassoPath(`M ${locationX} ${locationY}`);
          return;
        }

        strokeStartTimeRef.current = Date.now();
        pointsRef.current = [{ x: locationX, y: locationY, timestamp: 0 }];
        setCurrentPath(`M ${locationX} ${locationY}`);
      },

      onPanResponderMove: (evt) => {
        const state = stateRef.current;
        const { locationX, locationY } = evt.nativeEvent;

        if (state.tool === 'eraser') {
          // Sürükleme esnasında RAF ile optimize edilmiş silme
          lastEraseCoordRef.current = { x: locationX, y: locationY };
          if (!eraseRafIdRef.current) {
            eraseRafIdRef.current = requestAnimationFrame(() => {
              eraseRafIdRef.current = null;
              if (lastEraseCoordRef.current) {
                eraseNearPoint(lastEraseCoordRef.current.x, lastEraseCoordRef.current.y);
              }
            });
          }
          return;
        }

        if (state.tool === 'lasso') {
          pointsRef.current.push({ x: locationX, y: locationY });
          const newLasso = pointsToLassoSvgPath(pointsRef.current);
          setLassoPath(newLasso);
          return;
        }

        const elapsed = Date.now() - strokeStartTimeRef.current;
        pointsRef.current.push({ x: locationX, y: locationY, timestamp: elapsed });
        const newPath = pointsToSvgPath(pointsRef.current);
        setCurrentPath(newPath);
      },

      onPanResponderRelease: () => {
        const state = stateRef.current;
        if (state.tool === 'eraser') {
          if (eraseRafIdRef.current) {
            cancelAnimationFrame(eraseRafIdRef.current);
            eraseRafIdRef.current = null;
          }
          if (lastEraseCoordRef.current) {
            eraseNearPoint(lastEraseCoordRef.current.x, lastEraseCoordRef.current.y);
            lastEraseCoordRef.current = null;
          }
          return;
        }

        if (state.tool === 'lasso') {
          if (pointsRef.current.length >= 3) {
            const polygon = [...pointsRef.current];
            const matchingStrokes = state.drawings.filter((s) =>
              isStrokeInsidePolygon(s, polygon)
            );

            if (matchingStrokes.length > 0 && state.onSelectionChange) {
              const bounds = getMultiStrokeBounds(matchingStrokes);
              state.onSelectionChange({
                selectedStrokeIds: matchingStrokes.map((s) => s.id),
                bounds,
                selectedStrokes: matchingStrokes,
              });
            } else if (state.onSelectionChange) {
              state.onSelectionChange({
                selectedStrokeIds: [],
                bounds: null,
                selectedStrokes: [],
              });
            }
          }
          pointsRef.current = [];
          setLassoPath('');
          return;
        }

        if (pointsRef.current.length > 0 && state.onDrawingsChange) {
          const finalPath = pointsToSvgPath(pointsRef.current);
          if (finalPath) {
            const resolvedOpacity = state.tool === 'highlighter' ? 0.4 : 0.95;
            const resolvedWidth =
              state.tool === 'highlighter' ? state.strokeWidth * 3.5 : state.strokeWidth;

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

  const hasSelection = selectedStrokeIds.length > 0 && selectionBounds && selectionBounds.width > 0;

  return (
    <View
      style={[styles.container, style]}
      pointerEvents={isDrawingMode ? 'auto' : 'none'}
      {...(isDrawingMode ? panResponder.panHandlers : {})}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {/* Tamamlanmış Kalıcı Çizgiler */}
        {drawings.map((stroke) => {
          const isSelected = selectedStrokeIds.includes(stroke.id);
          return (
            <Path
              key={stroke.id}
              d={stroke.d}
              stroke={isSelected ? '#E91E63' : stroke.color}
              strokeWidth={isSelected ? stroke.strokeWidth + 1 : stroke.strokeWidth}
              strokeOpacity={stroke.strokeOpacity || 0.95}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          );
        })}

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

        {/* Anlık Kement (Lasso) Çizim Hattı */}
        {lassoPath ? (
          <Path
            d={lassoPath}
            stroke="#E91E63"
            strokeWidth={2}
            strokeDasharray="6, 4"
            fill="rgba(233, 30, 99, 0.08)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Kementle Seçilen Çizgilerin Sınırlayıcı Kutusu (Bounding Box & Handles) */}
        {hasSelection && (
          <>
            <Rect
              x={selectionBounds.minX - 6}
              y={selectionBounds.minY - 6}
              width={selectionBounds.width + 12}
              height={selectionBounds.height + 12}
              stroke="#E91E63"
              strokeWidth={1.5}
              strokeDasharray="5, 4"
              fill="rgba(233, 30, 99, 0.04)"
              rx={6}
            />
            <Circle
              cx={selectionBounds.minX - 6}
              cy={selectionBounds.minY - 6}
              r={4}
              fill="#E91E63"
            />
            <Circle
              cx={selectionBounds.maxX + 6}
              cy={selectionBounds.minY - 6}
              r={4}
              fill="#E91E63"
            />
            <Circle
              cx={selectionBounds.minX - 6}
              cy={selectionBounds.maxY + 6}
              r={4}
              fill="#E91E63"
            />
            <Circle
              cx={selectionBounds.maxX + 6}
              cy={selectionBounds.maxY + 6}
              r={4}
              fill="#E91E63"
            />
          </>
        )}
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
