/**
 * AJANDA - Kement (Lasso) Geometri ve Çokgen Hesaplama Yardımcıları
 * Stylus ve parmak hareketleriyle çizilen serbest kapalı kement alanının
 * çizim çizgileriyle (strokes) kesişimini ve kapsamasını hesaplar.
 */

/**
 * SVG path string'inden nokta koordinatlarını çıkarır.
 * Desteklenen komutlar: M (move to), L (line to), Q (quadratic bezier - kontrol noktası atlanır)
 * Eski veriden yüklenen ve `points` array'i olmayan çizgiler için fallback.
 *
 * @param {string} d - SVG path string (örn: "M 10 20 L 30 40 Q 50 60, 70 80")
 * @returns {Array<{ x: number, y: number }>}
 */
function parseSvgPathToPoints(d) {
  if (!d || typeof d !== 'string') return [];
  const points = [];
  // M ve L komutlarını bul: M x y veya L x y
  const mlRegex = /[ML]\s*([\d.\-]+)[,\s]+([\d.\-]+)/gi;
  let match;
  while ((match = mlRegex.exec(d)) !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    }
  }
  // Q (quadratic bezier) biter noktalarını da ekle: Q cx cy, ex ey
  const qRegex = /Q\s*[\d.\-]+[,\s]+[\d.\-]+[,\s]+([\d.\-]+)[,\s]+([\d.\-]+)/gi;
  while ((match = qRegex.exec(d)) !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    }
  }
  return points;
}

/**
 * Bir stroke nesnesinden kullanılabilir nokta dizisini döndürür.
 * Önce stroke.points'i dener, yoksa stroke.d SVG path'ini parse eder.
 *
 * @param {object} stroke - Çizgi nesnesi
 * @returns {Array<{ x: number, y: number }>}
 */
function getStrokePoints(stroke) {
  if (Array.isArray(stroke?.points) && stroke.points.length > 0) {
    return stroke.points;
  }
  if (stroke?.d) {
    return parseSvgPathToPoints(stroke.d);
  }
  return [];
}

/**
 * Bir noktanın kapalı bir çokgenin (polygon) içinde olup olmadığını belirler.
 * Ray-Casting (Işın Gönderme) Algoritması kullanır.
 *
 * @param {{ x: number, y: number }} point - Test edilecek nokta
 * @param {Array<{ x: number, y: number }>} polygon - Çokgen köşe noktaları dizisi
 * @returns {boolean}
 */
