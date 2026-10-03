/**
 * scribbleDetection.test.js
 *
 * Karalayarak silme hareketinin tanınması.
 *
 * En kritik nokta YANLIŞ POZİTİFLER: kullanıcının silmek istemediği bir çizimi
 * ya da el yazısını kaybetmemesi. Bu yüzden testlerin çoğu "bunun karalama
 * SAYILMAMASI gerekir" biçimindedir.
 *
 * Yöntem: gerçek fonksiyonlar kaynaktan okunup çalıştırılır (mantık
 * kopyalanmaz); hareketler sentetik üreticilerle oluşturulur.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const detectionSource = fs.readFileSync(path.join(ROOT, 'utils', 'scribbleDetection.js'), 'utf8');
const lassoSource = fs.readFileSync(path.join(ROOT, 'utils', 'lassoGeometry.js'), 'utf8');

/** lassoGeometry'den bir fonksiyonu aynen çıkarır (dışa aktarılmış veya içsel) */
const pickFromLasso = (name) => {
  const m = new RegExp('(?:export )?function ' + name + '\\([\\s\\S]*?\\n\\}', 'm').exec(lassoSource);
  assert.ok(m, 'lassoGeometry.' + name + ' bulunmali');
  return m[0].replace('export function', 'function');
};

const DEPS = [
  // calculateCharacterBoxes ve getStrokePoints bu ICSEL yardimcilara dayaniyor
  'getCharWidthRatio',
  'parseSvgPathToPoints',
  'getStrokePoints',
  'getTextBlockBounds',
  'calculateCharacterBoxes',
  'getErasedCharacterIndices',
  'eraseCharactersFromBlock',
]
  .map(pickFromLasso)
  .join('\n');

const EXPORTS = [
  'SCRIBBLE_THRESHOLDS',
  'decimatePoints',
  'getPathLength',
  'getPointsBounds',
  'boundsOverlap',
  'segmentsIntersect',
  'countDirectionReversals',
  'countSelfIntersections',
  'getDensityRatio',
  'analyzeScribble',
  'getStickerBounds',
  'scribbleHitsStroke',
  'scribbleHitsBounds',
  'getScribbledCharacterIndices',
  'collectScribbleTargets',
  'evaluateScribbleErase',
  'applyScribbleErase',
  'revertScribbleErase',
];

const body = detectionSource
  .replace(/^import[\s\S]*?from '\.\/lassoGeometry';\n/m, '')
  .replace(/^export const /gm, 'const ')
  .replace(/^export function /gm, 'function ')
  .replace(/^export default[\s\S]*$/m, '');

// eslint-disable-next-line no-new-func
const S = new Function(DEPS + '\n' + body + '\nreturn { ' + EXPORTS.join(', ') + ' };')();

// ─── Hareket üreticileri ────────────────────────────────────────────
const line = (x1, y1, x2, y2, n = 40) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    pts.push({ x: x1 + ((x2 - x1) * i) / n, y: y1 + ((y2 - y1) * i) / n });
  }
  return pts;
};

/** İleri geri süpüren karalama */
const zigzag = (x, y, w, h, passes, step = 3) => {
  const pts = [];
  for (let i = 0; i < passes; i++) {
    const x0 = i % 2 === 0 ? x : x + w;
    const x1 = i % 2 === 0 ? x + w : x;
    const yy = y + (h * i) / Math.max(1, passes - 1);
    const n = Math.max(2, Math.round(Math.abs(x1 - x0) / step));
    for (let k = 0; k <= n; k++) pts.push({ x: x0 + ((x1 - x0) * k) / n, y: yy });
  }
  return pts;
};

const spiral = (cx, cy, turns, rMax, n = 120) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * turns * 2 * Math.PI;
    const r = (rMax * i) / n;
    pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  return pts;
};

const wave = (x, y, w, amp, cycles, n = 60) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    pts.push({ x: x + w * p, y: y + amp * Math.sin(p * cycles * 2 * Math.PI) });
  }
  return pts;
};

