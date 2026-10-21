/**
 * notebookDoubleWrite.test.js — Notlarim / Gunlugum CIFT YAZMA
 *
 * Bulgu (cihaz): @ajanda_notebooks_v1'e ardisik, karakter sayisi birebir ayni
 * yazma ciftleri. Kok neden: NotebookPagesView'deki "son kalinan sayfa"
 * effect'i bagimliliklarinda `notebook` nesnesini tasiyordu. Her cizgi
 * `notebook`'u degistirdigi icin effect yeniden calisip 500 ms sonra
 * updateMeta({ lastPageIndex }) yaziyordu; cizim kaydi da 500 ms debounce ile
 * yazildigi icin her cizgi IKI tam yazma uretiyordu. Ikinci yazma ayni
 * lastPageIndex'i yazar; diskteki tek fark updatedAt'in birkac ms ilerlemesidir.
 *
 * Yontem: ekran GERCEK React ile, gercek storageService + sahte AsyncStorage
 * uzerinde calistirilir (tests/helpers/notebookScenario.js). Ayni senaryo git
 * gecmisindeki surumlerde de calistirilir: hatanin ne zaman basladigi SAYI
 * olarak gosterilir.
 *
 * Kapsadigi: cizgi basina yazma sayisi; ikinci yazmanin icerigi (bayat mi,
 * ayni mi); duzeltme sonrasi sayfa degisiminde ve acilista lastPageIndex
 * kaydinin AYNEN surmesi; Gunlugum yolu; okuma gocunun (sesli not, eksik alan)
 * her okumada yeniden yazmamasi.
 *
 * KAPSAMADIGI: gercek cihaz zamanlamasi (Hermes, SQLite), kapak ekraninin ayni
 * anda mount olmasi (kapak yalnizca kendi degisikliginde yazar; kaynakta
 * dogrulandi), React StrictMode (uygulamada kullanilmiyor; kaynakta dogrulandi).
 */
const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');
const markComplete = require('./helpers/completionGuard')(__filename);
const { openNotebookScreen, makeNotebook, stripUpdatedAt, NOTEBOOKS } = require('./helpers/notebookScenario');

