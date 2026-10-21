/**
 * storageWriteProbe.test.js — GECICI teshis altyapisinin testleri
 *
 * Kapsam:
 *   - storage:write satiri GERCEK storageService + GERCEK sarmalayici + GERCEK
 *     cyrb53 (utils/storageBackup) ile: yazma basina tek satir, kaynak etiketi,
 *     hash'in diske yazilan metnin ozeti olmasi, same / sameNoTs ayrimi,
 *     kalem alanlari, basarisiz yazmada ok=0 ve hatanin aynen iletilmesi,
 *     StorageService disindan gelen yazmanin 'direct' etiketi.
 *   - Sarmalayici yazmanin sonucunu DEGISTIRMEZ (veri riski yok).
 *   - perf:pageAdd / perf:postStroke pencereleri (sahte saat + sahte rAF).
 *   - utils/penActivity (GECICI DEGIL): coklu tuval, kalkista dinleyici.
 *
 * KAPSAMADIGI: cihazdaki gercek sureler; Metro'ya satirin gercekten gittigi.
 */
const assert = require('assert');
const markComplete = require('./helpers/completionGuard')(__filename);
const { createLoader, createClock, createFakeAsyncStorage, flushMicrotasks } = require('./helpers/screenHarness');

const NOTEBOOKS = '@ajanda_notebooks_v1';

const notebooksValue = () =>
  JSON.stringify([
    {
      id: 'nb1',
      title: 'Defter',
      updatedAt: '2026-01-01T00:00:00.000Z',
      pages: [
        { pageId: 'q1', pageNumber: 1, createdAt: '2026-01-01', mood: null, paperTemplateId: 'blank_lined', drawings: [] },
      ],
    },
  ]);

const loadAll = ({ initial = {}, failWrites = false } = {}) => {
  const clock = createClock();
  const store = createFakeAsyncStorage(initial);
  if (failWrites) {
    store.api.setItem = async () => {
      throw new Error('database or disk is full');
    };
  }
  const lines = [];
  const fakeConsole = {
    log: (msg) => {
      const m = /\] ([a-zA-Z:]+) #\d+ ?(.*)$/.exec(String(msg));
      if (!m) return;
      const data = {};
      m[2].split(' ').filter(Boolean).forEach((kv) => {
        const i = kv.indexOf('=');
        data[kv.slice(0, i)] = kv.slice(i + 1);
      });
      lines.push({ label: m[1], data });
    },
    warn() {},
    error() {},
  };
  const loader = createLoader({
    real: [
      'services/storageService.js',
      'services/storageErrorEvents.js',
      'utils/storageWriteProbe.js',
      'utils/storageBackup.js',
      'utils/storageFaultInjection.js',
      'utils/penActivity.js',
      'utils/diagnosticLog.js',
      'utils/perfProbes.js',
    ],
    mocks: {
      '@react-native-async-storage/async-storage': { __esModule: true, default: store.api },
      'services/audioService.js': {
        AudioService: { getAudioFileName: (u) => String(u || '').split('/').pop(), deleteAudioFiles: async () => {} },
        AUDIO_DIR: 'file:///audio/',
      },
      'services/notificationService.js': { NotificationService: { cancelScheduledNotification: async () => {} } },
      'expo-file-system/legacy': {},
      'expo-constants': { __esModule: true, default: {} },
      'react-native': { Platform: { OS: 'android' } },
    },
    globals: {
      console: fakeConsole,
      __DEV__: false,
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
      // diagnosticLog.nowMs global.performance.now okur: sahte saate bagla
      global: { performance: { now: () => clock.now() } },
    },
  });
  const { StorageService } = loader.load('services/storageService.js');
  const backup = loader.load('utils/storageBackup.js');
  const pen = loader.load('utils/penActivity.js');
  const probe = loader.load('utils/storageWriteProbe.js');
  const perf = loader.load('utils/perfProbes.js');
  const diag = loader.load('utils/diagnosticLog.js');
  return { StorageService, store, lines, backup, pen, probe, perf, diag, clock };
};

const writeLines = (lines) => lines.filter((l) => l.label === 'storage:write');