/** El yazısı ilmekleri ("eeee") */
const cursiveLoops = (x, y, loops, r = 12, n = 24) => {
  const pts = [];
  for (let L = 0; L < loops; L++) {
    const cx = x + L * r * 1.6;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * 2 * Math.PI;
      pts.push({ x: cx + r * Math.cos(t), y: y + r * Math.sin(t) * 0.8 });
    }
  }
  return pts;
};

const strokeFrom = (id, points) => ({ id, points, d: '', color: '#000', strokeWidth: 3 });

console.log('--- Karalayarak Silme Tespit Testleri ---');

// ─── Temel geometri ─────────────────────────────────────────────────
{
  assert.strictEqual(Math.round(S.getPathLength(line(0, 0, 100, 0))), 100);
  assert.strictEqual(S.getPathLength([{ x: 0, y: 0 }]), 0, 'tek nokta sifir uzunluk');
  assert.deepStrictEqual(S.getPointsBounds([{ x: 1, y: 5 }, { x: 9, y: 2 }]), {
    minX: 1,
    minY: 2,
    maxX: 9,
    maxY: 5,
  });
  assert.strictEqual(S.getPointsBounds([]), null);

  assert.ok(
    S.segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }),
    'X seklinde kesisen parcalar'
  );
  assert.ok(
    !S.segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 }),
    'paralel parcalar kesismemeli'
  );
  console.log('OK Test 1: temel geometri yardimcilari dogru');
}

// ─── Seyreltme köşeleri korumalı ────────────────────────────────────
{
  const dense = zigzag(0, 0, 120, 20, 5, 1);
  const thin = S.decimatePoints(dense);

  assert.ok(thin.length < dense.length, 'seyreltme nokta sayisini azaltmali');
  assert.ok(thin.length >= 8, 'asiri seyreltmemeli');
  assert.deepStrictEqual(thin[0], dense[0], 'ilk nokta korunmali');
  assert.deepStrictEqual(thin[thin.length - 1], dense[dense.length - 1], 'son nokta korunmali');

  // ASIL MESELE: seyreltme donusleri yok etmemeli
  const reversalsDense = S.countDirectionReversals(dense);
  const reversalsThin = S.countDirectionReversals(thin);
  assert.ok(
    reversalsThin >= 4,
    'seyreltilmis cizgide donusler korunmali (yogun: ' + reversalsDense + ', seyrek: ' + reversalsThin + ')'
  );
  console.log('OK Test 2: seyreltme noktalari azaltiyor ama kose/donusleri koruyor');
}

// ─── Karalama olmayan hareketler ────────────────────────────────────
{
  const notScribbles = [
    ['duz cizgi', line(0, 0, 220, 0)],
    ['capraz duz cizgi', line(0, 0, 160, 160)],
    ['hafif dalga (el yazisi)', wave(0, 0, 220, 10, 3)],
    ['spiral cizim', spiral(100, 100, 3, 60)],
    ['kisa el yazisi ilmekleri (eeee)', cursiveLoops(0, 0, 4)],
    ['cok kisa cizgi', line(0, 0, 20, 0, 15)],
  ];

  notScribbles.forEach(([label, pts]) => {
    const a = S.analyzeScribble(pts);
    assert.strictEqual(
      a.isScribble,
      false,
      label + ' KARALAMA SAYILMAMALI (don:' + a.reversals + ' kes:' + a.selfIntersections +
        ' yog:' + a.densityRatio.toFixed(2) + ')'
    );
  });
  console.log('OK Test 3: ' + notScribbles.length + ' normal cizim hareketi karalama sayilmiyor');
}

// ─── Nokta sayısı / uzunluk alt sınırları ───────────────────────────
{
  const tiny = line(0, 0, 100, 0, 5); // 6 nokta
  assert.strictEqual(S.analyzeScribble(tiny).reason, 'too_few_points');
  assert.strictEqual(S.analyzeScribble([]).reason, 'too_few_points');
  assert.strictEqual(S.analyzeScribble(null).reason, 'too_few_points');

  const shortZigzag = zigzag(0, 0, 10, 4, 4, 0.6);
  const a = S.analyzeScribble(shortZigzag);
  assert.strictEqual(a.isScribble, false, 'cok kisa bir karalama sayilmamali');
  console.log('OK Test 4: cok az noktali / cok kisa hareketler elenior');
}

