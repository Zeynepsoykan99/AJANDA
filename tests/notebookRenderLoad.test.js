/**
 * notebookRenderLoad.test.js — Notlarim / Gunlugum render yuku
 *
 * NotebookPagesView TUM sayfalari ayni anda mount eder; ekranin her render'i
 * her sayfanin cocuklarini yeniden render eder. Bu test, davranis DEGISMEDEN
 * bosa yapilan render'larin kaldirildigini SAYI olarak gosterir.
 *
 * Yontem: ekran GERCEK React ile (tests/helpers/notebookScenario.js), cihazdaki
 * gibi 14 sayfalik defter (sayfa basina 22 cizgi; noktali/kareli/cizgili
 * karisik). Sahte DrawingCanvas, gercek StaticDrawingsLayer ile ayni memo
 * sozlesmesine sahip bir ic katman cizer; "staticLayer" sayaci bu yuzden gercek
 * React.memo davranisidir. "Once" hali git'ten okunur.
 *
 * KAPSAMADIGI: yerel (UI thread) cizim maliyeti ve gercek sureler; yalnizca
 * React render sayilari. Cihazda etkisi perf:postStroke / perf:pageAdd ile olculur.
 */
const assert = require('assert');
const markComplete = require('./helpers/completionGuard')(__filename);
const { openNotebookScreen, makeNotebook, NOTEBOOKS } = require('./helpers/notebookScenario');

const strokes = (n, prefix) =>
  Array.from({ length: n }, (_, k) => ({ id: `${prefix}_${k}`, d: 'M 0 0 L 1 1', color: '#000', strokeWidth: 3, points: [{ x: 0, y: 0 }] }));
const RULINGS = ['blank_dotted', 'blank_grid', 'blank_lined'];
const deviceLikeNotebook = () =>
  makeNotebook({
    pages: 14,
    pageExtra: (i) => ({ drawings: strokes(22, `p${i}`), paperTemplateId: RULINGS[i % 3] }),
  });

/** Acilis -> tek cizgi: cizginin tetikledigi render sayilari ve prop degisimleri */
const strokeRenders = async (rev) => {
  const s = await openNotebookScreen({ rev, initial: { [NOTEBOOKS]: JSON.stringify([deviceLikeNotebook()]) } });
  await s.tick(2000);
  Object.keys(s.registry.propChanges).forEach((k) => delete s.registry.propChanges[k]);
  const before = s.registry.snapshot();
  await s.draw('yeni');
  await s.tick(1000);
  const renders = s.registry.diff(before);
  const props = JSON.parse(JSON.stringify(s.registry.propChanges));
  await s.unmount();
  return { renders, props };
};

/** Acilis -> "+" ile sayfa ekleme: render sayilari ve yazmalar */
const addPageRenders = async (rev) => {
  const s = await openNotebookScreen({ rev, initial: { [NOTEBOOKS]: JSON.stringify([deviceLikeNotebook()]) } });
  await s.tick(2000);
  const before = s.registry.snapshot();
  const w0 = s.keyWrites().length;
  await s.press('Yeni Sayfa Ekle');
  await s.tick(2000);
  const renders = s.registry.diff(before);
  const writes = s.keyWrites().slice(w0).map((w) => JSON.parse(w.value)[0]);
  await s.unmount();
  return { renders, writes };
};

const BEFORE_STABLE = 'b56c7ca6';
const BEFORE_RULING = 'c8856f1c';

/**
 * PaperSheet'i verilen surumden yukleyip uc doku ve iki olcu icin cizer;
 * View'lerin stil ve pointerEvents prop'larini DOM ozniteligine yazan sahte
 * View ile tum agaci metne doker. Ayni metin = ayni yerel View agaci.
 */
