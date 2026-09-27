/**
 * audioRecorderReentrancy.test.js
 *
 * C1: Kayda baslama sirasinda hizli cift basisin ikinci bir canli tanima oturumu
 *     acmasini engelleyen koruma.
 * C2: "Sayfaya Ekle" butonuna hizli cift basisin ayni kayittan iki sesli not
 *     olusturmasini engelleyen koruma.
 *
 * Yontem: once korumasiz halin GERCEKTEN hatali oldugu gosterilir (aksi halde
 * korumali testin gectigini soylemek bir sey ifade etmez), sonra kaynaktaki
 * gercek koruma deseni ayni senaryoda calistirilir.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const MODAL_PATH = path.join(__dirname, '..', 'components', 'audio', 'AudioRecorderModal.js');
const source = fs.readFileSync(MODAL_PATH, 'utf8');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('--- Sesli Not Kaydedici Yeniden Giris Testleri ---');

// ─── C1: Kayda baslama ───────────────────────────────────────────────

/** Gecikmeli sahte tanima motoru: her basari bir "oturum" uretir */
const createEngine = () => {
  const sessions = [];
  return {
    sessions,
    async start() {
      await wait(20); // izin + dizin + motor hazirligi
      const session = { id: sessions.length + 1, aborted: false };
      sessions.push(session);
      return session;
    },
  };
};

// --- Test 1: KORUMASIZ hal gercekten ikinci oturum aciyor ---
{
  const engine = createEngine();
  let liveSessionRef = null;

  const unguardedStart = async () => {
    const session = await engine.start();
    liveSessionRef = session; // ikinci cagri birincinin uzerine yazar
  };

  Promise.all([unguardedStart(), unguardedStart()]).then(() => {
    assert.strictEqual(engine.sessions.length, 2, 'korumasiz halde iki oturum acilmali');
    assert.strictEqual(liveSessionRef.id, 2, 'ikinci oturum birincinin uzerine yazmali');
    assert.strictEqual(
      engine.sessions[0].aborted,
      false,
      'birinci oturum sahipsiz kalir (mikrofon acik kalabilir)'
    );
    console.log('OK Test 1: korumasiz baslatma gercekten ikinci oturum aciyor (sahipsiz kalan: 1)');
    runGuardedStart();
  });

  // --- Test 2: KORUMALI hal tek oturum aciyor ---
  function runGuardedStart() {
    const engine2 = createEngine();
    let liveSession2 = null;
    const startPendingRef = { current: false };

    const guardedStart = async () => {
      if (startPendingRef.current) return;
      startPendingRef.current = true;
      try {
        const session = await engine2.start();
        liveSession2 = session;
      } finally {
        startPendingRef.current = false;
      }
    };

    Promise.all([guardedStart(), guardedStart(), guardedStart()]).then(() => {
      assert.strictEqual(engine2.sessions.length, 1, 'koruma ile yalnizca tek oturum acilmali');
      assert.strictEqual(liveSession2.id, 1);
      console.log('OK Test 2: koruma ile ucundan yalnizca biri oturum aciyor');
      runFailureRelease();
    });
  }

  // --- Test 3: Basarisiz baslatma korumayi kalici kilitlememeli ---
  function runFailureRelease() {
    const startPendingRef = { current: false };
    let successfulStarts = 0;

    const guardedStart = async (shouldFail) => {
      if (startPendingRef.current) return;
      startPendingRef.current = true;
      try {
        await wait(5);
        if (shouldFail) throw new Error('mikrofon izni reddedildi');
        successfulStarts++;
      } catch (e) {
        // yutulur, kullanici tekrar deneyebilmeli
      } finally {
        startPendingRef.current = false;
      }
    };

    guardedStart(true)
      .then(() => guardedStart(false))
      .then(() => {
        assert.strictEqual(
          successfulStarts,
          1,
          'ilk deneme hata verse bile ikinci deneme calisabilmeli (finally ile serbest birakma)'
        );
        console.log('OK Test 3: basarisiz baslatma sonrasi buton tekrar kullanilabilir');
        runSaveTests();
      });
  }
}

// ─── C2: Sayfaya kaydetme ────────────────────────────────────────────

