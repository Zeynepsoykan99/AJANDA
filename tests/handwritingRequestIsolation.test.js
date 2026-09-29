/**
 * handwritingRequestIsolation.test.js
 *
 * E1: El yazisi tanimada zaman asimi zamanlayicisinin YANLIS istegi iptal etmesi.
 *
 * Eski kod modul duzeyinde tek bir `activeAbortController` paylasiyordu:
 *   - A istegi baslar, `activeAbortController` = A
 *   - B istegi baslar, degiskenin uzerine yazar -> `activeAbortController` = B
 *   - A'nin 8 sn zamanlayicisi tetiklenir ve `activeAbortController`'i, yani B'yi iptal eder
 * Ustelik A iptal edilip `catch`'e dustugunde `clearTimeout` hic calismadigi icin
 * A'nin zamanlayicisi hayatta kaliyordu.
 *
 * Yontem: once eski davranis birebir taklit edilip hatanin GERCEK oldugu gosterilir,
 * sonra kaynaktaki GERCEK fonksiyon cikarilip ayni senaryoda calistirilir.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SERVICE_PATH = path.join(__dirname, '..', 'services', 'handwritingService.js');
const source = fs.readFileSync(SERVICE_PATH, 'utf8');

console.log('--- El Yazisi Tanima: Istek Yalitimi Testleri ---');

/** Elle tetiklenebilen sahte zamanlayici */
const createTimers = () => {
  const timers = [];
  return {
    setTimeout(fn, ms) {
      timers.push({ fn, ms, cleared: false, fired: false });
      return timers.length - 1;
    },
    clearTimeout(id) {
      if (timers[id]) timers[id].cleared = true;
    },
    fire(id) {
      const t = timers[id];
      if (t && !t.cleared && !t.fired) {
        t.fired = true;
        t.fn();
      }
    },
    fireAll() {
      timers.forEach((_, i) => this.fire(i));
    },
    isCleared: (id) => Boolean(timers[id] && timers[id].cleared),
    count: () => timers.length,
  };
};

/** Istek basina kontrol edilebilen sahte fetch */
const createFetch = () => {
  const calls = [];
  const fetchImpl = (url, opts) => {
    const call = { url, signal: opts.signal, resolve: null, reject: null, settled: false };
    const promise = new Promise((resolve, reject) => {
      call.resolve = (value) => {
        if (call.settled) return;
        call.settled = true;
        resolve(value);
      };
      call.reject = (err) => {
        if (call.settled) return;
        call.settled = true;
        reject(err);
      };
    });
    // Gercek fetch gibi: signal iptal edilirse istek AbortError ile reddedilir
    opts.signal.addEventListener('abort', () => {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      call.reject(err);
    });
    calls.push(call);
    return promise;
  };
  return { fetchImpl, calls };
};

const okResponse = (text) => ({
  ok: true,
  json: async () => ['SUCCESS', [['', [text]]]],
});

// ─── Test 1: ESKI davranis gercekten yanlis istegi iptal ediyor ──────
{
  const timers = createTimers();
  const { fetchImpl, calls } = createFetch();

  // Eski implementasyonun cekirdegi (modul duzeyinde paylasilan denetleyici)
  let activeAbortController = null;

  const legacyRecognize = async () => {
    if (activeAbortController) activeAbortController.abort();
    activeAbortController = new AbortController();

    let timeoutId;
    try {
      timeoutId = timers.setTimeout(() => {
        // HATA: kendi denetleyicisini degil, o anki paylasilan denetleyiciyi iptal eder
        if (activeAbortController) activeAbortController.abort();
      }, 8000);

      const response = await fetchImpl('url', { signal: activeAbortController.signal });
      timers.clearTimeout(timeoutId); // HATA: yalnizca basari yolunda
      return { ok: response.ok };
    } catch (e) {
      return { aborted: e.name === 'AbortError' };
    }
  };

  const aPromise = legacyRecognize(); // A basladi, timer id 0
  const bPromise = legacyRecognize(); // B basladi, A iptal edildi, timer id 1

  aPromise.then(() => {
    // A iptal edildi ve catch'e dustu; A'nin zamanlayicisi TEMIZLENMEDI
    assert.strictEqual(timers.isCleared(0), false, "A'nin zamanlayicisi temizlenmemis olmali");

    // A'nin zamanlayicisi tetiklenir: paylasilan denetleyici artik B
    timers.fire(0);

    return bPromise.then((bResult) => {
      assert.strictEqual(
        bResult.aborted,
        true,
        "ESKI davranis: A'nin zamanlayicisi B'yi iptal etmeli (hatanin kaniti)"
      );
      assert.strictEqual(calls.length, 2);
      console.log("OK Test 1: eski davranis gercekten A'nin zamanlayicisiyla B'yi iptal ediyor");
      runFixedTests();
    });
  });
}

// ─── Gercek fonksiyonu kaynaktan cikar ───────────────────────────────
function buildRealRecognize(deps) {
  const counterDecl = /let currentRequestId = 0;/.exec(source);
  assert.ok(counterDecl, 'currentRequestId bildirimi kaynakta bulunmali');

  const fnDecl = /export async function recognizeHandwriting\(drawings, options = \{ language: 'tr' \}\) \{[\s\S]*?\n\}/.exec(
    source
  );
  assert.ok(fnDecl, 'recognizeHandwriting kaynakta bulunmali');

  // eslint-disable-next-line no-new-func
  return new Function(
    'formatStrokesForDigitalInk',
    'calculateWritingArea',
    'fetch',
    'AbortController',
    'setTimeout',
    'clearTimeout',
    '__DEV__',
    counterDecl[0] +
      '\n' +
      fnDecl[0].replace('export async function', 'async function') +
      '\nreturn recognizeHandwriting;'
  )(
    deps.formatStrokesForDigitalInk,
    deps.calculateWritingArea,
    deps.fetch,
    AbortController,
    deps.setTimeout,
    deps.clearTimeout,
    false
  );
}

