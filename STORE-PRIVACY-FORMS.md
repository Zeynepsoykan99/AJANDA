# Mağaza Gizlilik Formları — Doldurma Rehberi

Bu dosya **iç kullanım içindir**, yayınlanmaz (`docs/` klasöründe değildir).
Google Play "Data safety" ve App Store Connect "App Privacy" formlarının nasıl
doldurulacağını kalem kalem anlatır.

Dayandığı kaynak: `docs/PRIVACY.md` (gizlilik politikası) ve kodda doğrulanmış
teknik gerçekler. Politika metni ile bu form cevapları **birbiriyle tutarlı
olmalıdır**; biri değişirse diğeri de gözden geçirilmelidir.

---

## 0. Önce bilmeniz gereken üç şey

### 0.1 Form arayüzleri değişiyor
Bölüm ve soru adları Google/Apple tarafından zaman zaman değiştiriliyor.
Aşağıdaki başlıkları birebir aramak yerine **sorunun anlamına göre** eşleştirin.

### 0.2 Bir yargı kararı var — ve bunu siz vermelisiniz
Sesli notlar, uygulamanın kendi ağ isteğiyle değil, **işletim sisteminin ses
tanıma API'siyle** (Android `SpeechRecognizer`, iOS `SFSpeechRecognizer`)
işleniyor. Sesi cihaz dışına çıkaran karar, cihazdaki servisin kendisine ait;
uygulama bunu ne belirleyebiliyor ne görebiliyor.

Mağaza kuralları, "işletim sisteminin kullanıcı adına yaptığı işlemleri" bazı
durumlarda beyan dışı bırakıyor. **Bunun bu duruma uygulanıp uygulanmadığından
emin değilim** — kuralların lafzı net değil.

Bu rehberdeki tavsiye **temkinli yorumu** izliyor: **beyan edin.**
Gerekçe: fazla beyan etmek risksizdir (en kötüsü mağaza kartında bir satır fazla
görünür), eksik beyan etmek ise politika ihlali ve uygulamanın kaldırılması
riskini taşır.

### 0.3 El yazısı için yargı kararı yok
El yazısı tanıma, **uygulamanın kendi HTTPS isteğiyle** `inputtools.google.com`
adresine gidiyor (`services/handwritingService.js`). Burada tartışma yok:
**beyan edilmesi zorunlu.**

---

## 1. Google Play — Data safety

**Nerede:** Play Console → uygulamanız → **Policy → App content → Data safety → Start**

### 1.1 Bölüm: Data collection and security

| Soru | Cevap | Gerekçe |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | El yazısı çizgileri ve ses cihaz dışına çıkıyor |
| Is all of the user data collected by your app encrypted in transit? | **Yes** | El yazısı isteği HTTPS (`https://inputtools.google.com/...`); işletim sistemi ses servisleri kendi güvenli kanallarını kullanır |
| Do you provide a way for users to request that their data is deleted? | **No** *(karar sizin — bkz. aşağıdaki not)* | Sunucuda hiçbir veri tutmuyoruz; silinmesini talep edeceğiniz bir kaydımız yok |

> **"Data deleted" sorusu hakkında:** Bu soru, *sizin* tuttuğunuz verinin
> silinmesi hakkında. Sunucunuz olmadığı için silecek bir şeyiniz yok; **No**
> doğru ve savunulabilir cevaptır. Google veya Apple'ın tanıma için aldığı
> veriyi siz silemezsiniz, dolayısıyla **Yes** demek yanıltıcı olur.
> Uygulama içindeki silme imkânı politikanın 8. bölümünde zaten anlatılıyor.
> İsterseniz **Yes** + "uygulama içinden silinebilir" açıklaması da seçebilirsiniz;
> bu bir tercih, hata değil.

> **Hesap silme URL'si:** Uygulamada hesap olmadığı için bu zorunluluk
> **sizin için geçerli değil.** Soru çıkarsa "uygulamada hesap yok" yolunu seçin.

### 1.2 Bölüm: Data types — hangi kutular işaretlenecek

**İşaretlenecek yalnızca iki kalem var:**

| Kategori | Alt tür | İşaretle? |
|---|---|---|
| **Audio files** | Voice or sound recordings | ✅ **EVET** |
| **App activity** | Other user-generated content | ✅ **EVET** |

**İşaretlenmeyecek her şey** (hepsi kodda doğrulandı):

