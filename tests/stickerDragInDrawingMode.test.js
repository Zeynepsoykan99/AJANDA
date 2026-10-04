/**
 * stickerDragInDrawingMode.test.js
 *
 * SORUN 3: Kalem seçiliyken çıkartma sürüklenemiyordu.
 *
 * Kök neden jest yarışıydı: `DrawingCanvas` çizim modunda `pointerEvents: 'auto'`
 * alıp pan'ını ±1px'te aktifleştiriyor; `DraggableSticker` pan'ı ise ±5px
 * istiyordu. Çizim jesti yarışı HER ZAMAN kazanıyordu.
 *
 * Çözüm (kullanıcı kararı — Seçenek B): çizim modunda çıkartma UZUN BASIŞLA
 * sürüklenir. Böylece hem çıkartma taşınabilir hem çıkartmanın ÜZERİNE çizilebilir.
 *
 * Yöntem: eşikler ve jest yapılandırması kaynaktan okunur; yarışın eski hâlde
 * gerçekten kaybedildiği, yeni hâlde kazanıldığı simüle edilerek kanıtlanır.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

const CANVAS = read('components', 'drawing', 'DrawingCanvas.js');
const STICKER = read('components', 'stickers', 'DraggableSticker.js');
const STICKER_CANVAS = read('components', 'stickers', 'StickerCanvas.js');
const ZOOMABLE = read('components', 'drawing', 'ZoomableCanvas.js');

console.log('--- Cizim Modunda Cikartma Suruklemesi Testleri ---');

// ─── Kaynaktan okunan gerçek eşikler ────────────────────────────────
const drawingOffset = Number(/\.activeOffsetX\(\[-(\d+), \d+\]\)/.exec(CANVAS)[1]);
// Zincir artik builder duzeyinde KOSULLU kuruluyor (cizim modu disinda
// yapilandirma a40ab0ca ile birebir ayni kalsin diye). Esikler bu yuzden iki
// ayri daldan okunur. Yapilandirmanin TAMAMI ayrica
// tests/stickerGestureConfig.test.js icinde gercek zincir kurularak dogrulanir.
const panSection = /const panBase = isDrawingMode[\s\S]*?;\n/.exec(STICKER);
assert.ok(panSection, 'kosullu panBase bolumu bulunmali');
const drawingBranch = panSection[0].slice(0, panSection[0].indexOf('    : Gesture.Pan()'));
const normalBranch = panSection[0].slice(panSection[0].indexOf('    : Gesture.Pan()'));

const drawOffsetMatch = /\.activeOffsetX\(\[-(\d+), \d+\]\)/.exec(drawingBranch);
const normOffsetMatch = /\.activeOffsetX\(\[-(\d+), \d+\]\)/.exec(normalBranch);
assert.ok(drawOffsetMatch, 'cizim modu dalinda activeOffsetX olmali');
assert.ok(normOffsetMatch, 'normal dalda activeOffsetX olmali');
const stickerOffsetDrawing = Number(drawOffsetMatch[1]);
const stickerOffsetNormal = Number(normOffsetMatch[1]);

const longPressMatch = /const STICKER_DRAG_LONG_PRESS_MS = (\d+);/.exec(STICKER);
assert.ok(longPressMatch, 'uzun basis suresi tek bir sabitte olmali');
const longPressMs = Number(longPressMatch[1]);

console.log(
  '    olculer: cizim esigi ' + drawingOffset + 'px, cikartma normal ' + stickerOffsetNormal +
    'px, cizim modunda ' + stickerOffsetDrawing + 'px + ' + longPressMs + 'ms uzun basis'
);

// --- Test 1: ESKI hal yarisi gercekten kaybediyordu ------------------
{
  /**
   * Jest yarisi modeli: parmak hareket ettikce esigini ILK gecen jest aktiflesir.
   * Eski halde iki jestin de yalnizca mesafe esigi vardi.
   */
  const raceByDistance = (drawingPx, stickerPx) => {
    for (let moved = 0; moved <= 40; moved++) {
      if (moved >= drawingPx) return 'drawing';
      if (moved >= stickerPx) return 'sticker';
    }
    return 'none';
  };

  assert.strictEqual(
    raceByDistance(1, 5),
    'drawing',
    'ESKI hal: 1px esikli cizim, 5px esikli cikartmayi her zaman yenmeli (hatanin kaniti)'
  );
  // Esikler esit olsaydi bile cizim once gelirdi; sorun yapisal
  assert.strictEqual(raceByDistance(5, 5), 'drawing', 'esit esikte de cizim kazanir');
  console.log('OK Test 1: eski halde cizim jesti mesafe yarisini her zaman kazaniyordu');
}

