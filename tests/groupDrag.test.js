/**
 * Multi-Select Group Drag Mathematical Unit Tests
 */
const assert = require('assert');

console.log('--- Multi-Select Group Drag Mathematical Unit Tests ---');

// Test: Çoklu seçim grubunda liderin deltasının diğer bloklara senkronize uygulanması
{
  const textBlocks = [
    { id: 'b1', text: 'Bugün', x: 20, y: 100, width: 60 },
    { id: 'b2', text: 'hava', x: 90, y: 100, width: 45 },
    { id: 'b3', text: 'çok', x: 145, y: 100, width: 35 },
    { id: 'b4', text: 'güzel', x: 190, y: 100, width: 50 },
    { id: 'b5', text: 'Bağımsız', x: 20, y: 300, width: 80 }, // Seçili olmayan blok
  ];

  const selectedBlockIds = ['b1', 'b2', 'b3', 'b4'];
  const leaderId = 'b1';

  // Lider b1 taşınıyor: deltaX = +35, deltaY = -24
  const deltaX = 35;
  const deltaY = -24;

  // handleGroupMoveEnd simülasyonu
  const updatedBlocks = textBlocks.map((b) => {
    if (selectedBlockIds.includes(b.id)) {
      return {
        ...b,
        x: Math.round(b.x + deltaX),
        y: Math.round(b.y + deltaY),
      };
    }
    return b;
  });

  // Doğrulama 1: Seçili tüm bloklar tam delta kadar ötelenmeli
  assert.strictEqual(updatedBlocks.find((b) => b.id === 'b1').x, 55);
  assert.strictEqual(updatedBlocks.find((b) => b.id === 'b1').y, 76);

  assert.strictEqual(updatedBlocks.find((b) => b.id === 'b2').x, 125);
  assert.strictEqual(updatedBlocks.find((b) => b.id === 'b2').y, 76);

  assert.strictEqual(updatedBlocks.find((b) => b.id === 'b3').x, 180);
  assert.strictEqual(updatedBlocks.find((b) => b.id === 'b3').y, 76);

  assert.strictEqual(updatedBlocks.find((b) => b.id === 'b4').x, 225);
  assert.strictEqual(updatedBlocks.find((b) => b.id === 'b4').y, 76);

  // Doğrulama 2: Seçili olmayan blok hiç kımıldamamalı
  assert.strictEqual(updatedBlocks.find((b) => b.id === 'b5').x, 20);
  assert.strictEqual(updatedBlocks.find((b) => b.id === 'b5').y, 300);

  // Doğrulama 3: Kelimeler arası göreli mesafeler (relative distances) %100 korunmalı
  const dist12_before = textBlocks[1].x - textBlocks[0].x;
  const dist12_after = updatedBlocks[1].x - updatedBlocks[0].x;
  assert.strictEqual(dist12_before, dist12_after);

  const dist23_before = textBlocks[2].x - textBlocks[1].x;
  const dist23_after = updatedBlocks[2].x - updatedBlocks[1].x;
  assert.strictEqual(dist23_before, dist23_after);

  console.log('✔ Test 1: Synchronized group translation and relative distance preservation passed');
}

console.log('--- ALL MULTI-SELECT GROUP DRAG TESTS PASSED SUCCESSFULLY! ---');
