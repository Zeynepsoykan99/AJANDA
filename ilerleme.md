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

---

## 📅 [2026-08-28 16:43] - Web Desteği & Paket Kurulumu
- **Eklenen Web Paketleri:** `react-dom`, `react-native-web` ve `@expo/metro-runtime` paketleri kuruldu.
- **Web Sunucusu:** `npx expo start --web` komutu ile Expo Web sunucusu `http://localhost:8081` üzerinde aktif edildi.

---

## 📅 [2026-08-30 11:23] - GitHub Push İşlemi
- Kullanıcı onayıyla Web desteği paketleri (`react-dom`, `react-native-web`, `@expo/metro-runtime`) ve güncellenen yapılandırma dosyaları GitHub uzak deposuna (`origin main`) push edildi.

---

## 📅 [2026-08-30 12:06 - 12:20] - Ajandam Modülü: Tema Motoru, Kapak Sistemi, Dinamik Sayfalar ve Sticker Altyapısı

### 🚀 Mimari Plan ve Onay
- Kapsamlı mimari plan oluşturularak kullanıcı onayına sunuldu ve onaylandı.
- 6 fazlı uygulama planı (Altyapı → Ana Ekran → Kapak → Sayfa → Sticker → Finalizasyon) takip edildi.

### 📦 Paket Kurulumları
- `react-native-gesture-handler` (~2.24.0): Sticker sürükle-bırak gesture yönetimi
- `react-native-reanimated` (~3.18.0): Akıcı sticker animasyonları
- `babel.config.js`: `react-native-reanimated/plugin` eklendi (son plugin olarak)

### 🎨 Faz 1: Tema Motoru (Theme Engine) Altyapısı
- **[NEW] `constants/themes.js`**: 5 adet girly tema tanımı (Pudra Pembe, Lavanta, Şeftali, Nane Yeşili, Bebek Mavisi). Her tema ID, isim, emoji ve 10 renk değeri içerir. `getThemeById()` ve `getAllThemes()` yardımcı fonksiyonları.
- **[NEW] `context/ThemeContext.js`**: React Context tabanlı `ThemeProvider` ve `useTheme()` hook. AsyncStorage'dan kaydedilmiş temayı yükler, tema değişikliğinde AsyncStorage'a kaydeder.
- **[NEW] `services/storageService.js`**: AsyncStorage CRUD servisi. Tema (`@ajanda_theme`), kapak (`@ajanda_cover`) ve sayfalar (`@ajanda_pages`) için get/set/add/update/delete/reorder fonksiyonları. Tüm işlemler try/catch sarılı.
- **[MODIFY] `app/_layout.js`**: `GestureHandlerRootView` ve `ThemeProvider` sarmalayıcıları eklendi. Statik `COLORS` yerine dinamik `useTheme().colors` kullanımına geçildi.
- **[MODIFY] `constants/colors.js`**: Artık `themes.js`'deki varsayılan temadan renkleri re-export eder (geriye dönük uyumluluk).

### 🏠 Faz 2: Ana Ekran Güncellemeleri
- **[MODIFY] `components/CircleMenuButton.js`**: `iconName` prop eklendi, `@expo/vector-icons/MaterialCommunityIcons` ile dairelerin ortasına ikon render. Statik renkler `useTheme()` hook ile değiştirildi. NativeWind className kullanımı kaldırıldı.
- **[MODIFY] `app/index.js`**: 3 menü öğesine ikon bilgisi eklendi (book-heart-outline, calendar-heart, notebook-outline). `defterlerim` label'ı `notlarım` olarak güncellendi (dosya adı korundu). Tema entegrasyonu tamamlandı.

### 📔 Faz 3: Ajanda Kapağı (Cover) Sistemi
- **[NEW] `constants/coverTemplates.js`**: 5 adet kapak şablonu tanımı (Çiçekli Klasik, Minimal Kalp, Yıldızlı Gece, Kelebek Bahçesi, Tatlı Kurdele). Her şablon: arka plan rengi, bordür, vurgu rengi, desen tipi (dots/hearts/stars/lines), dekorasyon ikonu ve emoji.
- **[NEW] `components/CoverDisplay.js`**: Kapak render bileşeni. Seçili şablona göre dekoratif desen (ikon tabanlı), kullanıcı ismi, not metni ve emoji dekorasyonlarını render eder.
- **[NEW] `components/CoverEditor.js`**: Tam ekran modal. Yatay kaydırılabilir şablon galerisi, isim/not TextInput alanları, canlı kapak önizleme ve kaydetme butonu.
- **[MODIFY] `app/ajandam.js`**: Tamamen yeniden tasarlandı. Kapak ekranı: CoverDisplay, düzenle butonu (CoverEditor modal'ını açar), "Ajandamı Aç" butonu (/ajandam/pages'e navigasyon). AsyncStorage'dan kapak verilerini yükler/kaydeder.

