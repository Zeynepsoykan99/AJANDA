import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { PAGE_CATEGORIES, getPageTemplate } from '../constants/pageTemplates';

/**
 * PageThumbnail - Sayfa önizleme kartı
 * Sayfa listesinde her sayfayı temsil eden kart bileşeni.
 *
 * @param {object} page - Sayfa verisi (pageSchema)
 * @param {function} onPress - Sayfaya tıklama
 * @param {function} onLongPress - Uzun basma (silme vb.)
 */
export default function PageThumbnail({ page, onPress, onLongPress, onDelete }) {
  const { t, i18n } = useTranslation();
  const category = PAGE_CATEGORIES.find((c) => c.id === page.category);
  const template = getPageTemplate(page.category, page.templateId);
  const templateColors = template?.colors || { bg: '#FFF0F5', accent: '#C2185B' };

  // Sayfa özeti (görev sayısı, not uzunluğu vb.)
  const getSummary = () => {
    switch (page.category) {
      case 'todo': {
        const total = page.data?.items?.length || 0;
        const done = page.data?.items?.filter((i) => i.completed)?.length || 0;
        return total > 0
          ? t('pageCards.completedSummary', { done, total, defaultValue: `${done}/${total} tamamlandı` })
          : t('pageCards.emptyTodo', 'Boş liste');
      }
      case 'monthly': {
        const events = page.data?.events?.length || 0;
        return events > 0
          ? t('pageCards.eventsSummary', { count: events, defaultValue: `${events} etkinlik` })
          : t('pageCards.emptyEvents', 'Etkinlik yok');
      }
      case 'weekly': {
        const totalItems = page.data?.days?.reduce(
          (sum, d) => sum + (d.items?.length || 0),
          0
        ) || 0;
        return totalItems > 0
          ? t('pageCards.tasksSummary', { count: totalItems, defaultValue: `${totalItems} görev` })
          : t('pageCards.emptyWeekly', 'Boş hafta');
      }
      case 'blank': {
        const len = page.data?.content?.length || 0;
        return len > 0
          ? t('pageCards.charsSummary', { count: len, defaultValue: `${len} karakter` })
          : t('pageCards.emptyBlank', 'Boş sayfa');
      }
      default:
        return '';
    }
  };

  const rawDate = page.createdAt ? new Date(page.createdAt) : null;
  const dateLocaleMap = { tr: 'tr-TR', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR' };
  const currentLocale = dateLocaleMap[i18n.language?.slice(0, 2)] || 'en-US';
  const createdDate = rawDate && !isNaN(rawDate)
    ? rawDate.toLocaleDateString(currentLocale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: templateColors.bg,
          borderColor: templateColors.accent + '30',
        },
      ]}
    >
      {/* Sol ve Orta Kısım Tıklanabilir Alan */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.cardTouchable}
      >
        {/* Sol: İkon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: templateColors.accent + '15' },
          ]}
        >
          <MaterialCommunityIcons
            name={category?.icon || 'file-outline'}
            size={28}
            color={templateColors.accent}
          />
        </View>

        {/* Orta: Bilgiler */}
        <View style={styles.infoContainer}>
          <Text
            style={[styles.pageTitle, { color: templateColors.accent }]}
            numberOfLines={1}
          >
            {page.title}
          </Text>
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.categoryBadge,
                {
                  color: templateColors.accent,
                  backgroundColor: templateColors.accent + '15',
                },
              ]}
            >
              {category?.emoji} {category?.name}
            </Text>
          </View>
          <Text style={[styles.summary, { color: templateColors.accent + '99' }]}>
            {getSummary()}{createdDate ? ` · ${createdDate}` : ''}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Sağ: İkonlar (Silme Butonu Bağımsız) */}
      <View style={styles.rightActions}>
        {onDelete && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onDelete}
            style={styles.deleteButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <View pointerEvents="none">
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color="#E53935"
              />
            </View>
          </TouchableOpacity>
        )}
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={templateColors.accent + '60'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    // Gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  summary: {
    fontSize: 12,
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFEbee',
  },
});
