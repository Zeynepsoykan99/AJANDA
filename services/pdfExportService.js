/**
 * AJANDA - PDF Dışa Aktarma ve Paylaşma Servisi (Export to PDF)
 *
 * react-native-view-shot tarafından yakalanan sayfa görselini
 * expo-print kullanarak sıfır kenar boşluklu A4 PDF dosyasına dönüştürür
 * ve expo-sharing ile kullanıcının cihazına / diğer uygulamalara sunar.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Sayfa görselini sıfır kenar boşluklu A4 PDF dosyasına dönüştürür.
 *
 * Görsel, `captureRef` tarafından doğrudan `data:image/...;base64,...` biçiminde
 * (`result: 'data-uri'`) verilmelidir. Böylece dosya sistemine yazıp geri okuma adımı
 * ortadan kalkar; expo-print'in WebView'ı yerel dosya yolunu yükleyemediği için oluşan
 * "boş PDF" sorunu kökten engellenir.
 *
 * @param {string} imageUri - Yakalanan sayfa görseli (data: URI)
 * @param {object} options - { title: string, pageNumber: number, backgroundColor: string }
 * @returns {Promise<string>} Oluşturulan PDF dosyasının yerel dosya yolu (URI)
 */
export async function convertImageToPdf(imageUri, options = {}) {
  const {
    title = 'Ajanda Sayfası',
    backgroundColor = '#FFFDF9',
  } = options;

  // Sessiz fallback yok: data: URI gelmezse görsel HTML'e gömülemez ve PDF boş çıkar.
  // Bu durumu gizlemek yerine hatayı loglayıp yükseltiyoruz.
  if (typeof imageUri !== 'string' || !imageUri.startsWith('data:')) {
    console.error(
      'PDF dışa aktarma: convertImageToPdf bir data: URI bekliyor, gelen değer:',
      typeof imageUri === 'string' ? imageUri.slice(0, 64) : imageUri
    );
    throw new Error('Sayfa görseli base64 (data:) biçiminde alınamadı.');
  }

  const base64Image = imageUri;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>${title}</title>
        <style>
          @page {
            margin: 0;
            size: A4 portrait;
          }
          * {
            box-sizing: border-box;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            background-color: ${backgroundColor};
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }
          .page-container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          <img src="${base64Image}" alt="${title}" />
        </div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({
    html,
    width: 595, // Standart A4 genişliği (points)
    height: 842, // Standart A4 yüksekliği (points)
  });

  return uri;
}

/**
 * PDF dosyasını sistem paylaşım menüsüyle (veya web indirme ile) açar.
 *
 * @param {string} pdfUri - Paylaşılacak PDF dosyasının URI'si
 * @param {string} fileName - Dosya adı (ör. 'Gunlugum_Sayfa_1.pdf')
 * @returns {Promise<boolean>}
 */
export async function sharePdfFile(pdfUri, fileName = 'ajanda_sayfa.pdf') {
  if (Platform.OS === 'web') {
    // Web ortamında doğrudan tarayıcı indirmesi tetikle
    const link = document.createElement('a');
    link.href = pdfUri;
    link.download = fileName;
    link.click();
    return true;
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Cihazınızda dosya paylaşımı desteklenmiyor.');
  }

  await Sharing.shareAsync(pdfUri, {
    mimeType: 'application/pdf',
    dialogTitle: fileName,
    UTI: 'com.adobe.pdf',
  });

  return true;
}

export const PdfExportService = {
  convertImageToPdf,
  sharePdfFile,
};
