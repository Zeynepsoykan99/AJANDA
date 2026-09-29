/**
 * pendingSaveFlush.test.js
 *
 * A2: Arka plana gecerken bekleyen (henuz debounce suresi dolmamis) degisikligin
 *     diske yazilmasi.
 * A3: setPage guncelleyicilerinin SAF olmasi (icinde StorageService cagrisi veya
 *     setTimeout kurulmamasi).
 * Ek: Uc debounce'lu kayit yolunun ayni zamanlayiciyi paylasip birbirinin
 *     kaydini iptal etmesi sonucu olusan VERI KAYBI.
 *
 * Yontem: once eski davranis birebir taklit edilip kaybin gercek oldugu
 * gosterilir, sonra kaynaktaki GERCEK scheduleSave/flushPendingSave cikarilip
 * ayni senaryoda calistirilir.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const AJANDAM = path.join(__dirname, '..', 'app', 'ajandam', '[pageId].js');
const TODOLIST = path.join(__dirname, '..', 'app', 'todolist', '[pageId].js');
const ajandamSource = fs.readFileSync(AJANDAM, 'utf8');
const todolistSource = fs.readFileSync(TODOLIST, 'utf8');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const FLUSH_RE = /  const flushPendingSave = useCallback\(async \(\) => \{[\s\S]*?\n  \}, \[pageId\]\);/;
const SCHEDULE_RE = /  const scheduleSave = useCallback\(\n[\s\S]*?\n    \[flushPendingSave\]\n  \);/;

/**
 * Kaynaktan GERCEK flushPendingSave + scheduleSave fonksiyonlarini cikarip
 * calistirilabilir hale getirir. Mantik kopyalanmaz, dosyadan okunur.
 */
const buildSaver = (source, label) => {
  const flushDecl = FLUSH_RE.exec(source);
  assert.ok(flushDecl, label + ': flushPendingSave kaynakta bulunmali');
  const scheduleDecl = SCHEDULE_RE.exec(source);
  assert.ok(scheduleDecl, label + ': scheduleSave kaynakta bulunmali');

  const body =
    flushDecl[0]
      .replace(
        'const flushPendingSave = useCallback(async () => {',
        'const flushPendingSave = async () => {'
      )
      .replace(/\n  \}, \[pageId\]\);$/, '\n  };') +
    '\n' +
    scheduleDecl[0]
      .replace('const scheduleSave = useCallback(\n', 'const scheduleSave = ')
      .replace(/,\n    \[flushPendingSave\]\n  \);$/, ';');

  const disk = {};
  const refs = { saveTimeoutRef: { current: null }, pendingSaveRef: { current: null } };
  let writeCount = 0;

  // eslint-disable-next-line no-new-func
  const api = new Function(
    'saveTimeoutRef',
    'pendingSaveRef',
    'pageId',
    'StorageService',
    'console',
    body + '\nreturn { flushPendingSave, scheduleSave };'
  )(
    refs.saveTimeoutRef,
    refs.pendingSaveRef,
    'page_1',
    {
      async updatePage(id, updates) {
        assert.strictEqual(id, 'page_1', label + ': yazma dogru sayfaya gitmeli');
        writeCount += 1;
        Object.assign(disk, updates);
      },
    },
    console
  );

  return { ...api, disk, refs, getWriteCount: () => writeCount };
};

console.log('--- Bekleyen Kayit / Flush Testleri ---');

