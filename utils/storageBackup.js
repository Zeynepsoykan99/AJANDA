/**
 * ⚠️ GEÇİCİ ARAÇ — KALDIRILACAK (ama DOSYA BİÇİMİ kalıcı yedek özelliğinin temelidir)
 *
 * "Veriyi yedekle": tüm AsyncStorage anahtarlarını TEK bir dosyaya yazar
 * (documentDirectory/backups/), dosyayı geri okuyup doğrular. Ses dosyaları
 * kopyalanmaz; yalnızca adları ve boyutları manifest olarak yazılır.
 *
 * SALT OKUNUR: AsyncStorage'da hiçbir anahtarı yazmaz, değiştirmez, silmez.
 * Dosya sisteminde yalnızca backups/ altına yeni bir dosya yazar.
 *
 * ── Dosya biçimi (schemaVersion 1) ──────────────────────────────────────
 * {
 *   "format": "ajanda-backup",
 *   "schemaVersion": 1,
 *   "createdAt": "<ISO 8601>",
 *   "app": { "version": "<app.json version>", "platform": "android|ios|web" },
 *   "encryption": "none",
 *   "keys": {
 *     "<AsyncStorage anahtarı>": {
 *       "value": "<HAM değer metni, ayrıştırılmadan>",
 *       "bytes": <UTF-8 bayt>,
 *       "checksum": "<cyrb53 hex, bütünlük özeti — kriptografik DEĞİL>"
 *     }
 *   },
 *   "unreadableKeys": [ { "key": "...", "error": "..." } ],
 *   "audio": { "dir": "audio_notes/", "files": [ { "name": "...", "bytes": n } ], "error"?: "..." }
 * }
 * Değerler HAM metin olarak saklanır: geri yükleme birebir aynı baytları yazar ve
 * bozuk (ayrıştırılamayan) bir değer de olduğu gibi korunur.
 *
 * ── Bellek kararı ───────────────────────────────────────────────────────
 * Tek dosya istendiği ve expo-file-system/legacy'de ekleme (append) modu olmadığı
 * için dosya tek seferde yazılır. Bellek tepesini düşürmek için her anahtar okunur
 * okunmaz kendi JSON parçasına çevrilir ve ham değere referans TUTULMAZ; geriye
 * yalnızca parçalar ve (bayt, özet) kalır. Tepe ≈ parçalar + birleşik metin ≈ 2 × veri.
 * Android'de veri 6 MB veritabanı sınırıyla zaten sınırlı (≈ 15 MB tepe). iOS'ta bu
 * sınır yok; bu yüzden MAX_BACKUP_CHARS üstünde yazmadan durulur ve açıkça söylenir.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { AUDIO_DIR } from '../services/audioService';
import { shouldFailRead } from './storageFaultInjection';

export const BACKUP_FORMAT = 'ajanda-backup';
export const BACKUP_SCHEMA_VERSION = 1;
// Tek JSON metni için güvenlik sınırı (karakter). Aşılırsa yazılmaz.
export const MAX_BACKUP_CHARS = 64 * 1024 * 1024;

/** UTF-8 bayt uzunluğu */
export const utf8Bytes = (str) => {
  if (typeof str !== 'string') return 0;
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      bytes += 4;
      i += 1;
    } else bytes += 3;
  }
  return bytes;
};

/**
 * cyrb53: hızlı 53 bit metin özeti. Bütünlük denetimi içindir, kriptografik değildir.
 * @param {string} str
 * @returns {string} 14 haneli hex
 */
export const checksum = (str) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, '0');
};