// --- Test 2: YENI hal — cizim modunda mesafe yarisi devre disi -------
{
  assert.ok(
    stickerOffsetDrawing > 1000,
    'cizim modunda cikartmanin mesafe esigi pratikte devre disi olmali (su an ' +
      stickerOffsetDrawing + ')'
  );
  assert.strictEqual(
    stickerOffsetNormal,
    5,
    'cizim modu DISINDA eski 5px davranisi korunmali (gerileme olmasin)'
  );
  assert.ok(longPressMs >= 200 && longPressMs <= 600, 'uzun basis suresi makul olmali');
  // ASIL MEKANIZMA: uzun basisla aktiflesme jest zincirinde GERCEKTEN kurulu olmali.
  // Bu satir olmadan mesafe esigi devre disi kalir ama hicbir sey suruklemeyi
  // baslatmaz; yani cizim modunda cikartma TAMAMEN hareketsiz olur.
  // Uzun basis YALNIZCA cizim modu dalinda kurulmali; normal dalda hic
  // cagrilmamali (0 ile bile - yapilandirmaya anahtar ekler).
  assert.ok(
    /\.activateAfterLongPress\(STICKER_DRAG_LONG_PRESS_MS\)/.test(drawingBranch),
    'cizim modu dalinda activateAfterLongPress(SABIT) olmali'
  );
  assert.ok(
    !/activateAfterLongPress/.test(normalBranch),
    'normal dalda activateAfterLongPress HIC olmamali'
  );
  console.log(
    'OK Test 2: cizim modunda surukleme mesafeyle degil ' + longPressMs +
      'ms uzun basisla aktiflesiyor'
  );
}

// --- Test 3: Uzun basis yarisini kazaniyor ---------------------------
{
  /**
   * Yeni model: cizim mesafeyle, cikartma SUREYLE aktiflesir. Kullanici
   * parmagini oynatmadan beklerse cizim esigi hic gecilmez ve cikartma kazanir.
   */
  const raceWithLongPress = (movedPx, heldMs) => {
    if (movedPx >= drawingOffset && heldMs < longPressMs) return 'drawing';
    if (heldMs >= longPressMs) return 'sticker';
    return 'none';
  };

  assert.strictEqual(
    raceWithLongPress(0, longPressMs + 50),
    'sticker',
    'parmak sabit tutulursa cikartma kazanmali'
  );
  assert.strictEqual(
    raceWithLongPress(10, 50),
    'drawing',
    'beklemeden hareket edilirse CIZIM kazanmali (cikartma UZERINE cizilebilmeli)'
  );
  console.log('OK Test 3: beklersen surukleme, beklemezsen cizim — ikisi birlikte yasiyor');
}

// --- Test 4: Paylasilan bayrak uc yerde de kurulu --------------------
{
  // ZoomableCanvas: varsayilan baglam + paylasilan deger + baglam degeri
  assert.ok(
    /isStickerDragging: \{ value: false \},/.test(ZOOMABLE),
    'varsayilan baglamda isStickerDragging olmali'
  );
  assert.ok(
    /const isStickerDragging = useSharedValue\(false\);/.test(ZOOMABLE),
    'paylasilan deger olusturulmali'
  );
  assert.ok(
    /isDrawingActive,\s*\n\s*isStickerDragging,\s*\n\s*screenToCanvas,/.test(ZOOMABLE),
    'baglam degerine eklenmeli, yoksa tuketiciler undefined okur'
  );
  console.log('OK Test 4: isStickerDragging baglamda eksiksiz kurulu');
}