| Kategori | Neden hayır |
|---|---|
| Location (Approximate / Precise) | Konum izni ve kodu yok |
| Personal info (Name, Email, User IDs, Address, Phone, Race, Beliefs, Orientation, Other) | Hesap yok, hiçbir kimlik bilgisi toplanmıyor |
| Financial info | Ödeme/satın alma yok |
| Health and fitness | Yok |
| Messages (Emails, SMS, Other in-app messages) | Uygulama içeriği mesaj değil |
| Photos and videos | Fotoğraf/galeri erişimi yok (`expo-image-picker` bağımlılığı bile yok) |
| Audio files → Music files / Other audio files | Yalnızca ses kaydı var |
| Files and docs | Kullanıcı dosyası okumuyoruz; PDF *üretip* paylaşım menüsüne veriyoruz |
| Calendar | Cihaz takvimine erişmiyoruz; ajanda tamamen uygulama içi |
| Contacts | Yok |
| App activity → App interactions / In-app search history / Installed apps / Other actions | Analitik yok; arama tamamen cihazda, hiçbir yere gitmiyor |
| Web browsing history | Yok |
| App info and performance (Crash logs, Diagnostics, Other) | Çökme raporu / analitik SDK'sı yok |
| Device or other IDs | Hiçbir tanımlayıcı gönderilmiyor; push token bile üretilmiyor |

### 1.3 "Voice or sound recordings" detay sayfası

| Soru | Cevap |
|---|---|
| Is this data collected, shared, or both? | **Both** (Collected **ve** Shared) |
| Is this data processed ephemerally? | **No** — "collected" seçin |
| Is this data required for your app, or can users choose whether it's collected? | **Users can choose whether this data is collected** (= Optional) |
| Why is this user data collected? | Yalnızca **App functionality** |
| Why is this user data shared? | Yalnızca **App functionality** |

**Gerekçeler:**
- **Shared:** Ses, cihazdaki tanıma servisine (çoğu cihazda Google) gidiyor.
  Bizimle sözleşmeli bir "service provider" ilişkisi olmadığı için "shared"
  temkinli ve doğru cevap.
- **Ephemeral değil:** "Ephemeral" iddiası, verinin işlendikten sonra hemen
  silindiğini garanti etmek demektir. Google/Apple'ın ne kadar sakladığını
  **bilemiyoruz**, dolayısıyla bu iddiada bulunmamalıyız.
- **Optional:** Ana menüdeki **Gizlilik ve Veri** ekranından *"Sesli notları
  otomatik metne çevir"* kapatılabiliyor (`services/privacySettingsService.js`).
  Kapatıldığında ses, işletim sisteminin tanıma servisine **hiç verilmez**.

### 1.4 "Other user-generated content" detay sayfası

| Soru | Cevap |
|---|---|
| Is this data collected, shared, or both? | **Both** |
| Is this data processed ephemerally? | **No** |
| Is this data required for your app, or can users choose whether it's collected? | **Users can choose whether this data is collected** (= Optional) |
| Why is this user data collected? | Yalnızca **App functionality** |
| Why is this user data shared? | Yalnızca **App functionality** |

**Gerekçe:** El yazısı çizgi koordinatları. Ana menüdeki **Gizlilik ve Veri**
ekranından *"Otomatik el yazısı tanıma"* kapatılabiliyor
(`services/privacySettingsService.js`) → **Optional**.

### 1.5 Son adım
**Store listing preview** ekranını okuyun. Kartta şu iki satırın görünmesi
beklenir: *"Voice or sound recordings"* ve *"Other user-generated content"*,
ikisi de "Shared" ve "Collected" olarak. Beklenmeyen bir satır varsa bir kutuyu
yanlışlıkla işaretlemişsiniz demektir.

---

## 2. Apple — App Store Connect / App Privacy

**Nerede:** App Store Connect → uygulamanız → **App Privacy**

### 2.1 Privacy Policy URL (zorunlu)

```
https://zeynepsoykan99.github.io/AJANDA/privacy/
```

> ⚠️ Bu adresin **çalıştığını** girmeden önce tarayıcıda doğrulayın.
> GitHub Pages repo ayarlarından açılmadan adres 404 verir ve Apple reddeder.

### 2.2 Data Collection — ilk soru

| Soru | Cevap |
|---|---|
| Do you or your third-party partners collect data from this app? | **Yes, we collect data from this app** |

> **"Data Not Collected" seçeneğini SEÇMEYİN.** El yazısı ve ses cihaz dışına
> çıktığı için bu yanlış beyan olur.

### 2.3 Hangi veri türleri işaretlenecek

**Yalnızca "User Content" kategorisinden iki alt tür:**

