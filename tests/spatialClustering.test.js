/**
 * Spatial Clustering & Font Size Smoothing Mathematical Unit Tests
 */
const assert = require('assert');
const {
  mergeSpatialClusters,
  smoothClusterFontSizes,
  processLassoRecognitionResults,
} = require('../utils/lassoGeometry');

console.log('--- Spatial Clustering & Font Size Smoothing Unit Tests ---');

// Test 1: Aynı satırdaki yakın kelimelerin tek bir metin kutusunda birleşmesi
{
  const clusters = [
    {
      id: 'c1',
      color: '#1A1A1A',
      text: 'Tatilin nasıl',
      bounds: { minX: 20, minY: 100, maxX: 140, maxY: 128, width: 120, height: 28 },
      fontSize: 20,
      strokes: [{ id: 's1' }],
      strokeIds: ['s1'],
    },
    {
      id: 'c2',
      color: '#1A1A1A',
      text: 'geçti',
      // gapX = 165 - 140 = 25px (doğal kelime boşluğu)
      // dikeyde neredeyse aynı hizada
      bounds: { minX: 165, minY: 102, maxX: 230, maxY: 130, width: 65, height: 28 },
      fontSize: 18,
      strokes: [{ id: 's2' }],
      strokeIds: ['s2'],
    },
  ];

  const merged = mergeSpatialClusters(clusters);

  assert.strictEqual(merged.length, 1, 'İki kelime tek kutuda birleşmeli');
  assert.strictEqual(merged[0].text, 'Tatilin nasıl geçti', 'Metinler araya boşluk alarak birleşmeli');
  assert.strictEqual(merged[0].bounds.minX, 20);
  assert.strictEqual(merged[0].bounds.maxX, 230);
  assert.strictEqual(merged[0].strokes.length, 2);
  console.log('✔ Test 1: Same line word merging ("Tatilin nasıl" + "geçti") passed');
}

// Test 2: Farklı satırdaki veya uzak sütunlardaki metinlerin ayrık kalması
{
  const clusters = [
    {
      id: 'line1',
      color: '#1A1A1A',
      text: 'Birinci Satır',
      bounds: { minX: 20, minY: 50, maxX: 150, maxY: 80, width: 130, height: 30 },
      fontSize: 20,
    },
    {
      id: 'line2',
      color: '#1A1A1A',
      text: 'İkinci Satır',
      bounds: { minX: 20, minY: 120, maxX: 140, maxY: 150, width: 120, height: 30 },
      fontSize: 20,
    },
  ];

  const merged = mergeSpatialClusters(clusters);

  assert.strictEqual(merged.length, 2, 'Farklı satırlar ayrık kalmalı');
  assert.strictEqual(merged[0].text, 'Birinci Satır');
  assert.strictEqual(merged[1].text, 'İkinci Satır');
  console.log('✔ Test 2: Distinct lines preservation passed');
}

// Test 3: Farklı renkteki kelimelerin asla birleştirilmemesi
{
  const clusters = [
    {
      id: 'c_black',
      color: '#1A1A1A',
      text: 'Siyah',
      bounds: { minX: 20, minY: 100, maxX: 60, maxY: 125, width: 40, height: 25 },
    },
    {
      id: 'c_pink',
      color: '#E91E63',
      text: 'Pembe',
      bounds: { minX: 75, minY: 100, maxX: 120, maxY: 125, width: 45, height: 25 },
    },
  ];

  const merged = mergeSpatialClusters(clusters);

  assert.strictEqual(merged.length, 2, 'Farklı renkteki kelimeler asla birleşmemeli');
  console.log('✔ Test 3: Different color isolation passed');
}

// Test 4: Punto Normalizasyonu (%30 tolerans içindeki dalgalanmaların medyana eşitlenmesi)
{
  const clusters = [
    { id: '1', text: 'Kelime1', fontSize: 16, bounds: { width: 50, height: 20 } },
    { id: '2', text: 'Kelime2', fontSize: 20, bounds: { width: 50, height: 26 } },
    { id: '3', text: 'Kelime3', fontSize: 18, bounds: { width: 50, height: 22 } },
    // Medyan = 18.
    // 16 farkı: |16-18|/18 = 0.11 <= 0.30 -> 18 olmalı
    // 20 farkı: |20-18|/18 = 0.11 <= 0.30 -> 18 olmalı
    { id: 'headline', text: 'BAŞLIK', fontSize: 48, bounds: { width: 120, height: 60 } },
    // 48 farkı: |48-18|/18 = 1.66 > 0.30 -> 48 olarak korunmalı!
  ];

  const smoothed = smoothClusterFontSizes(clusters, { toleranceRatio: 0.30 });

  assert.strictEqual(smoothed[0].fontSize, 19 || 18, 'Küçük punto medyana yaklaşmalı');
  assert.strictEqual(smoothed[3].fontSize, 48, 'Devasa başlık puntosu korunmalı');
  console.log('✔ Test 4: Font size smoothing with median & tolerance passed');
}

// Test 5: processLassoRecognitionResults tam pipeline testi
{
  const rawClusters = [
    {
      id: 'w1',
      color: '#007AFF',
      text: 'React',
      bounds: { minX: 10, minY: 50, maxX: 60, maxY: 75, width: 50, height: 25 },
      fontSize: 17,
      strokes: [{ id: 's1' }],
    },
    {
      id: 'w2',
      color: '#007AFF',
      text: 'Native',
      bounds: { minX: 75, minY: 51, maxX: 130, maxY: 76, width: 55, height: 25 },
      fontSize: 19,
      strokes: [{ id: 's2' }],
    },
  ];

  const processed = processLassoRecognitionResults(rawClusters);

  assert.strictEqual(processed.length, 1);
  assert.strictEqual(processed[0].text, 'React Native');
  assert.strictEqual(processed[0].fontSize, 18);
  console.log('✔ Test 5: Full recognition pipeline integration passed');
}

console.log('--- ALL SPATIAL CLUSTERING & SMOOTHING TESTS PASSED SUCCESSFULLY! ---');