const pad2 = (n) => String(n).padStart(2, '0');
const fileStamp = (d) =>
  `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;

/** Ses dizinini yalnızca listeler (dosyalar kopyalanmaz) */
const listAudio = async (fs, audioDir) => {
  const out = { dir: 'audio_notes/', files: [] };
  try {
    const info = await fs.getInfoAsync(audioDir);
    if (!info.exists) return out;
    const names = await fs.readDirectoryAsync(audioDir);
    for (const name of [...names].sort()) {
      const f = await fs.getInfoAsync(`${audioDir}${name}`, { size: true });
      if (f.exists && !f.isDirectory) out.files.push({ name, bytes: typeof f.size === 'number' ? f.size : null });
    }
  } catch (error) {
    out.error = String(error?.message || error);
  }
  return out;
};

/**
 * Yedek metnini ayrıştırıp biçimini denetler.
 * @param {string} text
 * @returns {object} yedek nesnesi
 * @throws biçim uygun değilse
 */
export const parseBackupText = (text) => {
  const obj = JSON.parse(text);
  if (!obj || obj.format !== BACKUP_FORMAT) throw new Error('yedek biçimi tanınmadı');
  if (obj.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(`desteklenmeyen schemaVersion: ${obj.schemaVersion}`);
  }
  if (!obj.keys || typeof obj.keys !== 'object') throw new Error('keys alanı yok');
  return obj;
};

/**
 * Yedekten anahtar → ham değer haritasını kurar (ileride geri yükleme bunu yazar).
 * Her değerin bayt ve özetini denetler.
 * @returns {Object<string,string>}
 * @throws bir değer manifestle uyuşmazsa
 */
export const extractKeyValues = (backup) => {
  const out = {};
  Object.keys(backup.keys).forEach((key) => {
    const entry = backup.keys[key];
    if (typeof entry?.value !== 'string') throw new Error(`${key}: değer metin değil`);
    if (utf8Bytes(entry.value) !== entry.bytes) throw new Error(`${key}: bayt boyutu uyuşmuyor`);
    if (checksum(entry.value) !== entry.checksum) throw new Error(`${key}: özet uyuşmuyor`);
    out[key] = entry.value;
  });
  return out;
};

/**
 * Yedeği alır, yazar ve doğrular.
 *
 * @param {object} [deps] - test için enjekte edilebilir bağımlılıklar
 * @returns {Promise<{
 *   ok: boolean, fileUri: string|null, verified: boolean, reason?: string,
 *   keyCount: number, totalBytes: number, unreadable: Array<{key,error}>,
 *   audioFiles: number, chars: number
 * }>}
 */
export const runStorageBackup = async (deps = {}) => {
  const storage = deps.AsyncStorage || AsyncStorage;
  const fs = deps.FileSystem || FileSystem;
  const audioDir = deps.audioDir || AUDIO_DIR;
  const failRead = deps.shouldFailRead || shouldFailRead;
  const maxChars = deps.maxChars || MAX_BACKUP_CHARS;
  const now = deps.now ? deps.now() : new Date();

  const result = {
    ok: false,
    fileUri: null,
    verified: false,
    keyCount: 0,
    totalBytes: 0,
    unreadable: [],
    audioFiles: 0,
    chars: 0,
  };

  let keys;
  try {
    keys = [...(await storage.getAllKeys())].sort();
  } catch (error) {
    result.reason = `anahtar listesi okunamadı: ${String(error?.message || error)}`;
    return result;
  }

  // Her anahtar okunur okunmaz JSON parçasına çevrilir; ham değer tutulmaz
  const fragments = [];
  const expected = [];
  for (const key of keys) {
    let value;
    try {
      // GECICI (teshis): __DEV__ hata enjeksiyonu acikken okunamayan anahtari taklit eder
      if (failRead(key)) throw new Error('[HATA ENJEKSİYONU] okuma hatası (simüle)');
      value = await storage.getItem(key);
    } catch (error) {
      result.unreadable.push({ key, error: String(error?.message || error) });
      continue;
    }
    if (typeof value !== 'string') continue; // anahtar arada silinmiş
    const entry = { value, bytes: utf8Bytes(value), checksum: checksum(value) };
    fragments.push(`${JSON.stringify(key)}:${JSON.stringify(entry)}`);
    expected.push({ key, bytes: entry.bytes, checksum: entry.checksum });
    result.totalBytes += entry.bytes;
  }
  result.keyCount = expected.length;

  const audio = await listAudio(fs, audioDir);
  result.audioFiles = audio.files.length;

  const head = {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: now.toISOString(),
    app: {
      version: deps.appVersion !== undefined ? deps.appVersion : Constants?.expoConfig?.version || null,
      platform: deps.platform || Platform.OS,
    },
    encryption: 'none',
  };
  const headText = JSON.stringify(head);
  const tail = `,"unreadableKeys":${JSON.stringify(result.unreadable)},"audio":${JSON.stringify(audio)}}`;
  const text = `${headText.slice(0, -1)},"keys":{${fragments.join(',')}}${tail}`;
  fragments.length = 0;
  result.chars = text.length;

  if (text.length > maxChars) {
    result.reason = `yedek çok büyük (${text.length} karakter > sınır ${maxChars}); yazılmadı`;
    return result;
  }

  const base = String(fs.documentDirectory || '');
  const dir = `${base}backups/`;
  const fileUri = `${dir}ajanda-backup-${fileStamp(now)}.json`;
  try {
    const dirInfo = await fs.getInfoAsync(dir);
    if (!dirInfo.exists) await fs.makeDirectoryAsync(dir, { intermediates: true });
    await fs.writeAsStringAsync(fileUri, text);
  } catch (error) {
    result.reason = `dosya yazılamadı: ${String(error?.message || error)}`;
    return result;
  }
  result.fileUri = fileUri;

  // Doğrulama: dosyayı GERİ OKU, anahtar sayısı + her anahtarın bayt ve özeti
  try {
    const back = parseBackupText(await fs.readAsStringAsync(fileUri));
    const values = extractKeyValues(back);
    const backKeys = Object.keys(values);
    if (backKeys.length !== expected.length) {
      throw new Error(`anahtar sayısı uyuşmuyor (dosyada ${backKeys.length}, beklenen ${expected.length})`);
    }
    expected.forEach(({ key, bytes, checksum: sum }) => {
      const entry = back.keys[key];
      if (!entry) throw new Error(`${key}: dosyada yok`);
      if (entry.bytes !== bytes || entry.checksum !== sum) throw new Error(`${key}: okunan değerle uyuşmuyor`);
    });
  } catch (error) {
    result.reason = `doğrulama başarısız: ${String(error?.message || error)}`;
    return result;
  }

  result.verified = true;
  result.ok = true;
  return result;
};

export default { runStorageBackup };
