/**
 * screenHarness.js — Ekranlari GERCEK React ile calistirmak icin test duzenegi
 *
 * Neden: Cift yazma gibi hatalar ekranin effect/zamanlayici ETKILESIMINDEN
 * dogar; fonksiyonu kaynaktan cikarip tek basina calistirmak bunu gostermez.
 * Burada ekran bileseni (ve depolama servisi) GERCEK kaynaktan yuklenir,
 * gercek React 19 + react-dom ile render edilir; yalnizca yerel (native)
 * bilesenler ve cihaz servisleri sahtedir.
 *
 * Bilesenler:
 *   - Kucuk sahte DOM (react-dom'un ihtiyac duydugu kadar)
 *   - Sahte saat: setTimeout/clearTimeout/requestAnimationFrame YALNIZCA yuklenen
 *     modullerin kapsamina enjekte edilir; React'in kendi zamanlayicisi gercek kalir.
 *   - Modul yukleyici: kaynak calisma agacindan VEYA bir git surumunden okunur
 *     (`rev`), babel ile CommonJS'e cevrilir. `real` listesindeki dosyalar gercek,
 *     digerleri sahte (bilesenler: cocuklarini ciz; servisler: verilen sahte).
 *
 * KAPSAMADIGI: yerel cizim/yerlesim (UI thread), gercek AsyncStorage/SQLite,
 * Hermes zamanlamasi. Sayilar (yazma sayisi, render sayisi) gercektir;
 * sureler anlamsizdir.
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

// ─── Sahte DOM ──────────────────────────────────────────────────────────
class FakeNode {
  constructor(nodeType, nodeName, ownerDocument) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.tagName = nodeName;
    this.ownerDocument = ownerDocument;
    this.childNodes = [];
    this.parentNode = null;
    this.style = {};
    this.namespaceURI = 'http://www.w3.org/1999/xhtml';
    this.attributes = {};
  }
  get firstChild() {
    return this.childNodes[0] || null;
  }
  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] || null;
  }
  get nextSibling() {
    if (!this.parentNode) return null;
    const list = this.parentNode.childNodes;
    return list[list.indexOf(this) + 1] || null;
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }
  insertBefore(child, ref) {
    if (!ref) return this.appendChild(child);
    if (child.parentNode) child.parentNode.removeChild(child);
    const index = this.childNodes.indexOf(ref);
    this.childNodes.splice(index < 0 ? this.childNodes.length : index, 0, child);
    child.parentNode = this;
    return child;
  }
  removeChild(child) {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  get textContent() {
    if (this.nodeType === 3 || this.nodeType === 8) return this.nodeValue;
    return this.childNodes.map((c) => c.textContent).join('');
  }
  set textContent(value) {
    if (this.nodeType === 3 || this.nodeType === 8) {
      this.nodeValue = value;
      return;
    }
    this.childNodes.forEach((c) => {
      c.parentNode = null;
    });
    this.childNodes = [];
    if (value !== '' && value != null) {
      this.appendChild(this.ownerDocument.createTextNode(String(value)));
    }
  }
  addEventListener() {}
  removeEventListener() {}
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
  }
  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name);
  }
  contains(node) {
    let n = node;
    while (n) {
      if (n === this) return true;
      n = n.parentNode;
    }
    return false;
  }
  getRootNode() {
    let n = this;
    while (n.parentNode) n = n.parentNode;
    return n;
  }
}

const installFakeDom = () => {
  if (global.__AJANDA_FAKE_DOM__) return;
  const doc = new FakeNode(9, '#document', null);
  doc.ownerDocument = null;
  doc.createElement = (tag) => new FakeNode(1, String(tag).toUpperCase(), doc);
  doc.createElementNS = (ns, tag) => {
    const el = new FakeNode(1, String(tag).toUpperCase(), doc);
    el.namespaceURI = ns;
    return el;
  };
  doc.createTextNode = (text) => {
    const t = new FakeNode(3, '#text', doc);
    t.nodeValue = text;
    return t;
  };
  doc.createComment = (text) => {
    const c = new FakeNode(8, '#comment', doc);
    c.nodeValue = text;
    return c;
  };
  doc.documentElement = doc.createElement('html');
  doc.body = doc.createElement('body');
  doc.documentElement.appendChild(doc.body);
  doc.appendChild(doc.documentElement);
  doc.activeElement = doc.body;
  doc.defaultView = global;
  global.window = global;
  global.document = doc;
  if (!global.navigator) {
    Object.defineProperty(global, 'navigator', { value: { userAgent: 'node' }, configurable: true });
  }
  class HTMLElement {}
  global.HTMLElement = HTMLElement;
  global.HTMLIFrameElement = class HTMLIFrameElement extends HTMLElement {};
  global.Element = HTMLElement;
  global.Node = FakeNode;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.__AJANDA_FAKE_DOM__ = true;
};

// ─── Sahte saat ─────────────────────────────────────────────────────────
const createClock = () => {
  let now = 0;
  let nextId = 1;
  const timers = new Map(); // id -> { at, fn, args, interval }
  const setTimeoutFake = (fn, ms = 0, ...args) => {
    const id = nextId++;
    timers.set(id, { at: now + Math.max(0, Number(ms) || 0), fn, args, seq: id });
    return id;
  };
  const clearTimeoutFake = (id) => {
    timers.delete(id);
  };
  const setIntervalFake = (fn, ms = 0, ...args) => {
    const id = nextId++;
    timers.set(id, { at: now + Math.max(1, Number(ms) || 1), fn, args, seq: id, interval: Math.max(1, Number(ms) || 1) });
    return id;
  };
  const rafFake = (fn) => setTimeoutFake(() => fn(now), 16);
  /** Zamani ileri alir; vadesi gelen zamanlayicilari SIRAYLA calistirir */
  const advance = (ms) => {
    const target = now + ms;
    for (;;) {
      let due = null;
      timers.forEach((t, id) => {
        if (t.at <= target && (!due || t.at < due.t.at || (t.at === due.t.at && t.seq < due.t.seq))) {
          due = { id, t };
        }
      });
      if (!due) break;
      // stall() sonrasi vadesi gecmis zamanlayicilar "simdi" calisir (JS mesguldu)
      now = Math.max(now, due.t.at);
      if (due.t.interval) {
        due.t.at = now + due.t.interval;
        due.t.seq = nextId++;
      } else {
        timers.delete(due.id);
      }
      due.t.fn(...due.t.args);
    }
    now = target;
  };
  return {
    setTimeout: setTimeoutFake,
    clearTimeout: clearTimeoutFake,
    setInterval: setIntervalFake,
    clearInterval: clearTimeoutFake,
    requestAnimationFrame: rafFake,
    cancelAnimationFrame: clearTimeoutFake,
    advance,
    /** JS'in ms boyunca mesgul oldugunu taklit eder: saat ilerler, zamanlayici CALISMAZ */
    stall: (ms) => {
      now += ms;
    },
    now: () => now,
    pending: () => timers.size,
  };
};

