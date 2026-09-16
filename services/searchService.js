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
  cachedCover = null,
  cachedDiary = null,
  cachedNotebooks = null
) => {
  const query = normalizeTurkish(rawQuery);
  if (!query || query.length === 0) return [];

  const pages = cachedPages || (await StorageService.getPages()) || [];
  const cover = cachedCover !== null ? cachedCover : await StorageService.getCover();
  const diary = cachedDiary !== null ? cachedDiary : await StorageService.getDiary();
  const notebooks = cachedNotebooks !== null ? cachedNotebooks : await StorageService.getNotebooks();

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
        title: 'Ajandam',
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
    if (options.category === 'cover' || options.category === 'gunlugum' || options.category === 'notlarim') continue;

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
        title: page.title || '',
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

  // 3. Günlüğüm Taraması (My Diary)
  if (
    (options.category === 'all' || options.category === 'gunlugum' || options.category === 'diary') &&
    diary
  ) {
    // A. Günlük Kapağı
    const diaryCoverMatches = [];
    if (diary.title && normalizeTurkish(diary.title).includes(query)) {
      diaryCoverMatches.push({
        type: 'title',
        snippet: diary.title,
        field: 'Kapak Başlığı',
        isTitleMatch: true,
      });
    }
    if (Array.isArray(diary.coverTextBlocks)) {
      for (const block of diary.coverTextBlocks) {
        if (block?.text && normalizeTurkish(block.text).includes(query)) {
          diaryCoverMatches.push({
            type: 'textBlock',
            snippet: extractSnippet(block.text, rawQuery),
            field: 'Kapak Notu',
          });
        }
      }
    }
    if (diaryCoverMatches.length > 0) {
      const isLocked = !!diary.isLocked;
      results.push({
        id: 'diary_cover',
        title: isLocked ? 'Günlüğüm (🔒)' : (diary.title || 'Günlüğüm'),
        category: 'gunlugum',
        categoryName: 'Günlüğüm',
        categoryEmoji: '🌸',
        createdAt: diary.updatedAt || diary.createdAt || null,
        route: '/gunlugum',
        matches: isLocked
          ? [{ type: 'locked', snippet: '🔒 Kilitli Günlük Notu', field: 'Kapak Notu' }]
          : diaryCoverMatches,
        primarySnippet: isLocked ? '🔒 Kilitli Günlük Notu' : diaryCoverMatches[0].snippet,
        field: diaryCoverMatches[0].field,
        hasTitleMatch: diaryCoverMatches.some((m) => m.isTitleMatch),
        isHandwritingMatch: false,
        isLocked,
      });
    }

    // B. Günlük Sayfaları
    if (Array.isArray(diary.pages)) {
      diary.pages.forEach((page, pageIndex) => {
        const pageMatches = [];

        // A. Doğrudan Sayfa Metni (Inline Content)
        const diaryPageContent = page.data?.content || page.content || '';
        if (diaryPageContent && normalizeTurkish(diaryPageContent).includes(query)) {
          pageMatches.push({
            type: 'textBlock',
            snippet: extractSnippet(diaryPageContent, rawQuery),
            field: `Sayfa ${page.pageNumber || pageIndex + 1} Günlük Notu`,
          });
        }

        // B. Serbest Metin Kutuları (Klavye veya El Yazısı Dönüşümü)
        if (Array.isArray(page.textBlocks)) {
          for (const block of page.textBlocks) {
            if (block?.text && normalizeTurkish(block.text).includes(query)) {
              pageMatches.push({
                type: 'textBlock',
                snippet: extractSnippet(block.text, rawQuery),
                field: `Sayfa ${page.pageNumber || pageIndex + 1} Notu`,
              });
            }
          }
        }

        // El Yazısı (varsa recognizedText)
        if (page.recognizedText && normalizeTurkish(page.recognizedText).includes(query)) {
          pageMatches.push({
            type: 'handwriting',
            snippet: extractSnippet(page.recognizedText, rawQuery),
            field: 'El Yazısı',
            isHandwriting: true,
          });
        }

        if (pageMatches.length > 0) {
          const isLocked = !!diary.isLocked;
          const hasHandwriting = pageMatches.some((m) => m.isHandwriting);
          results.push({
            id: `diary_${page.pageId || pageIndex}`,
            title: isLocked
              ? `Günlüğüm (🔒) - Sayfa ${page.pageNumber || pageIndex + 1}`
              : `Günlüğüm - Sayfa ${page.pageNumber || pageIndex + 1}`,
            category: 'gunlugum',
            categoryName: 'Günlüğüm',
            categoryEmoji: '🌸',
            createdAt: page.createdAt || diary.updatedAt || null,
            route: `/gunlugum/pages?pageIndex=${pageIndex}&pageId=${page.pageId || ''}`,
            matches: isLocked
              ? [{ type: 'locked', snippet: '🔒 Kilitli Günlük İçeriği', field: 'Gizli Not' }]
              : pageMatches,
            primarySnippet: isLocked ? '🔒 Kilitli Günlük İçeriği' : pageMatches[0].snippet,
            field: isLocked ? 'Gizli İçerik' : pageMatches[0].field,
            hasTitleMatch: false,
            isHandwritingMatch: isLocked ? false : hasHandwriting,
            isLocked,
          });
        }
      });
    }
  }

  // 4. Notlarım (Defterler) Taraması (Notebooks)
  if (
    (options.category === 'all' || options.category === 'notlarim' || options.category === 'notebooks') &&
    Array.isArray(notebooks)
  ) {
    for (const nb of notebooks) {
      if (!nb) continue;

      // A. Defter Başlığı ve Kapağı
      const nbCoverMatches = [];
      const titleMatches = nb.title && normalizeTurkish(nb.title).includes(query);
      if (titleMatches) {
        nbCoverMatches.push({
          type: 'title',
          snippet: nb.title,
          field: 'Defter Başlığı',
          isTitleMatch: true,
        });
      }
      if (Array.isArray(nb.coverTextBlocks)) {
        for (const block of nb.coverTextBlocks) {
          if (block?.text && normalizeTurkish(block.text).includes(query)) {
            nbCoverMatches.push({
              type: 'textBlock',
              snippet: extractSnippet(block.text, rawQuery),
              field: 'Kapak Notu',
            });
          }
        }
      }
      if (nbCoverMatches.length > 0) {
        const isLocked = !!nb.isLocked;
        results.push({
          id: `nb_cover_${nb.id}`,
          title: isLocked ? `${nb.title || 'Defter'} (🔒)` : (nb.title || 'Defter'),
          category: 'notlarim',
          categoryName: nb.title || 'Notlarım',
          categoryEmoji: '📓',
          createdAt: nb.updatedAt || nb.createdAt || null,
          route: `/defterlerim/${nb.id}`,
          matches: isLocked && !titleMatches
            ? [{ type: 'locked', snippet: '🔒 Kilitli Kapak Notu', field: 'Kapak Notu' }]
            : nbCoverMatches,
          primarySnippet: isLocked && !titleMatches ? '🔒 Kilitli Kapak Notu' : nbCoverMatches[0].snippet,
          field: nbCoverMatches[0].field,
          hasTitleMatch: titleMatches,
          isHandwritingMatch: false,
          isLocked,
        });
      }

      // B. Defter Sayfaları
      if (Array.isArray(nb.pages)) {
        nb.pages.forEach((page, pageIndex) => {
          const pageMatches = [];

          // A. Doğrudan Sayfa Metni (Inline Content)
          const nbPageContent = page.data?.content || page.content || '';
          if (nbPageContent && normalizeTurkish(nbPageContent).includes(query)) {
            pageMatches.push({
              type: 'textBlock',
              snippet: extractSnippet(nbPageContent, rawQuery),
              field: `Sayfa ${page.pageNumber || pageIndex + 1} Defter Notu`,
            });
          }

          // B. Serbest Metin Kutuları
          if (Array.isArray(page.textBlocks)) {
            for (const block of page.textBlocks) {
              if (block?.text && normalizeTurkish(block.text).includes(query)) {
                pageMatches.push({
                  type: 'textBlock',
                  snippet: extractSnippet(block.text, rawQuery),
                  field: `Sayfa ${page.pageNumber || pageIndex + 1} Notu`,
                });
              }
            }
          }

          if (page.recognizedText && normalizeTurkish(page.recognizedText).includes(query)) {
            pageMatches.push({
              type: 'handwriting',
              snippet: extractSnippet(page.recognizedText, rawQuery),
              field: 'El Yazısı',
              isHandwriting: true,
            });
          }

          if (pageMatches.length > 0) {
            const isLocked = !!nb.isLocked;
            const hasHandwriting = pageMatches.some((m) => m.isHandwriting);
            results.push({
              id: `nb_${nb.id}_${page.pageId || pageIndex}`,
              title: isLocked
                ? `${nb.title || 'Defter'} (🔒) - Sayfa ${page.pageNumber || pageIndex + 1}`
                : `${nb.title || 'Defter'} - Sayfa ${page.pageNumber || pageIndex + 1}`,
              category: 'notlarim',
              categoryName: nb.title || 'Notlarım',
              categoryEmoji: '📓',
              createdAt: page.createdAt || nb.updatedAt || null,
              route: `/defterlerim/${nb.id}/pages?pageIndex=${pageIndex}&pageId=${page.pageId || ''}`,
              matches: isLocked
                ? [{ type: 'locked', snippet: '🔒 Kilitli Defter İçeriği', field: 'Gizli Not' }]
                : pageMatches,
              primarySnippet: isLocked ? '🔒 Kilitli Defter İçeriği' : pageMatches[0].snippet,
              field: isLocked ? 'Gizli İçerik' : pageMatches[0].field,
              hasTitleMatch: false,
              isHandwritingMatch: isLocked ? false : hasHandwriting,
              isLocked,
            });
          }
        });
      }
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

/**
 * Tek bir defterin (Notlarım) sayfalarında arama yapar.
 * Yalnızca metin kutuları (textBlocks) taranır: klavyeyle yazılmış ve el yazısından dönüştürülmüş metinler.
 * İnternet gerektirmez; ekrandaki güncel sayfa dizisi üzerinde çalışır.
 *
 * @param {Array} pages - Defter sayfaları
 * @param {string} rawQuery - Aranan kelime
 * @returns {Array<{ pageId: string, pageIndex: number, pageNumber: number, snippet: string, matchCount: number }>}
 */
export const searchNotebookPages = (pages, rawQuery) => {
  const query = normalizeTurkish(rawQuery);
  if (!query || !Array.isArray(pages)) return [];

  const results = [];
  pages.forEach((page, pageIndex) => {
    const matchingTexts = [];

    // 1. Doğrudan sayfa metni (inline content)
    const pageContent = page?.data?.content || page?.content || '';
    if (pageContent && normalizeTurkish(pageContent).includes(query)) {
      matchingTexts.push(pageContent);
    }

    // 2. Serbest metin kutuları (textBlocks)
    (Array.isArray(page?.textBlocks) ? page.textBlocks : [])
      .map((block) => (typeof block?.text === 'string' ? block.text : ''))
      .filter((text) => text && normalizeTurkish(text).includes(query))
      .forEach((t) => matchingTexts.push(t));

    if (matchingTexts.length > 0) {
      results.push({
        pageId: page.pageId,
        pageIndex,
        pageNumber: page.pageNumber || pageIndex + 1,
        snippet: extractSnippet(matchingTexts[0], rawQuery),
        matchCount: matchingTexts.length,
      });
    }
  });
  return results;
};
