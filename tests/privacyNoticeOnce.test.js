/**
 * privacyNoticeOnce.test.js
 *
 * E2: El yazısı ve sesli not bilgilendirmelerinin kullanıcıya YALNIZCA BİR KEZ
 *     gösterilmesi ve doğru yerlere bağlanması.
 *
 * Yöntem: önce "kayıt tutmayan" naif bir uygulamanın bildirimi her seferinde
 * gösterdiği kanıtlanır, sonra kaynaktaki GERÇEK hasSeenNotice/markNoticeSeen
 * fonksiyonları çıkarılıp aynı senaryoda çalıştırılır.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const MODAL = path.join(__dirname, '..', 'components', 'ui', 'PrivacyNoticeModal.js');
const AJANDAM = path.join(__dirname, '..', 'app', 'ajandam', '[pageId].js');
const TODOLIST = path.join(__dirname, '..', 'app', 'todolist', '[pageId].js');
const RECORDER = path.join(__dirname, '..', 'components', 'audio', 'AudioRecorderModal.js');
const LOCK_GATE = path.join(__dirname, '..', 'components', 'notebook', 'NotebookLockGate.js');
const LOCK_SHEET = path.join(__dirname, '..', 'components', 'security', 'LockManagementSheet.js');

const modalSource = fs.readFileSync(MODAL, 'utf8');
const ajandamSource = fs.readFileSync(AJANDAM, 'utf8');
const todolistSource = fs.readFileSync(TODOLIST, 'utf8');
const recorderSource = fs.readFileSync(RECORDER, 'utf8');

const HANDWRITING_KEY = '@ajanda_handwriting_notice_v1';
const VOICE_KEY = '@ajanda_voice_notice_v1';

/** Sahte AsyncStorage. mode: 'ok' | 'readThrows' | 'writeThrows' */
const createAsyncStorage = (mode = 'ok') => {
  const store = {};
  return {
    store,
    async getItem(k) {
      if (mode === 'readThrows') throw new Error('depo okunamadi');
      return k in store ? store[k] : null;
    },
    async setItem(k, v) {
      if (mode === 'writeThrows') throw new Error('depo yazilamadi');
      store[k] = v;
    },
  };
};

/** Kaynaktaki GERÇEK hasSeenNotice / markNoticeSeen fonksiyonlarını çıkarır */
const buildNoticeApi = (mode = 'ok') => {
  const hasSeenDecl = /export const hasSeenNotice = async \(storageKey\) => \{[\s\S]*?\n\};/.exec(
    modalSource
  );
  assert.ok(hasSeenDecl, 'hasSeenNotice kaynakta bulunmali');
  const markDecl = /export const markNoticeSeen = async \(storageKey\) => \{[\s\S]*?\n\};/.exec(
    modalSource
  );
  assert.ok(markDecl, 'markNoticeSeen kaynakta bulunmali');

  const body =
    hasSeenDecl[0].replace('export const', 'const') +
    '\n' +
    markDecl[0].replace('export const', 'const') +
    '\nreturn { hasSeenNotice, markNoticeSeen };';

  const AsyncStorage = createAsyncStorage(mode);
  const logs = { warn: [], error: [] };

  // eslint-disable-next-line no-new-func
  const api = new Function(
    'AsyncStorage',
    'console',
    body
  )(AsyncStorage, {
    warn: (...a) => logs.warn.push(a.join(' ')),
    error: (...a) => logs.error.push(a.join(' ')),
  });

  return { ...api, AsyncStorage, logs };
};

console.log('--- Bilgilendirme "Bir Kez" Testleri ---');

