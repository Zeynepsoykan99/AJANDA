import { useWindowDimensions, PixelRatio } from 'react-native';

export const PAGE_ASPECT_RATIO = 0.707; // A4 / standart defter sayfası en-boy oranı (~1 / √2)
export const TWO_PAGE_ASPECT_RATIO = 1.414; // Çift sayfa açık ajanda en-boy oranı (~√2)

/**
 * Kullanılabilir alana (availableWidth, availableHeight) orijinal en-boy oranını koruyarak
 * tam sığacak (contain mantığı) sayfa boyutlarını hesaplar.
 * Hiçbir kenar dışarı taşmaz ve kırpılmaz.
 */
export function computeContainedPageDimensions(
  availW,
  availH,
  customRatio = null,
  isTwoPageMode = false
) {
  if (!availW || !availH || availW <= 0 || availH <= 0) {
    return { pageWidth: availW || 0, pageHeight: availH || 0, scale: 1, targetRatio: PAGE_ASPECT_RATIO };
  }

  const targetRatio =
    typeof customRatio === 'number' && customRatio > 0
      ? customRatio
      : isTwoPageMode
      ? TWO_PAGE_ASPECT_RATIO
      : PAGE_ASPECT_RATIO;

  let w = availW;
  let h = w / targetRatio;

  if (h > availH) {
    h = availH;
    w = h * targetRatio;
  }

  return {
    pageWidth: Math.floor(w),
    pageHeight: Math.floor(h),
    targetRatio,
    scale: availW > 0 ? w / availW : 1,
  };
}

/**
 * useResponsiveLayout - iPad / Tablet, Telefon ve Web duyarlı ekran hook'u
 * Ekran boyutlarına göre tablet modunu, çift sayfa yerleşimini, ölçeklemeyi
 * ve Retina/HDPI piksel yoğunluğunu yönetir.
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  // En az 700px genişlik veya en küçük boyutun 600px üzeri olması tablet göstergesidir (iPad Mini vb.)
  const isTablet = width >= 700 || Math.min(width, height) >= 600;
  const isLandscape = width > height;

  // Çift sayfa ajanda görünümü için genişlik yeterli mi?
  const isTwoPage = isTablet && width >= 800;

  // İçerik genişliği hesaplama (tablet ekranlarında defteri ortalamak ve estetik tutmak için)
  const maxContentWidth = isTablet ? Math.min(width * 0.98, 1400) : width;
  const maxContentHeight = isTablet ? Math.min(height * 0.96, 1600) : height;

  const pixelRatio = PixelRatio.get();
  const fontScale = PixelRatio.getFontScale();
  const roundPixel = PixelRatio.roundToNearestPixel.bind(PixelRatio);

  const getContainedBounds = (availW, availH, customRatio) =>
    computeContainedPageDimensions(availW, availH, customRatio, isTwoPage);

  return {
    width,
    height,
    isTablet,
    isLandscape,
    isTwoPage,
    maxContentWidth,
    maxContentHeight,
    pixelRatio,
    fontScale,
    roundPixel,
    getContainedBounds,
  };
}

export default useResponsiveLayout;

