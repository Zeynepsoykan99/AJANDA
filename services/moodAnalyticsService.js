import {
  MOODS,
  MOOD_COLORS,
  POSITIVE_MOODS,
  getMoodEmoji,
} from '../constants/moods';

export { MOODS, MOOD_COLORS, POSITIVE_MOODS, getMoodEmoji };

const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * Parses date from page object safely
 */
export const parsePageDate = (page) => {
  if (!page) return null;
  const raw = page.createdAt || page.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Returns available unique months from diary pages list
 * @param {Array} pages
 * @returns {Array<{ year: number, month: number, key: string }>} sorted newest first
 */
export const getAvailableMonths = (pages = []) => {
  const monthMap = new Map();

  for (const page of pages) {
    const d = parsePageDate(page);
    if (!d) continue;
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-11
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { year, month, key });
    }
  }

  // Ensure current month is always present in list even if empty
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!monthMap.has(currentKey)) {
    monthMap.set(currentKey, { year: now.getFullYear(), month: now.getMonth(), key: currentKey });
  }

  return Array.from(monthMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};

/**
 * Calculates monthly mood analytics for a given month and year
 *
 * @param {Array} pages - All diary pages
 * @param {number} targetYear - Full year (e.g. 2026)
 * @param {number} targetMonth - Month (0-11)
 * @returns {object} Analytics result object
 */
export const getMonthlyMoodAnalytics = (pages = [], targetYear, targetMonth) => {
  const monthPages = pages.filter((page) => {
    const d = parsePageDate(page);
    if (!d) return false;
    return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
  });

  const totalPagesInMonth = monthPages.length;
  const moodCounts = {};
  const weekdayMoodMap = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
  let trackedMoodCount = 0;
  let positiveCount = 0;

  for (const p of monthPages) {
    if (!p.mood) continue;
    const moodKey = p.mood;
    moodCounts[moodKey] = (moodCounts[moodKey] || 0) + 1;
    trackedMoodCount++;

    if (POSITIVE_MOODS.has(moodKey)) {
      positiveCount++;
    }

    const d = parsePageDate(p);
    if (d) {
      const dayIdx = d.getDay(); // 0-6
      weekdayMoodMap[dayIdx][moodKey] = (weekdayMoodMap[dayIdx][moodKey] || 0) + 1;
    }
  }

  // 1. Slices for Pie Chart
  const distribution = MOODS.map((m) => {
    const count = moodCounts[m.key] || 0;
    const percentage = trackedMoodCount > 0 ? Math.round((count / trackedMoodCount) * 100) : 0;
    return {
      key: m.key,
      labelKey: m.labelKey,
      defaultLabel: m.defaultLabel,
      emoji: m.emoji,
      color: MOOD_COLORS[m.key] || MOOD_COLORS.default,
      count,
      percentage,
    };
  }).filter((item) => item.count > 0);

  // Sort distribution descending by count
  distribution.sort((a, b) => b.count - a.count);

  // 2. Dominant Mood
  const dominantMood = distribution.length > 0 ? distribution[0] : null;

  // 3. Positivity Score
  const positivityScore =
    trackedMoodCount > 0 ? Math.round((positiveCount / trackedMoodCount) * 100) : 0;

  // 4. Weekday Correlation
  // Find which day had the highest frequency of dominant mood, or highest mood count overall
  let dominantDay = null; // { dayIdx: number, weekdayKey: string, moodKey: string, count: number }
  let maxDayMoodCount = 0;

  if (dominantMood) {
    for (let day = 0; day <= 6; day++) {
      const count = weekdayMoodMap[day][dominantMood.key] || 0;
      if (count > maxDayMoodCount) {
        maxDayMoodCount = count;
        dominantDay = {
          dayIdx: day,
          weekdayKey: WEEKDAY_KEYS[day],
          moodKey: dominantMood.key,
          count,
        };
      }
    }
  }

  // Days in month count
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const trackingRate = Math.min(100, Math.round((trackedMoodCount / daysInMonth) * 100));

  return {
    year: targetYear,
    month: targetMonth,
    totalPages: totalPagesInMonth,
    trackedMoodCount,
    daysInMonth,
    trackingRate,
    distribution,
    dominantMood,
    positivityScore,
    dominantDay,
    hasData: trackedMoodCount > 0,
  };
};

/**
 * Generates personalized, witty and warm "Spotify Wrapped" style copywriting
 *
 * @param {object} analytics - Result from getMonthlyMoodAnalytics
 * @param {function} t - i18next translation function
 * @returns {object} { heroTitle, heroDesc, correlationTitle, correlationDesc, letterText }
 */
