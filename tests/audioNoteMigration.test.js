/**
 * audioNoteMigration.test.js
 *
 * Sesli not veri modelinin (mutlak `uri` -> yalnizca `fileName`) ve gocun
 * dogrulugunu sinar.
 *
 * Amac: iOS'ta uygulama guncellemesiyle uygulama konteyner yolu degistiginde
 * kayitlarin bulunabilir kalmasi. Tam yol hicbir zaman saklanmaz; her okumada
 * o anki AUDIO_DIR ile yeniden kurulur.
 *
 * Mantik kopyalanmaz: gercek fonksiyonlar kaynak dosyalardan okunup calistirilir.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const audioSource = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'audioService.js'),
  'utf8'
);
const storageSource = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'storageService.js'),
  'utf8'
);

/** Kaynaktan bir fonksiyon govdesini cikarir */
const extract = (source, pattern, label) => {
  const match = pattern.exec(source);
  assert.ok(match, label + ' kaynakta bulunmali');
  return match[0];
};

console.log('--- Sesli Not Veri Modeli / Goc Testleri ---');

// Gercek fonksiyonlari sahte bir AUDIO_DIR ile calistir
const buildAudioApi = (audioDir) => {
  const getFileNameSrc = extract(
    audioSource,
    /export const getAudioFileName = \(value\) => \{[\s\S]*?\n\};/,
    'getAudioFileName'
  ).replace('export const getAudioFileName = ', '');

  const resolveSrc = extract(
    audioSource,
    /export const resolveAudioUri = \(audioNote\) => \{[\s\S]*?\n\};/,
    'resolveAudioUri'
  ).replace('export const resolveAudioUri = ', '');

  // eslint-disable-next-line no-new-func
  return new Function(
    'AUDIO_DIR',
    'const getAudioFileName = ' + getFileNameSrc + '\n' +
      'const resolveAudioUri = ' + resolveSrc + '\n' +
      'return { getAudioFileName, resolveAudioUri };'
  )(audioDir);
};

const IOS_DIR_BEFORE =
  'file:///var/mobile/Containers/Data/Application/AAAAAAAA-1111/Documents/audio_notes/';
const IOS_DIR_AFTER =
  'file:///var/mobile/Containers/Data/Application/BBBBBBBB-2222/Documents/audio_notes/';
const ANDROID_DIR = 'file:///data/user/0/com.zeynepsoykan.AJANDA/files/audio_notes/';

// --- Test 1: dosya adi cikarma ---
{
  const { getAudioFileName } = buildAudioApi(ANDROID_DIR);
  const cases = [
    [ANDROID_DIR + 'note_1.wav', 'note_1.wav'],
    [IOS_DIR_BEFORE + 'page_1_ab12.m4a', 'page_1_ab12.m4a'],
    ['note_2.wav', 'note_2.wav'],
    ['file:///a/b/x.caf?token=1', 'x.caf'],
    ['file:///a/b/x.wav#frag', 'x.wav'],
    ['', ''],
    [null, ''],
  ];
  cases.forEach(([input, expected]) => {
    assert.strictEqual(
      getAudioFileName(input),
      expected,
      'getAudioFileName(' + JSON.stringify(input) + ') === ' + JSON.stringify(expected) + ' olmali'
    );
  });
  console.log('OK Test 1: getAudioFileName ' + cases.length + ' senaryoda dogru dosya adini cikariyor');
}

// --- Test 2: YENI format (yalnizca fileName) cozumleniyor ---
{
  const { resolveAudioUri } = buildAudioApi(ANDROID_DIR);
  const note = { id: 'a1', fileName: 'note_1.wav', uri: null };
  assert.strictEqual(resolveAudioUri(note), ANDROID_DIR + 'note_1.wav');
  console.log('OK Test 2: yeni format (fileName) tam yola cozumleniyor');
}

// --- Test 3: ESKI format (mutlak uri) geriye donuk cozumleniyor ---
{
  const { resolveAudioUri } = buildAudioApi(ANDROID_DIR);
  const legacyNote = { id: 'a2', uri: ANDROID_DIR + 'eski_kayit.m4a' };
  assert.strictEqual(resolveAudioUri(legacyNote), ANDROID_DIR + 'eski_kayit.m4a');
  console.log('OK Test 3: eski format (mutlak uri) geriye donuk cozumleniyor');
}

// --- Test 4: iOS konteyner UUID'si degisse bile kayit bulunuyor (ASIL AMAC) ---
{
  const note = { id: 'a3', fileName: 'note_42.wav', uri: null };

  const before = buildAudioApi(IOS_DIR_BEFORE).resolveAudioUri(note);
  const after = buildAudioApi(IOS_DIR_AFTER).resolveAudioUri(note);

  assert.strictEqual(before, IOS_DIR_BEFORE + 'note_42.wav');
  assert.strictEqual(after, IOS_DIR_AFTER + 'note_42.wav');
  assert.notStrictEqual(before, after, 'iki kurulumda yol farkli olmali');

  // Eski model olsaydi: saklanan mutlak URI guncellemeden sonra ESKI UUID'yi
  // gostermeye devam ederdi ve dosya bulunamazdi.
  const legacyStored = IOS_DIR_BEFORE + 'note_42.wav';
  assert.ok(
    legacyStored.indexOf(IOS_DIR_AFTER) !== 0,
    'eski modelde saklanan mutlak URI guncelleme sonrasi gecersiz kalirdi'
  );
  console.log('OK Test 4: iOS konteyner UUID degisse bile kayit dogru yola cozumleniyor');
}

