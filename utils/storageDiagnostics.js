/**
 * ⚠️ GEÇİCİ — TEŞHİS AMAÇLI — KALDIRILACAK (Faz 0: depolama ölçümü)
 *
 * Bulut yedekleme planından önce cihazdaki GERÇEK veri boyutlarını ölçer:
 *   a) Her AsyncStorage anahtarının bayt boyutu; Android'in 6 MB veritabanı
 *      sınırına ve ~2 MB satır okuma sınırına (CursorWindow) yakınlık yüzdesi
 *   b) En büyük tek sayfa, sayfa başına çizgi, çizgi başına nokta, nokta başına bayt
 *   c) Çizgilerin `d` yolu ile `points` dizisinin ayrı ayrı kapladığı yer ve
 *      koordinatların ondalık basamak sayısı
 *   d) AUDIO_DIR içindeki ses dosyalarının adedi ve toplam boyutu
 *
 * Yalnızca ana menüdeki geçici "Depolama ölçümü" bağlantısıyla, ELLE ve tek
 * seferlik tetiklenir; sıcak yolda (çizim, kayıt) hiçbir şey çalıştırmaz.
 * Veriyi yalnızca OKUR — hiçbir anahtara yazmaz, hiçbir dosyayı değiştirmez.
 *
 * Çıktı: `[AJANDA-TANI] storage:*` satırları + ekranda gösterilen özet metin.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { AUDIO_DIR } from '../services/audioService';
import { dlog, BUILD_STAMP } from './diagnosticLog';

// Android AsyncStorage varsayılan veritabanı sınırı (config.gradle → getDatabaseSize: 6L MB)
export const ANDROID_DB_LIMIT_BYTES = 6 * 1024 * 1024;
// Android CursorWindow varsayılan boyutu (config_cursorWindowSize = 2048 KB; üretici değiştirebilir)
export const CURSOR_WINDOW_BYTES = 2 * 1024 * 1024;

// Defter verisi tutan anahtarlar ve yapıları
const PAGES_KEY = '@ajanda_pages';
const DIARY_KEY = '@ajanda_diary_v1';
const NOTEBOOKS_KEY = '@ajanda_notebooks_v1';

/**
 * Bir metnin UTF-8 bayt uzunluğu. SQLite TEXT'i ve CursorWindow satırları
 * UTF-8 tutar; JS `length` UTF-16 birimi saydığı için Türkçe karakterlerde eksik kalır.
 * @param {string} str
 * @returns {number}
 */
export const utf8Bytes = (str) => {
  if (typeof str !== 'string') return 0;
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      // Vekil çift: tek kod noktası, 4 bayt
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
};

/**
 * Bir sayının JSON'daki ondalık basamak sayısı (123.456 → 3, 12 → 0).
 * Üslü gösterim (1e-7) çok küçük sayılarda çıkar; basamak sayısı mantis + üs olarak hesaplanır.
 * @param {number} value
 * @returns {number}
 */
export const decimalsOf = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const text = String(value);
  const expIndex = text.indexOf('e-');
  if (expIndex !== -1) {
    const mantissa = text.slice(0, expIndex);
    const dot = mantissa.indexOf('.');
    const mantissaDecimals = dot === -1 ? 0 : mantissa.length - dot - 1;
    return mantissaDecimals + Number(text.slice(expIndex + 2));
  }
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
};

/** Boş istatistik kabı */
export const createStrokeStats = () => ({
  strokes: 0,
  points: 0,
  strokeBytes: 0,
  dBytes: 0,
  pointsBytes: 0,
  // points dizisi timestamp olmadan ({x,y}) kaç bayt tutardı
  pointsNoTsBytes: 0,
  // points dizisi koordinatlar 2 basamağa yuvarlansa kaç bayt tutardı (timestamp korunur)
  pointsRounded2Bytes: 0,
  coords: 0,
  decimalsSum: 0,
  decimalsMax: 0,
  // ondalık basamak dağılımı: 0, 1-2, 3-6, 7+
  decimalsHist: [0, 0, 0, 0],
});

const round2 = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);

/**
 * Tek bir çizgiyi istatistiğe ekler.
 * @param {object} stats - createStrokeStats() çıktısı
 * @param {object} stroke
 */
