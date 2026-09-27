/**
 * securityLockout.test.js
 *
 * B2: PIN kademeli deneme sinirinin matematigi.
 * B3: Arka plana gecince oturum kilidinin dusurulmesi ve tolerans mantigi.
 *
 * Mantik kopyalanmaz: gercek fonksiyonlar kaynak dosyalardan okunup calistirilir.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const securitySource = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'securityService.js'),
  'utf8'
);
const biometricSource = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'biometricService.js'),
  'utf8'
);

const extract = (source, pattern, label) => {
  const m = pattern.exec(source);
  assert.ok(m, label + ' kaynakta bulunmali');
  return m[0];
};

console.log('--- Guvenlik: Deneme Siniri ve Otomatik Kilit Testleri ---');

// ─── B2: Kademeli gecikme merdiveni ──────────────────────────────────
const freeAttempts = /export const PIN_FREE_ATTEMPTS = (\d+);/.exec(securitySource);
assert.ok(freeAttempts, 'PIN_FREE_ATTEMPTS tanimli olmali');

const ladderDecl = extract(
  securitySource,
  /export const PIN_LOCKOUT_LADDER_MS = \[[^\]]*\];/,
  'PIN_LOCKOUT_LADDER_MS'
);
const durationDecl = extract(
  securitySource,
  /export const getLockoutDurationMs = \(failedCount\) => \{[\s\S]*?\n\};/,
  'getLockoutDurationMs'
);
const stateDecl = extract(
  securitySource,
  /export const computeAttemptState = \(record, now\) => \{[\s\S]*?\n\};/,
  'computeAttemptState'
);

// eslint-disable-next-line no-new-func
const api = new Function(
  freeAttempts[0].replace('export ', '') + '\n' +
    ladderDecl.replace('export ', '') + '\n' +
    durationDecl.replace('export ', '') + '\n' +
    stateDecl.replace('export ', '') + '\n' +
    'return { PIN_FREE_ATTEMPTS, PIN_LOCKOUT_LADDER_MS, getLockoutDurationMs, computeAttemptState };'
)();

// --- Test 1: ilk 3 deneme serbest ---
{
  [0, 1, 2, 3].forEach((n) => {
    assert.strictEqual(api.getLockoutDurationMs(n), 0, n + '. denemede bekleme olmamali');
  });
  console.log('OK Test 1: ilk ' + api.PIN_FREE_ATTEMPTS + ' yanlis deneme serbest');
}

// --- Test 2: merdiven dogru tirmaniyor ---
{
  const expected = [
    [4, 30000],
    [5, 60000],
    [6, 120000],
    [7, 300000],
    [8, 900000],
  ];
  expected.forEach(([count, ms]) => {
    assert.strictEqual(
      api.getLockoutDurationMs(count),
      ms,
      count + '. yanlis denemede bekleme ' + ms + ' ms olmali'
    );
  });
  console.log('OK Test 2: gecikme merdiveni 30sn -> 1dk -> 2dk -> 5dk -> 15dk');
}

// --- Test 3: tavan asilmiyor ---
{
  [9, 15, 50, 1000].forEach((n) => {
    assert.strictEqual(
      api.getLockoutDurationMs(n),
      900000,
      n + '. denemede bekleme tavanda (15 dk) kalmali'
    );
  });
  console.log('OK Test 3: bekleme suresi 15 dakika tavaninda kaliyor');
}

// --- Test 4: gecersiz girdiler cokmeye yol acmamali ---
{
  [undefined, null, NaN, -5, 'abc'].forEach((v) => {
    assert.strictEqual(api.getLockoutDurationMs(v), 0, JSON.stringify(v) + ' icin 0 donmeli');
  });
  console.log('OK Test 4: gecersiz sayac degerleri guvenli sekilde 0 donuyor');
}

// --- Test 5: computeAttemptState ---
{
  const now = 1_000_000;

  const fresh = api.computeAttemptState(undefined, now);
  assert.strictEqual(fresh.failedCount, 0);
  assert.strictEqual(fresh.isLocked, false);
  assert.strictEqual(fresh.remainingAttempts, api.PIN_FREE_ATTEMPTS);

  const oneFail = api.computeAttemptState({ failedCount: 1, lockedUntil: 0 }, now);
  assert.strictEqual(oneFail.isLocked, false);
  assert.strictEqual(oneFail.remainingAttempts, api.PIN_FREE_ATTEMPTS - 1);

  const locked = api.computeAttemptState({ failedCount: 4, lockedUntil: now + 30000 }, now);
  assert.strictEqual(locked.isLocked, true);
  assert.strictEqual(locked.remainingMs, 30000);
  assert.strictEqual(locked.remainingAttempts, 0);

  const expired = api.computeAttemptState({ failedCount: 4, lockedUntil: now - 1 }, now);
  assert.strictEqual(expired.isLocked, false, 'suresi dolmus kilit acik sayilmali');
  assert.strictEqual(expired.remainingMs, 0);

  console.log('OK Test 5: computeAttemptState kilit/kalan hak hesabi dogru');
}

// --- Test 6: sayac diske yaziliyor (kaynak denetimi) ---
{
  assert.ok(
    /const PIN_ATTEMPTS_KEY = '@ajanda_pin_attempts_v1';/.test(securitySource),
    'Deneme sayaci icin kalici bir depolama anahtari tanimli olmali'
  );
  assert.ok(
    /await AsyncStorage\.setItem\(PIN_ATTEMPTS_KEY, JSON\.stringify\(map\)\)/.test(securitySource),
    'Sayac AsyncStorage uzerine yazilmali (uygulamayi yeniden baslatmak siniri atlatmamali)'
  );
  assert.ok(
    /async registerFailedAttempt\(targetId = 'diary'\)/.test(securitySource) &&
      /async clearAttempts\(targetId = 'diary'\)/.test(securitySource) &&
      /async getAttemptState\(targetId = 'diary'\)/.test(securitySource),
    'registerFailedAttempt / clearAttempts / getAttemptState servis uzerinde bulunmali'
  );
  console.log('OK Test 6: deneme sayaci kalici (diske yaziliyor) ve servis API tam');
}

// --- Test 7: kilitliyken tus girisi kabul edilmiyor (kaynak denetimi) ---
{
  const modal = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'security', 'PinAuthModal.js'),
    'utf8'
  );
  assert.ok(
    /if \(isLockedOut\) return;/.test(modal),
    'Kilit suresince handlePressDigit erken donmeli'
  );
  assert.ok(
    /pointerEvents=\{isLockedOut \? 'none' : 'auto'\}/.test(modal),
    'Kilit suresince tus takimi dokunmayi kabul etmemeli'
  );
  assert.ok(
    /await handleWrongAttempt\(/.test(modal),
    'Yanlis PIN dallari handleWrongAttempt kullanmali'
  );
  assert.ok(/await resetAttempts\(\);/.test(modal), 'Dogru PIN sayaci sifirlamali');
  console.log('OK Test 7: kilitliyken giris bloklaniyor, dogru PIN sayaci sifirliyor');
}

// ─── B3: Arka plana gecince otomatik kilit ───────────────────────────
const autoLockDecl = extract(
  biometricSource,
  /export const startSessionAutoLock = \(graceMs = BACKGROUND_LOCK_GRACE_MS\) => \{[\s\S]*?\n\};/,
  'startSessionAutoLock'
);

/** Sahte AppState ve saat ile gercek fonksiyonu calistirir */
const buildAutoLock = () => {
  let handler = null;
  let cleared = 0;
  let nowValue = 0;

  const AppState = {
    addEventListener: (_event, fn) => {
      handler = fn;
      return { remove: () => { handler = null; } };
    },
  };

  // `backgroundedAt` modul duzeyinde tanimli; cikarilan fonksiyonla birlikte enjekte edilir
  const backgroundedAtDecl = extract(
    biometricSource,
    /let backgroundedAt = null;/,
    'backgroundedAt'
  );

  // eslint-disable-next-line no-new-func
  const start = new Function(
    'AppState',
    'clearAllUnlockedSessions',
    'BACKGROUND_LOCK_GRACE_MS',
    'Date',
    backgroundedAtDecl + '\n' + autoLockDecl.replace('export ', '') + '\nreturn startSessionAutoLock;'
  )(
    AppState,
    () => { cleared++; },
    30000,
    { now: () => nowValue }
  );

  return {
    start,
    fire: (state) => handler && handler(state),
    setNow: (v) => { nowValue = v; },
    clearedCount: () => cleared,
  };
};

