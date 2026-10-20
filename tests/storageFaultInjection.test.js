/**
 * ⚠️ GEÇİCİ — depolama hata enjeksiyonu (utils/storageFaultInjection.js) testleri.
 * Enjeksiyon kaldırılınca bu dosya da silinir.
 *
 * Asıl amaç: enjeksiyonun RELEASE/PREVIEW derlemesinde KESİNLİKLE kapalı olduğunu
 * kanıtlamak. Metro, üretim paketinde prelude'a `__DEV__=false` yazar
 * (node_modules/@expo/metro/node_modules/metro/src/lib/getPreludeCode.js).
 * Modül gerçek kaynaktan, __DEV__ dışarıdan verilerek yüklenir.
 *
 * BU TESTİN KAPSAMADIĞI:
 *   - Gerçek bir EAS derlemesi (APK) — üretim JS paketi ayrıca `npx expo export`
 *     ile denetlendi (bkz. ilerleme.md)
 *   - Ekranın ve göstergenin cihazda çizimi
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const toCjs = (source) =>
  babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;

const FAULT_SRC = read('utils/storageFaultInjection.js');

/** Modülü verilen __DEV__ değeriyle yükler ('yok' = tanımsız global) */
const loadFaults = (devValue) => {
  const module = { exports: {} };
  const code = toCjs(FAULT_SRC);
  if (devValue === 'yok') {
    // eslint-disable-next-line no-new-func
    new Function('module', 'exports', 'require', code)(module, module.exports, () => ({}));
  } else {
    // eslint-disable-next-line no-new-func
    new Function('module', 'exports', 'require', '__DEV__', code)(module, module.exports, () => ({}), devValue);
  }
  return module.exports;
};

// Asenkron akis yarida kalirsa (sonsuz bekleme) 0 ile cikip gecmis gorunmesin
const markComplete = require('./helpers/completionGuard')(__filename);

console.log('--- Hata Enjeksiyonu Testleri ---');

// --- Test 1: release (__DEV__ false) ve tanımsız __DEV__ → KESİNLİKLE kapalı ---
for (const dev of [false, 'yok', 'true', 1]) {
  const f = loadFaults(dev);
  assert.strictEqual(f.FAULT_INJECTION_AVAILABLE, false, `__DEV__=${dev}: kullanılabilir OLMAMALI`);
  for (const key of f.FAULT_KEYS) {
    assert.strictEqual(f.setFault('read', key, true), false, `__DEV__=${dev}: setFault uygulanmamalı`);
    assert.strictEqual(f.setFault('write', key, true), false);
    assert.strictEqual(f.shouldFailRead(key), false, `__DEV__=${dev}: okuma hatası VERMEMELİ`);
    assert.strictEqual(f.shouldFailWrite(key), false, `__DEV__=${dev}: yazma hatası VERMEMELİ`);
  }
  assert.strictEqual(f.isAnyFaultActive(), false, `__DEV__=${dev}: gösterge kapalı olmalı`);
}
console.log('OK Test 1: __DEV__ false / tanımsız / "true" metni / 1 iken enjeksiyon tamamen kapalı');

// --- Test 2: geliştirme (__DEV__ true) → anahtar bazında açılıp kapanıyor ---
{
  const f = loadFaults(true);
  assert.strictEqual(f.FAULT_INJECTION_AVAILABLE, true);
  assert.deepStrictEqual(f.FAULT_KEYS, [
    '@ajanda_pages',
    '@ajanda_diary_v1',
    '@ajanda_notebooks_v1',
    '@ajanda_cover',
  ]);
  let notified = 0;
  const unsubscribe = f.subscribeFaults(() => notified++);
  assert.strictEqual(f.setFault('read', '@ajanda_pages', true), true);
  assert.strictEqual(f.shouldFailRead('@ajanda_pages'), true);
  assert.strictEqual(f.shouldFailWrite('@ajanda_pages'), false, 'okuma açmak yazmayı açmamalı');
  assert.strictEqual(f.shouldFailRead('@ajanda_diary_v1'), false, 'başka anahtar etkilenmemeli');
  assert.strictEqual(f.isAnyFaultActive(), true);
  assert.strictEqual(f.setFault('write', '@ajanda_theme', true), false, 'liste dışı anahtar reddedilmeli');
  assert.strictEqual(f.setFault('read', '@ajanda_pages', false), true);
  assert.strictEqual(f.isAnyFaultActive(), false);
  f.setFault('write', '@ajanda_cover', true);
  f.clearAllFaults();
  assert.deepStrictEqual(f.getFaultState(), { read: [], write: [] });
  assert.ok(notified >= 4, 'her değişiklik dinleyicilere bildirilmeli');
  unsubscribe();
  console.log('OK Test 2: __DEV__ true iken anahtar bazında açma/kapama ve bildirim çalışıyor');
}

// --- Test 3: tüketen kodun tümü kapıya bağlı (statik denetim) ---
{
  const index = read('app/index.js');
  assert.ok(
    /\{__DEV__ && \(\s*<TouchableOpacity[\s\S]*?router\.push\('\/storage-faults'\)/.test(index),
    'ana menü bağlantısı {__DEV__ && (...)} içinde olmalı'
  );
  const screen = read('app/storage-faults.js');
  assert.ok(/!FAULT_INJECTION_AVAILABLE \?/.test(screen), 'ekran kullanılamazken yalnızca bilgi göstermeli');
  const badge = read('components/ui/FaultInjectionBadge.js');
  assert.ok(/if \(!FAULT_INJECTION_AVAILABLE \|\| !active\) return null;/.test(badge), 'gösterge release\'te çizilmemeli');
  const service = read('services/storageService.js');
  // Serviste enjeksiyon yalnızca kapı fonksiyonlarıyla sorgulanıyor
  assert.ok(/if \(shouldFailRead\(key\)\)/.test(service) && /if \(shouldFailWrite\(key\)\)/.test(service));
  assert.ok(!/FAULT_INJECTION_AVAILABLE|setFault/.test(service), 'servis enjeksiyonu açamaz');
  const backup = read('utils/storageBackup.js');
  assert.ok(!/setFault/.test(backup), 'yedek aracı enjeksiyonu açamaz');
  // Enjeksiyonu açabilen tek yer geçici ekran
  const users = [];
  const walk = (dir) => {
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach((d) => {
      const rel = path.join(dir, d.name);
      if (d.isDirectory()) walk(rel);
      else if (d.name.endsWith('.js') && /setFault\(/.test(read(rel))) users.push(rel.replace(/\\/g, '/'));
    });
  };
  ['app', 'components', 'services', 'utils', 'hooks', 'context'].forEach(walk);
  assert.deepStrictEqual(users.sort(), ['app/storage-faults.js'], 'setFault yalnizca gecici ekrandan cagrilmali');
  console.log('OK Test 3: menü bağlantısı __DEV__ kapılı; enjeksiyonu yalnızca geçici ekran açabiliyor');
}

markComplete();
console.log('--- TUM HATA ENJEKSIYONU TESTLERI GECTI ---');
