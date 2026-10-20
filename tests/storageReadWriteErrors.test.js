/**
 * storageReadWriteErrors.test.js
 *
 * Depolama okuma/yazma hatalarinda VERI KAYBI OLMADIGINI dogrular.
 *
 * Neden var: Android'de AsyncStorage ~2 MB'i asan bir satiri okuyamiyor
 * ("Row too big to fit into CursorWindow") ve veritabani 6 MB'a ulasinca yazamiyor.
 * Eski kodda okuma hatasi BOS LISTE olarak donuyordu; ardindan gelen addPage /
 * deletePage / reorderPages bu bos listeyi diske yazip TUM Ajandam ve
 * Yapilacaklar sayfalarini kalici olarak siliyordu. Yazma hatasi da yutuluyor,
 * kullanici kaydin yapilmadigini hic fark etmiyordu.
 *
 * Mantik kopyalanmaz: services/storageService.js ve services/storageErrorEvents.js
 * GERCEK kaynaktan babel ile CommonJS'e cevrilip sahte AsyncStorage ile calistirilir.
 * Eski davranisin kaniti icin storageService.js'in duzeltme ONCESI hali git'ten
 * (54ed7b9a) okunur.
 *
 * BU TESTIN KAPSAMADIGI:
 *   - Android'in gercek CursorWindow / SQLITE_FULL davranisi (sahte depo taklit eder;
 *     kutuphanenin hatayi promise reddi olarak verdigi kaynaktan okunarak dogrulandi)
 *   - Ekranlarin hata durumunu gercekten cizmesi ve banner'in gorunmesi (React render
 *     edilmez; ekran tarafi icin pendingSaveFlush.test.js 5b ve cihazda elle test)
 *   - Tema, dil, ajanda kapagi (@ajanda_cover) ve son cizim rengi metotlari:
 *     bunlar bu turda DEGISTIRILMEDI, hatalari hala yutuluyor
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const babel = require('@babel/core');

const ROOT = path.join(__dirname, '..');
const OLD_REVISION = '54ed7b9a';

const toCjs = (source, filename) =>
  babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    filename,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;

const runModule = (code, requireFn) => {
  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', code)(module, module.exports, requireFn);
  return module.exports;
};

/** Sahte AsyncStorage: anahtar bazinda okuma hatasi ve genel yazma hatasi taklidi */
const createFakeStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  const state = { readFailKeys: new Set(), failWrites: false, writes: [] };
  const api = {
    async getItem(key) {
      if (state.readFailKeys.has(key)) {
        throw new Error('Row too big to fit into CursorWindow requiredPos=0, totalRows=1');
      }
      return data.has(key) ? data.get(key) : null;
    },
    async setItem(key, value) {
      if (state.failWrites) throw new Error('database or disk is full (code 13 SQLITE_FULL)');
      state.writes.push(key);
      data.set(key, value);
    },
  };
  return { api, data, state, json: (key) => JSON.parse(data.get(key)) };
};

/**
 * storageService'i verilen kaynakla yukler. storageErrorEvents her zaman GUNCEL
 * kaynaktan gelir (eski surum onu hic import etmiyor).
 */
const loadService = (serviceSource, fake) => {
  const deletedAudio = [];
  const cancelledNotifications = [];
  const eventsCode = toCjs(
    fs.readFileSync(path.join(ROOT, 'services', 'storageErrorEvents.js'), 'utf8'),
    'storageErrorEvents.js'
  );
  const events = runModule(eventsCode, () => {
    throw new Error('storageErrorEvents bagimlilik almamali');
  });
  const fakes = {
    '@react-native-async-storage/async-storage': { __esModule: true, default: fake.api },
    './notificationService.js': {
      NotificationService: {
        cancelScheduledNotification: async (id) => cancelledNotifications.push(id),
      },
    },
    './audioService.js': {
      AudioService: {
        getAudioFileName: (uri) => String(uri || '').split('/').pop(),
        deleteAudioFiles: async (notes) => deletedAudio.push(...notes.map((n) => n.fileName)),
      },
    },
    './storageErrorEvents.js': events,
  };
  const service = runModule(toCjs(serviceSource, 'storageService.js'), (id) => {
    if (!(id in fakes)) throw new Error('beklenmeyen require: ' + id);
    return fakes[id];
  });
  return { StorageService: service.StorageService, events, deletedAudio, cancelledNotifications };
};