// --- Test 8: 'inactive' ASLA kilitlemez (Face ID dongusu korumasi) ---
{
  const h = buildAutoLock();
  const stop = h.start();
  h.setNow(0);

  // Face ID istemi senaryosu: active -> inactive -> active
  h.fire('inactive');
  h.setNow(120000); // iki dakika sonra bile
  h.fire('active');

  assert.strictEqual(
    h.clearedCount(),
    0,
    "'inactive' durumu kilitlemeye yol acmamali; aksi halde Face ID ile acarken sonsuz dongu olusur"
  );
  stop();
  console.log("OK Test 8: 'inactive' (Face ID istemi, bildirim cubugu) kilitlemiyor");
}

// --- Test 9: tolerans icinde donuste kilitlenmiyor ---
{
  const h = buildAutoLock();
  const stop = h.start();
  h.setNow(0);
  h.fire('background');
  h.setNow(29999); // 30 sn'nin altinda
  h.fire('active');

  assert.strictEqual(h.clearedCount(), 0, 'Tolerans suresi icinde donuste kilit dusmemeli');
  stop();
  console.log('OK Test 9: 30 sn toleransi icinde donuste PIN tekrar sorulmuyor');
}

// --- Test 10: tolerans asilinca kilitleniyor ---
{
  const h = buildAutoLock();
  const stop = h.start();
  h.setNow(0);
  h.fire('background');
  h.setNow(30001); // tolerans asildi
  h.fire('active');

  assert.strictEqual(h.clearedCount(), 1, 'Tolerans asildiginda oturum kilitleri dusmeli');
  stop();
  console.log('OK Test 10: 30 sn toleransi asilinca oturum kilitleri dusuyor');
}

