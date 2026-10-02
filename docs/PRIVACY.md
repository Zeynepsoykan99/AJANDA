---
layout: default
permalink: /privacy/
title: "AJANDA — Gizlilik Politikası"
lang: tr
---

# AJANDA — Gizlilik Politikası

**Son güncelleme:** 2 Ekim 2026

[English](/AJANDA/privacy/en/) · [Deutsch](/AJANDA/privacy/de/) · [Español](/AJANDA/privacy/es/) · [Français](/AJANDA/privacy/fr/)

## Özet

AJANDA'nın sunucusu yoktur. Hesap oluşturmanız gerekmez, sizden kimlik bilgisi istemez ve yazdıklarınızı bir sunucuda saklamaz. Ajandanız, günlüğünüz, notlarınız, çizimleriniz, çıkartmalarınız ve ses kayıtlarınız cihazınızda durur.

Bunun **iki istisnası** vardır ve ikisi de yalnızca yazdıklarınızı metne çevirmek içindir: **el yazısı tanıma** ve **sesli notların metne dönüştürülmesi**. Aşağıda ikisini de ayrıntılı anlatıyoruz.

---

## 1. Verileriniz nerede tutulur

Oluşturduğunuz her şey cihazınızın kendi depolama alanında saklanır:

- Ajanda sayfaları, yapılacaklar listeleri, günlük ve defter sayfaları
- Çizimleriniz, metin kutularınız, çıkartmalarınız, kapak tasarımlarınız
- Ses kayıtlarınız (cihazınızdaki uygulama klasöründe dosya olarak)
- Tema ve dil tercihiniz, hatırlatıcılarınız

Bu verilere biz erişemeyiz. Bir sunucuya yüklenmez, yedeklenmez ve başka bir cihaza aktarılmaz. **Uygulamayı cihazınızdan silerseniz bu verilerin tamamı silinir.**

---

## 2. El yazısı tanıma

El yazınızı aranabilir metne çevirebilmek için, çizgilerinizin **koordinatları**, yazı alanının boyutu ve seçtiğiniz dil internet üzerinden **Google'ın el yazısı tanıma servisine** (`inputtools.google.com`) gönderilir ve metne orada dönüştürülür.

**Gönderilmeyenler:** adınız, bir hesap bilgisi, cihaz kimliği veya başka bir tanımlayıcı. Yalnızca çizgi koordinatları gönderilir. Dönen metin **yalnızca cihazınızda** saklanır.

Bu dönüşüm iki şekilde çalışır:

- **Kendiliğinden:** **Ajandam** ve **Yapılacaklar** bölümlerinde el yazısıyla yazdığınızda, yazdıklarınızın aramada bulunabilmesi için arka planda çalışır.
- **Siz istediğinizde:** Kement aracıyla bir yazıyı seçip "metne çevir" dediğinizde. **Günlüğüm** ve **Notlarım** bölümlerinde dönüşüm **yalnızca bu şekilde**, yani siz açıkça istediğinizde çalışır — orada kendiliğinden hiçbir şey gönderilmez.

Bu özelliği ilk kullandığınızda uygulama içinde bir bilgilendirme gösterilir.

Çizgi koordinatları yazdığınız şeyin kendisidir: bir araya getirildiğinde el yazınız yeniden çizilebilir. Bu nedenle **özel tutmak istediğiniz bir şeyi el yazısıyla yazarken bunu bilerek yazmanızı öneririz.**

---

## 3. Sesli notların metne dönüştürülmesi

Sesli notlarınızı aranabilir metne çevirmek için kaydınız, cihazınızın **işletim sistemi tarafından sağlanan ses tanıma özelliğine** iletilir. Bu özelliği biz sağlamıyoruz; cihazınızın üreticisi/platformu sağlıyor.

- **Android cihazlarda:** bu işi telefonun kendi ses tanıma servisi yapar — çoğu cihazda bu servis **Google'a** aittir. Sesiniz, metne çevrilmek üzere **internet üzerinden bu servise gönderilebilir.** Bu kararı cihazınızdaki servis verir; uygulama bunu belirleyemez veya göremez.
- **iPhone ve iPad'de:** dönüşümün cihazın içinde yapılmasını talep ederiz. Ancak cihazınız seçtiğiniz dili kendi başına çeviremiyorsa, sesiniz **Apple'ın sunucularına gönderilebilir.**

**Kaydettiğiniz ses dosyasının kendisi yalnızca cihazınızda saklanır**; biz hiçbir yere yüklemeyiz. Adınız, hesabınız veya cihaz bilginiz gönderilmez.

