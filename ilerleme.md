# 📓 AJANDA - Geliştirme Günlüğü (Changelog)

Bu dosya, proje boyunca yapılan her kod değişikliği, paket kurulumu ve dosya işlemlerinin kaydını kronolojik olarak tutar.

---

## 📅 [2026-08-28 15:37 - 16:06] - Proje Kurulumu ve İlk Görev (Ana Ekran Tasarımı)

### 🚀 Yapılan İşlemler ve Eklenen Özellikler
- **GitHub Entegrasyonu:**
  - `https://github.com/Zeynepsoykan99/AJANDA` adresi altında yeni GitHub reposu oluşturuldu ve yerel projeye `origin` olarak bağlandı.
- **Proje Altyapısı & Paket Kurulumları:**
  - Expo SDK 57 ve React Native projesi oluşturuldu.
  - `expo-router`, `react-native-safe-area-context`, `react-native-screens`, `expo-constants`, `expo-linking`, `expo-status-bar` ve `@react-native-async-storage/async-storage` paketleri kuruldu.
  - `nativewind@^2.0.11`, `tailwindcss@3.3.2` ve `babel-preset-expo` kurulup yapılandırıldı.
- **Konfigürasyon Dosyaları:**
  - `package.json`: Giriş noktası `"expo-router/entry"` olarak güncellendi.
  - `app.json`: `scheme: "ajanda"` ve `expo-router` eklendi.
  - `babel.config.js`: `nativewind/babel` eklentisi yapılandırıldı.
  - `tailwind.config.js`: Pudra pembe (`powderPink`) ve koyu pembe (`darkPink`) renk paletleri tanımlandı.
- **Frontend Geliştirmeleri (İlk Görev):**
  - `constants/colors.js`: Pudra pembe ve koyu pembe tema renk sabitleri oluşturuldu.
  - `components/CircleMenuButton.js`: İleride içine görsel yerleştirilebilecek, gölgeli ve dokunma geri bildirimi olan dairesel buton bileşeni kodlandı.
  - `app/_layout.js`: Durum çubuğu (StatusBar) ve Stack sayfa yerleşimi yapılandırıldı.
  - `app/index.js`: Pudra pembe arka plan, 3 adet boş dairesel buton ve altlarında sırasıyla koyu pembe renkte `"günlüğüm"`, `"defterlerim"`, `"ajandam"` metinleri yer alan ana ekran tasarlandı.
- **Çözülen Sorunlar & Hata Düzeltmeleri:**
  - NativeWind v2 ile Tailwind v3.4 uyumsuzluğu (`process(css).then(cb)`) tespit edilip Tailwind CSS sürümü `3.3.2` olarak sabitlenerek çözüldü.
  - Eksik `babel-preset-expo` paketi devDependency olarak eklendi.
  - `expo export` ile derleme testi yapılarak sıfır hatayla doğrulandı.

---

## 📅 [2026-08-28 16:07] - Geliştirme Günlüğü Kuralı Entegrasyonu
- `ilerleme.md` dosyası oluşturuldu ve proje genelinde yapılan tüm geçmiş işlemler kayıt altına alındı.

---

## 📅 [2026-08-28 16:08] - GitHub Push İşlemi
- Kullanıcıdan açık onay alındıktan sonra tüm proje kaynak kodları ve geliştirme günlüğü GitHub uzak deposuna (`origin main`) başarıyla push edildi (`https://github.com/Zeynepsoykan99/AJANDA`).

---

## 📅 [2026-08-28 16:22] - Sayfa Yönlendirme (Routing) ve Alt Sayfaların Oluşturulması

### 🚀 Yapılan İşlemler ve Eklenen Özellikler
- **Yeni Sayfaların Oluşturulması:**
  - `app/gunlugum.js`: Pudra pembe arka plana, ortada koyu pembe "günlüğüm" başlığına ve sol üstte ana ekrana dönen "← Geri" butonuna sahip sayfa oluşturuldu.
  - `app/defterlerim.js`: Pudra pembe arka plana, ortada koyu pembe "defterlerim" başlığına ve sol üstte ana ekrana dönen "← Geri" butonuna sahip sayfa oluşturuldu.
  - `app/ajandam.js`: Pudra pembe arka plana, ortada koyu pembe "ajandam" başlığına ve sol üstte ana ekrana dönen "← Geri" butonuna sahip sayfa oluşturuldu.
- **Ana Ekran Bağlantıları:**
  - `app/index.js`: `expo-router`'ın `useRouter` hook'u entegre edildi.
  - "günlüğüm", "defterlerim" ve "ajandam" dairesel butonlarına `onPress` etkileşimi atanarak ilgili alt sayfalara (`/gunlugum`, `/defterlerim`, `/ajandam`) sorunsuz geçiş sağlandı.
- **Test ve Doğrulama:**
  - `npx expo export --dump-sourcemap` ile tüm yönlendirme yapısı, iOS ve Android paket derlemeleri sıfır hata ile test edilip onaylandı.

---

## 📅 [2026-08-28 16:38] - GitHub Push İşlemi
- Sayfa yönlendirme (routing), alt sayfalar (`gunlugum`, `defterlerim`, `ajandam`) ve ilgili tüm kodlar kullanıcı onayıyla GitHub deposuna (`origin main`) push edildi.


