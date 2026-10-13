/**
 * P0-a + P0-b: Çıkartma jestlerinin çizim pan'ine karşı yarışı kazanma niyeti.
 *
 * KÖK NEDEN (kaynaktan kanıtlandı):
 *   - DrawingCanvas.js: çizim pan'i `.activeOffsetX([-1, 1])` ile ±1 nokta'da aktifleşir.
 *   - RNGH Android PanGestureHandler.kt:72,135 — `activateAfterLongPress` kullanan bir pan,
 *     parmak `scaledTouchSlop` (~8dp) kadar kayarsa BAŞARISIZ olur ve zamanlayıcısını
 *     `removeCallbacksAndMessages` ile iptal eder.
 *   Yani çizim pan'i her zaman önce aktifleşip çıkartma jestlerini iptal ediyordu.
 *
 * DÜZELTME: `blocksExternalGesture(drawingGestureRef)` ile niyet BEYAN edilir; yarış artık
 * eşik büyüklüğüne göre çözülmez.
 *
 * BU TESTİN KAPSAMADIĞI (yalnızca cihazda ölçülebilir):
 *   - Native tarafta gerçek dokunuş çözümlemesi ve yarışın SONUCU
 *   - ~8dp `scaledTouchSlop` toleransının pratikte insan eliyle tutulabilirliği
 *   - 300 ms `activateAfterLongPress` zamanlayıcısının gerçekten ateşlenmesi
 *   - iOS davranışı (kanıt Android'in PanGestureHandler.kt'sinden; iOS doğrulanmadı)
 *   - `blocksExternalGesture`'ın gecikme maliyeti (seçili çıkartma üstünde ≤300 ms)
 * Bu test YALNIZCA yapılandırmanın ve referans taşımasının doğru kurulduğunu kanıtlar.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const stickerSrc = read('components/stickers/DraggableSticker.js');
const drawingSrc = read('components/drawing/DrawingCanvas.js');
const zoomSrc = read('components/drawing/ZoomableCanvas.js');

console.log('--- Cikartma/Cizim Jest Iliskisi Testleri (P0) ---');

/**
 * Zincirdeki her çağrıyı ve argümanlarını toplayan sahte jest kaydedici.
 * Proxy, bilinmeyen her metoda zinciri sürdüren bir fonksiyon döndürür.
 */
const createRecorder = () => {
  const calls = [];
  const makeProxy = () =>
    new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then' || typeof prop === 'symbol') return undefined;
          return (...args) => {
            calls.push({ name: String(prop), args });
            return makeProxy();
          };
        },
      }
    );
  return { proxy: makeProxy(), calls };
};

/** Nöbetçi referans: zincire BU NESNENİN geçtiğini kimlikle doğrulamak için. */
const DRAWING_REF_SENTINEL = { current: { handlerTag: 77 } };

/**
 * `DraggableSticker` kaynağından verilen bölümü çıkarıp GERÇEKTEN çalıştırır.
 * `startMarkers`: bölümün başlangıcı için denenecek işaretler, `endMarker`: bitiş.
 */
const recordChain = (startMarkers, endMarker, returnExpr, isDrawingMode) => {
  const startIdx = Math.min(
    ...startMarkers.map((m) => stickerSrc.indexOf(m)).filter((i) => i > -1)
  );
  assert.ok(
    startIdx > -1 && startIdx !== Infinity,
    'zincir baslangici bulunmali: ' + startMarkers.join(' / ')
  );
  const endIdx = stickerSrc.indexOf(endMarker, startIdx);
  assert.ok(endIdx > startIdx, 'zincir bitisi bulunmali: ' + endMarker);

  // Yorumlari at (sahte calistirmada gereksiz)
  const body = stickerSrc.slice(startIdx, endIdx).replace(/^[ \t]*\/\/.*$/gm, '');

  const rec = createRecorder();
  const shared = { value: 0 };
  const noop = () => {};
  const names = [
    'Gesture',
    'isDrawingMode',
    'drawingGestureRef',
    'STICKER_DRAG_LONG_PRESS_MS',
    'runOnJS',
    'dlog',
    'translateX',
    'translateY',
    'savedTranslateX',
    'savedTranslateY',
    'scale',
    'savedScale',
    'isActive',
    'isSnappedV',
    'isSnappedH',
    'isStickerDragging',
    'smartSnapping',
    'snapTargetsX',
    'snapTargetsY',
    'canvasScale',
    'canvasWidth',
    'canvasHeight',
    'onSnapChange',
    'onSelect',
    'onDeselect',
    'onMove',
    'onResize',
    'onDelete',
    'prepareSnapTargets',
    'triggerDragHaptic',
    'triggerHaptic',
    'sticker',
  ];
  const values = {
    Gesture: { Pan: () => rec.proxy, Tap: () => rec.proxy },
    isDrawingMode,
    drawingGestureRef: DRAWING_REF_SENTINEL,
    STICKER_DRAG_LONG_PRESS_MS: 300,
    runOnJS: () => noop,
    dlog: noop,
    smartSnapping: null,
    snapTargetsX: { value: [] },
    snapTargetsY: { value: [] },
    canvasWidth: 0,
    canvasHeight: 0,
    sticker: { id: 's1', x: 0, y: 0, scale: 1 },
  };

  // eslint-disable-next-line no-new-func
  const run = new Function(...names, body + '\nreturn ' + returnExpr + ';');
  run(
    ...names.map((n) =>
      Object.prototype.hasOwnProperty.call(values, n) ? values[n] : shared
    )
  );
  return rec.calls;
};

