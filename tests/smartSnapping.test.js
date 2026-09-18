/**
 * Smart Snapping Mathematical Unit Tests
 */
const assert = require('assert');

// Node-compatible version of calculateSnapping (from SmartSnappingContext.js)
function calculateSnapping(rawX, rawY, itemW, itemH, targetsX, targetsY, threshold = 6) {
  let snappedX = rawX;
  let snappedY = rawY;
  let guideX = null;
  let guideY = null;
  let hasSnapX = false;
  let hasSnapY = false;

  const halfW = itemW / 2;
  const halfH = itemH / 2;

  const myCenterX = rawX + halfW;
  const myLeft = rawX;
  const myRight = rawX + itemW;

  const myCenterY = rawY + halfH;
  const myTop = rawY;
  const myBottom = rawY + itemH;

  // X ekseni kontrolü
  let minDiffX = threshold + 1;
  for (let i = 0; i < targetsX.length; i++) {
    const target = targetsX[i];

    const diffCenter = Math.abs(myCenterX - target);
    if (diffCenter <= threshold && diffCenter < minDiffX) {
      minDiffX = diffCenter;
      snappedX = target - halfW;
      guideX = target;
      hasSnapX = true;
    }

    const diffLeft = Math.abs(myLeft - target);
    if (diffLeft <= threshold && diffLeft < minDiffX) {
      minDiffX = diffLeft;
      snappedX = target;
      guideX = target;
      hasSnapX = true;
    }

    const diffRight = Math.abs(myRight - target);
    if (diffRight <= threshold && diffRight < minDiffX) {
      minDiffX = diffRight;
      snappedX = target - itemW;
      guideX = target;
      hasSnapX = true;
    }
  }

  // Y ekseni kontrolü
  let minDiffY = threshold + 1;
  for (let j = 0; j < targetsY.length; j++) {
    const target = targetsY[j];

    const diffCenter = Math.abs(myCenterY - target);
    if (diffCenter <= threshold && diffCenter < minDiffY) {
      minDiffY = diffCenter;
      snappedY = target - halfH;
      guideY = target;
      hasSnapY = true;
    }

    const diffTop = Math.abs(myTop - target);
    if (diffTop <= threshold && diffTop < minDiffY) {
      minDiffY = diffTop;
      snappedY = target;
      guideY = target;
      hasSnapY = true;
    }

    const diffBottom = Math.abs(myBottom - target);
    if (diffBottom <= threshold && diffBottom < minDiffY) {
      minDiffY = diffBottom;
      snappedY = target - itemH;
      guideY = target;
      hasSnapY = true;
    }
  }

  return { snappedX, snappedY, guideX, guideY, hasSnapX, hasSnapY };
}

console.log('--- Smart Snapping Mathematical Unit Tests ---');

// Test 1: No snap within threshold
{
  const res = calculateSnapping(100, 100, 50, 50, [200], [200], 6);
  assert.strictEqual(res.hasSnapX, false);
  assert.strictEqual(res.hasSnapY, false);
  assert.strictEqual(res.snappedX, 100);
  assert.strictEqual(res.snappedY, 100);
  console.log('✔ Test 1: No snap when distance exceeds threshold passed');
}

// Test 2: Center-to-center horizontal snap
{
  // Target center at 200. Item is width 50, so center is rawX + 25.
  // If rawX is 177 (center = 202, diff = 2 <= 6), should snap center to 200 => snappedX = 175
  const res = calculateSnapping(177, 100, 50, 50, [200], [500], 6);
  assert.strictEqual(res.hasSnapX, true);
  assert.strictEqual(res.snappedX, 175);
  assert.strictEqual(res.guideX, 200);
  console.log('✔ Test 2: Center-to-Center snap passed');
}

// Test 3: Left-to-edge vertical snap
{
  // Target line at 100. Item width 50. rawX = 103 (diff = 3 <= 6).
  // Left edge should snap to 100 => snappedX = 100
  const res = calculateSnapping(103, 100, 50, 50, [100], [500], 6);
  assert.strictEqual(res.hasSnapX, true);
  assert.strictEqual(res.snappedX, 100);
  assert.strictEqual(res.guideX, 100);
  console.log('✔ Test 3: Left-to-edge snap passed');
}

// Test 4: Right-to-edge horizontal snap
{
  // Target line at 150. Item width 50. rawX = 98 => right edge = 148 (diff = 2 <= 6).
  // Right edge should snap to 150 => snappedX = 100
  const res = calculateSnapping(98, 100, 50, 50, [150], [500], 6);
  assert.strictEqual(res.hasSnapX, true);
  assert.strictEqual(res.snappedX, 100);
  assert.strictEqual(res.guideX, 150);
  console.log('✔ Test 4: Right-to-edge snap passed');
}

// Test 5: Simultaneous X and Y snap (e.g. snapping to page center)
{
  // Page center: (200, 300). Item size: 60x40. Center is (rawX + 30, rawY + 20).
  // rawX = 168 (center = 198, diff = 2 <= 6) => snappedX = 170
  // rawY = 282 (center = 302, diff = 2 <= 6) => snappedY = 280
  const res = calculateSnapping(168, 282, 60, 40, [200], [300], 6);
  assert.strictEqual(res.hasSnapX, true);
  assert.strictEqual(res.hasSnapY, true);
  assert.strictEqual(res.snappedX, 170);
  assert.strictEqual(res.snappedY, 280);
  assert.strictEqual(res.guideX, 200);
  assert.strictEqual(res.guideY, 300);
  console.log('✔ Test 5: Simultaneous X & Y dual snap passed');
}

console.log('--- ALL SMART SNAPPING UNIT TESTS PASSED SUCCESSFULLY! ---');
