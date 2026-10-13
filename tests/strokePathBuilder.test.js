/**
 * SORUN B: canlı çizginin SVG yolu her hareket olayında TÜM noktalar üzerinden
 * yeniden üretiliyordu.
 *
 * KANITLANAN KÖK NEDEN (kaynak + işlem sayımı):
 *   `pointsToSvgPath` her harekette O(n) nokta ziyareti yapıyordu; bir çizgi
 *   boyunca toplam ~n²/2 ziyaret ve ~n²/2 string birleştirme. 1000 noktalı tek
 *   bir çizgi için ~498.500 ziyaret ve ~27,8 MB dizge tahsisi.
 *
 * DÜZELTME: `utils/strokePathBuilder.js` hareket başına SABİT iş yapar ve
 * **birebir aynı** dizgeyi üretir.
 *
 * BU TESTİN KAPSAMADIĞI (yalnızca cihazda ölçülebilir):
 *   - Gerçek kare süresi, dokunmatik gecikmesi, Hermes davranışı, GC duraklamaları
 *   - Kullanıcının gözlemlediği "iz elimin gerisinde" hissinin ne kadarının
 *     JS thread'den, ne kadarının render hattından geldiği
 *   - Geliştirme derlemesi (__DEV__/Metro) ek yükü
 * Bu test YALNIZCA algoritmik karmaşıklığı ve dizge eşitliğini kanıtlar.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const CANVAS = read('components/drawing/DrawingCanvas.js');

/** Gerçek `pointsToSvgPath`i kaynaktan çıkarır (referans uygulama). */
const loadRealPathFn = () => {
  const a = CANVAS.indexOf('  const pointsToSvgPath = (points) => {');
  assert.ok(a > -1, 'pointsToSvgPath kaynakta bulunmali');
  const b = CANVAS.indexOf('\n  };', a) + '\n  };'.length;
  const src = CANVAS.slice(a, b).replace('  const pointsToSvgPath = ', '');
  // eslint-disable-next-line no-new-func
  return new Function('return ' + src + ';')();
};

/** Artımlı üreticiyi kaynaktan yükler (ESM -> CJS basit dönüşüm). */
const loadBuilder = () => {
  const src = read('utils/strokePathBuilder.js')
    .replace(/export const /g, 'const ')
    .replace(/export default [^;]*;/, '');
  // eslint-disable-next-line no-new-func
  return new Function(src + '\nreturn createStrokePathBuilder;')();
};

const realPath = loadRealPathFn();
const createBuilder = loadBuilder();

const makePoints = (n) =>
  Array.from({ length: n }, (_, i) => ({
    x: i * 1.7 + 0.333,
    y: Math.sin(i / 7) * 41.5,
    timestamp: i * 8,
  }));

console.log('--- Artimli SVG Yol Uretici Testleri (SORUN B) ---');

// --- Test 1: HER ARA ADIMDA birebir ayni dizge -----------------------
// Canli iz her noktada guncellendigi icin yalnizca son hal degil TUM ara
// adimlar da ayni olmak zorunda; yoksa cizim gorunumu degisir.
{
  let steps = 0;
  for (const n of [1, 2, 3, 4, 5, 10, 37, 100, 500]) {
    const pts = makePoints(n);
    const b = createBuilder();
    for (let k = 0; k < n; k++) {
      b.push(pts[k]);
      assert.strictEqual(
        b.toPath(),
        realPath(pts.slice(0, k + 1)),
        'n=' + n + ' k=' + k + ' adiminda dizge farkli'
      );
      steps++;
    }
  }
  assert.strictEqual(createBuilder().toPath(), realPath([]), 'bos cizgi ayni olmali');
  console.log('OK Test 1: ' + steps + ' ara adimda dizge birebir ayni (cizim gorunumu degismez)');
}

// --- Test 2: KARMASIKLIK -- hareket basina SABIT is -------------------
// Duvar saati degil, NOKTA ZIYARETI sayilir. Uretici her push'ta en fazla
// sabit sayida nokta okur; eski yol her cagride n nokta okuyordu.
{
  /** Nokta nesnelerine erisimi sayan sarmalayici. */
  const counting = (pts, counter) =>
    pts.map((p) =>
      new Proxy(p, {
        get(t, k) {
          if (k === 'x' || k === 'y') counter.n++;
          return t[k];
        },
      })
    );

  const rows = [];
  for (const n of [100, 500, 1000, 2000]) {
    // ESKI: her harekette tum noktalar
    const oldC = { n: 0 };
    const oldPts = counting(makePoints(n), oldC);
    for (let k = 2; k <= n; k++) realPath(oldPts.slice(0, k));

    // YENI: her harekette yalnizca yeni parca
    const newC = { n: 0 };
    const newPts = counting(makePoints(n), newC);
    const b = createBuilder();
    for (let k = 0; k < n; k++) {
      b.push(newPts[k]);
      b.toPath();
    }
    rows.push({ n, old: oldC.n, neu: newC.n });
  }

  rows.forEach(({ n, old, neu }) => {
    console.log(
      '    n=' + String(n).padStart(5) +
        '  eski=' + String(old).padStart(9) +
        '  yeni=' + String(neu).padStart(7) +
        '  kazanc=' + Math.round(old / neu) + 'x'
    );
  });

  // Eski: karesel. n iki katina cikinca ziyaret ~4 katina cikmali.
  const r500 = rows.find((r) => r.n === 500).old;
  const r1000 = rows.find((r) => r.n === 1000).old;
  const oldRatio = r1000 / r500;
  assert.ok(
    oldRatio > 3.5 && oldRatio < 4.5,
    'eski yol KARESEL olmali (n iki katina cikinca ~4x), olculen: ' + oldRatio.toFixed(2)
  );

  // Yeni: dogrusal. n iki katina cikinca ziyaret ~2 katina cikmali.
  const n500 = rows.find((r) => r.n === 500).neu;
  const n1000 = rows.find((r) => r.n === 1000).neu;
  const newRatio = n1000 / n500;
  assert.ok(
    newRatio > 1.7 && newRatio < 2.3,
    'yeni yol DOGRUSAL olmali (n iki katina cikinca ~2x), olculen: ' + newRatio.toFixed(2)
  );

  // Ve mutlak kazanc buyuk olmali
  const g1000 = rows.find((r) => r.n === 1000);
  assert.ok(
    g1000.old / g1000.neu > 100,
    '1000 noktada kazanc 100x uzerinde olmali, olculen: ' + Math.round(g1000.old / g1000.neu) + 'x'
  );
  console.log('OK Test 2: eski KARESEL (~4x), yeni DOGRUSAL (~2x), 1000 noktada >100x kazanc');
}

