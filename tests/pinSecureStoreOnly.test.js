/**
 * pinSecureStoreOnly.test.js
 *
 * B1: PIN'in düz metin olarak AsyncStorage'a yazıldığı fallback yolunun
 *     tamamen kaldırılması.
 *
 * Kanıtlanan noktalar:
 *  - Eski düz metin kopyaların temizlendiği,
 *  - SecureStore kullanılamadığında setPin'in false döndüğü ve AsyncStorage'a
 *    HİÇBİR ŞEY yazmadığı,
 *  - verifyPin/hasPin'in artık AsyncStorage'daki bir kopyayı kabul etmediği
 *    (gölge kimlik bilgisi yolu kapalı),
 *  - Arayüzün bu başarısızlığı doğru işlediği (kaynak üzerinde).
 *
 * Yöntem: önce eski davranış birebik taklit edilip düz metin yazmanın gerçek
 * olduğu gösterilir, sonra kaynaktaki GERÇEK fonksiyonlar çıkarılıp aynı
 * senaryoda çalıştırılır.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SERVICE = path.join(__dirname, '..', 'services', 'securityService.js');
const LAYOUT = path.join(__dirname, '..', 'app', '_layout.js');
const PIN_MODAL = path.join(__dirname, '..', 'components', 'security', 'PinAuthModal.js');
const COVER = path.join(__dirname, '..', 'components', 'notebook', 'NotebookCoverView.js');

const source = fs.readFileSync(SERVICE, 'utf8');
const layoutSource = fs.readFileSync(LAYOUT, 'utf8');
const pinModalSource = fs.readFileSync(PIN_MODAL, 'utf8');
const coverSource = fs.readFileSync(COVER, 'utf8');

const SECURE_KEY = 'ajanda_diary_pin_v1';
const LEGACY_KEY = '@ajanda_diary_pin_secure_v1';

/** Sahte AsyncStorage */
const createAsyncStorage = (initial = {}) => {
  const store = { ...initial };
  return {
    store,
    async getItem(k) {
      return k in store ? store[k] : null;
    },
    async setItem(k, v) {
      store[k] = v;
    },
    async removeItem(k) {
      delete store[k];
    },
    async getAllKeys() {
      return Object.keys(store);
    },
    async multiRemove(keys) {
      keys.forEach((k) => delete store[k]);
    },
  };
};

/** Sahte SecureStore. mode: 'ok' | 'throws' */
const createSecureStore = (mode = 'ok') => {
  const store = {};
  const guard = () => {
    if (mode === 'throws') throw new Error('Keystore erisilemez');
  };
  return {
    store,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
    async setItemAsync(k, v) {
      guard();
      store[k] = v;
    },
    async getItemAsync(k) {
      guard();
      return k in store ? store[k] : null;
    },
    async deleteItemAsync(k) {
      guard();
      delete store[k];
    },
  };
};

/** Kaynaktan bir nesne metodunu aynen çıkarır */
const extractMethod = (signature) => {
  const re = new RegExp(
    '  async ' + signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{[\\s\\S]*?\\n  \\},'
  );
  const m = re.exec(source);
  assert.ok(m, signature + ' kaynakta bulunmali');
  return m[0];
};

/**
 * Kaynaktaki GERÇEK setPin / verifyPin / hasPin / removePin metotlarını ve
 * cleanupLegacyPlaintextPins fonksiyonunu çalıştırılabilir hale getirir.
 */
