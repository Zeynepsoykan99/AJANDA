/**
 * pressGuards.test.js
 *
 * C3: Kalan async onPress isleyicilerinde hizli cift basis incelemesi.
 *
 * Yedi isleyici tek tek degerlendirildi; yalnizca IKISINDE gercek bir sorun
 * bulundu ve koruma eklendi. Digerleri icin bu dosya, "incelendi ve zararsiz
 * bulundu" kararini kayit altina alir; ileride biri koruma eklemeye kalkarsa
 * gerekcesini burada gorur.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8');

const recorderSource = read('components', 'audio', 'AudioRecorderModal.js');
const playerSource = read('components', 'audio', 'AudioNotePlayer.js');
const analyticsSource = read('components', 'diary', 'MonthlyMoodAnalyticsModal.js');
const coverSource = read('components', 'notebook', 'NotebookCoverView.js');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('--- Hizli Cift Basis (Press Guard) Testleri ---');

// ─── 1. handleTogglePreview: GERCEK sorun ────────────────────────────

/** Gecikmeli sahte ses yukleyici: her cagri yeni bir "Sound" uretir */
const createAudioFactory = () => {
  const created = [];
  return {
    created,
    async createAsync() {
      await wait(20);
      const sound = { id: created.length + 1, unloaded: false, playing: true };
      created.push(sound);
      return { sound };
    },
  };
};

