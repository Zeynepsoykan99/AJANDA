/**
 * AJANDA - Global Arama Servisi
 * AsyncStorage üzerinde saklanan tüm Ajanda, To-Do ve Kapak verilerini
 * Türkçe karakter duyarlılığıyla tarar ve eşleşen metin pasajlarını çıkarır.
 */

import { StorageService } from './storageService.js';

/**
 * Türkçe büyük/küçük harf dönüşümünü kusursuz yapan yardımcı fonksiyon
 * 'İ' -> 'i', 'I' -> 'ı' gibi JavaScript dil tuzaklarını çözer.
 */
export const normalizeTurkish = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .trim();
};

/**
 * Eşleşen kelimenin etrafındaki bağlamı (snippet) kesip çıkarır.
 */
export const extractSnippet = (fullText, query, maxLength = 80) => {
  if (!fullText) return '';
  const normalizedFull = normalizeTurkish(fullText);
  const normalizedQuery = normalizeTurkish(query);

  const index = normalizedFull.indexOf(normalizedQuery);
  if (index === -1) {
    return fullText.length > maxLength
      ? fullText.substring(0, maxLength).trim() + '...'
      : fullText;
  }

  const start = Math.max(0, index - 25);
  const end = Math.min(fullText.length, index + query.length + 35);

  let snippet = fullText.substring(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < fullText.length) snippet = snippet + '...';

  return snippet;
};

/**
 * Tüm sayfalar ve kapak üzerinde arama gerçekleştirir.
 *
 * @param {string} rawQuery - Kullanıcının yazdığı arama kelimesi
 * @param {object} options - Filtre seçenekleri ({ category: 'all' | 'ajandam' | 'todo' | 'cover' })
 * @param {Array} cachedPages - Önceden yüklenmiş sayfalar (isteğe bağlı, performans için)
 * @param {object} cachedCover - Önceden yüklenmiş kapak verisi (isteğe bağlı)
 * @returns {Promise<Array>} Eşleşen sonuçlar listesi
 */
