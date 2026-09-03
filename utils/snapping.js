/**
 * Akıllı Hizalama (Smart Snapping) Yardımcı Fonksiyonları
 * Sürüklenen öğelerin sayfa merkezine mıknatıs gibi yapışmasını sağlar.
 */

const SNAP_THRESHOLD = 12; // px — bu mesafede snap tetiklenir

/**
 * Bir öğenin merkeze yakınlığını kontrol eder ve gerekirse snap uygular.
 *
 * @param {number} x - Öğenin sol üst köşesi X
 * @param {number} y - Öğenin sol üst köşesi Y
 * @param {number} itemW - Öğe genişliği
 * @param {number} itemH - Öğe yüksekliği
 * @param {number} canvasW - Canvas genişliği
 * @param {number} canvasH - Canvas yüksekliği
 * @returns {{ x: number, y: number, snapH: boolean, snapV: boolean }}
 */
export function getSnapResult(x, y, itemW, itemH, canvasW, canvasH) {
  const centerX = x + itemW / 2;
  const centerY = y + itemH / 2;
  const midX = canvasW / 2;
  const midY = canvasH / 2;

  let snappedX = x;
  let snappedY = y;
  let snapV = false; // Dikey merkez çizgisi gösterilsin mi
  let snapH = false; // Yatay merkez çizgisi gösterilsin mi

  // Yatay merkez snap (öğe dikey çizgiye hizalanır)
  if (Math.abs(centerX - midX) < SNAP_THRESHOLD) {
    snappedX = midX - itemW / 2;
    snapV = true;
  }

  // Dikey merkez snap (öğe yatay çizgiye hizalanır)
  if (Math.abs(centerY - midY) < SNAP_THRESHOLD) {
    snappedY = midY - itemH / 2;
    snapH = true;
  }

  return { x: snappedX, y: snappedY, snapH, snapV };
}

export { SNAP_THRESHOLD };
