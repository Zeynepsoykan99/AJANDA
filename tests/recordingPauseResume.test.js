/**
 * recordingPauseResume.test.js
 *
 * Sesli not kaydında duraklat/devam:
 *  - Duraklatılan sürenin sayaca DAHİL EDİLMEDİĞİ (biriktirmeli sayaç),
 *  - Hızlı art arda duraklat/devam basışlarının tek işlem ürettiği (C1 ailesi),
 *  - Desteklemeyen yolda (Android canlı tanıma) düğmenin gösterilmediği.
 *
 * Yöntem: önce eski (biriktirmeyen) sayaç mantığının duraklatılan süreyi
 * saydığı kanıtlanır, sonra kaynaktaki GERÇEK fonksiyonlar çıkarılıp aynı
 * senaryoda çalıştırılır.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const RECORDER = path.join(__dirname, '..', 'components', 'audio', 'AudioRecorderModal.js');
const source = fs.readFileSync(RECORDER, 'utf8');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Zamanlayıcı toleransı: setInterval ve await gecikmeleri için */
const near = (actual, expected, tolerance, label) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    label + ': beklenen ~' + expected + 'ms, olcülen ' + actual + 'ms (tolerans ' + tolerance + ')'
  );

/** Kaynaktaki GERÇEK sayaç fonksiyonlarını çıkarıp çalıştırılabilir yapar */
const buildTimer = () => {
  const names = [
    'startElapsedTimer',
    'resumeElapsedTimer',
    'pauseElapsedTimer',
    'stopElapsedTimer',
  ];
  const parts = names.map((n) => {
    const re = new RegExp('  const ' + n + ' = \\(\\) => \\{[\\s\\S]*?\\n  \\};');
    const m = re.exec(source);
    assert.ok(m, n + ' kaynakta bulunmali');
    return m[0];
  });

  const refs = {
    timerRef: { current: null },
    elapsedMsRef: { current: 0 },
    segmentStartRef: { current: 0 },
    accumulatedMsRef: { current: 0 },
  };
  let displayed = 0;

  // eslint-disable-next-line no-new-func
  const api = new Function(
    'timerRef',
    'elapsedMsRef',
    'segmentStartRef',
    'accumulatedMsRef',
    'setElapsedMs',
    parts.join('\n') + '\nreturn { ' + names.join(', ') + ' };'
  )(
    refs.timerRef,
    refs.elapsedMsRef,
    refs.segmentStartRef,
    refs.accumulatedMsRef,
    (v) => {
      displayed = v;
    }
  );

  return { ...api, refs, getDisplayed: () => displayed };
};

/**
 * Kaynaktaki GERÇEK handleTogglePause'u çıkarır.
 * React her render'da yeni bir closure üretir; hızlı çift basış AYNI closure'ı
 * iki kez çağırır, bu yüzden tek örnek üzerinden test edilir.
 */
const buildTogglePause = ({ recordState, pauseThrows = false, sharedRefs }) => {
  const m = /  const handleTogglePause = async \(\) => \{[\s\S]*?\n  \};/.exec(source);
  assert.ok(m, 'handleTogglePause kaynakta bulunmali');

  const calls = { pause: 0, start: 0 };
  const recording = {
    async pauseAsync() {
      calls.pause += 1;
      await wait(30); // gercek native cagri gibi gecikmeli
      if (pauseThrows) throw new Error('pauseAsync basarisiz');
    },
    async startAsync() {
      calls.start += 1;
      await wait(30);
    },
  };

  const refs = sharedRefs || {
    startPendingRef: { current: false },
    pausePendingRef: { current: false },
    recordingRef: { current: recording },
  };
  if (!sharedRefs) refs.recordingRef.current = recording;

  const stateChanges = [];
  const timerCalls = [];

  // eslint-disable-next-line no-new-func
  const handler = new Function(
    'startPendingRef',
    'pausePendingRef',
    'recordingRef',
    'recordState',
    'Haptics',
    'pauseElapsedTimer',
    'resumeElapsedTimer',
    'setRecordState',
    'console',
    m[0] + '\nreturn handleTogglePause;'
  )(
    refs.startPendingRef,
    refs.pausePendingRef,
    refs.recordingRef,
    recordState,
    { impactAsync() {}, ImpactFeedbackStyle: { Light: 'light' } },
    () => timerCalls.push('pause'),
    () => timerCalls.push('resume'),
    (v) => stateChanges.push(v),
    { warn() {} }
  );

  return { handler, calls, refs, stateChanges, timerCalls };
};

