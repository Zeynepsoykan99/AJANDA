/**
 * privacyPolicyDocs.test.js
 *
 * Gizlilik politikasının beş dildeki metinlerinin tutarlılığı ve uygulama
 * içindeki bağlantının yayınlanan adreslerle eşleştiği denetlenir.
 *
 * Buradaki asıl risk şu: metin beş ayrı dosyada tutuluyor. Biri güncellenip
 * diğerleri unutulursa mağazaya verilen adreste eksik/çelişkili bir metin
 * yayınlanır. İkinci risk, `constants/links.js`'teki yolun dosyaların
 * `permalink` değerinden sapıp bağlantının 404 vermesidir.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const LANGS = ['tr', 'en', 'de', 'es', 'fr'];

const CONTACT_EMAIL = 'zeynepsoykan99@gmail.com';
const CONTACT_OWNER = 'Zeynep Soykan';
const EXPECTED_SECTIONS = 11;

/** Dil kodu -> docs/ dosya adı */
const fileFor = (lng) => (lng === 'tr' ? 'PRIVACY.md' : `PRIVACY.${lng}.md`);

const docs = {};
LANGS.forEach((lng) => {
  const p = path.join(DOCS, fileFor(lng));
  assert.ok(fs.existsSync(p), fileFor(lng) + ' var olmali');
  docs[lng] = fs.readFileSync(p, 'utf8');
});

/** Front matter alanlarını okur (YAML bagimliligi olmadan) */
const frontMatter = (text) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  assert.ok(m, 'front matter bulunmali');
  const out = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const kv = /^([a-zA-Z_]+):\s*(.*)$/.exec(line.trim());
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  });
  return out;
};

console.log('--- Gizlilik Politikasi Dokuman Testleri ---');

// --- Test 1: Front matter ve permalink'ler --------------------------
{
  const expectedPermalinks = {
    tr: '/privacy/',
    en: '/privacy/en/',
    de: '/privacy/de/',
    es: '/privacy/es/',
    fr: '/privacy/fr/',
  };
  LANGS.forEach((lng) => {
    const fm = frontMatter(docs[lng]);
    assert.strictEqual(fm.layout, 'default', lng + ': layout default olmali');
    assert.strictEqual(fm.lang, lng, lng + ': lang alani dil koduyla ayni olmali');
    assert.strictEqual(
      fm.permalink,
      expectedPermalinks[lng],
      lng + ': permalink beklenen adres olmali'
    );
    assert.ok(fm.title && fm.title.includes('AJANDA'), lng + ': title AJANDA icermeli');
  });
  console.log('OK Test 1: bes dosyanin front matter ve permalink degerleri dogru');
}

