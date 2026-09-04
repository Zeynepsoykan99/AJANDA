import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { StorageService } from '../../services/storageService';
import { searchAllData } from '../../services/searchService';
import { getPageDisplayTitle } from '../../utils/pageTitleHelper';

const DATE_LOCALE_MAP = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
};

/**
 * GlobalSearchModal - Tüm sayfa, not ve yapılacaklar için canlı arama ekranı
 *
 * @param {boolean} visible - Modal açık mı
 * @param {function} onClose - Modalı kapatma callback'i
 * @param {string} initialCategory - Başlangıç kategori filtresi ('all' | 'ajandam' | 'todo')
 */
export default function GlobalSearchModal({
  visible,
  onClose,
  initialCategory = 'all',
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const currentLang = i18n.language?.slice(0, 2) || 'tr';
  const activeLocale = DATE_LOCALE_MAP[currentLang] || 'tr-TR';

  const categoryTabs = [
    { id: 'all', label: t('search.tabAll'), icon: 'sparkles' },
    { id: 'ajandam', label: t('search.tabAgenda'), icon: 'calendar-month' },
    { id: 'todo', label: t('search.tabTodo'), icon: 'checkbox-marked-circle-outline' },
    { id: 'cover', label: t('search.tabCover'), icon: 'book-open-page-variant' },
  ];

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // In-memory veri önbelleği (diskten tekrar tekrar okumayı engeller)
  const cachedPagesRef = useRef(null);
  const cachedCoverRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Modal her açıldığında verileri belleğe yükle
  useEffect(() => {
    if (visible) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setSelectedCategory(initialCategory);

      // Verileri bir kez belleğe al
      (async () => {
        try {
          const [pages, cover] = await Promise.all([
            StorageService.getPages(),
            StorageService.getCover(),
          ]);
          cachedPagesRef.current = pages || [];
          cachedCoverRef.current = cover || null;
        } catch (e) {
          console.warn('Arama verileri önbelleğe alınamadı:', e);
        }
      })();
    }
  }, [visible, initialCategory]);

  // Arama motorunu çalıştır
  const executeSearch = useCallback(
    async (text, cat) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setHasSearched(true);
      const searchResults = await searchAllData(
        trimmed,
        { category: cat },
        cachedPagesRef.current,
        cachedCoverRef.current
      );
      setResults(searchResults);
    },
    []
  );

  // Arama girdisi değiştiğinde canlı filtrele
  const handleQueryChange = (text) => {
    setQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(text, selectedCategory);
    }, 100);
  };

  // Kategori sekmesi değiştiğinde
  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    executeSearch(query, catId);
  };

  // Sonuca tıklama ve yönlendirme
  const handleResultPress = (item) => {
    onClose();
    // Modal kapandıktan sonra pürüzsüz geçiş
    setTimeout(() => {
      router.push(item.route);
    }, 150);
  };

  const getCategoryLabel = (cat, fallback) => {
    switch (cat) {
      case 'ajandam':
        return t('search.tabAgenda');
      case 'todo':
        return t('search.tabTodo');
      case 'cover':
        return t('search.tabCover');
      default:
        return fallback || cat;
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString(activeLocale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* ── Üst Arama Çubuğu ── */}
          <View style={[styles.searchBarRow, { borderBottomColor: colors.border }]}>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: isFocused ? colors.accent : colors.border,
                  borderWidth: isFocused ? 1.5 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={22}
                color={isFocused ? colors.accent : colors.textSecondary}
              />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder={t('search.placeholder')}
                placeholderTextColor={colors.textSecondary + '80'}
                value={query}
                onChangeText={handleQueryChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoFocus={true}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleQueryChange('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.cancelButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.accent }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Kategori Filtre Çipleri ── */}
          <View style={styles.categoriesRow}>
            {categoryTabs.map((tab) => {
              const isSelected = selectedCategory === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => handleCategorySelect(tab.id)}
                  style={[
                    styles.categoryTab,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.card,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={tab.icon}
                    size={14}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryTabText,
                      { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── İçerik Alanı (Sonuçlar veya Boş Durum) ── */}
          <View style={styles.contentArea}>
            {!hasSearched ? (
              // 1. Arama Yapılmamışken Başlangıç İpucu
              <View style={styles.emptyStateContainer}>
                <View style={[styles.emptyIconBg, { backgroundColor: colors.accent + '15' }]}>
                  <MaterialCommunityIcons
                    name="text-box-search-outline"
                    size={48}
                    color={colors.accent}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {t('search.initialTitle')}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t('search.initialSubtitle')}
                </Text>
              </View>
            ) : results.length === 0 ? (
              // 2. Arama Yapılmış ama Sonuç Yok
              <View style={styles.emptyStateContainer}>
                <View style={[styles.emptyIconBg, { backgroundColor: colors.border + '30' }]}>
                  <MaterialCommunityIcons
                    name="emoticon-sad-outline"
                    size={48}
                    color={colors.textSecondary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {t('search.noResultsTitle')}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t('search.noResultsSubtitle', { query })}
                </Text>
              </View>
            ) : (
              // 3. Eşleşen Sonuçlar Listesi
              <View style={{ flex: 1 }}>
                <View style={styles.resultsHeader}>
                  <Text style={[styles.resultsCountText, { color: colors.textSecondary }]}>
                    {t('search.resultsCount', { count: results.length })}
                  </Text>
                </View>

                <FlatList
                  data={results}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => {
                    const dateStr = formatDate(item.createdAt);
                    return (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleResultPress(item)}
                        style={[
                          styles.resultCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        {/* Sol İkon / Rozet */}
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: colors.accent + '15' },
                          ]}
                        >
                          <Text style={styles.categoryEmoji}>{item.categoryEmoji}</Text>
                        </View>

                        {/* Orta Bilgi Alanı */}
                        <View style={styles.resultInfo}>
                          <View style={styles.titleRow}>
                            <Text
                              style={[styles.resultTitle, { color: colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {getPageDisplayTitle(item, t)}
                            </Text>
                            <Text style={[styles.categoryTag, { color: colors.accent }]}>
                              {getCategoryLabel(item.category, item.categoryName)}
                            </Text>
                          </View>

                          {/* Pasaj / Snippet */}
                          {item.primarySnippet && (
                            <View style={styles.snippetContainer}>
                              <Text style={[styles.snippetField, { color: colors.accent + '99' }]}>
                                {item.field}:
                              </Text>
                              <Text
                                style={[styles.snippetText, { color: colors.textSecondary }]}
                                numberOfLines={2}
                              >
                                {item.primarySnippet}
                              </Text>
                            </View>
                          )}

                          {/* Tarih ve El Yazısı Rozeti */}
                          <View style={styles.footerRow}>
                            {dateStr ? (
                              <Text style={[styles.dateText, { color: colors.textSecondary + '70' }]}>
                                {dateStr}
                              </Text>
                            ) : null}
                            {item.isHandwritingMatch && (
                              <View style={[styles.handwritingBadge, { backgroundColor: colors.accent + '18' }]}>
                                <MaterialCommunityIcons name="draw-pen" size={12} color={colors.accent} />
                                <Text style={[styles.handwritingBadgeText, { color: colors.accent }]}>
                                  {t('search.foundFromHandwriting')}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Sağ Yönlendirme İkonu */}
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={22}
                          color={colors.textSecondary + '60'}
                        />
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      },
    }),
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 12,
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 22,
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  snippetContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  snippetField: {
    fontSize: 12,
    fontWeight: '700',
  },
  snippetText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  dateText: {
    fontSize: 11,
    marginTop: 0,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  handwritingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  handwritingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
