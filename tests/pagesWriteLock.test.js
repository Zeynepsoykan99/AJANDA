/**
 * pagesWriteLock.test.js
 *
 * @ajanda_pages uzerindeki "oku -> degistir -> yaz" islemlerinin atomik oldugunu
 * dogrular. Ajandam ve Yapilacaklar ayni anahtari paylastigi icin bu kilit ikisini
 * birden korur.
 *
 * Mantik kopyalanmaz: withPagesLock fonksiyonu storageService.js kaynagindan
 * okunup gercek haliyle calistirilir.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SERVICE_PATH = path.join(__dirname, '..', 'services', 'storageService.js');
const source = fs.readFileSync(SERVICE_PATH, 'utf8');

console.log('--- Sayfa Yazma Kilidi Testleri ---');

// Gercek kilit implementasyonunu kaynaktan cikar
const queueDecl = /let pagesQueue = Promise\.resolve\(\);/.exec(source);
assert.ok(queueDecl, 'pagesQueue bildirimi kaynakta bulunmali');

const lockDecl = /const withPagesLock = \(task\) => \{[\s\S]*?\n\};/.exec(source);
assert.ok(lockDecl, 'withPagesLock kaynakta bulunmali');

// eslint-disable-next-line no-new-func
const withPagesLock = new Function(
  queueDecl[0] + '\n' + lockDecl[0] + '\nreturn withPagesLock;'
)();

/** Gecikmeli sahte depo: gercek AsyncStorage gibi asenkron davranir */
const createStore = (initial) => {
  let data = JSON.stringify(initial);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  return {
    async getItem() {
      await wait(10); // okuma gecikmesi -> yaris penceresi
      return data;
    },
    async setItem(value) {
      await wait(10); // yazma gecikmesi
      data = value;
    },
    current() {
      return JSON.parse(data);
    },
  };
};

/** updatePage'in yaptigi isin ayni sirasi: oku -> degistir -> yaz */
const readModifyWrite = (store, pageId, updates) => async () => {
  const pages = JSON.parse(await store.getItem());
  const index = pages.findIndex((p) => p.id === pageId);
  if (index !== -1) {
    pages[index] = { ...pages[index], ...updates };
    await store.setItem(JSON.stringify(pages));
  }
  return pages;
};

const INITIAL = [{ id: 'p1', drawings: [], stickers: [], recognizedText: '' }];

