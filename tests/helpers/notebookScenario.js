/**
 * notebookScenario.js — NotebookPagesView'i (Notlarim / Gunlugum) gercek React
 * ile acip senaryo calistiran ortak yardimci.
 *
 * Ekran, depolama servisi, kagit ve sablonlar GERCEK kaynaktan (calisma agaci
 * veya git surumu) yuklenir; yerel bilesenler sahtedir (bkz. screenMocks).
 * Cizim, aktif sayfanin DrawingCanvas'ina verilen onDrawingsChange GERCEK geri
 * cagrisi uzerinden yapilir (gercek tuvalin cizgi bitiminde yaptigi gibi).
 */
const { installFakeDom, createClock, createLoader, createFakeAsyncStorage, flushMicrotasks } = require('./screenHarness');
const { createRegistry, createScreenMocks, activeDrawingCanvas } = require('./screenMocks');

const NOTEBOOKS = '@ajanda_notebooks_v1';
const DIARY = '@ajanda_diary_v1';

const REAL_MODULES = [
  'app/defterlerim/[notebookId]/pages.js',
  'app/gunlugum/pages.js',
  'components/notebook/NotebookPagesView.js',
  'services/storageService.js',
  'services/storageErrorEvents.js',
  'utils/diagnosticLog.js',
  'utils/storageFaultInjection.js',
  'utils/storageWriteProbe.js',
  'utils/storageBackup.js',
  'utils/penActivity.js',
  'utils/perfProbes.js',
  'components/stationery/PaperSheet.js',
  'constants/paperRulings.js',
  'constants/pageTemplates.js',
];

const makePage = (i, extra = {}) => ({
  pageId: `page_${i}`,
  pageNumber: i + 1,
  paperTemplateId: 'blank_dotted',
  createdAt: '2026-10-01T10:00:00.000Z',
  mood: null,
  drawings: [],
  textBlocks: [],
  stickers: [],
  audioNotes: [],
  data: { content: '' },
  ...extra,
});

const makeNotebook = ({ pages = 3, lastPageIndex = 0, pageExtra } = {}) => ({
  id: 'nb_1',
  title: 'Defter',
  coverTemplateId: 'cover_1',
  paperTemplateId: 'blank_dotted',
  coverDrawings: [],
  coverTextBlocks: [],
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  lastPageIndex,
  pages: Array.from({ length: pages }, (_, i) => makePage(i, pageExtra ? pageExtra(i) : {})),
});

/**
 * @param {object} opts
 * @param {string} [opts.rev] - git surumu; yoksa calisma agaci
 * @param {'notlarim'|'gunluk'} [opts.screen]
 * @param {object} [opts.initial] - AsyncStorage baslangic icerigi
 */
const openNotebookScreen = async ({ rev, screen = 'notlarim', initial } = {}) => {
  installFakeDom();
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const clock = createClock();
  const store = createFakeAsyncStorage(
    initial || (screen === 'gunluk'
      ? { [DIARY]: JSON.stringify({ ...makeNotebook(), id: 'my_diary' }) }
      : { [NOTEBOOKS]: JSON.stringify([makeNotebook()]) })
  );
  store.setClock(clock);
  const registry = createRegistry();
  const { mocks } = createScreenMocks({
    registry,
    params: screen === 'gunluk' ? {} : { notebookId: 'nb_1' },
  });
  mocks['@react-native-async-storage/async-storage'] = { __esModule: true, default: store.api };
  const logs = [];
  const fakeConsole = {
    log: (...a) => logs.push(a.join(' ')),
    warn: (...a) => logs.push('WARN ' + a.join(' ')),
    error: (...a) => logs.push('ERR ' + a.join(' ')),
    info() {},
    debug() {},
  };
  const loader = createLoader({
    rev,
    real: REAL_MODULES,
    mocks,
    globals: {
      setTimeout: clock.setTimeout,
      clearTimeout: clock.clearTimeout,
      setInterval: clock.setInterval,
      clearInterval: clock.clearInterval,
      requestAnimationFrame: clock.requestAnimationFrame,
      cancelAnimationFrame: clock.cancelAnimationFrame,
      __DEV__: false,
      console: fakeConsole,
    },
  });
  const entry = screen === 'gunluk' ? 'app/gunlugum/pages.js' : 'app/defterlerim/[notebookId]/pages.js';
  const Screen = loader.load(entry).default;
  const container = global.document.createElement('div');
  const root = createRoot(container);

  // React'in "act disinda guncelleme" uyarilari sahte saat yuzunden beklenir; susturulur
  const origError = console.error;
  console.error = (...a) => {
    const text = String(a[0]);
    if (text.includes('act(') || text.includes('not wrapped in act')) return;
    origError(...a);
  };

  const act = async (fn) => {
    await React.act(async () => {
      fn && fn();
      await flushMicrotasks(5);
    });
  };
  /** Sahte saati adim adim ilerletir; her adimda React ve promise'ler bosaltilir */
  const tick = async (ms, step = 25) => {
    for (let t = 0; t < ms; t += step) {
      await act(() => clock.advance(step));
    }
  };

  await act(() => root.render(React.createElement(Screen)));

  const key = screen === 'gunluk' ? DIARY : NOTEBOOKS;
  return {
    React,
    clock,
    store,
    registry,
    logs,
    key,
    act,
    tick,
    loader,
    /** Aktif sayfaya bir cizgi ekler (gercek tuvalin cizgi bitimindeki cagrisi) */
    draw: async (id) => {
      const canvas = activeDrawingCanvas(registry);
      if (!canvas) throw new Error('aktif DrawingCanvas yok');
      const stroke = { id, d: 'M 1 1 L 2 2', color: '#000', strokeWidth: 3, points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] };
      await act(() => canvas.onDrawingsChange([...(canvas.drawings || []), stroke]));
    },
    keyWrites: () => store.writesFor(key),
    unmount: async () => {
      await act(() => root.unmount());
      console.error = origError;
    },
  };
};

/** "updatedAt" alanlari cikarilmis metin: yalnizca zaman damgasi farki olan yazmalari ayirir */
const stripUpdatedAt = (text) => text.replace(/"updatedAt":"[^"]*"/g, '');

module.exports = { openNotebookScreen, makeNotebook, makePage, stripUpdatedAt, NOTEBOOKS, DIARY };
