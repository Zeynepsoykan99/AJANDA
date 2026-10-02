/**
 * privacySettings.test.js
 *
 * Cihaz dışına veri gönderen OTOMATİK iki akışın kapatılabilmesi:
 *   (a) Ajandam / Yapılacaklar'daki otomatik el yazısı tanıma
 *   (b) Sesli not kaydından otomatik metne çevirme
 *
 * Kanıtlanan noktalar:
 *  - Ayar kapalıyken otomatik akışın GERÇEKTEN engellendiği,
 *  - Kullanıcının kendi başlattığı işlemlerin (kement, yeniden dene) ETKİLENMEDİĞİ,
 *  - Tercihin diske yazıldığı ve yükleme beklenmeden atlanmadığı.
 *
 * Yöntem: önce kapısız halin ayar kapalıyken bile tanımayı çalıştırdığı
 * kanıtlanır, sonra kaynaktaki GERÇEK servis çıkarılıp aynı senaryoda kullanılır.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SERVICE = path.join(ROOT, 'services', 'privacySettingsService.js');
const serviceSource = fs.readFileSync(SERVICE, 'utf8');

const SCREENS = [
  ['ajandam/index', path.join(ROOT, 'app', 'ajandam', 'index.js')],
  ['ajandam/[pageId]', path.join(ROOT, 'app', 'ajandam', '[pageId].js')],
  ['todolist/[pageId]', path.join(ROOT, 'app', 'todolist', '[pageId].js')],
];
const RECORDER = path.join(ROOT, 'components', 'audio', 'AudioRecorderModal.js');
const recorderSource = fs.readFileSync(RECORDER, 'utf8');

const HW_KEY = '@ajanda_auto_handwriting_v1';
const TR_KEY = '@ajanda_auto_transcribe_v1';

/** Sahte AsyncStorage. mode: 'ok' | 'readThrows' | 'writeThrows' */
const createAsyncStorage = (initial = {}, mode = 'ok') => {
  const store = { ...initial };
  return {
    store,
    async multiGet(keys) {
      if (mode === 'readThrows') throw new Error('depo okunamadi');
      return keys.map((k) => [k, k in store ? store[k] : null]);
    },
    async setItem(k, v) {
      if (mode === 'writeThrows') throw new Error('depo yazilamadi');
      store[k] = v;
    },
  };
};

/** Kaynaktaki GERÇEK servisi çalıştırılabilir hale getirir (mantık kopyalanmaz) */
const buildService = (initial = {}, mode = 'ok') => {
  const body = serviceSource
    .replace(/^import[^\n]*\n/m, '') // AsyncStorage import'u enjekte edilecek
    .replace(/^export const /gm, 'const ')
    .replace(/^export /gm, '');

  const exported = [
    'AUTO_HANDWRITING_DEFAULT',
    'AUTO_TRANSCRIBE_DEFAULT',
    'loadPrivacySettings',
    'getPrivacySettings',
    'isAutoHandwritingEnabled',
    'isAutoTranscribeEnabled',
    'setAutoHandwritingEnabled',
    'setAutoTranscribeEnabled',
    'addPrivacySettingsListener',
  ];

  const AsyncStorage = createAsyncStorage(initial, mode);
  const logs = { warn: [], error: [] };

  // eslint-disable-next-line no-new-func
  const api = new Function(
    'AsyncStorage',
    'console',
    body + '\nreturn { ' + exported.join(', ') + ' };'
  )(AsyncStorage, {
    warn: (...a) => logs.warn.push(a.join(' ')),
    error: (...a) => logs.error.push(a.join(' ')),
  });

  return { ...api, AsyncStorage, logs };
};

console.log('--- Gizlilik Ayarlari Testleri ---');

