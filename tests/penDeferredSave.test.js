/**
 * penDeferredSave.test.js — KALEM BASILIYKEN KAYIT ERTELEME
 *
 * Sorun: debounce'lu kayit (okuma sonrasi JSON.parse + JSON.stringify, cihazda
 * Notlarim'da 30-70 ms) kalem basiliyken baslarsa JS'i kilitler ve cizginin izi
 * takilir.
 *
 * Duzeltme: zamanlayici suresi dolunca kalem basiliysa kayit BASLATILMAZ; kalem
 * kalkinca ayni gecikmeyle yeniden kurulur. Ilk ertelemeden MAX_PEN_DEFER_MS
 * (2000 ms) sonra kalem durumuna bakilmadan calisir. Arka plana gecis ve
 * ekrandan ayrilma flush'lari beklemez. Ucustaki kayit iptal edilmez.
 *
 * Yontem: GERCEK kod kaynaktan. Ajandam/Yapilacaklar icin scheduleSave +
 * flushPendingSave kaynaktan cikarilir (pendingSaveFlush.test.js ile ayni yol),
 * Notlarim icin ekran GERCEK React ile calistirilir. "Once" hali git'ten
 * (544ce0cb: bu turun cift yazma duzeltmesi, erteleme oncesi) okunur.
 * Saat ve kalem durumu sahtedir.
 *
 * KAPSAMADIGI: Kalem JS'e henuz ulasmamisken (dokunus olayi kuyrukta beklerken)
 * baslayan kayit — penActivity durumu JS'te tutar, o an "basili degil" der.
 * Zaten baslamis bir kaydin JS kilidi de engellenmez (bilincli: veri kaybi olmasin).
 */
const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');
const markComplete = require('./helpers/completionGuard')(__filename);
const { createLoader, createClock, flushMicrotasks } = require('./helpers/screenHarness');
const { openNotebookScreen } = require('./helpers/notebookScenario');

const ROOT = path.join(__dirname, '..');
const BEFORE = '544ce0cb';
const gitShow = (rel) =>
  execSync(`git show "${BEFORE}:${rel}"`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const read = (rel) => require('fs').readFileSync(path.join(ROOT, rel), 'utf8');

const FLUSH_RE = /  const flushPendingSave = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[pageId\]\);/;
const SCHEDULE_RE = /  const scheduleSave = useCallback\(\n[\s\S]*?\n    \[flushPendingSave\]\n  \);/;

/** Kaynaktaki GERCEK scheduleSave/flushPendingSave; saat ve kalem sahte */
const buildSaver = (source, label) => {
  const clock = createClock();
  const pen = createLoader({
    real: ['utils/penActivity.js'],
    globals: { setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout },
  }).load('utils/penActivity.js');
  const flushDecl = FLUSH_RE.exec(source);
  const scheduleDecl = SCHEDULE_RE.exec(source);
  assert.ok(flushDecl && scheduleDecl, label + ': kayit fonksiyonlari kaynakta bulunmali');
  const body =
    flushDecl[0]
      .replace('const flushPendingSave = useCallback(async () => {', 'const flushPendingSave = async () => {')
      .replace(/\n  \}, \[pageId\]\);$/, '\n  };') +
    '\n' +
    scheduleDecl[0]
      .replace('const scheduleSave = useCallback(\n', 'const scheduleSave = ')
      .replace(/,\n    \[flushPendingSave\]\n  \);$/, ';');
  const refs = { saveTimeoutRef: { current: null }, pendingSaveRef: { current: null } };
  const writes = []; // { at, penDown, updates }
  const disk = {};
  let release = null;
  // eslint-disable-next-line no-new-func
  const api = new Function(
    'saveTimeoutRef',
    'pendingSaveRef',
    'pageId',
    'StorageService',
    'console',
    'dlog',
    'len',
    'textLen',
    'reportStorageWriteError',
    'setTimeout',
    'clearTimeout',
    'setPenAwareTimeout',
    'cancelPenAwareTimeout',
    body + '\nreturn { flushPendingSave, scheduleSave };'
  )(
    refs.saveTimeoutRef,
    refs.pendingSaveRef,
    'page_1',
    {
      updatePage(id, updates) {
        // Kaydin senkron basi: StorageService burada okuma + parse + stringify yapar
        writes.push({ at: clock.now(), penDown: pen.isPenDown(), updates });
        Object.assign(disk, updates);
        return release ? new Promise((r) => (release.fn = r)) : Promise.resolve();
      },
    },
    console,
    () => {},
    () => 0,
    () => 0,
    () => {},
    clock.setTimeout,
    clock.clearTimeout,
    pen.setPenAwareTimeout,
    pen.cancelPenAwareTimeout
  );
  return { ...api, clock, pen, writes, disk, refs, holdWrites: () => (release = {}), releaseWrite: () => release.fn() };
};