const ROOT = path.join(__dirname, '..');
const has = (rev) => {
  try {
    execSync(`git cat-file -e ${rev}`, { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
};

/** Acilis + 3 cizgi (her biri 1000 ms arayla): cizgi basina yazmalari dondurur */
const strokeScenario = async (rev, screen = 'notlarim') => {
  const s = await openNotebookScreen({ rev, screen });
  await s.tick(2000);
  const openWrites = s.keyWrites().length;
  const perStroke = [];
  const strokeWrites = [];
  for (let k = 1; k <= 3; k++) {
    const before = s.keyWrites().length;
    await s.draw(`s${k}`);
    await s.tick(1000);
    const ws = s.keyWrites().slice(before);
    perStroke.push(ws.length);
    strokeWrites.push(ws);
  }
  await s.unmount();
  return { openWrites, perStroke, strokeWrites, logs: s.logs };
};

(async () => {
  console.log('--- Notlarim / Gunlugum Cift Yazma Testleri ---');

  // --- Test 1: hata gecmiste ne zaman basladi (ayni senaryo, farkli surumler) ---
  const history = [
    ['831344c7^', 'lastPageIndex effect oncesi', 1],
    ['831344c7', 'lastPageIndex effect eklendi (2026-09-16)', 2],
    ['3588d806^', 'sesli not gocu oncesi', 2],
    ['7fc4d801', '', 2],
    ['bd8a823d', '', 2],
    ['ecbafbc3', 'bu turun tani commit i (duzeltme oncesi)', 2],
  ];
  const table = [];
  for (const [rev, note, expected] of history) {
    if (!has(rev)) {
      console.log(`  (atlandi: ${rev} bu depoda yok)`);
      continue;
    }
    const r = await strokeScenario(rev);
    table.push(`  ${rev.padEnd(10)} acilis=${r.openWrites} cizgi-basina=${r.perStroke.join(',')}  ${note}`);
    r.perStroke.forEach((n, i) =>
      assert.strictEqual(n, expected, `${rev}: cizgi ${i + 1} icin ${expected} yazma beklenir, ${n} oldu`)
    );
    if (expected === 2) {
      // Ikinci yazma BAYAT mi? Hayir: updatedAt disinda ilkiyle birebir ayni.
      r.strokeWrites.forEach((ws, i) => {
        assert.notStrictEqual(ws[0].value, undefined);
        assert.strictEqual(
          stripUpdatedAt(ws[1].value),
          stripUpdatedAt(ws[0].value),
          `${rev}: cizgi ${i + 1} ikinci yazma ilkiyle (updatedAt haric) ayni olmali`
        );
        assert.strictEqual(ws[1].value.length, ws[0].value.length, 'karakter sayisi birebir ayni (cihazdaki imza)');
        const drawn = JSON.parse(ws[1].value)[0].pages[0].drawings.map((d) => d.id);
        assert.deepStrictEqual(drawn, ['s1', 's2', 's3'].slice(0, i + 1), 'ikinci yazma en yeni cizgileri tasimali');
      });
    }
  }
  console.log('  surum      yazma sayilari');
  table.forEach((l) => console.log(l));
  console.log('OK Test 1: cift yazma 831344c7 ile basladi; ikinci yazma bayat degil, updatedAt disinda ayni');

  // --- Test 2: kaynak etiketi ciftin ikinci yazmasini lastPageIndex olarak gosteriyor ---
  {
    const r = await strokeScenario('ecbafbc3');
    const sources = r.logs
      .filter((l) => l.includes('storage:write'))
      .map((l) => /source=(\S+)/.exec(l)[1]);
    // acilis: 1 lastPageIndex, sonra her cizgi icin [drawings, lastPageIndex]
    assert.deepStrictEqual(sources, [
      'updateNotebookMeta[lastPageIndex]',
      'updateNotebookPage[drawings]',
      'updateNotebookMeta[lastPageIndex]',
      'updateNotebookPage[drawings]',
      'updateNotebookMeta[lastPageIndex]',
      'updateNotebookPage[drawings]',
      'updateNotebookMeta[lastPageIndex]',
    ]);
    console.log('OK Test 2: storage:write kaynak etiketi ikinci yazmayi updateNotebookMeta[lastPageIndex] olarak gosteriyor');
  }

  // --- Test 3: DUZELTME — cizgi basina tek yazma (Notlarim + Gunlugum) ---
  for (const screen of ['notlarim', 'gunluk']) {
    const r = await strokeScenario(undefined, screen);
    assert.deepStrictEqual(r.perStroke, [1, 1, 1], `${screen}: duzeltme sonrasi cizgi basina tek yazma`);
    assert.strictEqual(r.openWrites, 1, `${screen}: acilistaki lastPageIndex kaydi korunmali (davranis degismedi)`);
    r.strokeWrites.forEach((ws, i) => {
      const parsed = JSON.parse(ws[0].value);
      const nb = Array.isArray(parsed) ? parsed[0] : parsed;
      assert.deepStrictEqual(nb.pages[0].drawings.map((d) => d.id), ['s1', 's2', 's3'].slice(0, i + 1));
    });
  }
  console.log('OK Test 3: duzeltme sonrasi cizgi basina 1 yazma (Notlarim ve Gunlugum); acilis kaydi aynen');

  // --- Test 4: sayfa degisince lastPageIndex HALA yaziliyor (dogru deger, tek kez) ---
  {
    const s = await openNotebookScreen({ initial: { [NOTEBOOKS]: JSON.stringify([makeNotebook({ pages: 3 })]) } });
    await s.tick(2000);
    const before = s.keyWrites().length;
    // Sayfa gostergesindeki ">" ile sonraki sayfaya gecis: currentPageIndex 1 olur.
    // Ekranin gercek geri cagrisi: onMomentumScrollEnd ile ayni yoldan gidilir.
    const scroll = [...(s.registry.instances.DrawingCanvas || new Map()).values()];
    assert.ok(scroll.length === 3, 'uc sayfa mount edilmeli');
    const sv = findScrollViewProps(s);
    await s.act(() => sv.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 800 } } }));
    await s.tick(1000);
    const ws = s.keyWrites().slice(before);
    assert.strictEqual(ws.length, 1, 'sayfa degisimi tek yazma');
    assert.strictEqual(JSON.parse(ws[0].value)[0].lastPageIndex, 1, 'yeni sayfa indeksi yazilmali');
    // Ayni sayfada cizim: yalnizca cizim kaydi
    const b2 = s.keyWrites().length;
    await s.draw('t1');
    await s.tick(1000);
    assert.strictEqual(s.keyWrites().length - b2, 1, 'cizim yalnizca kendi kaydini yapmali');
    await s.unmount();
    console.log('OK Test 4: sayfa degisiminde lastPageIndex dogru degerle bir kez yaziliyor; cizim tek yazma');
  }

  // --- Test 5: okuma gocu her okumada yeniden yazmiyor (H1 elendi) ---
  {
    const legacy = makeNotebook({
      pages: 2,
      pageExtra: (i) =>
        i === 0
          ? {
              // Eski model sesli notlar: dosyalari cihazda olmasa da goc yalnizca adi tasir
              audioNotes: [
                { id: 'a1', uri: 'file:///old/container/audio_notes/rec_1.m4a' },
                { id: 'a2', fileName: 'rec_2.m4a', uri: null },
              ],
              createdAt: undefined,
              mood: undefined,
              stickers: [{ id: 'bad' }],
            }
          : {},
    });
    const s = await openNotebookScreen({ initial: { [NOTEBOOKS]: JSON.stringify([legacy]) } });
    await s.tick(2000);
    const migr1 = s.logs.filter((l) => l.includes('source=migration:notebooks')).length;
    await s.unmount();
    // Ayni depoyla yeniden ac: goc tekrar YAZMAMALI
    const s2 = await openNotebookScreen({ initial: { [NOTEBOOKS]: s.store.data.get(NOTEBOOKS) } });
    await s2.tick(2000);
    await s2.draw('m1');
    await s2.tick(1000);
    const migr2 = s2.logs.filter((l) => l.includes('source=migration:notebooks')).length;
    await s2.unmount();
    assert.strictEqual(migr1, 1, 'eski kayit ilk okumada bir kez donusturulup yazilmali');
    assert.strictEqual(migr2, 0, 'goc idempotent: ikinci acilista ve cizimde goc yazmasi yok');
    console.log('OK Test 5: okuma gocu idempotent (ilk okumada 1, sonra 0 yazma)');
  }

  markComplete();
  console.log('--- TUM CIFT YAZMA TESTLERI GECTI ---');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

/** Yatay sayfa ScrollView'inin son prop'lari (sahte ScrollView kaydetmez; DOM'dan degil, kayittan) */
function findScrollViewProps(s) {
  const map = s.registry.instances.ScrollView;
  if (!map || map.size === 0) throw new Error('ScrollView kaydi yok');
  return [...map.values()].find((p) => typeof p.onMomentumScrollEnd === 'function');
}
