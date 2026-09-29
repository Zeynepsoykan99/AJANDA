/**
 * undefinedIdentifiers.test.js
 *
 * Her kaynak dosyayi Babel ile ayristirip kapsam (scope) analizi yapar ve
 * HICBIR YERDE TANIMLI OLMAYAN tanimlayicilari bulur.
 *
 * Neden var: sesli not veri modeli gocunde `permanentUri` degiskeni `saved`
 * olarak yeniden adlandirilirken bir kullanim yeri gozden kacmisti. Kod
 * sozdizimi acisindan gecerli oldugu icin derleme denetimi yakalamadi; hata
 * ancak calisma aninda ReferenceError olarak ortaya cikti ve arka plan
 * transkripsiyonunu sessizce durdurdu. Bu test o sinif hatalari yakalar:
 * yanlis yazilmis degisken adlari, yeniden adlandirmada unutulan kullanimlar,
 * silinmis import'lara yapilan referanslar.
 *
 * Not: Bu bir tip denetleyici degildir; yalnizca "bu isim hicbir kapsamda
 * tanimli mi?" sorusuna bakar.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const traverse = require('@babel/traverse').default;

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'services', 'utils', 'hooks', 'context', 'constants', 'i18n'];

/**
 * Calisma ortaminda gercekten var olan global'ler.
 * Buraya bir isim eklemek "bu tanimlayici tanimsiz degil, ortam sagliyor"
 * demektir; yalnizca gercekten global olanlar eklenmelidir.
 */
const ALLOWED_GLOBALS = new Set([
  // ECMAScript
  'Array', 'ArrayBuffer', 'BigInt', 'Boolean', 'DataView', 'Date', 'Error', 'EvalError',
  'Float32Array', 'Float64Array', 'Function', 'Infinity', 'Int8Array', 'Int16Array',
  'Int32Array', 'Intl', 'JSON', 'Map', 'Math', 'NaN', 'Number', 'Object', 'Promise',
  'Proxy', 'RangeError', 'ReferenceError', 'Reflect', 'RegExp', 'Set', 'String',
  'Symbol', 'SyntaxError', 'TypeError', 'URIError', 'Uint8Array', 'Uint16Array',
  'Uint32Array', 'WeakMap', 'WeakSet', 'decodeURI', 'decodeURIComponent', 'encodeURI',
  'encodeURIComponent', 'escape', 'eval', 'globalThis', 'isFinite', 'isNaN',
  'parseFloat', 'parseInt', 'structuredClone', 'undefined', 'unescape',
  // Zamanlayicilar / mikro gorevler
  'clearImmediate', 'clearInterval', 'clearTimeout', 'queueMicrotask',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback',
  'setImmediate', 'setInterval', 'setTimeout',
  // Ag ve veri
  'AbortController', 'AbortSignal', 'Blob', 'File', 'FileReader', 'FormData', 'Headers',
  'Request', 'Response', 'URL', 'URLSearchParams', 'WebSocket', 'XMLHttpRequest',
  'fetch', 'atob', 'btoa', 'TextEncoder', 'TextDecoder',
  // CommonJS / paketleyici
  'exports', 'module', 'require', '__dirname', '__filename',
  // React Native / Expo calisma ortami
  '__DEV__', 'console', 'global', 'performance', 'process', 'navigator', 'alert',
  // Yalnizca web dalinda kullanilir; kodda Platform.OS === 'web' korumasi altinda
  'window', 'document',
]);

const collectFiles = () => {
  const files = [];
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.js$/.test(entry.name)) files.push(full);
    });
  SCAN_DIRS.forEach((d) => walk(path.join(ROOT, d)));
  return files;
};

console.log('--- Tanimsiz Tanimlayici (Olu Referans) Taramasi ---');

const files = collectFiles();
assert.ok(files.length > 0, 'Taranacak kaynak dosya bulunmali');

const findings = [];
const parseFailures = [];

files.forEach((file) => {
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = babel.parseSync(code, {
      filename: file,
      presets: ['babel-preset-expo'],
      babelrc: false,
      configFile: false,
    });
  } catch (error) {
    parseFailures.push(path.relative(ROOT, file) + ' -> ' + error.message.split('\n')[0]);
    return;
  }

  traverse(ast, {
    Program(programPath) {
      const globals = programPath.scope.globals;
      Object.keys(globals).forEach((name) => {
        if (ALLOWED_GLOBALS.has(name)) return;
        const node = globals[name];
        findings.push({
          name,
          file: path.relative(ROOT, file).replace(/\\/g, '/'),
          line: node.loc ? node.loc.start.line : 0,
        });
      });
    },
  });
});

assert.strictEqual(
  parseFailures.length,
  0,
  'Ayristirilamayan dosyalar:\n  ' + parseFailures.join('\n  ')
);
console.log('OK Test 1: ' + files.length + ' kaynak dosyanin tamami ayristirildi');

assert.strictEqual(
  findings.length,
  0,
  'Hicbir kapsamda tanimli olmayan tanimlayicilar bulundu. Bunlar calisma aninda\n' +
    'ReferenceError uretir (yanlis yazim, yeniden adlandirmada unutulan kullanim,\n' +
    'silinmis import). Gercekten bir ortam global\'i ise ALLOWED_GLOBALS listesine ekleyin:\n  ' +
    findings.map((f) => f.name + '  ->  ' + f.file + ':' + f.line).join('\n  ')
);
console.log('OK Test 2: cozumlenemeyen tanimlayici yok (olu referans bulunamadi)');

console.log('--- TANIMSIZ TANIMLAYICI TARAMASI TEMIZ! ---');