// --- Test 3: DIZGE TAHSISI -- GC baskisi ------------------------------
{
  const totalOld = (n) => {
    let bytes = 0;
    const pts = makePoints(n);
    for (let k = 2; k <= n; k++) bytes += realPath(pts.slice(0, k)).length;
    return bytes;
  };
  const finalLen = (n) => realPath(makePoints(n)).length;

  const n = 1000;
  const old = totalOld(n);
  const neu = finalLen(n);
  console.log(
    '    n=1000  eski toplam=' + (old / 1024 / 1024).toFixed(1) + ' MB' +
      '  yeni son yol=' + (neu / 1024).toFixed(1) + ' KB'
  );
  assert.ok(
    old / neu > 100,
    '1000 noktali bir cizgide eski yol son yolun 100 katindan fazla dizge tahsis etmeli'
  );
  console.log('OK Test 3: eski yol tek cizgide ~' + (old / 1024 / 1024).toFixed(0) + ' MB dizge tahsis ediyordu');
}

// --- Test 4: SICAK YOL -- hareket basina pointsToSvgPath YOK ----------
// handleTouchMove govdesi kaynaktan okunur; kalem dalinda artik tum noktalar
// uzerinde donen cagri olmamali.
{
  const a = CANVAS.indexOf('  const handleTouchMove = useCallback(');
  assert.ok(a > -1, 'handleTouchMove bulunmali');
  const b = CANVAS.indexOf('  const handleTouchEnd = useCallback(', a);
  assert.ok(b > a, 'handleTouchMove sinirini bulmali');
  const body = CANVAS.slice(a, b).replace(/^[ \t]*\/\/.*$/gm, '');

  assert.ok(
    !/pointsToSvgPath\(/.test(body),
    'sicak yolda pointsToSvgPath cagrisi KALMAMALI (hareket basina O(n))'
  );
  assert.ok(
    /pathBuilderRef\.current\.push\(/.test(body),
    'sicak yol artimli uretici kullanmali'
  );
  // Kare basina tek ekrana basma
  assert.ok(
    /if \(!pathRafIdRef\.current\) \{/.test(body) &&
      /requestAnimationFrame\(/.test(body) &&
      /setCurrentPath\(pathBuilderRef\.current\.toPath\(\)\)/.test(body),
    'canli iz kare basina BIR kez ekrana basilmali (rAF ile birlestirme)'
  );
  // TUM noktalar yine toplanmali: cizim kalitesi ve commit degismemeli
  assert.ok(
    /pointsRef\.current\.push\(\{ x: coordX, y: coordY, timestamp: elapsed \}\)/.test(body),
    'TUM noktalar yine pointsRef e eklenmeli (cizim kalitesi degismemeli)'
  );
  console.log('OK Test 4: sicak yolda O(n) cagri yok, artimli + kare basina tek basim');
}

// --- Test 5: COMMIT yolu referans uygulamayi KULLANMAYA DEVAM ETMELI --
// Cizgi kalici katmana gecerken tam yol bir kez uretilir (cizgi basina O(n)).
// Bu, uretici ile referans arasindaki esitligin canli kalmasini da saglar.
{
  assert.ok(
    /const finalPath = pointsToSvgPath\(pointsRef\.current\);/.test(CANVAS),
    'commit yolunda pointsToSvgPath bir kez cagrilmali (cizgi basina O(n))'
  );
  console.log('OK Test 5: commit yolu tam yolu bir kez uretiyor (referans korunuyor)');
}

// --- Test 6: Diger araclarin davranisi DEGISMEDI ----------------------
// Kapsam yalnizca kalemle cizim. Silgi ve kement yollari dokunulmamis olmali.
{
  const a = CANVAS.indexOf('  const handleTouchMove = useCallback(');
  const b = CANVAS.indexOf('  const handleTouchEnd = useCallback(', a);
  const body = CANVAS.slice(a, b);
  assert.ok(
    /if \(state\.tool === 'eraser'\)/.test(body),
    'silgi dali korunmali'
  );
  assert.ok(
    /if \(state\.tool === 'lasso'\)/.test(body) && /pointsToLassoSvgPath\(/.test(body),
    'kement dali korunmali (kapsam disi, dokunulmadi)'
  );
  console.log('OK Test 6: silgi ve kement yollari dokunulmadi');
}

console.log('--- TUM ARTIMLI YOL TESTLERI BASARIYLA GECTI! ---');
