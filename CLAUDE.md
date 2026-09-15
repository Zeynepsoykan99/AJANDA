@AGENTS.md

# AJANDA — Claude Çalışma Rehberi

Dijital kırtasiye tarzı ajanda/günlük uygulaması (Expo / React Native, tablet + Apple Pencil odaklı).
Tüm veriler cihazda (AsyncStorage) tutulur; backend yoktur.

## Çalışma Kuralları
- Adım adım ayrı rapor yok; iş bitince tek rapor.
- Kapsamı kendi başına genişletme, örnek/varsayılan içerik uydurma; kararları kullanıcıya sor.
- Commit atabilirsin, ancak her `git push` öncesi kullanıcının onayını iste.

## Teknoloji Yığını
- Expo SDK 54 (`expo ~54.0.37`), React Native 0.81.5, React 19.1.0 — dil: JavaScript (TypeScript yok)
- Navigasyon: `expo-router ~6.0.24` (dosya tabanlı rotalar, `app/`)
- Animasyon/dokunma hareketleri: `react-native-reanimated ~4.1` + `react-native-worklets 0.5.1`, `react-native-gesture-handler ~2.28`
- Çizim: `react-native-svg 15.12.1`; renk çarkı: `reanimated-color-picker`
- Depolama: `@react-native-async-storage/async-storage 2.2.0`
- i18n: `i18next` + `react-i18next` + `expo-localization` (tr, en, de, es, fr)
- `nativewind 2` + `tailwindcss 3.3.2` kurulu ve babel'e ekli, fakat kodda `className` kullanılmıyor; stiller `StyleSheet.create` ile yazılıyor.
- Hedef cihazda test Expo Go (SDK 54) ile yapılıyor.

## Komutlar
- Kurulum: `npm install` (postinstall, i18next `module` alanını CJS'e yamalar)
- Geliştirme: `npm start` (`expo start`), `npm run android`, `npm run ios`, `npm run web`
- Test: `node tests/zoomableCanvas.test.js` (tek test dosyası; test runner yok, `npm test` script'i yok)
- Lint/format: yapılandırılmamış (ESLint/Prettier yok)
- Build: script yok; paket derleme kontrolü için `npx expo export` kullanılmış (çıktı `dist/`, gitignore'da)

## Mimari Özeti
```
app/                  Ekranlar (expo-router)
  _layout.js          GestureHandlerRootView > ThemeProvider > SafeAreaProvider > Stack
  index.js            Ana menü (günlüğüm / ajandam / notlarım / yapılacaklar), dil, tema, global arama
  ajandam/            index.js (kapak) → pages.js (sayfa listesi) → [pageId].js (sayfa tuvali)
  todolist/           index.js (liste) → [pageId].js (to-do tuvali)
  gunlugum/           index.js (kapak + kağıt şablonu) → pages.js (yatay kaydırmalı çoklu sayfa)
  defterlerim.js      Yer tutucu ekran (yalnızca başlık)
components/           drawing/ (DrawingCanvas, Toolbar, ZoomableCanvas, Lasso, Recognition modal),
                      text/TextCanvas, stickers/, stationery/ (kağıt/defter görselleri), pages/, ui/, modallar
constants/            pageTemplates, coverTemplates, themes, fonts, stickerPacks, colors (eski uyumluluk)
context/ThemeContext  Tek global state: tema (AsyncStorage'a kalıcı)
services/             storageService (tüm AsyncStorage CRUD), searchService (global arama),
                      handwritingService (Google Input Tools el yazısı tanıma — ağ gerektirir)
hooks/                useResponsiveLayout (tablet/çift sayfa), useDynamicEdgeColor (kenar rengi fade)
utils/                lassoGeometry, colorUtils, pageTitleHelper, snapping
i18n/, locales/       i18next kurulumu ve dil dosyaları
```
Veri akışı: Ekran `useState` ile veriyi tutar → değişiklikte debounce'lu (`setTimeout` 400–500 ms)
`StorageService` çağrısı → AsyncStorage'a tüm JSON yeniden yazılır. Global store/cache yok (tema hariç).

AsyncStorage anahtarları: `@ajanda_theme`, `@ajanda_language`, `@ajanda_cover` (ajanda kapağı),
`@ajanda_pages` (ajanda + to-do sayfaları tek dizide, `category` ile ayrılır), `@ajanda_diary_v1` (günlük).

## Kod Konvansiyonları
- Fonksiyonel bileşenler + hook'lar; bileşen başına bir dosya, `export default`. Stiller dosya sonunda `StyleSheet.create`.
- Dosya adları: bileşenler PascalCase (`DrawingCanvas.js`), servis/hook/util camelCase. Rota klasörleri Türkçe (`ajandam`, `gunlugum`, `todolist`).
- Kod içi yorumlar, JSDoc başlıkları, `console.warn` mesajları ve varsayılan metinler Türkçe; değişken/fonksiyon adları İngilizce.
- UI metinleri `t('anahtar', 'Türkçe varsayılan')` ile; yeni anahtar 5 dil dosyasının hepsine eklenmeli.
- ID üretimi: `${prefix}_${Date.now()}_${random}` (`page_`, `stroke_`, `text_`, `stk_`).
- Renkler temadan `useTheme().colors`; şablonların `edgeColor` alanı ekran kenar rengini belirler.
- Görseller WEBP olmalı (bkz. AGENTS.md). `gorsel/` ham görsel klasörüdür, koddan referans verilmez.
- Commit mesajı: Conventional Commits (`feat(scope): ...`, `fix(scope): ...`); açıklama TR veya EN karışık kullanılmış.
- Önceki ajan her değişikliği `ilerleme.md` (değişiklik günlüğü) dosyasına kaydediyordu.
