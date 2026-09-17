// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');
const os = require('os');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Windows dosya izleyicisinin (file watcher) .git, scratch ve cache klasörleri yüzünden kilitlenmesini engelle
const blockListPatterns = [
  /.*[\/\\]\.git[\/\\].*/,
  /.*[\/\\]scratch[\/\\].*/,
  /.*[\/\\]\.expo[\/\\].*/,
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

// Windows'ta çoklu çekirdek I/O kilitlenmelerini önlemek için dengeli worker sayısı
config.maxWorkers = Math.min(Math.max(1, os.cpus().length), 4);

// Web platformu için reset-cache optimizasyonu
config.resetCache = false;

module.exports = config;
