import {
  getStrokePoints,
  getTextBlockBounds,
  calculateCharacterBoxes,
  getErasedCharacterIndices,
  eraseCharactersFromBlock,
} from './lassoGeometry';

/**
 * scribbleDetection - Karalayarak silme hareketinin tanınması.
 *
 * Fiziksel bir deftere yazıp üstünü karalayarak iptal etme hareketini taklit eder.
 * Buradaki fonksiyonların TAMAMI saftır: zamandan, ekrandan ve React'ten bağımsızdır,
 * doğrudan test edilebilir.
 *
 * BİLİNEN SINIR — dürüstçe:
 * Tek darbede yapılan GÖLGELENDİRME/TARAMA ve sık ilmekli EL YAZISI ("eeeeee")
 * geometrik olarak karalamaya çok benzer; saf geometriyle tam ayrılamazlar.
 * İki koruma bunu yaşanabilir kılar: (1) karalama mevcut bir içerikle
 * kesişmiyorsa hiçbir şey silinmez, yani boş alana gölgelendirme güvenlidir;
 * (2) silme işlemi tek dokunuşla geri alınabilir. Gerekirse ileride hız
 * (nokta zaman damgaları) üçüncü bir ayırt edici olarak eklenebilir.
 *
 * Tasarım kararı — neden tek bir ölçüt değil:
 * Tek bir sezgisel kural (ör. yalnızca yön dönüşü saymak) el yazısında "mmm" yazan
 * ya da gölgelendirme yapan kullanıcının çizimini siler. Bu yüzden ÜÇ bağımsız ölçüt
 * hesaplanır ve en az ikisinin birlikte sağlanması aranır. Üstüne, karalamanın
 * silinecek bir içerikle gerçekten KESİŞMESİ şart koşulur: boş alana karalamak
 * hiçbir şeyi silmez, sıradan bir çizgi olarak kalır.
 */

// ─── Eşik Değerleri ────────────────────────────────────────────────
// Tespitin tüm ayarları BURADA. Cihaz testinden sonra yalnızca bu nesne değişir.
export const SCRIBBLE_THRESHOLDS = {
  /** Bu sayıdan az noktası olan bir çizgi karalama sayılmaz */
  MIN_POINTS: 12,
  /** Bu uzunluktan kısa bir çizgi karalama sayılmaz (px) */
  MIN_PATH_LENGTH: 60,
  /** Analiz öncesi nokta seyreltme mesafesi (px). Şekli korur, maliyeti düşürür */
  DECIMATE_MIN_DISTANCE: 8,
  /** Seyreltmeden sonra analiz edilecek en fazla nokta (O(n²) tavanı) */
  MAX_ANALYSIS_POINTS: 60,

  /** Yön okunurken bakılan pencere yarıçapı (nokta). 1 = yalnızca komşu parça */
  REVERSAL_SPAN: 2,
  /** Bir dönüşün sayılması için iki kolunun da en az bu kadar uzun olması gerekir (px) */
  MIN_REVERSAL_ARM: 14,
  /** Pencere yönleri arasındaki açı bu dereceden büyükse "geri dönüş" sayılır */
  REVERSAL_ANGLE_DEG: 115,
  /** Ölçüt 1: en az bu kadar geri dönüş */
  MIN_REVERSALS: 4,
  /** Ölçüt 2: en az bu kadar kendi kendini kesme */
  MIN_SELF_INTERSECTIONS: 2,
  /** Ölçüt 3: yolUzunluğu / sınırKutusuKöşegeni en az bu kadar */
  MIN_DENSITY_RATIO: 3.2,
  /** Üç ölçütten en az kaçı sağlanmalı */
  MIN_CRITERIA_MET: 2,

  /** Karalamanın bir içeriğe "değdiği" kabul edilen yarıçap (px) */
  HIT_RADIUS: 14,
  /** Çıkartmanın ölçeklenmemiş kenar uzunluğu (DraggableSticker: 80x80) */
  STICKER_BASE_SIZE: 80,
};

const DEG_TO_RAD = Math.PI / 180;

// ─── Temel Geometri ────────────────────────────────────────────────

/**
 * Birbirine çok yakın noktaları atar. Şekli korur ama kendi kendini kesme
 * hesabının maliyetini düşürür.
 *
 * @param {Array<{x:number,y:number}>} points
 * @param {number} [minDistance]
 * @returns {Array<{x:number,y:number}>}
 */
