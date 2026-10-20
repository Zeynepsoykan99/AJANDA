/**
 * ⚠️ GEÇİCİ ARAÇ — "Veriyi yedekle" (utils/storageBackup.js) testleri.
 * Araç kaldırılsa bile dosya biçimi kalıcı yedeğin temeli olacağı için gidiş-dönüş
 * testleri o özelliğe taşınmalı.
 *
 * Mantık kopyalanmaz: modül gerçek kaynaktan babel ile yüklenir; AsyncStorage ve
 * dosya sistemi bellek içi sahteleriyle enjekte edilir.
 *
 * BU TESTİN KAPSAMADIĞI:
 *   - Cihazda expo-file-system'in gerçek yazma/okuma davranışı ve disk dolu durumu
 *   - expo-sharing ile paylaşım ve paylaşım öncesi uyarı penceresi (ekran kodu)
 *   - Gerçek cihaz belleğinde büyük yedeğin tepe kullanımı (yalnızca boyut sınırı denetlenir)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = path.join(__dirname, '..');

// Asenkron akis yarida kalirsa (sonsuz bekleme) 0 ile cikip gecmis gorunmesin
const markComplete = require('./helpers/completionGuard')(__filename);

const loadBackup = () => {
  const code = babel.transformSync(fs.readFileSync(path.join(ROOT, 'utils', 'storageBackup.js'), 'utf8'), {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const fakes = {
    '@react-native-async-storage/async-storage': { __esModule: true, default: null },
    'expo-file-system/legacy': {},
    'expo-constants': { __esModule: true, default: { expoConfig: { version: '9.9.9' } } },
    'react-native': { Platform: { OS: 'android' } },
    '../services/audioService': { AUDIO_DIR: 'file:///doc/audio_notes/' },
    './storageFaultInjection': { shouldFailRead: () => false },
  };
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', code)(module, module.exports, (id) => {
    if (!(id in fakes)) throw new Error('beklenmeyen require: ' + id);
    return fakes[id];
  });
  return module.exports;
};

const B = loadBackup();

/** Sahte AsyncStorage: tüm değiştirici metotlar kaydedilir (salt okunurluk kanıtı) */
const createStorage = (data, unreadable = []) => {
  const mutations = [];
  const api = {
    getAllKeys: async () => Object.keys(data),
    getItem: async (k) => {
      if (unreadable.includes(k)) throw new Error('Row too big to fit into CursorWindow');
      return k in data ? data[k] : null;
    },
  };
  ['setItem', 'removeItem', 'multiSet', 'multiRemove', 'mergeItem', 'multiMerge', 'clear'].forEach((m) => {
    api[m] = async () => mutations.push(m);
  });
  return { api, mutations };
};

/** Sahte dosya sistemi (bellek içi); yazma bozma / hata taklidi */
const createFs = ({ audio = {}, corruptWrite = null, failWrite = false } = {}) => {
  const files = new Map();
  const dirs = new Set(['file:///doc/', 'file:///doc/audio_notes/']);
  const writes = [];
  const api = {
    documentDirectory: 'file:///doc/',
    getInfoAsync: async (uri) => {
      if (dirs.has(uri)) return { exists: true, isDirectory: true };
      const name = uri.replace('file:///doc/audio_notes/', '');
      if (uri.startsWith('file:///doc/audio_notes/') && name in audio) return { exists: true, isDirectory: false, size: audio[name] };
      if (files.has(uri)) return { exists: true, isDirectory: false, size: files.get(uri).length };
      return { exists: false };
    },
    makeDirectoryAsync: async (uri) => {
      writes.push(['mkdir', uri]);
      dirs.add(uri);
    },
    readDirectoryAsync: async (uri) => (uri === 'file:///doc/audio_notes/' ? Object.keys(audio) : []),
    writeAsStringAsync: async (uri, text) => {
      writes.push(['write', uri]);
      if (failWrite) throw new Error('disk dolu');
      files.set(uri, corruptWrite ? corruptWrite(text) : text);
    },
    readAsStringAsync: async (uri) => {
      if (!files.has(uri)) throw new Error('dosya yok');
      return files.get(uri);
    },
    deleteAsync: async (uri) => writes.push(['delete', uri]),
    moveAsync: async (o) => writes.push(['move', o?.to]),
    copyAsync: async (o) => writes.push(['copy', o?.to]),
  };
  return { api, files, writes };
};

const FIXED_NOW = () => new Date('2026-10-20T10:11:12Z');