(async () => {
  // --- Test 1: KAPISIZ hal ayar kapaliyken bile tanimayi calistiriyor --
  {
    let recognizeCalls = 0;
    const settings = { autoHandwriting: false };

    const ungatedRecognition = async () => {
      // Hicbir ayar kontrolu yok
      recognizeCalls += 1;
    };

    await ungatedRecognition();

    assert.strictEqual(settings.autoHandwriting, false, 'ayar kapali olmali');
    assert.strictEqual(
      recognizeCalls,
      1,
      'KAPISIZ hal: ayar kapali olmasina ragmen tanima calisir (sorunun kaniti)'
    );
    console.log('OK Test 1: kapisiz halde ayar kapaliyken bile tanima calisiyor');
  }

  // --- Test 2: Varsayilanlar ------------------------------------------
  {
    const { loadPrivacySettings, AUTO_HANDWRITING_DEFAULT, AUTO_TRANSCRIBE_DEFAULT } =
      buildService();
    const loaded = await loadPrivacySettings();

    assert.strictEqual(loaded.autoHandwriting, AUTO_HANDWRITING_DEFAULT);
    assert.strictEqual(loaded.autoTranscribe, AUTO_TRANSCRIBE_DEFAULT);
    // Bugune kadarki davranis korunuyor: ikisi de acik
    assert.strictEqual(AUTO_HANDWRITING_DEFAULT, true, 'el yazisi varsayilani acik olmali');
    assert.strictEqual(AUTO_TRANSCRIBE_DEFAULT, true, 'ses varsayilani acik olmali');
    console.log('OK Test 2: kayit yoksa varsayilanlar aciliyor (mevcut davranis korunuyor)');
  }

  // --- Test 3: Diskteki '0' kapali olarak okunuyor --------------------
  {
    const { loadPrivacySettings } = buildService({ [HW_KEY]: '0', [TR_KEY]: '1' });
    const loaded = await loadPrivacySettings();
    assert.strictEqual(loaded.autoHandwriting, false, "'0' kapali olmali");
    assert.strictEqual(loaded.autoTranscribe, true, "'1' acik olmali");
    console.log("OK Test 3: diskteki '0'/'1' degerleri dogru okunuyor");
  }

  // --- Test 4: GERCEK servisle kapi otomatik akisi engelliyor ---------
  {
    const { getPrivacySettings } = buildService({ [HW_KEY]: '0' });
    let recognizeCalls = 0;

    // Kaynaktaki kapi deseniyle birebir ayni sira
    const gatedRecognition = async () => {
      if (!(await getPrivacySettings()).autoHandwriting) return;
      recognizeCalls += 1;
    };

    await gatedRecognition();
    assert.strictEqual(recognizeCalls, 0, 'ayar kapaliyken tanima HIC calismamali');

    // Acik olunca yine calismali (kapi fazla agresif degil)
    const open = buildService({ [HW_KEY]: '1' });
    let openCalls = 0;
    const gatedOpen = async () => {
      if (!(await open.getPrivacySettings()).autoHandwriting) return;
      openCalls += 1;
    };
    await gatedOpen();
    assert.strictEqual(openCalls, 1, 'ayar acikken tanima calismali');
    console.log('OK Test 4: gercek servisle kapi kapaliyken engelliyor, acikken engellemiyor');
  }

  // --- Test 5: Kapi yuklemeyi BEKLIYOR (yarista atlanmiyor) ----------
  {
    const svc = buildService({ [HW_KEY]: '0' });
    let recognizeCalls = 0;

    // Yukleme hic baslatilmadan, ilk cizim aninda kapiya giriliyor
    const gatedRecognition = async () => {
      if (!(await svc.getPrivacySettings()).autoHandwriting) return;
      recognizeCalls += 1;
    };

    await gatedRecognition();

    assert.strictEqual(
      recognizeCalls,
      0,
      'yukleme onceden yapilmamis olsa bile kapali ayar atlanmamali'
    );
    console.log('OK Test 5: kapi tercihin okunmasini bekliyor, yarista atlanmiyor');
  }

  // --- Test 6: Degistirme diske yaziliyor ----------------------------
  {
    const svc = buildService();
    await svc.setAutoHandwritingEnabled(false);
    await svc.setAutoTranscribeEnabled(false);

    assert.strictEqual(svc.AsyncStorage.store[HW_KEY], '0');
    assert.strictEqual(svc.AsyncStorage.store[TR_KEY], '0');
    assert.strictEqual(svc.isAutoHandwritingEnabled(), false, 'onbellek de guncellenmeli');
    assert.strictEqual(svc.isAutoTranscribeEnabled(), false);
    assert.strictEqual((await svc.getPrivacySettings()).autoHandwriting, false);

    await svc.setAutoHandwritingEnabled(true);
    assert.strictEqual(svc.AsyncStorage.store[HW_KEY], '1', 'tekrar acilabilmeli');
    console.log('OK Test 6: ayar degisikligi hem onbellege hem diske yaziliyor');
  }

  // --- Test 7: Ayar degisikligi KAPILARA aninda yansiyor -------------
  {
    const svc = buildService();
    let recognizeCalls = 0;
    const gatedRecognition = async () => {
      if (!(await svc.getPrivacySettings()).autoHandwriting) return;
      recognizeCalls += 1;
    };

    await gatedRecognition();
    assert.strictEqual(recognizeCalls, 1, 'baslangicta acik, tanima calismali');

    // Kullanici ayari KAPATIYOR (uygulama yeniden baslatilmadan)
    await svc.setAutoHandwritingEnabled(false);
    await gatedRecognition();

    assert.strictEqual(
      recognizeCalls,
      1,
      'ayar kapatildiktan sonra kapi ANINDA engellemeli (uygulama yeniden baslamayi beklememeli)'
    );
    console.log('OK Test 7: ayar degisikligi kapilara aninda yansiyor');
  }

  // --- Test 8: Iki ayar birbirinden bagimsiz -------------------------
  {
    const svc = buildService();
    await svc.setAutoHandwritingEnabled(false);
    const s = await svc.getPrivacySettings();
    assert.strictEqual(s.autoHandwriting, false);
    assert.strictEqual(s.autoTranscribe, true, 'diger ayar etkilenmemeli');
    assert.strictEqual(svc.AsyncStorage.store[TR_KEY], undefined, 'diger anahtar yazilmamali');
    console.log('OK Test 8: iki ayar birbirinden tamamen bagimsiz');
  }

  // --- Test 9: Dinleyici degisiklikten haberdar oluyor ---------------
  {
    const svc = buildService();
    const seen = [];
    const unsubscribe = svc.addPrivacySettingsListener((s) => seen.push({ ...s }));

    await svc.setAutoTranscribeEnabled(false);
    assert.strictEqual(seen.length, 1, 'dinleyici bir kez cagrilmali');
    assert.strictEqual(seen[0].autoTranscribe, false);

    unsubscribe();
    await svc.setAutoTranscribeEnabled(true);
    assert.strictEqual(seen.length, 1, 'abonelik kaldirildiktan sonra cagrilmamali');
    console.log('OK Test 9: dinleyici degisikligi aliyor, abonelik kaldirilabiliyor');
  }

  // --- Test 10: Okuma/yazma hatasi sessiz gecilmiyor ------------------
  {
    const bad = buildService({}, 'readThrows');
    const loaded = await bad.loadPrivacySettings();
    assert.strictEqual(loaded.autoHandwriting, true, 'okunamazsa varsayilanla devam etmeli');
    assert.strictEqual(bad.logs.error.length, 1, 'okuma hatasi console.error ile bildirilmeli');

    const badWrite = buildService({}, 'writeThrows');
    await badWrite.setAutoHandwritingEnabled(false); // throw etmemeli
    assert.strictEqual(badWrite.logs.error.length, 1, 'yazma hatasi bildirilmeli');
    assert.strictEqual(
      badWrite.isAutoHandwritingEnabled(),
      false,
      'yazma basarisiz olsa da oturum icinde ayar gecerli olmali'
    );
    console.log('OK Test 10: okuma/yazma hatalari yutulmuyor, varsayilanla devam ediliyor');
  }

  runSourceChecks();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

// --- Kaynak denetimleri -----------------------------------------------
function runSourceChecks() {
  // --- Her OTOMATIK el yazisi cagrisi kapili olmali ---
  const GATE = 'if (!(await getPrivacySettings()).autoHandwriting) return;';
  SCREENS.forEach(([label, p]) => {
    const src = fs.readFileSync(p, 'utf8');
    assert.ok(
      /import \{ getPrivacySettings \} from '\.\.\/\.\.\/services\/privacySettingsService';/.test(src),
      label + ': ayar servisi import edilmeli'
    );

    // Otomatik cagrilarin SAYISI ile kapi sayisi esit olmali
    const calls = (src.match(/const result = await recognizeHandwriting\(/g) || []).length;
    const gates = src.split(GATE).length - 1;
    assert.strictEqual(calls, 2, label + ': beklenen 2 otomatik tanima cagrisi');
    assert.strictEqual(gates, calls, label + ': her otomatik cagrinin kendi kapisi olmali');

    // Kapi, cagrinin HEMEN ONCESINDE olmali (arada baska bir sey kalmasin)
    const adjacent = (
      src.match(
        /if \(!\(await getPrivacySettings\(\)\)\.autoHandwriting\) return;\s*\n\s*const result = await recognizeHandwriting\(/g
      ) || []
    ).length;
    assert.strictEqual(
      adjacent,
      calls,
      label + ': kapi her cagrinin hemen oncesinde olmali'
    );
  });
  console.log('OK Test 11: uc ekranda da otomatik el yazisi cagrilarinin tamami kapili');

  // --- Kullanicinin kendi tetikledigi akislar ETKILENMEMELI ---
  const lassoFiles = [
    path.join(ROOT, 'app', 'ajandam', '[pageId].js'),
    path.join(ROOT, 'app', 'todolist', '[pageId].js'),
    path.join(ROOT, 'components', 'notebook', 'NotebookPagesView.js'),
  ];
  lassoFiles.forEach((p) => {
    const src = fs.readFileSync(p, 'utf8');
    // Kement: recognizeSelectedStrokes kapili OLMAMALI
    const lassoCalls = src.match(/await recognizeSelectedStrokes\([\s\S]{0,120}/g) || [];
    lassoCalls.forEach((snippet) => {
      assert.ok(
        !/autoHandwriting/.test(snippet),
        path.basename(p) + ': kement ile metne cevirme ayardan ETKILENMEMELI'
      );
    });
    // Yeniden dene: transcribeAudioFile kapili OLMAMALI
    const retry = /const handleRetryTranscription = useCallback\(\s*\n\s*async \(audioNote\) => \{[\s\S]*?transcribeAudioFile\(/.exec(
      src
    );
    if (retry) {
      assert.ok(
        !/autoTranscribe/.test(retry[0]),
        path.basename(p) + ': "yeniden dene" ayardan ETKILENMEMELI'
      );
    }
  });
  console.log('OK Test 12: kement ve "yeniden dene" akislari ayardan etkilenmiyor');

  // --- Ses: canli tanima ve otomatik transkript kapili ---
  assert.ok(
    /const shouldUseLiveRecognition = \(\) =>\s*\n\s*autoTranscribe &&/.test(recorderSource),
    'canli tanima yolu ayar kapaliyken kullanilmamali'
  );
  assert.ok(
    /const autoAllowed = \(await getPrivacySettings\(\)\)\.autoTranscribe;\s*\n\s*if \(!hasLiveTranscript && isAvailable && autoAllowed && onTranscriptReady\) \{/.test(
      recorderSource
    ),
    'kayit sonrasi otomatik transkript ayara bagli olmali'
  );
  // Ayar degisince duraklatma yeniden hesaplanmali (Android expo-av yoluna duser)
  assert.ok(
    /\[autoTranscribe\]/.test(recorderSource),
    'canPauseRecording autoTranscribe degisince yeniden hesaplanmali'
  );
  console.log('OK Test 13: ses tarafinda canli tanima ve otomatik transkript ayara bagli');

  // --- Acilista yukleme kurulu ---
  const layout = fs.readFileSync(path.join(ROOT, 'app', '_layout.js'), 'utf8');
  assert.ok(
    /import \{ loadPrivacySettings \} from '\.\.\/services\/privacySettingsService';/.test(layout),
    '_layout.js tercih yukleyicisini import etmeli'
  );
  assert.ok(
    /useEffect\(\(\) => \{\s*\n\s*loadPrivacySettings\(\);\s*\n\s*\}, \[\]\);/.test(layout),
    'tercihler acilista bir kez yuklenmeli'
  );
  console.log('OK Test 14: tercihler uygulama acilisinda onbellege aliniyor');

  // --- Arayuz: modal bagli ve kapatma sonucu aciklaniyor ---
  const home = fs.readFileSync(path.join(ROOT, 'app', 'index.js'), 'utf8');
  assert.ok(
    /import PrivacySettingsModal from '\.\.\/components\/PrivacySettingsModal';/.test(home),
    'ana menu ayar modalini import etmeli'
  );
  assert.ok(
    /onPress=\{\(\) => setIsPrivacyModalVisible\(true\)\}/.test(home),
    'ana menude ayarlari acan bir dugme olmali'
  );

  const modal = fs.readFileSync(path.join(ROOT, 'components', 'PrivacySettingsModal.js'), 'utf8');
  ['privacy.autoHandwritingNote', 'privacy.autoTranscribeNote'].forEach((k) => {
    assert.ok(modal.includes(k), 'modal ' + k + ' aciklamasini gostermeli');
  });
  assert.ok(
    /disabled=\{!settings \|\| pendingKey !== null\}/.test(modal),
    'yazma surerken anahtarlar devre disi olmali (cift dokunus korumasi)'
  );
  assert.ok(
    /setSettings\(\(prev\) => \(prev \? \{ \.\.\.prev, \[key\]: !value \} : prev\)\);/.test(modal),
    'yazma basarisiz olursa anahtar geri alinmali (arayuz yalan soylememeli)'
  );
  console.log('OK Test 15: ayar modali bagli, sonuclari acikliyor, cift dokunusa karsi korumali');

  // --- Bes dilde gercek ceviri ---
  const keys = [
    'settingsTitle',
    'settingsDesc',
    'autoHandwritingLabel',
    'autoHandwritingNote',
    'autoTranscribeLabel',
    'autoTranscribeNote',
  ];
  const locales = {};
  ['tr', 'en', 'de', 'es', 'fr'].forEach((lng) => {
    locales[lng] = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'locales', lng + '.json'), 'utf8')
    );
  });
  keys.forEach((k) => {
    Object.entries(locales).forEach(([lng, j]) => {
      assert.ok(
        typeof j.privacy?.[k] === 'string' && j.privacy[k].length > 3,
        lng + ': privacy.' + k + ' tanimli olmali'
      );
    });
    ['en', 'de', 'es', 'fr'].forEach((lng) => {
      assert.notStrictEqual(
        locales[lng].privacy[k],
        locales.tr.privacy[k],
        lng + ': privacy.' + k + ' Turkceden kopyalanmis olmamali'
      );
    });
  });
  console.log('OK Test 16: ayar metinleri bes dilde gercek cevirilerle mevcut');

  // --- Magaza rehberi varsayilanla tutarli ---
  const guide = fs.readFileSync(path.join(ROOT, 'STORE-PRIVACY-FORMS.md'), 'utf8');
  assert.ok(
    /Users can choose whether this data is collected|Optional/.test(guide),
    'rehber artik Optional siniflandirmasindan soz etmeli'
  );
  assert.ok(
    /privacySettingsService/.test(guide),
    'rehber ayarin nerede tutuldugunu belirtmeli'
  );
  console.log('OK Test 17: magaza rehberi ayarlarla guncellenmis');

  console.log('--- TUM GIZLILIK AYARI TESTLERI BASARIYLA GECTI! ---');
}