Bu özelliği ilk kullandığınızda uygulama içinde bir bilgilendirme gösterilir. Sesinizin işletim sistemi tarafından nasıl işlendiğini öğrenmek için cihazınızın üreticisinin gizlilik politikasına da bakabilirsiniz.

---

## 4. Kilit (PIN ve biyometrik doğrulama)

Günlüğünüzü ve defterlerinizi 4 haneli bir PIN ile kilitleyebilir, cihazınız destekliyorsa parmak izi veya yüz tanıma ile açabilirsiniz.

**Bu kilidin ne yaptığı:** PIN'iniz cihazınızın donanım korumalı güvenli alanında (iOS'ta Keychain, Android'de Keystore) saklanır; şifrelenmemiş genel depolama alanına **hiçbir koşulda yazılmaz**. Yanlış PIN denemeleri sınırlandırılır; art arda hatalı girişte bekleme süresi kademeli olarak artar.

**Bu kilidin ne yapmadığı — açıkça belirtmek istiyoruz:** Kilit bir **erişim kapısıdır**. Defterinizi uygulama içinde başkalarının açmasını engeller, ancak **defterin içeriğini şifrelemez.** Cihazınızın dosya sistemine teknik yollarla erişebilen biri (ör. "root"lanmış veya "jailbreak" yapılmış bir cihazda, ya da bir cihaz yedeği üzerinden) içeriği PIN'e ihtiyaç duymadan okuyabilir.

Bu nedenle en önemli koruma, **cihazınızın kendi ekran kilidi ve şifrelemesidir.** Cihazınıza bir ekran kilidi koymanızı öneririz.

Biyometrik verileriniz (parmak izi, yüz) işletim sistemi tarafından işlenir; uygulama bu verilere erişmez ve saklamaz — yalnızca "doğrulama başarılı oldu" sonucunu alır.

---

## 5. Hatırlatıcılar

Sayfalarınıza hatırlatıcı kurduğunuzda, bildirim **cihazınızda yerel olarak** zamanlanır. Hiçbir sunucuya kayıt yapılmaz, uzak bildirim (push) altyapısı kullanılmaz ve bu nedenle bildirim kimliği gibi bir tanımlayıcı oluşturulup gönderilmez.

---

## 6. Dışa aktarma ve paylaşma

Bir sayfayı PDF olarak dışa aktardığınızda dosya cihazınızda oluşturulur ve cihazınızın paylaşım menüsü açılır. Dosyanın nereye gittiğine **siz** karar verirsiniz. Uygulama dosyayı kendiliğinden hiçbir yere göndermez.

---

## 7. Toplamadıklarımız

Açıkça belirtmek isteriz; uygulama şunları **yapmaz**:

- Hesap açmanızı istemez, e-posta veya telefon numarası toplamaz
- Analitik, kullanım istatistiği veya çökme raporu toplamaz
- Reklam göstermez, reklam kimliği veya izleme tanımlayıcısı kullanmaz
- Konumunuza, kişilerinize, fotoğraflarınıza veya takviminize erişmez
- Verilerinizi hiç kimseye satmaz veya pazarlama amacıyla paylaşmaz

---

## 8. Verilerinizi silme

- Tek tek sayfa, not, ses kaydı veya defteri uygulama içinden silebilirsiniz.
- Tüm verilerinizi silmek için uygulamayı cihazınızdan kaldırmanız yeterlidir.
- Bir sunucuda veriniz olmadığı için bizden silme talep etmeniz gereken bir kayıt bulunmaz.

El yazısı veya sesinizin metne çevrilmesi için gönderilen verilerin Google veya Apple tarafından ne kadar süre tutulduğu o şirketlerin politikalarına tabidir; bu konuda bizim bir kontrolümüz yoktur.

---

## 9. Çocukların gizliliği

AJANDA **genel kullanıcı kitlesine** yöneliktir. 13 yaşın altındaki çocuklar için özel olarak tasarlanmamıştır ve bu yaş grubuna yönelik olarak sunulmamaktadır.

13 yaşın altındaki çocuklardan bilerek kişisel bilgi toplamayız — zaten uygulama **hiç kimseden** hesap bilgisi veya kişisel bilgi toplamaz.

Çocuğunuzun uygulamayı kullanmasına izin veriyorsanız, 2. ve 3. bölümlerde anlatılan el yazısı ve ses dönüşümü özelliklerini bilerek kullanması konusunda ona yardımcı olmanızı öneririz.

---

## 10. Bu politikadaki değişiklikler

Bu politikayı güncellersek üstteki "Son güncelleme" tarihini değiştiririz. Önemli bir değişiklik olursa uygulama içinde bildiririz.

---

## 11. İletişim

Gizlilikle ilgili sorularınız için: zeynepsoykan99@gmail.com

Uygulama sahibi: Zeynep Soykan