// ─── Modul yukleyici ────────────────────────────────────────────────────
const babel = require('@babel/core');

const transform = (source, filename) =>
  babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    filename,
    presets: [[require.resolve('@babel/preset-react'), { runtime: 'automatic' }]],
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  }).code;

const readSource = (relPath, rev) => {
  if (!rev) return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  return execSync(`git show "${rev}:${relPath}"`, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
};

const toPosix = (p) => p.split(path.sep).join('/');

/**
 * Bilinmeyen modul icin sahte: her adlandirilmis disa aktarma, cocuklarini
 * cizen bir bilesendir (fonksiyon olarak da cagrilabilir, undefined doner).
 */
const createAutoMock = (React, name) => {
  const make = (exportName) => {
    const C = (props) => (props && props.children !== undefined ? React.createElement(React.Fragment, null, props.children) : null);
    C.displayName = `Mock(${name}:${exportName})`;
    return C;
  };
  const cache = {};
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === '__esModule') return true;
        if (typeof prop === 'symbol') return undefined;
        if (!cache[prop]) cache[prop] = make(prop);
        return cache[prop];
      },
    }
  );
};

/**
 * @param {object} opts
 * @param {string} [opts.rev] - git surumu (yoksa calisma agaci)
 * @param {string[]} opts.real - gercek yuklenecek dosyalar (kokten goreli, posix)
 * @param {object} opts.mocks - { 'paket-adi' | 'kok/goreli/yol.js': exports }
 * @param {object} opts.globals - yuklenen her modulun kapsamina enjekte edilir
 */
