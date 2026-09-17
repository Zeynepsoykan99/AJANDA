/**
 * AJANDA - Tek Tuşla Temizlik ve Kurtarma Betiği (Clean & Rescue Script)
 *
 * Görevler:
 * 1. Port 8081'i tutan asılı (zombi) süreçleri sonlandırır.
 * 2. Proje içi (.expo, node_modules/.cache) ve sistem geçici klasöründeki (metro-*) tüm önbellekleri temizler.
 * 3. Sistemde Watchman varsa önbelleğini sıfırlar.
 * 4. Node.js bellek limitini 4 GB'a (4096 MB) çıkararak Expo'yu temiz önbellekle (-c) başlatır.
 *
 * Windows (PowerShell/CMD), macOS ve Linux ile %100 uyumludur.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const { freePort } = require('./free-port');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function removeDirSafe(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      console.log(`[Clean] Temizleniyor: ${path.relative(PROJECT_ROOT, dirPath) || dirPath}...`);
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`[Clean] Silindi: ${path.relative(PROJECT_ROOT, dirPath) || dirPath}`);
    } catch (err) {
      console.warn(`[Clean] Silinirken uyarı: ${dirPath} (${err.message})`);
    }
  }
}

function cleanTempCaches() {
  const tmpDir = os.tmpdir();
  console.log(`[Clean] Sistem geçici klasörü taranıyor (${tmpDir})...`);
  try {
    const files = fs.readdirSync(tmpDir);
    let count = 0;
    files.forEach((file) => {
      if (
        file.startsWith('metro-') ||
        file.startsWith('haste-map-') ||
        file.startsWith('react-native-packager-cache-')
      ) {
        try {
          const target = path.join(tmpDir, file);
          fs.rmSync(target, { recursive: true, force: true });
          count++;
        } catch {}
      }
    });
    console.log(`[Clean] ${count} adet geçici Metro önbellek dosyası temizlendi.`);
  } catch (err) {
    console.warn(`[Clean] Geçici klasör taranırken hata: ${err.message}`);
  }
}

function cleanWatchman() {
  try {
    execSync('watchman watch-del-all', { stdio: 'ignore' });
    console.log('[Clean] Watchman izleyicileri sıfırlandı.');
  } catch {
    // Watchman sistemde yüklü değilse sessizce geç
  }
}

function runClean(options = {}) {
  const shouldStart = !process.argv.includes('--no-start') && !options.noStart;

  console.log('\n=============================================');
  console.log('🧹 AJANDA - SİSTEM VE SUNUCU TEMİZLİĞİ BAŞLIYOR');
  console.log('=============================================\n');

  // 1. Port 8081'i serbest bırak
  freePort(8081);

  // 2. Proje önbelleklerini temizle
  removeDirSafe(path.join(PROJECT_ROOT, '.expo'));
  removeDirSafe(path.join(PROJECT_ROOT, 'node_modules', '.cache'));

  // 3. İşletim sistemi geçici Metro önbelleğini temizle
  cleanTempCaches();

  // 4. Watchman temizliği
  cleanWatchman();

  console.log('\n✅ TÜM ÖNBELLEKLER VE ASILI SÜREÇLER TEMİZLENDİ!\n');

  if (shouldStart) {
    console.log('🚀 Expo Metro Bundler 4GB RAM limitiyle (-c) başlatılıyor...');
    console.log('👉 Yerel adres: http://localhost:8081\n');

    const cliPath = path.join(PROJECT_ROOT, 'node_modules', 'expo', 'bin', 'cli');
    const child = spawn(
      process.execPath,
      ['--max-old-space-size=4096', cliPath, 'start', '-c'],
      {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        shell: false,
        env: {
          ...process.env,
          NODE_OPTIONS: '--max-old-space-size=4096',
        },
      }
    );

    child.on('error', (err) => {
      console.error('[Clean] Sunucu başlatılamadı:', err);
    });

    process.on('SIGINT', () => {
      child.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      child.kill('SIGTERM');
      process.exit(0);
    });
  }
}

if (require.main === module) {
  runClean();
}

module.exports = { runClean };
