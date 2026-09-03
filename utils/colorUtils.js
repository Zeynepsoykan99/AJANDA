/**
 * AJANDA - Renk Dönüşüm ve Dinamik Harmoni Yardımcıları
 * Saf JavaScript ile HEX, RGB ve HSL renk uzayları arasında dönüşüm yapar.
 * Seçilen arka plan rengine göre insan gözünün estetik bulduğu uyumlu (harmonic)
 * kontrastlı ikon, metin ve kenarlık paletini otomatik üretir.
 */

/**
 * HEX kodunu 8-bit R, G, B nesnesine dönüştürür.
 */
export function hexToRgb(hexColor) {
  let hex = (hexColor || '#FFFFFF').replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length !== 6) {
    return { r: 255, g: 255, b: 255 };
  }
  const num = parseInt(hex, 16);
  if (isNaN(num)) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * R, G, B değerlerini HSL (Hue, Saturation, Lightness) uzayına çevirir.
 * @returns {{ h: number, s: number, l: number }} h: [0-360], s: [0-100], l: [0-100]
 */
export function rgbToHsl(r, g, b) {
  const normR = r / 255;
  const normG = g / 255;
  const normB = b / 255;

  const max = Math.max(normR, normG, normB);
  const min = Math.min(normR, normG, normB);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case normR:
        h = (normG - normB) / d + (normG < normB ? 6 : 0);
        break;
      case normG:
        h = (normB - normR) / d + 2;
        break;
      case normB:
        h = (normR - normG) / d + 4;
        break;
    }
    h *= 60;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * HSL değerlerini HEX koduna dönüştürür.
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} HEX formatında renk kodu (Örn: #D81B60)
 */
export function hslToHex(h, s, l) {
  const normH = ((h % 360) + 360) % 360;
  const normS = Math.max(0, Math.min(100, s)) / 100;
  const normL = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * normL - 1)) * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normL - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= normH && normH < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= normH && normH < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= normH && normH < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= normH && normH < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= normH && normH < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= normH && normH < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (val) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * W3C standardına göre algılanan parlaklığı (Luminance) hesaplar.
 */
export function getLuminance(r, g, b) {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Seçilen arka plan rengine göre tam uyumlu, kontrastlı ve estetik
 * bir tema paleti üretir.
 *
 * @param {string} hexColor - Seçilen arka plan HEX kodu
 * @returns {object} Tam renk paleti
 */
export function generateHarmonicPalette(hexColor) {
  const rgb = hexToRgb(hexColor);
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  const isLight = luminance > 135;

  let textPrimary, textSecondary, textDeep, accent, border, card, backgroundLight, shadow;

  // 1. Durum: Nötr / Grayscale (Doygunluk çok düşükse renk sapması olmasın)
  if (s < 12) {
    if (isLight) {
      textPrimary = '#1E293B';
      textSecondary = '#475569';
      textDeep = '#0F172A';
      accent = '#334155';
      border = '#CBD5E1';
      card = '#FFFFFF';
      backgroundLight = '#F8FAFC';
      shadow = 'rgba(0, 0, 0, 0.08)';
    } else {
      textPrimary = '#F8FAFC';
      textSecondary = '#CBD5E1';
      textDeep = '#FFFFFF';
      accent = '#94A3B8';
      border = '#475569';
      card = '#1E293B';
      backgroundLight = '#0F172A';
      shadow = 'rgba(0, 0, 0, 0.4)';
    }
  }
  // 2. Durum: Açık / Pastel Renkler (Pembe, Mavi, Sarı, Yeşil, Şeftali vb.)
  else if (isLight) {
    // İkonlar için canlı, koyu ve zengin aynı tonda renk
    accent = hslToHex(h, Math.min(100, Math.max(70, s + 25)), Math.max(28, Math.min(46, l - 38)));

    // Ana başlıklar (AJANDA) için çok tok, okunabilir derin ton
    textPrimary = hslToHex(h, Math.min(100, Math.max(60, s + 15)), Math.max(16, Math.min(32, l - 50)));

    // Alt metinler için ara ton
    textSecondary = hslToHex(h, Math.min(95, Math.max(50, s + 10)), Math.max(22, Math.min(38, l - 42)));

    // En koyu vurgular
    textDeep = hslToHex(h, Math.min(100, Math.max(65, s + 20)), Math.max(10, Math.min(22, l - 60)));

    // Çerçeve: Arka plandan biraz daha koyu, tatlı bir ton
    border = hslToHex(h, Math.max(30, s), Math.max(65, l - 12));

    card = '#FFFFFF';
    backgroundLight = hslToHex(h, Math.max(15, s - 10), Math.min(98, l + 4));
    shadow = accent;
  }
  // 3. Durum: Koyu / Doygun Renkler (Lacivert, Bordo, Koyu Mor, Zümrüt vb.)
  else {
    // Koyu arka planda ikonlar parlasın (parlak neon/pastel tonu)
    accent = hslToHex(h, Math.min(100, Math.max(75, s + 20)), Math.min(78, l + 38));

    // Koyu zeminde başlık ve ana metinler bembeyaz ve pürüzsüz
    textPrimary = '#FFFFFF';

    // Alt yazılar açık pastel tonunda
    textSecondary = hslToHex(h, Math.max(25, s - 10), Math.min(88, l + 48));

    textDeep = '#FFFFFF';

    // Çerçeveler hafif aydınlatılmış çizgi
    border = hslToHex(h, s, Math.min(50, l + 16));

    // Kartlar koyu zemin üzerinde ayrışan hafif aydınlık ton
    card = hslToHex(h, s, Math.min(30, l + 8));

    backgroundLight = hslToHex(h, s, Math.max(8, l - 5));
    shadow = 'rgba(0, 0, 0, 0.4)';
  }

  return {
    background: hexColor,
    backgroundLight,
    card,
    border,
    shadow,
    textPrimary,
    textSecondary,
    textDeep,
    accent,
    white: '#FFFFFF',
  };
}
