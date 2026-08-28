# 📓 AJANDA - Geliştirme Günlüğü (Changelog)

Bu dosya, proje boyunca yapılan her kod değişikliği, paket kurulumu ve dosya işlemlerinin kaydını kronolojik olarak tutar.

---

## 📅 [2026-08-28 15:37 - 16:06] - Proje Kurulumu ve İlk Görev (Ana Ekran Tasarımı)

### 🚀 Yapılan İşlemler ve Eklenen Özellikler
- **GitHub Entegrasyonu:**
  - https://github.com/Zeynepsoykan99/AJANDA adresi altında yeni GitHub reposu oluşturuldu ve yerel projeye origin olarak bağlandı.
- **Proje Altyapısı & Paket Kurulumları:**
  - Expo SDK 57 ve React Native projesi oluşturuldu.
  - expo-router, eact-native-safe-area-context, eact-native-screens, expo-constants, expo-linking, expo-status-bar ve @react-native-async-storage/async-storage paketleri kuruldu.
  - 
ativewind@^2.0.11 ve 	ailwindcss@3.3.2 ile abel-preset-expo kurulup yapılandırıldı.
- **Konfigürasyon Dosyaları:**
  - package.json: Giriş noktası "expo-router/entry" olarak güncellendi.
  - pp.json: scheme: "ajanda" ve expo-router eklendi.
  - abel.config.js: 
ativewind/babel eklentisi yapılandırıldı.
  - 	ailwind.config.js: Pudra pembe (powderPink) ve koyu pembe (darkPink) renk paletleri tanımlandı.
- **Frontend Geliştirmeleri (İlk Görev):**
  - constants/colors.js: Pudra pembe ve koyu pembe tema renk sabitleri oluşturuldu.
  - components/CircleMenuButton.js: İleride içine görsel yerleştirilebilecek, gölgeli ve dokunma geri bildirimi olan dairesel buton bileşeni kodlandı.
  - pp/_layout.js: Durum çubuğu (StatusBar) ve Stack sayfa yerleşimi yapılandırıldı.
  - pp/index.js: Pudra pembe arka plan, 3 adet boş dairesel buton ve altlarında sırasıyla koyu pembe renkte "günlüğüm", "defterlerim", "ajandam" metinleri yer alan ana ekran tasarlandı.
- **Çözülen Sorunlar & Hata Düzeltmeleri:**
  - NativeWind v2 ile Tailwind v3.4 uyumsuzluğu (process(css).then(cb)) tespit edilip Tailwind CSS sürümü 3.3.2 olarak sabitlenerek çözüldü.
  - Eksik abel-preset-expo paketi devDependency olarak eklendi.
  - expo export ile derleme testi yapılarak sıfır hatayla doğrulandı.

---

## 📅 [2026-08-28 16:07] - Geliştirme Günlüğü Kuralı Entegrasyonu
- ilerleme.md dosyası oluşturuldu ve proje genelinde yapılan tüm geçmiş işlemler kayıt altına alındı.