// --- Test 2: Bölüm yapısı beş dilde aynı ----------------------------
{
  LANGS.forEach((lng) => {
    // Numaralandirma dilden bagimsizdir: "## 1." ... "## 11."
    const numbered = (docs[lng].match(/^## (\d+)\. /gm) || []).map((h) =>
      Number(/\d+/.exec(h)[0])
    );
    assert.deepStrictEqual(
      numbered,
      Array.from({ length: EXPECTED_SECTIONS }, (_, i) => i + 1),
      lng + ': 1-' + EXPECTED_SECTIONS + ' arasi bolumler eksiksiz ve sirali olmali'
    );

    // Numarasiz tek bir "ozet" bolumu olmali
    const unnumbered = (docs[lng].match(/^## (?!\d)/gm) || []).length;
    assert.strictEqual(unnumbered, 1, lng + ': tam olarak bir numarasiz bolum (ozet) olmali');

    // Tek bir H1
    assert.strictEqual(
      (docs[lng].match(/^# /gm) || []).length,
      1,
      lng + ': tam olarak bir H1 basligi olmali'
    );
  });
  console.log('OK Test 2: bolum yapisi (1-11 + ozet) bes dilde ayni');
}

// --- Test 3: İletişim bilgileri beş dilde aynı ----------------------
{
  LANGS.forEach((lng) => {
    assert.ok(docs[lng].includes(CONTACT_EMAIL), lng + ': iletisim e-postasi bulunmali');
    assert.ok(docs[lng].includes(CONTACT_OWNER), lng + ': uygulama sahibi adi bulunmali');
  });
  console.log('OK Test 3: iletisim e-postasi ve sahip adi bes dilde ayni');
}

// --- Test 4: Doldurulmamış yer tutucu kalmamış ----------------------
{
  LANGS.forEach((lng) => {
    const body = docs[lng].replace(/^---[\s\S]*?\n---/, '');
    // Markdown baglantilarini ([metin](adres)) ayikla, kalan koseli parantezler
    // doldurulmamis yer tutucu demektir
    const withoutLinks = body.replace(/\[[^\]]*\]\([^)]*\)/g, '');
    const leftovers = withoutLinks.match(/\[[^\]\n]{3,}\]/g);
    assert.strictEqual(
      leftovers,
      null,
      lng + ': doldurulmamis yer tutucu kalmamali -> ' + JSON.stringify(leftovers)
    );
    ['[TARİH]', '[E-POSTA', '[AD /', 'KARAR GEREKİYOR'].forEach((ph) => {
      assert.ok(!docs[lng].includes(ph), lng + ': "' + ph + '" kalmamali');
    });
  });
  console.log('OK Test 4: hicbir dilde doldurulmamis yer tutucu kalmadi');
}

// --- Test 5: Diller arası çapraz bağlantılar eksiksiz ---------------
{
  const urlFor = { tr: '/AJANDA/privacy/', en: '/AJANDA/privacy/en/', de: '/AJANDA/privacy/de/', es: '/AJANDA/privacy/es/', fr: '/AJANDA/privacy/fr/' };
  LANGS.forEach((lng) => {
    LANGS.filter((other) => other !== lng).forEach((other) => {
      assert.ok(
        docs[lng].includes('(' + urlFor[other] + ')'),
        lng + ': ' + other + ' surumune baglanti icermeli'
      );
    });
    assert.ok(
      !docs[lng].includes('(' + urlFor[lng] + ')'),
      lng + ': kendi diline baglanti vermemeli'
    );
  });
  console.log('OK Test 5: her dil diger dort dile capraz baglanti veriyor');
}

// --- Test 6: Teknik gerçekler beş dilde de yer alıyor ---------------
{
  LANGS.forEach((lng) => {
    assert.ok(
      docs[lng].includes('inputtools.google.com'),
      lng + ': el yazisi servisinin adresi belirtilmeli'
    );
    assert.ok(docs[lng].includes('Google'), lng + ': Google adi gecmeli');
    assert.ok(docs[lng].includes('Apple'), lng + ': Apple adi gecmeli');
    assert.ok(docs[lng].includes('Keychain') && docs[lng].includes('Keystore'),
      lng + ': PIN\'in nerede tutuldugu belirtilmeli');
    assert.ok(/2026/.test(docs[lng].slice(0, 400)), lng + ': guncelleme tarihi ustte olmali');
  });
  console.log('OK Test 6: servis adlari, PIN deposu ve tarih bes dilde de belirtilmis');
}

// --- Test 7: Uygulama içi bağlantı yayınlanan adreslerle eşleşiyor --
{
  const linksSource = fs.readFileSync(path.join(ROOT, 'constants', 'links.js'), 'utf8');

  const baseDecl = /export const SITE_BASE_URL = '([^']+)';/.exec(linksSource);
  assert.ok(baseDecl, 'SITE_BASE_URL tanimli olmali');
  const pathsDecl = /const PRIVACY_PATHS = \{[\s\S]*?\n\};/.exec(linksSource);
  assert.ok(pathsDecl, 'PRIVACY_PATHS tanimli olmali');
  const fnDecl = /export const getPrivacyPolicyUrl = \(language\) => \{[\s\S]*?\n\};/.exec(
    linksSource
  );
  assert.ok(fnDecl, 'getPrivacyPolicyUrl tanimli olmali');

  // eslint-disable-next-line no-new-func
  const getUrl = new Function(
    "const SITE_BASE_URL = '" +
      baseDecl[1] +
      "';\n" +
      pathsDecl[0] +
      '\n' +
      fnDecl[0].replace('export const', 'const') +
      '\nreturn getPrivacyPolicyUrl;'
  )();

  LANGS.forEach((lng) => {
    const permalink = frontMatter(docs[lng]).permalink;
    assert.strictEqual(
      getUrl(lng),
      baseDecl[1] + permalink,
      lng + ': uygulama icindeki adres dosyanin permalink degeriyle AYNI olmali'
    );
  });

  // Bolgesel kodlar da dogru dile gitmeli
  assert.strictEqual(getUrl('en-US'), baseDecl[1] + '/privacy/en/', 'en-US ingilizceye gitmeli');
  assert.strictEqual(getUrl('tr-TR'), baseDecl[1] + '/privacy/', 'tr-TR turkceye gitmeli');
  // Desteklenmeyen dil ingilizceye duser (okunamayan Turkce metne degil)
  assert.strictEqual(getUrl('ja'), baseDecl[1] + '/privacy/en/', 'desteklenmeyen dil ingilizceye dusmeli');
  assert.strictEqual(getUrl(undefined), baseDecl[1] + '/privacy/en/', 'bos dil ingilizceye dusmeli');
  console.log('OK Test 7: uygulama icindeki adresler yayınlanan permalink\'lerle birebir esliyor');
}

