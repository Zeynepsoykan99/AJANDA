// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');
const os = require('os');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const path = require('path');
const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

// Windows dosya izleyicisinin (file watcher) .git, scratch ve cache klasörleri yüzünden kilitlenmesini engelle
// NOT: Yalnızca proje kökündeki klasörler hedeflenir; node_modules içindeki kütüphane "dist" klasörleri engellenmez!
const projectRoot = __dirname;
const blockListPatterns = [
  new RegExp('^' + escapeRegex(path.join(projectRoot, '.git')) + '([/\\\\].*)?$'),
  new RegExp('^' + escapeRegex(path.join(projectRoot, 'scratch')) + '([/\\\\].*)?$'),
  new RegExp('^' + escapeRegex(path.join(projectRoot, '.expo')) + '([/\\\\].*)?$'),
  new RegExp('^' + escapeRegex(path.join(projectRoot, 'dist')) + '([/\\\\].*)?$'),
  new RegExp('^' + escapeRegex(path.join(projectRoot, 'web-build')) + '([/\\\\].*)?$'),
  /.*[\/\\]node_modules[\/\\]\.cache[\/\\].*/,
];

// Mevcut blockList varsa birleştir, yoksa yeni oluştur
if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList = [...config.resolver.blockList, ...blockListPatterns];
} else if (config.resolver.blockList instanceof RegExp) {
  config.resolver.blockList = [config.resolver.blockList, ...blockListPatterns];
} else {
  config.resolver.blockList = blockListPatterns;
}

// Windows'ta watchman kurulu olmadığından Node.js dahili izleyicisinin kararlı çalışması için:
config.resolver.useWatchman = false;

// Windows'ta çoklu çekirdek NTFS dosya tanıtıcı (file handle) kilitlenmelerini ve bellek şişmelerini önlemek için:
// 2 worker, Windows ortamında hem OOM (Out of Memory) çökmesini hem de watcher kilitlenmesini engeller.
config.maxWorkers = process.platform === 'win32' ? 2 : Math.min(Math.max(1, os.cpus().length), 4);

// Sıcak yeniden yüklemelerde (HMR) iş parçacıklarının bellek sızıntısı biriktirmesini önle
config.stickyWorkers = false;

// Web platformu ve kararlılık ayarları
config.resetCache = false;

module.exports = config;