export const addStroke = (stats, stroke) => {
  if (!stroke || typeof stroke !== 'object') return;
  const points = Array.isArray(stroke.points) ? stroke.points : [];
  stats.strokes += 1;
  stats.points += points.length;
  stats.strokeBytes += utf8Bytes(JSON.stringify(stroke));
  stats.dBytes += typeof stroke.d === 'string' ? utf8Bytes(stroke.d) : 0;
  stats.pointsBytes += utf8Bytes(JSON.stringify(points));
  stats.pointsNoTsBytes += utf8Bytes(
    JSON.stringify(points.map((p) => (p && typeof p === 'object' ? { x: p.x, y: p.y } : p)))
  );
  stats.pointsRounded2Bytes += utf8Bytes(
    JSON.stringify(
      points.map((p) => (p && typeof p === 'object' ? { ...p, x: round2(p.x), y: round2(p.y) } : p))
    )
  );
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p || typeof p !== 'object') continue;
    for (const v of [p.x, p.y]) {
      if (typeof v !== 'number') continue;
      const dec = decimalsOf(v);
      stats.coords += 1;
      stats.decimalsSum += dec;
      if (dec > stats.decimalsMax) stats.decimalsMax = dec;
      const bucket = dec === 0 ? 0 : dec <= 2 ? 1 : dec <= 6 ? 2 : 3;
      stats.decimalsHist[bucket] += 1;
    }
  }
};

/** İki istatistiği toplar (hedef yerinde güncellenir) */
export const mergeStrokeStats = (target, source) => {
  Object.keys(target).forEach((k) => {
    if (k === 'decimalsMax') target[k] = Math.max(target[k], source[k]);
    else if (k === 'decimalsHist') target[k] = target[k].map((n, i) => n + source[k][i]);
    else target[k] += source[k];
  });
  return target;
};

/**
 * Bir anahtarın ayrıştırılmış değerinden ölçülecek "sayfa" listesini çıkarır.
 * Kapak çizimleri ayrı bir sahte sayfa olarak sayılır (onlar da çizgi tutar).
 * @param {string} key
 * @param {any} parsed
 * @returns {Array<{ label: string, page: object }>}
 */
export const collectPages = (key, parsed) => {
  const out = [];
  const fromNotebook = (nb, prefix) => {
    if (!nb || typeof nb !== 'object') return;
    if (Array.isArray(nb.coverDrawings) && nb.coverDrawings.length > 0) {
      out.push({ label: `${prefix}/kapak`, page: { drawings: nb.coverDrawings } });
    }
    (Array.isArray(nb.pages) ? nb.pages : []).forEach((page, i) => {
      out.push({ label: `${prefix}/s${i + 1}`, page });
    });
  };
  if (key === PAGES_KEY && Array.isArray(parsed)) {
    parsed.forEach((page, i) => out.push({ label: `${page?.category || 'sayfa'}/s${i + 1}`, page }));
  } else if (key === DIARY_KEY) {
    fromNotebook(parsed, 'gunluk');
  } else if (key === NOTEBOOKS_KEY && Array.isArray(parsed)) {
    parsed.forEach((nb, i) => fromNotebook(nb, `defter${i + 1}`));
  }
  return out;
};

/**
 * Bir sayfayı ölçer: toplam bayt, üst düzey alan dağılımı ve çizgi istatistiği.
 * @param {object} page
 */
export const analyzePage = (page) => {
  const stats = createStrokeStats();
  const drawings = Array.isArray(page?.drawings) ? page.drawings : [];
  drawings.forEach((s) => addStroke(stats, s));
  const fields = {};
  if (page && typeof page === 'object') {
    Object.keys(page).forEach((k) => {
      fields[k] = utf8Bytes(JSON.stringify(page[k]) || '');
    });
  }
  return { bytes: utf8Bytes(JSON.stringify(page) || ''), fields, stats };
};

