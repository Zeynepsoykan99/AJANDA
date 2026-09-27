/**
 * localeIntegrity.test.js
 *
 * Dil dosyalarinin butunlugunu denetler.
 *
 * Asil amac: MUKERRER anahtar tespiti. Bes dil dosyasinda da `audio`, `transcript`
 * ve `notebooks` bolumleri iki kez tanimlanmisti; JSON.parse son tanimi alip
 * oncekini SESSIZCE attigi icin her dosyada ~52 satir, 25 anahtar hic yuklenmiyordu.
 * Kodda kullanilan 23 anahtar bu yuzden Turkce varsayilana dusuyordu ve hata
 * aylarca fark edilmedi. Bu test o hatanin sessizce geri gelmesini engeller.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const LANGS = ['tr', 'en', 'de', 'es', 'fr'];
const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const REFERENCE = 'tr';

/**
 * Ham JSON metninde AYNI nesne seviyesinde tekrarlanan anahtarlari bulur.
 * JSON.parse bunlari sessizce birlestirdigi icin ayristirilmis nesne uzerinden
 * tespit edilemez; bu yuzden metin taranir.
 */
function findDuplicateKeys(text) {
  const duplicates = [];
  const stack = [{}];
  const re = /"((?:[^"\\]|\\.)*)"\s*:|([{}])/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[2] === '{') {
      stack.push({});
    } else if (m[2] === '}') {
      stack.pop();
    } else if (m[1] !== undefined) {
      const current = stack[stack.length - 1];
      const line = text.slice(0, m.index).split('\n').length;
      if (current[m[1]] !== undefined) {
        duplicates.push({ key: m[1], firstLine: current[m[1]], duplicateLine: line });
      } else {
        current[m[1]] = line;
      }
    }
  }
  return duplicates;
}

/** Ic ice nesneyi "a.b.c" bicimine duzlestirir */
function flatten(obj, prefix = '', out = {}) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const full = prefix ? prefix + '.' + key : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, full, out);
    } else {
      out[full] = value;
    }
  }
  return out;
}

console.log('--- Dil Dosyasi Butunluk Testleri ---');

const raw = {};
const parsed = {};
LANGS.forEach((lang) => {
  const file = path.join(LOCALES_DIR, lang + '.json');
  assert.ok(fs.existsSync(file), lang + '.json bulunmali');
  raw[lang] = fs.readFileSync(file, 'utf8');
  parsed[lang] = JSON.parse(raw[lang]); // gecersiz JSON burada patlar
});
console.log('OK Test 1: ' + LANGS.length + ' dil dosyasinin tamami gecerli JSON');

// --- Test 2: MUKERRER ANAHTAR OLMAMALI (bu testin asil varlik sebebi) ---
{
  const problems = [];
  LANGS.forEach((lang) => {
    findDuplicateKeys(raw[lang]).forEach((d) => {
      problems.push(
        lang + '.json -> "' + d.key + '" (ilk tanim: satir ' + d.firstLine +
          ', tekrar: satir ' + d.duplicateLine + ')'
      );
    });
  });
  assert.strictEqual(
    problems.length,
    0,
    'Dil dosyalarinda mukerrer anahtar var. JSON.parse son tanimi alir ve oncekini ' +
      'SESSIZCE atar, yani bu anahtarlarin cevirileri hic yuklenmez:\n  ' +
      problems.join('\n  ')
  );
  console.log('OK Test 2: hicbir dil dosyasinda mukerrer anahtar yok');
}

// --- Test 3: Bes dosya tam paritede olmali ---
{
  const flat = {};
  LANGS.forEach((lang) => (flat[lang] = flatten(parsed[lang])));
  const referenceKeys = Object.keys(flat[REFERENCE]);

  LANGS.forEach((lang) => {
    const missing = referenceKeys.filter((k) => !(k in flat[lang]));
    const extra = Object.keys(flat[lang]).filter((k) => !(k in flat[REFERENCE]));
    assert.strictEqual(
      missing.length,
      0,
      lang + '.json icinde eksik anahtarlar: ' + missing.slice(0, 10).join(', ')
    );
    assert.strictEqual(
      extra.length,
      0,
      lang + '.json icinde fazladan anahtarlar: ' + extra.slice(0, 10).join(', ')
    );
  });
  console.log(
    'OK Test 3: bes dosya tam paritede (' + referenceKeys.length + ' anahtar, eksik/fazla yok)'
  );
}

// --- Test 4: Kodda kullanilan her t() anahtari bes dilde de bulunmali ---
{
  const sourceFiles = [];
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.js$/.test(entry.name)) sourceFiles.push(p);
    });
  ['app', 'components'].forEach((d) => walk(path.join(__dirname, '..', d)));

  const used = new Set();
  sourceFiles.forEach((f) => {
    const content = fs.readFileSync(f, 'utf8');
    const re = /\bt\(\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(content))) used.add(m[1]);
  });

  const flat = {};
  LANGS.forEach((lang) => (flat[lang] = flatten(parsed[lang])));

  const unresolved = [];
  used.forEach((key) => {
    const missingIn = LANGS.filter((lang) => !(key in flat[lang]));
    if (missingIn.length) unresolved.push(key + ' (eksik: ' + missingIn.join(', ') + ')');
  });

  assert.strictEqual(
    unresolved.length,
    0,
    'Kodda kullanilan anahtarlar dil dosyalarinda bulunamadi (Turkce varsayilana duserler):\n  ' +
      unresolved.slice(0, 20).join('\n  ')
  );
  console.log('OK Test 4: kodda kullanilan ' + used.size + ' anahtarin tamami bes dilde de tanimli');
}

// --- Test 5: Interpolasyon degiskenleri diller arasinda tutarli olmali ---
{
  const flat = {};
  LANGS.forEach((lang) => (flat[lang] = flatten(parsed[lang])));
  const varsOf = (s) =>
    typeof s === 'string' ? (s.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || []).sort().join(',') : '';

  const mismatches = [];
  Object.keys(flat[REFERENCE]).forEach((key) => {
    const expected = varsOf(flat[REFERENCE][key]);
    LANGS.filter((l) => l !== REFERENCE).forEach((lang) => {
      const actual = varsOf(flat[lang][key]);
      if (expected !== actual) {
        mismatches.push(
          key + ' -> ' + REFERENCE + ': [' + expected + '] , ' + lang + ': [' + actual + ']'
        );
      }
    });
  });

  assert.strictEqual(
    mismatches.length,
    0,
    'Interpolasyon degiskenleri diller arasinda uyusmuyor (metin yerine ham {{...}} gorunur):\n  ' +
      mismatches.slice(0, 15).join('\n  ')
  );
  console.log('OK Test 5: {{...}} interpolasyon degiskenleri bes dilde tutarli');
}

console.log('--- TUM DIL DOSYASI BUTUNLUK TESTLERI BASARIYLA GECTI! ---');
