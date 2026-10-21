/**
 * ⚠️ GEÇİCİ — TEŞHİS — KALDIRILACAK (bkz. utils/diagnosticLog.js listesi)
 *
 * `storage:write`: AsyncStorage'a yapılan HER setItem için TEK satır.
 *
 *   key          anahtar
 *   source       tetikleyen işlem: StorageService metodu + değişen alanlar
 *                (ör. updateNotebookPage[drawings], updateNotebookMeta[lastPageIndex]).
 *                StorageService dışından gelen yazmalar (tema/renk/tercih) 'direct'.
 *   hash         yükün cyrb53 özeti (utils/storageBackup ile aynı fonksiyon)
 *   same         aynı anahtara bir önceki yazmayla hash AYNI mı (1/0, ilk yazmada '-')
 *   sameNoTs     "updatedAt" alanları çıkarıldığında aynı mı: yalnızca zaman damgası
 *                farklı olan (içeriği aynı) yazmayı ayırır
 *   sinceMs      aynı anahtara önceki yazmadan bu yana geçen süre
 *   bytes, chars yükün UTF-8 bayt ve karakter uzunluğu
 *   penParse     okuma sonrası JSON.parse sırasında kalem basılı mıydı (1/0, okumasızsa '-')
 *   penStr       JSON.stringify sırasında kalem basılı mıydı
 *   readMs parseMs stringifyMs setItemMs   (eski storage:flushCost alanları, aynı anlam)
 *   diagMs       bu satırı üretmenin kendi maliyeti (hash + bayt sayımı). Ölçümü
 *                bozmasın diye setItem BİTTİKTEN sonra hesaplanır.
 *   ok           setItem başarılı mı (başarısızsa satır yine yazılır, ok=0)
 *
 * Yöntem: AsyncStorage.setItem bir kez sarılır. StorageService yazmadan hemen
 * önce bağlamı (kaynak, okuma/ayrıştırma süreleri) setWriteContext ile bırakır;
 * sarmalayıcı aynı senkron çağrıda alır. Sıcak yolda (çizim) log YOK; satır
 * yalnızca yazma bitince yazılır.
 *
 * Ayrıca perf:pageAdd / perf:postStroke için toplam yazma sayısı ve baytı tutar.
 */
import { checksum, utf8Bytes } from './storageBackup';
import { dlog, nowMs } from './diagnosticLog';
import { isPenDown } from './penActivity';

const UPDATED_AT_RE = /"updatedAt":"[^"]*"/g;

/**
 * Bağımlılıkları dışarıdan alan saf fabrika (test için).
 * @param {object} deps - { checksum, utf8Bytes, dlog, nowMs, isPenDown }
 */
export const createWriteProbe = (deps) => {
  let pendingContext = null;
  const lastByKey = new Map();
  const stats = { started: 0, finished: 0, bytes: 0 };

  /** StorageService: setItem'dan HEMEN önce çağrılır (aynı senkron akış) */
  const setWriteContext = (context) => {
    pendingContext = context;
  };

  /** perf:* ölçümleri için kümülatif sayaçlar (kopya) */
  const getWriteStats = () => ({ ...stats, inFlight: stats.started - stats.finished });

  const describe = (key, value, context, setItemMs, ok) => {
    const t0 = deps.nowMs();
    const text = typeof value === 'string' ? value : String(value);
    const hash = deps.checksum(text);
    const hashNoTs = text.indexOf('"updatedAt"') === -1 ? hash : deps.checksum(text.replace(UPDATED_AT_RE, ''));
    const bytes = deps.utf8Bytes(text);
    const prev = lastByKey.get(key);
    const at = deps.nowMs();
    if (ok) lastByKey.set(key, { hash, hashNoTs, at });
    const fmt = (n) => (typeof n === 'number' ? n.toFixed(1) : '-');
    const flag = (b) => (b === undefined || b === null ? '-' : b ? 1 : 0);
    return {
      bytes,
      line: {
        key,
        source: context.source,
        hash,
        same: prev ? (prev.hash === hash ? 1 : 0) : '-',
        sameNoTs: prev ? (prev.hashNoTs === hashNoTs ? 1 : 0) : '-',
        sinceMs: prev ? Math.round(at - prev.at) : '-',
        bytes,
        chars: text.length,
        penParse: flag(context.penParse),
        penStr: flag(context.penStr),
        readMs: fmt(context.readMs),
        parseMs: fmt(context.parseMs),
        stringifyMs: fmt(context.stringifyMs),
        setItemMs: fmt(setItemMs),
        diagMs: (deps.nowMs() - t0).toFixed(1),
        ok: ok ? 1 : 0,
      },
    };
  };

  /**
   * AsyncStorage.setItem'ı bir kez sarar. Sarmalayıcı yazmanın SONUCUNU
   * değiştirmez: orijinalin döndürdüğü promise aynen döner, hata aynen fırlar.
   * Teşhis kodu hata verirse yalnızca uyarı yazılır, yazma etkilenmez.
   */
  const install = (storage) => {
    if (!storage || storage.__ajandaWriteProbe) return;
    const original = storage.setItem;
    if (typeof original !== 'function') return;
    const wrapped = function probedSetItem(key, value, ...rest) {
      // StorageService disindan gelen yazmada kalem durumu cagri aninda okunur
      const context = pendingContext || { source: 'direct', penStr: deps.isPenDown() };
      pendingContext = null;
      stats.started += 1;
      const t0 = deps.nowMs();
      const finish = (ok) => {
        stats.finished += 1;
        try {
          const { bytes, line } = describe(key, value, context, deps.nowMs() - t0, ok);
          if (ok) stats.bytes += bytes;
          deps.dlog('storage:write', line);
        } catch (e) {
          console.warn('[storage:write] teshis satiri uretilemedi:', e);
        }
      };
      let result;
      try {
        result = original.call(storage, key, value, ...rest);
      } catch (error) {
        finish(false);
        throw error;
      }
      return Promise.resolve(result).then(
        (v) => {
          finish(true);
          return v;
        },
        (error) => {
          finish(false);
          throw error;
        }
      );
    };
    storage.setItem = wrapped;
    storage.__ajandaWriteProbe = true;
  };

  return { install, setWriteContext, getWriteStats };
};

const probe = createWriteProbe({ checksum, utf8Bytes, dlog, nowMs, isPenDown });

export const installWriteProbe = probe.install;
export const setWriteContext = probe.setWriteContext;
export const getWriteStats = probe.getWriteStats;
