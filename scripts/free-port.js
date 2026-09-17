/**
 * AJANDA - Port Kurtarıcı (Free Port)
 * 8081 portunu (veya belirtilen portu) meşgul eden asılı zombi süreçleri sonlandırır.
 * Windows (taskkill), macOS ve Linux (kill -9) ile %100 uyumludur.
 */

const { execSync } = require('child_process');

function freePort(port = 8081) {
  console.log(`[FreePort] Port ${port} kontrol ediliyor...`);
  const isWindows = process.platform === 'win32';

  try {
    if (isWindows) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      const pids = new Set();

      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        // Format: TCP    0.0.0.0:8081    0.0.0.0:0    LISTENING    <PID>
        if (parts.length >= 5 && parts[1].endsWith(`:${port}`)) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== String(process.pid)) {
            pids.add(pid);
          }
        }
      });

      if (pids.size === 0) {
        console.log(`[FreePort] Port ${port} zaten boşta.`);
        return true;
      }

      pids.forEach((pid) => {
        try {
          console.log(`[FreePort] Asılı kalan süreç sonlandırılıyor (PID: ${pid})...`);
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[FreePort] PID ${pid} başarıyla sonlandırıldı.`);
        } catch (err) {
          console.warn(`[FreePort] PID ${pid} sonlandırılamadı (zaten kapanmış olabilir).`);
        }
      });
    } else {
      // macOS / Linux
      try {
        const output = execSync(`lsof -ti :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        const pids = output.trim().split('\n').filter(Boolean);
        pids.forEach((pid) => {
          if (pid !== String(process.pid)) {
            console.log(`[FreePort] Asılı kalan süreç sonlandırılıyor (PID: ${pid})...`);
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          }
        });
      } catch {
        console.log(`[FreePort] Port ${port} zaten boşta.`);
        return true;
      }
    }

    console.log(`[FreePort] Port ${port} başarıyla serbest bırakıldı.`);
    return true;
  } catch (error) {
    console.log(`[FreePort] Port ${port} üzerinde aktif bir süreç bulunamadı veya port zaten boş.`);
    return true;
  }
}

if (require.main === module) {
  const targetPort = process.argv[2] ? parseInt(process.argv[2], 10) : 8081;
  freePort(targetPort);
}

module.exports = { freePort };