const SCREENS = [
  ['ajandam', 'app/ajandam/[pageId].js'],
  ['todolist', 'app/todolist/[pageId].js'],
];

(async () => {
  console.log('--- Kalem Basiliyken Kayit Erteleme Testleri ---');

  // --- Test 1: ONCE — kayit cizgi sirasinda basliyor (cakisma kaniti) ---
  for (const [label, rel] of SCREENS) {
    const s = buildSaver(gitShow(rel), label + '@' + BEFORE);
    const owner = {};
    s.scheduleSave({ drawings: ['c1'] }, 500); // cizgi bitti, kayit 500 ms sonra
    s.clock.advance(300);
    s.pen.setPenDown(owner, true); // sonraki cizgi basladi, 600 ms surer
    s.clock.advance(600);
    s.pen.setPenDown(owner, false);
    s.clock.advance(2000);
    assert.strictEqual(s.writes.length, 1);
    assert.strictEqual(s.writes[0].at, 500, label + ' once: kayit zamaninda basliyor');
    assert.strictEqual(s.writes[0].penDown, true, label + ' once: kayit kalem basiliyken basliyor (cakisma)');
  }
  console.log('OK Test 1: ONCE (544ce0cb) kayit cizgi sirasinda basliyordu (Ajandam + Yapilacaklar)');

  // --- Test 2: SONRA — kayit kalem kalkana kadar bekliyor, sonra ayni gecikmeyle ---
  for (const [label, rel] of SCREENS) {
    const s = buildSaver(read(rel), label);
    const owner = {};
    s.scheduleSave({ drawings: ['c1'] }, 500);
    s.clock.advance(300);
    s.pen.setPenDown(owner, true);
    s.clock.advance(600); // t=900
    assert.strictEqual(s.writes.length, 0, label + ': kalem basiliyken kayit baslamamali');
    s.pen.setPenDown(owner, false);
    s.clock.advance(2000);
    assert.strictEqual(s.writes.length, 1, label + ': kalem kalkinca tek kayit');
    assert.strictEqual(s.writes[0].at, 1400, label + ': kalkistan 500 ms sonra (900 + 500)');
    assert.strictEqual(s.writes[0].penDown, false, label + ': cakisma yok');
    assert.deepStrictEqual(s.disk, { drawings: ['c1'] }, label + ': veri yazildi');
    assert.strictEqual(s.refs.saveTimeoutRef.current, null);
  }
  console.log('OK Test 2: SONRA kayit kalem kalkana kadar ertelendi, cakisma yok (Ajandam + Yapilacaklar)');

  // --- Test 3: ust sinir — kalem cok uzun basili kalsa da veri bekletilmez ---
  {
    const s = buildSaver(read('app/ajandam/[pageId].js'), 'ajandam');
    const owner = {};
    s.scheduleSave({ drawings: ['c1'] }, 500);
    s.clock.advance(300);
    s.pen.setPenDown(owner, true); // 10 sn basili
    s.clock.advance(10000);
    assert.strictEqual(s.writes.length, 1, 'ust sinirda kayit zorla yapilmali');
    assert.strictEqual(s.writes[0].at, 2500, 'en gec gecikme + MAX_PEN_DEFER_MS (500 + 2000)');
    assert.strictEqual(s.pen.MAX_PEN_DEFER_MS, 2000);
    s.pen.setPenDown(owner, false);
    s.clock.advance(3000);
    assert.strictEqual(s.writes.length, 1, 'zorla yapilan kayittan sonra ikinci kayit yok');
  }
  console.log('OK Test 3: ust sinir 2000 ms; veri kaybi penceresi en fazla gecikme + 2000 ms');

  // --- Test 4: arka plan / ekrandan cikis flush'i kalem durumuna BAKMADAN hemen ---
  {
    const s = buildSaver(read('app/ajandam/[pageId].js'), 'ajandam');
    const owner = {};
    s.scheduleSave({ drawings: ['c1'] }, 500);
    s.clock.advance(600);
    s.pen.setPenDown(owner, true);
    // (zamanlayici dolmustu ama kalem basiliyken ertelendi mi? t=500'de kalem kalkikti -> yazildi)
    assert.strictEqual(s.writes.length, 1);
    s.scheduleSave({ textBlocks: ['t1'] }, 500);
    s.clock.advance(700); // kalem hala basili: ertelendi
    assert.strictEqual(s.writes.length, 1, 'ertelenmis kayit bekliyor');
    await s.flushPendingSave(); // AppState 'background' / unmount
    assert.strictEqual(s.writes.length, 2, 'flush kalemi beklemeden yazmali');
    assert.strictEqual(s.writes[1].penDown, true, 'bilincli: flush kalem basiliyken de calisir');
    assert.deepStrictEqual(s.writes[1].updates, { textBlocks: ['t1'] });
    assert.strictEqual(s.refs.saveTimeoutRef.current, null, 'flush ertelenmis zamanlayiciyi temizlemeli');
    s.pen.setPenDown(owner, false);
    s.clock.advance(5000);
    assert.strictEqual(s.writes.length, 2, 'flush ertelenmis zamanlayiciyi iptal etmeli (mukerrer yok)');
  }
  console.log('OK Test 4: arka plan/cikis flush kalemi beklemiyor; ertelenmis kayit iptal, mukerrer yok');

  // --- Test 5: erteleme sirasinda gelen yeni degisiklik ayni yukte, tek kayit ---
  {
    const s = buildSaver(read('app/ajandam/[pageId].js'), 'ajandam');
    const owner = {};
    s.scheduleSave({ drawings: ['c1'] }, 500);
    s.clock.advance(400);
    s.pen.setPenDown(owner, true);
    s.clock.advance(300); // t=700: ertelendi
    s.pen.setPenDown(owner, false); // cizgi bitti ->
    s.scheduleSave({ drawings: ['c1', 'c2'] }, 500); // ekran yeni cizgiyi zamanlar
    s.clock.advance(3000);
    assert.strictEqual(s.writes.length, 1, 'tek kayit');
    assert.deepStrictEqual(s.writes[0].updates, { drawings: ['c1', 'c2'] }, 'en yeni deger');
    assert.strictEqual(s.writes[0].at, 1200, 'yeni degisiklikten 500 ms sonra');
  }
  console.log('OK Test 5: erteleme sirasinda gelen degisiklik birlesiyor, tek kayit, en yeni deger');

  // --- Test 6: ucustaki kayit iptal edilmez ---
  {
    const s = buildSaver(read('app/ajandam/[pageId].js'), 'ajandam');
    const owner = {};
    s.holdWrites();
    s.scheduleSave({ drawings: ['c1'] }, 500);
    s.clock.advance(500); // kayit basladi, setItem suruyor
    assert.strictEqual(s.writes.length, 1);
    s.pen.setPenDown(owner, true);
    s.releaseWrite();
    await flushMicrotasks(2);
    assert.deepStrictEqual(s.disk, { drawings: ['c1'] }, 'baslamis kayit tamamlanmali');
    assert.strictEqual(s.refs.pendingSaveRef.current, null, 'yuk bosaldi, kayip yok');
    s.pen.setPenDown(owner, false);
  }
  console.log('OK Test 6: ucustaki kayit kalem basilinca iptal edilmiyor');

  // --- Test 7: Notlarim (gercek React) — once/sonra ---
  const notebookRun = async (rev) => {
    const s = await openNotebookScreen({ rev });
    await s.tick(2000);
    const pen = s.loader.load('utils/penActivity.js'); // ekranla AYNI ornek
    const owner = {};
    const mark = s.logs.length;
    await s.draw('s1'); // cizgi bitti -> 500 ms debounce
    await s.tick(300);
    pen.setPenDown(owner, true); // sonraki cizgi
    await s.tick(600);
    const duringPen = s.logs.slice(mark).filter((l) => l.includes('storage:write')).length;
    pen.setPenDown(owner, false);
    await s.tick(1500);
    const lines = s.logs.slice(mark).filter((l) => l.includes('storage:write'));
    await s.unmount();
    return { duringPen, lines };
  };
  {
    const before = await notebookRun(BEFORE);
    assert.strictEqual(before.duringPen, 1, 'once: Notlarim kaydi kalem basiliyken yapildi');
    assert.ok(/penStr=1/.test(before.lines[0]), 'once: storage:write penStr=1 (cakisma)');
    const after = await notebookRun(undefined);
    assert.strictEqual(after.duringPen, 0, 'sonra: kalem basiliyken kayit yok');
    assert.strictEqual(after.lines.length, 1, 'sonra: kalem kalkinca tek kayit');
    assert.ok(/source=updateNotebookPage\[drawings\]/.test(after.lines[0]));
    assert.ok(/penStr=0/.test(after.lines[0]) && /penParse=0/.test(after.lines[0]), 'sonra: cakisma yok');
  }
  console.log('OK Test 7: Notlarim (gercek React) once kalem basiliyken yaziyordu, sonra ertelendi');

  markComplete();
  console.log('--- TUM KALEM ERTELEME TESTLERI GECTI ---');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