// ─── Gerçek karalamalar tanınıyor ───────────────────────────────────
{
  const scribbles = [
    ['yatay 5 gecis', zigzag(0, 0, 120, 20, 5)],
    ['yatay 7 gecis dar', zigzag(0, 0, 100, 12, 7)],
    ['capraz genis', zigzag(0, 0, 90, 90, 6)],
    ['kucuk 40px', zigzag(0, 0, 40, 10, 6, 2)],
  ];

  scribbles.forEach(([label, pts]) => {
    const a = S.analyzeScribble(pts);
    assert.strictEqual(
      a.isScribble,
      true,
      label + ' KARALAMA SAYILMALI (don:' + a.reversals + ' kes:' + a.selfIntersections +
        ' yog:' + a.densityRatio.toFixed(2) + ' olcut:' + a.criteriaMet + ')'
    );
  });
  console.log('OK Test 5: ' + scribbles.length + ' farkli karalama hareketi taniniyor');
}

// ─── Yön dönüşü ZORUNLU ölçüt ───────────────────────────────────────
{
  // Sik ilmekli el yazisi cok sayida kesisme ve yuksek yogunluk uretir;
  // donus sarti olmasa bu tek basina silmeye yeterdi.
  const loops = cursiveLoops(0, 0, 4);
  const a = S.analyzeScribble(loops);
  assert.ok(a.selfIntersections >= S.SCRIBBLE_THRESHOLDS.MIN_SELF_INTERSECTIONS, 'kesisme olcutu saglanir');
  assert.ok(a.densityRatio >= S.SCRIBBLE_THRESHOLDS.MIN_DENSITY_RATIO, 'yogunluk olcutu saglanir');
  assert.strictEqual(a.criteriaMet, 2, 'ucten ikisi saglanir');
  assert.strictEqual(
    a.isScribble,
    false,
    'buna ragmen KESKIN DONUS olmadigi icin karalama sayilmamali'
  );
  console.log('OK Test 6: donus sarti olmadan silinecek el yazisi, donus sarti sayesinde korunuyor');
}

// ─── Hedef belirleme: çizgiler ──────────────────────────────────────
{
  const target = strokeFrom('s1', line(10, 50, 110, 50));
  const faraway = strokeFrom('s2', line(10, 400, 110, 400));
  const scribble = S.decimatePoints(zigzag(20, 40, 80, 20, 5));

  assert.ok(S.scribbleHitsStroke(scribble, target), 'ustunden gecilen cizgi hedef olmali');
  assert.ok(!S.scribbleHitsStroke(scribble, faraway), 'uzaktaki cizgi hedef OLMAMALI');
  console.log('OK Test 7: karalama yalnizca ustunden gectigi cizgiyi hedefliyor');
}

// ─── Hedef belirleme: çıkartmalar (bütün olarak) ────────────────────
{
  const sticker = { id: 'stk_1', x: 100, y: 100, scale: 1 };
  const bounds = S.getStickerBounds(sticker);
  assert.deepStrictEqual(bounds, { minX: 100, minY: 100, maxX: 180, maxY: 180 });

  const scaled = S.getStickerBounds({ id: 'stk_2', x: 0, y: 0, scale: 2 });
  assert.strictEqual(scaled.maxX, 160, 'olcek sinirlara yansimali');

  const over = S.decimatePoints(zigzag(110, 110, 60, 40, 5));
  const beside = S.decimatePoints(zigzag(300, 300, 60, 40, 5));
  assert.ok(S.scribbleHitsBounds(over, bounds), 'ustu karalanan cikartma hedef olmali');
  assert.ok(!S.scribbleHitsBounds(beside, bounds), 'uzaktaki cikartma hedef OLMAMALI');
  console.log('OK Test 8: cikartmalar butun olarak hedefleniyor, uzaktakiler etkilenmiyor');
}

