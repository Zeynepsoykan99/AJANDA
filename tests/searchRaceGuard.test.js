/**
 * searchRaceGuard.test.js
 *
 * G1: Arama debounce zamanlayicisinin unmount'ta temizlenmesi.
 * G2: Yavas biten ESKI bir aramanin, daha yeni ve dogru sonucun uzerine
 *     yazmasini engelleyen istek kimligi (request-id) korumasi.
 *
 * Yontem: once korumasiz halin gercekten yanlis sonuc gosterdigi kanitlanir,
 * sonra kaynaktaki GERCEK executeSearch fonksiyonu cikarilip ayni senaryoda
 * calistirilir.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const MODAL_PATH = path.join(__dirname, '..', 'components', 'ui', 'GlobalSearchModal.js');
const source = fs.readFileSync(MODAL_PATH, 'utf8');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('--- Arama Yarisi (Race) Koruma Testleri ---');

/** Sorguya gore farkli gecikmeyle donen sahte arama motoru */
const createSearchEngine = () => ({
  async searchAllData(query) {
    // "eski" sorgusu yavas, "yeni" sorgusu hizli doner
    await wait(query === 'eski' ? 60 : 10);
    return [{ query, label: 'sonuc: ' + query }];
  },
});

(async () => {
  // ─── Test 1: KORUMASIZ hal eski sonucu yeninin uzerine yaziyor ─────
  {
    const engine = createSearchEngine();
    let results = [];

    const unguardedSearch = async (text) => {
      const found = await engine.searchAllData(text);
      results = found; // kimlik denetimi yok
    };

    // Kullanici once "eski" yazip sonra "yeni" yaziyor
    const a = unguardedSearch('eski'); // 60 ms surer
    await wait(5);
    const b = unguardedSearch('yeni'); // 10 ms surer, ONCE biter

    await Promise.all([a, b]);

    assert.strictEqual(
      results[0].query,
      'eski',
      'korumasiz halde gec biten ESKI arama, yeninin uzerine yazmali (hatanin kaniti)'
    );
    console.log('OK Test 1: korumasiz arama gercekten eski sonucu ekranda birakiyor');
  }

  // ─── Gercek executeSearch'i kaynaktan cikar ──────────────────────
  const fnDecl = /const executeSearch = useCallback\(\s*async \(text, cat\) => \{[\s\S]*?\n    \},\s*\[\]\s*\);/.exec(
    source
  );
  assert.ok(fnDecl, 'executeSearch kaynakta bulunmali');

  const buildRealSearch = (engine, state) => {
    const body = fnDecl[0]
      .replace('const executeSearch = useCallback(', 'const executeSearch = (')
      .replace(/,\s*\[\]\s*\);$/, ');');

    // eslint-disable-next-line no-new-func
    return new Function(
      'searchAllData',
      'setResults',
      'setHasSearched',
      'searchRequestIdRef',
      'cachedPagesRef',
      'cachedCoverRef',
      'cachedDiaryRef',
      'cachedNotebooksRef',
      body + '\nreturn executeSearch;'
    )(
      engine.searchAllData,
      (v) => {
        state.results = v;
      },
      (v) => {
        state.hasSearched = v;
      },
      state.requestIdRef,
      { current: null },
      { current: null },
      { current: null },
      { current: null }
    );
  };

  // ─── Test 2: DUZELTILMIS kod eski sonucu yok sayiyor ───────────────
  {
    const engine = createSearchEngine();
    const state = { results: [], hasSearched: false, requestIdRef: { current: 0 } };
    const executeSearch = buildRealSearch(engine, state);

    const a = executeSearch('eski', 'all'); // yavas
    await wait(5);
    const b = executeSearch('yeni', 'all'); // hizli

    await Promise.all([a, b]);

    assert.strictEqual(
      state.results[0].query,
      'yeni',
      'Duzeltilmis kodda ekranda EN SON aramanin sonucu kalmali'
    );
    console.log('OK Test 2: gec biten eski arama sonucu yok sayiliyor');
  }

  // ─── Test 3: Alan temizlenince eski arama bos ekranin uzerine yazmamali ──
  {
    const engine = createSearchEngine();
    const state = { results: [], hasSearched: false, requestIdRef: { current: 0 } };
    const executeSearch = buildRealSearch(engine, state);

    const a = executeSearch('eski', 'all'); // yavas, 60 ms
    await wait(5);
    await executeSearch('', 'all'); // kullanici alani temizledi -> senkron bos donus

    assert.deepStrictEqual(state.results, [], 'temizleme sonrasi sonuclar bos olmali');

    await a; // yavas arama simdi tamamlaniyor

    assert.deepStrictEqual(
      state.results,
      [],
      'Alan temizlendikten sonra eski arama sonucu bos ekranin uzerine YAZMAMALI'
    );
    assert.strictEqual(state.hasSearched, false);
    console.log('OK Test 3: alan temizlendikten sonra eski sonuc geri gelmiyor');
  }

  // ─── Test 4: Normal tek arama hala calisiyor (asiri koruma yok) ────
  {
    const engine = createSearchEngine();
    const state = { results: [], hasSearched: false, requestIdRef: { current: 0 } };
    const executeSearch = buildRealSearch(engine, state);

    await executeSearch('yeni', 'all');
    assert.strictEqual(state.results[0].query, 'yeni', 'Tek arama sonucu ekrana yazilmali');
    assert.strictEqual(state.hasSearched, true);
    console.log('OK Test 4: tek arama normal calisiyor, koruma fazla agresif degil');
  }

  runSourceChecks();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

function runSourceChecks() {
  // --- Test 5: G2 korumasi kaynakta ---
  assert.ok(
    /const searchRequestIdRef = useRef\(0\);/.test(source),
    'Istek kimligi ref\'i tanimli olmali'
  );
  assert.ok(
    /const requestId = \+\+searchRequestIdRef\.current;/.test(source),
    'Kimlik executeSearch basinda artirilmali'
  );
  assert.ok(
    /if \(requestId !== searchRequestIdRef\.current\) return;/.test(source),
    'await sonrasi kimlik denetimi yapilmali'
  );

  // Kimlik artisi, bos metin dalindan ONCE olmali
  const fnBody = /const executeSearch = useCallback\([\s\S]*?\n    \},\s*\[\]\s*\);/.exec(source)[0];
  const idIndex = fnBody.indexOf('++searchRequestIdRef.current');
  const emptyIndex = fnBody.indexOf('if (!trimmed)');
  assert.ok(
    idIndex > -1 && emptyIndex > -1 && idIndex < emptyIndex,
    'Kimlik artisi bos metin kontrolunden ONCE olmali (temizleme de eski aramalari gecersiz kilsin)'
  );
  console.log('OK Test 5: istek kimligi korumasi kaynakta ve dogru sirada');

  // --- Test 6: G1 unmount temizligi ---
  assert.ok(
    /useEffect\(\s*\n\s*\(\) => \(\) => \{\s*\n\s*if \(searchTimeoutRef\.current\) clearTimeout\(searchTimeoutRef\.current\);/.test(
      source
    ),
    'searchTimeoutRef unmount\'ta temizlenmeli'
  );
  console.log('OK Test 6: debounce zamanlayicisi unmount\'ta temizleniyor');

  // --- Test 7: Modal her acilista eski aramalari gecersiz kilmali ---
  assert.ok(
    /if \(visible\) \{\s*\n\s*\/\/[^\n]*\n\s*searchRequestIdRef\.current \+= 1;/.test(source),
    'Modal acilisinda kimlik artirilmali (onceki oturumdan kalan arama sizmasin)'
  );
  console.log('OK Test 7: modal acilisinda onceki oturumun aramalari gecersiz kiliniyor');

  console.log('--- TUM ARAMA YARISI TESTLERI BASARIYLA GECTI! ---');
}