// Gerçekçi ve zorlayıcı değerler: Türkçe, emoji, kaçış karakterleri, bozuk JSON, boş metin
const DATA = {
  '@ajanda_pages': JSON.stringify([{ id: 'a', textBlocks: [{ text: 'Çağrı "tırnak" \\ ters\nsatır 😀' }] }]),
  '@ajanda_diary_v1': JSON.stringify({ id: 'my_diary', pages: [{ pageId: 'p1', drawings: [{ points: [{ x: 1.123456789, y: 2 }] }] }] }),
  '@ajanda_notebooks_v1': '[{"id":"nb1"', // bozuk JSON da birebir korunmalı
  '@ajanda_theme': 'pastel',
  '@ajanda_empty': '',
};

console.log('--- Veri Yedegi Testleri ---');

(async () => {
  // --- Test 1: gidiş-dönüş — her anahtar birebir geri kurulabiliyor ---
  {
    const storage = createStorage(DATA);
    const fsx = createFs({ audio: { 'note_1.wav': 1920044, 'note_2.m4a': 960000 } });
    const r = await B.runStorageBackup({ AsyncStorage: storage.api, FileSystem: fsx.api, now: FIXED_NOW, platform: 'android' });
    assert.strictEqual(r.ok, true, 'yedek basarili olmali: ' + r.reason);
    assert.strictEqual(r.verified, true);
    assert.strictEqual(r.fileUri, 'file:///doc/backups/ajanda-backup-' + (() => {
      const d = FIXED_NOW();
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    })() + '.json');
    assert.strictEqual(r.keyCount, Object.keys(DATA).length);

    const backup = B.parseBackupText(fsx.files.get(r.fileUri));
    assert.strictEqual(backup.format, 'ajanda-backup');
    assert.strictEqual(backup.schemaVersion, 1);
    assert.strictEqual(backup.createdAt, '2026-10-20T10:11:12.000Z');
    assert.deepStrictEqual(backup.app, { version: '9.9.9', platform: 'android' });
    assert.strictEqual(backup.encryption, 'none');
    assert.deepStrictEqual(backup.unreadableKeys, []);
    assert.deepStrictEqual(backup.audio, {
      dir: 'audio_notes/',
      files: [{ name: 'note_1.wav', bytes: 1920044 }, { name: 'note_2.m4a', bytes: 960000 }],
    });
    assert.deepStrictEqual(B.extractKeyValues(backup), DATA, 'her anahtar BIREBIR geri kurulmali');
    assert.strictEqual(backup.keys['@ajanda_pages'].bytes, Buffer.byteLength(DATA['@ajanda_pages'], 'utf8'));
    console.log('OK Test 1: gidis-donus birebir (Turkce, emoji, kacis, bozuk JSON, bos metin), bicim alanlari dogru');
  }

  // --- Test 2: salt okunur — AsyncStorage'da hiçbir değişiklik yok, FS'te yalnızca backups/ ---
  {
    const storage = createStorage(DATA);
    const fsx = createFs();
    await B.runStorageBackup({ AsyncStorage: storage.api, FileSystem: fsx.api, now: FIXED_NOW });
    assert.deepStrictEqual(storage.mutations, [], 'AsyncStorage degistirilmemeli: ' + storage.mutations.join(','));
    fsx.writes.forEach(([op, uri]) => {
      assert.ok(['mkdir', 'write'].includes(op), 'yalnizca klasor olusturma ve yazma: ' + op);
      assert.ok(String(uri).startsWith('file:///doc/backups/'), 'yalnizca backups/ altina: ' + uri);
    });
    console.log('OK Test 2: AsyncStorage\'a hic yazma/silme yok; dosya sisteminde yalnizca backups/');
  }

  // --- Test 3: okunamayan anahtar atlanır, dosyada ve sonuçta açıkça listelenir ---
  {
    const storage = createStorage(DATA, ['@ajanda_diary_v1']);
    const fsx = createFs();
    const r = await B.runStorageBackup({ AsyncStorage: storage.api, FileSystem: fsx.api, now: FIXED_NOW });
    assert.strictEqual(r.ok, true, 'okunabilenler yedeklenmeli');
    assert.deepStrictEqual(r.unreadable, [{ key: '@ajanda_diary_v1', error: 'Row too big to fit into CursorWindow' }]);
    const backup = B.parseBackupText(fsx.files.get(r.fileUri));
    assert.deepStrictEqual(backup.unreadableKeys, r.unreadable, 'dosyada da listelenmeli');
    assert.ok(!('@ajanda_diary_v1' in backup.keys), 'okunamayan anahtar yedekte olmamali');
    assert.strictEqual(r.keyCount, Object.keys(DATA).length - 1);

    // Hata enjeksiyonu kancası da aynı yolu kullanır
    const r2 = await B.runStorageBackup({
      AsyncStorage: createStorage(DATA).api,
      FileSystem: createFs().api,
      now: FIXED_NOW,
      shouldFailRead: (k) => k === '@ajanda_pages',
    });
    assert.strictEqual(r2.unreadable[0].key, '@ajanda_pages');
    assert.ok(/HATA ENJEKSİYONU/.test(r2.unreadable[0].error));
    console.log('OK Test 3: okunamayan anahtar atlaniyor, dosyada ve sonucta hata metniyle listeleniyor');
  }

  // --- Test 4: doğrulama başarısızlığı — "yedek alındı" denmez ---
  {
    const cases = [
      ['deger bozuldu', (t) => t.replace('pastel', 'pastal')],
      ['dosya kesildi', (t) => t.slice(0, Math.floor(t.length / 2))],
      ['anahtar silindi', (t) => t.replace(/"@ajanda_theme":\{[^}]*\},?/, '')],
    ];
    for (const [label, corrupt] of cases) {
      const fsx = createFs({ corruptWrite: corrupt });
      const r = await B.runStorageBackup({ AsyncStorage: createStorage(DATA).api, FileSystem: fsx.api, now: FIXED_NOW });
      assert.strictEqual(r.ok, false, label + ': basarisiz sayilmali');
      assert.strictEqual(r.verified, false, label + ': dogrulanmis sayilmamali');
      assert.ok(/^doğrulama başarısız/.test(r.reason), label + ': neden acik olmali: ' + r.reason);
    }
    const r = await B.runStorageBackup({ AsyncStorage: createStorage(DATA).api, FileSystem: createFs({ failWrite: true }).api, now: FIXED_NOW });
    assert.strictEqual(r.ok, false);
    assert.ok(/^dosya yazılamadı/.test(r.reason));
    console.log('OK Test 4: bozuk/kesik/eksik dosya ve yazma hatasi basarisiz sayiliyor');
  }

  // --- Test 5: boyut — ~7 MB gidiş-dönüş, sınır aşımında yazılmıyor ---
  {
    const big = JSON.stringify([{ id: 'x', drawings: [{ d: 'M '.repeat(1), points: 'ğ'.repeat(3.5 * 1024 * 1024) }] }]);
    const data = { '@ajanda_pages': big, '@ajanda_diary_v1': '{"a":"' + 'b'.repeat(3 * 1024 * 1024) + '"}' };
    const fsx = createFs();
    const t0 = Date.now();
    const r = await B.runStorageBackup({ AsyncStorage: createStorage(data).api, FileSystem: fsx.api, now: FIXED_NOW });
    const ms = Date.now() - t0;
    assert.strictEqual(r.ok, true, 'buyuk veri yedeklenmeli: ' + r.reason);
    assert.ok(r.totalBytes > 10 * 1024 * 1024, '>10 MB UTF-8 (ğ 2 bayt)');
    assert.deepStrictEqual(B.extractKeyValues(B.parseBackupText(fsx.files.get(r.fileUri))), data);

    const fsSmall = createFs();
    const r2 = await B.runStorageBackup({ AsyncStorage: createStorage(data).api, FileSystem: fsSmall.api, now: FIXED_NOW, maxChars: 1024 * 1024 });
    assert.strictEqual(r2.ok, false);
    assert.ok(/^yedek çok büyük/.test(r2.reason), r2.reason);
    assert.strictEqual(fsSmall.files.size, 0, 'sinir asilinca dosya yazilmamali');
    console.log(`OK Test 5: ${(r.chars / 1048576).toFixed(1)} M karakterlik yedek gidis-donus (${ms} ms, Node); sinir asiminda yazilmiyor`);
  }

  // --- Test 6: biçim okuyucusu yanlış biçimi reddediyor; özet küçük farkı yakalıyor ---
  {
    assert.throws(() => B.parseBackupText('{"format":"baska","schemaVersion":1,"keys":{}}'), /tanınmadı/);
    assert.throws(() => B.parseBackupText('{"format":"ajanda-backup","schemaVersion":2,"keys":{}}'), /schemaVersion/);
    assert.notStrictEqual(B.checksum('abc'), B.checksum('abd'));
    assert.strictEqual(B.checksum('abc'), B.checksum('abc'));
    assert.strictEqual(B.utf8Bytes('ğ😀'), 6);
    console.log('OK Test 6: yanlis bicim/surum reddediliyor; ozet kararli ve ayirt edici');
  }

  markComplete();
  console.log('--- TUM VERI YEDEGI TESTLERI GECTI ---');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
