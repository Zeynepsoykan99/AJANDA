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

      // Boyut farkı kontrolü: Biri büyük başlık diğeri küçük alt not ise (>2.0 kat) ve Y ekseninde ayrık iseler (gapY > 15) birleştirme!
      const heightRatio =
        Math.max(a.bounds.height, b.bounds.height) /
        Math.max(1, Math.min(a.bounds.height, b.bounds.height));
      if (gapY > 15 && heightRatio > 2.0) {
        return false;
      }

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

  if (boundHeight <= 0) return 18;

  const cleanText = (text || '').trim();
  const lines = cleanText ? cleanText.split('\n').filter((l) => l.trim().length > 0) : [];
  const lineCount = Math.max(1, lines.length);

  // 1. Satır Başına Düşen Fiziksel Çizim Yüksekliği:
  const lineHeight = boundHeight / lineCount;

  // 2. Tipografik Orantı (Em-Square Glif Oranı ~%70):
  // Fiziksel çizim yüksekliğinin %70'i doğrudan dijital font puntosuna çevrilir
  const optimalFont = lineHeight * 0.70;

  // 3. Geniş Dinamik Aralık (12px - 72px):
  // Küçük notlar: 12-18px, standart el yazısı: 20-28px, başlıklar: 32-50px, devasa başlıklar: 52-72px
  const finalFontSize = Math.round(Math.min(72, Math.max(12, optimalFont)));

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

  const cleanText = (text || '').trim();
  const lines = cleanText ? cleanText.split('\n').filter((l) => l.trim().length > 0) : [];
  const longestLineLength = Math.max(1, ...lines.map((l) => l.trim().length));

  // Metin kutusu genişliği: Orijinal çizim genişliği ve metnin tahmini uzunluğunun maksimumu
  const estimatedTextWidth = Math.round(longestLineLength * calculatedFontSize * 0.58 + 24);
  const calculatedWidth = Math.max(100, Math.max(boundWidth + 16, estimatedTextWidth));
  const calculatedHeight = Math.max(30, Math.round(boundHeight));

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

/**
 * Aynı satırda yer alan ve birbirine doğal kelime mesafesinde olan OCR metin kümelerini
 * tek bir metin kutusunda birleştirir (Spatial Clustering & Line Merging).
 *
 * @param {Array<object>} clusters - Ham tanıma kümeleri
 * @param {object} options - Tolerans ayarları
 * @returns {Array<object>} - Birleştirilmiş kümeler
 */
export function mergeSpatialClusters(clusters, options = {}) {
  if (!Array.isArray(clusters) || clusters.length <= 1) {
    return clusters || [];
  }

  const {
    overlapYRatio = 0.40,       // Dikeyde en az %40 örtüşme
    centerDiffRatio = 0.35,      // veya dikey merkez farkı refHeight * 0.35'ten az
    wordGapMultiplier = 1.6,     // refHeight * 1.6 maksimum kelime boşluğu
    minWordGap = 35,             // En az 35px kelime boşluğuna izin ver
  } = options;

  // 1. Kümeleri renge göre grupla (Farklı renkler asla birleşmez)
  const colorGroups = new Map();
  clusters.forEach((c) => {
    const col = (c.color || '#000000').toLowerCase().trim();
    if (!colorGroups.has(col)) colorGroups.set(col, []);
    colorGroups.get(col).push(c);
  });

  const mergedResults = [];

  for (const [col, group] of colorGroups.entries()) {
    if (group.length === 1) {
      mergedResults.push(group[0]);
      continue;
    }

    // Doğal okuma sırasına göre diz (Yukarıdan aşağıya, aynı satırda soldan sağa)
    const sorted = [...group].sort((a, b) => {
      const diffY = a.bounds.minY - b.bounds.minY;
      if (Math.abs(diffY) <= 25) {
        return a.bounds.minX - b.bounds.minX;
      }
      return diffY;
    });

    const merged = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const a = current;
      const b = next;

      // Dikey örtüşme ve referans satır yüksekliği
      const overlapY = Math.min(a.bounds.maxY, b.bounds.maxY) - Math.max(a.bounds.minY, b.bounds.minY);
      const hA = Math.max(1, a.bounds.height || a.bounds.maxY - a.bounds.minY);
      const hB = Math.max(1, b.bounds.height || b.bounds.maxY - b.bounds.minY);
      const refHeight = Math.min(hA, hB);

      const centerYA = a.bounds.minY + hA / 2;
      const centerYB = b.bounds.minY + hB / 2;
      const diffCenterY = Math.abs(centerYA - centerYB);

      // Aynı satırda mı?
      const isSameLine =
        overlapY >= refHeight * overlapYRatio ||
        diffCenterY <= refHeight * centerDiffRatio;

      // Yatay boşluk
      const gapX = b.bounds.minX - a.bounds.maxX;
      const maxGapX = Math.max(minWordGap, Math.round(refHeight * wordGapMultiplier));

      // Aynı satırda ve aralarındaki boşluk makul kelime boşluğu aralığındaysa birleştir
      if (isSameLine && gapX >= -30 && gapX <= maxGapX) {
        const textA = (a.text || '').trim();
        const textB = (b.text || '').trim();
        const mergedText = `${textA} ${textB}`.trim();

        const mergedMinX = Math.min(a.bounds.minX, b.bounds.minX);
        const mergedMinY = Math.min(a.bounds.minY, b.bounds.minY);
        const mergedMaxX = Math.max(a.bounds.maxX, b.bounds.maxX);
        const mergedMaxY = Math.max(a.bounds.maxY, b.bounds.maxY);
        const mergedWidth = Math.max(mergedMaxX - mergedMinX, 1);
        const mergedHeight = Math.max(mergedMaxY - mergedMinY, 1);

        const mergedStrokes = [...(a.strokes || []), ...(b.strokes || [])];
        const mergedStrokeIds = [...(a.strokeIds || []), ...(b.strokeIds || [])];

        const lenA = textA.length;
        const lenB = textB.length;
        const fontA = a.fontSize || a.estimatedFontSize || 18;
        const fontB = b.fontSize || b.estimatedFontSize || 18;
        const mergedFont = Math.round((fontA * lenA + fontB * lenB) / Math.max(1, lenA + lenB));

        const fitted = fitTextToBounds({ width: mergedWidth, height: mergedHeight }, mergedText);

        current = {
          ...a,
          id: a.id,
          text: mergedText,
          strokes: mergedStrokes,
          strokeIds: mergedStrokeIds,
          bounds: {
            minX: mergedMinX,
            minY: mergedMinY,
            maxX: mergedMaxX,
            maxY: mergedMaxY,
            width: mergedWidth,
            height: mergedHeight,
          },
          fontSize: mergedFont || fitted.fontSize,
          estimatedFontSize: mergedFont || fitted.fontSize,
          fittedWidth: Math.max(fitted.width, mergedWidth),
        };
      } else {
        merged.push(current);
        current = { ...next };
      }
    }

    merged.push(current);
    mergedResults.push(...merged);
  }

  return mergedResults;
}