### 📄 Faz 4: Dinamik Sayfa Ekleme Sistemi
- **[NEW] `constants/pageTemplates.js`**: 4 kategori (To-Do, Aylık Ajanda, Haftalık Ajanda, Boş Sayfa), her birinde 3 farklı girly şablon (toplam 12 şablon). `generatePageId()`, `createDefaultPageData()`, `getPageTemplate()`, `getTemplatesForCategory()` yardımcı fonksiyonları.
- **[NEW] `components/pages/TodoPage.js`**: To-Do list bileşeni. Kalp/yıldız/daire checkbox stilleri, görev ekleme/silme/tamamlama, boş durum gösterimi.
- **[NEW] `components/pages/MonthlyPage.js`**: Aylık takvim bileşeni. Ay gezinme, takvim grid, bugün vurgulama, gün bazlı etkinlik görüntüleme. Türkçe ay/gün isimleri.
- **[NEW] `components/pages/WeeklyPage.js`**: Haftalık plan bileşeni. 7 günlük genişletilebilir (expandable) gün bölümleri, bugün vurgulama, görev ekleme/silme/tamamlama.
- **[NEW] `components/pages/BlankPage.js`**: Boş sayfa bileşeni. Çizgili, noktalı veya düz arka plan seçenekleri ile tam ekran serbest metin alanı.
- **[NEW] `components/AddPageModal.js`**: 3 adımlı sihirbaz: (1) Kategori seç (2x2 ikon kartları), (2) Şablon seç (liste), (3) Başlık gir + oluştur.
- **[NEW] `components/PageThumbnail.js`**: Sayfa önizleme kartı. Kategori ikonu, başlık, kategori badge'i, özet bilgi (görev sayısı/etkinlik sayısı vb.) ve oluşturma tarihi.
- **[NEW] `app/ajandam/_layout.js`**: Ajanda iç Stack navigasyonu (slide_from_right animasyonu).
- **[NEW] `app/ajandam/pages.js`**: Sayfa listesi ekranı. FlatList ile sayfa kartları, boş durum gösterimi, FAB butonu (AddPageModal'ı açar), uzun basarak sayfa silme (Alert ile onay).
- **[NEW] `app/ajandam/[pageId].js`**: Dinamik sayfa görüntüleme. Kategoriye göre doğru bileşeni render eder. Debounced auto-save (500ms). Sticker ekleme/taşıma/silme entegrasyonu. Üst barda geri, başlık ve sticker menü butonu.

### 🎀 Faz 5: Sticker (Çıkartma) Altyapısı
- **[NEW] `constants/stickerPacks.js`**: 6 sticker paketi (Kalpler, Yıldızlar, Doğa, Dekoratif, Yiyecekler, Ruh Hali), her pakette 6-8 emoji sticker (toplam 46 sticker).
- **[NEW] `components/stickers/DraggableSticker.js`**: `react-native-gesture-handler` Pan gesture ile sürükle-bırak, `react-native-reanimated` ile spring ölçekleme animasyonu, uzun basma (600ms) ile silme.
- **[NEW] `components/stickers/StickerCanvas.js`**: Sayfa içeriğinin üzerine absolute overlay. `pointerEvents="box-none"` ile sticker olmayan alanlara dokunma geçişi.
- **[NEW] `components/stickers/StickerMenu.js`**: Alt kısımdan açılan modal. Yatay kategori sekmeleri ve emoji sticker grid'i.

### 📁 Yeni Dosya Yapısı Özeti
```
[NEW]  constants/themes.js, coverTemplates.js, pageTemplates.js, stickerPacks.js
[NEW]  context/ThemeContext.js
[NEW]  services/storageService.js
[NEW]  components/CoverDisplay.js, CoverEditor.js, AddPageModal.js, PageThumbnail.js
[NEW]  components/pages/TodoPage.js, MonthlyPage.js, WeeklyPage.js, BlankPage.js
[NEW]  components/stickers/DraggableSticker.js, StickerCanvas.js, StickerMenu.js
[NEW]  app/ajandam/_layout.js, pages.js, [pageId].js
[MODIFY] app/_layout.js, app/index.js, app/ajandam.js
[MODIFY] constants/colors.js, babel.config.js
```

---

## 📅 [2026-08-30 12:47] - GitHub Push İşlemi
- Kullanıcı onayıyla "Ajandam" modülü altyapısı, tema motoru, kapak sistemi, dinamik sayfalar, sticker altyapısı ve tüm güncellenen kaynak kodlar GitHub uzak deposuna (`origin main`) push edildi (`https://github.com/Zeynepsoykan99/AJANDA`).

---

## 📅 [2026-08-30 13:00] - Vercel Web Canlıya Alma (Production Deployment) ⚠️ İPTAL EDİLDİ

### 🚀 Yapılan İşlemler (Sonradan geri alındı)
- Vercel dağıtımı denendi ancak beyaz ekran sorunu yaşandı.
- Web dağıtımından vazgeçildi, aşağıdaki temizlik adımları uygulandı.

---

## 📅 [2026-09-02 10:49] - Vercel Kalıntılarının Temizlenmesi ve Rota Çakışması Düzeltmesi

### 🧹 Temizlik İşlemleri
- **[DELETE] `vercel.json`**: Proje ana dizininden tamamen silindi.
- **[MODIFY] `.gitignore`**: Vercel dağıtımı için eklenen `.vercel/` satırı kaldırıldı.
- **[MODIFY] `package.json`**: Vercel için eklenen `"build": "expo export --platform web"` betiği silindi.

### 🔧 Rota Çakışması Düzeltmesi (Expo Router)
- **[MOVE] `app/ajandam.js` → `app/ajandam/index.js`**: Expo Router'da aynı isimde hem dosya (`ajandam.js`) hem de dizin (`ajandam/`) bulunması rota çakışmasına yol açıyordu. Dosya, dizin içine `index.js` olarak taşındı. Tüm import yolları `../` → `../../` olarak güncellendi.

---

## 📅 [2026-09-02 11:15] - iPad / Tablet Odaklı "Dijital Kırtasiye" Dönüşümü

### 🎨 Yeni Vizyon & Kırtasiye Efekt Kütüphanesi
- **[NEW] `hooks/useResponsiveLayout.js`**: iPad ve tablet ekranlarını (`width >= 700` veya `min >= 600`) algılayan, çift sayfa (`isTwoPage`) ve maksimum içerik kısıtlamalarını yöneten responsive layout hook'u.
- **[NEW] `components/stationery/WashiTape.js`**: Desenli (puantiyeli, çizgili, kalpli), hafif şeffaf, tırtıklı kenarlı pastel dekoratif washi bant bileşeni.
- **[NEW] `components/stationery/StickyNote.js`**: Gerçekçi kıvrık köşe gölgesi, washi bant tutturucusu ve pastel renkleriyle post-it yapışkan not bileşeni.
- **[NEW] `components/stationery/SpiralBinder.js`**: 3D metalik parlaklık ve gölge efektli spiral telli defter halkaları ve delik izleri (`punch holes`).
- **[NEW] `components/stationery/PaperSheet.js`**: Krem/fildişi rengi kağıt tabanı, çizgili satırlar, noktalı ızgara (BuJo) ve sol marj çizgisi efektleri.
- **[NEW] `components/stationery/NotebookContainer.js`**: Dış sert kapak kenarlığı, saten ayraç kurdelesi, sayfa katman gölgesi (`page stack`) ve telli defter kasası.

### 📔 Sayfa Şablonlarının Dönüşümü
- **[MODIFY] `components/pages/WeeklyPage.js`**:
  - Tablette **çift sayfa açık ajanda (two-page spread)** düzeni (Sol sayfa: Pzt-Sal-Çar, Ortada spiral cilt, Sağ sayfa: Per-Cum-Hafta sonu + Haftalık Hedefler Post-iti).
  - Washi bantlı gün başlıkları, kalp/yıldız checkbox'lar ve çizgili defter satırlarına doğrudan yazı yazma deneyimi.
- **[MODIFY] `components/pages/TodoPage.js`**:
  - Öğrenci masası konseptinde 3 ayrı kategoriye ayrıldı (Günün Öncelikleri, Dersler & Ödevler, Kişisel & Alışkanlıklar).
  - Tablette çok sütunlu açık defter panosu ve hatırlatıcı post-it kartı.
- **[MODIFY] `components/pages/MonthlyPage.js`**:
  - Geniş masa takvimi pedi, fosforlu kalem (highlighter) etkinlik etiketleri, gün düzenleme modalı ve yan hedef paneli.
- **[MODIFY] `components/pages/BlankPage.js`**:
  - Çift sayfalı açık Bullet Journal (noktalı/çizgili), iki sayfaya yayılan serbest not ve karalama alanı.

### 🏠 Arayüz ve Navigasyon İyileştirmeleri
- **[MODIFY] `app/ajandam/[pageId].js`**: Sayfalar `NotebookContainer` içine alınarak gerçek bir açık telli ajandaya dönüştürüldü.
- **[MODIFY] `components/CoverDisplay.js`**: Altın/metalik köşe koruyucuları (`corner protectors`), dikişli iç çerçeve ve defter kapatma lastiği (`elastic band`) eklendi.
- **[MODIFY] `app/ajandam/index.js`**: Kapak ekranı tablet boyutlarına göre ortalandı ve ölçeklendi.
- **[MODIFY] `app/index.js`**: Ana ekran menü butonları tabletlerde geniş yatay sırada (`flexDirection: row`) ve daha büyük dokunma alanlarıyla konumlandırıldı.
- **[MODIFY] `app/ajandam/pages.js`**, **`components/AddPageModal.js`**, **`components/CoverEditor.js`**: Tabletlerde geniş ekran sınırlandırması (`maxWidth`) ile estetik merkezleme yapıldı.

---

## 📅 [2026-09-02 11:21] - GitHub Push İşlemi
- Kullanıcı onayıyla "iPad/Tablet Dijital Kırtasiye" özellikleri, spiral cilt, washi bant, post-it, kağıt tabanı ve güncellenen tüm şablonlar GitHub uzak deposuna (`origin main`) push edildi (`https://github.com/Zeynepsoykan99/AJANDA`).