export function isPointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;

  const { x, y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * İki doğru parçasının kesişip kesişmediğini kontrol eder.
 */
function ccw(p1, p2, p3) {
  return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
}

export function doLineSegmentsIntersect(p1, p2, p3, p4) {
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Bir çizginin (stroke) kement çokgeninin içinde olup olmadığını
 * veya kement sınırlarıyla kesişip kesişmediğini belirler.
 *
 * @param {object} stroke - Çizgi nesnesi ({ points: [{ x, y }] })
 * @param {Array<{ x: number, y: number }>} polygon - Kement çokgeni
 * @returns {boolean}
 */
export function isStrokeInsidePolygon(stroke, polygon) {
  if (!polygon || polygon.length < 3) return false;

  // points yoksa SVG path'ten fallback parse yap (eski verilerle uyumluluk)
  const points = getStrokePoints(stroke);
  if (points.length === 0) return false;

  // 1. Adım: Çizginin noktalarından herhangi biri çokgenin içinde mi? (Hızlı Kontrol)
  // Büyük çizgilerde performansı korumak için her 2. veya 3. noktayı kontrol edebiliriz
  const step = points.length > 20 ? 2 : 1;
  let insidePointsCount = 0;

  for (let i = 0; i < points.length; i += step) {
    if (isPointInPolygon(points[i], polygon)) {
      insidePointsCount++;
      // Noktaların en az %20'si veya 2 tanesi içerideyse doğrudan seçilmiş kabul et
      if (insidePointsCount >= 2 || points.length <= 3) {
        return true;
      }
    }
  }

  if (insidePointsCount > 0) return true;

  // 2. Adım: Çizgi parçalarından biri kement poligonunun kenarlarından birini kesiyor mu?
  for (let i = 0; i < points.length - 1; i += Math.max(1, Math.floor(points.length / 10))) {
    const s1 = points[i];
    const s2 = points[i + 1] || points[points.length - 1];

    for (let j = 0; j < polygon.length; j++) {
      const p1 = polygon[j];
      const p2 = polygon[(j + 1) % polygon.length];

      if (doLineSegmentsIntersect(s1, s2, p1, p2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Seçili çizgilerin birleşik sınırlayıcı kutusunu (Bounding Box) hesaplar.
 *
 * @param {Array<object>} strokes - Çizgi dizisi
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number, width: number, height: number, centerX: number, centerY: number }}
 */
export function getMultiStrokeBounds(strokes) {
  if (!Array.isArray(strokes) || strokes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasValidPoint = false;

  for (const stroke of strokes) {
    // points yoksa SVG path'ten fallback parse yap (eski verilerle uyumluluk)
    const pts = getStrokePoints(stroke);
    if (pts.length === 0) continue;
    for (const p of pts) {
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        hasValidPoint = true;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }
  }

  if (!hasValidPoint) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  const width = Math.max(1, Math.round(maxX - minX));
  const height = Math.max(1, Math.round(maxY - minY));

  return {
    minX: Math.round(minX),
    minY: Math.round(minY),
    maxX: Math.round(maxX),
    maxY: Math.round(maxY),
    width,
    height,
    centerX: Math.round(minX + width / 2),
    centerY: Math.round(minY + height / 2),
  };
}

/**
 * Seçilen el yazısı çizgilerini renk ve mekansal yakınlığa göre bağımsız kümelere ayırır.
 *
 * Temel Kurallar:
 * 1. Renk Ayrımı (Color Inheritance): Farklı renkteki (stroke.color) çizgiler ASLA aynı kümede birleştirilmez.
 * 2. Mekansal Yakınlık (Spatial Proximity): Aynı renkteki çizgiler harf/kelime/satır mesafesi eşiğine göre taranır.
 *    Birbirine yakın olanlar tek kümede toplanırken, sayfanın uzak noktalarındaki aynı renkli yazılar ayrı kümelere ayrılır.
 * 3. Okuma Sırası (Reading Order): Kümeler yukarıdan aşağıya (Y) ve soldan sağa (X) sıralanır.
 *
 * @param {Array<object>} strokes - Çizgi nesneleri dizisi
 * @returns {Array<{
 *   id: string,
 *   color: string,
 *   strokes: Array<object>,
 *   strokeIds: Array<string>,
 *   bounds: { minX: number, minY: number, maxX: number, maxY: number, width: number, height: number, centerX: number, centerY: number }
 * }>}
 */
export function clusterStrokesByColorAndProximity(strokes) {
  if (!Array.isArray(strokes) || strokes.length === 0) {
    return [];
  }

  // 1. Çizgileri renge göre ayır (Farklı renkteki çizgiler asla birleştirilemez)
  const colorMap = new Map();

  for (let i = 0; i < strokes.length; i++) {
    const stroke = strokes[i];
    if (!stroke) continue;
    const rawColor = stroke.color || '#000000';
    const normColor = typeof rawColor === 'string' ? rawColor.trim().toLowerCase() : '#000000';

    if (!colorMap.has(normColor)) {
      colorMap.set(normColor, []);
    }

    const singleBounds = getMultiStrokeBounds([stroke]);
    colorMap.get(normColor).push({
      stroke,
      bounds: singleBounds,
      originalColor: rawColor,
      index: i,
    });
  }

  const allClusters = [];

  // 2. Her renk grubu içinde mekansal yakınlık analizi yap (Connected Components)
  for (const [normColor, items] of colorMap.entries()) {
    if (items.length === 0) continue;

    if (items.length === 1) {
      const single = items[0];
      allClusters.push({
        id: `cluster_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        color: single.originalColor || normColor,
        strokes: [single.stroke],
        strokeIds: [single.stroke.id || `stroke_${single.index}`],
        bounds: single.bounds,
      });
      continue;
    }

    // İki çizginin birbirine yakın olup olmadığını belirleyen fonksiyon
    const shouldConnect = (a, b) => {
      const gapX = Math.max(
        0,
        Math.max(a.bounds.minX, b.bounds.minX) - Math.min(a.bounds.maxX, b.bounds.maxX)
      );
      const gapY = Math.max(
        0,
        Math.max(a.bounds.minY, b.bounds.minY) - Math.min(a.bounds.maxY, b.bounds.maxY)
      );

      const refHeight = Math.max(
        18,
        Math.min(90, (a.bounds.height + b.bounds.height) / 2)
      );

      const thresholdX = Math.min(75, Math.max(45, refHeight * 1.6));
      const thresholdY = Math.min(55, Math.max(35, refHeight * 1.3));

      return gapX <= thresholdX && gapY <= thresholdY;
    };

    const visited = new Array(items.length).fill(false);

    for (let i = 0; i < items.length; i++) {
      if (visited[i]) continue;
      visited[i] = true;

      const clusterStrokes = [items[i].stroke];
      const queue = [i];

      while (queue.length > 0) {
        const curr = queue.shift();
        for (let j = 0; j < items.length; j++) {
          if (!visited[j] && shouldConnect(items[curr], items[j])) {
            visited[j] = true;
            clusterStrokes.push(items[j].stroke);
            queue.push(j);
          }
        }
      }

      const clusterBounds = getMultiStrokeBounds(clusterStrokes);
      allClusters.push({
        id: `cluster_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        color: items[i].originalColor || normColor,
        strokes: clusterStrokes,
        strokeIds: clusterStrokes.map((s, sIdx) => s.id || `stroke_${sIdx}`),
        bounds: clusterBounds,
      });
    }
  }

  // 3. Kümeleri doğal okuma sırasına göre diz (Yukarıdan aşağıya, aynı satırda soldan sağa)
  allClusters.sort((a, b) => {
    const diffY = a.bounds.minY - b.bounds.minY;
    if (Math.abs(diffY) <= 30) {
      return a.bounds.minX - b.bounds.minX;
    }
    return diffY;
  });

  return allClusters;
}

/**
 * Orijinal el yazısı çizimlerinin fiziksel sınırlarına (X genişliği ve Y yüksekliği)
 * ve tanınan metnin karakter/satır yapısına göre akıllı dijital başlangıç puntosunu belirler.
 *
 * @param {{ width: number, height: number }} bounds - El yazısı sınırlayıcı kutusu
 * @param {string} text - Dönüştürülecek metin
 * @returns {number} - Önerilen font puntosu (px)
 */
export function calculateAutoFontSize(bounds, text = '') {
  if (!bounds) return 18;

  const boundHeight =
    bounds.height != null
      ? bounds.height
      : (bounds.maxY != null && bounds.minY != null ? bounds.maxY - bounds.minY : 0);

  const boundWidth =
    bounds.width != null
      ? bounds.width
      : (bounds.maxX != null && bounds.minX != null ? bounds.maxX - bounds.minX : 0);

  if (boundHeight <= 0) return 18;

  const cleanText = (text || '').trim();
  if (!cleanText) return 18;

  const lines = cleanText.split('\n');
  const lineCount = Math.max(1, lines.length);
  const longestLineLength = Math.max(
    1,
    ...lines.map((l) => l.trim().length)
  );

  // 1. Yükseklik bazlı hedef: x-height ve satır aralığı oranı (~%42-%46)
  const lineHeight = boundHeight / lineCount;
  const fontFromHeight = lineHeight * 0.44;

  // 2. Genişlik bazlı hedef: Karakter başına düşen ortalama genişlik
  let fontFromWidth = fontFromHeight;
  if (longestLineLength > 2 && boundWidth > 20) {
    const avgCharWidthRatio = 0.52;
    fontFromWidth = boundWidth / (longestLineLength * avgCharWidthRatio);
  }

  // 3. Orantısal Dengeleme:
  // Kısa kelimelerde (<= 3 karakter) doğrudan yükseklik esas alınır.
  // Uzun kelimelerde ve cümlelerde metnin el yazısı alanından taşmasını önleyen denge kurulur.
  let optimalFont;
  if (longestLineLength <= 3) {
    optimalFont = fontFromHeight;
  } else {
    optimalFont = Math.min(fontFromHeight, fontFromWidth * 1.15);
  }

  // Doğal el yazısı okunabilirlik aralığı (14px - 38px, çok büyük başlıklar için max 42px)
  const finalFontSize = Math.round(Math.min(38, Math.max(14, optimalFont)));

  return finalFontSize;
}

/**
 * Orijinal el yazısı boyutuna göre otomatik yazı boyutu (font size) kestirimi yapar.
 *
 * @param {{ width?: number, height?: number, minX?: number, maxX?: number, minY?: number, maxY?: number }} bounds - Çizgilerin sınırlayıcı kutusu
 * @param {string} text - Dönüştürülecek metin
 * @returns {{ fontSize: number, width: number, height: number }}
 */
export function fitTextToBounds(bounds, text = '') {
  const calculatedFontSize = calculateAutoFontSize(bounds, text);

  const boundWidth =
    bounds?.width != null
      ? bounds.width
      : (bounds?.maxX != null && bounds?.minX != null ? bounds.maxX - bounds.minX : 100);

  const boundHeight =
    bounds?.height != null
      ? bounds.height
      : (bounds?.maxY != null && bounds?.minY != null ? bounds.maxY - bounds.minY : 40);

  // Metin kutusu genişliği (orijinal el yazısı genişliğinden biraz pay bırakılır)
  const calculatedWidth = Math.max(120, Math.round(boundWidth + 16));
  const calculatedHeight = Math.max(40, Math.round(boundHeight));

  return {
    fontSize: calculatedFontSize,
    width: calculatedWidth,
    height: calculatedHeight,
  };
}

/**
 * Metin kutusunun (textBlock) ekrandaki sınırlayıcı kutusunu (Bounding Box) hesaplar.
 *
 * @param {object} block - Metin kutusu nesnesi ({ x, y, width, height, text, fontSize })
 * @returns {{ x: number, y: number, width: number, height: number, minX: number, minY: number, maxX: number, maxY: number }}
 */
export function getTextBlockBounds(block) {
  if (!block) return { x: 0, y: 0, width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };

  const x = typeof block.x === 'number' ? block.x : 0;
  const y = typeof block.y === 'number' ? block.y : 0;
  const width = Math.max(60, typeof block.width === 'number' ? block.width : 120);

  let height = 40;
  if (typeof block.height === 'number' && block.height > 0) {
    height = block.height;
  } else {
    // Dinamik yükseklik tahmini: satır sayısı + font boyutu + padding
    const fontSize = typeof block.fontSize === 'number' ? block.fontSize : 16;
    const text = block.text || '';
    const rawLines = text.split('\n');
    const avgCharWidth = fontSize * 0.55;
    const usableWidth = Math.max(40, width - 16);
    const charsPerLine = Math.max(1, Math.floor(usableWidth / avgCharWidth));

    let lineCount = 0;
    for (const line of rawLines) {
      lineCount += Math.max(1, Math.ceil(line.length / charsPerLine));
    }

    const lineHeight = fontSize * 1.35;
    const padding = 16; // 8 top + 8 bottom
    height = Math.max(40, Math.round(padding + lineCount * lineHeight));
  }

  return {
    x,
    y,
    width,
    height,
    minX: x,
    minY: y,
    maxX: x + width,
    maxY: y + height,
  };
}

/**
 * Silgi dairesi ile bir metin kutusunun sınırlayıcı kutusu arasında temas (çarpışma) olup olmadığını belirler.
 * Hem doğrudan tıklamaları (nokta kutunun içinde mi) hem de sürükleme hareketlerini (çember kutuya teğet mi/kesiyor mu)
 * O(1) sürede kontrol eder.
 *
 * @param {number} eraserX - Silginin merkez X koordinatı
 * @param {number} eraserY - Silginin merkez Y koordinatı
 * @param {number} radius - Silgi yarıçapı (varsayılan: 25px)
 * @param {object} block - Metin kutusu nesnesi
 * @returns {boolean}
 */
export function isEraserHittingTextBlock(eraserX, eraserY, radius = 25, block) {
  if (!block) return false;

  const bounds = getTextBlockBounds(block);
  const { minX, minY, maxX, maxY } = bounds;

  // 1. Tıklama Kontrolü: Silgi merkezi doğrudan kutunun içinde mi?
  if (eraserX >= minX && eraserX <= maxX && eraserY >= minY && eraserY <= maxY) {
    return true;
  }

  // 2. Sürükleme / Çember Kesişim Kontrolü:
  // Çember merkezine kutu üzerindeki en yakın noktayı bul
  const closestX = Math.max(minX, Math.min(eraserX, maxX));
  const closestY = Math.max(minY, Math.min(eraserY, maxY));

  const distX = eraserX - closestX;
  const distY = eraserY - closestY;

  return (distX * distX + distY * distY) <= (radius * radius);
}

/**
 * Bir karakterin yaklaşık genişlik oranını döndürür (fontSize katsayısı).
 */
function getCharWidthRatio(char) {
  if (!char) return 0.54;
  if (char === ' ' || char === '\t') return 0.32;
  // Çok dar karakterler
  if (/[ijlI!.,:;|\/'`\(\)\[\]\{\}]/.test(char)) return 0.28;
  // Dar karakterler
  if (/[frt1\-]/.test(char)) return 0.38;
  // Çok geniş karakterler
  if (/[mwMW%@#~]/.test(char)) return 0.85;
  // Geniş karakterler (büyük harfler)
  if (/[A-ZĞÜŞİÖÇ]/.test(char)) return 0.68;
  // Standart harfler ve rakamlar
  return 0.54;
}

/**
 * Metin kutusu içindeki her karakterin ekrandaki sınırlayıcı kutusunu (Bounding Box) hesaplar.
 * Satır kaydırma (word wrap) ve yeni satır (\n) kurallarını işletir.
 *
 * @param {object} block - Metin kutusu nesnesi
 * @returns {Array<{ index: number, char: string, minX: number, minY: number, maxX: number, maxY: number }>}
 */
export function calculateCharacterBoxes(block) {
  if (!block || !block.text) return [];

  const text = block.text;
  const fontSize = typeof block.fontSize === 'number' ? block.fontSize : 16;
  const lineHeight = Math.round(fontSize * 1.35);
  const paddingX = 8;
  const paddingY = 8;
  const startX = (typeof block.x === 'number' ? block.x : 0) + paddingX;
  const startY = (typeof block.y === 'number' ? block.y : 0) + paddingY;
  const blockWidth = Math.max(60, typeof block.width === 'number' ? block.width : 120);
  const usableWidth = Math.max(40, blockWidth - paddingX * 2);

  const boxes = [];
  let currentX = startX;
  let currentY = startY;

  // Metni kelimelere ve boşluklara ayırırken indeksleri koruyalım
  const tokens = [];
  const tokenRegex = /\S+|\s/g;
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    tokens.push({ text: match[0], startIndex: match.index });
  }

  for (const token of tokens) {
    const tokenStr = token.text;
    const isWhitespace = /^\s+$/.test(tokenStr);

    // Eğer kelime ise (boşluk değilse), satıra sığıp sığmadığını önceden ölç
    if (!isWhitespace) {
      let tokenWidth = 0;
      for (const ch of tokenStr) {
        tokenWidth += getCharWidthRatio(ch) * fontSize;
      }

      // Satıra sığmıyorsa ve satırın başında değilsek alt satıra geç
      if (currentX + tokenWidth > startX + usableWidth && currentX > startX) {
        currentX = startX;
        currentY += lineHeight;
      }
    }

    // Kelimenin içindeki her harfin kutusunu hesapla
    for (let i = 0; i < tokenStr.length; i++) {
      const ch = tokenStr[i];
      const charIndex = token.startIndex + i;

      if (ch === '\n') {
        currentX = startX;
        currentY += lineHeight;
        continue;
      }

      const charWidth = Math.max(3, Math.round(getCharWidthRatio(ch) * fontSize));

      // Tek bir kelime satır genişliğinden büyükse harf harf alt satıra kaydır
      if (currentX + charWidth > startX + usableWidth && currentX > startX && !isWhitespace) {
        currentX = startX;
        currentY += lineHeight;
      }

      boxes.push({
        index: charIndex,
        char: ch,
        minX: Math.round(currentX),
        minY: Math.round(currentY),
        maxX: Math.round(currentX + charWidth),
        maxY: Math.round(currentY + lineHeight),
      });

      currentX += charWidth;
    }
  }

  return boxes;
}

/**
 * Silgi dairesine temas eden karakterlerin indekslerini tespit eder.
 *
 * @param {number} eraserX - Silginin merkez X koordinatı
 * @param {number} eraserY - Silginin merkez Y koordinatı
 * @param {number} radius - Silgi yarıçapı
 * @param {Array<object>} charBoxes - Karakter sınır kutuları
 * @returns {Array<number>} - Silinen karakter indeksleri
 */
export function getErasedCharacterIndices(eraserX, eraserY, radius = 25, charBoxes = []) {
  if (!Array.isArray(charBoxes) || charBoxes.length === 0) return [];

  const erasedIndices = [];
  const rSquared = radius * radius;

  for (const box of charBoxes) {
    // Boşluk karakterlerini kontrol etmeye gerek yok
    if (box.char === ' ' || box.char === '\t' || box.char === '\n') continue;

    // Çember-dikdörtgen temas testi
    const closestX = Math.max(box.minX, Math.min(eraserX, box.maxX));
    const closestY = Math.max(box.minY, Math.min(eraserY, box.maxY));

    const distX = eraserX - closestX;
    const distY = eraserY - closestY;

    if ((distX * distX + distY * distY) <= rSquared) {
      erasedIndices.push(box.index);
    }
  }

  return erasedIndices;
}

/**
 * Belirtilen karakter indekslerini metin kutusundan siler (boşlukla yer değiştirerek doğal kağıt hissi sağlar).
 *
 * @param {object} block - Metin kutusu nesnesi
 * @param {Array<number>} erasedIndices - Silinecek karakterlerin indeksleri
 * @returns {{ updatedBlock: object, shouldDeleteBlock: boolean, changed: boolean, previousText?: string }}
 */
export function eraseCharactersFromBlock(block, erasedIndices = []) {
  if (!block || !block.text || !Array.isArray(erasedIndices) || erasedIndices.length === 0) {
    return { updatedBlock: block, shouldDeleteBlock: false, changed: false };
  }

  const indicesSet = new Set(erasedIndices);
  const chars = Array.from(block.text);
  let hasChanged = false;

  for (let i = 0; i < chars.length; i++) {
    if (indicesSet.has(i)) {
      if (chars[i] !== ' ' && chars[i] !== '\n') {
        chars[i] = ' '; // Boşlukla yer değiştir: metin sola kaymaz, doğal kağıt hissi
        hasChanged = true;
      }
    }
  }

  if (!hasChanged) {
    return { updatedBlock: block, shouldDeleteBlock: false, changed: false };
  }

  const newText = chars.join('');

  // Eğer tüm metin sadece boşluklardan ibaret kaldıysa, bloğu tamamen temizle
  if (newText.trim() === '') {
    return {
      updatedBlock: { ...block, text: '' },
      shouldDeleteBlock: true,
      changed: true,
      previousText: block.text,
    };
  }

  return {
    updatedBlock: { ...block, text: newText },
    shouldDeleteBlock: false,
    changed: true,
    previousText: block.text,
  };
}


