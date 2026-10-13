/**
 * Artımlı SVG yol üreticisi (canlı çizgi için).
 *
 * SORUN: `pointsToSvgPath` her hareket olayında TÜM noktalar üzerinde dönüyordu.
 * Bir çizgi boyunca bu O(n²) nokta ziyareti ve O(n²) string tahsisi demek:
 * 1000 noktalık tek bir çizgi için ~498.500 nokta ziyareti ve ~27.8 MB string.
 *
 * ÇÖZÜM: Yolun büyük kısmı değişmez. `pointsToSvgPath`'in ürettiği dizge
 *   M p0  +  (i = 1..n-2 için) " Q pi, orta(pi, pi+1)"  +  " L p(n-1)"
 * biçimindedir. Yeni bir nokta geldiğinde yalnızca
 *   - bir yeni Q parçası eklenir ve
 *   - sondaki " L" parçası değişir.
 * Bu üretici değişmez ön eki biriktirir, hareket başına SABİT iş yapar ve
 * `pointsToSvgPath` ile **birebir aynı** dizgeyi döndürür (çizim görünümü
 * değişmez). Eşitlik `tests/strokePathBuilder.test.js` ile zorlanır.
 */

/**
 * Tek bir çizginin yolunu artımlı kuran üretici döndürür.
 * Kullanım: her yeni nokta için `push(pt)`, ekrana basmak için `toPath()`.
 */
export const createStrokePathBuilder = () => {
  // Değişmez ön ek: "M p0" + tamamlanmış Q parçaları
  let prefix = '';
  // Eklenen nokta sayısı
  let count = 0;
  // Son nokta: yeni Q parçası bu nokta ile yeni gelen nokta arasından kurulur
  let lastPoint = null;
  // İlk nokta: tek noktalı çizgi özel durumu için saklanır
  let firstPoint = null;

  return {
    /** Yeni bir çizgiye başlarken çağrılır. */
    reset() {
      prefix = '';
      count = 0;
      lastPoint = null;
      firstPoint = null;
    },

    /** Bir nokta ekler. Hareket başına SABİT iş. */
    push(pt) {
      if (count === 0) {
        firstPoint = pt;
        prefix = `M ${pt.x} ${pt.y}`;
      } else if (count >= 2) {
        // Artık p[count-1] ve p[count] biliniyor; Q parçası tamamlanabilir.
        const xc = (lastPoint.x + pt.x) / 2;
        const yc = (lastPoint.y + pt.y) / 2;
        prefix += ` Q ${lastPoint.x} ${lastPoint.y}, ${xc} ${yc}`;
      }
      // count === 1 durumunda ön eke hiçbir şey eklenmez; `pointsToSvgPath`
      // döngüsü i = 1'den başlayıp n-2'de bittiği için ilk Q parçası ancak
      // üçüncü nokta gelince oluşur.
      lastPoint = pt;
      count += 1;
    },

    /** Şu ana kadarki tam SVG yolu. `pointsToSvgPath` ile birebir aynıdır. */
    toPath() {
      if (count === 0) return '';
      if (count === 1) {
        return `M ${firstPoint.x} ${firstPoint.y} L ${firstPoint.x + 0.1} ${firstPoint.y + 0.1}`;
      }
      return `${prefix} L ${lastPoint.x} ${lastPoint.y}`;
    },

    /** Eklenen nokta sayısı (tanı/test için). */
    get length() {
      return count;
    },
  };
};

export default createStrokePathBuilder;
