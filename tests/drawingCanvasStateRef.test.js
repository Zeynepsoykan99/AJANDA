/**
 * drawingCanvasStateRef.test.js
 *
 * DrawingCanvas'taki `stateRef` köprüsünün BÜTÜNLÜĞÜ.
 *
 * Neden bu test var:
 * Karalayarak silme 20 birim testini geçtiği hâlde cihazda hiç çalışmadı. Saf
 * tespit mantığı doğruydu; kopukluk ENTEGRASYONDAYDI. `stateRef` üç yerde
 * listelenir:
 *   1. `useRef({...})` ilk değeri
 *   2. Her render'da yeniden kuran efektin GÖVDESİ
 *   3. O efektin BAĞIMLILIK dizisi
 * Yeni bir prop 1 ve 3'e eklenip 2'ye eklenmeyince, efekt ilk render'dan sonra
 * `stateRef.current`'ı o alan OLMADAN yeniden kurdu. `state.scribbleEraseEnabled`
 * `undefined` oldu, koşul hiç sağlanmadı ve özellik sessizce öldü.
 *
 * Bu test o sınıfın tamamını kapatır: üç listenin AYNI olmasını şart koşar.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANVAS = path.join(ROOT, 'components', 'drawing', 'DrawingCanvas.js');
const source = fs.readFileSync(CANVAS, 'utf8');

/** Virgülle ayrılmış kısa-yazım listesini anahtar dizisine çevirir */
const parseKeys = (text) =>
  text
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .sort();

console.log('--- DrawingCanvas stateRef Koprusu Testleri ---');

// --- Test 1: Uc liste de okunabiliyor -------------------------------
const initMatch = /const stateRef = useRef\(\{([\s\S]*?)\n  \}\);/.exec(source);
assert.ok(initMatch, 'stateRef useRef ilk degeri bulunmali');

const effectMatch =
  /stateRef\.current = \{([\s\S]*?)\n    \};\s*\n  \}, \[([\s\S]*?)\n  \]\);/.exec(source);
assert.ok(effectMatch, 'stateRef guncelleme efekti (govde + bagimlilik) bulunmali');

const initKeys = parseKeys(initMatch[1]);
const bodyKeys = parseKeys(effectMatch[1]);
const depKeys = parseKeys(effectMatch[2]);

assert.ok(initKeys.length >= 15, 'ilk deger listesi beklenenden kisa: ' + initKeys.length);
console.log(
  'OK Test 1: uc liste okundu (ilk deger ' + initKeys.length + ', govde ' + bodyKeys.length +
    ', bagimlilik ' + depKeys.length + ')'
);

// --- Test 2: ESKI hatanin gercekten sessiz oldugu kanitlanir --------
{
  // Hatali hali birebik taklit: govdede olmayan bir alan okunuyor
  const brokenState = { tool: 'pen', drawings: [], textBlocks: [] }; // scribbleEraseEnabled YOK
  let blockRan = false;
  if (brokenState.scribbleEraseEnabled && brokenState.tool === 'pen') {
    blockRan = true;
  }
  assert.strictEqual(
    blockRan,
    false,
    'ESKI hal: govdede eksik alan undefined olur ve kosul HIC saglanmaz (hatanin kaniti)'
  );

  // Ayrica: hicbir hata firlatilmaz, bu yuzden testler gecmeye devam ederdi
  assert.doesNotThrow(() => {
    const _ = brokenState.scribbleEraseEnabled && brokenState.tool === 'pen';
  }, 'eksik alan sessizdir: bu yuzden birim testleri yakalayamadi');
  console.log('OK Test 2: eksik alanin SESSIZCE ozelligi oldurdugu kanitlandi');
}

// --- Test 3: Govde ile ilk deger AYNI anahtarlari tasimali ----------
{
  const missingFromBody = initKeys.filter((k) => !bodyKeys.includes(k));
  const extraInBody = bodyKeys.filter((k) => !initKeys.includes(k));
  assert.deepStrictEqual(
    missingFromBody,
    [],
    'EFEKT GOVDESINDE eksik anahtar(lar): ' + missingFromBody.join(', ') +
      ' -> bu alanlar ilk render sonrasi undefined olur ve ilgili ozellik SESSIZCE oluf'
  );
  assert.deepStrictEqual(extraInBody, [], 'govdede fazla anahtar: ' + extraInBody.join(', '));
  console.log('OK Test 3: efekt govdesi ile useRef ilk degeri ayni anahtarlari tasiyor');
}