console.log('--- Kayit Duraklat / Devam Testleri ---');

(async () => {
  // --- Test 1: ESKI sayac duraklatilan sureyi SAYIYOR ------------------
  {
    let elapsed = 0;
    let timer = null;

    // Eski desen: sabit bir baslangictan itibaren gecen sure
    const legacyStart = () => {
      const startedAt = Date.now();
      timer = setInterval(() => {
        elapsed = Date.now() - startedAt;
      }, 20);
    };
    const legacyStop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    legacyStart();
    await wait(120);
    legacyStop(); // "duraklat"
    await wait(200); // duraklatmada beklenen sure
    legacyStart(); // eski kodda devam diye bir sey yok, yeniden baslatmak gerekirdi
    await wait(120);
    legacyStop();

    // Eski mantikta ya sure sifirlanir ya da duraklatma sayilir; her iki halde
    // dogru deger (~240ms) elde EDILEMEZ.
    assert.ok(
      Math.abs(elapsed - 240) > 60,
      'ESKI mantik dogru birikmis sureyi veremez (olculen: ' + elapsed + 'ms)'
    );
    console.log('OK Test 1: eski sayac mantigi duraklatmali kaydi dogru olcemiyor');
  }

  // --- Test 2: YENI sayac duraklatilan sureyi DISLIYOR -----------------
  {
    const timer = buildTimer();

    timer.startElapsedTimer();
    await wait(120);
    timer.pauseElapsedTimer();
    const afterFirst = timer.refs.elapsedMsRef.current;
    near(afterFirst, 120, 60, 'ilk segment');

    await wait(200); // DURAKLATMADA gecen sure
    assert.strictEqual(
      timer.refs.elapsedMsRef.current,
      afterFirst,
      'duraklatmada sayac HIC ilerlememeli'
    );

    timer.resumeElapsedTimer();
    await wait(120);
    timer.pauseElapsedTimer();

    near(timer.refs.elapsedMsRef.current, 240, 70, 'iki segment toplami');
    assert.ok(
      timer.refs.elapsedMsRef.current < 400,
      'duraklatmada gecen 200ms sayaca DAHIL EDILMEMELI'
    );
    timer.stopElapsedTimer();
    console.log('OK Test 2: duraklatilan sure sayaca dahil edilmiyor, birikim dogru');
  }

  // --- Test 3: Gorunen deger ile ref ayni (arayuz dogru gosteriyor) ----
  {
    const timer = buildTimer();
    timer.startElapsedTimer();
    await wait(120);
    timer.pauseElapsedTimer();
    assert.strictEqual(
      timer.getDisplayed(),
      timer.refs.elapsedMsRef.current,
      'duraklatmada ekrandaki deger ref ile ayni olmali'
    );
    timer.stopElapsedTimer();
    console.log('OK Test 3: duraklatmada ekranda gosterilen sure ref ile tutarli');
  }

  // --- Test 4: Cift "devam" interval sizdirmamali ----------------------
  {
    const timer = buildTimer();
    timer.startElapsedTimer();
    await wait(60);
    timer.pauseElapsedTimer();

    timer.resumeElapsedTimer();
    timer.resumeElapsedTimer(); // ikinci cagri yok sayilmali
    await wait(100);

    timer.stopElapsedTimer();
    const frozen = timer.refs.elapsedMsRef.current;
    await wait(250); // sahipsiz bir interval kaldiysa deger degismeye devam eder

    assert.strictEqual(
      timer.refs.elapsedMsRef.current,
      frozen,
      'cift "devam" sahipsiz interval birakmamali (durdurduktan sonra sayac ilerliyor)'
    );
    console.log('OK Test 4: cift "devam" basisi sahipsiz zamanlayici birakmiyor');
  }

  // --- Test 5: KORUMASIZ hal cift basista iki kez duraklatiyor ---------
  {
    let pauseCalls = 0;
    const unguardedToggle = async () => {
      // Koruma bayragi yok
      pauseCalls += 1;
      await wait(30);
    };

    await Promise.all([unguardedToggle(), unguardedToggle()]);

    assert.strictEqual(
      pauseCalls,
      2,
      'KORUMASIZ hal: iki hizli basis iki kez duraklatma cagirir (sorunun kaniti)'
    );
    console.log('OK Test 5: korumasiz duraklatma cift basista iki kez calisiyor');
  }

  // --- Test 6: GERCEK handler cift basista YALNIZCA BIR kez calisiyor --
  {
    const { handler, calls, refs, stateChanges, timerCalls } = buildTogglePause({
      recordState: 'recording',
    });

    // Ayni render'in closure'i iki kez cagrilir (hizli cift basis)
    await Promise.all([handler(), handler(), handler()]);

    assert.strictEqual(calls.pause, 1, 'uc basistan yalnizca biri duraklatma yapmali');
    assert.deepStrictEqual(stateChanges, ['paused'], 'durum yalnizca bir kez degismeli');
    assert.deepStrictEqual(timerCalls, ['pause'], 'sayac yalnizca bir kez duraklatilmali');
    assert.strictEqual(refs.pausePendingRef.current, false, 'bayrak finally ile serbest birakilmali');
    console.log('OK Test 6: hizli cift/uclu basista duraklatma yalnizca bir kez calisiyor');
  }

  // --- Test 7: Devam yolu da korumali ---------------------------------
  {
    const { handler, calls, stateChanges, timerCalls } = buildTogglePause({
      recordState: 'paused',
    });

    await Promise.all([handler(), handler()]);

    assert.strictEqual(calls.start, 1, 'iki basistan yalnizca biri devam ettirmeli');
    assert.strictEqual(calls.pause, 0, 'duraklatilmisken pauseAsync cagrilmamali');
    assert.deepStrictEqual(stateChanges, ['recording']);
    assert.deepStrictEqual(timerCalls, ['resume']);
    console.log('OK Test 7: devam ettirme yolu da cift basisa karsi korumali');
  }

  // --- Test 8: Baslatma hazirligi surerken duraklatma yok sayilir ------
  {
    const sharedRefs = {
      startPendingRef: { current: true }, // kayit hazirligi suruyor
      pausePendingRef: { current: false },
      recordingRef: { current: null },
    };
    const { handler, calls, stateChanges } = buildTogglePause({
      recordState: 'recording',
      sharedRefs,
    });

    await handler();

    assert.strictEqual(calls.pause, 0, 'hazirlik surerken duraklatma yapilmamali');
    assert.deepStrictEqual(stateChanges, [], 'durum degismemeli');
    console.log('OK Test 8: kayit hazirligi surerken duraklatma basisi yok sayiliyor');
  }

  // --- Test 9: Hata durumunda durum ve bayrak tutarli kaliyor ----------
  {
    const { handler, refs, stateChanges, timerCalls } = buildTogglePause({
      recordState: 'recording',
      pauseThrows: true,
    });

    await handler(); // throw etmemeli

    assert.deepStrictEqual(
      stateChanges,
      [],
      'pauseAsync hata verirse durum "paused"a GECMEMELI (kayit suruyor)'
    );
    assert.deepStrictEqual(timerCalls, [], 'hata durumunda sayac duraklatilmamali');
    assert.strictEqual(
      refs.pausePendingRef.current,
      false,
      'hata durumunda bile bayrak serbest birakilmali (dugme olmemeli)'
    );
    console.log('OK Test 9: duraklatma hatasinda durum tutarli, dugme kilitli kalmiyor');
  }

  // --- Test 10: Gecersiz durumda hicbir sey yapilmiyor -----------------
  {
    for (const state of ['idle', 'recorded']) {
      const { handler, calls, stateChanges } = buildTogglePause({ recordState: state });
      await handler();
      assert.strictEqual(calls.pause + calls.start, 0, state + ' durumunda islem yapilmamali');
      assert.deepStrictEqual(stateChanges, []);
    }
    console.log('OK Test 10: idle ve recorded durumlarinda duraklatma islem yapmiyor');
  }

  runSourceChecks();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

// --- Kaynak denetimleri -----------------------------------------------
function runSourceChecks() {
  // Cihaz destegine gore otomatik secim
  assert.ok(
    /const canPauseRecording = useMemo\(\(\) => !shouldUseLiveRecognition\(\), \[\]\);/.test(source),
    'duraklatma destegi shouldUseLiveRecognition uzerinden otomatik secilmeli'
  );

  // Dugme YALNIZCA destekleyen yolda render edilmeli
  assert.ok(
    /\{canPauseRecording && \(\s*\n\s*<TouchableOpacity\s*\n\s*activeOpacity=\{0\.7\}\s*\n\s*onPress=\{handleTogglePause\}/.test(
      source
    ),
    'duraklat dugmesi yalnizca canPauseRecording iken render edilmeli'
  );

  // Desteklemeyen yolda ipucu, YALNIZCA kayit surerken
  assert.ok(
    /\{recordState === 'recording' && !canPauseRecording && \(/.test(source),
    'ipucu yalnizca desteklemeyen yolda ve kayit surerken gosterilmeli'
  );
  assert.ok(
    /audio\.noPauseHint/.test(source),
    'ipucu metni dil dosyasindan gelmeli'
  );
  console.log('OK Test 11: duraklatma destegi otomatik seciliyor, ipucu dogru kosulda');

  // 'paused' durumu arayuzde ele alinmis
  assert.ok(
    /recordState === 'paused'\s*\n\s*\? t\('audio\.paused'/.test(source),
    "'paused' durumu icin ayri alt metin olmali"
  );
  assert.ok(
    /\{\(recordState === 'recording' \|\| recordState === 'paused'\) && \(\s*\n\s*<TouchableOpacity\s*\n\s*activeOpacity=\{0\.8\}\s*\n\s*onPress=\{handleStopRecording\}/.test(
      source
    ),
    'duraklatilmisken de durdurma dugmesi erisilebilir olmali'
  );
  console.log('OK Test 12: duraklatilmis durumda arayuz tutarli ve durdurma erisilebilir');

  // C1 ailesi: bayrak finally ile serbest, cleanup'ta sifirlaniyor
  const handlerBody = /  const handleTogglePause = async \(\) => \{[\s\S]*?\n  \};/.exec(source)[0];
  assert.ok(
    /\} finally \{\s*\n\s*pausePendingRef\.current = false;\s*\n\s*\}/.test(handlerBody),
    'pausePendingRef finally icinde serbest birakilmali'
  );
  assert.ok(
    /if \(startPendingRef\.current \|\| pausePendingRef\.current\) return;/.test(handlerBody),
    'hem baslatma hem duraklatma bayragi kontrol edilmeli'
  );
  assert.ok(
    /pausePendingRef\.current = false;\s*\n\s*accumulatedMsRef\.current = 0;/.test(source),
    'modal kapanis temizliginde bayrak ve birikim sifirlanmali'
  );
  console.log('OK Test 13: C1 korumalari duraklatmaya genisletildi ve temizlik yapiliyor');

  // Durdurmada sure yedegi REF uzerinden (state bir render geride kalabilir)
  assert.ok(
    /durationMsRef\.current = result\.durationMs \|\| elapsedMsRef\.current;/.test(source),
    'sure yedegi state degil ref uzerinden okunmali (duraklatma sonrasi dogruluk)'
  );
  console.log('OK Test 14: kayit suresi yedegi ref uzerinden okunuyor');

  // Dil anahtarlari bes dilde ve gercek ceviri
  const locales = {};
  ['tr', 'en', 'de', 'es', 'fr'].forEach((lng) => {
    locales[lng] = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'locales', lng + '.json'), 'utf8')
    );
  });
  ['pauseRecord', 'resumeRecord', 'paused', 'noPauseHint'].forEach((k) => {
    Object.entries(locales).forEach(([lng, j]) => {
      assert.ok(
        typeof j.audio?.[k] === 'string' && j.audio[k].length > 1,
        lng + ': audio.' + k + ' tanimli olmali'
      );
    });
    // noPauseHint bir cumle: diller arasinda ayni olmamali
    if (k === 'noPauseHint') {
      ['en', 'de', 'es', 'fr'].forEach((lng) => {
        assert.notStrictEqual(
          locales[lng].audio[k],
          locales.tr.audio[k],
          lng + ': audio.' + k + ' Turkceden kopyalanmis olmamali'
        );
      });
    }
  });
  console.log('OK Test 15: duraklatma metinleri bes dilde gercek cevirilerle mevcut');

  console.log('--- TUM DURAKLAT/DEVAM TESTLERI BASARIYLA GECTI! ---');
}