/**
 * Punto Normalizasyonu (Font Size Smoothing):
 * İnsan el yazısından kaynaklanan ufak boyut dalgalanmalarını medyan filtreleme ile standartlaştırır.
 *
 * @param {Array<object>} clusters - Kümeler listesi
 * @param {object} options - Tolerans ayarları ({ toleranceRatio: 0.30 })
 * @returns {Array<object>} - Normalleştirilmiş kümeler
 */
export function smoothClusterFontSizes(clusters, options = {}) {
  if (!Array.isArray(clusters) || clusters.length === 0) {
    return clusters || [];
  }

  const { toleranceRatio = 0.30 } = options; // %30 tolerans

  const fontSizes = clusters
    .map((c) => c.fontSize || c.estimatedFontSize || 18)
    .filter((s) => typeof s === 'number' && s > 0);

  if (fontSizes.length === 0) return clusters;

  // Medyan hesapla
  const sorted = [...fontSizes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianFontSize =
    sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);

  return clusters.map((c) => {
    const currentSize = c.fontSize || c.estimatedFontSize || 18;
    const diffRatio = Math.abs(currentSize - medianFontSize) / medianFontSize;

    // Eğer fark %30 tolerans içindeyse medyana pürüzsüzleştir
    if (diffRatio <= toleranceRatio) {
      const fitted = fitTextToBounds(c.bounds, c.text);
      return {
        ...c,
        fontSize: medianFontSize,
        estimatedFontSize: medianFontSize,
        fittedWidth: Math.max(c.fittedWidth || 0, fitted.width),
      };
    }

    // Tolerans dışındaysa (büyük başlık veya minik alt not) orijinal boyutu koru
    return c;
  });
}

/**
 * Kement Tanıma Sonuçlarını İşleme Pipeline'ı:
 * 1. Mekansal Kümeleme ve Satır Birleştirme (mergeSpatialClusters)
 * 2. Punto Normalizasyonu (smoothClusterFontSizes)
 *
 * @param {Array<object>} clusterResults - Ham OCR tanıma sonuçları
 * @param {object} options - Konfigürasyon
 * @returns {Array<object>} - İşlenmiş, birleştirilmiş ve normalize edilmiş kümeler
 */
export function processLassoRecognitionResults(clusterResults, options = {}) {
  if (!Array.isArray(clusterResults) || clusterResults.length === 0) {
    return [];
  }

  // 1. Adım: Aynı satırdaki yakın kelimeleri tek cümle haline getir
  const merged = mergeSpatialClusters(clusterResults, options);

  // 2. Adım: Ufak punto dalgalanmalarını medyan ile normalize et
  const smoothed = smoothClusterFontSizes(merged, options);

  return smoothed;
}



