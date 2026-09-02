import { useWindowDimensions } from 'react-native';

/**
 * useResponsiveLayout - iPad / Tablet ve Telefon duyarlı ekran hook'u
 * Ekran boyutlarına göre tablet modunu, çift sayfa yerleşimini ve ölçeklemeyi yönetir.
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  // En az 700px genişlik veya en küçük boyutun 600px üzeri olması tablet göstergesidir (iPad Mini vb.)
  const isTablet = width >= 700 || Math.min(width, height) >= 600;
  const isLandscape = width > height;

  // Çift sayfa ajanda görünümü için genişlik yeterli mi?
  const isTwoPage = isTablet && width >= 800;

  // İçerik genişliği hesaplama (tablet ekranlarında defteri ortalamak ve estetik tutmak için)
  const maxContentWidth = isTablet ? Math.min(width * 0.94, 1100) : width;
  const maxContentHeight = isTablet ? Math.min(height * 0.90, 850) : height;

  return {
    width,
    height,
    isTablet,
    isLandscape,
    isTwoPage,
    maxContentWidth,
    maxContentHeight,
  };
}

export default useResponsiveLayout;
