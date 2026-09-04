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
 * Orijinal el yazısı boyutuna göre otomatik yazı boyutu (font size) kestirimi yapar.
 *
 * @param {{ width: number, height: number }} bounds - Çizgilerin sınırlayıcı kutusu
 * @param {string} text - Dönüştürülecek metin
 * @returns {{ fontSize: number, width: number, height: number }}
 */
export function fitTextToBounds(bounds, text = '') {
  const lineCount = Math.max(1, (text || '').split('\n').length);
  const estimatedLineHeight = (bounds.height || 30) / lineCount;

  // Çizgi yüksekliğinin yaklaşık %65-70'i tipik yazı büyüklüğüne karşılık gelir
  let calculatedFontSize = Math.round(estimatedLineHeight * 0.68);

  // Aşırı küçük veya aşırı büyük yazı boyutlarını engelle
  calculatedFontSize = Math.min(48, Math.max(13, calculatedFontSize));

  // Metin kutusu genişliği (orijinal el yazısı genişliğinden biraz pay bırakılır)
  const calculatedWidth = Math.max(120, Math.round((bounds.width || 100) + 16));

  return {
    fontSize: calculatedFontSize,
    width: calculatedWidth,
    height: Math.max(40, bounds.height || 40),
  };
}