// --- Test 4: Bagimlilik dizisi de AYNI olmali -----------------------
{
  const missingFromDeps = bodyKeys.filter((k) => !depKeys.includes(k));
  const extraInDeps = depKeys.filter((k) => !bodyKeys.includes(k));
  assert.deepStrictEqual(
    missingFromDeps,
    [],
    'BAGIMLILIK dizisinde eksik: ' + missingFromDeps.join(', ') +
      ' -> bu prop degisince stateRef guncellenmez, eski deger kullanilir'
  );
  assert.deepStrictEqual(
    extraInDeps,
    [],
    'bagimlilikta olup govdede OLMAYAN: ' + extraInDeps.join(', ') +
      ' -> tam olarak karalayarak silmeyi olduren hata budur'
  );
  console.log('OK Test 4: bagimlilik dizisi govde ile birebir ayni');
}

// --- Test 5: Karalama icin gereken ucu de mevcut --------------------
{
  ['stickers', 'scribbleEraseEnabled', 'onScribbleErase'].forEach((key) => {
    assert.ok(initKeys.includes(key), 'useRef ilk degerinde ' + key + ' olmali');
    assert.ok(bodyKeys.includes(key), 'EFEKT GOVDESINDE ' + key + ' olmali');
    assert.ok(depKeys.includes(key), 'bagimlilik dizisinde ' + key + ' olmali');
  });
  console.log('OK Test 5: karalayarak silmenin ihtiyac duydugu uc alan her uc listede');
}

// --- Test 6: handleTouchEnd gercekten karalamayi degerlendiriyor ----
{
  const handler = /const handleTouchEnd = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\);/.exec(
    source
  );
  assert.ok(handler, 'handleTouchEnd bulunmali');
  const body = handler[0];

  // Siralama: eraser -> lasso -> KARALAMA -> normal cizgi islenmesi
  const eraserIdx = body.indexOf("state.tool === 'eraser'");
  const lassoIdx = body.indexOf("state.tool === 'lasso'");
  const scribbleIdx = body.indexOf('evaluateScribbleErase({');
  const commitIdx = body.indexOf('state.onDrawingsChange([...state.drawings, newStroke])');

  assert.ok(eraserIdx > -1 && lassoIdx > -1, 'silgi ve kement dallari durmali');
  assert.ok(scribbleIdx > -1, 'karalama degerlendirmesi handleTouchEnd icinde olmali');
  assert.ok(commitIdx > -1, 'normal cizgi islenmesi durmali');
  assert.ok(
    lassoIdx < scribbleIdx && scribbleIdx < commitIdx,
    'karalama, kementten SONRA ve cizgi eklenmeden ONCE degerlendirilmeli'
  );

  // Kosul tam olarak uc seyi aramali
  assert.ok(
    /state\.scribbleEraseEnabled &&\s*\n\s*state\.tool === 'pen' &&\s*\n\s*state\.onScribbleErase &&/.test(
      body
    ),
    'kosul scribbleEraseEnabled + pen + onScribbleErase uclusunu aramali'
  );
  console.log('OK Test 6: handleTouchEnd karalamayi dogru sirada ve dogru kosulla degerlendiriyor');
}

// --- Test 7: Varsayilanlar ozelligi kapatmamali ---------------------
{
  // Prop varsayilani
  assert.ok(
    /scribbleEraseEnabled = true,/.test(source),
    'DrawingCanvas prop varsayilani true olmali, yoksa prop verilmeyen ekranda ozellik kapali olur'
  );

  // Servis varsayilani
  const prefs = fs.readFileSync(
    path.join(ROOT, 'services', 'drawingPreferencesService.js'),
    'utf8'
  );
  assert.ok(/SCRIBBLE_ERASE_DEFAULT = true/.test(prefs), 'servis varsayilani true olmali');
  assert.ok(
    /export const isScribbleEraseEnabled = \(\) => cache\.scribbleErase;/.test(prefs),
    'senkron okuyucu onbellegi okumali'
  );
  console.log('OK Test 7: hem prop hem servis varsayilani ozelligi acik birakiyor');
}

// --- Test 8: Ekranlar gercekten prop geciyor ------------------------
{
  const screens = [
    ['ajandam', path.join(ROOT, 'app', 'ajandam', '[pageId].js')],
    ['todolist', path.join(ROOT, 'app', 'todolist', '[pageId].js')],
    ['notebook', path.join(ROOT, 'components', 'notebook', 'NotebookPagesView.js')],
  ];
  screens.forEach(([label, file]) => {
    const src = fs.readFileSync(file, 'utf8');
    // Prop'lar DrawingCanvas blogunun ICINDE olmali
    const canvasBlock = /<DrawingCanvas[\s\S]*?\/>/.exec(src);
    assert.ok(canvasBlock, label + ': DrawingCanvas kullanimi bulunmali');
    ['stickers=', 'scribbleEraseEnabled=', 'onScribbleErase='].forEach((prop) => {
      assert.ok(
        canvasBlock[0].includes(prop),
        label + ': ' + prop + ' DrawingCanvas blogunun icinde olmali'
      );
    });
  });
  console.log('OK Test 8: uc ekran da gerekli prop\'lari DrawingCanvas\'a geciyor');
}

console.log('--- TUM stateRef KOPRUSU TESTLERI BASARIYLA GECTI! ---');