// ─── Metin kutusu: KISMİ silme ──────────────────────────────────────
{
  const block = {
    id: 'txt_1',
    text: 'merhaba dunya',
    x: 0,
    y: 0,
    width: 300,
    fontSize: 16,
  };

  const boxes = S.calculateCharacterBoxes
    ? S.calculateCharacterBoxes(block)
    : null; // dogrudan disa aktarilmiyor, asagida dolayli dogrulaniyor

  // Yalnizca ilk kelimenin uzerini karala
  const firstWordBounds = { minX: 8, minY: 8, maxX: 70, maxY: 30 };
  const overFirstWord = S.decimatePoints(
    zigzag(firstWordBounds.minX, 12, firstWordBounds.maxX - firstWordBounds.minX, 10, 6, 2)
  );

  const indices = S.getScribbledCharacterIndices(overFirstWord, block);
  assert.ok(indices.length > 0, 'uzeri karalanan karakterler bulunmali');

  // ASIL SART: tum kutu degil, yalnizca bir KISIM silinmeli
  assert.ok(
    indices.length < Array.from(block.text).length,
    'karakterlerin TAMAMI secilmemeli (kismi silme) -> ' + indices.length + '/' + block.text.length
  );
  // Secilenler metnin basinda yogunlasmali
  assert.ok(indices[0] <= 2, 'secim metnin basindan baslamali');
  assert.ok(
    indices[indices.length - 1] < block.text.length - 2,
    'son karakterler secilmemeli (karalama oraya gitmedi)'
  );

  // Uzaktaki bir karalama hicbir karakteri secmemeli
  const faraway = S.decimatePoints(zigzag(0, 500, 80, 20, 5));
  assert.deepStrictEqual(
    S.getScribbledCharacterIndices(faraway, block),
    [],
    'uzaktaki karalama hicbir karakteri secmemeli'
  );
  console.log(
    'OK Test 9: metin kutusunda yalnizca uzeri karalanan kisim seciliyor (' +
      indices.length + '/' + block.text.length + ' karakter)'
  );
}

// ─── Boş alana karalama hiçbir şeyi silmez ──────────────────────────
{
  const result = S.evaluateScribbleErase({
    points: zigzag(500, 500, 100, 30, 6),
    drawings: [strokeFrom('s1', line(0, 0, 100, 0))],
    textBlocks: [{ id: 't1', text: 'abc', x: 0, y: 0, width: 100, fontSize: 16 }],
    stickers: [{ id: 'k1', x: 0, y: 0, scale: 1 }],
  });

  assert.strictEqual(result.analysis.isScribble, true, 'hareket karalama olarak taninmali');
  assert.strictEqual(
    result.shouldErase,
    false,
    'ama hicbir seye degmediginden SILME YAPILMAMALI (sıradan cizgi olarak kalir)'
  );
  assert.strictEqual(result.targets.total, 0);
  console.log('OK Test 10: bos alana karalamak hicbir seyi silmiyor, normal cizgi olarak kaliyor');
}

// ─── Karalama olmayan hareket hiçbir şeyi silmez ────────────────────
{
  const result = S.evaluateScribbleErase({
    points: line(0, 50, 200, 50), // icerigin tam uzerinden gecen DUZ cizgi
    drawings: [strokeFrom('s1', line(0, 50, 200, 50))],
  });
  assert.strictEqual(result.analysis.isScribble, false);
  assert.strictEqual(
    result.shouldErase,
    false,
    'duz bir cizgi icerigin uzerinden gecse bile silme yapmamali'
  );
  console.log('OK Test 11: icerigin uzerinden gecen duz cizgi silme tetiklemiyor');
}