export function decimatePoints(points, minDistance = SCRIBBLE_THRESHOLDS.DECIMATE_MIN_DISTANCE) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const out = [points[0]];
  const minSq = minDistance * minDistance;

  for (let i = 1; i < points.length; i++) {
    const last = out[out.length - 1];
    const dx = points[i].x - last.x;
    const dy = points[i].y - last.y;
    if (dx * dx + dy * dy >= minSq) out.push(points[i]);
  }

  // Son nokta şekli belirler; seyreltmede düşmüşse geri eklenir
  const original = points[points.length - 1];
  const kept = out[out.length - 1];
  if (original !== kept) out.push(original);

  // Üst sınır. DİKKAT: burada eşit aralıklı örnekleme YAPILMAZ. Tekdüze
  // örnekleme tam da ölçmek istediğimiz KÖŞELERİ (yön dönüşlerini) siler ve
  // gerçek bir karalama düz bir çizgi gibi görünür. Bunun yerine mesafe
  // eşiği büyütülerek yeniden seyreltilir; bu, köşeleri korur.
  const max = SCRIBBLE_THRESHOLDS.MAX_ANALYSIS_POINTS;
  if (out.length <= max) return out;
  return decimatePoints(points, minDistance * 1.6);
}

/**
 * Noktalar boyunca gidilen toplam yol uzunluğu.
 * @param {Array<{x:number,y:number}>} points
 * @returns {number}
 */
