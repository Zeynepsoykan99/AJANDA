/**
 * stickerGestureConfig.test.js
 *
 * Çıkartma etkileşimi (seçme / sürükleme / büyütme) `a40ab0ca`'da çalışıyordu.
 * Hedef: **çizim modu DIŞINDA** jest yapılandırmasının o sürümle BİREBİR aynı
 * kalması. Yeni davranış (uzun basışla taşıma) yalnızca çizim modunda olmalı.
 *
 * NEDEN BU TEST BÖYLE YAZILDI — dürüst sınır:
 * `react-native-gesture-handler`ın jest yardımcıları (`fireGestureHandler`,
 * `getByGestureTestId`) bu projede KULLANILAMIYOR: jest, @testing-library/react-native
 * ve `react-native-gesture-handler/jest-utils` kurulu değil (devDependencies
 * yalnızca babel-preset-expo; `npm test` script'i yok). Bu yüzden gerçek dokunuş
 * olayları tetiklenemiyor.
 *
 * Bunun yerine bir adım öteye gidiliyor: regex ile metin aramak yerine jest
 * zinciri GERÇEKTEN kuruluyor. `Gesture.Pan()` sahte bir KAYDEDİCİ ile
 * değiştirilip zincirdeki her çağrı ve argümanı toplanıyor; sonra aynı kayıt
 * `a40ab0ca`'daki kaynak için de üretilip karşılaştırılıyor.
 *
 * KAPSAMADIĞI: gerçek dokunma olaylarının native tarafta nasıl çözümlendiği
 * (jest yarışı, Exclusive önceliği, activateAfterLongPress zamanlayıcısı).
 * Bunlar yalnızca cihazda ölçülebilir; o yüzden tanı logları eklendi.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REL = 'components/stickers/DraggableSticker.js';
const GOOD_COMMIT = 'a40ab0ca';

const currentSource = fs.readFileSync(path.join(ROOT, REL), 'utf8');

/** Çalışan son sürümün kaynağını git'ten okur */
const readGoodSource = () => {
  try {
    return execFileSync('git', ['show', GOOD_COMMIT + ':' + REL], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (e) {
    return null;
  }
};

/**
 * Zincirdeki her çağrıyı ve argümanını toplayan sahte jest kaydedici.
 * Geri çağrı argümanları (fonksiyonlar) '[fn]' olarak normalize edilir;
 * amaç YAPILANDIRMAYI karşılaştırmak, gövdeleri değil.
 */
const createRecorder = () => {
  const calls = [];
  const makeProxy = () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === '__calls') return calls;
          if (typeof prop !== 'string') return undefined;
          return (...args) => {
            calls.push(
              prop +
                '(' +
                args
                  .map((a) =>
                    typeof a === 'function'
                      ? '[fn]'
                      : Array.isArray(a)
                      ? '[' + a.join(',') + ']'
                      : String(a)
                  )
                  .join(',') +
                ')'
            );
            return makeProxy();
          };
        },
      }
    );
  return { proxy: makeProxy(), calls };
};

/**
 * Kaynaktan pan jestinin kurulduğu bölümü çıkarıp verilen `isDrawingMode` ile
 * GERÇEKTEN çalıştırır; zincirdeki çağrı listesini döndürür.
 */
