/**
 * SORUN B ölçüm altyapısı. GEÇİCİ tanı kodunu korur: ölçüm doğru olmazsa
 * yanlış karar veririz (örn. gereksiz bir mimari değişiklik).
 *
 * BU TESTİN KAPSAMADIĞI:
 *   - Gerçek cihaz kare süresi, dokunmatik gecikmesi, Hermes davranışı
 *   - İki çalışma zamanı (UI worklet / JS) arasındaki saat tabanı eşitliği —
 *     bu ancak cihazda `dispatchCtrlMs` ve `perf:idleBaseline` ile denetlenir
 *   - Geliştirme derlemesi ile preview derlemesi arasındaki fark
 *   - 2. TUR: `rcAvgMs` yalnızca React render + commit'in JS'ten görünen
 *     kısmını ölçer; UI thread'deki mount/diff ve yerel SVG çizimi KAPSAM DIŞI.
 *   - `underlayViews` ölçülen kağıt yüzeyinden değil SAYFA ölçüsünden türetilir,
 *     yani bir ÜST SINIR tahminidir.
 *   - Render sayaçları KÜRESELDİR: aynı adda kaç örnek olduğunu ayırmaz.
 * Bu test YALNIZCA ölçüm kodunun yapısını ve aritmetiğini doğrular.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const LOG = read('utils/diagnosticLog.js');
const CANVAS = read('components/drawing/DrawingCanvas.js');

/**
 * Ölçüm kovası yardımcılarını GERÇEK kaynaktan yükler.
 * Tek tek dilimlemek yerine modülün tamamı CJS'e çevrilir: tek satırlık ok
 * fonksiyonları ile blok gövdeli olanları ayırt etmeye çalışmak kırılgandı.
 */
const loadBuckets = () => {
  const src = LOG.replace(/^import .*$/gm, '')
    .replace(/export default [^;]*;/g, '')
    .replace(/export const /g, 'const ');
  // eslint-disable-next-line no-new-func
  return new Function(
    src + '\nreturn { createTimingBucket, resetTiming, addTiming, summarizeTiming };'
  )();
};

const { createTimingBucket, resetTiming, addTiming, summarizeTiming } = loadBuckets();

console.log('--- SORUN B Olcum Altyapisi Testleri ---');

// --- Test 0: summarizeTiming kovayi KENDISI sifirliyor ----------------
// Bunu belgelemek onemli: `resetTiming` eklenirken "kovalar hic sifirlanmiyor"
// sanilmisti; aslinda summarizeTiming cagrisi sonunda kovayi sifirliyor. Yani
// perf:strokeEnd degerleri HER ZAMAN cizgi basinaydi, birikmis degildi.
{
  const b = createTimingBucket();
  addTiming(b, 10);
  addTiming(b, 30);
  const first = summarizeTiming(b);
  assert.strictEqual(first.n, 2, 'iki ornek sayilmali');
  assert.strictEqual(Number(first.max), 30, 'maksimum 30 olmali');

  const second = summarizeTiming(b);
  assert.strictEqual(second.n, 0, 'summarizeTiming kendisi sifirlamali');
  assert.strictEqual(Number(second.max), 0, 'ikinci ozet bos olmali');
  console.log('OK Test 0: summarizeTiming ozet alirken kovayi KENDISI sifirliyor');
}

// --- Test 1: resetTiming -- ozet ALINMAYAN yolda gerekli --------------
// `resetTiming`in gercek isi burada: cizgi IPTAL edilirse (handleTouchCancel)
// perf:strokeEnd yazilmaz, yani summarizeTiming cagrilmaz ve kova DOLU kalir.
// Bir sonraki cizgi iptal edilenin olculerini devralirdi.
{
  const b = createTimingBucket();
  addTiming(b, 30);
  addTiming(b, 50);
  // ARADA ozet YOK -- iptal edilen cizgi senaryosu
  resetTiming(b);
  addTiming(b, 4);
  const s = summarizeTiming(b);
  assert.strictEqual(s.n, 1, 'sifirlama sonrasi tek ornek olmali');
  assert.strictEqual(Number(s.max), 4, 'iptal edilen cizginin maksimumu (50) sizmamali');
  assert.strictEqual(Number(s.total), 4, 'iptal edilen cizginin toplami sizmamali');
  console.log('OK Test 1: resetTiming iptal edilen cizginin olculerini temizliyor');
}