/** Bayt değerini okunur yazar */
export const fmtBytes = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '?';
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${n}B`;
};

const pct = (part, whole) => (whole > 0 ? `%${((part / whole) * 100).toFixed(1)}` : '%?');

/**
 * Ses dizinini tarar.
 * @returns {Promise<{ exists: boolean, count: number, totalBytes: number, maxBytes: number, byExt: object, names: string[], error?: string }>}
 */
const scanAudioDir = async (fs, audioDir) => {
  const result = { exists: false, count: 0, totalBytes: 0, maxBytes: 0, byExt: {}, names: [] };
  try {
    const dirInfo = await fs.getInfoAsync(audioDir);
    if (!dirInfo.exists) return result;
    result.exists = true;
    const names = await fs.readDirectoryAsync(audioDir);
    for (const name of names) {
      const info = await fs.getInfoAsync(`${audioDir}${name}`, { size: true });
      if (!info.exists || info.isDirectory) continue;
      const size = typeof info.size === 'number' ? info.size : 0;
      const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || '?').toLowerCase();
      result.count += 1;
      result.totalBytes += size;
      if (size > result.maxBytes) result.maxBytes = size;
      result.byExt[ext] = (result.byExt[ext] || 0) + 1;
      result.names.push(name);
    }
  } catch (error) {
    result.error = String(error?.message || error);
  }
  return result;
};

/**
 * Android'de AsyncStorage'ın SQLite dosyasının diskteki boyutu. 6 MB sınırı
 * dosyanın SAYFA sayısına uygulanır (SQLiteDatabase.setMaximumSize), yani asıl
 * ölçü değerlerin toplamı değil bu dosyadır.
 */
const readDbFileSizes = async (fs) => {
  const base = String(fs.documentDirectory || '');
  if (!base.endsWith('/files/')) return { error: `beklenmeyen documentDirectory: ${base}` };
  const dbDir = base.slice(0, -'files/'.length) + 'databases/';
  const out = {};
  for (const name of ['RKStorage', 'RKStorage-journal', 'RKStorage-wal']) {
    try {
      const info = await fs.getInfoAsync(`${dbDir}${name}`, { size: true });
      out[name] = info.exists ? info.size : null;
    } catch (error) {
      out[name] = `hata: ${String(error?.message || error)}`;
    }
  }
  return out;
};

/**
 * Tüm ölçümü bir kez çalıştırır. Bağımlılıklar test için enjekte edilebilir.
 *
 * @param {object} [deps]
 * @returns {Promise<{ lines: string[], summary: string }>}
 */
export const runStorageDiagnostics = async (deps = {}) => {
  const storage = deps.AsyncStorage || AsyncStorage;
  const fs = deps.FileSystem || FileSystem;
  const audioDir = deps.audioDir || AUDIO_DIR;
  const platform = deps.platform || Platform.OS;
  const log = deps.dlog || dlog;
  const startedAt = Date.now();
  const lines = [];
  const emit = (label, data) => {
    log(label, data);
    lines.push(
      `${label} ` +
        Object.entries(data)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')
    );
  };

  emit('storage:start', { stamp: BUILD_STAMP, platform });

  // ── a) Anahtar boyutları ──
  let keys = [];
  try {
    keys = [...(await storage.getAllKeys())].sort();
  } catch (error) {
    emit('storage:keysError', { error: String(error?.message || error) });
  }

  let totalBytes = 0;
  const parsedByKey = {};
  for (const key of keys) {
    try {
      const value = await storage.getItem(key);
      const bytes = utf8Bytes(key) + utf8Bytes(value || '');
      totalBytes += bytes;
      emit('storage:key', {
        key,
        bytes,
        size: fmtBytes(bytes),
        ofCursorWindow: pct(bytes, CURSOR_WINDOW_BYTES),
      });
      if (value && (key === PAGES_KEY || key === DIARY_KEY || key === NOTEBOOKS_KEY)) {
        try {
          parsedByKey[key] = JSON.parse(value);
        } catch (error) {
          emit('storage:parseError', { key, error: String(error?.message || error) });
        }
      }
    } catch (error) {
      // Android'de ~2 MB'ı aşan satır burada "Row too big to fit into CursorWindow" ile düşer
      emit('storage:readError', { key, error: String(error?.message || error) });
    }
  }
  emit('storage:total', {
    keys: keys.length,
    valuesBytes: totalBytes,
    size: fmtBytes(totalBytes),
    ofAndroidDbLimit: pct(totalBytes, ANDROID_DB_LIMIT_BYTES),
  });

  if (platform === 'android') {
    const db = await readDbFileSizes(fs);
    const main = typeof db.RKStorage === 'number' ? db.RKStorage : null;
    emit('storage:dbFile', {
      ...Object.fromEntries(Object.entries(db).map(([k, v]) => [k, typeof v === 'number' ? v : String(v)])),
      ofAndroidDbLimit: main === null ? '?' : pct(main, ANDROID_DB_LIMIT_BYTES),
    });
  }

  // ── b, c) Sayfa ve çizgi ölçümü ──
  const overall = createStrokeStats();
  let largest = null;
  let pageCount = 0;
  let maxStrokesPerPage = 0;
  const referencedAudio = new Set();
  Object.keys(parsedByKey).forEach((key) => {
    const keyStats = createStrokeStats();
    const pages = collectPages(key, parsedByKey[key]);
    pages.forEach(({ label, page }) => {
      const analyzed = analyzePage(page);
      pageCount += 1;
      mergeStrokeStats(keyStats, analyzed.stats);
      if (analyzed.stats.strokes > maxStrokesPerPage) maxStrokesPerPage = analyzed.stats.strokes;
      if (!largest || analyzed.bytes > largest.bytes) largest = { key, label, ...analyzed };
      (Array.isArray(page?.audioNotes) ? page.audioNotes : []).forEach((n) => {
        if (n?.fileName) referencedAudio.add(n.fileName);
      });
    });
    mergeStrokeStats(overall, keyStats);
    emit('storage:strokesByKey', {
      key,
      pages: pages.length,
      strokes: keyStats.strokes,
      points: keyStats.points,
      strokeBytes: fmtBytes(keyStats.strokeBytes),
    });
  });

  if (largest) {
    const fieldList = Object.entries(largest.fields)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k}:${fmtBytes(v)}`)
      .join(',');
    emit('storage:largestPage', {
      key: largest.key,
      page: largest.label,
      bytes: largest.bytes,
      size: fmtBytes(largest.bytes),
      ofCursorWindow: pct(largest.bytes, CURSOR_WINDOW_BYTES),
      strokes: largest.stats.strokes,
      points: largest.stats.points,
      fields: fieldList,
    });
  }

  const s = overall;
  emit('storage:strokes', {
    pages: pageCount,
    strokes: s.strokes,
    avgStrokesPerPage: pageCount ? (s.strokes / pageCount).toFixed(1) : 0,
    maxStrokesPerPage,
    avgPointsPerStroke: s.strokes ? (s.points / s.strokes).toFixed(1) : 0,
    bytesPerPoint: s.points ? (s.strokeBytes / s.points).toFixed(1) : 0,
  });
  emit('storage:dVsPoints', {
    strokeBytes: fmtBytes(s.strokeBytes),
    dBytes: fmtBytes(s.dBytes),
    dShare: pct(s.dBytes, s.strokeBytes),
    pointsBytes: fmtBytes(s.pointsBytes),
    pointsShare: pct(s.pointsBytes, s.strokeBytes),
    timestampShare: pct(s.pointsBytes - s.pointsNoTsBytes, s.strokeBytes),
    pointsIfRounded2: fmtBytes(s.pointsRounded2Bytes),
  });
  emit('storage:decimals', {
    coords: s.coords,
    avg: s.coords ? (s.decimalsSum / s.coords).toFixed(1) : 0,
    max: s.decimalsMax,
    'h0': s.decimalsHist[0],
    'h1-2': s.decimalsHist[1],
    'h3-6': s.decimalsHist[2],
    'h7+': s.decimalsHist[3],
  });

  // ── d) Ses dosyaları ──
  const audio = await scanAudioDir(fs, audioDir);
  const onDisk = new Set(audio.names);
  emit('storage:audio', {
    dirExists: audio.exists,
    files: audio.count,
    total: fmtBytes(audio.totalBytes),
    largest: fmtBytes(audio.maxBytes),
    ext: Object.entries(audio.byExt)
      .map(([k, v]) => `${k}:${v}`)
      .join(',') || '-',
    referenced: referencedAudio.size,
    missingFiles: [...referencedAudio].filter((n) => !onDisk.has(n)).length,
    unreferencedFiles: audio.names.filter((n) => !referencedAudio.has(n)).length,
    ...(audio.error ? { error: audio.error } : {}),
  });

  emit('storage:done', { ms: Date.now() - startedAt });

  return { lines, summary: lines.join('\n') };
};

export default { runStorageDiagnostics };