// ─── Üç içerik türü birlikte ────────────────────────────────────────
{
  const result = S.evaluateScribbleErase({
    points: zigzag(0, 40, 160, 60, 7),
    drawings: [
      strokeFrom('s_hit', line(10, 60, 150, 60)),
      strokeFrom('s_miss', line(10, 900, 150, 900)),
    ],
    textBlocks: [
      { id: 't_hit', text: 'silinecek', x: 0, y: 50, width: 200, fontSize: 16 },
      { id: 't_miss', text: 'kalacak', x: 0, y: 800, width: 200, fontSize: 16 },
    ],
    stickers: [
      { id: 'k_hit', x: 40, y: 50, scale: 1 },
      { id: 'k_miss', x: 600, y: 600, scale: 1 },
    ],
  });

  assert.strictEqual(result.shouldErase, true);
  assert.deepStrictEqual(result.targets.strokeIds, ['s_hit']);
  assert.deepStrictEqual(result.targets.stickerIds, ['k_hit']);
  assert.strictEqual(result.targets.textEdits.length, 1);
  assert.strictEqual(result.targets.textEdits[0].id, 't_hit');
  assert.strictEqual(result.targets.total, 3);
  console.log('OK Test 12: cizgi + metin + cikartma ayni anda, yalnizca degilenler hedefleniyor');
}

// ─── Eşikler tek yerde ──────────────────────────────────────────────
{
  const required = [
    'MIN_POINTS',
    'MIN_PATH_LENGTH',
    'DECIMATE_MIN_DISTANCE',
    'MAX_ANALYSIS_POINTS',
    'REVERSAL_SPAN',
    'MIN_REVERSAL_ARM',
    'REVERSAL_ANGLE_DEG',
    'MIN_REVERSALS',
    'MIN_SELF_INTERSECTIONS',
    'MIN_DENSITY_RATIO',
    'MIN_CRITERIA_MET',
    'HIT_RADIUS',
    'STICKER_BASE_SIZE',
  ];
  required.forEach((k) => {
    assert.strictEqual(
      typeof S.SCRIBBLE_THRESHOLDS[k],
      'number',
      'SCRIBBLE_THRESHOLDS.' + k + ' tanimli olmali'
    );
  });

  // Kaynakta sabit sayi gomulu kalmamali: esikler tek yerden okunmali
  const hardcoded = detectionSource.match(/if \(reversals >= \d+\)/g);
  assert.strictEqual(hardcoded, null, 'esikler koda gomulmemeli, SCRIBBLE_THRESHOLDS kullanilmali');
  console.log('OK Test 13: ' + required.length + ' esigin tamami tek bir nesnede, koda gomulu sayi yok');
}

// ─── Bilinen sınır: açıkça belgelenmiş ──────────────────────────────
{
  // Tek darbede golgelendirme karalamadan geometrik olarak ayrilamaz.
  // Bu test, davranisi SABITLER: ileride bir cozum eklenirse burasi duser ve
  // belgelerin guncellenmesi gerektigini hatirlatir.
  const shading = zigzag(0, 0, 60, 60, 10);
  assert.strictEqual(
    S.analyzeScribble(shading).isScribble,
    true,
    'BILINEN SINIR: tek darbede golgelendirme karalama olarak taniniyor'
  );
  assert.ok(
    /BİLİNEN SINIR/.test(detectionSource),
    'bu sinir kaynak dosyada acikca belgelenmeli'
  );
  console.log('OK Test 14: bilinen sinir (golgelendirme) sabitlendi ve kaynakta belgelenmis');
}