function runSaveTests() {
  // --- Test 4: KORUMASIZ hal gercekten iki not olusturuyor ---
  const unguarded = (() => {
    const tempUriRef = { current: 'file:///cache/kayit.wav' };
    const saved = [];

    const unguardedSave = async () => {
      if (!tempUriRef.current) return;
      await wait(20); // saveAudioPermanently
      saved.push({ id: saved.length + 1, uri: tempUriRef.current });
      tempUriRef.current = null; // iki await sonra: cok gec
    };

    return Promise.all([unguardedSave(), unguardedSave()]).then(() => {
      assert.strictEqual(saved.length, 2, 'korumasiz halde iki not olusmali');
      console.log('OK Test 4: korumasiz kaydetme gercekten iki not olusturuyor');
    });
  })();

  unguarded
    .then(() => {
      // --- Test 5: KORUMALI hal tek not olusturuyor ---
      const tempUriRef = { current: 'file:///cache/kayit.wav' };
      const savePendingRef = { current: false };
      const saved = [];

      const guardedSave = async () => {
        if (savePendingRef.current) return;
        const sourceUri = tempUriRef.current;
        if (!sourceUri) return;

        savePendingRef.current = true;
        tempUriRef.current = null; // await'ten ONCE, senkron
        try {
          await wait(20);
          saved.push({ id: saved.length + 1, uri: sourceUri });
        } finally {
          savePendingRef.current = false;
        }
      };

      return Promise.all([guardedSave(), guardedSave(), guardedSave()]).then(() => {
        assert.strictEqual(saved.length, 1, 'koruma ile yalnizca tek not olusmali');
        assert.strictEqual(saved[0].uri, 'file:///cache/kayit.wav');
        assert.strictEqual(tempUriRef.current, null);
        console.log('OK Test 5: koruma ile ucundan yalnizca biri not olusturuyor');
      });
    })
    .then(() => {
      // --- Test 6: Kaydetme hatasinda kayit kaybolmamali ---
      const tempUriRef = { current: 'file:///cache/kayit.wav' };
      const savePendingRef = { current: false };

      const failingSave = async () => {
        if (savePendingRef.current) return;
        const sourceUri = tempUriRef.current;
        if (!sourceUri) return;
        savePendingRef.current = true;
        tempUriRef.current = null;
        let didHandOff = false;
        try {
          await wait(5);
          throw new Error('disk dolu');
        } catch (e) {
          if (!didHandOff) tempUriRef.current = sourceUri;
        } finally {
          savePendingRef.current = false;
        }
      };

      return failingSave().then(() => {
        assert.strictEqual(
          tempUriRef.current,
          'file:///cache/kayit.wav',
          'Teslim edilmeden hata olursa gecici URI geri yazilmali (kullanici tekrar deneyebilsin)'
        );
        console.log('OK Test 6: kaydetme hatasinda kayit kaybolmuyor, tekrar denenebiliyor');
      });
    })
    .then(runSourceChecks)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

// ─── Kaynak denetimleri ──────────────────────────────────────────────
function runSourceChecks() {
  // --- Test 7: C1 korumasi kaynakta ---
  assert.ok(
    /if \(startPendingRef\.current\) return;\s*\n\s*startPendingRef\.current = true;/.test(source),
    'handleStartRecording basinda yeniden giris korumasi olmali'
  );
  assert.ok(
    /\} finally \{\s*\n\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*startPendingRef\.current = false;/.test(source) ||
      /startPendingRef\.current = false;\s*\n\s*setIsPreparingRecording\(false\);/.test(source),
    'Koruma finally icinde serbest birakilmali (hata durumunda kilitli kalmamali)'
  );
  console.log('OK Test 7: C1 korumasi kaynakta ve finally ile serbest birakiliyor');

  // --- Test 8: C2 korumasi kaynakta, await'ten once ---
  const saveFn = /const handleSaveToPage = async \(\) => \{[\s\S]*?\n  \};/.exec(source);
  assert.ok(saveFn, 'handleSaveToPage kaynakta bulunmali');
  const body = saveFn[0];

  const guardIndex = body.indexOf('savePendingRef.current = true;');
  const nullIndex = body.indexOf('tempUriRef.current = null;');
  const firstAwaitIndex = body.indexOf('await ');

  assert.ok(guardIndex > -1, 'savePendingRef korumasi olmali');
  assert.ok(nullIndex > -1, 'tempUriRef bosaltilmali');
  assert.ok(
    guardIndex < firstAwaitIndex && nullIndex < firstAwaitIndex,
    'Koruma ve tempUriRef bosaltmasi ILK AWAIT ONCESINDE olmali'
  );
  assert.ok(
    /savePendingRef\.current = false;/.test(body) && /\} finally \{/.test(body),
    'Kaydetme korumasi finally icinde serbest birakilmali'
  );
  console.log('OK Test 8: C2 korumasi ilk await oncesinde ve finally ile serbest birakiliyor');

  // --- Test 9: Butonlarda gorsel geri bildirim ---
  assert.ok(
    /disabled=\{isPreparingRecording\}/.test(source),
    'Hazirlik sirasinda kayit butonu devre disi olmali'
  );
  assert.ok(/disabled=\{isSaving\}/.test(source), 'Kaydetme sirasinda buton devre disi olmali');
  assert.ok(
    /isPreparingRecording \? \(\s*\n[\s\S]{0,200}?<ActivityIndicator/.test(source),
    'Hazirlik sirasinda yukleniyor gostergesi olmali'
  );
  console.log('OK Test 9: her iki butonda da devre disi + yukleniyor gostergesi var');

  // --- Test 10: permanentUri gerilemesi giderilmis olmali ---
  assert.ok(
    !/permanentUri/.test(source),
    'Tanimsiz permanentUri referansi kalmamali (ReferenceError uretiyordu)'
  );
  assert.ok(
    /transcribeAudioFile\(saved\?\.uri, \{ language: i18n\.language \}\)/.test(source),
    'Arka plan transkripsiyonu kaydedilen dosyanin URI\'sini kullanmali'
  );
  console.log('OK Test 10: tanimsiz permanentUri referansi giderildi');

  // --- Test 11: cleanup bayraklari serbest birakiyor ---
  assert.ok(
    /startPendingRef\.current = false;\s*\n\s*savePendingRef\.current = false;/.test(source),
    'Modal kapanirken koruma bayraklari sifirlanmali'
  );
  console.log('OK Test 11: modal kapanisinda koruma bayraklari sifirlaniyor');

  console.log('--- TUM YENIDEN GIRIS TESTLERI BASARIYLA GECTI! ---');
}
