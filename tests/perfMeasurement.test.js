/**
 * SORUN B ölçüm altyapısı. GEÇİCİ tanı kodunu korur: ölçüm doğru olmazsa
 * yanlış karar veririz (örn. gereksiz bir mimari değişiklik).
 *
 * BU TESTİN KAPSAMADIĞI:
 *   - Gerçek cihaz kare süresi, dokunmatik gecikmesi, Hermes davranışı
 *   - İki çalışma zamanı (UI worklet / JS) arasındaki saat tabanı eşitliği —
 *     bu ancak cihazda `dispatchCtrlMs` ve `perf:idleBaseline` ile denetlenir
 *   - Geliştirme derlemesi ile preview derlemesi arasındaki fark
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

  ['moveTimingRef', 'pathTimingRef', 'eventLagRef', 'frameGapRef', 'flushDelayRef'].forEach(
    (ref) => {
      assert.ok(
        new RegExp('resetTiming\\(' + ref + '\\.current\\)').test(body),
        'cizgi basinda sifirlanmayan kova: ' + ref
      );
    }
  );
  console.log('OK Test 3: bes olcum kovasi da cizgi basinda sifirlaniyor');
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

console.log('--- TUM OLCUM ALTYAPISI TESTLERI BASARIYLA GECTI! ---');
