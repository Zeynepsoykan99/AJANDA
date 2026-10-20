/**
 * ⚠️ GEÇİCİ — Faz 0 depolama ölçümü (utils/storageDiagnostics.js) testleri.
 * Ölçüm kaldırılınca bu dosya da silinir.
 *
 * Neden var: bulut yedekleme ve yerel depolama bölme kararları bu sayılara
 * dayanacak; yanlış ölçüm yanlış mimari karara götürür.
 *
 * Mantık kopyalanmaz: modül kaynaktan okunur, import satırları atılır ve
 * bağımlılıklar (AsyncStorage, FileSystem, dlog) sahteleriyle enjekte edilir.
 *
 * BU TESTİN KAPSAMADIĞI:
 *   - Android'in gerçek CursorWindow / SQLITE_FULL davranışı (sahte depo taklit eder)
 *   - expo-file-system'in databases/ dizinine okuma izni (yalnızca cihazda görülür)
 */

const assert = require('assert');
// Asenkron akis yarida kalirsa (sonsuz bekleme) 0 ile cikip gecmis gorunmesin
const markComplete = require('./helpers/completionGuard')(__filename);
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'utils', 'storageDiagnostics.js'), 'utf8');

const load = () => {
  const body = SRC.replace(/^import [\s\S]*?;$/gm, '')
    .replace(/export default [^;]*;/g, '')
    .replace(/export const /g, 'const ');
  // eslint-disable-next-line no-new-func
  return new Function(
    'Platform',
    'AUDIO_DIR',
    'BUILD_STAMP',
    'dlog',
    'AsyncStorage',
    'FileSystem',
    body +
      '\nreturn { utf8Bytes, decimalsOf, createStrokeStats, addStroke, collectPages, analyzePage, runStorageDiagnostics, CURSOR_WINDOW_BYTES, ANDROID_DB_LIMIT_BYTES };'
  )({ OS: 'android' }, 'file:///audio/', 'test-stamp', () => {}, null, null);
};

const D = load();

console.log('--- Faz 0 Depolama Olcumu Testleri ---');

// --- Test 1: UTF-8 bayt sayimi (SQLite UTF-8 tutar; JS length eksik sayar) ---
{
  assert.strictEqual(D.utf8Bytes('abc'), 3);
  assert.strictEqual(D.utf8Bytes('ğüş'), 6, 'Turkce harfler 2 bayt');
  assert.strictEqual(D.utf8Bytes('€'), 3, '3 baytlik karakter');
  assert.strictEqual(D.utf8Bytes('😀'), 4, 'vekil cift tek kod noktasi, 4 bayt');
  assert.strictEqual(D.utf8Bytes(null), 0);
  console.log('Test 1 gecti: UTF-8 bayt sayimi');
}

// --- Test 2: ondalik basamak sayimi ---
{
  assert.strictEqual(D.decimalsOf(12), 0);
  assert.strictEqual(D.decimalsOf(123.5), 1);
  assert.strictEqual(D.decimalsOf(123.66666412353516), 14);
  assert.strictEqual(D.decimalsOf(1e-7), 7, 'uslu gosterim');
  assert.strictEqual(D.decimalsOf(1.5e-7), 8);
  assert.strictEqual(D.decimalsOf('x'), 0);
  console.log('Test 2 gecti: ondalik basamak sayimi');
}

// --- Test 3: cizgi istatistigi d ve points'i ayri ve dogru sayiyor ---
{
  const stroke = {
    id: 'stroke_1',
    d: 'M 1 2 L 3 4',
    color: '#000',
    strokeWidth: 3,
    strokeOpacity: 0.95,
    points: [
      { x: 1.123, y: 2, timestamp: 0 },
      { x: 3.5, y: 4.25, timestamp: 8 },
    ],
  };
  const s = D.createStrokeStats();
  D.addStroke(s, stroke);
  assert.strictEqual(s.strokes, 1);
  assert.strictEqual(s.points, 2);
  assert.strictEqual(s.strokeBytes, JSON.stringify(stroke).length);
  assert.strictEqual(s.dBytes, 'M 1 2 L 3 4'.length);
  assert.strictEqual(s.pointsBytes, JSON.stringify(stroke.points).length);
  assert.strictEqual(
    s.pointsNoTsBytes,
    JSON.stringify([{ x: 1.123, y: 2 }, { x: 3.5, y: 4.25 }]).length,
    'timestamp cikarilmis boyut'
  );
  assert.strictEqual(
    s.pointsRounded2Bytes,
    JSON.stringify([{ x: 1.12, y: 2, timestamp: 0 }, { x: 3.5, y: 4.25, timestamp: 8 }]).length,
    '2 basamaga yuvarlanmis boyut'
  );
  assert.strictEqual(s.coords, 4);
  assert.strictEqual(s.decimalsMax, 3);
  assert.deepStrictEqual(s.decimalsHist, [1, 2, 1, 0], '0 | 1-2 | 3-6 | 7+');
  console.log('Test 3 gecti: d / points / ondalik ayrimi');
}