// --- Test 5: Bayrak set ediliyor VE TEK onFinalize ile birakiliyor ---
{
  assert.ok(
    /const \{ scale: canvasScale, isStickerDragging \} = useZoomableCanvas\(\);/.test(STICKER),
    'cikartma bayragi baglamdan almali'
  );

  const panChain = /const panGesture = panBase[\s\S]*?\n    \}\);/.exec(STICKER);
  assert.ok(panChain, 'pan jest zinciri bulunmali');
  const chain = panChain[0];

  assert.ok(/isStickerDragging\.value = true;/.test(chain), 'surukleme baslayinca bayrak kaldirilmali');

  // ASIL DEGISMEZ: react-native-gesture-handler'da her geri cagri TEK SLOT'tur
  // (gesture.js: `this.handlers.onFinalize = callback`). Ayni zincirde ikinci bir
  // .onFinalize() birincinin UZERINE YAZAR ve onun govdesi sessizce kaybolur.
  // Bu tam olarak cd7484c2'de yasandi: bayrak birakma ayri bir onFinalize olarak
  // eklenince snap kilavuzu/isActive/onDeselect temizligi yok oldu.
  // Yorum satirlarindaki ornek metinler (.onFinalize() gibi) sayima girmesin
  const chainNoComments = chain.replace(/^[ \t]*\/\/.*$/gm, '');
  const CALLBACKS = ['onBegin', 'onStart', 'onUpdate', 'onEnd', 'onFinalize', 'onTouchesDown'];
  CALLBACKS.forEach((cb) => {
    const count = (chainNoComments.match(new RegExp('\\.' + cb + '\\(', 'g')) || []).length;
    assert.ok(
      count <= 1,
      'pan zincirinde ' + cb + ' ' + count + ' kez cagrilmis. Her geri cagri TEK SLOT: ' +
        'ikincisi birincinin uzerine yazar ve o govde sessizce kaybolur. Tek govdede birlestir.'
    );
  });

  // Tek onFinalize govdesi HEM eski temizligi HEM bayrak birakmayi icermeli
  const finalize = /\.onFinalize\(\(\) => \{[\s\S]*?\n    \}\);/.exec(chain);
  assert.ok(finalize, 'onFinalize govdesi bulunmali');
  [
    ['isStickerDragging.value = false;', 'bayrak birakma'],
    ['isActive.value = false;', 'isActive sifirlama'],
    ['guideLineXVisible.value = 0;', 'snap kilavuzu temizligi'],
    ['runOnJS(onDeselect)();', 'secim kaldirma'],
  ].forEach(([needle, label]) => {
    assert.ok(
      finalize[0].includes(needle),
      'onFinalize govdesinde ' + label + ' olmali (uzerine yazilma sonucu kaybolmus olabilir)'
    );
  });
  console.log('OK Test 5: pan zincirinde TEK onFinalize var ve tum temizligi birlikte yapiyor');
}

// --- Test 6: Cizim jesti bayraga saygi duyuyor ----------------------
{
  assert.ok(
    /isStickerDragging,\s*\n\s*\} = useZoomableCanvas\(\);/.test(CANVAS),
    'DrawingCanvas bayragi baglamdan almali'
  );

  // onBegin'den donmek sonraki geri cagrilari engellemez: hepsinde koruma olmali
  // Govde degil KOSUL sayilir: koruma govdesine teshis logu gibi satirlar
  // eklenebilir; degismez olan kosulun varligidir.
  const guard = /if \(isStickerDragging && isStickerDragging\.value\)/g;
  const guardCount = (CANVAS.match(guard) || []).length;
  assert.ok(
    guardCount >= 4,
    'onBegin + onStart + onUpdate + dotTap korunmali (bulunan: ' + guardCount + ')'
  );

  // Asil degismez: koruma, dokunusu ISLEYEN cagriDAN ONCE gelmeli
  const guardedBefore = [
    ['handleTouchStart', 'runOnJS(handleTouchStart)'],
    ['handleTouchMove', 'runOnJS(handleTouchMove)'],
    ['handleDotTap', 'runOnJS(handleDotTap)'],
  ];
  guardedBefore.forEach(([label, call]) => {
    const callIdx = CANVAS.indexOf(call);
    assert.ok(callIdx > -1, call + ' bulunmali');
    const window = CANVAS.slice(Math.max(0, callIdx - 300), callIdx);
    assert.ok(
      /isStickerDragging && isStickerDragging\.value/.test(window),
      label + ' cagrisindan ONCE bayrak korumasi olmali'
    );
  });

  // onBegin: cizim bayragi kaldirilmadan once koruma olmali
  const beginIdx = CANVAS.indexOf('isDrawingActive.value = true;');
  assert.ok(beginIdx > -1, 'onBegin icindeki isDrawingActive atamasi bulunmali');
  assert.ok(
    /isStickerDragging && isStickerDragging\.value/.test(
      CANVAS.slice(Math.max(0, beginIdx - 400), beginIdx)
    ),
    'onBegin icinde koruma olmali'
  );

  console.log('OK Test 6: cizim jestinin ' + guardCount + ' geri cagrisi bayraga saygi duyuyor');
}