const createLoader = ({ rev, real = [], mocks = {}, globals = {} }) => {
  const React = require('react');
  const realSet = new Set(real);
  const cache = new Map();
  const autoMocks = new Map();

  const resolveRelative = (fromRel, spec) => {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
    if (/\.[a-z0-9]+$/i.test(base)) return base;
    const candidates = [`${base}.js`, `${base}/index.js`];
    for (const c of candidates) {
      if (realSet.has(c) || Object.prototype.hasOwnProperty.call(mocks, c)) return c;
    }
    // Sahtelenecek modulun gercek yolu onemli degil; yalnizca anahtar olarak kullanilir
    return candidates[0];
  };

  const load = (relPath) => {
    if (cache.has(relPath)) return cache.get(relPath).exports;
    const source = readSource(relPath, rev);
    const code = transform(source, relPath);
    const module = { exports: {} };
    cache.set(relPath, module);
    const localRequire = (spec) => requireFrom(relPath, spec);
    const names = Object.keys(globals);
    // eslint-disable-next-line no-new-func
    new Function('module', 'exports', 'require', ...names, code)(
      module,
      module.exports,
      localRequire,
      ...names.map((n) => globals[n])
    );
    return module.exports;
  };

  const requireFrom = (fromRel, spec) => {
    if (spec === 'react' || spec.startsWith('react/') || spec === 'react-dom' || spec.startsWith('react-dom/')) {
      return require(spec);
    }
    if (spec.startsWith('.')) {
      const target = resolveRelative(fromRel, spec);
      if (/\.(webp|png|jpg|jpeg|ttf|otf|mp3|m4a)$/i.test(target)) return 1;
      if (Object.prototype.hasOwnProperty.call(mocks, target)) return mocks[target];
      if (realSet.has(target)) return load(target);
      if (!autoMocks.has(target)) autoMocks.set(target, createAutoMock(React, target));
      return autoMocks.get(target);
    }
    if (Object.prototype.hasOwnProperty.call(mocks, spec)) return mocks[spec];
    if (!autoMocks.has(spec)) autoMocks.set(spec, createAutoMock(React, spec));
    return autoMocks.get(spec);
  };

  return { load, autoMocked: () => [...autoMocks.keys()] };
};

// ─── Sahte AsyncStorage ─────────────────────────────────────────────────
const createFakeAsyncStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  const writes = []; // { key, value, at }
  let clock = null;
  const api = {
    async getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    async setItem(key, value) {
      writes.push({ key, value, at: clock ? clock.now() : 0 });
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
    async multiRemove(keys) {
      keys.forEach((k) => data.delete(k));
    },
    async getAllKeys() {
      return [...data.keys()];
    },
  };
  return {
    api,
    data,
    writes,
    setClock: (c) => {
      clock = c;
    },
    writesFor: (key) => writes.filter((w) => w.key === key),
  };
};

/** Bekleyen mikro gorevleri (promise zincirleri) bosaltir */
const flushMicrotasks = async (rounds = 20) => {
  for (let i = 0; i < rounds; i++) {
    // setImmediate GERCEK: tum mikro gorevler ondan once biter
    await new Promise((resolve) => setImmediate(resolve));
  }
};

module.exports = {
  ROOT,
  installFakeDom,
  createClock,
  createLoader,
  createFakeAsyncStorage,
  flushMicrotasks,
  toPosix,
};
