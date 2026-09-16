/**
 * AJANDA - Kağıt Şablonu Çizgi ve Yazı Hizalama Metrikleri (Paper Ruling Metrics)
 *
 * PaperSheet (çizgileri çizen) ve NotebookInlineText (metin girişini yöneten)
 * bileşenlerinin TEK ORTAK KAYNAĞIDIR (Single Source of Truth).
 *
 * Matematiksel Model:
 * k-ıncı çizginin Y konumu: Y_line(k) = rulingTop + k * linePitch
 * k-ıncı satırın taban çizgisi: Y_baseline(k) = paddingTop + k * lineHeight + baselineOffset
 * lineHeight = linePitch olduğunda ve paddingTop = rulingTop - baselineOffset seçildiğinde:
 * Y_baseline(k) = Y_line(k) -> Tüm satırlar istisnasız tam çizginin üzerine oturur.
 */

export const PAPER_RULING_CONFIG = {
  // Çizgili Kağıt (Lined Paper)
  lined: {
    rulingTop: 36,
    linePitch: 32, // Rahat ve okunaklı 32px satır yüksekliği
    fontSize: 16,
    lineHeight: 32,
    baselineOffset: 24, // 16px fontun 32px satır kutusundaki taban mesafesi
    paddingTop: 12, // 36 - 24 = 12px (ilk satır 36px çizgisine oturur)
    marginLineLeft: 40, // Sol pembe marj çizgisi konumu
    paddingLeftWithMargin: 52, // Marj çizgisinin 12px sağı
    paddingLeftNoMargin: 18,
    paddingRight: 16,
  },

  // Kareli Kağıt (Grid Paper)
  grid: {
    rulingTop: 24,
    linePitch: 24, // 24px kare ızgara
    fontSize: 14,
    lineHeight: 24,
    baselineOffset: 18, // 14px fontun 24px satırdaki taban mesafesi
    paddingTop: 6, // 24 - 18 = 6px (ilk satır 24px ızgara çizgisine oturur)
    marginLineLeft: null,
    paddingLeftWithMargin: 24,
    paddingLeftNoMargin: 24, // İlk dikey ızgara çizgisine hizalı
    paddingRight: 16,
  },

  // Noktalı Kağıt (Dotted Bullet Journal)
  dotted: {
    rulingTop: 36,
    linePitch: 28,
    fontSize: 15,
    lineHeight: 28,
    baselineOffset: 21,
    paddingTop: 15, // 36 - 21 = 15px (noktalarla aynı hizada)
    marginLineLeft: null,
    paddingLeftWithMargin: 20,
    paddingLeftNoMargin: 20,
    paddingRight: 16,
  },

  // Düz / Çizgisiz Kağıt (Blank Paper)
  blank: {
    rulingTop: 36,
    linePitch: 28,
    fontSize: 16,
    lineHeight: 28,
    baselineOffset: 21,
    paddingTop: 24,
    marginLineLeft: null,
    paddingLeftWithMargin: 20,
    paddingLeftNoMargin: 20,
    paddingRight: 16,
  },
};

/**
 * Şablon türüne (ruling) göre metrikleri döndürür.
 * Bilinmeyen şablonlar için 'lined' kullanılır.
 *
 * @param {string} ruling - 'lined' | 'grid' | 'dotted' | 'blank'
 * @param {boolean} showMargin - Sol dikey marj çizgisi var mı
 * @param {number} [customFontSize] - Kullanıcının araç çubuğundan seçtiği isteğe bağlı font boyutu
 */
export function getRulingMetrics(ruling = 'lined', showMargin = false, customFontSize = null) {
  const baseConfig = PAPER_RULING_CONFIG[ruling] || PAPER_RULING_CONFIG.lined;

  const fontSize = customFontSize || baseConfig.fontSize;
  const lineHeight = baseConfig.lineHeight;

  // Font boyutu değiştiğinde taban çizgisini dinamik olarak yeniden hesapla
  // Standart tipografide font tabanı ortalama: (lineHeight - fontSize) / 2 + fontSize * 0.8
  const baselineOffset = Math.round((lineHeight - fontSize) / 2 + fontSize * 0.8);
  const paddingTop = Math.max(0, baseConfig.rulingTop - baselineOffset);

  const paddingLeft = showMargin && baseConfig.marginLineLeft !== null
    ? baseConfig.paddingLeftWithMargin
    : baseConfig.paddingLeftNoMargin;

  return {
    ...baseConfig,
    fontSize,
    lineHeight,
    paddingTop,
    paddingLeft,
    paddingRight: baseConfig.paddingRight,
  };
}