(async () => {
  // --- Test 1: KORUMASIZ hal iki Sound olusturuyor ---
  {
    const factory = createAudioFactory();
    let previewSound = null; // React state'i taklit eder (bir render geride)

    const unguardedToggle = async () => {
      if (!previewSound) {
        const { sound } = await factory.createAsync();
        previewSound = sound; // ikinci cagri birincinin uzerine yazar
      }
    };

    await Promise.all([unguardedToggle(), unguardedToggle()]);

    assert.strictEqual(factory.created.length, 2, 'korumasiz halde iki Sound olusmali');
    assert.strictEqual(previewSound.id, 2, 'ikinci Sound state\'i ele gecirmeli');
    assert.strictEqual(
      factory.created[0].unloaded,
      false,
      'birinci Sound sahipsiz kalir: hic unload edilmez ve calmaya devam eder'
    );
    console.log('OK Test 1: korumasiz onizleme gercekten iki ses akisi olusturuyor');
  }

  // --- Test 2: KORUMALI hal tek Sound olusturuyor ---
  {
    const factory = createAudioFactory();
    let previewSound = null;
    const previewPendingRef = { current: false };

    const guardedToggle = async () => {
      if (previewPendingRef.current) return;
      previewPendingRef.current = true;
      try {
        if (!previewSound) {
          const { sound } = await factory.createAsync();
          previewSound = sound;
        }
      } finally {
        previewPendingRef.current = false;
      }
    };

    await Promise.all([guardedToggle(), guardedToggle(), guardedToggle()]);

    assert.strictEqual(factory.created.length, 1, 'koruma ile yalnizca tek Sound olusmali');
    assert.strictEqual(previewSound.id, 1);
    console.log('OK Test 2: koruma ile ucundan yalnizca biri ses yukluyor');
  }

  // --- Test 3: handleShare korumasi ---
  {
    let openCount = 0;
    const sharePendingRef = { current: false };

    const guardedShare = async () => {
      if (sharePendingRef.current) return;
      sharePendingRef.current = true;
      try {
        openCount++;
        await wait(20); // paylasim sayfasi acik
      } finally {
        sharePendingRef.current = false;
      }
    };

    await Promise.all([guardedShare(), guardedShare(), guardedShare()]);
    assert.strictEqual(openCount, 1, 'Paylasim sayfasi yalnizca bir kez acilmali');

    // Kapandiktan sonra tekrar acilabilmeli
    await guardedShare();
    assert.strictEqual(openCount, 2, 'Paylasim kapandiktan sonra tekrar acilabilmeli');
    console.log('OK Test 3: paylasim sayfasi cift acilmiyor, kapandiktan sonra tekrar acilabiliyor');
  }

  runSourceChecks();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

function runSourceChecks() {
  // --- Test 4: Eklenen iki koruma kaynakta ---
  assert.ok(
    /if \(previewPendingRef\.current\) return;\s*\n\s*previewPendingRef\.current = true;/.test(
      recorderSource
    ),
    'handleTogglePreview previewPendingRef korumasi tasimali'
  );
  assert.ok(
    /\} finally \{\s*\n\s*previewPendingRef\.current = false;\s*\n\s*\}/.test(recorderSource),
    'Onizleme korumasi finally ile serbest birakilmali'
  );
  assert.ok(
    /if \(sharePendingRef\.current\) return;\s*\n\s*sharePendingRef\.current = true;/.test(
      analyticsSource
    ),
    'handleShare sharePendingRef korumasi tasimali'
  );
  assert.ok(
    /\} finally \{\s*\n\s*sharePendingRef\.current = false;\s*\n\s*\}/.test(analyticsSource),
    'Paylasim korumasi finally ile serbest birakilmali'
  );
  console.log('OK Test 4: iki yeni koruma kaynakta ve finally ile serbest birakiliyor');

  // --- Test 5: handleOpenNotebook zaten korumali (gerileme korumasi) ---
  assert.ok(
    /if \(!notebook \|\| isOpeningRef\.current\) return;\s*\n\s*isOpeningRef\.current = true;/.test(
      coverSource
    ),
    'handleOpenNotebook mevcut isOpeningRef korumasini korumali (cift gezinme engeli)'
  );
  console.log('OK Test 5: handleOpenNotebook zaten var olan cift gezinme korumasini koruyor');

  // --- Test 6: Zararsiz bulunan isleyicilerin dayanaklari hala gecerli ---
  // handleSeekTouch zararsizdir CUNKU loadSound es zamanli cagrilari tekillestirir.
  assert.ok(
    /if \(loadPromiseRef\.current\) \{\s*\n\s*return loadPromiseRef\.current;/.test(playerSource),
    'handleSeekTouch korumasiz birakildi cunku loadSound yukleme tekillestirmesi yapiyor; ' +
      'bu tekillestirme kaldirilirsa seek de ikinci bir Sound olusturabilir'
  );
  // handleCopyTranscript zararsizdir CUNKU ayni metin kopyalanir ve setIsCopied idempotenttir.
  assert.ok(
    /setIsCopied\(true\);/.test(playerSource) && /copyTextToClipboard\(audioNote\.transcript\)/.test(playerSource),
    'handleCopyTranscript hala ayni metni kopyalayip idempotent state yaziyor olmali'
  );
  // handleToggleLock zararsizdir CUNKU kilit degisimi dogrudan degil, PIN modali
  // basarili olunca callback icinde yapilir.
  assert.ok(
    /onSuccessCallback: async \(\) => \{\s*\n\s*setNotebook\(\(prev\) => \(\{ \.\.\.prev, isLocked: true \}\)\);/.test(
      coverSource
    ),
    'handleToggleLock kilidi dogrudan degil PIN modali callback\'inde degistirmeli; ' +
      'dogrudan degistirmeye donerse cift basis korumasi gerekir'
  );
  console.log('OK Test 6: zararsiz kabul edilen isleyicilerin dayanaklari hala gecerli');

  // --- Test 7: handwritingService zamanlayicilari her yolda temizleniyor ---
  const handwriting = read('services', 'handwritingService.js');
  const finallyClears = handwriting.match(/if \(timeoutId !== null\) clearTimeout\(timeoutId\);/g) || [];
  assert.strictEqual(
    finallyClears.length,
    2,
    'Her iki tanima fonksiyonu da zamanlayiciyi finally icinde temizlemeli'
  );
  assert.ok(
    !/\n\s*clearTimeout\(timeoutId\);\s*\n\s*\n?\s*(if \(!response\.ok\)|\/\/ Eğer)/.test(handwriting),
    'Basari yolunda kalmis clearTimeout olmamali'
  );
  console.log('OK Test 7: her iki tanima fonksiyonunda da zamanlayici finally ile temizleniyor');

  console.log('--- TUM PRESS GUARD TESTLERI BASARIYLA GECTI! ---');
}