// --- Test 5: goc fonksiyonu eski kayitlari donusturuyor ---
{
  const { getAudioFileName } = buildAudioApi(ANDROID_DIR);

  const migrateNotesSrc = extract(
    storageSource,
    /const migrateAudioNotes = \(audioNotes\) => \{[\s\S]*?\n\};/,
    'migrateAudioNotes'
  ).replace('const migrateAudioNotes = ', '');

  const migratePagesSrc = extract(
    storageSource,
    /const migrateAudioNotesInPages = \(pages\) => \{[\s\S]*?\n\};/,
    'migrateAudioNotesInPages'
  ).replace('const migrateAudioNotesInPages = ', '');

  // eslint-disable-next-line no-new-func
  const api = new Function(
    'AudioService',
    'const migrateAudioNotes = ' + migrateNotesSrc + '\n' +
      'const migrateAudioNotesInPages = ' + migratePagesSrc + '\n' +
      'return { migrateAudioNotes, migrateAudioNotesInPages };'
  )({ getAudioFileName });

  // 5a. Eski formatli kayit donusuyor
  const legacy = [{ id: 'n1', uri: ANDROID_DIR + 'eski.m4a', transcript: 'merhaba' }];
  const r1 = api.migrateAudioNotes(legacy);
  assert.strictEqual(r1.changed, true, 'eski kayit icin changed=true olmali');
  assert.strictEqual(r1.audioNotes[0].fileName, 'eski.m4a');
  assert.strictEqual(r1.audioNotes[0].uri, null, 'goc sonrasi mutlak uri temizlenmeli');
  assert.strictEqual(r1.audioNotes[0].transcript, 'merhaba', 'diger alanlar korunmali');

  // 5b. Yeni formatli kayit degismiyor (tekrar tekrar yazma olmasin)
  const modern = [{ id: 'n2', fileName: 'yeni.wav', uri: null }];
  const r2 = api.migrateAudioNotes(modern);
  assert.strictEqual(r2.changed, false, 'yeni format icin changed=false olmali');
  assert.strictEqual(r2.audioNotes, modern, 'degisiklik yoksa ayni referans donmeli');

  // 5c. Karisik sayfa dizisi
  const pages = [
    { id: 'p1', audioNotes: [{ id: 'n3', uri: ANDROID_DIR + 'a.wav' }] },
    { id: 'p2', audioNotes: [{ id: 'n4', fileName: 'b.wav', uri: null }] },
    { id: 'p3' },
  ];
  const r3 = api.migrateAudioNotesInPages(pages);
  assert.strictEqual(r3.changed, true);
  assert.strictEqual(r3.pages[0].audioNotes[0].fileName, 'a.wav');
  assert.strictEqual(r3.pages[1], pages[1], 'zaten yeni formatta olan sayfa ayni kalmali');
  assert.strictEqual(r3.pages[2], pages[2], 'sesli notu olmayan sayfa ayni kalmali');

  // 5d. Bos/gecersiz girdiler
  assert.strictEqual(api.migrateAudioNotes([]).changed, false);
  assert.strictEqual(api.migrateAudioNotes(undefined).changed, false);
  assert.strictEqual(api.migrateAudioNotesInPages([]).changed, false);

  console.log('OK Test 5: goc eski kayitlari donusturuyor, yeni kayitlari oldugu gibi birakiyor');
}

// --- Test 6: goc okuma noktalarina baglanmis olmali ---
{
  assert.ok(
    /const audioMigration = migrateAudioNotesInPages\(notebook\.pages\);/.test(storageSource),
    'Goc, normalizeNotebook icinde cagrilmali (gunluk + defterler)'
  );
  assert.ok(
    /const \{ pages, changed \} = migrateAudioNotesInPages\(parsed\);/.test(storageSource),
    'Goc, getPages icinde cagrilmali (ajanda + to-do)'
  );
  assert.ok(
    /await AsyncStorage\.setItem\(KEYS\.PAGES, JSON\.stringify\(pages\)\);/.test(storageSource),
    'getPages, goc sonrasi sonucu diske yazmali'
  );
  console.log('OK Test 6: goc tum okuma noktalarina bagli ve sonucu kaliciliyor');
}

// --- Test 7: tum okuma noktalari cozumleyiciyi kullanmali ---
{
  const readPoints = [
    ['components/audio/AudioNotePlayer.js', /resolveAudioUri\(audioNote\)/],
    ['app/ajandam/[pageId].js', /AudioService\.resolveAudioUri\(audioNote\)/],
    ['app/todolist/[pageId].js', /AudioService\.resolveAudioUri\(audioNote\)/],
    ['components/notebook/NotebookPagesView.js', /AudioService\.resolveAudioUri\(audioNote\)/],
  ];
  readPoints.forEach(([file, pattern]) => {
    const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(pattern.test(content), file + ' resolveAudioUri kullanmali');
    assert.ok(
      !/audioNote\.uri,\s*\{ language/.test(content),
      file + ' icinde ham audioNote.uri ile transkripsiyon cagrisi kalmamali'
    );
  });
  console.log('OK Test 7: tum okuma noktalari tam yolu resolveAudioUri ile kuruyor');
}

// --- Test 8: yazma noktasi yeni modeli kaydetmeli ---
{
  const modal = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'audio', 'AudioRecorderModal.js'),
    'utf8'
  );
  assert.ok(/fileName: saved\?\.fileName \|\| null,/.test(modal), 'Kayit fileName yazmali');
  assert.ok(
    /uri: saved\?\.isPersistent \? null : saved\?\.uri \|\| null,/.test(modal),
    'Mutlak uri yalnizca kalici tasima basarisizsa saklanmali'
  );
  console.log('OK Test 8: kayit noktasi yeni veri modelini yaziyor');
}

console.log('--- TUM VERI MODELI / GOC TESTLERI BASARIYLA GECTI! ---');
