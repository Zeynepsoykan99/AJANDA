import React, { createContext, useContext, useRef, useCallback } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { PAPER_RULING_CONFIG } from '../../constants/paperRulings';

export const SmartSnappingContext = createContext(null);

/**
 * calculateSnapping - Pure UI thread worklet function
 * Calculates magnetic snapping for a moving item against static targets.
 * If baselineOffset is provided (for text blocks), snaps text baseline or vertical center
 * instead of arbitrary bounding box edges.
 */
export function calculateSnapping(
  rawX,
  rawY,
  itemW,
  itemH,
  targetsX,
  targetsY,
  threshold = 6,
  baselineOffset = null
) {
  'worklet';
  let snappedX = rawX;
  let guideX = -1;
  let hasSnapX = false;
  let minDiffX = threshold + 1;

  if (targetsX && targetsX.length > 0) {
    const itemCenterX = rawX + itemW / 2;
    const itemRightX = rawX + itemW;

    for (let i = 0; i < targetsX.length; i++) {
      const target = targetsX[i];

      // 1. Merkez hizalaması
      const diffCenter = Math.abs(itemCenterX - target);
      if (diffCenter <= threshold && diffCenter < minDiffX) {
        minDiffX = diffCenter;
        snappedX = target - itemW / 2;
        guideX = target;
        hasSnapX = true;
      }

      // 2. Sol kenar hizalaması
      const diffLeft = Math.abs(rawX - target);
      if (diffLeft <= threshold && diffLeft < minDiffX) {
        minDiffX = diffLeft;
        snappedX = target;
        guideX = target;
        hasSnapX = true;
      }

      // 3. Sağ kenar hizalaması
      const diffRight = Math.abs(itemRightX - target);
      if (diffRight <= threshold && diffRight < minDiffX) {
        minDiffX = diffRight;
        snappedX = target - itemW;
        guideX = target;
        hasSnapX = true;
      }
    }
  }

  let snappedY = rawY;
  let guideY = -1;
  let hasSnapY = false;
  let minDiffY = threshold + 1;

  if (targetsY && targetsY.length > 0) {
    const itemCenterY = rawY + itemH / 2;

    for (let i = 0; i < targetsY.length; i++) {
      const target = targetsY[i];

      if (typeof baselineOffset === 'number' && baselineOffset > 0) {
        // Metin Kutuları İçin: 1. Taban Çizgisi (Baseline) Hizalaması (Yazının Defter Çizgisine Oturması)
        const itemBaselineY = rawY + baselineOffset;
        const diffBaseline = Math.abs(itemBaselineY - target);
        if (diffBaseline <= threshold && diffBaseline < minDiffY) {
          minDiffY = diffBaseline;
          snappedY = target - baselineOffset;
          guideY = target;
          hasSnapY = true;
        }

        // 2. Dikey Merkez Hizalaması
        const diffCenter = Math.abs(itemCenterY - target);
        if (diffCenter <= threshold && diffCenter < minDiffY) {
          minDiffY = diffCenter;
          snappedY = target - itemH / 2;
          guideY = target;
          hasSnapY = true;
        }
      } else {
        // Çıkartmalar (Stickers) İçin: Merkez, Üst ve Alt Kenar Hizalaması
        const itemBottomY = rawY + itemH;

        // 1. Merkez hizalaması
        const diffCenter = Math.abs(itemCenterY - target);
        if (diffCenter <= threshold && diffCenter < minDiffY) {
          minDiffY = diffCenter;
          snappedY = target - itemH / 2;
          guideY = target;
          hasSnapY = true;
        }

        // 2. Üst kenar hizalaması
        const diffTop = Math.abs(rawY - target);
        if (diffTop <= threshold && diffTop < minDiffY) {
          minDiffY = diffTop;
          snappedY = target;
          guideY = target;
          hasSnapY = true;
        }

        // 3. Alt kenar hizalaması
        const diffBottom = Math.abs(itemBottomY - target);
        if (diffBottom <= threshold && diffBottom < minDiffY) {
          minDiffY = diffBottom;
          snappedY = target - itemH;
          guideY = target;
          hasSnapY = true;
        }
      }
    }
  }

  return {
    snappedX,
    snappedY,
    guideX,
    guideY,
    hasSnapX,
    hasSnapY,
  };
}

