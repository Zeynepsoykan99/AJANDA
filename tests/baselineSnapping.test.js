/**
 * Baseline Snapping Mathematical Unit Tests
 */
const assert = require('assert');

// Node-compatible calculateSnapping from SmartSnappingContext.js
function calculateSnapping(
  rawX,
  rawY,
  itemW,
  itemH,
  targetsX,
  targetsY,
  threshold = 6,
  baselineOffset = null
) {
  let snappedX = rawX;
  let guideX = -1;
  let hasSnapX = false;
  let minDiffX = threshold + 1;

  if (targetsX && targetsX.length > 0) {
    const itemCenterX = rawX + itemW / 2;
    const itemRightX = rawX + itemW;

    for (let i = 0; i < targetsX.length; i++) {
      const target = targetsX[i];
      const diffCenter = Math.abs(itemCenterX - target);
      if (diffCenter <= threshold && diffCenter < minDiffX) {
        minDiffX = diffCenter;
        snappedX = target - itemW / 2;
        guideX = target;
        hasSnapX = true;
      }
      const diffLeft = Math.abs(rawX - target);
      if (diffLeft <= threshold && diffLeft < minDiffX) {
        minDiffX = diffLeft;
        snappedX = target;
        guideX = target;
        hasSnapX = true;
      }
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
        const itemBaselineY = rawY + baselineOffset;
        const diffBaseline = Math.abs(itemBaselineY - target);
        if (diffBaseline <= threshold && diffBaseline < minDiffY) {
          minDiffY = diffBaseline;
          snappedY = target - baselineOffset;
          guideY = target;
          hasSnapY = true;
        }

        const diffCenter = Math.abs(itemCenterY - target);
        if (diffCenter <= threshold && diffCenter < minDiffY) {
          minDiffY = diffCenter;
          snappedY = target - itemH / 2;
          guideY = target;
          hasSnapY = true;
        }
      } else {
        const itemBottomY = rawY + itemH;
        const diffCenter = Math.abs(itemCenterY - target);
        if (diffCenter <= threshold && diffCenter < minDiffY) {
          minDiffY = diffCenter;
          snappedY = target - itemH / 2;
          guideY = target;
          hasSnapY = true;
        }
        const diffTop = Math.abs(rawY - target);
        if (diffTop <= threshold && diffTop < minDiffY) {
          minDiffY = diffTop;
          snappedY = target;
          guideY = target;
          hasSnapY = true;
        }
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

  return { snappedX, snappedY, guideX, guideY, hasSnapX, hasSnapY };
}

console.log('--- Baseline Snapping Mathematical Unit Tests ---');

// Test 1: Defter çizgisine taban çizgisi (baseline) yapışması
{
  const rulingLineY = 68; // 36 + 32 (2. defter çizgisi)
  const fontSize = 16;
  const baselineOffset = Math.round(fontSize * 0.82); // 13px
  const rawY = 53; // baseline = 53 + 13 = 66. Fark |66 - 68| = 2px <= 6px

  const res = calculateSnapping(100, rawY, 120, 20, [], [rulingLineY], 6, baselineOffset);

  assert.strictEqual(res.hasSnapY, true);
  assert.strictEqual(res.guideY, rulingLineY); // Kılavuz çizgisi tam defter çizgisinde parlar
  assert.strictEqual(res.snappedY, rulingLineY - baselineOffset); // 68 - 13 = 55
  assert.strictEqual(res.snappedY + baselineOffset, rulingLineY); // Harflerin altı tam 68'e oturur
  console.log('✔ Test 1: Text baseline perfectly snapped to notebook ruling line passed');
}

// Test 2: İki metin kutusunun taban çizgilerinin (baseline) birbiriyle hizalanması
{
  const otherTextBaseline = 100;
  const fontSize = 16;
  const baselineOffset = 13;
  const rawY = 85; // baseline = 85 + 13 = 98. Fark = 2px <= 6px

  const res = calculateSnapping(100, rawY, 80, 20, [], [otherTextBaseline], 6, baselineOffset);

  assert.strictEqual(res.hasSnapY, true);
  assert.strictEqual(res.guideY, 100);
  assert.strictEqual(res.snappedY + baselineOffset, 100);
  console.log('✔ Test 2: Text-to-Text baseline alignment passed');
}

// Test 3: Baseline tolerans dışındayken serbest konum korunması
{
  const rulingLineY = 68;
  const baselineOffset = 13;
  const rawY = 40; // baseline = 53, diff = 15 > 6

  const res = calculateSnapping(100, rawY, 120, 20, [], [rulingLineY], 6, baselineOffset);

  assert.strictEqual(res.hasSnapY, false);
  assert.strictEqual(res.snappedY, 40);
  console.log('✔ Test 3: Free movement outside baseline threshold passed');
}

console.log('--- ALL BASELINE SNAPPING UNIT TESTS PASSED SUCCESSFULLY! ---');