export const searchAllData = async (
  rawQuery,
  options = { category: 'all' },
  cachedPages = null,
  cachedCover = null
) => {
  const query = normalizeTurkish(rawQuery);
  if (!query || query.length === 0) return [];

  const pages = cachedPages || (await StorageService.getPages()) || [];
  const cover = cachedCover !== null ? cachedCover : await StorageService.getCover();

  const results = [];

  // 1. Kapak Metinlerini Tara (Cover)
  if (
    (options.category === 'all' || options.category === 'cover' || options.category === 'ajandam') &&
    cover
  ) {
    const coverMatches = [];

    // Kapak TextBlocks
    if (Array.isArray(cover.textBlocks)) {
      for (const block of cover.textBlocks) {
        if (block?.text && normalizeTurkish(block.text).includes(query)) {
          coverMatches.push({
            type: 'textBlock',
            snippet: extractSnippet(block.text, rawQuery),
            field: 'Kapak Notu',
          });
        }
      }
    }

    // Kapak El Yazısı (Handwriting)
    if (cover.recognizedText && normalizeTurkish(cover.recognizedText).includes(query)) {
      coverMatches.push({
        type: 'handwriting',
        snippet: extractSnippet(cover.recognizedText, rawQuery),
        field: 'Kapak El Yazısı',
        isHandwriting: true,
      });
    }

    if (coverMatches.length > 0) {
      const hasHandwriting = coverMatches.some((m) => m.isHandwriting);
      results.push({
        id: 'cover',
        title: 'Ajanda Kapağı',
        category: 'cover',
        categoryName: 'Kapak',
        categoryEmoji: '📖',
        createdAt: cover.updatedAt || cover.createdAt || null,
        route: '/ajandam',
        matches: coverMatches,
        primarySnippet: coverMatches[0].snippet,
        field: coverMatches[0].field,
        isHandwritingMatch: hasHandwriting,
      });
    }
  }

  // 2. Tüm Sayfaları Tara (Ajandam ve To-Do)
  for (const page of pages) {
    // Kategori Filtresi Kontrolü
    if (options.category === 'ajandam' && page.category === 'todo') continue;
    if (options.category === 'todo' && page.category !== 'todo') continue;
    if (options.category === 'cover') continue;

    const pageMatches = [];

    // A. Sayfa Başlığı Eşleşmesi
    if (page.title && normalizeTurkish(page.title).includes(query)) {
      pageMatches.push({
        type: 'title',
        snippet: page.title,
        field: 'Başlık',
        isTitleMatch: true,
      });
    }

    // B. Serbest Not Kutuları (TextBlocks)
    if (Array.isArray(page.textBlocks)) {
      for (const block of page.textBlocks) {
        if (block?.text && normalizeTurkish(block.text).includes(query)) {
          pageMatches.push({
            type: 'textBlock',
            snippet: extractSnippet(block.text, rawQuery),
            field: 'Sayfa Notu',
          });
        }
      }
    }

    // C. Sayfa Data Düğümleri (content, items, events, days)
    if (page.data) {
      // Boş şablon / not içeriği
      if (
        typeof page.data.content === 'string' &&
        normalizeTurkish(page.data.content).includes(query)
      ) {
        pageMatches.push({
          type: 'content',
          snippet: extractSnippet(page.data.content, rawQuery),
          field: 'İçerik',
        });
      }

      // To-Do maddeleri
      if (Array.isArray(page.data.items)) {
        for (const item of page.data.items) {
          const itemText = item?.text || item?.title || '';
          if (itemText && normalizeTurkish(itemText).includes(query)) {
            pageMatches.push({
              type: 'todoItem',
              snippet: extractSnippet(itemText, rawQuery),
              field: item.completed ? 'Tamamlanan Madde' : 'Yapılacak Madde',
            });
          }
        }
      }

      // Aylık ajanda etkinlikleri
      if (Array.isArray(page.data.events)) {
        for (const ev of page.data.events) {
          const evText = `${ev?.title || ''} ${ev?.desc || ''}`.trim();
          if (evText && normalizeTurkish(evText).includes(query)) {
            pageMatches.push({
              type: 'event',
              snippet: extractSnippet(evText, rawQuery),
              field: 'Etkinlik',
            });
          }
        }
      }

      // Haftalık ajanda günleri
      if (Array.isArray(page.data.days)) {
        for (const day of page.data.days) {
          if (Array.isArray(day.items)) {
            for (const dayItem of day.items) {
              const dText = dayItem?.text || '';
              if (dText && normalizeTurkish(dText).includes(query)) {
                pageMatches.push({
                  type: 'weeklyItem',
                  snippet: extractSnippet(dText, rawQuery),
                  field: `${day.dayName || 'Haftalık'} Notu`,
                });
              }
            }
          }
        }
      }
    }

    // D. El Yazısı Notları (Digital Ink Recognized Text)
    if (page.recognizedText && normalizeTurkish(page.recognizedText).includes(query)) {
      pageMatches.push({
        type: 'handwriting',
        snippet: extractSnippet(page.recognizedText, rawQuery),
        field: 'El Yazısı',
        isHandwriting: true,
      });
    }

    // Eşleşme bulunduysa sonuca ekle
    if (pageMatches.length > 0) {
      const isTodo = page.category === 'todo';
      const categoryEmoji = isTodo
        ? '☑️'
        : page.category === 'monthly'
        ? '🗓️'
        : page.category === 'weekly'
        ? '📅'
        : '📝';

      const categoryName = isTodo
        ? 'Yapılacaklar'
        : page.category === 'monthly'
        ? 'Aylık Plan'
        : page.category === 'weekly'
        ? 'Haftalık Plan'
        : 'Ajanda Sayfası';

      const hasHandwriting = pageMatches.some((m) => m.isHandwriting);

      results.push({
        id: page.id,
        title: page.title || 'İsimsiz Sayfa',
        category: page.category,
        categoryName,
        categoryEmoji,
        createdAt: page.createdAt,
        route: isTodo ? `/todolist/${page.id}` : `/ajandam/${page.id}`,
        matches: pageMatches,
        primarySnippet: pageMatches[0].snippet,
        field: pageMatches[0].field,
        hasTitleMatch: pageMatches.some((m) => m.isTitleMatch),
        isHandwritingMatch: hasHandwriting,
      });
    }
  }

  // Sıralama: Önce başlık eşleşmesi olanlar, sonra en günceller
  return results.sort((a, b) => {
    if (a.hasTitleMatch && !b.hasTitleMatch) return -1;
    if (!a.hasTitleMatch && b.hasTitleMatch) return 1;
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
};