// --- Test 1: KILITSIZ hal gercekten veri kaybediyor (temel senaryo dogrulamasi) ---
(async () => {
  const store = createStore(INITIAL);

  // Iki yazma es zamanli baslar: biri cizim, digeri taninan metin
  await Promise.all([
    readModifyWrite(store, 'p1', { drawings: ['cizim-1'] })(),
    readModifyWrite(store, 'p1', { recognizedText: 'merhaba' })(),
  ]);

  const result = store.current()[0];
  const lost = result.drawings.length === 0 || result.recognizedText === '';
  assert.ok(
    lost,
    'Kilitsiz senaryonun veri kaybetmesi bekleniyordu; kaybetmediyse test senaryosu yarisi tetikleyemiyor demektir'
  );
  console.log(
    'OK Test 1: kilitsiz "oku-degistir-yaz" gercekten veri kaybediyor ' +
      '(drawings=' + JSON.stringify(result.drawings) +
      ', recognizedText=' + JSON.stringify(result.recognizedText) + ')'
  );

  // --- Test 2: GERCEK kilit ile veri kaybi yok ---
  const store2 = createStore(INITIAL);

  await Promise.all([
    withPagesLock(readModifyWrite(store2, 'p1', { drawings: ['cizim-1'] })),
    withPagesLock(readModifyWrite(store2, 'p1', { recognizedText: 'merhaba' })),
  ]);

  const r2 = store2.current()[0];
  assert.deepStrictEqual(r2.drawings, ['cizim-1'], 'çizim korunmalı');
  assert.strictEqual(r2.recognizedText, 'merhaba', 'tanınan metin korunmalı');
  console.log('OK Test 2: withPagesLock ile iki eşzamanlı yazmanın ikisi de korunuyor');

  // --- Test 3: Cok sayida cakisan yazma (stres) ---
  const store3 = createStore([{ id: 'p1', sayac: 0 }]);
  const increments = [];
  for (let i = 0; i < 20; i++) {
    increments.push(
      withPagesLock(async () => {
        const pages = JSON.parse(await store3.getItem());
        pages[0].sayac += 1;
        await store3.setItem(JSON.stringify(pages));
      })
    );
  }
  await Promise.all(increments);
  assert.strictEqual(
    store3.current()[0].sayac,
    20,
    'Kilit altında 20 artırmanın hepsi uygulanmalı (kayıp güncelleme olmamalı)'
  );
  console.log('OK Test 3: 20 çakışan yazmanın tamamı kayıpsız uygulanıyor');

  // --- Test 4: Bir gorev hata firlatirsa kuyruk kilitlenmemeli ---
  const store4 = createStore(INITIAL);
  let afterErrorRan = false;

  await withPagesLock(async () => {
    throw new Error('kasıtlı hata');
  }).catch(() => {});

  await withPagesLock(async () => {
    afterErrorRan = true;
    await store4.setItem(JSON.stringify([{ id: 'p1', ok: true }]));
  });

  assert.strictEqual(afterErrorRan, true, 'Hatalı görevden sonra kuyruk çalışmaya devam etmeli');
  assert.strictEqual(store4.current()[0].ok, true);
  console.log('OK Test 4: kuyruk, bir görev hata fırlatsa da kilitlenmiyor');

  // --- Test 5: Kaynak denetimi - tum sayfa fonksiyonlari kilit altinda ---
  const lockedFns = [
    ['getPages', /getPages: async \(\) => withPagesLock\(readPagesUnlocked\),/],
    ['addPage', /addPage: async \(page\) =>\s*\n\s*withPagesLock\(async \(\) => \{/],
    ['updatePage', /updatePage: async \(pageId, updates\) =>\s*\n\s*withPagesLock\(async \(\) => \{/],
    ['deletePage', /deletePage: async \(pageId\) =>\s*\n\s*withPagesLock\(async \(\) => \{/],
    ['reorderPages', /reorderPages: async \(orderedIds\) =>\s*\n\s*withPagesLock\(async \(\) => \{/],
  ];
  lockedFns.forEach(([name, pattern]) => {
    assert.ok(pattern.test(source), name + ' withPagesLock ile sarılmalı');
  });
  console.log('OK Test 5: getPages, addPage, updatePage, deletePage, reorderPages kilit altında');

  // --- Test 6: Deadlock korumasi - kilitli fonksiyonlar kilitli okuyucuyu cagirmamali ---
  assert.ok(
    !/StorageService\.getPages\(\)/.test(source),
    'Kilit altındaki fonksiyonlar StorageService.getPages() çağırmamalı (kuyruk kendini bekler = deadlock)'
  );
  assert.ok(
    /const readPagesUnlocked = async \(\) => \{/.test(source),
    'Kilitsiz okuyucu readPagesUnlocked tanımlı olmalı'
  );
  const lockedBodies = source.slice(source.indexOf('getPages: async () =>'));
  assert.ok(
    /const pages = await readPagesUnlocked\(\);/.test(lockedBodies),
    'Yazma fonksiyonları readPagesUnlocked kullanmalı'
  );
  console.log('OK Test 6: deadlock koruması yerinde (kilitli fonksiyonlar kilitsiz okuyucuyu kullanıyor)');

  // --- Test 7: Defter kuyrugu ile sayfa kuyrugu AYRI olmali ---
  assert.ok(/let journalQueue = Promise\.resolve\(\);/.test(source), 'journalQueue korunmalı');
  assert.ok(/let pagesQueue = Promise\.resolve\(\);/.test(source), 'pagesQueue ayrı tanımlı olmalı');
  assert.ok(
    !/const withPagesLock = withJournalLock/.test(source),
    'Sayfa kilidi defter kilidiyle aynı kuyruğu paylaşmamalı'
  );
  console.log('OK Test 7: defter ve sayfa kuyrukları birbirinden bağımsız');

  console.log('--- TÜM SAYFA YAZMA KİLİDİ TESTLERİ BAŞARIYLA GEÇTİ! ---');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