async function renderPaperTree(rev) {
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const { createLoader, flushMicrotasks } = require('./helpers/screenHarness');
  let layoutHandlers = [];
  const View = React.forwardRef(function ViewProbe(props, ref) {
    if (props.onLayout) layoutHandlers.push(props.onLayout);
    return React.createElement(
      'div',
      { ref, 'data-style': JSON.stringify(props.style), 'data-pe': props.pointerEvents || '' },
      props.children
    );
  });
  const loader = createLoader({
    rev,
    real: ['components/stationery/PaperSheet.js', 'constants/paperRulings.js', 'utils/diagnosticLog.js'],
    mocks: {
      'react-native': {
        View,
        StyleSheet: {
          create: (x) => x,
          hairlineWidth: 0.5,
          absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
        },
        PixelRatio: { roundToNearestPixel: (n) => n },
      },
    },
    globals: { console: { log() {}, warn() {}, error() {} } },
  });
  const PaperSheet = loader.load('components/stationery/PaperSheet.js').default;
  const dump = (node) =>
    node.nodeType === 3
      ? node.nodeValue
      : `<${node.nodeName} ${node.attributes['data-style'] || ''} ${node.attributes['data-pe'] || ''}>` +
        node.childNodes.map(dump).join('') +
        '</>';
  let out = '';
  for (const ruling of ['lined', 'grid', 'dotted', 'blank']) {
    for (const size of [null, { width: 600, height: 900 }]) {
      const container = global.document.createElement('div');
      const root = createRoot(container);
      layoutHandlers = [];
      await React.act(async () => {
        root.render(
          React.createElement(PaperSheet, { ruling, lineColor: '#ABCDEF', showMargin: ruling === 'lined' }, 'icerik')
        );
        await flushMicrotasks(2);
      });
      if (size) {
        await React.act(async () => {
          layoutHandlers.forEach((h) => h({ nativeEvent: { layout: size } }));
          await flushMicrotasks(2);
        });
      }
      out += `[${ruling} ${size ? size.width + 'x' + size.height : 'olcusuz'}]` + container.childNodes.map(dump).join('');
      await React.act(async () => root.unmount());
    }
  }
  return out;
}