export function getPathLength(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

/**
 * Nokta dizisinin sınırlayıcı kutusu.
 * @param {Array<{x:number,y:number}>} points
 * @returns {{minX:number,minY:number,maxX:number,maxY:number}|null}
 */
export function getPointsBounds(points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * İki sınırlayıcı kutu (verilen pay kadar genişletilerek) kesişiyor mu.
 * @param {object} a
 * @param {object} b
 * @param {number} [margin]
 * @returns {boolean}
 */
export function boundsOverlap(a, b, margin = 0) {
  if (!a || !b) return false;
  return !(
    a.maxX + margin < b.minX ||
    a.minX - margin > b.maxX ||
    a.maxY + margin < b.minY ||
    a.minY - margin > b.maxY
  );
}

/**
 * İki doğru parçası kesişiyor mu (uç noktalar dahil değil, yönden bağımsız).
 * @returns {boolean}
 */
export function segmentsIntersect(p1, p2, p3, p4) {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (d === 0) return false; // paralel veya aynı doğru üzerinde
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

/**
 * Bir noktanın bir doğru parçasına en kısa uzaklığının KARESİ.
 * @returns {number}
 */
export function pointToSegmentDistanceSq(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = p.x - a.x;
    const ey = p.y - a.y;
    return ex * ex + ey * ey;
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  const ex = p.x - cx;
  const ey = p.y - cy;
  return ex * ex + ey * ey;
}

// ─── Ölçüt Hesapları ───────────────────────────────────────────────

/**
 * Ölçüt 1 — Keskin yön dönüşü sayısı.
 *
 * Ardışık iki parça arasındaki açı eşiği aşıyorsa "geri dönüş" sayılır.
 * Açı tabanlı olduğu için dönmeye duyarsızdır: yatay, dikey ve çapraz
 * karalamalar aynı şekilde yakalanır.
 *
 * @param {Array<{x:number,y:number}>} points
 * @param {number} [angleDeg]
 * @returns {number}
 */
export function countDirectionReversals(points, angleDeg = SCRIBBLE_THRESHOLDS.REVERSAL_ANGLE_DEG) {
  const T = SCRIBBLE_THRESHOLDS;
  const span = T.REVERSAL_SPAN;
  if (!Array.isArray(points) || points.length < span * 2 + 1) return 0;

  const cosLimit = Math.cos(angleDeg * DEG_TO_RAD);
  const minArmSq = T.MIN_REVERSAL_ARM * T.MIN_REVERSAL_ARM;
  let reversals = 0;
  let lastCounted = -Infinity;

  for (let i = span; i < points.length - span; i++) {
    // Yön, TEK bir parçadan değil `span` kadar noktalık bir pencereden okunur.
    // Tek parçaya bakmak, geniş bir karalamadaki dönüşü iki ayrı 90° köşeye
    // bölüyor ve hiçbiri eşiği geçmediği için dönüş sayılmıyordu.
    const ax = points[i].x - points[i - span].x;
    const ay = points[i].y - points[i - span].y;
    const bx = points[i + span].x - points[i].x;
    const by = points[i + span].y - points[i].y;

    const aLenSq = ax * ax + ay * ay;
    const bLenSq = bx * bx + by * by;

    // Kısa kollu dönüşler sayılmaz: el yazısındaki küçük ilmekler ve titreme
    // keskin açılar üretir ama bunlar bilinçli bir ileri-geri süpürme değildir.
    if (aLenSq < minArmSq || bLenSq < minArmSq) continue;

    const cos = (ax * bx + ay * by) / Math.sqrt(aLenSq * bLenSq);
    if (cos <= cosLimit) {
      // Aynı dönüş pencere boyunca birkaç kez eşiği geçebilir; bir kez sayılır
      if (i - lastCounted >= span) {
        reversals++;
        lastCounted = i;
      }
    }
  }

  return reversals;
}

/**
 * Ölçüt 2 — Çizginin kendi kendini kesme sayısı.
 *
 * Komşu parçalar atlanır (uç noktaları paylaştıkları için her zaman "kesişirler").
 * Maliyet O(n²)'dir; bu yüzden çağırmadan önce noktalar seyreltilmelidir.
 *
 * @param {Array<{x:number,y:number}>} points
 * @returns {number}
 */
export function countSelfIntersections(points) {
  if (!Array.isArray(points) || points.length < 4) return 0;
  let count = 0;

  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 2; j < points.length - 1; j++) {
      // i ve j komşuysa atla
      if (i === 0 && j === points.length - 2) continue;
      if (segmentsIntersect(points[i], points[i + 1], points[j], points[j + 1])) count++;
    }
  }

  return count;
}

/**
 * Ölçüt 3 — Yoğunluk: yol uzunluğunun sınırlayıcı kutu köşegenine oranı.
 * Düz bir çizgide ~1; dar bir alanda ileri geri gidilen karalamada yüksektir.
 *
 * @param {Array<{x:number,y:number}>} points
 * @returns {number}
 */
export function getDensityRatio(points) {
  const bounds = getPointsBounds(points);
  if (!bounds) return 0;
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  const diagonal = Math.sqrt(w * w + h * h);
  if (diagonal < 1) return 0;
  return getPathLength(points) / diagonal;
}

/**
 * Bir çizginin karalama olup olmadığını değerlendirir.
 *
 * @param {Array<{x:number,y:number}>} rawPoints - Ham çizim noktaları
 * @returns {{
 *   isScribble: boolean,
 *   reversals: number,
 *   selfIntersections: number,
 *   densityRatio: number,
 *   criteriaMet: number,
 *   pathLength: number,
 *   bounds: object|null,
 *   points: Array,
 *   reason?: string
 * }}
 */
export function analyzeScribble(rawPoints) {
  const T = SCRIBBLE_THRESHOLDS;
  const empty = {
    isScribble: false,
    reversals: 0,
    selfIntersections: 0,
    densityRatio: 0,
    criteriaMet: 0,
    pathLength: 0,
    bounds: null,
    points: [],
  };

  if (!Array.isArray(rawPoints) || rawPoints.length < T.MIN_POINTS) {
    return { ...empty, reason: 'too_few_points' };
  }

  const points = decimatePoints(rawPoints);
  const pathLength = getPathLength(points);
  const bounds = getPointsBounds(points);

  if (pathLength < T.MIN_PATH_LENGTH) {
    return { ...empty, pathLength, bounds, points, reason: 'too_short' };
  }

  const reversals = countDirectionReversals(points);
  const selfIntersections = countSelfIntersections(points);
  const densityRatio = getDensityRatio(points);

  const hasReversals = reversals >= T.MIN_REVERSALS;
  const hasIntersections = selfIntersections >= T.MIN_SELF_INTERSECTIONS;
  const hasDensity = densityRatio >= T.MIN_DENSITY_RATIO;

  let criteriaMet = 0;
  if (hasReversals) criteriaMet++;
  if (hasIntersections) criteriaMet++;
  if (hasDensity) criteriaMet++;

  // Keskin yön dönüşü ZORUNLU ölçüttür, "üçten ikisi" yetmez.
  //
  // Neden: el yazısındaki ilmekler ("eeee", "llll") çok sayıda kendi kendini
  // kesme ve yüksek yoğunluk üretir, yani diğer iki ölçütü tek başlarına
  // sağlarlar — ama KESKİN GERİ DÖNÜŞ içermezler, çünkü kalem düzgün bir eğri
  // çizer. Karalama hareketinin tanımı ise tam olarak tekrarlanan sert geri
  // dönüştür. Bu yüzden dönüş şartı olmadan el yazısı siliniyordu.
  return {
    isScribble: hasReversals && criteriaMet >= T.MIN_CRITERIA_MET,
    reversals,
    selfIntersections,
    densityRatio,
    criteriaMet,
    pathLength,
    bounds,
    points,
  };
}

// ─── Hedef Belirleme ───────────────────────────────────────────────

/**
 * Çıkartmanın sınırlayıcı kutusu. DraggableSticker 80x80 çizip `scale` uygular.
 *
 * @param {object} sticker
 * @returns {{minX:number,minY:number,maxX:number,maxY:number}}
 */
export function getStickerBounds(sticker) {
  const size = SCRIBBLE_THRESHOLDS.STICKER_BASE_SIZE * (sticker?.scale || 1);
  const x = typeof sticker?.x === 'number' ? sticker.x : 0;
  const y = typeof sticker?.y === 'number' ? sticker.y : 0;
  return { minX: x, minY: y, maxX: x + size, maxY: y + size };
}

/**
 * Karalama çizgisi bir çizgiye değiyor mu.
 * Önce sınırlayıcı kutu ön eleme, sonra parça-parça yakınlık/kesişim testi.
 *
 * @param {Array<{x:number,y:number}>} scribblePoints - Seyreltilmiş karalama noktaları
 * @param {object} stroke
 * @param {number} [radius]
 * @returns {boolean}
 */
export function scribbleHitsStroke(scribblePoints, stroke, radius = SCRIBBLE_THRESHOLDS.HIT_RADIUS) {
  const target = decimatePoints(getStrokePoints(stroke));
  if (target.length === 0) return false;

  const scribbleBounds = getPointsBounds(scribblePoints);
  const targetBounds = getPointsBounds(target);
  if (!boundsOverlap(scribbleBounds, targetBounds, radius)) return false;

  const rSq = radius * radius;

  // Tek noktalı hedef (nokta çizgi): yakınlık testi yeterli
  if (target.length === 1) {
    for (let i = 0; i < scribblePoints.length - 1; i++) {
      if (pointToSegmentDistanceSq(target[0], scribblePoints[i], scribblePoints[i + 1]) <= rSq) {
        return true;
      }
    }
    return false;
  }

  for (let i = 0; i < scribblePoints.length - 1; i++) {
    const s1 = scribblePoints[i];
    const s2 = scribblePoints[i + 1];
    for (let j = 0; j < target.length - 1; j++) {
      const t1 = target[j];
      const t2 = target[j + 1];
      if (segmentsIntersect(s1, s2, t1, t2)) return true;
      // Kesişmese de çok yakınsa değmiş sayılır (ince çizgiler kaçmasın)
      if (pointToSegmentDistanceSq(t1, s1, s2) <= rSq) return true;
      if (pointToSegmentDistanceSq(s1, t1, t2) <= rSq) return true;
    }
  }

  return false;
}

/**
 * Karalama çizgisi bir dikdörtgene değiyor mu.
 *
 * @param {Array<{x:number,y:number}>} scribblePoints
 * @param {object} bounds
 * @param {number} [radius]
 * @returns {boolean}
 */
export function scribbleHitsBounds(scribblePoints, bounds, radius = SCRIBBLE_THRESHOLDS.HIT_RADIUS) {
  if (!bounds) return false;
  const scribbleBounds = getPointsBounds(scribblePoints);
  if (!boundsOverlap(scribbleBounds, bounds, radius)) return false;

  const rSq = radius * radius;
  for (const p of scribblePoints) {
    const closestX = Math.max(bounds.minX, Math.min(p.x, bounds.maxX));
    const closestY = Math.max(bounds.minY, Math.min(p.y, bounds.maxY));
    const dx = p.x - closestX;
    const dy = p.y - closestY;
    if (dx * dx + dy * dy <= rSq) return true;
  }
  return false;
}

/**
 * Metin kutusunda karalamanın üzerinden geçtiği KARAKTERLERİN indeksleri.
 *
 * Tüm kutuyu silmeyiz: mevcut silgi aracıyla aynı mantık kullanılır
 * (`getErasedCharacterIndices` — çember/dikdörtgen teması), karalamanın her
 * noktası küçük bir silgi gibi davranır ve sonuçlar birleştirilir. Böylece
 * yalnızca üstü karalanan kısım silinir.
 *
 * @param {Array<{x:number,y:number}>} scribblePoints
 * @param {object} block
 * @param {number} [radius]
 * @returns {Array<number>} Artan sırada, tekrarsız karakter indeksleri
 */
export function getScribbledCharacterIndices(
  scribblePoints,
  block,
  radius = SCRIBBLE_THRESHOLDS.HIT_RADIUS
) {
  if (!block || !block.text) return [];

  const blockBounds = getTextBlockBounds(block);
  const scribbleBounds = getPointsBounds(scribblePoints);
  if (!boundsOverlap(scribbleBounds, blockBounds, radius)) return [];

  const charBoxes = calculateCharacterBoxes(block);
  if (charBoxes.length === 0) return [];

  const hit = new Set();
  for (const p of scribblePoints) {
    const indices = getErasedCharacterIndices(p.x, p.y, radius, charBoxes);
    for (const index of indices) hit.add(index);
  }

  return Array.from(hit).sort((a, b) => a - b);
}

/**
 * Karalamanın sileceği her şeyi tek seferde toplar.
 *
 * @param {object} params
 * @param {Array<{x:number,y:number}>} params.scribblePoints - Seyreltilmiş karalama noktaları
 * @param {Array<object>} [params.drawings]
 * @param {Array<object>} [params.textBlocks]
 * @param {Array<object>} [params.stickers]
 * @param {number} [params.radius]
 * @returns {{
 *   strokeIds: Array<string>,
 *   stickerIds: Array<string>,
 *   textEdits: Array<{ id: string, erasedIndices: Array<number> }>,
 *   total: number
 * }}
 */
export function collectScribbleTargets({
  scribblePoints,
  drawings = [],
  textBlocks = [],
  stickers = [],
  radius = SCRIBBLE_THRESHOLDS.HIT_RADIUS,
}) {
  const strokeIds = [];
  const stickerIds = [];
  const textEdits = [];

  if (!Array.isArray(scribblePoints) || scribblePoints.length < 2) {
    return { strokeIds, stickerIds, textEdits, total: 0 };
  }

  for (const stroke of drawings) {
    if (stroke && scribbleHitsStroke(scribblePoints, stroke, radius)) {
      strokeIds.push(stroke.id);
    }
  }

  for (const sticker of stickers) {
    if (sticker && scribbleHitsBounds(scribblePoints, getStickerBounds(sticker), radius)) {
      stickerIds.push(sticker.id);
    }
  }

  for (const block of textBlocks) {
    const erasedIndices = getScribbledCharacterIndices(scribblePoints, block, radius);
    if (erasedIndices.length > 0) {
      textEdits.push({ id: block.id, erasedIndices });
    }
  }

  return {
    strokeIds,
    stickerIds,
    textEdits,
    total: strokeIds.length + stickerIds.length + textEdits.length,
  };
}

/**
 * Tespit + hedef toplamayı tek adımda yapar; çizim tamamlandığında çağrılır.
 *
 * Karalama hiçbir şeye değmiyorsa `shouldErase` false döner ve çizgi sıradan
 * bir çizim olarak kalır: boş alana karalamak içeriği silmez.
 *
 * @param {object} params
 * @param {Array<{x:number,y:number}>} params.points - Yeni çizilen ham noktalar
 * @param {Array<object>} [params.drawings]
 * @param {Array<object>} [params.textBlocks]
 * @param {Array<object>} [params.stickers]
 * @returns {{ shouldErase: boolean, analysis: object, targets: object }}
 */
export function evaluateScribbleErase({ points, drawings = [], textBlocks = [], stickers = [] }) {
  const analysis = analyzeScribble(points);

  if (!analysis.isScribble) {
    return {
      shouldErase: false,
      analysis,
      targets: { strokeIds: [], stickerIds: [], textEdits: [], total: 0 },
    };
  }

  const targets = collectScribbleTargets({
    scribblePoints: analysis.points,
    drawings,
    textBlocks,
    stickers,
  });

  return { shouldErase: targets.total > 0, analysis, targets };
}

/**
 * Belirlenen hedefleri sayfa verisine UYGULAR ve geri alma kaydını üretir.
 *
 * Dört ekran (Ajandam, Yapılacaklar, Günlüğüm, Notlarım) aynı mantığı
 * kullansın diye burada toplanmıştır; ekranlarda yalnızca sonucu yazmak kalır.
 *
 * Metin kutuları için `eraseCharactersFromBlock` kullanılır: tüm kutu değil,
 * yalnızca üzeri karalanan karakterler boşlukla değiştirilir. Kutu tamamen
 * boşalırsa silinir.
 *
 * @param {object} params
 * @param {Array<object>} [params.drawings]
 * @param {Array<object>} [params.textBlocks]
 * @param {Array<object>} [params.stickers]
 * @param {object} params.targets - collectScribbleTargets çıktısı
 * @returns {{
 *   drawings: Array<object>,
 *   textBlocks: Array<object>,
 *   stickers: Array<object>,
 *   deletedCount: number,
 *   undoRecord: object
 * }}
 */
export function applyScribbleErase({ drawings = [], textBlocks = [], stickers = [], targets }) {
  const strokeIdSet = new Set(targets?.strokeIds || []);
  const stickerIdSet = new Set(targets?.stickerIds || []);
  const textEdits = targets?.textEdits || [];

  const removedStrokes = drawings.filter((d) => strokeIdSet.has(d.id));
  const nextDrawings = drawings.filter((d) => !strokeIdSet.has(d.id));

  const removedStickers = stickers.filter((k) => stickerIdSet.has(k.id));
  const nextStickers = stickers.filter((k) => !stickerIdSet.has(k.id));

  // Geri alma icin metin kutularinin ONCEKI hallerini sakla
  const previousBlocks = [];
  const nextTextBlocks = [];

  for (const block of textBlocks) {
    const edit = textEdits.find((e) => e.id === block.id);
    if (!edit) {
      nextTextBlocks.push(block);
      continue;
    }

    const result = eraseCharactersFromBlock(block, edit.erasedIndices);
    if (!result.changed) {
      nextTextBlocks.push(block);
      continue;
    }

    previousBlocks.push(block);
    // Tamamen bosalan kutu sayfada birakilmaz
    if (!result.shouldDeleteBlock) nextTextBlocks.push(result.updatedBlock);
  }

  const deletedCount = removedStrokes.length + removedStickers.length + previousBlocks.length;

  return {
    drawings: nextDrawings,
    textBlocks: nextTextBlocks,
    stickers: nextStickers,
    deletedCount,
    undoRecord: {
      type: 'scribble_erase',
      removedStrokes,
      removedStickers,
      previousBlocks,
    },
  };
}

/**
 * `applyScribbleErase` ile silinenleri geri yükler.
 *
 * Karalama çizgisinin kendisi zaten sayfaya eklenmediği için geri almada
 * yalnızca silinenler döner: işlem tek ve atomiktir.
 *
 * @param {object} params
 * @param {Array<object>} [params.drawings]
 * @param {Array<object>} [params.textBlocks]
 * @param {Array<object>} [params.stickers]
 * @param {object} params.undoRecord
 * @returns {{ drawings: Array<object>, textBlocks: Array<object>, stickers: Array<object> }}
 */
export function revertScribbleErase({ drawings = [], textBlocks = [], stickers = [], undoRecord }) {
  if (!undoRecord || undoRecord.type !== 'scribble_erase') {
    return { drawings, textBlocks, stickers };
  }

  const restoredBlockIds = new Set((undoRecord.previousBlocks || []).map((b) => b.id));

  return {
    drawings: [...drawings, ...(undoRecord.removedStrokes || [])],
    stickers: [...stickers, ...(undoRecord.removedStickers || [])],
    // Kismi silinen kutular eski metinleriyle degistirilir; tamamen silinmis
    // olanlar (listede olmayanlar) geri eklenir
    textBlocks: [
      ...textBlocks.filter((b) => !restoredBlockIds.has(b.id)),
      ...(undoRecord.previousBlocks || []),
    ],
  };
}

export default {
  SCRIBBLE_THRESHOLDS,
  analyzeScribble,
  collectScribbleTargets,
  evaluateScribbleErase,
  applyScribbleErase,
  revertScribbleErase,
};
