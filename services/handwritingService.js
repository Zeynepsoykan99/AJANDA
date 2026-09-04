/**
 * AJANDA - Dijital Mürekkep ve El Yazısı Tanıma Servisi (Digital Ink Recognition)
 * Stylus / parmakla canvas üzerine çizilen vektör çizgilerini (strokes)
 * orijinal çizimi değiştirmeden arka planda metne dönüştürür.
 */

// Aktif devam eden istekleri iptal etmek için kontrolcü referansı
let activeAbortController = null;
let currentRequestId = 0;

/**
 * Çizim noktalarından sınırlayıcı kutuyu (bounding box) hesaplar.
 */
export function calculateStrokeBounds(stroke) {
  if (!stroke?.points || stroke.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of stroke.points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  return {
    minX: Math.round(minX),
    minY: Math.round(minY),
    maxX: Math.round(maxX),
    maxY: Math.round(maxY),
    width: Math.round(Math.max(1, maxX - minX)),
    height: Math.round(Math.max(1, maxY - minY)),
  };
}

/**
 * Stroke dizisini Google Digital Ink formatına dönüştürür:
 * ink: [ [ [x1, x2, ...], [y1, y2, ...], [t1, t2, ...] ], ... ]
 */
export function formatStrokesForDigitalInk(drawings) {
  if (!Array.isArray(drawings) || drawings.length === 0) return [];

  const ink = [];

  for (const stroke of drawings) {
    if (!Array.isArray(stroke.points) || stroke.points.length === 0) continue;

    const xs = [];
    const ys = [];
    const ts = [];

    stroke.points.forEach((p, idx) => {
      xs.push(Math.round(p.x));
      ys.push(Math.round(p.y));
      // Eğer timestamp yoksa sanal zaman serisi oluştur
      const t = typeof p.timestamp === 'number' ? Math.round(p.timestamp) : idx * 16;
      ts.push(t);
    });

    ink.push([xs, ys, ts]);
  }

  return ink;
}

/**
 * Çizgilerin kapladığı toplam alanı (yazı alanı genişlik/yükseklik) hesaplar.
 */
export function calculateWritingArea(drawings) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = 0;
  let maxY = 0;

  for (const s of drawings) {
    const b = calculateStrokeBounds(s);
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  return {
    minX: isFinite(minX) ? minX : 0,
    minY: isFinite(minY) ? minY : 0,
    width: Math.max(800, isFinite(maxX - minX) ? maxX - minX + 100 : 800),
    height: Math.max(600, isFinite(maxY - minY) ? maxY - minY + 100 : 600),
  };
}

/**
 * Verilen stroke dizisini Digital Ink motoruna gönderip tanınan metni üretir.
 *
 * @param {Array} drawings - Çizim stroke dizisi
 * @param {object} options - Seçenekler ({ language: 'tr' | 'en' })
 * @returns {Promise<{ text: string, words: Array, success: boolean, candidates?: Array }>}
 */
export async function recognizeHandwriting(drawings, options = { language: 'tr' }) {
  if (!Array.isArray(drawings) || drawings.length === 0) {
    return { text: '', words: [], success: true };
  }

  const ink = formatStrokesForDigitalInk(drawings);
  if (ink.length === 0) {
    return { text: '', words: [], success: true };
  }

  // Önceki isteği iptal et (Race Condition Koruması)
  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();
  const requestId = ++currentRequestId;

  const area = calculateWritingArea(drawings);
  const lang = options.language || 'tr';
  const itc = lang === 'tr' ? 'tr-t-i0-handwrit' : 'en-t-i0-handwrit';

  try {
    const timeoutId = setTimeout(() => {
      if (activeAbortController) activeAbortController.abort();
    }, 8000); // 8 saniye zaman aşımı

    const response = await fetch(
      `https://inputtools.google.com/request?itc=${itc}&app=autonotebook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_version: 0.4,
          api_level: '537.36',
          device: '537.36',
          input_type: '0',
          options: 'enable_pre_space',
          requests: [
            {
              writing_guide: {
                writing_area_width: Math.round(area.width),
                writing_area_height: Math.round(area.height),
              },
              ink,
              language: lang,
            },
          ],
        }),
        signal: activeAbortController.signal,
      }
    );

    clearTimeout(timeoutId);

    // Eğer yeni bir istek başladıysa bu eski sonucu yok say (stale response protection)
    if (requestId !== currentRequestId) {
      return { text: '', words: [], success: false, stale: true };
    }

    if (!response.ok) {
      return { text: '', words: [], success: false, status: response.status };
    }

    const data = await response.json();

    if (Array.isArray(data) && data[0] === 'SUCCESS' && data[1]?.[0]?.[1]) {
      const candidates = data[1][0][1];
      const topResult = candidates[0] || '';

      // Kelimelerin yaklaşık koordinat sınırlarını üret (Spatial mapping)
      const rawWords = topResult.trim().split(/\s+/).filter(Boolean);
      const recognizedWords = rawWords.map((w) => ({
        word: w,
        bounds: {
          minX: area.minX,
          minY: area.minY,
          width: area.width,
          height: area.height,
        },
      }));

      return {
        text: topResult.trim(),
        words: recognizedWords,
        candidates: candidates.slice(0, 5),
        success: true,
      };
    }

    return { text: '', words: [], success: false };
  } catch (error) {
    if (error.name === 'AbortError') {
      // İstek yeni bir çizim geldiği için bilinçli iptal edildi
      return { text: '', words: [], success: false, aborted: true };
    }
    // Çevrimdışı (offline) veya ağ hatasında uygulama asla çökmez
    if (__DEV__) {
      console.warn('[HandwritingService] Tanıma ağ hatası veya çevrimdışı:', error.message);
    }
    return { text: '', words: [], success: false, error: error.message };
  }
}

/**
 * Seçilen el yazısı çizgilerini doğrudan metne dönüştürmek için tanıma yapar.
 * Arka plan arama indekslemesi ile çakışmaması için izole bir AbortController kullanır.
 *
 * @param {Array} selectedStrokes - Seçili çizgiler dizisi
 * @param {object} options - Seçenekler ({ language: 'tr' | 'en' })
 * @returns {Promise<{ text: string, candidates: string[], success: boolean, error?: string }>}
 */
export async function recognizeSelectedStrokes(selectedStrokes, options = { language: 'tr' }) {
  if (!Array.isArray(selectedStrokes) || selectedStrokes.length === 0) {
    return { text: '', candidates: [], success: false, error: 'Seçili çizgi bulunamadı' };
  }

  const ink = formatStrokesForDigitalInk(selectedStrokes);
  if (ink.length === 0) {
    return { text: '', candidates: [], success: false, error: 'Çizgi noktaları geçersiz' };
  }

  const area = calculateWritingArea(selectedStrokes);
  const lang = options.language || 'tr';
  const itc = lang === 'tr' ? 'tr-t-i0-handwrit' : 'en-t-i0-handwrit';
  const controller = new AbortController();

  try {
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000); // 10 saniye zaman aşımı

    const response = await fetch(
      `https://inputtools.google.com/request?itc=${itc}&app=autonotebook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_version: 0.4,
          api_level: '537.36',
          device: '537.36',
          input_type: '0',
          options: 'enable_pre_space',
          requests: [
            {
              writing_guide: {
                writing_area_width: Math.round(area.width),
                writing_area_height: Math.round(area.height),
              },
              ink,
              language: lang,
            },
          ],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { text: '', candidates: [], success: false, error: `Sunucu yanıtı: ${response.status}` };
    }

    const data = await response.json();

    if (Array.isArray(data) && data[0] === 'SUCCESS' && data[1]?.[0]?.[1]) {
      const candidates = data[1][0][1];
      const topResult = (candidates[0] || '').trim();

      return {
        text: topResult,
        candidates: candidates.slice(0, 6),
        success: true,
      };
    }

    return { text: '', candidates: [], success: false, error: 'El yazısı tespit edilemedi' };
  } catch (error) {
    if (__DEV__) {
      console.warn('[HandwritingService] Seçili el yazısı tanıma hatası:', error.message);
    }
    return {
      text: '',
      candidates: [],
      success: false,
      error: error.name === 'AbortError' ? 'Zaman aşımı' : 'Bağlantı hatası veya çevrimdışı',
    };
  }
}