const recordPanChain = (source, isDrawingMode) => {
  // Zincir `const panGesture = ...` veya `const panBase = ...` ile baslar ve
  // `const tapGesture` oncesinde biter
  const startIdx = Math.min(
    ...['  const panBase =', '  const panGesture =']
      .map((m) => source.indexOf(m))
      .filter((i) => i > -1)
  );
  assert.ok(startIdx > -1 && startIdx !== Infinity, 'pan jest bolumu bulunmali');
  const endIdx = source.indexOf('  const tapGesture');
  assert.ok(endIdx > startIdx, 'tapGesture siniri bulunmali');

  let body = source.slice(startIdx, endIdx);

  // Yorumlari at (sahte calistirmada gereksiz)
  body = body.replace(/^[ \t]*\/\/.*$/gm, '');

  const rec = createRecorder();
  const sharedStub = { value: 0 };
  const noop = () => {};

  // eslint-disable-next-line no-new-func
  const run = new Function(
    'Gesture',
    'isDrawingMode',
    'STICKER_DRAG_LONG_PRESS_MS',
    'runOnJS',
    'dlog',
    'translateX',
    'translateY',
    'savedTranslateX',
    'savedTranslateY',
    'scale',
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
    'onDeselect',
    'onMove',
    'prepareSnapTargets',
    'triggerDragHaptic',
    'sticker',
    body + '\nreturn panGesture;'
  );

  run(
    { Pan: () => rec.proxy, Tap: () => rec.proxy },
    isDrawingMode,
    300,
    () => noop,
    noop,
    sharedStub,
    sharedStub,
    sharedStub,
    sharedStub,
    sharedStub,
    sharedStub,
    sharedStub,
    sharedStub,
    sharedStub,
    null,
    { value: [] },
    { value: [] },
    sharedStub,
    0,
    0,
    noop,
    noop,
    noop,
    noop,
    noop,
    { id: 's1', x: 0, y: 0, scale: 1 }
  );

  return rec.calls;
};

console.log('--- Cikartma Jest Yapilandirmasi Testleri ---');

const goodSource = readGoodSource();

// --- Test 1: Calisan surumun yapilandirmasi okunabiliyor --------------
{
  assert.ok(goodSource, GOOD_COMMIT + ' surumundeki kaynak git\'ten okunabilmeli');
  const goodCalls = recordPanChain(goodSource, false);
  assert.ok(goodCalls.length > 3, 'calisan surumun zinciri okunabilmeli');
  assert.ok(
    goodCalls.some((c) => c.startsWith('activeOffsetX([-5,5])')),
    'calisan surumde mesafe esigi +-5px olmali -> ' + goodCalls.join(' ')
  );
  assert.ok(
    !goodCalls.some((c) => c.startsWith('activateAfterLongPress')),
    'calisan surumde activateAfterLongPress YOKTU'
  );
  assert.ok(
    !goodCalls.some((c) => c.startsWith('onTouchesDown')),
    'calisan surumde onTouchesDown YOKTU'
  );
  console.log('OK Test 1: ' + GOOD_COMMIT + ' yapilandirmasi okundu (' + goodCalls.length + ' cagri)');
}