const NEW_SOURCE = fs.readFileSync(path.join(ROOT, 'services', 'storageService.js'), 'utf8');
let OLD_SOURCE;
try {
  OLD_SOURCE = execSync(`git show ${OLD_REVISION}:services/storageService.js`, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (e) {
  throw new Error(`Eski surum git'ten okunamadi (${OLD_REVISION}); bu test git deposu icinde calismali.`);
}

const PAGES = '@ajanda_pages';
const DIARY = '@ajanda_diary_v1';
const NOTEBOOKS = '@ajanda_notebooks_v1';

const threePages = () => JSON.stringify([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
const diaryValue = () =>
  JSON.stringify({
    id: 'my_diary',
    title: 'Gunluk',
    paperTemplateId: 'blank_lined',
    pages: [
      { pageId: 'p1', pageNumber: 1, createdAt: '2026-01-01', mood: null, paperTemplateId: 'blank_lined', drawings: [] },
      { pageId: 'p2', pageNumber: 2, createdAt: '2026-01-02', mood: null, paperTemplateId: 'blank_lined', drawings: [] },
    ],
  });
const notebooksValue = () =>
  JSON.stringify([
    {
      id: 'nb1',
      title: 'Defter',
      pages: [
        { pageId: 'q1', pageNumber: 1, createdAt: '2026-01-01', mood: null, paperTemplateId: 'blank_lined', drawings: [] },
        { pageId: 'q2', pageNumber: 2, createdAt: '2026-01-02', mood: null, paperTemplateId: 'blank_lined', drawings: [] },
      ],
    },
  ]);

const rejectsWith = async (promise, code, label) => {
  let error = null;
  try {
    await promise;
  } catch (e) {
    error = e;
  }
  assert.ok(error, label + ': hata firlatmaliydi');
  assert.strictEqual(error.code, code, label + ': hata kodu ' + code + ' olmali, gelen: ' + error.message);
  return error;
};

// Beklenen uyari satirlari (goc yazilamadi vb.) cikti kalabaligi yapmasin
console.warn = () => {};

// Bir await sonsuza dek beklerse (ornegin kilit kuyrugu kilitlenirse) Node olay
// dongusu bosalip 0 koduyla cikar ve test sessizce "gecmis" gorunur. Son satira
// ulasilmadiysa cikis kodu zorla basarisiz yapilir.
let finished = false;
process.on('exit', () => {
  if (!finished) {
    console.error('HATA: testler tamamlanmadi (bir islem sonsuza dek bekledi — kilit kuyrugu kilitlenmis olabilir)');
    process.exitCode = 1;
  }
});

console.log('--- Depolama Okuma/Yazma Hatasi Testleri ---');

(async () => {
  // --- Test 1: ESKI surum okuma hatasinda TUM sayfalari siliyordu (kanit) ---
  {
    const fake = createFakeStorage({ [PAGES]: threePages() });
    const { StorageService } = loadService(OLD_SOURCE, fake);
    fake.state.readFailKeys.add(PAGES);
    const listed = await StorageService.getPages();
    assert.deepStrictEqual(listed, [], 'ESKI: okunamayan liste bos gorunuyordu');
    await StorageService.addPage({ id: 'yeni' });
    assert.deepStrictEqual(fake.json(PAGES), [{ id: 'yeni' }], 'ESKI: addPage a,b,c sayfalarini SILIYORDU');

    const fake2 = createFakeStorage({ [PAGES]: threePages() });
    const old2 = loadService(OLD_SOURCE, fake2).StorageService;
    fake2.state.readFailKeys.add(PAGES);
    await old2.deletePage('b');
    assert.deepStrictEqual(fake2.json(PAGES), [], 'ESKI: deletePage tum listeyi bos yaziyordu');

    const fake3 = createFakeStorage({ [PAGES]: threePages() });
    const old3 = loadService(OLD_SOURCE, fake3).StorageService;
    fake3.state.readFailKeys.add(PAGES);
    await old3.reorderPages(['a', 'b', 'c']);
    assert.deepStrictEqual(fake3.json(PAGES), [], 'ESKI: reorderPages tum listeyi bos yaziyordu');

    // Eski yazma hatasi: firlatmiyor, null donuyordu -> ekran fark etmiyordu
    const fake4 = createFakeStorage({ [PAGES]: threePages() });
    const old4 = loadService(OLD_SOURCE, fake4).StorageService;
    fake4.state.failWrites = true;
    const r = await old4.updatePage('a', { drawings: ['x'] });
    assert.strictEqual(r, null, 'ESKI: yazma hatasi yutulup null donuyordu');
    console.log('OK Test 1: eski surum okuma hatasinda tum sayfalari siliyor, yazma hatasini yutuyordu');
  }

  // --- Test 2: YENI surum okuma hatasinda HICBIR yazma yapmiyor ---
  {
    const ops = [
      ['getPages', (s) => s.getPages()],
      ['addPage', (s) => s.addPage({ id: 'yeni' })],
      ['updatePage', (s) => s.updatePage('a', { drawings: ['x'] })],
      ['deletePage', (s) => s.deletePage('b')],
      ['reorderPages', (s) => s.reorderPages(['a', 'b', 'c'])],
    ];
    for (const [name, op] of ops) {
      const fake = createFakeStorage({ [PAGES]: threePages() });
      const { StorageService } = loadService(NEW_SOURCE, fake);
      fake.state.readFailKeys.add(PAGES);
      await rejectsWith(op(StorageService), 'STORAGE_READ_FAILED', name);
      assert.deepStrictEqual(fake.state.writes, [], name + ': okuma hatasinda yazma OLMAMALI');
      fake.state.readFailKeys.clear();
      assert.strictEqual(fake.data.get(PAGES), threePages(), name + ': diskteki veri aynen kalmali');
    }
    console.log('OK Test 2: yeni surum okuma hatasinda tipli hata firlatiyor, hicbir yazma yok');
  }

  // --- Test 3: bozuk JSON ve beklenmeyen yapi da okuma hatasi sayiliyor ---
  {
    for (const [label, raw] of [['bozuk JSON', '[{"id":"a"'], ['dizi degil', '{"id":"a"}']]) {
      const fake = createFakeStorage({ [PAGES]: raw });
      const { StorageService } = loadService(NEW_SOURCE, fake);
      await rejectsWith(StorageService.addPage({ id: 'yeni' }), 'STORAGE_READ_FAILED', label);
      assert.deepStrictEqual(fake.state.writes, [], label + ': uzerine yazilmamali');
      assert.strictEqual(fake.data.get(PAGES), raw, label + ': ham veri korunmali');
    }
    console.log('OK Test 3: bozuk JSON / yanlis yapi okuma hatasi, ham veri korunuyor');
  }

  // --- Test 4: anahtar YOK (null) -> bos liste / varsayilan; yazma normal ---
  {
    const fake = createFakeStorage({});
    const { StorageService } = loadService(NEW_SOURCE, fake);
    assert.deepStrictEqual(await StorageService.getPages(), [], 'anahtar yokken bos liste');
    await StorageService.addPage({ id: 'ilk' });
    assert.deepStrictEqual(fake.json(PAGES), [{ id: 'ilk' }], 'anahtar yokken ilk sayfa yazilmali');

    const diary = await StorageService.getDiary();
    assert.strictEqual(diary.id, 'my_diary', 'gunluk yokken varsayilan olusturulmali');
    assert.ok(fake.state.writes.includes(DIARY), 'varsayilan gunluk diske yazilmali');

    assert.deepStrictEqual(await StorageService.getNotebooks(), [], 'defter yokken bos liste');
    assert.ok(!fake.state.writes.includes(NOTEBOOKS), 'bos defter listesi icin yazma olmamali');
    console.log('OK Test 4: anahtar yok durumu bos liste / varsayilan kayitla calisiyor');
  }

  // --- Test 5: yazma hatasi cagirana iletiliyor, eski veri ve yan etkiler korunuyor ---
  {
    const pagesWithAudio = JSON.stringify([
      { id: 'a', audioNotes: [{ fileName: 'a.wav' }], reminder: { notificationId: 'n1' } },
    ]);
    const fake = createFakeStorage({ [PAGES]: pagesWithAudio });
    const { StorageService, deletedAudio, cancelledNotifications } = loadService(NEW_SOURCE, fake);
    fake.state.failWrites = true;
    await rejectsWith(StorageService.updatePage('a', { drawings: ['x'] }), 'STORAGE_WRITE_FAILED', 'updatePage');
    await rejectsWith(StorageService.deletePage('a'), 'STORAGE_WRITE_FAILED', 'deletePage');
    assert.strictEqual(fake.data.get(PAGES), pagesWithAudio, 'yazma hatasinda eski deger kalmali');
    assert.deepStrictEqual(deletedAudio, [], 'silme yazilamadiysa ses dosyasi SILINMEMELI');
    assert.deepStrictEqual(cancelledNotifications, [], 'silme yazilamadiysa hatirlatici iptal EDILMEMELI');

    fake.state.failWrites = false;
    await StorageService.deletePage('a');
    assert.deepStrictEqual(deletedAudio, ['a.wav'], 'basarili silmede ses dosyasi silinmeli');
    assert.deepStrictEqual(cancelledNotifications, ['n1'], 'basarili silmede hatirlatici iptal edilmeli');

    // Gunluk ve defter sayfasi silmede de ayni sira
    const diaryWithAudio = JSON.parse(diaryValue());
    diaryWithAudio.pages[1].audioNotes = [{ fileName: 'g.wav' }];
    const nbWithAudio = JSON.parse(notebooksValue());
    nbWithAudio[0].pages[1].audioNotes = [{ fileName: 'd.wav' }];
    const fake2 = createFakeStorage({ [DIARY]: JSON.stringify(diaryWithAudio), [NOTEBOOKS]: JSON.stringify(nbWithAudio) });
    const s2 = loadService(NEW_SOURCE, fake2);
    fake2.state.failWrites = true;
    await rejectsWith(s2.StorageService.deleteDiaryPage('p2'), 'STORAGE_WRITE_FAILED', 'deleteDiaryPage');
    await rejectsWith(s2.StorageService.deleteNotebookPage('nb1', 'q2'), 'STORAGE_WRITE_FAILED', 'deleteNotebookPage');
    await rejectsWith(s2.StorageService.deleteNotebook('nb1'), 'STORAGE_WRITE_FAILED', 'deleteNotebook');
    assert.deepStrictEqual(s2.deletedAudio, [], 'gunluk/defter silmesi yazilamadiysa ses dosyalari kalmali');
    fake2.state.failWrites = false;
    await s2.StorageService.deleteDiaryPage('p2');
    await s2.StorageService.deleteNotebookPage('nb1', 'q2');
    assert.deepStrictEqual(s2.deletedAudio, ['g.wav', 'd.wav'], 'basarili silmede ses dosyalari silinmeli');
    console.log('OK Test 5: yazma hatasi iletiliyor; eski veri, ses dosyalari ve hatirlatici korunuyor');
  }

  // --- Test 6: Gunluk ve Notlarim okuma hatasinda yazmiyor (ESKI ve YENI) ---
  // Rapordaki "zaten yazmiyorlar" iddiasi varsayilmadi: eski surumde de olculuyor.
  {
    const diaryOps = [
      ['getDiary', (s) => s.getDiary()],
      ['updateDiaryMeta', (s) => s.updateDiaryMeta({ title: 'Yeni' })],
      ['addDiaryPage', (s) => s.addDiaryPage({})],
      ['updateDiaryPage', (s) => s.updateDiaryPage('p1', { drawings: ['x'] })],
      ['deleteDiaryPage', (s) => s.deleteDiaryPage('p1')],
      ['restoreDiaryPage', (s) => s.restoreDiaryPage({ pageId: 'p9' }, 0)],
    ];
    const notebookOps = [
      ['getNotebooks', (s) => s.getNotebooks()],
      ['getNotebook', (s) => s.getNotebook('nb1')],
      ['createNotebook', (s) => s.createNotebook({ title: 'Yeni' })],
      ['updateNotebookMeta', (s) => s.updateNotebookMeta('nb1', { title: 'Yeni' })],
      ['toggleNotebookPin', (s) => s.toggleNotebookPin('nb1')],
      ['deleteNotebook', (s) => s.deleteNotebook('nb1')],
      ['restoreNotebook', (s) => s.restoreNotebook({ id: 'nb9', pages: [] })],
      ['addNotebookPage', (s) => s.addNotebookPage('nb1', {})],
      ['updateNotebookPage', (s) => s.updateNotebookPage('nb1', 'q1', { drawings: ['x'] })],
      ['deleteNotebookPage', (s) => s.deleteNotebookPage('nb1', 'q1')],
      ['restoreNotebookPage', (s) => s.restoreNotebookPage('nb1', { pageId: 'q9' }, 0)],
    ];
    for (const [label, source] of [['ESKI', OLD_SOURCE], ['YENI', NEW_SOURCE]]) {
      for (const [key, ops, value] of [[DIARY, diaryOps, diaryValue()], [NOTEBOOKS, notebookOps, notebooksValue()]]) {
        for (const [name, op] of ops) {
          const fake = createFakeStorage({ [key]: value });
          const { StorageService, deletedAudio } = loadService(source, fake);
          fake.state.readFailKeys.add(key);
          let error = null;
          try {
            await op(StorageService);
          } catch (e) {
            error = e;
          }
          assert.deepStrictEqual(fake.state.writes, [], `${label} ${name}: okuma hatasinda yazma OLMAMALI`);
          assert.deepStrictEqual(deletedAudio, [], `${label} ${name}: dosya silinmemeli`);
          assert.strictEqual(fake.data.get(key), value, `${label} ${name}: veri aynen kalmali`);
          if (label === 'YENI') {
            assert.ok(error, `YENI ${name}: hata firlatmali (bos sonuc donmemeli)`);
            assert.strictEqual(error.code, 'STORAGE_READ_FAILED', `YENI ${name}: tipli okuma hatasi`);
          }
        }
      }
    }
    console.log('OK Test 6: Gunluk/Notlarim okuma hatasinda yazmiyor (eski ve yeni), yeni surum tipli hata veriyor');
  }

  // --- Test 7: sesli not gocu yalnizca BASARILI okumadan sonra yaziyor ---
  {
    const legacy = JSON.stringify([{ id: 'a', audioNotes: [{ id: 'n', uri: 'file:///x/audio_notes/note_1.wav' }] }]);

    const fake = createFakeStorage({ [PAGES]: legacy });
    const { StorageService } = loadService(NEW_SOURCE, fake);
    fake.state.readFailKeys.add(PAGES);
    await rejectsWith(StorageService.getPages(), 'STORAGE_READ_FAILED', 'goc/okuma hatasi');
    assert.deepStrictEqual(fake.state.writes, [], 'okuma basarisizken goc yazmasi OLMAMALI');

    // Okuma basarili ama goc yazilamiyor: okuma yine de gocmus veriyi dondurur
    fake.state.readFailKeys.clear();
    fake.state.failWrites = true;
    const pages = await StorageService.getPages();
    assert.strictEqual(pages[0].audioNotes[0].fileName, 'note_1.wav', 'goc bellekte uygulanmali');
    assert.strictEqual(fake.data.get(PAGES), legacy, 'goc yazilamadiysa disk eski haliyle kalir');

    // Defter normalizasyonu da ayni: okuma hatasinda yazmaz
    const rawDiary = JSON.stringify({ id: 'my_diary', pages: [{ pageId: 'p1' }] }); // createdAt/mood eksik
    const fake2 = createFakeStorage({ [DIARY]: rawDiary });
    const s2 = loadService(NEW_SOURCE, fake2).StorageService;
    fake2.state.readFailKeys.add(DIARY);
    await rejectsWith(s2.getDiary(), 'STORAGE_READ_FAILED', 'gunluk normalizasyon');
    assert.deepStrictEqual(fake2.state.writes, [], 'normalizasyon okuma hatasinda yazmamali');
    console.log('OK Test 7: goc ve normalizasyon yalnizca basarili okumadan sonra yaziyor');
  }

  // --- Test 8: kilit kuyrugu hatadan sonra kilitlenmiyor ---
  {
    const fake = createFakeStorage({ [PAGES]: threePages(), [DIARY]: diaryValue() });
    const { StorageService } = loadService(NEW_SOURCE, fake);
    fake.state.readFailKeys.add(PAGES);
    fake.state.readFailKeys.add(DIARY);
    const failing = [
      StorageService.addPage({ id: 'x' }).catch((e) => e.code),
      StorageService.updateDiaryPage('p1', {}).catch((e) => e.code),
    ];
    // Hata bitmeden kuyruga giren islemler hata sonrasinda calisabilmeli
    const later = (async () => {
      await Promise.all(failing);
      fake.state.readFailKeys.clear();
      await StorageService.addPage({ id: 'd' });
      await StorageService.updateDiaryPage('p1', { drawings: ['ok'] });
    })();
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('kuyruk kilitlendi')), 2000));
    await Promise.race([later, timeout]);
    assert.deepStrictEqual(await Promise.all(failing), ['STORAGE_READ_FAILED', 'STORAGE_READ_FAILED']);
    assert.deepStrictEqual(fake.json(PAGES).map((p) => p.id), ['a', 'b', 'c', 'd']);
    assert.deepStrictEqual(fake.json(DIARY).pages[0].drawings, ['ok']);
    console.log('OK Test 8: withPagesLock / withJournalLock hatadan sonra calismaya devam ediyor');
  }

  // --- Test 9: bildirim siniri ve koruyucular ---
  {
    const fake = createFakeStorage({});
    const { events } = loadService(NEW_SOURCE, fake);
    const warn = console.warn;
    console.warn = () => {};
    try {
      const seen = [];
      const unsubscribe = events.subscribeStorageWriteFailed((e) => seen.push(e));
      const W = events.WRITE_ERROR_NOTICE_WINDOW_MS;
      assert.strictEqual(events.reportStorageWriteError(new Error('1'), 1000), true, 'ilk hata bildirilmeli');
      assert.strictEqual(events.reportStorageWriteError(new Error('2'), 1000 + W - 1), false, 'pencere icinde tekrar YOK');
      assert.strictEqual(events.reportStorageWriteError(new Error('3'), 1000 + W), true, 'pencere dolunca tekrar');
      assert.strictEqual(seen.length, 2);
      unsubscribe();

      // guardStorageWrites: yazmalar null + bildirim, load KORUNMAZ (okuma hatasi gecmeli)
      const adapter = {
        load: async () => {
          throw Object.assign(new Error('okunamadi'), { code: 'STORAGE_READ_FAILED' });
        },
        updatePage: async () => {
          throw Object.assign(new Error('yazilamadi'), { code: 'STORAGE_WRITE_FAILED' });
        },
        addPage: async () => ({ ok: true }),
      };
      const guarded = events.guardStorageWrites(adapter);
      assert.strictEqual(await guarded.updatePage('p', {}), null, 'basarisiz yazma null donmeli');
      assert.deepStrictEqual(await guarded.addPage({}), { ok: true }, 'basarili yazma sonucu aynen donmeli');
      await rejectsWith(guarded.load(), 'STORAGE_READ_FAILED', 'load sarilmamali');
      assert.strictEqual(await events.guardWrite(Promise.reject(new Error('x'))), null);
    } finally {
      console.warn = warn;
    }
    console.log('OK Test 9: "Kaydedilemedi" pencere basina bir kez; koruyucular dogru');
  }

  finished = true;
  console.log('--- TUM DEPOLAMA OKUMA/YAZMA HATASI TESTLERI GECTI ---');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