// --- Test 4: sayfa toplama uc anahtarin yapisini dogru okuyor ---
{
  const ajanda = D.collectPages('@ajanda_pages', [{ category: 'todo' }, { category: 'agenda' }]);
  assert.deepStrictEqual(ajanda.map((p) => p.label), ['todo/s1', 'agenda/s2']);

  const diary = D.collectPages('@ajanda_diary_v1', {
    coverDrawings: [{ id: 'c' }],
    pages: [{ pageId: 'a' }, { pageId: 'b' }],
  });
  assert.deepStrictEqual(diary.map((p) => p.label), ['gunluk/kapak', 'gunluk/s1', 'gunluk/s2']);

  const nbs = D.collectPages('@ajanda_notebooks_v1', [{ pages: [{}] }, { pages: [{}, {}] }]);
  assert.deepStrictEqual(nbs.map((p) => p.label), ['defter1/s1', 'defter2/s1', 'defter2/s2']);

  assert.deepStrictEqual(D.collectPages('@ajanda_theme', 'x'), [], 'defter disi anahtar sayfa uretmez');
  console.log('Test 4 gecti: sayfa toplama');
}

// --- Test 5: tam calisma — okunamayan anahtar raporlanir, HICBIR yazma yapilmaz ---
(async () => {
  const bigStroke = {
    id: 's',
    d: 'M 0 0',
    color: '#000',
    strokeWidth: 3,
    strokeOpacity: 1,
    points: [{ x: 0.123456789, y: 1, timestamp: 0 }],
  };
  const data = {
    '@ajanda_theme': 'pastel',
    '@ajanda_diary_v1': JSON.stringify({
      pages: [
        { pageId: 'p1', drawings: [bigStroke, bigStroke], audioNotes: [{ fileName: 'note_1.wav' }] },
        { pageId: 'p2', drawings: [], audioNotes: [{ fileName: 'kayip.wav' }] },
      ],
    }),
    '@ajanda_notebooks_v1': 'OKUNAMAZ',
  };
  const mutations = [];
  const fakeStorage = {
    getAllKeys: async () => Object.keys(data),
    getItem: async (k) => {
      if (k === '@ajanda_notebooks_v1') throw new Error('Row too big to fit into CursorWindow');
      return data[k];
    },
    setItem: async () => mutations.push('setItem'),
    removeItem: async () => mutations.push('removeItem'),
    multiSet: async () => mutations.push('multiSet'),
    multiRemove: async () => mutations.push('multiRemove'),
    mergeItem: async () => mutations.push('mergeItem'),
    clear: async () => mutations.push('clear'),
  };
  const files = { 'note_1.wav': 1920044, 'yetim.m4a': 500 };
  const fakeFs = {
    documentDirectory: 'file:///data/user/0/com.x/files/',
    getInfoAsync: async (uri) => {
      if (uri === 'file:///audio/') return { exists: true, isDirectory: true };
      if (uri.endsWith('/databases/RKStorage')) return { exists: true, size: 3 * 1024 * 1024 };
      if (uri.includes('/databases/')) return { exists: false };
      const name = uri.replace('file:///audio/', '');
      return name in files ? { exists: true, isDirectory: false, size: files[name] } : { exists: false };
    },
    readDirectoryAsync: async () => Object.keys(files),
    writeAsStringAsync: async () => mutations.push('writeAsStringAsync'),
    deleteAsync: async () => mutations.push('deleteAsync'),
    moveAsync: async () => mutations.push('moveAsync'),
    copyAsync: async () => mutations.push('copyAsync'),
  };
  const logged = [];
  const { lines, summary } = await D.runStorageDiagnostics({
    AsyncStorage: fakeStorage,
    FileSystem: fakeFs,
    audioDir: 'file:///audio/',
    platform: 'android',
    dlog: (label) => logged.push(label),
  });

  assert.deepStrictEqual(mutations, [], 'olcum HICBIR veri/dosya yazmamali: ' + mutations.join(','));
  assert.strictEqual(logged.length, lines.length, 'her satir dlog ile de yazilmali');
  assert.ok(summary.includes('storage:readError key=@ajanda_notebooks_v1'), 'okuma hatasi raporlanmali');
  assert.ok(/error=Row too big/.test(summary), 'hata mesaji korunmali');

  const diaryBytes = '@ajanda_diary_v1'.length + data['@ajanda_diary_v1'].length;
  assert.ok(summary.includes(`key=@ajanda_diary_v1 bytes=${diaryBytes} `), 'anahtar boyutu anahtar+deger UTF-8');

  const total = diaryBytes + '@ajanda_theme'.length + 'pastel'.length;
  assert.ok(summary.includes(`storage:total keys=3 valuesBytes=${total} `), 'toplam yalnizca okunabilenler');

  assert.ok(/storage:dbFile RKStorage=3145728 .*ofAndroidDbLimit=%50\.0/.test(summary), 'db dosyasi 6 MB\'a gore %50');
  assert.ok(/storage:largestPage key=@ajanda_diary_v1 page=gunluk\/s1 /.test(summary), 'en buyuk sayfa');
  assert.ok(/storage:strokes pages=2 strokes=2 .*avgPointsPerStroke=1\.0/.test(summary), 'cizgi sayilari');
  assert.ok(/storage:decimals coords=4 avg=4\.5 max=9 /.test(summary), 'ondalik ozeti (9,0,9,0)');
  assert.ok(
    /storage:audio dirExists=true files=2 total=1\.83MB .*referenced=2 missingFiles=1 unreferencedFiles=1/.test(summary),
    'ses taramasi: ' + lines.find((l) => l.startsWith('storage:audio'))
  );
  assert.ok(lines[lines.length - 1].startsWith('storage:done'), 'son satir done');
  console.log('Test 5 gecti: tam calisma, salt okunur, okuma hatasi raporlaniyor');
  console.log('\nTum depolama olcumu testleri gecti.');
  markComplete();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