export const generateDynamicMoodCopy = (analytics, t) => {
  if (!analytics || !analytics.hasData) {
    return {
      heroTitle: t('analytics.noDataTitle', 'Henüz Yeterli Veri Yok'),
      heroDesc: t(
        'analytics.noDataDesc',
        'Bu ay günlüğünle yeni tanışmışsın 🌱 Gelecek günlerde sayfalarına duygu durumunu eklemeyi unutma!'
      ),
      correlationTitle: t('analytics.startJourney', 'Yolculuğa Başla'),
      correlationDesc: t(
        'analytics.startJourneyDesc',
        'Her gün bir sayfa açarak ruh halini kaydet; ay sonunda senin için harika bir duygu haritası çıkaralım!'
      ),
      letterText: t(
        'analytics.noDataLetter',
        'Duygularını kaydetmek kendini anlamanın ilk adımıdır. Önümüzdeki ay günlüğünü renklendirmeye ne dersin?'
      ),
    };
  }

  const { dominantMood, dominantDay, positivityScore, trackedMoodCount, distribution } = analytics;
  const moodKey = dominantMood?.key || 'happy';
  const moodEmoji = dominantMood?.emoji || '✨';
  const moodPercent = dominantMood?.percentage || 0;
  const dominantMoodLabel = dominantMood ? t(dominantMood.labelKey, dominantMood.defaultLabel) : '';

  // 1. Hero Title & Subtitle
  const heroTitle = t(`analytics.heroTitles.${moodKey}`, {
    percent: moodPercent,
    emoji: moodEmoji,
    label: dominantMoodLabel,
    defaultValue: `${moodEmoji} %${moodPercent} ${dominantMoodLabel}`,
  });

  const heroDesc = t(`analytics.heroDescriptions.${moodKey}`, {
    percent: moodPercent,
    count: dominantMood?.count || 0,
    defaultValue: `Bu ayın en belirgin duygusu ${dominantMoodLabel} oldu.`,
  });

  // 2. Correlation Card ("Günün Tespiti")
  let correlationTitle = t('analytics.correlationDefaultTitle', 'Günün Tespiti 🔍');
  let correlationDesc = '';

  if (dominantDay && dominantDay.count > 0) {
    const dayName = t(`analytics.weekdays.${dominantDay.weekdayKey}`, dominantDay.weekdayKey);
    const dayKey = dominantDay.weekdayKey;

    if (dayKey === 'monday' && (moodKey === 'happy' || moodKey === 'excited')) {
      correlationTitle = t('analytics.correlations.mondayHappyTitle', 'Pazartesi Sendromu Yok! 🚀');
      correlationDesc = t('analytics.correlations.mondayHappyDesc', {
        day: dayName,
        defaultValue: `Bu ay en çok ${dayName} günleri ${dominantMoodLabel.toLowerCase()} hissetmişsin; sanırım Pazartesi sendromu senin yanından bile geçememiş 😎`,
      });
    } else if ((dayKey === 'friday' || dayKey === 'saturday') && (moodKey === 'excited' || moodKey === 'happy')) {
      correlationTitle = t('analytics.correlations.weekendVibesTitle', 'Hafta Sonu Neşesi 🎉');
      correlationDesc = t('analytics.correlations.weekendVibesDesc', {
        day: dayName,
        defaultValue: `Hafta sonunun gelişini herkesten iyi kutlamışsın! En çok ${dayName} günleri enerjin tavan yapmış.`,
      });
    } else if (dayKey === 'wednesday' && moodKey === 'tired') {
      correlationTitle = t('analytics.correlations.midweekTitle', 'Hafta Ortası Molası ☕');
      correlationDesc = t('analytics.correlations.midweekDesc', {
        day: dayName,
        defaultValue: `${dayName} günleri biraz yorgunluk hissetmişsin ama pes etmeden haftayı tamamlamayı bilmişsin.`,
      });
    } else if (dayKey === 'sunday' && (moodKey === 'calm' || moodKey === 'grateful')) {
      correlationTitle = t('analytics.correlations.sundayZenTitle', 'Pazar Dinginliği 🌿');
      correlationDesc = t('analytics.correlations.sundayZenDesc', {
        day: dayName,
        defaultValue: `${dayName} günleri tam bir kafa dinleme ve yenilenme ritüeline dönüşmüş.`,
      });
    } else {
      correlationTitle = t('analytics.correlations.generalDayTitle', {
        day: dayName,
        defaultValue: `Favori Günün: ${dayName} ✨`,
      });
      correlationDesc = t('analytics.correlations.generalDayDesc', {
        day: dayName,
        mood: dominantMoodLabel.toLowerCase(),
        count: dominantDay.count,
        defaultValue: `Bu ay ${dominantMoodLabel.toLowerCase()} hislerin en çok ${dayName} günlerinde (${dominantDay.count} kez) parıldamış.`,
      });
    }
  } else {
    correlationDesc = t('analytics.correlationFallback', 'Her güne yayılan dengeli bir duygu akışı yakalamışsın.');
  }

  // 3. Letter / Monthly Summary ("Ayın Mektubu")
  const sadCount = distribution.find((d) => d.key === 'sad')?.count || 0;
  const stressedCount = distribution.find((d) => d.key === 'stressed')?.count || 0;
  let letterText = '';

  if (positivityScore >= 70) {
    letterText = t('analytics.letterHighPositivity', {
      percent: positivityScore,
      defaultValue: `Işıl ışıl bir ayı geride bıraktın! Günlerinin %${positivityScore}'ini yüksek enerji ve huzurla geçirdin. Bu güzel enerjiyi yeni aya da taşımayı unutma! ✨`,
    });
  } else if (sadCount >= 3) {
    letterText = t('analytics.letterSadNotice', {
      count: sadCount,
      defaultValue: `Bu ay ${sadCount} gün hüzünlü hissetmişsin. Duygularını kabul edip günlüğüne dökmüş olman çok kıymetli. Bir dahaki ay üzüntünün sana hiç uğramaması dileğiyle... 🌸`,
    });
  } else if (stressedCount >= 3) {
    letterText = t('analytics.letterStressedNotice', {
      count: stressedCount,
      defaultValue: `Zorlu ve stresli dönemeçlerden geçmişsin. Unutma, en fırtınalı denizler bile sonunda durulur. Kendine biraz daha şefkat ve mola hediye et 🌿`,
    });
  } else {
    letterText = t('analytics.letterBalanced', {
      count: trackedMoodCount,
      dominant: dominantMoodLabel.toLowerCase(),
      defaultValue: `Bu ay ${trackedMoodCount} gün boyunca duygularını özenle takip ettin. En çok ${dominantMoodLabel.toLowerCase()} hissettiğin, zengin bir duygu yelpazesine sahip bir ay oldu.`,
    });
  }

  return {
    heroTitle,
    heroDesc,
    correlationTitle,
    correlationDesc,
    letterText,
  };
};
