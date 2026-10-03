/**
 * homeHeaderLayout.test.js
 *
 * Ana menüdeki başlık ("AJANDA") ile sağ üstteki ikon grubunun (dil / tema /
 * gizlilik) ÇAKIŞMAMASI.
 *
 * Hata: ikon grubu `position: 'absolute'` ile sağ üste sabitlenmişti. Başlık
 * ortalandığı için dar ekranlarda iki alan kaçınılmaz olarak üst üste biniyordu;
 * üçüncü buton eklenince sorun daha da büyüdü.
 *
 * Yöntem: ölçüler KAYNAKTAN okunur (stil nesnesi ve JSX'teki buton sayısı),
 * sonra geometrik olarak çakışma hesaplanır. Önce eski mutlak yerleşimin
 * gerçekten çakıştığı kanıtlanır, sonra yeni yerleşimin çakışmadığı gösterilir.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const HOME = path.join(__dirname, '..', 'app', 'index.js');
const source = fs.readFileSync(HOME, 'utf8');

/** Kaynaktaki bir StyleSheet girdisinden sayısal bir alanı okur */
const styleNumber = (styleName, field) => {
  const block = new RegExp('  ' + styleName + ': \\{[\\s\\S]*?\\n  \\},').exec(source);
  assert.ok(block, styleName + ' stili kaynakta bulunmali');
  const m = new RegExp(field + ':\\s*(-?\\d+(?:\\.\\d+)?)').exec(block[0]);
  assert.ok(m, styleName + '.' + field + ' okunabilmeli');
  return Number(m[1]);
};

/** Kaynaktaki bir StyleSheet girdisinde bir alanın geçip geçmediği */
const styleHas = (styleName, field) => {
  const block = new RegExp('  ' + styleName + ': \\{[\\s\\S]*?\\n  \\},').exec(source);
  assert.ok(block, styleName + ' stili kaynakta bulunmali');
  return new RegExp('\\n\\s*' + field + ':').test(block[0]);
};

// ─── Kaynaktan okunan gerçek ölçüler ────────────────────────────────
const BUTTON_SIZE = styleNumber('headerIconButton', 'width');
const BUTTON_GAP = styleNumber('headerRightButtons', 'gap');
const TITLE_FONT = styleNumber('appTitle', 'fontSize');
const TITLE_SPACING = styleNumber('appTitle', 'letterSpacing');
const SCREEN_PADDING = styleNumber('scrollContent', 'paddingHorizontal');