// --- Test 11: art arda gecisler sayaci dogru tutuyor ---
{
  const h = buildAutoLock();
  const stop = h.start();

  h.setNow(0);
  h.fire('background');
  h.setNow(10000);
  h.fire('active'); // tolerans icinde, kilit yok
  assert.strictEqual(h.clearedCount(), 0);

  // Onceki background damgasi temizlenmis olmali: tek basina 'active' kilitlememeli
  h.setNow(500000);
  h.fire('active');
  assert.strictEqual(h.clearedCount(), 0, 'Arka plana gecmeden gelen active kilitlememeli');

  h.fire('background');
  h.setNow(600000);
  h.fire('active');
  assert.strictEqual(h.clearedCount(), 1, 'Ikinci uzun arka plandan sonra kilitlenmeli');

  stop();
  console.log('OK Test 11: art arda arka plan/on plan gecisleri dogru izleniyor');
}

// --- Test 12: dinleyici mekanizmasi ve baglanti noktalari ---
{
  assert.ok(
    /export const addSessionLockListener = \(listener\) => \{/.test(biometricSource),
    'addSessionLockListener tanimli olmali'
  );
  assert.ok(
    /sessionLockListeners\.forEach\(\(listener\) => \{/.test(biometricSource),
    'clearAllUnlockedSessions dinleyicileri bilgilendirmeli'
  );

  const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.js'), 'utf8');
  assert.ok(
    /useEffect\(\(\) => startSessionAutoLock\(\), \[\]\);/.test(layout),
    'Otomatik kilit uygulama kokunde baslatilmali'
  );

  const pagesView = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'notebook', 'NotebookPagesView.js'),
    'utf8'
  );
  assert.ok(
    /addSessionLockListener\(\(\) => setIsUnlocked\(false\)\)/.test(pagesView),
    'Kendi isUnlocked state\'ini tutan ekran dinleyiciye abone olmali'
  );
  console.log('OK Test 12: dinleyici mekanizmasi ve baglanti noktalari yerinde');
}

console.log('--- TUM GUVENLIK TESTLERI BASARIYLA GECTI! ---');
