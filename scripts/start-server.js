/**
 * AJANDA - Akıllı Sunucu Başlatıcı ve Kararlılık Kalkanı (Smart Server Launcher)
 *
 * Görevler:
 * 1. Port 8081'i önceden kontrol eder ve asılı zombi süreçleri otomatik sonlandırır.
 * 2. Bayat .expo kilitlerini temizler.
 * 3. NODE_OPTIONS='--max-old-space-size=4096' ile tüm Metro worker iş parçacıklarına 4GB bellek tahsis eder.
 * 4. Expo Metro Bundler'ı temiz önbellekle (-c) başlatır.
 * 5. Çıkışta (Ctrl+C) alt süreçleri öldürerek portu temiz bırakır.
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { freePort } = require('./free-port');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// 1. Port 8081'i temizle
console.log('\n[AJANDA Shield] Port 8081 kontrol ediliyor...');
freePort(8081);

// 2. Bayat .expo kilit klasörünü temizle
const expoDir = path.join(PROJECT_ROOT, '.expo');
if (fs.existsSync(expoDir)) {
  try {
    fs.rmSync(expoDir, { recursive: true, force: true });
    console.log('[AJANDA Shield] .expo önbellek kilitleri temizlendi.');
  } catch (e) {
    // Kilitli dosya varsa atla
  }
}

// 3. Ortam değişkenlerine 4 GB bellek aktarımı (tüm worker'lar miras alır)
const env = {
  ...process.env,
  NODE_OPTIONS: '--max-old-space-size=4096',
};

// 4. Komut satırı argümanlarını topla (--web, --android, --ios vb.)
const userArgs = process.argv.slice(2);
const cliPath = path.join(PROJECT_ROOT, 'node_modules', 'expo', 'bin', 'cli');
const expoArgs = ['start', '-c', ...userArgs];

console.log('[AJANDA Shield] Metro Bundler 4GB RAM limiti ve temiz önbellekle (-c) başlatılıyor...');
console.log(`[AJANDA Shield] Komut: expo ${expoArgs.join(' ')}`);
console.log('[AJANDA Shield] Adres: http://localhost:8081\n');

const child = spawn(process.execPath, [cliPath, ...expoArgs], {
  cwd: PROJECT_ROOT,
  stdio: 'inherit',
  shell: false,
  env,
});

let isExiting = false;

function cleanExit() {
  if (isExiting) return;
  isExiting = true;
  console.log('\n[AJANDA Shield] Sunucu kapatılıyor ve port 8081 serbest bırakılıyor...');

  try {
    if (child && !child.killed) {
      if (process.platform === 'win32') {
        try {
          execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' });
        } catch {}
      } else {
        child.kill('SIGTERM');
      }
    }
  } catch {}

  freePort(8081);
  process.exit(0);
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
process.on('exit', () => {
  freePort(8081);
});

child.on('exit', (code) => {
  freePort(8081);
  if (!isExiting) {
    process.exit(code || 0);
  }
});