const bodyPan = (mode) =>
  recordChain(['  const panBase =', '  const panGesture ='], '  const tapGesture', 'panGesture', mode);

const resizePan = () =>
  recordChain(['  const resizePanGesture ='], '  const deleteTapGesture', 'resizePanGesture', false);

const blockCalls = (calls) => calls.filter((c) => c.name === 'blocksExternalGesture');

// --- Test 1: Govde pan, CIZIM MODU -> iliski kurulu --------------------
{
  const calls = bodyPan(true);
  const blocks = blockCalls(calls);
  assert.strictEqual(
    blocks.length,
    1,
    'cizim modunda govde pan blocksExternalGesture tam 1 kez cagirmali, bulundu: ' + blocks.length
  );
  assert.strictEqual(blocks[0].args.length, 1, 'tek argumanla cagirilmali');
  assert.strictEqual(
    blocks[0].args[0],
    DRAWING_REF_SENTINEL,
    'cizim jestinin REFERANSI gecirilmeli (nobetci nesnenin kendisi)'
  );
  // Uzun basis KALMALI (kullanici karari (i))
  assert.ok(
    calls.some((c) => c.name === 'activateAfterLongPress' && c.args[0] === 300),
    'activateAfterLongPress(300) korunmali'
  );
  console.log('OK Test 1: cizim modunda govde pan, cizim jestini blokluyor (+ 300 ms korundu)');
}

// --- Test 2: Govde pan, CIZIM MODU DISI -> iliski YOK -----------------
// a40ab0ca ile birebir ayniligi koruyan kisit (tests/stickerGestureConfig.test.js Test 2
// bunu zincirin TAMAMI icin dogruluyor; burada yalnizca yeni cagrinin sizmadigini dogruluyoruz).
{
  const blocks = blockCalls(bodyPan(false));
  assert.strictEqual(
    blocks.length,
    0,
    'cizim modu DISINDA govde pan blocksExternalGesture cagirmamali, bulundu: ' + blocks.length
  );
  console.log('OK Test 2: cizim modu disinda govde pan iliskisi YOK (a40ab0ca korunuyor)');
}

// --- Test 3: Kose tutamagi -> KOSULSUZ iliski -------------------------
{
  const blocks = blockCalls(resizePan());
  assert.strictEqual(
    blocks.length,
    1,
    'resizePanGesture blocksExternalGesture tam 1 kez cagirmali, bulundu: ' + blocks.length
  );
  assert.strictEqual(
    blocks[0].args[0],
    DRAWING_REF_SENTINEL,
    'kose tutamagi da ayni referansi kullanmali'
  );
  console.log('OK Test 3: kose tutamagi kosulsuz olarak cizim jestini blokluyor');
}