| Kategori | Alt tür | İşaretle? |
|---|---|---|
| **User Content** | **Audio Data** | ✅ **EVET** |
| **User Content** | **Other User Content** | ✅ **EVET** |

**İşaretlenmeyecekler:**

| Kategori | Neden hayır |
|---|---|
| Contact Info (Name, Email, Phone, Physical Address, Other) | Hesap yok |
| Health & Fitness | Yok |
| Financial Info | Yok |
| Location (Precise / Coarse) | Yok |
| Sensitive Info | Yok |
| Contacts | Yok |
| User Content → Photos or Videos | Galeri erişimi yok |
| User Content → Gameplay Content / Customer Support | Yok |
| Browsing History | Yok |
| Search History | Arama tamamen cihazda |
| Identifiers (User ID, Device ID) | Hiçbir tanımlayıcı gönderilmiyor |
| Purchases | Satın alma yok |
| Usage Data | Analitik yok |
| Diagnostics (Crash Data, Performance Data, Other) | Çökme raporu SDK'sı yok |
| Other Data | Yok |

### 2.4 "Audio Data" detay soruları

| Soru | Cevap |
|---|---|
| **Purposes** (amaçlar) | Yalnızca **App Functionality** |
| | ❌ Analytics · ❌ Product Personalization · ❌ Advertising or Marketing · ❌ Developer's Advertising or Marketing · ❌ Other Purposes |
| Is this data linked to the user's identity? | **No, this data is not linked to the user's identity** |
| Do you or your third-party partners use this data for tracking purposes? | **No** |

**Gerekçe (önemli):** Kodda doğrulandı — ses tanıma isteğiyle **hiçbir
tanımlayıcı** gönderilmiyor: ad, hesap, cihaz kimliği yok. Bu yüzden
"not linked" doğru cevap.

### 2.5 "Other User Content" detay soruları

| Soru | Cevap |
|---|---|
| **Purposes** | Yalnızca **App Functionality** |
| Is this data linked to the user's identity? | **No, this data is not linked to the user's identity** |
| Do you or your third-party partners use this data for tracking purposes? | **No** |

**Gerekçe:** `handwritingService.js`'in gönderdiği gövdede yalnızca çizgi
koordinatları, yazı alanı boyutu ve dil kodu var (`app_version`, `api_level`,
`device` alanları sabit metinler, gerçek cihaz bilgisi değil).

### 2.6 App Review'a not (isteğe bağlı ama önerilir)

"App Review Information → Notes" alanına kısa bir açıklama bırakmanız
incelemeyi hızlandırabilir:

> AJANDA'nın sunucusu ve kullanıcı hesabı yoktur; tüm içerik cihazda tutulur.
> İki istisna, yalnızca metne çevirme amacıyladır: (1) el yazısı tanıma,
> Google Input Tools'a yalnızca çizgi koordinatlarını gönderir; (2) sesli
> notların metne çevrilmesi, işletim sisteminin ses tanıma API'sini kullanır
> (iOS'ta cihaz üstü tanıma talep edilir). Her ikisi de ilk kullanımda uygulama
> içinde kullanıcıya bildirilir ve gizlilik politikasında açıklanır.

---

## 3. Yayın öncesi diğer gizlilik maddeleri

### 3.1 iOS izin metinleri — ✅ hazır
`app.json` → `ios.infoPlist`:

| Anahtar | Durum |
|---|---|
| `NSMicrophoneUsageDescription` | ✅ var |
| `NSSpeechRecognitionUsageDescription` | ✅ güncellendi — sesin Apple sunucularına gidebileceğini söylüyor |
| `NSFaceIDUsageDescription` | ✅ güncellendi — "korumak" yerine gerçekte ne yaptığını söylüyor |

### 3.2 iOS Privacy Manifest (`PrivacyInfo.xcprivacy`) — ⚠️ kontrol edilmeli

Apple, belirli "required reason API"leri kullanan uygulamalardan bir privacy
manifest istiyor. Bu projede:

- **Üçüncü taraf kütüphaneler kendi manifest'lerini getiriyor** (doğrulandı,
  `node_modules` içinde 11 adet). Örnekler:
  - `@react-native-async-storage/async-storage` → `NSPrivacyAccessedAPICategoryFileTimestamp` (sebep `C617.1`)
  - `expo-file-system` → `FileTimestamp` + `DiskSpace`
  - `react-native`, `expo-constants`, `expo-localization`, `expo-notifications` …
