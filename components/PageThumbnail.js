import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const category = PAGE_CATEGORIES.find((c) => c.id === page.category);
  const template = getPageTemplate(page.category, page.templateId);
  const templateColors = template?.colors || { bg: '#FFF0F5', accent: '#C2185B' };

  // Sayfa özeti (görev sayısı, not uzunluğu vb.)
  const getSummary = () => {
    switch (page.category) {
      case 'todo': {
        const total = page.data?.items?.length || 0;
        const done = page.data?.items?.filter((i) => i.completed)?.length || 0;
        return total > 0 ? `${done}/${total} tamamlandı` : 'Boş liste';
      }
      case 'monthly': {
        const events = page.data?.events?.length || 0;
        return events > 0 ? `${events} etkinlik` : 'Etkinlik yok';
      }
      case 'weekly': {
        const totalItems = page.data?.days?.reduce(
          (sum, d) => sum + (d.items?.length || 0),
          0
        ) || 0;
        return totalItems > 0 ? `${totalItems} görev` : 'Boş hafta';
      }
      case 'blank': {
        const len = page.data?.content?.length || 0;
        return len > 0 ? `${len} karakter` : 'Boş sayfa';
      }
      default:
        return '';
    }
  };

  const createdDate = new Date(page.createdAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        {
          backgroundColor: templateColors.bg,
          borderColor: templateColors.accent + '30',
        },
      ]}
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
          {getSummary()} · {createdDate}
        </Text>
      </View>

      {/* Sağ: İkonlar */}
      <View style={styles.rightActions}>
        {onDelete && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onDelete}
            style={styles.deleteButton}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color="#E53935"
            />
          </TouchableOpacity>
        )}
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={templateColors.accent + '60'}
        />
      </View>
    </TouchableOpacity>
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