const DRAWINGS = [{ points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }];

function runFixedTests() {
  // ─── Test 2: DUZELTILMIS kod - A'nin zamanlayicisi B'yi iptal etmiyor ──
  const timers = createTimers();
  const { fetchImpl, calls } = createFetch();

  const recognize = buildRealRecognize({
    formatStrokesForDigitalInk: () => [[[0, 10], [0, 10], [0, 1]]],
    calculateWritingArea: () => ({ minX: 0, minY: 0, width: 10, height: 10 }),
    fetch: fetchImpl,
    setTimeout: timers.setTimeout.bind(timers),
    clearTimeout: timers.clearTimeout.bind(timers),
  });

  const aPromise = recognize(DRAWINGS); // timer 0
  const bPromise = recognize(DRAWINGS); // timer 1

  setImmediate(() => {
    assert.strictEqual(calls.length, 2, 'iki istek de ucmus olmali');
    assert.strictEqual(
      calls[0].signal.aborted,
      false,
      'DUZELTILMIS: B baslayinca A iptal EDILMEMELI (istekler yalitildi)'
    );
    assert.strictEqual(calls[1].signal.aborted, false, 'B de iptal edilmemis olmali');
    console.log('OK Test 2: escaman istekler birbirini iptal etmiyor');

    // A'nin zamanlayicisini tetikle: yalnizca A'yi iptal etmeli
    timers.fire(0);
    assert.strictEqual(calls[0].signal.aborted, true, "A kendi zamanlayicisiyla iptal olmali");
    assert.strictEqual(
      calls[1].signal.aborted,
      false,
      "A'nin zamanlayicisi B'ye DOKUNMAMALI (E1'in cozumu)"
    );
    console.log("OK Test 3: bir istegin zamanlayicisi yalnizca kendi istegini iptal ediyor");

    // B basariyla tamamlansin
    calls[1].resolve(okResponse('merhaba'));

    Promise.all([aPromise, bPromise]).then(([aResult, bResult]) => {
      assert.strictEqual(aResult.aborted, true, 'A iptal edilmis olarak donmeli');
      assert.strictEqual(bResult.success, true, 'B basariyla tamamlanmali');
      assert.strictEqual(bResult.text, 'merhaba');
      console.log('OK Test 4: iptal edilen A dogru sonuc donduruyor, B etkilenmiyor');

      // A iptal edilip catch'e dustu: zamanlayicisi finally ile TEMIZLENMIS olmali
      assert.strictEqual(
        timers.isCleared(0),
        true,
        "Iptal edilen istegin zamanlayicisi finally icinde temizlenmeli"
      );
      assert.strictEqual(timers.isCleared(1), true, 'Tamamlanan istegin zamanlayicisi temizlenmeli');
      console.log('OK Test 5: zamanlayicilar her yolda (iptal ve basari) temizleniyor');

      runStaleTest();
    });
  });
}

// ─── Test 6: Bayat sonuc korumasi hala calisiyor ─────────────────────
function runStaleTest() {
  const timers = createTimers();
  const { fetchImpl, calls } = createFetch();

  const recognize = buildRealRecognize({
    formatStrokesForDigitalInk: () => [[[0, 10], [0, 10], [0, 1]]],
    calculateWritingArea: () => ({ minX: 0, minY: 0, width: 10, height: 10 }),
    fetch: fetchImpl,
    setTimeout: timers.setTimeout.bind(timers),
    clearTimeout: timers.clearTimeout.bind(timers),
  });

  const aPromise = recognize(DRAWINGS); // eski istek
  const bPromise = recognize(DRAWINGS); // yeni istek

  setImmediate(() => {
    // Once YENI istek, sonra ESKI istek tamamlansin
    calls[1].resolve(okResponse('yeni'));
    calls[0].resolve(okResponse('eski'));

    Promise.all([aPromise, bPromise]).then(([aResult, bResult]) => {
      assert.strictEqual(bResult.text, 'yeni', 'En son istek sonucunu dondurmeli');
      assert.strictEqual(
        aResult.stale,
        true,
        'Daha eski istek, gec tamamlansa bile bayat olarak isaretlenmeli'
      );
      assert.strictEqual(aResult.success, false);
      console.log('OK Test 6: bayat sonuc korumasi (stale) hala calisiyor');

      runSourceChecks();
    });
  });
}

// ─── Kaynak denetimleri ──────────────────────────────────────────────
function runSourceChecks() {
  assert.ok(
    !/^\s*let activeAbortController/m.test(source),
    'Modul duzeyinde paylasilan AbortController kalmamali'
  );
  assert.ok(
    /const controller = new AbortController\(\);/.test(source),
    'Her cagri kendi AbortController\'ini olusturmali'
  );
  assert.ok(
    /timeoutId = setTimeout\(\(\) => \{\s*\n\s*controller\.abort\(\);/.test(source),
    'Zaman asimi yalnizca kendi controller\'ini iptal etmeli'
  );
  assert.ok(
    /signal: controller\.signal,/.test(source),
    'fetch yerel controller signal\'ini kullanmali'
  );
  assert.ok(
    /\} finally \{[\s\S]{0,600}?if \(timeoutId !== null\) clearTimeout\(timeoutId\);/.test(source),
    'clearTimeout finally icinde ve `!== null` ile olmali (zamanlayici kimligi 0 olabilir)'
  );
  console.log('OK Test 7: kaynakta modul duzeyinde paylasilan denetleyici kalmadi');

  console.log('--- TUM ISTEK YALITIMI TESTLERI BASARIYLA GECTI! ---');
}