// --- Uygulama: silme + atomik geri alma ----------------------------
{
  const page = {
    drawings: [
      strokeFrom('s_hit', line(10, 60, 150, 60)),
      strokeFrom('s_keep', line(10, 900, 150, 900)),
    ],
    textBlocks: [{ id: 't1', text: 'merhaba dunya', x: 0, y: 50, width: 300, fontSize: 16 }],
    stickers: [
      { id: 'k_hit', x: 40, y: 50, scale: 1 },
      { id: 'k_keep', x: 600, y: 600, scale: 1 },
    ],
  };

  // Yalnizca SOL bolumu karala: cizgiye, cikartmaya ve metnin ILK kelimesine deger
  const verdict = S.evaluateScribbleErase({ points: zigzag(0, 40, 60, 60, 7), ...page });
  assert.strictEqual(verdict.shouldErase, true);

  const after = S.applyScribbleErase({ ...page, targets: verdict.targets });

  assert.deepStrictEqual(
    after.drawings.map((d) => d.id),
    ['s_keep'],
    'yalnizca degilen cizgi silinmeli'
  );
  assert.deepStrictEqual(
    after.stickers.map((k) => k.id),
    ['k_keep'],
    'yalnizca degilen cikartma silinmeli'
  );
  assert.strictEqual(after.textBlocks.length, 1, 'metin kutusu tamamen silinmemeli');
  assert.notStrictEqual(
    after.textBlocks[0].text,
    page.textBlocks[0].text,
    'metin degismis olmali'
  );
  assert.ok(after.textBlocks[0].text.trim().length > 0, 'metnin KISMI silinmeli, hepsi degil');
  assert.strictEqual(after.deletedCount, 3);
  console.log('OK Test 15: silme yalnizca degilenlere uygulaniyor, metin kismen siliniyor');

  const reverted = S.revertScribbleErase({
    drawings: after.drawings,
    textBlocks: after.textBlocks,
    stickers: after.stickers,
    undoRecord: after.undoRecord,
  });

  assert.deepStrictEqual(
    reverted.drawings.map((d) => d.id).sort(),
    ['s_hit', 's_keep'],
    'silinen cizgi geri gelmeli'
  );
  assert.deepStrictEqual(
    reverted.stickers.map((k) => k.id).sort(),
    ['k_hit', 'k_keep'],
    'silinen cikartma geri gelmeli'
  );
  assert.strictEqual(reverted.textBlocks.length, 1);
  assert.strictEqual(
    reverted.textBlocks[0].text,
    page.textBlocks[0].text,
    'metin ESKI haliyle geri gelmeli'
  );
  console.log('OK Test 16: geri alma cizgi + cikartma + metni TEK islemde geri yukluyor');
}

// --- Tamamen karalanan metin kutusu silinir, geri gelir ------------
{
  const block = { id: 't1', text: 'kisa', x: 0, y: 0, width: 120, fontSize: 16 };
  const overAll = S.decimatePoints(zigzag(0, 6, 110, 24, 8, 2));
  const indices = S.getScribbledCharacterIndices(overAll, block);
  assert.strictEqual(indices.length, Array.from(block.text).length, 'tum karakterler karalanmali');

  const after = S.applyScribbleErase({
    textBlocks: [block],
    targets: { strokeIds: [], stickerIds: [], textEdits: [{ id: 't1', erasedIndices: indices }] },
  });
  assert.strictEqual(after.textBlocks.length, 0, 'tamamen bosalan kutu sayfadan kaldirilmali');
  assert.strictEqual(after.deletedCount, 1);

  const reverted = S.revertScribbleErase({
    textBlocks: after.textBlocks,
    undoRecord: after.undoRecord,
  });
  assert.strictEqual(reverted.textBlocks.length, 1, 'kutu geri gelmeli');
  assert.strictEqual(reverted.textBlocks[0].text, 'kisa');
  console.log('OK Test 17: tamamen karalanan kutu kaldiriliyor ve geri alinabiliyor');
}

// --- Gecersiz geri alma kaydi zarar vermiyor -----------------------
{
  const input = { drawings: [strokeFrom('a', line(0, 0, 10, 0))], textBlocks: [], stickers: [] };
  const out = S.revertScribbleErase({ ...input, undoRecord: { type: 'baska_bir_sey' } });
  assert.deepStrictEqual(
    out.drawings.map((d) => d.id),
    ['a'],
    'ilgisiz kayit veriyi degistirmemeli'
  );
  console.log('OK Test 18: ilgisiz/eksik geri alma kaydi veriye dokunmuyor');
}