(async () => {
  // --- Test 1: KAYIT TUTMAYAN hal bildirimi her seferinde gosteriyor ----
  {
    let shownCount = 0;
    const naiveOpenScreen = async () => {
      // Hicbir kalici kayit yok -> her girisde goster
      shownCount += 1;
    };

    await naiveOpenScreen();
    await naiveOpenScreen();

    assert.strictEqual(
      shownCount,
      2,
      'KAYITSIZ hal: bildirim her ekran girisinde tekrar gosterilmeli (sorunun kaniti)'
    );
    console.log('OK Test 1: kalici kayit olmadan bildirim her seferinde gosteriliyor');
  }

  // --- Test 2: GERCEK mekanizma bildirimi yalnizca bir kez gosteriyor ---
  {
    const { hasSeenNotice, markNoticeSeen } = buildNoticeApi();
    let shownCount = 0;

    const openScreen = async (key) => {
      if (!(await hasSeenNotice(key))) {
        shownCount += 1;
        await markNoticeSeen(key); // kullanici "Anladim" dedi
      }
    };

    await openScreen(HANDWRITING_KEY);
    await openScreen(HANDWRITING_KEY);
    await openScreen(HANDWRITING_KEY);

    assert.strictEqual(shownCount, 1, 'Bildirim yalnizca BIR KEZ gosterilmeli');
    console.log('OK Test 2: gercek mekanizmada bildirim tam olarak bir kez gosteriliyor');
  }

  // --- Test 3: Iki bildirim birbirinden bagimsiz ------------------------
  {
    const { hasSeenNotice, markNoticeSeen, AsyncStorage } = buildNoticeApi();

    await markNoticeSeen(HANDWRITING_KEY);

    assert.strictEqual(
      await hasSeenNotice(HANDWRITING_KEY),
      true,
      'el yazisi bildirimi gorulmus sayilmali'
    );
    assert.strictEqual(
      await hasSeenNotice(VOICE_KEY),
      false,
      'sesli not bildirimi AYRI anahtarda, hala gosterilmeli'
    );
    assert.deepStrictEqual(
      Object.keys(AsyncStorage.store),
      [HANDWRITING_KEY],
      'yalnizca ilgili anahtar yazilmali'
    );
    console.log('OK Test 3: iki bildirim ayri anahtarlarda, birbirini etkilemiyor');
  }

  // --- Test 4: Yazilan deger okunabilir bir zaman damgasi --------------
  {
    const { markNoticeSeen, AsyncStorage } = buildNoticeApi();
    await markNoticeSeen(VOICE_KEY);
    const value = AsyncStorage.store[VOICE_KEY];
    assert.ok(
      typeof value === 'string' && !Number.isNaN(Date.parse(value)),
      'goruldu kaydi gecerli bir tarih olmali (' + value + ')'
    );
    console.log('OK Test 4: goruldu kaydi gecerli bir zaman damgasi olarak yaziliyor');
  }

  // --- Test 5: Okuma hatasinda "gorulmus" sayilir (spam yok) -----------
  {
    const { hasSeenNotice, logs } = buildNoticeApi('readThrows');
    assert.strictEqual(
      await hasSeenNotice(VOICE_KEY),
      true,
      'depo okunamazsa bildirim TEKRAR gosterilmemeli'
    );
    assert.strictEqual(logs.warn.length, 1, 'okuma hatasi sessiz gecilmemeli');
    console.log('OK Test 5: depo okunamadiginda bildirim spam yapmiyor, hata loglaniyor');
  }

  // --- Test 6: Yazma hatasi sessiz gecilmiyor --------------------------
  {
    const { markNoticeSeen, logs } = buildNoticeApi('writeThrows');
    await markNoticeSeen(VOICE_KEY); // throw etmemeli
    assert.strictEqual(logs.error.length, 1, 'yazma hatasi console.error ile bildirilmeli');
    console.log('OK Test 6: goruldu kaydi yazilamazsa hata yutulmuyor');
  }

  runSourceChecks();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

// --- Kaynak denetimleri -----------------------------------------------
function runSourceChecks() {
  // Anahtar adlari
  assert.ok(
    modalSource.includes("export const HANDWRITING_NOTICE_KEY = '" + HANDWRITING_KEY + "';"),
    'el yazisi anahtari dogru olmali'
  );
  assert.ok(
    modalSource.includes("export const VOICE_NOTICE_KEY = '" + VOICE_KEY + "';"),
    'sesli not anahtari dogru olmali'
  );
  console.log('OK Test 7: her iki AsyncStorage anahtari da beklenen adla tanimli');

  // El yazisi bildirimi iki sayfa tuvaline de bagli
  [
    ['ajandam', ajandamSource],
    ['todolist', todolistSource],
  ].forEach(([label, source]) => {
    assert.ok(
      /import PrivacyNoticeModal, \{\s*\n\s*HANDWRITING_NOTICE_KEY,/.test(source),
      label + ': bildirim modali ve anahtar import edilmeli'
    );
    assert.ok(
      /if \(!\(await hasSeenNotice\(HANDWRITING_NOTICE_KEY\)\) && isActive\) \{\s*\n\s*setShowHandwritingNotice\(true\);/.test(
        source
      ),
      label + ': bildirim yalnizca gorulmemisse gosterilmeli'
    );
    assert.ok(
      /setShowHandwritingNotice\(false\);\s*\n\s*markNoticeSeen\(HANDWRITING_NOTICE_KEY\);/.test(
        source
      ),
      label + ': "Anladim" goruldu kaydini yazmali'
    );
    assert.ok(
      /<PrivacyNoticeModal\s*\n\s*visible=\{showHandwritingNotice\}\s*\n\s*type="handwriting"/.test(
        source
      ),
      label + ': bildirim render edilmeli'
    );
  });
  console.log('OK Test 8: el yazisi bildirimi iki sayfa tuvaline de bagli');

  // Sesli not bildirimi kapisi C1 korumasiyla CAKISMAMALI.
  //
  // Kapi `await` icerdigi icin startPendingRef ATAMASINDAN SONRA gelmeli:
  // once gelse iki hizli basis da bayragi false gorup birlikte gecer ve
  // C1'de kapatilan yeniden giris deligi tekrar acilir.
  const gateIndex = recorderSource.indexOf('if (!(await hasSeenNotice(VOICE_NOTICE_KEY)))');
  const assignIndex = recorderSource.indexOf('startPendingRef.current = true;');
  assert.ok(gateIndex > -1, 'sesli not bildirimi kapisi bulunmali');
  assert.ok(assignIndex > -1, 'startPendingRef atamasi bulunmali');
  assert.ok(
    assignIndex < gateIndex,
    'bildirim kapisi (await icerir) startPendingRef = true ATAMASINDAN SONRA olmali, ' +
      'aksi halde C1 yeniden giris deligi tekrar acilir'
  );

  // Bu dalda kayit baslamadigi icin bayrak ELLE serbest birakilmali;
  // birakilmazsa kayit dugmesi kalici olarak oluydu.
  assert.ok(
    /if \(!\(await hasSeenNotice\(VOICE_NOTICE_KEY\)\)\) \{\s*\n\s*setShowVoiceNotice\(true\);\s*\n\s*startPendingRef\.current = false;\s*\n\s*return;\s*\n\s*\}/.test(
      recorderSource
    ),
    'bildirim dalinda koruma bayragi serbest birakilip ERKEN DONULMELI ' +
      '(kayit baslamamali, dugme de olmemeli)'
  );
  console.log('OK Test 9: sesli not kapisi C1 korumasiyla cakismiyor, bayrak serbest birakiliyor');

  // Kullanici karari: "Anladim" kaydi OTOMATIK BASLATMAMALI
  const dismissDecl = /const handleDismissVoiceNotice = \(\) => \{[\s\S]*?\n  \};/.exec(
    recorderSource
  );
  assert.ok(dismissDecl, 'handleDismissVoiceNotice bulunmali');
  assert.ok(
    !/handleStartRecording|startRecording\(/.test(dismissDecl[0]),
    '"Anladim" kaydi OTOMATIK BASLATMAMALI (kullanici karari)'
  );
  assert.ok(
    /markNoticeSeen\(VOICE_NOTICE_KEY\)/.test(dismissDecl[0]),
    '"Anladim" goruldu kaydini yazmali'
  );
  console.log('OK Test 10: "Anladim" yalnizca kapatiyor, kaydi otomatik baslatmiyor');

  // Ice ice Modal olmamali: iOS'ta Modal icinde Modal sunumu sorunlu
  const modalCloseIndex = recorderSource.lastIndexOf('</Modal>');
  const noticeIndex = recorderSource.indexOf('<PrivacyNoticeModal');
  assert.ok(
    modalCloseIndex > -1 && noticeIndex > modalCloseIndex,
    'bildirim ust Modal KAPANDIKTAN SONRA (kardes olarak) render edilmeli'
  );
  console.log('OK Test 11: bildirim ust Modal\'in kardesi, ice ice Modal yok');

  // lockedDesc: "korunmaktadir" imasi kalkmis VE sifrelemedigi acikca soyleniyor.
  // Olumsuz kontrol tek basina yetmez (ceviri yazimi degisebilir), bu yuzden her
  // dilde "sifrelemez" anlamini tasiyan ifadenin VARLIGI da aranir.
  const REQUIRED_PHRASES = {
    tr: ['şifrelemez'],
    en: ['does not encrypt'],
    de: ['verschlüsselt', 'nicht'],
    es: ['no cifra'],
    fr: ['ne chiffre pas'],
  };

  ['tr', 'en', 'de', 'es', 'fr'].forEach((lng) => {
    const j = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'locales', lng + '.json'), 'utf8')
    );
    const desc = j.security?.lockedDesc;
    assert.ok(typeof desc === 'string' && desc.length > 20, lng + ': lockedDesc tanimli olmali');
    assert.ok(
      !/korunmaktad|protected by|geschützt|protegidas|protégées/i.test(desc),
      lng + ': lockedDesc artik "korunuyor" imasi tasimamali -> ' + desc
    );
    REQUIRED_PHRASES[lng].forEach((phrase) => {
      assert.ok(
        desc.toLowerCase().includes(phrase.toLowerCase()),
        lng + ': lockedDesc icerigin sifrelenmedigini acikca soylemeli ("' + phrase + '" yok) -> ' + desc
      );
    });

    // Her iki bildirimin tum anahtarlari mevcut mu
    [
      'understood',
      'handwritingTitle',
      'handwritingP1',
      'handwritingP2',
      'handwritingP3',
      'voiceTitle',
      'voiceP1',
      'voiceAndroidLabel',
      'voiceAndroidBody',
      'voiceIosLabel',
      'voiceIosBody',
      'voiceP4',
    ].forEach((k) => {
      assert.ok(
        typeof j.privacy?.[k] === 'string' && j.privacy[k].length > 2,
        lng + ': privacy.' + k + ' tanimli olmali'
      );
    });

    // Gercek ceviri olmali: Turkce metin digerlerine kopyalanmamis
    if (lng !== 'tr') {
      const tr = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'locales', 'tr.json'), 'utf8')
      );
      assert.notStrictEqual(
        j.privacy.voiceP1,
        tr.privacy.voiceP1,
        lng + ': metin Turkceden kopyalanmis olmamali'
      );
      assert.notStrictEqual(
        j.privacy.handwritingP1,
        tr.privacy.handwritingP1,
        lng + ': metin Turkceden kopyalanmis olmamali'
      );
    }
  });
  console.log('OK Test 12: bildirim anahtarlari bes dilde gercek cevirilerle mevcut');

  // Satir ici varsayilanlar dil dosyasiyla hizali olmali
  const expectedTr = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'locales', 'tr.json'), 'utf8')
  ).security.lockedDesc;
  [
    ['NotebookLockGate', fs.readFileSync(LOCK_GATE, 'utf8')],
    ['LockManagementSheet', fs.readFileSync(LOCK_SHEET, 'utf8')],
  ].forEach(([label, src]) => {
    assert.ok(
      src.includes(expectedTr),
      label + ": satir ici varsayilan metin dil dosyasindaki lockedDesc ile ayni olmali"
    );
  });
  console.log('OK Test 13: iki ekranda da satir ici varsayilan metin dil dosyasiyla hizali');

  // app.json: konusma tanima izni artik ag islemesinden soz ediyor
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));
  const speechDesc = appJson.expo?.ios?.infoPlist?.NSSpeechRecognitionUsageDescription;
  assert.ok(typeof speechDesc === 'string', 'NSSpeechRecognitionUsageDescription tanimli olmali');
  assert.ok(
    /Apple/.test(speechDesc) && /sunucu/i.test(speechDesc),
    'izin metni sesin Apple sunucularina gidebileceginden soz etmeli -> ' + speechDesc
  );
  console.log('OK Test 14: NSSpeechRecognitionUsageDescription gercegi yansitiyor');

  console.log('--- TUM BILGILENDIRME TESTLERI BASARIYLA GECTI! ---');
}