// --- Test 2: resetTiming yoklugunda guvenli --------------------------
{
  assert.doesNotThrow(() => resetTiming(null), 'null kova cokmemeli');
  assert.doesNotThrow(() => resetTiming(undefined), 'undefined kova cokmemeli');
  console.log('OK Test 2: resetTiming null/undefined ile cokmuyor');
}

// --- Test 3: HER cizgi basinda TUM kovalar sifirlaniyor ---------------
// Bir kova atlanirsa o alan birikmis deger yazar.
{
  const a = CANVAS.indexOf('  const handleTouchStart = useCallback(');
  const b = CANVAS.indexOf('  const handleTouchMove = useCallback(', a);
  assert.ok(a > -1 && b > a, 'handleTouchStart sinirlari bulunmali');
  const body = CANVAS.slice(a, b);

  [
    'moveTimingRef',
    'pathTimingRef',
    'eventLagRef',
    'frameGapRef',
    'flushDelayRef',
    // 2. TUR: render+commit kovasi da ayni kurala tabi
    'renderCommitRef',
  ].forEach((ref) => {
    assert.ok(
      new RegExp('resetTiming\\(' + ref + '\\.current\\)').test(body),
      'cizgi basinda sifirlanmayan kova: ' + ref
    );
  });
  // Render sayac kopyasi da cizgi basinda ALINMALI; alinmazsa `rDraw` vb.
  // uygulama acilisindan beri birikmis toplam olur.
  assert.ok(
    /renderSnapshotRef\.current = snapshotRenders\(\);/.test(body),
    'cizgi basinda render sayac kopyasi alinmali'
  );
  // Bekleyen commit saati de sifirlanmali; yoksa onceki cizgiden kalan
  // damga bu cizginin ilk olcumune devasa bir sure yazar.
  assert.ok(
    /commitStartRef\.current = 0;/.test(body),
    'cizgi basinda bekleyen commit saati sifirlanmali'
  );
  console.log('OK Test 3: alti olcum kovasi + render kopyasi cizgi basinda sifirlaniyor');
}

// --- Test 4: Ozet satirinda gerekli alanlar var ----------------------
// Eksik alan = cihaz turunu bosa harcamak.
{
  const i = CANVAS.indexOf("dlog('perf:strokeEnd'");
  assert.ok(i > -1, 'perf:strokeEnd bulunmali');
  const block = CANVAS.slice(i, CANVAS.indexOf('});', i));
  [
    'lagAvgMs', 'lagMaxMs',          // UI -> JS gecikmesi
    'frameAvgMs', 'frameMaxMs', 'frameN', 'longFrames',
    'strokeDurationMs',              // olay HIZI icin
    'flushAvgMs', 'flushMaxMs',      // kare birlestirmenin ekledigi gecikme
    'dispatchCtrlMs',                // saat tabani KONTROLU
    'rendersThisStroke',
    'points',
  ].forEach((f) => {
    assert.ok(block.includes(f + ':'), 'ozet satirinda eksik alan: ' + f);
  });
  console.log('OK Test 4: ozet satirinda 12 tani alani eksiksiz');
}

// --- Test 5: Bosta taban cizgisi olcumu var ve BAGIMSIZ --------------
// Onemi: yalnizca JS tarafindaki rAF saatini kullanir, iki calisma zamani
// arasinda saat tabani karsilastirmasi YAPMAZ. Bu yuzden lag olcumunun
// gecerliligini bagimsiz dogrular.
{
  const i = CANVAS.indexOf("dlog('perf:idleBaseline'");
  assert.ok(i > -1, 'perf:idleBaseline olcumu bulunmali');
  const block = CANVAS.slice(i, CANVAS.indexOf('});', i));
  // Hem `ad:` hem kisayol (`ad,`) yazimi kabul edilir; onemli olan alanin
  // ozet satirinda bulunmasi, nasil yazildigi degil.
  ['frameN', 'frameAvgMs', 'frameMaxMs', 'longFrames', 'durationMs', 'abortedByStroke'].forEach(
    (f) => {
      assert.ok(
        new RegExp('\\b' + f + '\\s*[:,]').test(block),
        'idleBaseline alani eksik: ' + f
      );
    }
  );
  // Date.now() ile karsilastirma YAPMAMALI (bagimsizligin sarti)
  const effStart = CANVAS.lastIndexOf('useEffect(() => {', i);
  const effBody = CANVAS.slice(effStart, i);
  assert.ok(
    !/Date\.now\(\)/.test(effBody),
    'idleBaseline olcumu Date.now() kullanmamali; yalnizca JS rAF saati (bagimsizlik)'
  );
  // Cizim baslayinca olcum bitmeli: iki rAF dongusu birbirini etkilemesin
  assert.ok(
    /strokeActiveRef\.current/.test(effBody),
    'cizim baslayinca bosta olcumu durmali (iki rAF dongusu cakismasin)'
  );
  console.log('OK Test 5: idleBaseline var, saat tabanindan bagimsiz, cizimde duruyor');
}