// --- Baglanti: ekranlarda kurulu -----------------------------------
{
  const canvas = fs.readFileSync(path.join(ROOT, 'components', 'drawing', 'DrawingCanvas.js'), 'utf8');
  assert.ok(
    /state\.tool === 'pen' &&/.test(canvas),
    'karalama tespiti YALNIZCA pen aracinda calismali'
  );
  assert.ok(
    /if \(verdict\.shouldErase\) \{[\s\S]{0,200}state\.onScribbleErase\(verdict\.targets\);/.test(canvas),
    'silme yalnizca shouldErase true iken tetiklenmeli'
  );
  const evalIndex = canvas.indexOf('evaluateScribbleErase({');
  const commitIndex = canvas.indexOf('state.onDrawingsChange([...state.drawings, newStroke])');
  assert.ok(
    evalIndex > -1 && commitIndex > -1 && evalIndex < commitIndex,
    'degerlendirme cizgi sayfaya EKLENMEDEN once yapilmali'
  );

  const screens = [
    ['ajandam', path.join(ROOT, 'app', 'ajandam', '[pageId].js')],
    ['todolist', path.join(ROOT, 'app', 'todolist', '[pageId].js')],
    ['notebook', path.join(ROOT, 'components', 'notebook', 'NotebookPagesView.js')],
  ];
  screens.forEach(([label, file]) => {
    const src = fs.readFileSync(file, 'utf8');
    assert.ok(/applyScribbleErase/.test(src), label + ': silme uygulanmali');
    assert.ok(/revertScribbleErase/.test(src), label + ': geri alma bagli olmali');
    assert.ok(/onScribbleErase=\{/.test(src), label + ': DrawingCanvas baglantisi olmali');
    assert.ok(/stickers=\{/.test(src), label + ': cikartmalar canvas a verilmeli');
    assert.ok(/scribbleEraseEnabled=\{/.test(src), label + ': ac/kapa bagli olmali');
    assert.ok(/drawing\.scribbleErased/.test(src), label + ': geri alma bildirimi gosterilmeli');
  });
  console.log('OK Test 19: tespit pen ile sinirli ve uc ekranda da tam bagli');
}

// --- Ayar: tek yerde, dort ekranda ortak ---------------------------
{
  const prefs = fs.readFileSync(path.join(ROOT, 'services', 'drawingPreferencesService.js'), 'utf8');
  assert.ok(/SCRIBBLE_ERASE_DEFAULT = true/.test(prefs), 'varsayilan ACIK olmali');
  assert.ok(
    /export const getDrawingPreferences = async \(\) => \{\s*\n\s*await loadDrawingPreferences\(\);\s*\n\s*return \{ \.\.\.cache \};/.test(prefs),
    'getDrawingPreferences GUNCEL onbellegi dondurmeli (bayat promise kopyasi degil)'
  );

  const toolbar = fs.readFileSync(path.join(ROOT, 'components', 'drawing', 'DrawingToolbar.js'), 'utf8');
  assert.ok(/handleToggleScribbleErase/.test(toolbar), 'arac cubugunda ac/kapa olmali');
  assert.ok(/drawing\.scribbleEraseToggle/.test(toolbar), 'anahtarin etiketi cevrilmeli');

  ['tr', 'en', 'de', 'es', 'fr'].forEach((lng) => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', lng + '.json'), 'utf8'));
    assert.ok(typeof j.drawing.scribbleErased === 'string', lng + ': scribbleErased tanimli olmali');
    assert.ok(/\{\{count\}\}/.test(j.drawing.scribbleErased), lng + ': count degiskeni korunmali');
    assert.ok(
      typeof j.drawing.scribbleEraseToggle === 'string',
      lng + ': scribbleEraseToggle tanimli olmali'
    );
  });
  console.log('OK Test 20: ayar tek serviste, arac cubugunda acilip kapanabiliyor, bes dilde');
}

console.log('--- TUM KARALAMA TESPIT TESTLERI BASARIYLA GECTI! ---');
