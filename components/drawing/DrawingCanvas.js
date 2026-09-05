import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  isStrokeInsidePolygon,
  getMultiStrokeBounds,
  isEraserHittingTextBlock,
  calculateCharacterBoxes,
  getErasedCharacterIndices,
  eraseCharactersFromBlock,
} from '../../utils/lassoGeometry';
import { useZoomableCanvas } from './ZoomableCanvas';

const triggerHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {}
};

/**
 * StaticDrawingsLayer - Tamamlanmış kalıcı çizgileri render eden memoize katman.
 * Aktif çizgi (currentPath) her pikselde güncellenirken eski çizgilerin
 * gereksiz SVG DOM reconciliation'a girmesini engeller.
 */
const StaticDrawingsLayer = React.memo(function StaticDrawingsLayer({
  drawings = [],
  selectedStrokeIds = [],
  hiddenStrokeIds,
}) {
  return (
    <>
      {drawings.map((stroke) => {
        if (hiddenStrokeIds && hiddenStrokeIds.has(stroke.id)) return null;
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
    </>
  );
});

/**
 * DrawingCanvas - Apple Pencil ve Serbest El Yazısı / Çizim Katmanı
 * Sayfa üzerinde şeffaf bir katman olarak yer alır.
 * Çizim modunda Quadratic Bézier eğrileri ile pürüzsüz hatlar üretir.
 * Kement (Lasso) modunda el yazısı seçimini ve sınırlayıcı kutuyu yönetir.
 * Silgi modunda Local Buffer & Batch Commit mimarisiyle 0 re-render silme sağlar.
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
  onTextBlockEdited,
  selectedStrokeIds = [],
  selectionBounds = null,
  onSelectionChange,
  style,
}) {
  const { scale: zoomScale, pageToCanvas, screenToCanvas } = useZoomableCanvas();
  const [currentPath, setCurrentPath] = useState('');
  const [lassoPath, setLassoPath] = useState('');
  const [hiddenStrokeIds, setHiddenStrokeIds] = useState(new Set());
  const pointsRef = useRef([]);
  const strokeStartTimeRef = useRef(0);

  // Silgi optimizasyonu için RAF ve koordinat ref'leri
  const lastEraseCoordRef = useRef(null);
  const prevEraseCoordRef = useRef(null);
  const eraseRafIdRef = useRef(null);
  const lastHapticTimeRef = useRef(0);

  // Silgi yerel oturumu (gesture boyunca üst sayfaya re-render vermeden çalışır)
  const eraserSessionRef = useRef(null);

  // Çizgi sınır kutuları önbelleği (bounding box cache ile 100x hızlı hit test)
  const strokeBoundsCacheRef = useRef(new Map());

  // Karakter koordinatları önbelleği (gereksiz re-calculation yükünü önler)
  const charBoxesCacheRef = useRef(new Map());

  const triggerThrottledHaptic = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticTimeRef.current > 160) {
      lastHapticTimeRef.current = now;
      triggerHaptic();
    }
  }, []);

  const getCachedCharBoxes = useCallback((block) => {
    const cache = charBoxesCacheRef.current.get(block.id);
    if (
      cache &&
      cache.text === block.text &&
      cache.x === block.x &&
      cache.y === block.y &&
      cache.width === block.width &&
      cache.fontSize === block.fontSize
    ) {
      return cache.boxes;
    }
    const boxes = calculateCharacterBoxes(block);
    charBoxesCacheRef.current.set(block.id, {
      text: block.text,
      x: block.x,
      y: block.y,
      width: block.width,
      fontSize: block.fontSize,
      boxes,
    });
    return boxes;
  }, []);

  const getStrokeBounds = useCallback((stroke) => {
    let bounds = strokeBoundsCacheRef.current.get(stroke.id);
    if (!bounds && stroke.points && stroke.points.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      bounds = { minX, minY, maxX, maxY };
      strokeBoundsCacheRef.current.set(stroke.id, bounds);
    }
    return bounds;
  }, []);

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
    onTextBlockEdited,
    selectedStrokeIds,
    selectionBounds,
    onSelectionChange,
    zoomScale,
    pageToCanvas,
    screenToCanvas,
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
      onTextBlockEdited,
      selectedStrokeIds,
      selectionBounds,
      onSelectionChange,
      zoomScale,
      pageToCanvas,
      screenToCanvas,
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
    onTextBlockEdited,
    selectedStrokeIds,
    selectionBounds,
    onSelectionChange,
    zoomScale,
    pageToCanvas,
    screenToCanvas,
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
    if (points.length > 2) {
      d += ' Z';
    }
    return d;
  };

  /**
   * processEraseAt - Tek bir noktadaki silme kontrolünü yerel oturum (session) üzerinde yapar.
   * Üst sayfada setState çağırmaz (0 parent re-render).
   * Silinen çizgileri anlık hiddenStrokeIds ile ekrandan gizler.
   */
  const processEraseAt = useCallback((x, y) => {
    const session = eraserSessionRef.current;
    if (!session) return;

    // Silgi etki alanı yarıçapı tuval büyütme katsayısına göre dinamik dengelenir
    const currentScale = stateRef.current.zoomScale?.value || 1.0;
    const radius = Math.max(8, 25 / currentScale);
    const rSquared = radius * radius;
    let newStrokesHidden = false;

    // 1. Çizim çizgilerini (el yazısı) silme kontrolü
    for (const stroke of session.drawings) {
      if (session.deletedDrawingIds.has(stroke.id)) continue;
      if (!stroke.points || stroke.points.length === 0) continue;

      const bounds = getStrokeBounds(stroke);
      if (bounds) {
        if (
          x + radius < bounds.minX ||
          x - radius > bounds.maxX ||
          y + radius < bounds.minY ||
          y - radius > bounds.maxY
        ) {
          continue; // Bounding box dışında, noktaları taramaya gerek yok (hızlı filtreleme)
        }
      }

      // Sınır kutusu içinde: nokta bazlı mesafe kontrolü (karekök almadan rSquared ile)
      const isHit = stroke.points.some((p) => {
        const dx = p.x - x;
        const dy = p.y - y;
        return dx * dx + dy * dy < rSquared;
      });

      if (isHit) {
        session.deletedDrawingIds.add(stroke.id);
        session.hasChanges = true;
        newStrokesHidden = true;
        triggerThrottledHaptic();
      }
    }

    if (newStrokesHidden) {
      setHiddenStrokeIds(new Set(session.deletedDrawingIds));
    }

    // 2. Dijital metin kutularını (textBlocks) harf harf kısmi silme kontrolü
    for (let i = 0; i < session.currentTextBlocks.length; i++) {
      const block = session.currentTextBlocks[i];
      if (!block || !block.text) continue;
      if (session.deletedBlockIds.has(block.id)) continue;

      // Hızlı geniş filtreleme: silgi bu bloğun sınırlarına yakın bile değilse harfleri hesaplama
      if (!isEraserHittingTextBlock(x, y, radius, block)) continue;

      // Bloğa ait harf kutularını önbellekten al veya hesapla
      const charBoxes = getCachedCharBoxes(block);
      const erasedIndices = getErasedCharacterIndices(x, y, radius, charBoxes);

      if (erasedIndices.length > 0) {
        const result = eraseCharactersFromBlock(block, erasedIndices);
        if (result.changed) {
          session.hasChanges = true;
          session.textBlocksChanged = true;
          triggerThrottledHaptic();

          if (result.shouldDeleteBlock) {
            session.deletedBlockIds.add(block.id);
            session.completelyDeletedBlocks.push(block);
            charBoxesCacheRef.current.delete(block.id);
            session.currentTextBlocks.splice(i, 1);
            i--;
          } else {
            session.currentTextBlocks[i] = result.updatedBlock;
            const existingEdit = session.editedBlocksInfo.find((e) => e.blockId === block.id);
            if (existingEdit) {
              existingEdit.newText = result.updatedBlock.text;
            } else {
              session.editedBlocksInfo.push({
                blockId: block.id,
                previousText: result.previousText,
                newText: result.updatedBlock.text,
              });
            }

            // Önbelleği yeni metinle güncelle
            charBoxesCacheRef.current.set(block.id, {
              text: result.updatedBlock.text,
              x: result.updatedBlock.x,
              y: result.updatedBlock.y,
              width: result.updatedBlock.width,
              fontSize: result.updatedBlock.fontSize,
              boxes: calculateCharacterBoxes(result.updatedBlock),
            });
          }
        }
      }
    }
  }, [getCachedCharBoxes, getStrokeBounds, triggerThrottledHaptic]);

  /**
   * eraseBetweenPoints - İki silgi koordinatı arasındaki hattı 15px aralıklarla enterpole eder.
   * Hızlı silme hareketlerinde noktaların atlanmasını ve silginin çizgilerin üzerinden geçip
   * silmeme sorununu 100% çözer.
   */
  const eraseBetweenPoints = useCallback((p1, p2) => {
    if (!p1) {
      if (p2) processEraseAt(p2.x, p2.y);
      return;
    }
    if (!p2) return;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    const stepSize = 15; // 25px yarıçaplı silgi için 15px adım mükemmel örtüşme sağlar
    const steps = Math.max(1, Math.ceil(dist / stepSize));

    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      processEraseAt(p1.x + dx * t, p1.y + dy * t);
    }
  }, [processEraseAt]);

  /**
   * commitEraserBatch - Silgi parmaktan/kalemden ayrıldığında tüm değişiklikleri tek seferde kaydeder.
   */
  const commitEraserBatch = useCallback(() => {
    const session = eraserSessionRef.current;
    if (!session || !session.hasChanges) {
      eraserSessionRef.current = null;
      setHiddenStrokeIds(new Set());
      return;
    }

    const state = stateRef.current;

    // 1. Çizim çizgilerini tek seferde güncelle
    if (session.deletedDrawingIds.size > 0 && state.onDrawingsChange) {
      const remainingDrawings = state.drawings.filter(
        (s) => !session.deletedDrawingIds.has(s.id)
      );
      stateRef.current.drawings = remainingDrawings;
      state.onDrawingsChange(remainingDrawings);
    }

    // 2. Metin kutularını tek seferde güncelle
    if (session.textBlocksChanged && state.onTextBlocksChange) {
      stateRef.current.textBlocks = session.currentTextBlocks;
      state.onTextBlocksChange(session.currentTextBlocks);

      if (session.completelyDeletedBlocks.length > 0 && state.onTextBlockDeleted) {
        state.onTextBlockDeleted(session.completelyDeletedBlocks);
      }
      if (session.editedBlocksInfo.length > 0 && state.onTextBlockEdited) {
        state.onTextBlockEdited(session.editedBlocksInfo);
      }
    }

    eraserSessionRef.current = null;
    setHiddenStrokeIds(new Set());
  }, []);

  // PanResponder yalnızca bir kez oluşturulur ve her zaman güncel ref değerlerini okur
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (!stateRef.current.isDrawingMode) return false;
        // İki veya daha fazla parmak dokunduysa çizimi başlatma, ZoomableCanvas'a bırak
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length > 1) return false;
        return true;
      },
      onMoveShouldSetPanResponder: (evt) => {
        if (!stateRef.current.isDrawingMode) return false;
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length > 1) return false;
        return true;
      },

      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length > 1) {
          return;
        }

        const state = stateRef.current;
        const { locationX, locationY, pageX, pageY } = evt.nativeEvent;

        // Koordinat Dönüşümü:
        let coordX = locationX;
        let coordY = locationY;
        if (pageX !== undefined && pageY !== undefined && state.pageToCanvas) {
          const pt = state.pageToCanvas(pageX, pageY);
          coordX = pt.x;
          coordY = pt.y;
        } else if (state.screenToCanvas) {
          const pt = state.screenToCanvas(locationX, locationY);
          coordX = pt.x;
          coordY = pt.y;
        }

        if (state.tool === 'eraser') {
          // Yeni bir silgi oturumu başlat
          eraserSessionRef.current = {
            drawings: [...state.drawings],
            deletedDrawingIds: new Set(),
            currentTextBlocks: [...state.textBlocks],
            deletedBlockIds: new Set(),
            completelyDeletedBlocks: [],
            editedBlocksInfo: [],
            textBlocksChanged: false,
            hasChanges: false,
          };
          prevEraseCoordRef.current = { x: coordX, y: coordY };
          lastEraseCoordRef.current = { x: coordX, y: coordY };
          processEraseAt(coordX, coordY);
          return;
        }

        if (state.tool === 'lasso') {
          if (state.selectedStrokeIds.length > 0 && state.onSelectionChange) {
            state.onSelectionChange({ selectedStrokeIds: [], bounds: null, selectedStrokes: [] });
          }
          pointsRef.current = [{ x: coordX, y: coordY }];
          setLassoPath(`M ${coordX} ${coordY}`);
          return;
        }

        strokeStartTimeRef.current = Date.now();
        pointsRef.current = [{ x: coordX, y: coordY, timestamp: 0 }];
        setCurrentPath(`M ${coordX} ${coordY}`);
      },

      onPanResponderMove: (evt) => {
        // İki parmak algılandığında çizimi anında iptal et (çapraz leke çizgisini önler)
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length > 1) {
          pointsRef.current = [];
          setCurrentPath('');
          setLassoPath('');
          return;
        }

        const state = stateRef.current;
        const { locationX, locationY, pageX, pageY } = evt.nativeEvent;

        let coordX = locationX;
        let coordY = locationY;
        if (pageX !== undefined && pageY !== undefined && state.pageToCanvas) {
          const pt = state.pageToCanvas(pageX, pageY);
          coordX = pt.x;
          coordY = pt.y;
        } else if (state.screenToCanvas) {
          const pt = state.screenToCanvas(locationX, locationY);
          coordX = pt.x;
          coordY = pt.y;
        }

        if (state.tool === 'eraser') {
          lastEraseCoordRef.current = { x: coordX, y: coordY };
          if (!eraseRafIdRef.current) {
            eraseRafIdRef.current = requestAnimationFrame(() => {
              eraseRafIdRef.current = null;
              if (lastEraseCoordRef.current) {
                eraseBetweenPoints(prevEraseCoordRef.current, lastEraseCoordRef.current);
                prevEraseCoordRef.current = { ...lastEraseCoordRef.current };
              }
            });
          }
          return;
        }

        if (state.tool === 'lasso') {
          pointsRef.current.push({ x: coordX, y: coordY });
          const newLasso = pointsToLassoSvgPath(pointsRef.current);
          setLassoPath(newLasso);
          return;
        }

        const elapsed = Date.now() - strokeStartTimeRef.current;
        pointsRef.current.push({ x: coordX, y: coordY, timestamp: elapsed });
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
            eraseBetweenPoints(prevEraseCoordRef.current, lastEraseCoordRef.current);
            prevEraseCoordRef.current = null;
            lastEraseCoordRef.current = null;
          }
          commitEraserBatch();
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

            // Önbelleği yeni çizgi için de besle
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            for (let i = 0; i < newStroke.points.length; i++) {
              const p = newStroke.points[i];
              if (p.x < minX) minX = p.x;
              if (p.x > maxX) maxX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.y > maxY) maxY = p.y;
            }
            strokeBoundsCacheRef.current.set(newStroke.id, { minX, minY, maxX, maxY });

            state.onDrawingsChange([...state.drawings, newStroke]);
          }
        }
        pointsRef.current = [];
        setCurrentPath('');
      },

      onPanResponderTerminate: () => {
        const state = stateRef.current;
        if (state.tool === 'eraser') {
          if (eraseRafIdRef.current) {
            cancelAnimationFrame(eraseRafIdRef.current);
            eraseRafIdRef.current = null;
          }
          commitEraserBatch();
        }
        pointsRef.current = [];
        setCurrentPath('');
        setLassoPath('');
      },
    })
  ).current;

  // Fosforlu Kalem için anlık saydamlık
  const currentOpacity = tool === 'highlighter' ? 0.4 : 0.95;
  const currentDrawWidth = tool === 'highlighter' ? strokeWidth * 3.5 : strokeWidth;

  const hasSelection = selectedStrokeIds.length > 0 && selectionBounds && selectionBounds.width > 0;

  return (
    <View
      style={[
        styles.container,
        { zIndex: isDrawingMode ? 50 : 20 },
        style,
      ]}
      pointerEvents={isDrawingMode ? 'auto' : 'none'}
      {...(isDrawingMode ? panResponder.panHandlers : {})}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {/* Tamamlanmış Kalıcı Çizgiler (Memoized Layer - 0 Gereksiz Re-render) */}
        <StaticDrawingsLayer
          drawings={drawings}
          selectedStrokeIds={selectedStrokeIds}
          hiddenStrokeIds={hiddenStrokeIds}
        />

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
  },
});
