/**
 * ⚠️ GEÇİCİ DOĞRULAMA EKRANI — KALICI DEĞİL
 *
 * Yalnızca iki kütüphanenin cihazda GERÇEKTEN çalıştığını doğrulamak için var:
 *   - @dariyd/react-native-pdf-page-image  (PDF sayfası → JPEG)
 *   - expo-pdf-text-extract                 (PDF metin katmanı → metin)
 *
 * Test PDF'i `expo-print` ile cihazda üretilir; böylece doğrulama için
 * belge seçici gibi EK bir native bağımlılık gerekmez.
 *
 * PDF içe aktarma özelliği uygulandıktan sonra BU DOSYA VE ANA MENÜDEKİ
 * GEÇİCİ BUTON SİLİNECEKTİR.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import { useTheme } from '../context/ThemeContext';

const TEST_HTML = `
  <html><body style="font-family: Helvetica; padding: 40px;">
    <h1>AJANDA PDF Testi</h1>
    <p>Bu bir dogrulama belgesidir. Ikinci sayfaya geciliyor.</p>
    <p>Metin cikarma icin benzersiz anahtar: AJANDA_PDF_PROBE_2026</p>
    <div style="page-break-before: always;"></div>
    <h2>Ikinci Sayfa</h2>
    <p>Ikinci sayfanin metni.</p>
  </body></html>
`;

export default function PdfProbeScreen() {
  const { colors } = useTheme();
  const [log, setLog] = useState([]);
  const [imageUri, setImageUri] = useState(null);
  const [busy, setBusy] = useState(false);

  const add = (line) => setLog((prev) => [...prev, line]);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setLog([]);
    setImageUri(null);

    try {
      // 1) Test PDF'i uret
      add('1) expo-print ile test PDF uretiliyor...');
      const { uri: pdfUri } = await Print.printToFileAsync({ html: TEST_HTML });
      add('   OK -> ' + pdfUri);

      // 2) pdf-page-image: modul yuklenebiliyor mu
      add('2) @dariyd/react-native-pdf-page-image yukleniyor...');
      let PdfPageImage;
      try {
        PdfPageImage = require('@dariyd/react-native-pdf-page-image').default;
        add('   OK modul yuklendi');
      } catch (e) {
        add('   HATA modul yuklenemedi: ' + e.message);
        throw e;
      }

      // 3) openPdf -> sayfa sayisi
      add('3) openPdf cagriliyor...');
      const info = await PdfPageImage.open(pdfUri);
      add('   OK pageCount=' + info.pageCount);

      // 4) Ilk sayfayi JPEG'e cevir
      add('4) generate(sayfa 0) cagriliyor...');
      const page = await PdfPageImage.generate(pdfUri, 0, 1, {
        format: 'jpeg',
        quality: 80,
        maxDimension: 1600,
      });
      add('   OK ' + page.width + 'x' + page.height);
      add('   -> ' + page.uri);
      setImageUri(page.uri);

      await PdfPageImage.close(pdfUri);

      // 5) Metin cikarma
      add('5) expo-pdf-text-extract yukleniyor...');
      try {
        const extractor = require('expo-pdf-text-extract');
        add('   isAvailable=' + String(extractor.isAvailable?.()));
        const text = await extractor.extractText(pdfUri.replace('file://', ''));
        const clean = String(text || '').replace(/\s+/g, ' ').trim();
        add('   OK uzunluk=' + clean.length);
        add('   ilk 120: ' + clean.slice(0, 120));
        add(
          clean.includes('AJANDA_PDF_PROBE_2026')
            ? '   ANAHTAR BULUNDU -> metin cikarma CALISIYOR'
            : '   !! anahtar bulunamadi'
        );
      } catch (e) {
        add('   HATA metin cikarma: ' + (e?.code ? e.code + ' / ' : '') + e.message);
      }

      add('BITTI');
    } catch (error) {
      add('BASARISIZ: ' + (error?.message || String(error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          PDF Kütüphane Doğrulaması (geçici)
        </Text>

        <TouchableOpacity
          onPress={run}
          disabled={busy}
          style={[styles.btn, { backgroundColor: colors.accent }, busy && { opacity: 0.6 }]}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Testi Çalıştır</Text>
          )}
        </TouchableOpacity>

        <View style={[styles.logBox, { borderColor: colors.border }]}>
          {log.length === 0 ? (
            <Text style={[styles.logLine, { color: colors.textSecondary }]}>
              Henüz çalıştırılmadı.
            </Text>
          ) : (
            log.map((line, i) => (
              <Text key={i} style={[styles.logLine, { color: colors.textPrimary }]}>
                {line}
              </Text>
            ))
          )}
        </View>

        {imageUri ? (
          <>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Üretilen görüntü</Text>
            <Image
              source={{ uri: imageUri }}
              style={[styles.preview, { borderColor: colors.border }]}
              resizeMode="contain"
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 16, fontWeight: '700' },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  logBox: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 120, gap: 3 },
  logLine: { fontSize: 11, fontFamily: 'monospace' },
  preview: { width: '100%', height: 420, borderWidth: 1, borderRadius: 10 },
});
