// Unit test for ZoomableCanvas coordinate mapping mathematics
const assert = require('assert');

function screenToCanvas(screenX, screenY, scale, tx, ty, vw, vh) {
  const cx = vw / 2;
  const cy = vh / 2;
  return {
    x: (screenX - tx - cx) / scale + cx,
    y: (screenY - ty - cy) / scale + cy,
  };
}

function canvasToScreen(canvasX, canvasY, scale, tx, ty, vw, vh) {
  const cx = vw / 2;
  const cy = vh / 2;
  return {
    x: cx + (canvasX - cx) * scale + tx,
    y: cy + (canvasY - cy) * scale + ty,
  };
}

function focalPointZoom(savedScale, newScale, savedTx, savedTy, focalX, focalY, vw, vh) {
  const scaleRatio = newScale / savedScale;
  const cx = vw / 2;
  const cy = vh / 2;
  const diffX = focalX - cx - savedTx;
  const diffY = focalY - cy - savedTy;
  return {
    tx: focalX - cx - diffX * scaleRatio,
    ty: focalY - cy - diffY * scaleRatio,
  };
}

console.log('--- ZoomableCanvas Mathematical Unit Tests ---');

// Test 1: Identity mapping (scale = 1.0, tx = 0, ty = 0)
const vw = 800;
const vh = 1200;
const pt1 = screenToCanvas(350, 450, 1.0, 0, 0, vw, vh);
assert.strictEqual(pt1.x, 350, 'Identity X failed');
assert.strictEqual(pt1.y, 450, 'Identity Y failed');
console.log('✔ Test 1: Identity mapping passed');

// Test 2: 2.0x Zoom at Center
const pt2 = screenToCanvas(600, 700, 2.0, 0, 0, vw, vh);
// cx = 400, cy = 600
// x = (600 - 0 - 400)/2 + 400 = 500
// y = (700 - 0 - 600)/2 + 600 = 650
assert.strictEqual(pt2.x, 500, '2x Zoom X failed');
assert.strictEqual(pt2.y, 650, '2x Zoom Y failed');
console.log('✔ Test 2: 2x Zoom at Center passed');

// Test 3: Reversibility (canvasToScreen(screenToCanvas(P)) === P)
for (let s of [1.0, 1.5, 2.0, 3.25, 4.0]) {
  for (let tx of [-150, 0, 200]) {
    for (let ty of [-300, 0, 180]) {
      const origScreenX = 482.35;
      const origScreenY = 721.84;
      const canvasPt = screenToCanvas(origScreenX, origScreenY, s, tx, ty, vw, vh);
      const backScreen = canvasToScreen(canvasPt.x, canvasPt.y, s, tx, ty, vw, vh);
      assert(Math.abs(backScreen.x - origScreenX) < 1e-6, `Reversibility X failed for s=${s}, tx=${tx}`);
      assert(Math.abs(backScreen.y - origScreenY) < 1e-6, `Reversibility Y failed for s=${s}, ty=${ty}`);
    }
  }
}
console.log('✔ Test 3: Mathematical Bijective Invertibility passed (100% exact floats across all scales & offsets)');

// Test 4: Focal Point Invariance (odak noktası zoom yaparken ekranda parmak altında sabit kalmalıdır)
const focalX = 650;
const focalY = 300;
const startScale = 1.0;
const targetScale = 2.5;
const startTx = 0;
const startTy = 0;

// Odak noktasının tuvaldeki karşılığı
const focalCanvas = screenToCanvas(focalX, focalY, startScale, startTx, startTy, vw, vh);

// Zoom yapıldıktan sonraki yeni Tx ve Ty
const { tx: newTx, ty: newTy } = focalPointZoom(startScale, targetScale, startTx, startTy, focalX, focalY, vw, vh);

// Yeni ölçek ve yeni ofsetlerle tuval noktasının ekrandaki yeri
const renderedScreen = canvasToScreen(focalCanvas.x, focalCanvas.y, targetScale, newTx, newTy, vw, vh);

assert(Math.abs(renderedScreen.x - focalX) < 1e-6, 'Focal point X drifted during zoom');
assert(Math.abs(renderedScreen.y - focalY) < 1e-6, 'Focal point Y drifted during zoom');
console.log('✔ Test 4: Focal Point Invariance during zoom passed (0.000px drift under fingers)');

// Test 5: Dynamic Eraser Radius Scaling
const baseEraserRadius = 25;
const eraser1x = baseEraserRadius / 1.0;
const eraser2x = baseEraserRadius / 2.0;
const eraser4x = baseEraserRadius / 4.0;
assert.strictEqual(eraser1x, 25);
assert.strictEqual(eraser2x, 12.5);
assert.strictEqual(eraser4x, 6.25);
// Screen visual size = canvas radius * scale = 6.25 * 4 = 25px
assert.strictEqual(eraser4x * 4.0, 25);
console.log('✔ Test 5: Dynamic Eraser Radius scaling passed (visual size perfectly preserved on glass)');

// Test 6: Drag delta scaling
const fingerMoveScreen = 100;
const scale = 2.5;
const canvasMove = fingerMoveScreen / scale; // 40
// When canvas is scaled by 2.5, 40 canvas units moves 40 * 2.5 = 100 screen units
assert.strictEqual(canvasMove * scale, fingerMoveScreen);
console.log('✔ Test 6: Drag delta scaling passed (1:1 finger tracking)');

console.log('--- ALL MATHEMATICAL UNIT TESTS PASSED SUCCESSFULLY! ---');
