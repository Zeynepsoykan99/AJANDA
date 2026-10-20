/**
 * Asenkron testler için tamamlanma koruması.
 *
 * Sorun: Node'da bir `await` (veya `.then` zinciri) hiç çözülmeyen bir söze
 * takılırsa olay döngüsü boşalır ve süreç 0 koduyla çıkar. Test yarıda kalır,
 * kalan iddialar hiç çalışmaz, ama `node tests/x.test.js` başarılı görünür.
 *
 * Kullanım: dosyanın başında
 *   const markComplete = require('./helpers/completionGuard')(__filename);
 * ve asenkron akışın EN SONUNDA (son "TUM ... GECTI" satırından hemen sonra)
 *   markComplete();
 * Çağrılmadan çıkılırsa çıkış kodu 1 yapılır ve hangi testin yarıda kaldığı yazılır.
 */
const path = require('path');

module.exports = function createCompletionGuard(testFile) {
  let completed = false;
  process.on('exit', (code) => {
    if (!completed && code === 0) {
      console.error(
        `HATA: ${path.basename(testFile)} tamamlanmadan cikti (bir islem sonsuza dek bekledi). ` +
          'Kalan iddialar calismadi; test BASARISIZ sayiliyor.'
      );
      process.exitCode = 1;
    }
  });
  return () => {
    completed = true;
  };
};