// --- Test 8: Ana menüdeki bağlantı bağlı ve çevrili ------------------
{
  const home = fs.readFileSync(path.join(ROOT, 'app', 'index.js'), 'utf8');
  assert.ok(
    /import \{ getPrivacyPolicyUrl \} from '\.\.\/constants\/links';/.test(home),
    'ana menu adres ureticisini import etmeli'
  );
  assert.ok(
    /const url = getPrivacyPolicyUrl\(i18n\.language\);/.test(home),
    'baglanti kullanicinin diline gore uretilmeli'
  );
  assert.ok(
    /Linking\.openURL\(url\)\.catch\(/.test(home),
    'tarayici acilamazsa hata yakalanmali'
  );
  assert.ok(
    /onPress=\{handleOpenPrivacy\}/.test(home) && /home\.privacyPolicy/.test(home),
    'menude gizlilik baglantisi render edilmeli'
  );

  LANGS.forEach((lng) => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', lng + '.json'), 'utf8'));
    assert.ok(
      typeof j.home?.privacyPolicy === 'string' && j.home.privacyPolicy.length > 3,
      lng + ': home.privacyPolicy tanimli olmali'
    );
  });
  // Gercek ceviri: baslik her dilde ayni olmamali
  const titles = LANGS.map(
    (lng) =>
      JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', lng + '.json'), 'utf8')).home
        .privacyPolicy
  );
  assert.strictEqual(new Set(titles).size, LANGS.length, 'baslik bes dilde de farkli olmali');
  console.log('OK Test 8: ana menudeki baglanti bagli ve bes dile cevrili');
}

// --- Test 9: GitHub Pages yapısı -----------------------------------
{
  const config = fs.readFileSync(path.join(DOCS, '_config.yml'), 'utf8');
  assert.ok(/^theme:\s*\S+/m.test(config), '_config.yml bir tema belirtmeli');
  assert.ok(fs.existsSync(path.join(DOCS, 'index.md')), 'docs/index.md var olmali');
  assert.ok(
    !fs.existsSync(path.join(DOCS, '.nojekyll')),
    '.nojekyll OLMAMALI: Markdown dosyalarinin render edilmesi Jekyll\'e bagli'
  );

  const index = fs.readFileSync(path.join(DOCS, 'index.md'), 'utf8');
  LANGS.forEach((lng) => {
    const url = lng === 'tr' ? '/AJANDA/privacy/' : '/AJANDA/privacy/' + lng + '/';
    assert.ok(index.includes('(' + url + ')'), 'docs/index.md ' + lng + ' surumune baglanmali');
  });
  console.log('OK Test 9: GitHub Pages yapisi kurulu ve giris sayfasi bes dile baglaniyor');
}

// --- Test 10: Kök PRIVACY.md isaretcisi dogru ----------------------
{
  const pointer = fs.readFileSync(path.join(ROOT, 'PRIVACY.md'), 'utf8');
  LANGS.forEach((lng) => {
    const suffix = lng === 'tr' ? 'privacy/' : 'privacy/' + lng + '/';
    assert.ok(
      pointer.includes('https://zeynepsoykan99.github.io/AJANDA/' + suffix),
      'kok PRIVACY.md ' + lng + ' yayin adresini listelemeli'
    );
    assert.ok(
      pointer.includes('docs/' + fileFor(lng)),
      'kok PRIVACY.md ' + lng + ' kaynak dosyasini listelemeli'
    );
  });
  // Politika metni kokte TEKRARLANMAMALI (sapma riski)
  assert.ok(
    !pointer.includes('inputtools.google.com'),
    'kok PRIVACY.md politika metnini tekrarlamamali, yalnizca isaretci olmali'
  );
  console.log('OK Test 10: kok PRIVACY.md yalnizca isaretci, metni tekrarlamiyor');
}

// --- Test 11: Uygulama içi bildirimlerle çelişmiyor -----------------
{
  const tr = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', 'tr.json'), 'utf8'));

  // Bildirim Google diyor -> politika da Google demeli (el yazisi)
  assert.ok(
    tr.privacy.handwritingP1.includes('Google') && docs.tr.includes('Google'),
    'el yazisi: bildirim ve politika ayni servisi adlandirmali'
  );
  // Bildirim Apple diyor -> politika da Apple demeli (ses, iOS)
  assert.ok(
    tr.privacy.voiceIosBody.includes('Apple') && docs.tr.includes('Apple'),
    'ses: bildirim ve politika ayni servisi adlandirmali'
  );
  // Kilit: ikisi de "sifrelemez" demeli
  assert.ok(
    tr.security.lockedDesc.includes('şifrelemez') && docs.tr.includes('şifrelemez'),
    'kilit: bildirim ve politika ikisi de icerigin sifrelenmedigini soylemeli'
  );
  // Politika "tum veriler cihazda" diye KOSULSUZ bir iddia icermemeli
  assert.ok(
    /iki istisnas/i.test(docs.tr),
    'politika cihaz disina cikan istisnalari ozet bolumunde belirtmeli'
  );
  console.log('OK Test 11: politika uygulama ici bildirimlerle celismiyor');
}

console.log('--- TUM GIZLILIK POLITIKASI TESTLERI BASARIYLA GECTI! ---');
