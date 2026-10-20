/**
 * bannerVariant.test.js
 *
 * "Kaydedilemedi" uyarısı hata semantiğinde olmalı (uyarı ikonu, hata titreşimi);
 * hatırlatıcı bildirimi ise eskisi gibi (zil ikonu, "başarılı" titreşimi) kalmalı.
 *
 * BU TESTİN KAPSAMADIĞI: bileşenin cihazda çizimi ve titreşimin hissedilmesi.
 * Yalnızca kaynaktaki dallanma ve çağıranların hangi varyantı verdiği denetlenir.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const banner = read('components/ui/InAppNotificationBanner.js');
const layout = read('app/_layout.js');

console.log('--- Banner Varyant Testleri ---');

// Varsayılan varyant hatırlatıcı: mevcut kullanım değişmez
assert.ok(/variant = 'reminder',/.test(banner), "varsayilan variant 'reminder' olmali");
assert.ok(/const isError = variant === 'error';/.test(banner));
assert.ok(
  /isError \? Haptics\.NotificationFeedbackType\.Error : Haptics\.NotificationFeedbackType\.Success/.test(banner),
  'hata varyanti Error, hatirlatici Success titresimi'
);
assert.ok(
  /name=\{isError \? 'alert-circle-outline' : 'bell-ring'\}/.test(banner),
  'hata varyanti uyari ikonu, hatirlatici zil ikonu'
);
console.log('OK Test 1: hata varyanti uyari ikonu + hata titresimi; varsayilan hatirlatici gorunumu');

// Çağıranlar: depolama hatası 'error', bildirim 'reminder'
const storageBlock = /subscribeStorageWriteFailed\(\(\) => \{[\s\S]*?\}\)/.exec(layout);
assert.ok(storageBlock && /variant: 'error'/.test(storageBlock[0]), "Kaydedilemedi 'error' varyanti kullanmali");
const reminderBlock = /onReceived: \(notification\) => \{[\s\S]*?\n {6}\},/.exec(layout);
assert.ok(reminderBlock && /variant: 'reminder'/.test(reminderBlock[0]), "hatirlatici 'reminder' kalmali");
assert.ok(/variant=\{inAppBanner\.variant\}/.test(layout), 'varyant bannera iletilmeli');
console.log("OK Test 2: depolama hatasi 'error', hatirlatici bildirimi 'reminder' varyantinda");

console.log('--- TUM BANNER VARYANT TESTLERI GECTI ---');