const buildService = ({ secureAvailable = true, secureMode = 'ok', asyncInitial = {} } = {}) => {
  const cleanupDecl =
    /export const cleanupLegacyPlaintextPins = async \(\) => \{[\s\S]*?\n\};/.exec(source);
  assert.ok(cleanupDecl, 'cleanupLegacyPlaintextPins kaynakta bulunmali');

  const body =
    'const SecurityService = {\n' +
    [extractMethod("setPin(pin, targetId = 'diary')"),
     extractMethod("verifyPin(pin, targetId = 'diary')"),
     extractMethod("hasPin(targetId = 'diary')"),
     extractMethod("removePin(targetId = 'diary')")].join('\n') +
    '\n  lockSession(id) { lockCalls.push(id); },\n' +
    '};\n' +
    cleanupDecl[0].replace('export const cleanupLegacyPlaintextPins', 'const cleanupLegacyPlaintextPins') +
    '\nreturn { SecurityService, cleanupLegacyPlaintextPins };';

  const SecureStore = createSecureStore(secureMode);
  const AsyncStorage = createAsyncStorage(asyncInitial);
  const lockCalls = [];

  // eslint-disable-next-line no-new-func
  const api = new Function(
    'SecureStore',
    'AsyncStorage',
    'isSecureStoreAvailable',
    'normalizeTargetId',
    'SECURE_STORE_PIN_KEY',
    'LEGACY_PLAINTEXT_PIN_KEY',
    'lockCalls',
    'console',
    body
  )(
    SecureStore,
    AsyncStorage,
    async () => secureAvailable,
    (id) => (!id || id === 'my_diary' || id === 'diary' ? 'diary' : String(id)),
    SECURE_KEY,
    LEGACY_KEY,
    lockCalls,
    { warn() {}, error() {} } // test çıktısını kirletmesin
  );

  return { ...api, SecureStore, AsyncStorage, lockCalls };
};

console.log('--- PIN SecureStore-Only Testleri ---');