// --- Test 2: Cizim modu DISINDA yapilandirma BIREBIR AYNI ------------
{
  const goodCalls = recordPanChain(goodSource, false);
  const nowCalls = recordPanChain(currentSource, false);

  // Yalnizca YAPILANDIRMA cagrilarini karsilastir (geri cagri kayitlari degil)
  const configOnly = (calls) =>
    calls.filter(
      (c) =>
        !/^on(Start|Update|End|Finalize|TouchesDown|TouchesMove|TouchesUp|TouchesCancelled|Begin)\(/.test(
          c
        )
    );

  assert.deepStrictEqual(
    configOnly(nowCalls),
    configOnly(goodCalls),
    'CIZIM MODU DISINDA jest yapilandirmasi ' + GOOD_COMMIT + ' ile BIREBIR AYNI olmali.\n' +
      '  simdi : ' + configOnly(nowCalls).join(' ') + '\n' +
      '  calisan: ' + configOnly(goodCalls).join(' ')
  );

  // Geri cagri KUMESI de ayni olmali (fazladan onTouchesDown vb. eklenmemeli)
  const cbNames = (calls) =>
    calls.filter((c) => /^on/.test(c)).map((c) => c.slice(0, c.indexOf('('))).sort();
  assert.deepStrictEqual(
    cbNames(nowCalls),
    cbNames(goodCalls),
    'cizim modu disinda geri cagri kumesi de ayni olmali (needsPointerData acilmasin)'
  );
  console.log('OK Test 2: cizim modu DISINDA yapilandirma calisan surumle birebir ayni');
}

// --- Test 3: Cizim modunda uzun basis yapilandirmasi devrede ---------
{
  const drawCalls = recordPanChain(currentSource, true);
  assert.ok(
    drawCalls.some((c) => c === 'activateAfterLongPress(300)'),
    'cizim modunda uzun basis devrede olmali -> ' + drawCalls.join(' ')
  );
  assert.ok(
    drawCalls.some((c) => c === 'activeOffsetX([-9999,9999])'),
    'cizim modunda mesafe esigi pratikte devre disi olmali'
  );
  console.log('OK Test 3: cizim modunda uzun basis yapilandirmasi devrede');
}

// --- Test 4: activateAfterLongPress ASLA 0 ile cagrilmamali ----------
{
  // RNGH Android tarafi `activateAfterLongPress > 0` kontrolu yapiyor
  // (PanGestureHandler.kt:135,186), yani 0 etkisizdir; ama cagri yine de
  // yapilandirmaya anahtar ekler ve "cizim modu disinda hicbir sey degismesin"
  // sartini ihlal eder. Bu yuzden hic cagrilmamasi gerekir.
  const offCalls = recordPanChain(currentSource, false);
  assert.ok(
    !offCalls.some((c) => c.startsWith('activateAfterLongPress')),
    'cizim modu disinda activateAfterLongPress HIC cagrilmamali (0 ile bile)'
  );
  console.log('OK Test 4: cizim modu disinda activateAfterLongPress hic cagrilmiyor');
}

// --- Test 5: Buyutme/kucultme yalnizca secili iken render ediliyor ---
{
  // Buyutme ayri bir GestureDetector icinde ve `isSelected` kosuluna bagli.
  // Yani SECIM bozulursa buyutme de calismaz: iki belirti ayni zincire bagli.
  const resizeIdx = currentSource.indexOf('resizePanGesture');
  assert.ok(resizeIdx > -1, 'resizePanGesture bulunmali');

  const selectedBlocks = currentSource.match(/\{isSelected && \(/g) || [];
  assert.ok(
    selectedBlocks.length >= 2,
    'tutamaclar isSelected kosuluna bagli olmali (bulunan: ' + selectedBlocks.length + ')'
  );

  const detectorIdx = currentSource.indexOf('<GestureDetector gesture={resizePanGesture}>');
  assert.ok(detectorIdx > -1, 'buyutme tutamaci kendi GestureDetector icinde olmali');

  // O tutamacin bir isSelected blogunun ICINDE oldugunu dogrula
  const lastSelectedBefore = currentSource.lastIndexOf('{isSelected && (', detectorIdx);
  assert.ok(
    lastSelectedBefore > -1 && lastSelectedBefore < detectorIdx,
    'buyutme tutamaci isSelected blogunun icinde olmali -> SECIM bozulursa BUYUTME de bozulur'
  );
  console.log('OK Test 5: buyutme tutamaci secime bagli (iki belirti ayni zincirde)');
}

// --- Test 6: Pan zincirinde her geri cagri EN FAZLA bir kez ----------
{
  const calls = recordPanChain(currentSource, true);
  const counts = {};
  calls.forEach((c) => {
    const name = c.slice(0, c.indexOf('('));
    counts[name] = (counts[name] || 0) + 1;
  });
  Object.entries(counts).forEach(([name, n]) => {
    if (!/^on/.test(name)) return;
    assert.ok(
      n <= 1,
      name + ' ' + n + ' kez cagrilmis. RNGH\'de her geri cagri TEK SLOT: ikincisi ' +
        'birincinin uzerine yazar (gesture.js: this.handlers.onX = callback).'
    );
  });
  console.log('OK Test 6: pan zincirinde her geri cagri en fazla bir kez (gercek kayitla)');
}

console.log('--- TUM JEST YAPILANDIRMASI TESTLERI BASARIYLA GECTI! ---');
