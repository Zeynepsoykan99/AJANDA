/**
 * Çıkartmalar için akıllı hizalama (snap) ve mavi kılavuz çizgileri KALDIRILDI.
 * Karar: yalnızca çıkartmalar serbest yerleşim olsun; çıkartma parmağın bıraktığı
 * koordinatta kalsın. Metin kutusu (`TextCanvas`) ve `SmartSnappingContext`
 * olduğu gibi durur.
 *
 * Bu test ÖNCE eski sürümün bu çağrıları gerçekten yaptığını git'ten okuyarak
 * gösterir (yoksa "kaldırıldı" iddiası boş olurdu), SONRA mevcut sürümde
 * hiçbirinin kalmadığını doğrular.
 *
 * KAPSAMADIĞI: ekranda gerçekten çizgi çizilip çizilmediği (render) yalnızca
 * cihazda görülebilir. Bu test kaynak düzeyinde çağrı yokluğunu kanıtlar.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/** Hizalamanın HENÜZ VAR olduğu son commit. */
const SNAP_COMMIT = 'f81d6a24';
const STICKER_PATH = 'components/stickers/DraggableSticker.js';

const readOldSource = () => {
  try {
    return execSync('git show ' + SNAP_COMMIT + ':' + STICKER_PATH, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (e) {
    return null;
  }
};

const current = read(STICKER_PATH);
const old = readOldSource();

console.log('--- Cikartma Hizalamasi Kaldirildi Testleri ---');

/** Çıkartma tarafında artık bulunmaması gereken hizalama izleri. */
const SNAP_MARKERS = [
  ['useSmartSnapping', 'hizalama baglamini okuma'],
  ['getSnapTargets', 'hizalama hedeflerini hazirlama'],
  ['calculateSnapping', 'yapismis konum hesabi'],
  ['guideLineXVisible', 'dikey kilavuz cizgisi gosterme'],
  ['guideLineYVisible', 'yatay kilavuz cizgisi gosterme'],
  ['snapTargetsX', 'hedef listesi (X)'],
  ['snapTargetsY', 'hedef listesi (Y)'],
  ['isSnappedV', 'yapisma durumu (dikey)'],
  ['isSnappedH', 'yapisma durumu (yatay)'],
  ['onSnapChange', 'yapisma bildirimi prop u'],
];

// --- Test 1: ESKI surum bu cagrilari GERCEKTEN yapiyordu --------------
// Bu olmadan "kaldirildi" iddiasi dogrulanamaz.
{
  assert.ok(old, SNAP_COMMIT + ' surumundeki kaynak git ten okunabilmeli');
  const missing = SNAP_MARKERS.filter(([m]) => !old.includes(m)).map(([m]) => m);
  assert.strictEqual(
    missing.length,
    0,
    'eski surumde bulunmasi beklenen hizalama izleri yok: ' + missing.join(', ')
  );
  console.log(
    'OK Test 1: ' + SNAP_COMMIT + ' surumu ' + SNAP_MARKERS.length + ' hizalama izini iceriyordu'
  );
}

// --- Test 2: MEVCUT surumde hicbiri kalmadi --------------------------
{
  const leftover = SNAP_MARKERS.filter(([m]) => current.includes(m));
  assert.strictEqual(
    leftover.length,
    0,
    'cikartma tarafinda hizalama kalintisi var: ' +
      leftover.map(([m, label]) => m + ' (' + label + ')').join(', ')
  );
  console.log('OK Test 2: cikartma tarafinda hizalama/yapisma izi kalmadi');
}

// --- Test 3: Tasima SERBEST -- konum dogrudan parmaktan ---------------
// onUpdate, translate degerlerini ara bir "yapismis konum" degiskeninden degil
// DOGRUDAN jest otelemesinden yazmali.
{
  const onUpdate = /\.onUpdate\(\(event\) => \{[\s\S]*?\n    \}\)/.exec(current);
  assert.ok(onUpdate, 'govde pan onUpdate bulunmali');
  const body = onUpdate[0].replace(/^[ \t]*\/\/.*$/gm, '');

  assert.ok(
    /translateX\.value = savedTranslateX\.value \+ event\.translationX \/ s;/.test(body),
    'X konumu dogrudan jest otelemesinden yazilmali (serbest yerlesim)'
  );
  assert.ok(
    /translateY\.value = savedTranslateY\.value \+ event\.translationY \/ s;/.test(body),
    'Y konumu dogrudan jest otelemesinden yazilmali (serbest yerlesim)'
  );
  // Yapismis konumu temsil eden ara degiskenler olmamali
  assert.ok(
    !/\bsnappedX\b|\bsnappedY\b|\bhasSnapX\b|\bhasSnapY\b/.test(body),
    'onUpdate icinde yapisma sonucu kullanilmamali'
  );
  console.log('OK Test 3: tasima serbest, konum dogrudan parmaktan geliyor');
}

// --- Test 4: Kose boyutlandirma yolunda da hizalama yok --------------
{
  const startIdx = current.indexOf('  const resizePanGesture =');
  assert.ok(startIdx > -1, 'resizePanGesture bulunmali');
  const endIdx = current.indexOf('  const deleteTapGesture', startIdx);
  assert.ok(endIdx > startIdx, 'resize bolumunun sonu bulunmali');
  const resizeBody = current.slice(startIdx, endIdx);
  SNAP_MARKERS.forEach(([m]) => {
    assert.ok(!resizeBody.includes(m), 'kose boyutlandirmada hizalama izi: ' + m);
  });
  console.log('OK Test 4: kose boyutlandirma yolunda hizalama yok');
}

// --- Test 5: DOGRULANMIS jest davranisi BOZULMADI --------------------
// Hizalama kaldirilirken surukleme/boyutlandirma duzeltmesine ve onFinalize
// temizligine dokunulmamali. Bunlar cihazda dogrulanmis davranislardir.
{
  assert.ok(
    /\.activateAfterLongPress\(STICKER_DRAG_LONG_PRESS_MS\)/.test(current),
    'uzun basis korunmali'
  );
  assert.ok(
    /\.blocksExternalGesture\(drawingGestureRef\)/.test(current),
    'blocksExternalGesture korunmali'
  );
  const finalize = /\.onFinalize\(\(\) => \{[\s\S]*?\n    \}\);/.exec(current);
  assert.ok(finalize, 'onFinalize govdesi bulunmali');
  ['isActive.value = false;', 'runOnJS(onDeselect)();', 'isStickerDragging.value = false;'].forEach(
    (needle) => {
      assert.ok(
        finalize[0].includes(needle),
        'onFinalize temizligi bozulmus, eksik: ' + needle
      );
    }
  );
  console.log('OK Test 5: uzun basis + blocksExternalGesture + onFinalize temizligi korundu');
}

// --- Test 6: Hizalama ALTYAPISI metin icin AYAKTA ---------------------
// Kaldirma yalnizca cikartma tarafi. Metin kutusu ve kilavuz katmani kalmali.
{
  const textSrc = read('components/text/TextCanvas.js');
  // Import'u AYRICA kontrol et: yalnizca `includes('useSmartSnapping')` bakmak
  // yetmez, cunku import silinse de asagidaki cagri eslesmeye devam eder.
  assert.ok(
    /import \{ useSmartSnapping \} from '\.\.\/canvas\/SmartSnappingContext';/.test(textSrc),
    'TextCanvas hizalama import u DOKUNULMAMALIYDI'
  );
  assert.ok(
    /const smartSnapping = useSmartSnapping\(\);/.test(textSrc),
    'TextCanvas hizalama baglamini okumaya devam etmeli'
  );
  ['getSnapTargets', 'calculateSnapping', 'guideLineXVisible'].forEach((m) => {
    assert.ok(textSrc.includes(m), 'TextCanvas hizalamasi DOKUNULMAMALIYDI, eksik: ' + m);
  });
  assert.ok(
    fs.existsSync(path.join(root, 'components/canvas/SmartSnappingContext.js')),
    'SmartSnappingContext silinmemeli'
  );
  assert.ok(
    fs.existsSync(path.join(root, 'components/canvas/AlignmentGuidesOverlay.js')),
    'AlignmentGuidesOverlay silinmemeli (metin kutusu kullaniyor)'
  );
  console.log('OK Test 6: metin kutusu hizalamasi ve kilavuz katmani ayakta');
}

console.log('--- TUM HIZALAMA KALDIRMA TESTLERI BASARIYLA GECTI! ---');