(async () => {
  // --- Test 1: ESKI davranis gercekten duz metin yaziyordu --------------
  {
    const AsyncStorage = createAsyncStorage();

    // Eski setPin'in SecureStore yoksa izledigi yol (birebir)
    const legacySetPin = async (pin) => {
      const secureAvailable = false;
      if (secureAvailable) {
        /* SecureStore */
      } else {
        await AsyncStorage.setItem(`${LEGACY_KEY}_diary`, pin);
      }
      return true;
    };

    const ok = await legacySetPin('1234');

    assert.strictEqual(ok, true, 'eski kod basarili donuyordu');
    assert.strictEqual(
      AsyncStorage.store[`${LEGACY_KEY}_diary`],
      '1234',
      'ESKI davranis: PIN duz metin olarak AsyncStorage\'a yaziliyordu (hatanin kaniti)'
    );
    console.log('OK Test 1: eski fallback gercekten PIN\'i duz metin yaziyordu');
  }

  // --- Test 2: SecureStore yoksa setPin false, AsyncStorage'a yazma YOK --
  {
    const { SecurityService, AsyncStorage } = buildService({ secureAvailable: false });

    const result = await SecurityService.setPin('1234', 'diary');

    assert.strictEqual(result, false, 'SecureStore yoksa setPin false donmeli');
    assert.deepStrictEqual(
      Object.keys(AsyncStorage.store),
      [],
      'AsyncStorage\'a HICBIR SEY yazilmamali (duz metin yedegi yok)'
    );
    console.log('OK Test 2: SecureStore yokken setPin false donuyor, duz metin yazmiyor');
  }

  // --- Test 3: SecureStore yazmasi hata verirse de duz metine dusmez -----
  {
    const { SecurityService, AsyncStorage } = buildService({ secureMode: 'throws' });

    const result = await SecurityService.setPin('1234', 'diary');

    assert.strictEqual(result, false, 'SecureStore hata verirse setPin false donmeli');
    assert.deepStrictEqual(
      Object.keys(AsyncStorage.store),
      [],
      'catch dalinda da duz metin yedegi yazilmamali'
    );
    console.log('OK Test 3: SecureStore istisnasinda da duz metin yedegi yazilmiyor');
  }

  // --- Test 4: Normal yol hala calisiyor (asiri siki degil) --------------
  {
    const { SecurityService, SecureStore, AsyncStorage } = buildService();

    assert.strictEqual(await SecurityService.setPin('1234', 'diary'), true);
    assert.strictEqual(SecureStore.store[`${SECURE_KEY}_diary`], '1234', 'PIN SecureStore\'a yazilmali');
    assert.deepStrictEqual(Object.keys(AsyncStorage.store), [], 'AsyncStorage temiz kalmali');
    assert.strictEqual(await SecurityService.verifyPin('1234', 'diary'), true, 'dogru PIN kabul edilmeli');
    assert.strictEqual(await SecurityService.verifyPin('9999', 'diary'), false, 'yanlis PIN reddedilmeli');
    assert.strictEqual(await SecurityService.hasPin('diary'), true);
    console.log('OK Test 4: SecureStore varken kaydet/dogrula/sorgula normal calisiyor');
  }

  // --- Test 5: Golge kimlik bilgisi yolu kapali --------------------------
  {
    // AsyncStorage'da eski bir duz metin PIN var, SecureStore'da yok.
    const { SecurityService } = buildService({
      asyncInitial: { [`${LEGACY_KEY}_diary`]: '1234' },
    });

    assert.strictEqual(
      await SecurityService.verifyPin('1234', 'diary'),
      false,
      'AsyncStorage\'daki duz metin kopya ARTIK kabul edilmemeli'
    );
    assert.strictEqual(
      await SecurityService.hasPin('diary'),
      false,
      'hasPin AsyncStorage kopyasini gormemeli'
    );
    console.log('OK Test 5: AsyncStorage kopyasi artik kimlik bilgisi olarak kabul edilmiyor');
  }

  // --- Test 6: SecureStore yoksa verifyPin/hasPin guvenle false ----------
  {
    const { SecurityService } = buildService({
      secureAvailable: false,
      asyncInitial: { [`${LEGACY_KEY}_diary`]: '1234' },
    });
    assert.strictEqual(await SecurityService.verifyPin('1234', 'diary'), false);
    assert.strictEqual(await SecurityService.hasPin('diary'), false);
    console.log('OK Test 6: SecureStore yokken verifyPin/hasPin false (web dahil)');
  }

  // --- Test 7: Temizlik eski kopyalarin TAMAMINI siliyor ----------------
  {
    const { cleanupLegacyPlaintextPins, AsyncStorage } = buildService({
      asyncInitial: {
        [`${LEGACY_KEY}_diary`]: '1234',
        [`${LEGACY_KEY}_nb_1`]: '5678',
        [`${LEGACY_KEY}_nb_2`]: '0000',
        '@ajanda_diary_v1': '{"pages":[]}',
        '@ajanda_pin_attempts_v1': '{}',
      },
    });

    const removed = await cleanupLegacyPlaintextPins();

    assert.strictEqual(removed, 3, 'gunluk + iki defter = 3 eski kopya silinmeli');
    assert.deepStrictEqual(
      Object.keys(AsyncStorage.store).sort(),
      ['@ajanda_diary_v1', '@ajanda_pin_attempts_v1'],
      'ILGISIZ anahtarlara dokunulmamali'
    );
    console.log('OK Test 7: tum hedeflerin eski duz metin kopyalari silindi, digerleri korundu');
  }

  // --- Test 8: Temizlik idempotent, silinecek yoksa 0 --------------------
  {
    const { cleanupLegacyPlaintextPins, AsyncStorage } = buildService({
      asyncInitial: { '@ajanda_theme': 'pastel' },
    });

    assert.strictEqual(await cleanupLegacyPlaintextPins(), 0, 'silinecek yoksa 0 donmeli');
    assert.strictEqual(await cleanupLegacyPlaintextPins(), 0, 'ikinci cagri da zararsiz olmali');
    assert.deepStrictEqual(Object.keys(AsyncStorage.store), ['@ajanda_theme']);
    console.log('OK Test 8: temizlik idempotent, ilgisiz veriye dokunmuyor');
  }

  // --- Test 9: removePin hem SecureStore hem eski kopyayi siliyor --------
  {
    const { SecurityService, SecureStore, AsyncStorage, lockCalls } = buildService({
      asyncInitial: { [`${LEGACY_KEY}_diary`]: '1234' },
    });
    await SecurityService.setPin('1234', 'diary');

    assert.strictEqual(await SecurityService.removePin('diary'), true);
    assert.strictEqual(SecureStore.store[`${SECURE_KEY}_diary`], undefined, 'SecureStore kaydi silinmeli');
    assert.strictEqual(
      AsyncStorage.store[`${LEGACY_KEY}_diary`],
      undefined,
      'savunma amacli eski kopya da silinmeli'
    );
    assert.deepStrictEqual(lockCalls, ['diary'], 'oturum kilidi dusurulmeli');
    console.log('OK Test 9: removePin SecureStore kaydini ve eski kopyayi birlikte siliyor');
  }

  runSourceChecks();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

// --- Kaynak denetimleri -----------------------------------------------
function runSourceChecks() {
  // Fallback anahtarı yalnızca SİLME amaçlı kalmalı, hiçbir yere YAZILMAMALI
  assert.ok(
    !/ASYNC_FALLBACK_PIN_KEY/.test(source),
    'eski fallback sabiti tamamen kaldirilmis olmali'
  );
  const legacyWrites = source.match(/AsyncStorage\.setItem\([^)]*LEGACY_PLAINTEXT_PIN_KEY/g);
  assert.strictEqual(legacyWrites, null, 'eski anahtara HICBIR yazma kalmamali');
  assert.ok(
    /AsyncStorage\.multiRemove\(legacyKeys\)/.test(source),
    'eski anahtar yalnizca silme icin kullanilmali'
  );
  console.log('OK Test 10: kaynakta duz metin PIN yazan hicbir yol kalmadi');

  // cleanup uygulama acilisinda calismali
  assert.ok(
    /import \{ cleanupLegacyPlaintextPins \} from '\.\.\/services\/securityService';/.test(layoutSource),
    '_layout.js temizligi import etmeli'
  );
  assert.ok(
    /useEffect\(\(\) => \{\s*\n\s*cleanupLegacyPlaintextPins\(\);\s*\n\s*\}, \[\]\);/.test(layoutSource),
    'temizlik acilista bir kez (bos bagimlilik dizisi) calismali'
  );
  console.log('OK Test 11: temizlik uygulama acilisinda bir kez calisiyor');

  // Arayüz: setPin false dönerse kullanıcıya hata gösterilmeli
  const saveErrorBlocks = pinModalSource.match(
    /const saved = await SecurityService\.setPin\([\s\S]{0,900}?security\.saveError/g
  );
  assert.ok(
    saveErrorBlocks && saveErrorBlocks.length >= 2,
    'PinAuthModal her setPin cagrisindan sonra basarisizligi saveError ile bildirmeli'
  );
  console.log(
    'OK Test 12: PinAuthModal setPin basarisizligini ' +
      saveErrorBlocks.length +
      ' yerde kullaniciya bildiriyor'
  );

  // Arayüz: güvenli depo yoksa kilit seçeneği gizlenmeli + korunmalı
  assert.ok(
    /const \[isPinSupported, setIsPinSupported\] = useState\(Platform\.OS !== 'web'\);/.test(coverSource),
    'NotebookCoverView PIN destegini durumda tutmali'
  );
  assert.ok(
    /\{isPinSupported && \(\s*\n\s*<TouchableOpacity/.test(coverSource),
    'kilit butonu destek yoksa hic render edilmemeli'
  );
  assert.ok(
    /if \(!\(await SecurityService\.isPinSupportedAsync\(\)\)\) \{/.test(coverSource),
    'handleToggleLock ayrica calisma aninda korunmali'
  );
  assert.ok(
    /security\.pinUnsupported/.test(coverSource),
    'destek yoksa kullaniciya aciklayici mesaj gosterilmeli'
  );
  console.log('OK Test 13: guvenli depo yoksa kilit secenegi gizli ve isleyici korumali');

  // Beş dilde mesaj mevcut
  ['tr', 'en', 'de', 'es', 'fr'].forEach((lng) => {
    const j = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'locales', lng + '.json'), 'utf8')
    );
    assert.ok(
      typeof j.security?.pinUnsupported === 'string' && j.security.pinUnsupported.length > 10,
      lng + ': security.pinUnsupported tanimli olmali'
    );
  });
  console.log('OK Test 14: security.pinUnsupported bes dilde de tanimli');

  console.log('--- TUM PIN SECURESTORE-ONLY TESTLERI BASARIYLA GECTI! ---');
}