// --- Test 6: SICAK YOLA LOG YAZILMIYOR --------------------------------
// Her harekette Metro'ya log gitmesi yavasligi KENDI yaratir.
{
  const a = CANVAS.indexOf('  const handleTouchMove = useCallback(');
  const b = CANVAS.indexOf('  const handleTouchEnd = useCallback(', a);
  const body = CANVAS.slice(a, b).replace(/^[ \t]*\/\/.*$/gm, '');
  assert.ok(
    !/\bdlog\(/.test(body) && !/console\.(log|warn)\(/.test(body),
    'handleTouchMove (sicak yol) log YAZMAMALI; yalnizca kovaya biriktirmeli'
  );
  assert.ok(/addTiming\(/.test(body), 'sicak yol olculeri kovaya biriktirmeli');
  console.log('OK Test 6: sicak yolda log yok, yalnizca kovaya biriktirme');
}

// --- Test 7: eas.json preview profili dogru kurulmus -----------------
{
  const eas = JSON.parse(read('eas.json'));
  const p = eas.build.preview;
  assert.ok(p, 'preview profili bulunmali');
  assert.ok(
    p.developmentClient === undefined,
    'preview profilinde developmentClient OLMAMALI (__DEV__ kapali, Metro yok)'
  );
  assert.strictEqual(p.distribution, 'internal', 'internal dagitim olmali');
  assert.strictEqual(p.android.buildType, 'apk', 'Android APK olmali');
  // expo-updates kurulu DEGILSE channel gereksizdir
  const pkg = JSON.parse(read('package.json'));
  if (!pkg.dependencies['expo-updates']) {
    assert.ok(
      p.channel === undefined,
      'expo-updates kurulu degilken channel alani gereksiz, eklenmemeli'
    );
  }
  // Gelistirme profili BOZULMAMIS olmali
  assert.strictEqual(
    eas.build.development.developmentClient,
    true,
    'development profili dokunulmamali'
  );
  console.log('OK Test 7: preview profili dogru (developmentClient yok, channel yok)');
}

// --- Test 8: Tanilar preview'da da gorunur (env degiskeni gerekmez) ---
// dlog __DEV__'e bagli OLMAMALI, yoksa preview'da hic satir cikmaz.
{
  assert.ok(
    /export const DIAGNOSTICS_ENABLED = true;/.test(LOG),
    'DIAGNOSTICS_ENABLED tek anahtar olmali'
  );
  const i = LOG.indexOf('export const dlog =');
  const body = LOG.slice(i, LOG.indexOf('\n};', i));
  assert.ok(
    !/__DEV__/.test(body),
    'dlog __DEV__ e bagli OLMAMALI (preview derlemesinde de satir cikmali)'
  );
  console.log('OK Test 8: dlog __DEV__ e bagli degil, preview APK da log yazar');
}


// ====================================================================
// SORUN B / 2. TUR: ekran-derleme etiketi, tuval olcusu, render sayaclari
// ====================================================================

const NOTEBOOK = read('components/notebook/NotebookPagesView.js');
const AJANDAM = read('app/ajandam/[pageId].js');
const TODO = read('app/todolist/[pageId].js');
const TEXTC = read('components/text/TextCanvas.js');
const STICKERC = read('components/stickers/StickerCanvas.js');
const PAPER = read('components/stationery/PaperSheet.js');
const RULINGS = read('constants/paperRulings.js');

/** Render sayaclarini GERCEK kaynaktan yukler (kovalarla ayni yontem). */
const loadCounters = () => {
  const src = LOG.replace(/^import .*$/gm, '')
    .replace(/export default [^;]*;/g, '')
    .replace(/export const /g, 'const ');
  // eslint-disable-next-line no-new-func
  return new Function(
    'var __DEV__ = false;\n' +
      src +
      '\nreturn { bumpRender, snapshotRenders, diffRenders, RENDER_COUNTER_KEYS, BUILD_KIND };'
  )();
};

/**
 * `countRulingElements`i GERCEK kaynaktan yukler.
 * PaperSheet bir React bileseni (JSX) icerdigi icin tum modul eval edilemez;
 * yalnizca saf aritmetik ust kisim alinir ve yerel bagimliliklari (StyleSheet,
 * PixelRatio) stub'lanir. PAPER_RULING_CONFIG ise GERCEK dosyadan okunur,
 * boylece pitch degerleri degisirse test de degisir.
 */
const loadRulingCounter = () => {
  const cfgSrc = RULINGS.replace(/export const /g, 'const ').replace(
    /export function /g,
    'function '
  );
  // Bileşenin JSDoc'undan ÖNCE kesilir; ortadan kesmek dangling `/**` bırakır.
  const compIdx = PAPER.indexOf('export default function PaperSheet');
  assert.ok(compIdx > -1, 'PaperSheet bileseni bulunmali');
  const end = PAPER.lastIndexOf('/**', compIdx);
  assert.ok(end > -1, 'bilesen JSDoc baslangici bulunmali');
  const head = PAPER.slice(0, end)
    .replace(/^import .*$/gm, '')
    .replace(/export function /g, 'function ');
  const stubs =
    'const StyleSheet = { hairlineWidth: 0.5 };\n' +
    'const PixelRatio = { roundToNearestPixel: function (n) { return Math.round(n); } };\n';
  // eslint-disable-next-line no-new-func
  return new Function(
    cfgSrc + '\n' + stubs + head + '\nreturn { countRulingElements, getRulingCounts };'
  )();
};

// --- Test 9: render sayaclari dogru sayiyor ve FARK aliniyor -----------
// Onemi: fark yerine mutlak deger yazilsa her cizgide artan bir sayi gorurduk
// ve "bu cizgide" kac render oldugunu asla bilemezdik.
{
  const { bumpRender, snapshotRenders, diffRenders, RENDER_COUNTER_KEYS } = loadCounters();
  assert.deepStrictEqual(
    RENDER_COUNTER_KEYS.slice().sort(),
    [
      'drawingCanvas',
      'listScreen',
      'paperSheet',
      'ruling',
      'screen',
      'staticLayer',
      'stickerCanvas',
      'textCanvas',
      'thumbnail',
    ],
    'dokuz sayac adi tanimli olmali (perf:pageAdd/postStroke icin dort yeni)'
  );

  bumpRender('drawingCanvas');
  bumpRender('screen');
  const before = snapshotRenders();

  bumpRender('drawingCanvas');
  bumpRender('drawingCanvas');
  bumpRender('staticLayer');

  const d = diffRenders(before);
  assert.strictEqual(d.drawingCanvas, 2, 'cizgi basindan beri 2 render sayilmali');
  assert.strictEqual(d.staticLayer, 1, 'staticLayer 1 olmali');
  assert.strictEqual(d.screen, 0, 'cizgi basindan beri ebeveyn render olmamali');

  // Kopya CANLI olmamali: snapshot alindiktan sonraki artislar `before`i bozarsa
  // fark her zaman 0 cikar ve olcum sessizce ise yaramaz hale gelir.
  assert.strictEqual(before.drawingCanvas, 1, 'snapshot kopya olmali, canli referans degil');
  console.log('OK Test 9: render sayaclari fark olarak dogru okunuyor');
}

// --- Test 10: BUILD_KIND __DEV__ tanimsizken cokmuyor ------------------
// Node tarafinda __DEV__ yoktur; sadece `__DEV__ ? ...` yazilsaydi ReferenceError.
{
  const { BUILD_KIND } = loadCounters();
  assert.strictEqual(BUILD_KIND, 'preview', '__DEV__ false iken preview olmali');
  const src = LOG.slice(LOG.indexOf('export const BUILD_KIND'), LOG.indexOf('export const BUILD_KIND') + 200);
  assert.ok(
    /typeof __DEV__ !== 'undefined'/.test(src),
    'BUILD_KIND __DEV__ varligini denetlemeli'
  );
  console.log('OK Test 10: BUILD_KIND __DEV__ tanimsizken guvenli');
}

// --- Test 11: bes bilesenin HEPSI sayaci artiriyor ---------------------
// Biri unutulursa o bilesenin render yuku raporda GORUNMEZ.
{
  const expect = [
    [CANVAS, "bumpRender('drawingCanvas')", 'DrawingCanvas'],
    [CANVAS, "bumpRender('staticLayer')", 'StaticDrawingsLayer'],
    [NOTEBOOK, "bumpRender('screen')", 'NotebookPagesView'],
    [AJANDAM, "bumpRender('screen')", 'ajandam/[pageId]'],
    [TODO, "bumpRender('screen')", 'todolist/[pageId]'],
    [TEXTC, "bumpRender('textCanvas')", 'TextCanvas'],
    [STICKERC, "bumpRender('stickerCanvas')", 'StickerCanvas'],
  ];
  expect.forEach(function (row) {
    assert.ok(row[0].includes(row[1]), row[2] + ' icinde ' + row[1] + ' eksik');
  });
  console.log('OK Test 11: yedi noktada da render sayaci artiriliyor');
}

// --- Test 12: ozet satirinda 2. tur BAGLAM alanlari -------------------
// Ajandam ile Notlarim'i karsilastirabilmek icin hepsi ayni satirda olmali.
{
  const i = CANVAS.indexOf("dlog('perf:strokeEnd'");
  const block = CANVAS.slice(i, CANVAS.indexOf('\n      });', i));
  [
    'build', 'screen', 'tpl',
    'canvasW', 'canvasH', 'dpr', 'physPx',
    'pagesMounted', 'underlayViews',
    'staticStrokes', 'svgSiblings',
    'rcAvgMs', 'rcMaxMs', 'rcN',
    'rDraw', 'rStatic', 'rScreen', 'rText', 'rSticker',
    // Hem 'ad:' hem kisayol ('ad,') yazimi kabul edilir (bkz. Test 5).
  ].forEach(function (f) {
    assert.ok(new RegExp('\\b' + f + '\\s*[:,]').test(block), '2. tur alani eksik: ' + f);
  });
  console.log('OK Test 12: ozet satirinda 19 yeni baglam alani eksiksiz');
}

// --- Test 13: renderCommit olcumu DOGRU yere bagli --------------------
// setCurrentPath'ten HEMEN once baslamali ve useLayoutEffect ile kapanmali.
// useEffect kullanilsaydi boyama sonrasina kayar, olcum sisirilirdi.
{
  const raf = CANVAS.slice(
    CANVAS.indexOf('if (!pathRafIdRef.current) {'),
    CANVAS.indexOf('addTiming(moveTimingRef.current')
  );
  const startIdx = raf.indexOf('commitStartRef.current = nowMs();');
  const setIdx = raf.indexOf('setCurrentPath(pathBuilderRef.current.toPath());');
  assert.ok(startIdx > -1 && setIdx > startIdx, 'commit saati setCurrentPath ONCESINDE baslamali');

  assert.ok(
    /useLayoutEffect\(\(\) => \{[\s\S]*?commitStartRef\.current[\s\S]*?\}, \[currentPath\]\);/.test(
      CANVAS
    ),
    'commit olcumu useLayoutEffect ile ve currentPath bagimliligiyla kapanmali'
  );
  assert.ok(
    /import React, \{[^}]*useLayoutEffect/.test(CANVAS),
    'useLayoutEffect import edilmeli'
  );
  console.log('OK Test 13: renderCommit setCurrentPath oncesi baslayip useLayoutEffect ile kapaniyor');
}

// --- Test 14: TANI PROPLARI URETIM DAVRANISINI DEGISTIRMIYOR ----------
// Bu turun tek sarti: olcum ekle, davranis degistirme. diag* proplari
// YALNIZCA imzada ve dlog blogunda gecebilir; bir kosulda/stilde gecerse
// uretim yolu taniya bagimli hale gelmis demektir.
{
  const names = ['diagScreen', 'diagTemplate', 'diagPagesMounted', 'diagUnderlayViews'];
  const i = CANVAS.indexOf("dlog('perf:strokeEnd'");
  const logBlock = CANVAS.slice(i, CANVAS.indexOf('\n      });', i));
  const sigStart = CANVAS.indexOf('  diagScreen = ');
  const sigEnd = CANVAS.indexOf('}) {', sigStart);
  assert.ok(sigStart > -1 && sigEnd > sigStart, 'diag* imzasi bulunmali');
  // GECICI perf:postStroke penceresi de bir tani blogudur (yalnizca satira yazar)
  const p = CANVAS.indexOf('postStrokeProbeRef.current = startPostStrokeProbe({');
  assert.ok(p > -1, 'perf:postStroke baslangici bulunmali');
  const postBlock = CANVAS.slice(p, CANVAS.indexOf('\n    });', p));
  const rest = CANVAS.slice(0, sigStart) + CANVAS.slice(sigEnd).replace(logBlock, '').replace(postBlock, '');
  names.forEach(function (n) {
    assert.ok(logBlock.includes(n), n + ' ozet satirinda kullanilmali');
    assert.ok(
      !new RegExp('\\b' + n + '\\b').test(rest),
      n + ' yalnizca perf:strokeEnd satirinda gecmeli; uretim yolunda kullanilmis'
    );
  });
  // onLayout olcumu STATE yazmamali (yazsaydi her yeniden olcumde ekstra render)
  const layStart = CANVAS.indexOf('const handleCanvasLayout = useCallback(');
  const lay = CANVAS.slice(layStart, CANVAS.indexOf('}, []);', layStart));
  assert.ok(/canvasSizeRef\.current =/.test(lay), 'olcu ref e yazilmali');
  assert.ok(!/useState|set[A-Z]/.test(lay), 'olcu STATE e yazilmamali (ekstra render uretir)');
  console.log('OK Test 14: tani proplari uretim yoluna sizmiyor, olcu state uretmiyor');
}

// --- Test 15: countRulingElements gercek yapilandirmayla dogru sayiyor -
// Ajandam-Notlarim farkini SAYIYA baglayan tek yer burasi; yanlis olursa
// mimari karar yanlis veriyle verilir.
{
  const loaded = loadRulingCounter();
  const countRulingElements = loaded.countRulingElements;
  const getRulingCounts = loaded.getRulingCounts;
  const W = 700;
  const H = 990;
  const c = getRulingCounts(W, H);

  assert.strictEqual(countRulingElements('blank', W, H), 0, 'duz kagit doku View i uretmez');
  assert.strictEqual(countRulingElements('lined', W, H), c.lines, 'cizgili: satir sayisi kadar');
  assert.strictEqual(
    countRulingElements('grid', W, H),
    c.gridRows + c.gridCols,
    'kareli: yatay + dikey'
  );
  // Noktali: her SATIR bir View + her NOKTA bir View -- en pahali doku
  assert.strictEqual(
    countRulingElements('dotted', W, H),
    c.dotRows + c.dotRows * c.dotCols,
    'noktali: satir View leri + nokta View leri'
  );
  assert.strictEqual(countRulingElements('dotted', 0, 0), 0, 'olculmemis kagit 0 vermeli');

  // Buyukluk sirasi KORUNMALI: raporun dayandigi iddia bu.
  const lined = countRulingElements('lined', W, H);
  const grid = countRulingElements('grid', W, H);
  const dotted = countRulingElements('dotted', W, H);
  assert.ok(dotted > grid && grid > lined, 'noktali > kareli > cizgili olmali');
  assert.ok(dotted > 500, 'noktali kagit yuzlerce View uretmeli (iddianin sayisal dayanagi)');
  console.log(
    'OK Test 15: countRulingElements dogru (cizgili=' + lined +
      ' kareli=' + grid + ' noktali=' + dotted + ' @ ' + W + 'x' + H + ')'
  );
}

// --- Test 16: Ajandam/Notlarim ekran etiketleri dogru baglanmis -------
// Etiket yanlis olursa iki ekranin olcumu birbirine karisir.
{
  assert.ok(
    /diagScreen=\{isDiary \? 'gunluk' : 'notlarim'\}/.test(NOTEBOOK),
    'NotebookPagesView ekran etiketini isDiary ile ayirmali'
  );
  assert.ok(
    /diagPagesMounted=\{pages\.length\}/.test(NOTEBOOK),
    'notebook ayni anda mount edilen sayfa sayisini bildirmeli'
  );
  assert.ok(
    /diagUnderlayViews=\{countRulingElements\(paper\.ruling, pageWidth, pageHeight\)\}/.test(
      NOTEBOOK
    ),
    'notebook kagit doku View sayisini bildirmeli'
  );
  assert.ok(/diagScreen="ajandam"/.test(AJANDAM), 'ajandam etiketi');
  assert.ok(/diagScreen="todolist"/.test(TODO), 'todolist etiketi');
  assert.ok(/diagPagesMounted=\{1\}/.test(AJANDAM), 'ajandam tek sayfa mount eder');
  console.log('OK Test 16: ekran etiketleri ve sayfa sayilari dogru baglanmis');
}


console.log('--- TUM OLCUM ALTYAPISI TESTLERI BASARIYLA GECTI! ---');