// --- Test 4: Referans ZINCIRI -- ucu birden kurulu olmali -------------
{
  assert.ok(
    /const drawingGestureRef = useRef\(/.test(zoomSrc),
    'ZoomableCanvas stabil bir drawingGestureRef olusturmali'
  );
  // Baglam degerine konulmus olmali
  const ctxIdx = zoomSrc.indexOf('const contextValue = {');
  assert.ok(ctxIdx > -1, 'contextValue bulunmali');
  const ctxBlock = zoomSrc.slice(ctxIdx, zoomSrc.indexOf('};', ctxIdx));
  assert.ok(
    /\bdrawingGestureRef\b/.test(ctxBlock),
    'drawingGestureRef contextValue ile tasinmali'
  );
  // Saglayici DISINDA guvenli olmali: varsayilan baglamda da bulunmali
  const defIdx = zoomSrc.indexOf('createContext({');
  const defBlock = zoomSrc.slice(defIdx, zoomSrc.indexOf('});', defIdx));
  assert.ok(
    /drawingGestureRef: \{ current: null \}/.test(defBlock),
    'varsayilan baglamda drawingGestureRef: { current: null } olmali (saglayici disinda cokmesin)'
  );
  // DrawingCanvas jesti referansa baglamali
  assert.ok(
    /\.withRef\(drawingGestureRef\)/.test(drawingSrc),
    'DrawingCanvas cizim pan jestini withRef(drawingGestureRef) ile baglamali'
  );
  // Ve referansi baglamdan almali
  const destrIdx = drawingSrc.indexOf('} = useZoomableCanvas();');
  const destrBlock = drawingSrc.slice(drawingSrc.lastIndexOf('const {', destrIdx), destrIdx);
  assert.ok(
    /\bdrawingGestureRef\b/.test(destrBlock),
    'DrawingCanvas drawingGestureRef i baglamdan almali'
  );
  console.log('OK Test 4: referans zinciri kurulu (ZoomableCanvas -> baglam -> DrawingCanvas)');
}

// --- Test 5: BAYATLAMA -- jest NESNESI degil REFERANS tasinmali -------
// RNGH convertToHandlerTag (GestureDetector/utils.js:29-39):
//   ref instanceof BaseGesture -> ref.handlerTag      (o anki nesneye kilitlenir)
//   aksi halde                 -> ref.current?.handlerTag ?? -1  (her cagride YENIDEN cozumlenir)
// initialize() (gesture.js:281-289) her eklemede handlerTag'i YENIDEN uretir ve
// config.ref.current = this yazar. Bu yuzden REFERANS tasinmak zorunda.
{
  const blocks = blockCalls(bodyPan(true)).concat(blockCalls(resizePan()));
  assert.ok(blocks.length >= 2, 'iki jest de iliski kurmali');
  for (const b of blocks) {
    const arg = b.args[0];
    assert.ok(
      arg && typeof arg === 'object' && 'current' in arg,
      'arguman bir React referansi olmali (current alani), jest nesnesi DEGIL'
    );
    assert.ok(
      typeof arg.handlerTag === 'undefined',
      'arguman dogrudan bir jest nesnesi OLMAMALI (handlerTag tasimamali), yoksa tag bayatlar'
    );
  }
  // Kaynakta jest nesnesinin dogrudan gecirilmedigini de dogrula
  assert.ok(
    !/blocksExternalGesture\(\s*drawingGesture\s*\)/.test(stickerSrc),
    'jest NESNESI (drawingGesture) dogrudan gecirilmemeli; referans (drawingGestureRef) gecmeli'
  );
  console.log('OK Test 5: referans tasiniyor, jest nesnesi degil (bayatlama yok)');
}

// --- Test 6: RNGH SOZLESMESI -- surum yukseltmesi sessizce bozmasin ---
// Duzeltmenin tamami bu iki davranisa dayaniyor. RNGH degisirse bu test atesler.
{
  const utils = read(
    'node_modules/react-native-gesture-handler/lib/commonjs/handlers/gestures/GestureDetector/utils.js'
  );
  assert.ok(
    /ref\.current\?\.handlerTag \?\? -1/.test(utils),
    'RNGH convertToHandlerTag hala ref.current.handlerTag i cozumlemeli (sozlesme degistiyse duzeltme gozden gecirilmeli)'
  );
  assert.ok(
    /blocksHandlers = extractValidHandlerTags\(gesture\.config\.blocksHandlers\)/.test(utils),
    'RNGH blocksHandlers i her iliski cikariminda YENIDEN cozumlemeli'
  );
  const gsrc = read(
    'node_modules/react-native-gesture-handler/lib/commonjs/handlers/gestures/gesture.js'
  );
  assert.ok(
    /this\.config\.ref\.current = this/.test(gsrc),
    'RNGH initialize() hala config.ref.current = this yazmali (referansin tazeligi buna bagli)'
  );
  console.log('OK Test 6: RNGH sozlesmesi (convertToHandlerTag + initialize) yerinde');
}

// --- Test 7: Cikartmaya ozel GECICI tani izleri TEMIZLENDI -------------
// Duzeltme cihazda dogrulandigi icin cikartma tanilari kaldirildi. Bu test artik
// tersini korur: geri sizmasinlar. Sorun B ve digerleri icin kullanilan
// perf:/scribble:/eraser: izleri KORUNUR, onlara dokunulmadi.
{
  ['sticker:', 'stickerCanvas:', 'drawing:blockedBySticker'].forEach((trace) => {
    assert.ok(
      !stickerSrc.includes(trace) && !drawingSrc.includes(trace),
      'cikartmaya ozel gecici tani izi geri sizmis: ' + trace
    );
  });
  assert.ok(!/\bdlog\b/.test(stickerSrc), 'DraggableSticker artik dlog kullanmamali');
  // Hala kapanmamis sorunlarin izleri DOKUNULMAMIS olmali
  ['perf:strokeEnd', 'scribble:gate', 'eraser:commit'].forEach((keep) => {
    assert.ok(drawingSrc.includes(keep), 'korunmasi gereken iz kaybolmus: ' + keep);
  });
  console.log('OK Test 7: cikartma tanilari temizlendi, perf/scribble/eraser izleri korundu');
}

console.log('--- TUM P0 ILISKI TESTLERI BASARIYLA GECTI! ---');