(async () => {
  console.log('--- Notlarim Render Yuku Testleri ---');

  // --- Test 1: aktif olmayan sayfalarda kalici cizgi katmani memo'su tutuyor ---
  {
    const before = await strokeRenders(BEFORE_STABLE);
    const after = await strokeRenders(undefined);
    console.log(
      `  tek cizgi: staticLayer ${before.renders.staticLayer} -> ${after.renders.staticLayer}` +
        ` (DrawingCanvas ${before.renders.drawingCanvas} -> ${after.renders.drawingCanvas})`
    );
    assert.strictEqual(before.renders.staticLayer, 14, 'once: 14 sayfanin hepsinde kalici katman yeniden cizildi');
    assert.strictEqual(after.renders.staticLayer, 1, 'sonra: yalnizca cizilen sayfanin katmani');
    // Bosa degisen referanslar: once 13 aktif olmayan sayfada her render'da yeni [] / () => {}
    assert.strictEqual(before.props.DrawingCanvas.selectedStrokeIds, 13);
    assert.strictEqual(before.props.TextCanvas.selectedBlockIds, 13);
    assert.strictEqual(before.props.StickerCanvas.onStickerMove, 13);
    assert.strictEqual(after.props.DrawingCanvas.selectedStrokeIds || 0, 0, 'sonra: selectedStrokeIds sabit');
    assert.strictEqual(after.props.TextCanvas.selectedBlockIds || 0, 0, 'sonra: selectedBlockIds sabit');
    ['onStickerMove', 'onStickerResize', 'onStickerDelete'].forEach((k) =>
      assert.strictEqual((after.props.StickerCanvas || {})[k] || 0, 0, 'sonra: ' + k + ' sabit')
    );
    console.log('OK Test 1: aktif olmayan sayfalara sabit bos dizi/fonksiyon; kalici cizgi katmani 14 -> 1');
  }

  // --- Test 2: davranis ayni — aktif sayfa gercek secimi alir, cizim ve kayit dogru ---
  {
    const s = await openNotebookScreen({ initial: { [NOTEBOOKS]: JSON.stringify([deviceLikeNotebook()]) } });
    await s.tick(2000);
    const canvases = [...s.registry.instances.DrawingCanvas.values()];
    const active = canvases.filter((p) => p.pointerEvents === undefined);
    assert.strictEqual(active.length, 1, 'tek aktif sayfa');
    canvases
      .filter((p) => p.pointerEvents === 'none')
      .forEach((p) => {
        assert.ok(Object.isFrozen(p.selectedStrokeIds) && p.selectedStrokeIds.length === 0, 'pasif: bos ve dondurulmus');
        assert.strictEqual(typeof p.onDrawingsChange, 'function');
      });
    await s.draw('yeni');
    await s.tick(1000);
    const saved = JSON.parse(s.keyWrites().slice(-1)[0].value)[0];
    assert.strictEqual(saved.pages[0].drawings.length, 23, 'cizgi kaydedildi');
    assert.strictEqual(saved.pages[1].drawings.length, 22, 'diger sayfalar degismedi');
    await s.unmount();
    console.log('OK Test 2: davranis ayni (aktif sayfa calisiyor, pasif sayfalar bos+dondurulmus, kayit dogru)');
  }

  // --- Test 3: sayfa ekleme — yazmalar ve render dokumu (bilgi + sinirlar) ---
  {
    const r = await addPageRenders(undefined);
    console.log('  sayfa ekleme render:', JSON.stringify(r.renders));
    assert.strictEqual(r.writes.length, 2, 'sayfa ekleme: addNotebookPage + lastPageIndex (indeks degisti)');
    assert.strictEqual(r.writes[0].pages.length, 15);
    assert.strictEqual(r.writes[1].lastPageIndex, 14, 'yeni sayfa son kalinan sayfa');
    console.log('OK Test 3: sayfa ekleme iki gerekli yazma yapiyor (sayfa + son kalinan sayfa)');
  }

  // --- Test 4: kagit dokusu memo'su — cizgide doku yeniden uretilmiyor ---
  {
    const rulingPerStroke = async (rev) => {
      const s = await openNotebookScreen({ rev, initial: { [NOTEBOOKS]: JSON.stringify([deviceLikeNotebook()]) } });
      await s.tick(2000);
      const diag = s.loader.load('utils/diagnosticLog.js'); // ekranla AYNI ornek
      const before = diag.snapshotRenders();
      const views0 = s.registry.snapshot();
      await s.draw('yeni');
      await s.tick(1000);
      const d = diag.diffRenders(before);
      const views = s.registry.diff(views0).View;
      await s.unmount();
      return { ruling: d.ruling, paperSheet: d.paperSheet, views };
    };
    const before = await rulingPerStroke(BEFORE_RULING);
    const after = await rulingPerStroke(undefined);
    console.log(
      `  tek cizgi: doku ${before.ruling} -> ${after.ruling}, View render ${before.views} -> ${after.views}` +
        ` (PaperSheet ${before.paperSheet} -> ${after.paperSheet})`
    );
    assert.strictEqual(before.ruling, 14, 'once: 14 sayfanin dokusu her cizgide yeniden uretiliyordu');
    assert.strictEqual(after.ruling, 0, 'sonra: cizgide hicbir sayfanin dokusu yeniden uretilmez');
    assert.ok(after.views * 20 < before.views, 'View render sayisi en az 20 kat azalmali');
    console.log('OK Test 4: kagit dokusu memo — cizgide doku render 14 -> 0');
  }

  // --- Test 5: kagit ciktisi BIREBIR ayni (once/sonra, uc doku, iki olcu) ---
  {
    const outputs = {};
    for (const rev of [BEFORE_RULING, undefined]) {
      outputs[rev || 'simdi'] = await renderPaperTree(rev);
    }
    assert.strictEqual(outputs.simdi, outputs[BEFORE_RULING], 'View agaci, stiller ve sirasi ayni olmali');
    assert.ok(outputs.simdi.length > 10000, 'karsilastirma bos olmamali');
    console.log('OK Test 5: kagit ciktisi (View agaci + stiller) once/sonra birebir ayni');
  }

  markComplete();
  console.log('--- TUM RENDER YUKU TESTLERI GECTI ---');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