/** JSX'teki ikon butonu sayısı */
const BUTTON_COUNT = (source.match(/style=\{\[styles\.headerIconButton,/g) || []).length;

/**
 * "AJANDA" başlığının yaklaşık genişliği.
 * Kalın, büyük harf bir yazı tipinde karakter genişliği ~0.65em kabul edilir;
 * letterSpacing her karakterden sonra eklenir. Yaklaşıktır, ama ölçüler
 * kaynaktan geldiği için stil değişince test de birlikte değişir.
 */
const TITLE_CHARS = 'AJANDA'.length;
const titleWidth = TITLE_CHARS * TITLE_FONT * 0.65 + TITLE_CHARS * TITLE_SPACING;

/** Buton grubunun toplam genişliği */
const buttonsWidth = BUTTON_COUNT * BUTTON_SIZE + (BUTTON_COUNT - 1) * BUTTON_GAP;

/** Test edilecek ekran genişlikleri */
const SCREENS = [
  ['kucuk telefon (iPhone SE)', 320],
  ['telefon (Android ortalama)', 360],
  ['telefon (iPhone 15 Pro)', 393],
  ['buyuk telefon', 430],
  ['tablet dikey (iPad mini)', 744],
  ['tablet yatay (iPad Pro)', 1024],
];

const contentWidth = (screen) => screen - SCREEN_PADDING * 2;

console.log('--- Ana Menu Baslik Yerlesimi Testleri ---');
console.log(
  '    olculer: buton ' + BUTTON_SIZE + 'px x' + BUTTON_COUNT + ', bosluk ' + BUTTON_GAP +
    ', baslik ~' + Math.round(titleWidth) + 'px, kenar bosluğu ' + SCREEN_PADDING
);

// --- Test 1: ESKI mutlak yerlesim gercekten cakisiyordu --------------
{
  // Eski hal: baslik ortalanmis, butonlar absolute sag:0
  const overlapsOnOldLayout = (screen) => {
    const w = contentWidth(screen);
    const titleRight = w / 2 + titleWidth / 2;
    const buttonsLeft = w - buttonsWidth;
    return titleRight > buttonsLeft;
  };

  const broken = SCREENS.filter(([, w]) => overlapsOnOldLayout(w));
  assert.ok(
    broken.length > 0,
    'ESKI mutlak yerlesim en az bir ekranda cakismaliydi (hatanin kaniti)'
  );
  assert.ok(
    overlapsOnOldLayout(360),
    'ESKI yerlesim 360px telefonda cakismaliydi'
  );
  console.log(
    'OK Test 1: eski mutlak yerlesim ' + broken.length + '/' + SCREENS.length +
      ' ekranda cakisiyordu -> ' + broken.map(([n]) => n).join(', ')
  );
}

// --- Test 2: Butonlar artik MUTLAK konumlandirilmiyor ----------------
{
  assert.ok(
    !styleHas('headerRightButtons', 'position'),
    "buton grubu 'position' kullanmamali (akisin icinde olmali)"
  );
  assert.ok(
    !styleHas('headerRightButtons', 'right') && !styleHas('headerRightButtons', 'top'),
    "buton grubunda 'right'/'top' kalmamali"
  );
  assert.ok(
    !styleHas('headerContainer', 'position'),
    "headerContainer'daki 'position: relative' artik gereksiz, kaldirilmali"
  );
  assert.ok(
    styleHas('headerRightButtons', 'alignSelf'),
    'buton grubu kendi satirinda saga hizalanmali'
  );
  console.log('OK Test 2: buton grubu akisin icinde, mutlak konumlandirma kaldirildi');
}

// --- Test 3: Butonlar JSX'te basliktan ONCE geliyor -------------------
{
  const buttonsIndex = source.indexOf('<View style={styles.headerRightButtons}>');
  const titleIndex = source.indexOf('<Text style={[styles.appTitle,');
  assert.ok(buttonsIndex > -1 && titleIndex > -1, 'iki blok da bulunmali');
  assert.ok(
    buttonsIndex < titleIndex,
    'butonlar basligin USTUNDE olmali (JSX sirasi), yoksa dikey yigin bozulur'
  );
  console.log('OK Test 3: butonlar dikey yiginla basligin ustunde duruyor');
}

// --- Test 4: YENI yerlesim hicbir ekranda cakismiyor ------------------
{
  // Yeni hal: butonlar kendi satirinda, baslik altinda. Cakisma geometrik
  // olarak IMKANSIZ; tek kosul her iki ogenin de satira sigmasi.
  SCREENS.forEach(([label, screen]) => {
    const w = contentWidth(screen);
    assert.ok(
      buttonsWidth <= w,
      label + ' (' + screen + 'px): buton grubu satira sigmali (' +
        Math.round(buttonsWidth) + ' > ' + w + ')'
    );
    assert.ok(
      titleWidth <= w,
      label + ' (' + screen + 'px): baslik satira sigmali (' +
        Math.round(titleWidth) + ' > ' + w + ')'
    );
  });
  console.log('OK Test 4: yeni yerlesim ' + SCREENS.length + ' ekran genisliginde de cakismiyor');
}

// --- Test 5: Dorduncu bir buton eklense bile dayaniyor ---------------
{
  // Ileride bir buton daha eklenirse en dar ekranda hala sigmali; sigmazsa
  // bu test uyarir ve yerlesimin gozden gecirilmesi gerektigini soyler.
  const withOneMore = (BUTTON_COUNT + 1) * BUTTON_SIZE + BUTTON_COUNT * BUTTON_GAP;
  const narrowest = contentWidth(320);
  assert.ok(
    withOneMore <= narrowest,
    '320px ekranda ' + (BUTTON_COUNT + 1) + ' butonluk bir satir artik sigmiyor (' +
      Math.round(withOneMore) + ' > ' + narrowest + '). Buton eklemeden once yerlesimi gozden gecir.'
  );
  console.log(
    'OK Test 5: en dar ekranda ' + (BUTTON_COUNT + 1) + '. bir buton icin de yer var'
  );
}

// --- Test 6: Baslik ile butonlar arasinda nefes payi var -------------
{
  const gapBelow = styleNumber('headerRightButtons', 'marginBottom');
  assert.ok(
    gapBelow >= 8,
    'buton satiri ile baslik arasinda en az 8px bosluk olmali (su an ' + gapBelow + ')'
  );
  console.log('OK Test 6: buton satiri ile baslik arasinda ' + gapBelow + 'px bosluk var');
}

console.log('--- TUM BASLIK YERLESIMI TESTLERI BASARIYLA GECTI! ---');