// --- Test 7: isDrawingMode cikartmaya kadar iletiliyor --------------
{
  const block = /<DraggableSticker\b[\s\S]*?\/>/.exec(STICKER_CANVAS);
  assert.ok(block, 'StickerCanvas DraggableSticker render etmeli');
  assert.ok(
    /isDrawingMode=\{isDrawingMode\}/.test(block[0]),
    'isDrawingMode cikartmaya gecirilmeli, yoksa uzun basis kurali hic devreye girmez'
  );
  assert.ok(
    /isDrawingMode = false,/.test(STICKER),
    'cikartmada prop varsayilani false olmali (cizim modu disinda eski davranis)'
  );
  console.log('OK Test 7: isDrawingMode StickerCanvas uzerinden cikartmaya iletiliyor');
}

// --- Test 8: stateRef uc-liste senkronizasyonu bozulmadi ------------
{
  // Bayrak paylasilan deger olarak worklet icinde okunuyor; stateRef'e
  // EKLENMEMELI, aksi halde uc liste birbirinden ayrilir (SORUN 1'in sinifi).
  const initMatch = /const stateRef = useRef\(\{([\s\S]*?)\n  \}\);/.exec(CANVAS);
  const effectMatch =
    /stateRef\.current = \{([\s\S]*?)\n    \};\s*\n  \}, \[([\s\S]*?)\n  \]\);/.exec(CANVAS);
  const parse = (t) => t.split(',').map((x) => x.trim()).filter(Boolean).sort();
  const a = parse(initMatch[1]);
  const b = parse(effectMatch[1]);
  const c = parse(effectMatch[2]);

  assert.deepStrictEqual(a, b, 'useRef ilk degeri ile efekt govdesi ayni kalmali');
  assert.deepStrictEqual(b, c, 'efekt govdesi ile bagimlilik dizisi ayni kalmali');
  assert.ok(
    !a.includes('isStickerDragging'),
    'bayrak stateRef e eklenmemeli (worklet icinde dogrudan okunuyor)'
  );
  console.log('OK Test 8: stateRef uc-liste senkronizasyonu bozulmadi (' + a.length + ' anahtar)');
}

// --- Test 9: Uzun basis aktiflesince dokunsal geri bildirim ---------
{
  // Projedeki desen: try/catch sarmali kucuk bir yardimci
  assert.ok(
    /const triggerDragHaptic = \(\) => \{\s*\n\s*try \{\s*\n\s*Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Medium\);\s*\n\s*\} catch \(e\) \{\}\s*\n\};/.test(
      STICKER
    ),
    'triggerDragHaptic projedeki try/catch desenine uymali ve Medium kullanmali'
  );

  // Secimdeki Light'tan AYRI olmali: aksi halde "aldim" hissi secimle karisir
  assert.ok(
    /Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Light\);/.test(STICKER),
    'secim icin kullanilan Light yardimcisi korunmali'
  );

  // Pan zincirinde, YALNIZCA uzun basis yolunda (cizim modunda) tetiklenmeli
  const panChain = /const panGesture = panBase[\s\S]*?\n    \}\);/.exec(STICKER);
  assert.ok(panChain, 'pan jest zinciri bulunmali');
  assert.ok(
    /if \(isDrawingMode\) \{\s*\n\s*runOnJS\(triggerDragHaptic\)\(\);\s*\n\s*\}/.test(panChain[0]),
    'geri bildirim yalnizca cizim modunda (uzun basis yolunda) tetiklenmeli'
  );

  // Worklet icinden JS'e gecis: runOnJS olmadan calismaz
  const hapticIdx = panChain[0].indexOf('triggerDragHaptic');
  assert.ok(
    panChain[0].slice(Math.max(0, hapticIdx - 40), hapticIdx).includes('runOnJS'),
    'worklet icinden runOnJS ile cagrilmali'
  );

  // Bayrak kaldirildiktan SONRA gelmeli (surukleme gercekten devraldiginda)
  const flagIdx = panChain[0].indexOf('isStickerDragging.value = true;');
  assert.ok(flagIdx > -1 && flagIdx < hapticIdx, 'geri bildirim bayrak kaldirildiktan sonra olmali');
  console.log('OK Test 9: uzun basis aktiflesince Medium dokunsal geri bildirim veriliyor');
}

console.log('--- TUM CIKARTMA SURUKLEME TESTLERI BASARIYLA GECTI! ---');