/**
 * SmartSnappingProvider - Sayfa üzerindeki tüm öğeler için ortak kılavuz yöneticisi
 */
export function SmartSnappingProvider({
  children,
  stickers = [],
  textBlocks = [],
  canvasWidth = 0,
  canvasHeight = 0,
  ruling = 'lined',
}) {
  const guideLineX = useSharedValue(-1);
  const guideLineY = useSharedValue(-1);
  const guideLineXVisible = useSharedValue(0);
  const guideLineYVisible = useSharedValue(0);

  const itemsRef = useRef({ stickers, textBlocks, canvasWidth, canvasHeight, ruling });
  itemsRef.current = { stickers, textBlocks, canvasWidth, canvasHeight, ruling };

  // Sürükleme başladığı anda çağrılır; durağan öğelerden ve kağıt çizgilerinden hedef koordinat havuzu üretir
  const getSnapTargets = useCallback((excludeId) => {
    const {
      stickers: currentStickers,
      textBlocks: currentTextBlocks,
      canvasWidth: cw,
      canvasHeight: ch,
      ruling: currentRuling,
    } = itemsRef.current;

    const targetsX = [];
    const targetsY = [];

    // 1. Tuval Merkezleri
    if (cw > 0) targetsX.push(cw / 2);
    if (ch > 0) targetsY.push(ch / 2);

    // 2. Kağıt Defter Çizgileri (Ruling Lines: Lined, Grid, Dotted)
    if (currentRuling && PAPER_RULING_CONFIG[currentRuling] && ch > 0) {
      const cfg = PAPER_RULING_CONFIG[currentRuling];
      const rTop = cfg.rulingTop || 36;
      const pitch = cfg.linePitch || 32;
      if (pitch > 0) {
        for (let y = rTop; y <= ch; y += pitch) {
          targetsY.push(y);
        }
      }
    }

    // 3. Diğer Çıkartmalar
    (currentStickers || []).forEach((s) => {
      if (s.id === excludeId) return;
      const sw = 80 * (s.scale || 1);
      const sh = 80 * (s.scale || 1);
      const sx = s.x || 0;
      const sy = s.y || 0;
      targetsX.push(sx); // Sol
      targetsX.push(sx + sw / 2); // Merkez
      targetsX.push(sx + sw); // Sağ
      targetsY.push(sy); // Üst
      targetsY.push(sy + sh / 2); // Merkez
      targetsY.push(sy + sh); // Alt
    });

    // 4. Diğer Metin Kutuları
    (currentTextBlocks || []).forEach((b) => {
      if (b.id === excludeId) return;
      const bw = b.width || 100;
      const bFontSize = b.fontSize || 16;
      const bh = Math.round(bFontSize * 1.3);
      const bx = b.x || 0;
      const by = b.y || 0;
      const bBaseline = by + Math.round(bFontSize * 0.82);

      targetsX.push(bx); // Sol
      targetsX.push(bx + bw / 2); // Merkez
      targetsX.push(bx + bw); // Sağ

      targetsY.push(bBaseline); // Metin taban çizgisi (Baseline)
      targetsY.push(by + bh / 2); // Metin dikey merkezi
    });

    return { targetsX, targetsY };
  }, []);

  const hideGuides = useCallback(() => {
    'worklet';
    guideLineXVisible.value = 0;
    guideLineYVisible.value = 0;
  }, [guideLineXVisible, guideLineYVisible]);

  const value = {
    guideLineX,
    guideLineY,
    guideLineXVisible,
    guideLineYVisible,
    getSnapTargets,
    hideGuides,
    calculateSnapping,
  };

  return (
    <SmartSnappingContext.Provider value={value}>
      {children}
    </SmartSnappingContext.Provider>
  );
}

export const useSmartSnapping = () => useContext(SmartSnappingContext);
