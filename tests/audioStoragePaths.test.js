/**
 * audioStoragePaths.test.js
 *
 * Sesli notların KALICI dizine yazıldığını garanti eden yol (path) mantığını doğrular.
 *
 * Bu test, mantığı kopyalamak yerine `services/audioService.js` dosyasının GERÇEK
 * kaynağını okur. Böylece kaynakta bir bozulma olursa (ör. kaçış karakteri kaybı,
 * legacy import'un geri alınması) test kaldığı yerde yakalar; kopya bir mantık
 * üzerinde yanlış yere "geçti" demez.
 *
 * Gerçek ses kaydı yapılmaz; sahte URI'ler üzerinde yalnızca yol mantığı sınanır.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SERVICE_PATH = path.join(__dirname, '..', 'services', 'audioService.js');
const source = fs.readFileSync(SERVICE_PATH, 'utf8');

console.log('--- Sesli Not Kalıcı Saklama Yol Testleri ---');

// 1. Legacy giriş kullanılıyor mu?
// SDK 54'te ana giriş documentDirectory'yi export etmiyor; ana girişe dönülürse
// AUDIO_DIR "undefinedaudio_notes/" olur ve tüm kayıtlar önbellekte kalır.
assert.ok(
  /import \* as FileSystem from 'expo-file-system\/legacy';/.test(source),
  'audioService, expo-file-system/legacy girişini kullanmalı'
);
console.log('✔ Test 1: legacy expo-file-system girişi kullanılıyor');

// 2. AUDIO_DIR documentDirectory üzerine kurulmuş ve dışa açılmış olmalı
assert.ok(
  /export const AUDIO_DIR = `\$\{FileSystem\.documentDirectory\}audio_notes\/`;/.test(source),
  'AUDIO_DIR documentDirectory tabanlı olmalı ve export edilmeli'
);
console.log('✔ Test 2: AUDIO_DIR kalıcı doküman dizinine kurulu ve export ediliyor');

// 3. Kaynaktaki gerçek getFileExtension fonksiyonunu çıkarıp çalıştır
const helperMatch = /const getFileExtension = \(uri\) => \{[\s\S]*?\n\};/.exec(source);
assert.ok(helperMatch, 'getFileExtension yardımcısı kaynakta bulunmalı');

// eslint-disable-next-line no-eval
const getFileExtension = eval(
  '(' + helperMatch[0].replace('const getFileExtension = ', '').replace(/;$/, '') + ')'
);

const extensionCases = [
  ['file:///data/user/0/com.app/files/audio_notes/note_1.wav', '.wav'],
  ['file:///var/mobile/.../audio_notes/page_1_abcd.m4a', '.m4a'],
  ['file:///a/b/rec.M4A', '.m4a'],          // büyük harf normalize edilmeli
  ['file:///a/b/x.caf?token=1', '.caf'],    // sorgu parametresi yok sayılmalı
  ['file:///a/b/x.wav#frag', '.wav'],       // fragment yok sayılmalı
  ['file:///a/b/uzantisiz', '.m4a'],        // uzantı yoksa varsayılan
  ['file:///a/b/cwav', '.m4a'],             // noktasız metin uzantı sayılmamalı
  ['', '.m4a'],
  [null, '.m4a'],
  [undefined, '.m4a'],
];

extensionCases.forEach(([input, expected]) => {
  assert.strictEqual(
    getFileExtension(input),
    expected,
    `getFileExtension(${JSON.stringify(input)}) === ${expected} olmalı`
  );
});
console.log(`✔ Test 3: getFileExtension ${extensionCases.length} senaryoda doğru uzantı türetiyor`);

// 4. Kalıcı dizindeki dosya yeniden kopyalanmamalı (canlı tanıma zaten oraya yazıyor)
assert.ok(
  /if \(String\(tempUri\)\.startsWith\(AUDIO_DIR\)\) \{\s*\n\s*return \{ fileName: getAudioFileName\(tempUri\), uri: tempUri, isPersistent: true \};/.test(
    source
  ),
  'saveAudioPermanently, kaynak zaten AUDIO_DIR içindeyse kopyalamayı atlamalı'
);
console.log('✔ Test 4: kalıcı dizindeki dosya için mükerrer kopya oluşturulmuyor');

// 5. Hedef dosya adı çakışmaya karşı zaman damgası + rastgele son ek içermeli
assert.ok(
  /\$\{cleanPageId\}_\$\{Date\.now\(\)\}_\$\{randomSuffix\}\$\{getFileExtension\(tempUri\)\}/.test(source),
  'Hedef dosya adı pageId + zaman damgası + rastgele son ek + türetilmiş uzantı içermeli'
);
// 5b. Dönüş sözleşmesi: çağıran, kaydın gerçekten kalıcı olup olmadığını bilmeli
assert.ok(
  /return \{ fileName, uri: destUri, isPersistent: true \};/.test(source),
  'Başarılı taşımada { fileName, uri, isPersistent: true } dönmeli'
);
assert.ok(
  /return \{ fileName: null, uri: tempUri, isPersistent: false \};/.test(source),
  'Başarısız taşımada isPersistent: false dönmeli ki çağıran geçici URI sakladığını bilsin'
);
console.log('✔ Test 5: hedef dosya adı çakışmaya karşı korumalı, uzantı türetilmiş, dönüş sözleşmesi doğru');

// 6. Kopyalama hedefi kalıcı dizin olmalı
assert.ok(
  /const destUri = `\$\{AUDIO_DIR\}\$\{fileName\}`;/.test(source),
  'Kopyalama hedefi AUDIO_DIR içinde olmalı'
);
console.log('✔ Test 6: kopyalama hedefi kalıcı dizin');

// 7. Kalıcı dizine yazma başarısız olursa sessiz kalınmamalı
assert.ok(
  /console\.error\(\s*\n?\s*'saveAudioPermanently BASARISIZ/.test(source),
  'Kalıcı taşıma başarısız olduğunda error seviyesinde loglanmalı'
);
assert.ok(
  /console\.error\('ensureAudioDirectory hatası/.test(source),
  'Dizin hazırlanamazsa error seviyesinde loglanmalı'
);
console.log('✔ Test 7: kalıcı saklama hataları sessizce yutulmuyor');

// 8. Canlı tanıma yolu kalıcı dizini kullanmalı (çağıran bileşen üzerinden)
const MODAL_PATH = path.join(__dirname, '..', 'components', 'audio', 'AudioRecorderModal.js');
const modalSource = fs.readFileSync(MODAL_PATH, 'utf8');
assert.ok(
  /await ensureAudioDirectory\(\);/.test(modalSource),
  'Canlı kayıt başlamadan önce ensureAudioDirectory çağrılmalı'
);
assert.ok(
  /outputDirectory: AUDIO_DIR,/.test(modalSource),
  'Canlı tanıma kaydı AUDIO_DIR içine yazmalı (varsayılan önbellek dizinine değil)'
);
console.log('✔ Test 8: canlı tanıma kaydı kalıcı dizine yönlendiriliyor');

// 9. transcriptionService outputDirectory seçeneğini gerçekten iletmeli
const TRANSCRIPTION_PATH = path.join(__dirname, '..', 'services', 'transcriptionService.js');
const transcriptionSource = fs.readFileSync(TRANSCRIPTION_PATH, 'utf8');
assert.ok(
  /\.\.\.\(outputDirectory \? \{ outputDirectory \} : \{\}\),/.test(transcriptionSource),
  'startLiveRecognition, outputDirectory değerini recordingOptions içine aktarmalı'
);
console.log('✔ Test 9: outputDirectory recordingOptions içine aktarılıyor');

console.log('--- TÜM KALICI SAKLAMA YOL TESTLERİ BAŞARIYLA GEÇTİ! ---');
