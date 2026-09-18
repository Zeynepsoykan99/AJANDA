/**
 * responsiveContainment.test.js
 * 
 * Defter sayfalarının her cihazda (telefon, tablet dikey/yatay, web)
 * contain mantığıyla sıfır taşma ve kırpılma ile sığdırılmasını doğrular.
 */
const assert = require('assert');

// Test ortamı için computeContainedPageDimensions fonksiyonunu izole içe aktaralım veya tanımlayalım
const PAGE_ASPECT_RATIO = 0.707;
const TWO_PAGE_ASPECT_RATIO = 1.414;

function computeContainedPageDimensions(
  availW,
  availH,
  customRatio = null,
  isTwoPageMode = false
) {
  if (!availW || !availH || availW <= 0 || availH <= 0) {
    return { pageWidth: availW || 0, pageHeight: availH || 0, scale: 1, targetRatio: PAGE_ASPECT_RATIO };
  }

  const targetRatio =
    typeof customRatio === 'number' && customRatio > 0
      ? customRatio
      : isTwoPageMode
      ? TWO_PAGE_ASPECT_RATIO
      : PAGE_ASPECT_RATIO;

  let w = availW;
  let h = w / targetRatio;

  if (h > availH) {
    h = availH;
    w = h * targetRatio;
  }

  return {
    pageWidth: Math.floor(w),
    pageHeight: Math.floor(h),
    targetRatio,
    scale: availW > 0 ? w / availW : 1,
  };
}

console.log('--- Responsive Containment Testleri Başlıyor ---');

// 1. iPhone 15 Pro Portrait (393 x 700 net alan)
{
  const res = computeContainedPageDimensions(393, 700);
  assert.ok(res.pageWidth <= 393, 'Genişlik taşmamalı');
  assert.ok(res.pageHeight <= 700, 'Yükseklik taşmamalı');
  assert.strictEqual(res.pageWidth, 393);
  assert.strictEqual(res.pageHeight, Math.floor(393 / 0.707)); // 555
  console.log('✔ iPhone 15 Pro Portrait testi geçti:', res);
}

// 2. iPhone Landscape (852 x 320 net alan)
{
  const res = computeContainedPageDimensions(852, 320);
  assert.ok(res.pageWidth <= 852, 'Genişlik taşmamalı');
  assert.ok(res.pageHeight <= 320, 'Yükseklik taşmamalı');
  assert.strictEqual(res.pageHeight, 320);
  assert.strictEqual(res.pageWidth, Math.floor(320 * 0.707)); // 226
  console.log('✔ iPhone Landscape testi geçti:', res);
}

// 3. iPad Pro 11" Portrait (817 x 1100 net alan, Tek Sayfa)
{
  const res = computeContainedPageDimensions(817, 1100, null, false);
  assert.ok(res.pageWidth <= 817, 'Genişlik taşmamalı');
  assert.ok(res.pageHeight <= 1100, 'Yükseklik taşmamalı');
  console.log('✔ iPad Pro 11" Portrait testi geçti:', res);
}

// 4. iPad Pro 11" Landscape (1170 x 750 net alan, Çift Sayfa)
{
  const res = computeContainedPageDimensions(1170, 750, null, true);
  assert.ok(res.pageWidth <= 1170, 'Genişlik taşmamalı');
  assert.ok(res.pageHeight <= 750, 'Yükseklik taşmamalı');
  assert.strictEqual(res.targetRatio, 1.414);
  console.log('✔ iPad Pro 11" Landscape Çift Sayfa testi geçti:', res);
}

// 5. 1080p Desktop Web (1400 x 900 net alan, Çift Sayfa)
{
  const res = computeContainedPageDimensions(1400, 900, null, true);
  assert.ok(res.pageWidth <= 1400, 'Genişlik taşmamalı');
  assert.ok(res.pageHeight <= 900, 'Yükseklik taşmamalı');
  console.log('✔ 1080p Web testi geçti:', res);
}

// 6. 4K Desktop Web (1400 x 2000 net alan)
{
  const res = computeContainedPageDimensions(1400, 2000, null, true);
  assert.ok(res.pageWidth <= 1400, 'Genişlik taşmamalı');
  assert.ok(res.pageHeight <= 2000, 'Yükseklik taşmamalı');
  console.log('✔ 4K Web testi geçti:', res);
}

// 7. Özel Şablon Oranı (aspectRatio: 0.72)
{
  const res = computeContainedPageDimensions(500, 800, 0.72);
  assert.ok(res.pageWidth <= 500);
  assert.ok(res.pageHeight <= 800);
  assert.strictEqual(res.targetRatio, 0.72);
  console.log('✔ Özel Şablon Oranı (0.72) testi geçti:', res);
}

// 8. Sınır Durumları (Boş veya Sıfır Değerler)
{
  const resZero = computeContainedPageDimensions(0, 0);
  assert.strictEqual(resZero.pageWidth, 0);
  assert.strictEqual(resZero.pageHeight, 0);

  const resNull = computeContainedPageDimensions(null, null);
  assert.strictEqual(resNull.pageWidth, 0);
  assert.strictEqual(resNull.pageHeight, 0);
  console.log('✔ Sınır durumları testi geçti.');
}

console.log('Tüm Responsive Containment testleri BAŞARIYLA geçti! 🎉');