(async () => {
  // --- Test 1: ESKI davranis gercekten veri kaybediyor ---------------
  {
    const disk = {};
    const saveTimeoutRef = { current: null };

    // Eski desen: her alan ayni zamanlayiciyi paylasir ve oncekini iptal eder
    const legacySave = (updates, delay) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        Object.assign(disk, updates);
      }, delay);
    };

    legacySave({ data: 'yazdigim metin' }, 60); // kullanici metin yazdi
    await wait(10);
    legacySave({ drawings: ['cizim'] }, 60); // 60 ms dolmadan cizim yapti
    await wait(120);

    assert.deepStrictEqual(
      disk,
      { drawings: ['cizim'] },
      'ESKI davranis: metin kaydi iptal edilmeli, yalnizca cizim yazilmali'
    );
    assert.strictEqual(disk.data, undefined, 'yazilan metin diske hic gitmemeli (kaybin kaniti)');
    console.log('OK Test 1: eski paylasilan zamanlayici gercekten metni kaybediyor');
  }

  // --- Test 2: YENI mekanizma alanlari biriktiriyor, kayip yok -------
  {
    const { scheduleSave, disk } = buildSaver(ajandamSource, 'ajandam');

    scheduleSave({ data: 'yazdigim metin' }, 60);
    await wait(10);
    scheduleSave({ drawings: ['cizim'] }, 60); // 60 ms dolmadan
    await wait(120);

    assert.deepStrictEqual(
      disk,
      { data: 'yazdigim metin', drawings: ['cizim'] },
      'Yeni mekanizmada HER IKI alan da diske yazilmali'
    );
    console.log('OK Test 2: bekleyen degisiklikler birikiyor, hicbir alan kaybolmuyor');
  }

  // --- Test 3: A2 - flush bekleyen degisikligi HEMEN yaziyor ---------
  {
    const { scheduleSave, flushPendingSave, disk, refs } = buildSaver(ajandamSource, 'ajandam');

    scheduleSave({ data: 'kaydedilmemis' }, 5000); // cok uzun debounce
    assert.deepStrictEqual(disk, {}, 'zamanlayici dolmadan diske yazilmamali');

    await flushPendingSave(); // uygulama arka plana gecti

    assert.deepStrictEqual(disk, { data: 'kaydedilmemis' }, 'flush hemen diske yazmali');
    assert.strictEqual(refs.saveTimeoutRef.current, null, 'flush zamanlayiciyi temizlemeli');
    assert.strictEqual(refs.pendingSaveRef.current, null, 'flush bekleyen yuku bosaltmali');
    console.log('OK Test 3: flush bekleyen degisikligi beklemeden diske yaziyor');
  }

  // --- Test 4: Ikinci flush mukerrer yazma yapmamali -----------------
  {
    const { scheduleSave, flushPendingSave, getWriteCount } = buildSaver(ajandamSource, 'ajandam');

    scheduleSave({ data: 'x' }, 5000);
    await flushPendingSave();
    await flushPendingSave(); // bekleyen bir sey kalmadi
    await wait(20);

    assert.strictEqual(getWriteCount(), 1, 'Bos bekleyen yuk icin ikinci flush yazma yapmamali');
    console.log('OK Test 4: bos bekleyen yukte ikinci flush gereksiz yazma yapmiyor');
  }

  // --- Test 5: flush sonrasi eski zamanlayici geri tetiklenmemeli ----
  {
    const { scheduleSave, flushPendingSave, getWriteCount } = buildSaver(ajandamSource, 'ajandam');

    scheduleSave({ data: 'x' }, 30);
    await flushPendingSave(); // zamanlayici dolmadan arka plana gecildi
    await wait(80); // eski zamanlayicinin dolacagi an gecti

    assert.strictEqual(
      getWriteCount(),
      1,
      'flush zamanlayiciyi iptal ettigi icin ikinci yazma olmamali'
    );
    console.log('OK Test 5: flush eski zamanlayiciyi iptal ediyor, ikinci yazma yok');
  }

  // --- Test 6: todolist ekrani da ayni mekanizmayi kullaniyor --------
  {
    const { scheduleSave, disk } = buildSaver(todolistSource, 'todolist');
    scheduleSave({ data: 'a' }, 40);
    await wait(10);
    scheduleSave({ textBlocks: ['b'] }, 40);
    await wait(90);
    assert.deepStrictEqual(disk, { data: 'a', textBlocks: ['b'] });
    console.log('OK Test 6: todolist ekrani da ayni birikimli mekanizmayi kullaniyor');
  }

  runSourceChecks();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

// --- Kaynak denetimleri ---------------------------------------------
function runSourceChecks() {
  [
    ['ajandam', ajandamSource],
    ['todolist', todolistSource],
  ].forEach(([label, source]) => {
    // A2: yalnizca 'background' flush tetiklemeli
    assert.ok(
      /AppState\.addEventListener\('change', \(nextState\) => \{\s*\n\s*if \(nextState === 'background'\) \{\s*\n\s*flushPendingSave\(\);/.test(
        source
      ),
      label + ": AppState 'background' gecisinde flush cagirmali"
    );
    assert.ok(
      !/nextState === 'inactive'/.test(source),
      label + ": 'inactive' durumunda flush yapilmamali (gecici odak kaybi)"
    );
    assert.ok(
      /useEffect\(\(\) => \(\) => \{\s*\n?\s*flushPendingSave\(\);\s*\n?\s*\}, \[flushPendingSave\]\);/.test(
        source
      ),
      label + ': ekrandan ayrilirken de flush edilmeli'
    );

    // A3: duzeltilen uc isleyicinin setPage guncelleyicileri SAF olmali
    ['handleDataChange', 'handleDrawingsChange', 'handleTextBlocksChange'].forEach((fn) => {
      const m = new RegExp('  const ' + fn + ' = useCallback\\(\\n[\\s\\S]*?\\n  \\);').exec(source);
      assert.ok(m, label + ': ' + fn + ' bulunmali');
      const updater = /setPage\(\(prev\) => [\s\S]*?\);/.exec(m[0]);
      assert.ok(updater, label + ': ' + fn + ' setPage guncelleyicisi icermeli');
      assert.ok(
        !/StorageService|setTimeout/.test(updater[0]),
        label + ': ' + fn + ' guncelleyicisi SAF olmali (StorageService/setTimeout icermemeli)'
      );
      assert.ok(
        /scheduleSave\(/.test(m[0]),
        label + ': ' + fn + ' yazmayi scheduleSave uzerinden yapmali'
      );
    });

    // A3: sticker silme onayi artik guncelleyici icinde yazmiyor
    assert.ok(
      /StorageService\.updatePage\(pageId, \{ stickers: pageRef\.current\?\.stickers \|\| \[\] \}\);/.test(
        source
      ),
      label + ': sticker silme yazmasi guncelleyici disinda, pageRef uzerinden olmali'
    );
  });
  console.log('OK Test 7: iki ekranda da AppState flush kurulu ve duzeltilen guncelleyiciler saf');

  // A1 ile uyum: yazmalar hala tek kapidan (withPagesLock) geciyor
  const storage = fs.readFileSync(
    path.join(__dirname, '..', 'services', 'storageService.js'),
    'utf8'
  );
  assert.ok(
    /updatePage: async \(pageId, updates\) =>[\s\S]{0,40}withPagesLock\(/.test(storage),
    'updatePage hala withPagesLock altinda olmali (A1 ile cakisma yok)'
  );
  console.log('OK Test 8: flush yazmalari A1 sayfa kilidi uzerinden gidiyor');

  console.log('--- TUM BEKLEYEN KAYIT TESTLERI BASARIYLA GECTI! ---');
}