(async () => {
  console.log('--- storage:write / perf:* / penActivity Testleri ---');

  // --- Test 1: yazma basina TEK satir, hash diske yazilan metnin ozeti ---
  {
    const env = loadAll({ initial: { [NOTEBOOKS]: notebooksValue() } });
    await env.StorageService.getNotebooks();
    assert.strictEqual(writeLines(env.lines).length, 0, 'okuma satir yazmamali');

    await env.StorageService.updateNotebookPage('nb1', 'q1', { drawings: [{ id: 's1' }] });
    let w = writeLines(env.lines);
    assert.strictEqual(w.length, 1, 'yazma basina tek satir');
    const written = env.store.data.get(NOTEBOOKS);
    assert.strictEqual(w[0].data.key, NOTEBOOKS);
    assert.strictEqual(w[0].data.source, 'updateNotebookPage[drawings]');
    assert.strictEqual(w[0].data.hash, env.backup.checksum(written), 'hash = cyrb53(yazilan metin)');
    assert.strictEqual(Number(w[0].data.bytes), env.backup.utf8Bytes(written));
    assert.strictEqual(Number(w[0].data.chars), written.length);
    assert.strictEqual(w[0].data.same, '-', 'ilk yazmada onceki yok');
    assert.strictEqual(w[0].data.ok, '1');
    ['readMs', 'parseMs', 'stringifyMs', 'setItemMs', 'diagMs'].forEach((k) =>
      assert.ok(/^\d+\.\d$/.test(w[0].data[k]), k + ' ms olmali: ' + w[0].data[k])
    );

    // Ayni icerik, yalnizca updatedAt farkli: same=0, sameNoTs=1 (cift yazma imzasi)
    await new Promise((r) => setTimeout(r, 5)); // updatedAt kesin degissin
    await env.StorageService.updateNotebookMeta('nb1', {});
    w = writeLines(env.lines);
    assert.strictEqual(w.length, 2);
    assert.strictEqual(w[1].data.source, 'updateNotebookMeta[]');
    assert.strictEqual(w[1].data.same, '0', 'updatedAt degisti: tam hash farkli');
    assert.strictEqual(w[1].data.sameNoTs, '1', 'updatedAt disinda ayni');

    // Gercek icerik degisikligi: ikisi de 0
    await env.StorageService.updateNotebookPage('nb1', 'q1', { drawings: [{ id: 's1' }, { id: 's2' }] });
    w = writeLines(env.lines);
    assert.strictEqual(w[2].data.same, '0');
    assert.strictEqual(w[2].data.sameNoTs, '0', 'icerik farkli');
    console.log('OK Test 1: yazma basina tek satir; hash yazilan metnin cyrb53 ozeti; same/sameNoTs ayrimi dogru');
  }

  // --- Test 2: kalem alanlari ve 'direct' kaynak ---
  {
    const env = loadAll({ initial: { [NOTEBOOKS]: notebooksValue() } });
    const owner = {};
    env.pen.setPenDown(owner, true);
    await env.StorageService.updateNotebookPage('nb1', 'q1', { drawings: [] });
    env.pen.setPenDown(owner, false);
    await env.StorageService.updateNotebookPage('nb1', 'q1', { drawings: [{ id: 'x' }] });
    const w = writeLines(env.lines);
    assert.strictEqual(w[0].data.penParse, '1');
    assert.strictEqual(w[0].data.penStr, '1');
    assert.strictEqual(w[1].data.penParse, '0');
    assert.strictEqual(w[1].data.penStr, '0');

    // StorageService disindan (ornegin DrawingToolbar) dogrudan yazma
    const AsyncStorage = env.store.api;
    await AsyncStorage.setItem('lastSelectedDrawingColor', '#000000');
    const d = writeLines(env.lines)[2];
    assert.strictEqual(d.data.source, 'direct');
    assert.strictEqual(d.data.key, 'lastSelectedDrawingColor');
    assert.strictEqual(d.data.penParse, '-', 'okumasiz yazmada parse alani yok');
    console.log("OK Test 2: kalem alanlari parse/stringify anina gore; servis disi yazma 'direct'");
  }

  // --- Test 3: sarmalayici yazmanin sonucunu degistirmez; hata aynen iletilir ---
  {
    const env = loadAll({ initial: { [NOTEBOOKS]: notebooksValue() }, failWrites: true });
    let error = null;
    try {
      await env.StorageService.updateNotebookPage('nb1', 'q1', { drawings: [] });
    } catch (e) {
      error = e;
    }
    assert.ok(error && error.code === 'STORAGE_WRITE_FAILED', 'yazma hatasi STORAGE_WRITE_FAILED olarak kalmali');
    const w = writeLines(env.lines);
    assert.strictEqual(w.length, 1, 'basarisiz yazma da tek satir yazar');
    assert.strictEqual(w[0].data.ok, '0');
    assert.strictEqual(env.probe.getWriteStats().inFlight, 0, 'ucusta yazma sayaci sifira donmeli');
    assert.strictEqual(env.probe.getWriteStats().bytes, 0, 'basarisiz yazma bayta sayilmaz');

    // Saf fabrika: kurulum bir kez; sonuc degeri aynen doner; teshis hatasi yazmayi bozmaz
    const p = env.probe.createWriteProbe({
      checksum: () => {
        throw new Error('teshis bozuk');
      },
      utf8Bytes: () => 0,
      dlog: () => {},
      nowMs: () => 0,
      isPenDown: () => false,
    });
    let calls = 0;
    const fake = { setItem: async (k, v) => { calls += 1; return 'sonuc:' + k + v; } };
    p.install(fake);
    const wrapped = fake.setItem;
    p.install(fake);
    assert.strictEqual(fake.setItem, wrapped, 'ikinci kurulum sarmalamamali');
    assert.strictEqual(await fake.setItem('a', 'b'), 'sonuc:ab', 'sonuc aynen donmeli');
    assert.strictEqual(calls, 1);
    console.log('OK Test 3: sarmalayici sonucu ve hatayi degistirmiyor; teshis hatasi yazmayi bozmuyor');
  }

  // --- Test 4: perf:pageAdd — writeDone isareti + 300 ms sakinlik + ucusta yazma yok ---
  {
    const env = loadAll();
    const pageAdd = () => env.lines.filter((l) => l.label === 'perf:pageAdd');
    const probe = env.perf.startPageAddProbe('notlarim', { pagesBefore: 3 });
    env.clock.advance(1000);
    assert.strictEqual(pageAdd().length, 0, 'writeDone isareti gelmeden kapanmamali (okuma sirasinda sakin gorunur)');
    probe.mark('writeDone');
    env.clock.advance(50);
    // Yeni sayfanin render'i: JS 120 ms mesgul, sonraki kare uzun olur
    env.clock.stall(120);
    env.clock.advance(250);
    assert.strictEqual(pageAdd().length, 0, 'uzun kareden sonra 300 ms dolmadan kapanmamali');
    env.clock.advance(200);
    const line = pageAdd()[0];
    assert.ok(line, 'sakinlik sonrasi tek satir yazilmali');
    assert.strictEqual(line.data.screen, 'notlarim');
    assert.strictEqual(line.data.pagesBefore, '3');
    assert.strictEqual(line.data.longFrames, '1', 'tek uzun kare');
    assert.ok(Number(line.data.maxFrameMs) >= 120, 'uzun kare suresi: ' + line.data.maxFrameMs);
    assert.ok(Number(line.data.mark_writeDone) >= 1000, 'yazma isareti dokunustan sonraki ms');
    assert.ok(Number(line.data.settleMs) >= 1170, 'sakinlik uzun kare bitince baslar: ' + line.data.settleMs);
    assert.ok(Number(line.data.windowMs) >= Number(line.data.settleMs) + 300, 'pencere sakinlikten 300 ms sonra kapanir');
    env.clock.advance(5000);
    assert.strictEqual(pageAdd().length, 1, 'tek satir');
    console.log('OK Test 4: perf:pageAdd isareti bekliyor, sakinlikten sonra tek satir yaziyor');
  }

  // --- Test 5: perf:postStroke 800 ms veya yeni cizgiyle erken kapanir ---
  {
    const env = loadAll();
    const post = () => env.lines.filter((l) => l.label === 'perf:postStroke');
    env.perf.startPostStrokeProbe({ screen: 'notlarim' });
    env.clock.advance(500);
    assert.strictEqual(post().length, 0);
    env.clock.advance(400);
    assert.strictEqual(post().length, 1, '800 ms sonunda kapanmali');
    assert.ok(Number(post()[0].data.windowMs) >= 800);

    const p2 = env.perf.startPostStrokeProbe({ screen: 'notlarim' });
    env.clock.advance(100);
    env.diag.bumpRender('screen');
    p2.close({ cut: 1 });
    p2.close({ cut: 1 });
    env.clock.advance(2000);
    assert.strictEqual(post().length, 2, 'erken kapanis tek satir');
    assert.strictEqual(post()[1].data.cut, '1');
    assert.strictEqual(post()[1].data.rScreen, '1', 'pencere icindeki render sayilmali');
    console.log('OK Test 5: perf:postStroke 800 ms, yeni cizgide cut=1 ile erken ve tek kez kapaniyor');
  }

  // --- Test 6: penActivity — coklu tuval ve kalkis dinleyicisi ---
  {
    const env = loadAll();
    const { setPenDown, isPenDown, onNextPenUp } = env.pen;
    const a = {};
    const b = {};
    let ups = 0;
    assert.strictEqual(isPenDown(), false);
    setPenDown(a, true);
    setPenDown(b, true);
    onNextPenUp(() => {
      ups += 1;
    });
    setPenDown(a, false);
    assert.strictEqual(isPenDown(), true, 'baska tuvalde kalem hala basili');
    assert.strictEqual(ups, 0);
    setPenDown(b, false);
    assert.strictEqual(isPenDown(), false);
    assert.strictEqual(ups, 1, 'son kalem kalkinca bir kez');
    setPenDown(b, false);
    assert.strictEqual(ups, 1, 'tekrar kalkis dinleyiciyi yeniden cagirmaz');
    const cancel = onNextPenUp(() => {
      ups += 1;
    });
    setPenDown(a, true);
    cancel();
    setPenDown(a, false);
    assert.strictEqual(ups, 1, 'iptal edilen dinleyici cagrilmaz');
    console.log('OK Test 6: penActivity coklu tuvalde dogru; kalkis dinleyicisi bir kez, iptal edilebilir');
  }

  await flushMicrotasks(1);
  markComplete();
  console.log('--- TUM storage:write / perf:* / penActivity TESTLERI GECTI ---');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