- **Uygulamanın kendi manifest'i yok** (`app.json`'da `ios.privacyManifests` tanımlı değil).

**Değerlendirmem:** Uygulamanın kendi JS kodu bu API'lere doğrudan dokunmuyor;
hepsi kütüphanelerin içinde ve onlar beyan ediyor. Bu nedenle kendi manifest'e
**muhtemelen gerek yok.** **Ancak bunu cihazda/yüklemede doğrulamadım.**
İlk TestFlight yüklemesinde Apple bir e-posta ile eksik beyan bildirirse
`app.json` → `expo.ios.privacyManifests` ile eklenebilir. **Yüklemeden önce
bunu bir engel olarak görmeyin, ama gelen e-postayı takip edin.**

### 3.3 Play — diğer App content maddeleri
Data safety dışında şunlar da doldurulur; gizlilikle ilgili olanlar:

| Madde | Not |
|---|---|
| Privacy policy | Yukarıdaki URL |
| Ads | **Uygulama reklam içermiyor** |
| App access | Hesap yok → "All functionality is available without special access" |
| Content rating | Anketi doldurun; genel kitle (bkz. politikanın 9. bölümü) |
| Target audience and content | **13 yaş altına yönelik DEĞİL** — politikanın 9. bölümüyle tutarlı olmalı |
| Data safety | Bölüm 1 |

> ⚠️ **"Target audience" cevabı ile politikanın 9. bölümü çelişmemeli.**
> Politikada "13 yaş altına yönelik değil" yazıyor; formda 13 yaş altı bir yaş
> grubu seçerseniz Play'in Families politikası devreye girer ve el yazısı/ses
> verisinin üçüncü tarafa gitmesi ayrıca değerlendirilmesi gerekir.

---

## 4. Özet tablo — tek bakışta

| | Google Play | Apple |
|---|---|---|
| Veri toplanıyor mu? | Yes | Yes, we collect data |
| El yazısı | App activity → **Other user-generated content** | User Content → **Other User Content** |
| Sesli not | Audio files → **Voice or sound recordings** | User Content → **Audio Data** |
| Amaç | App functionality (yalnızca) | App Functionality (yalnızca) |
| Kimliğe bağlı mı? | — | **No, not linked** |
| İzleme (tracking)? | — | **No** |
| Paylaşılıyor mu? | **Both** (collected + shared) | — |
| Zorunlu mu? | **Optional** (kullanıcı kapatabiliyor) | — |
| Ephemeral? | **No** | — |
| Analitik / reklam / tanımlayıcı | Hiçbiri | Hiçbiri |
| Politika adresi | `https://zeynepsoykan99.github.io/AJANDA/privacy/` | aynı |

---

## 5. Ayarlar — "Optional" sınıflandırmasının dayanağı

Ana menüdeki **Gizlilik ve Veri** ekranında (kalkan ikonu) iki aç/kapa var:

| Ayar | Kapatılınca ne olur |
|---|---|
| Otomatik el yazısı tanıma | Ajandam/Yapılacaklar'da el yazısı **aranabilir olmaz**. Kement ile "metne çevir" çalışmaya devam eder |
| Sesli notları otomatik metne çevir | Kayıt çalışır ama **transkript üretilmez**. Kullanıcı bir notu sonradan kendisi çevirebilir |

Kod: `services/privacySettingsService.js`
(`@ajanda_auto_handwriting_v1`, `@ajanda_auto_transcribe_v1`).

### Varsayılan değer form cevabını DEĞİŞTİRMEZ
Play'in sorusu şu: *"Is this data required for your app, or can users choose
whether it's collected?"* — ölçüt **kullanıcının kapatabiliyor olması**, ayarın
varsayılan değeri değil. Varsayılan açık da olsa kapalı da olsa cevap
**"Users can choose whether this data is collected"** (= Optional) olur.

**Mevcut varsayılan:** her ikisi de **AÇIK**
(`AUTO_HANDWRITING_DEFAULT`, `AUTO_TRANSCRIBE_DEFAULT` — `privacySettingsService.js`).
Varsayılan değiştirilirse bu satırı güncelleyin; **form cevabı değişmez.**

---

## 6. Sorumluluk notu

Bu rehber, kodda doğrulanmış gerçeklere dayanan bir yardımcı dokümandır;
**hukuki tavsiye değildir.** Form cevaplarının nihai sorumluluğu yayıncıya
(Zeynep Soykan) aittir. Özellikle bölüm 0.2'deki yargı kararını ve bölüm 1.1'deki
"data deleted" sorusunu kendiniz gözden geçirin.
