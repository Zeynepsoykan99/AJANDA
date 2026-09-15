import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import BottomSheet from '../ui/BottomSheet';
import { searchNotebookPages } from '../../services/searchService';

/**
 * NotebookSearchSheet - Defter içi arama
 * Yazdıkça defterin metin kutularında (textBlocks) arar; sonuca dokunulunca onSelectResult(pageIndex) çağrılır.
 *
 * @param {boolean} visible
 * @param {function} onClose
 * @param {Array} pages - Defterin güncel sayfaları
 * @param {(pageIndex: number) => void} onSelectResult
 */
export default function NotebookSearchSheet({ visible, onClose, pages, onSelectResult }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  // Her açılışta boş arama ile başla
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const results = useMemo(() => searchNotebookPages(pages, query), [pages, query]);
  const hasQuery = query.trim().length > 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('notebooks.search', 'Defterde Ara')}
      subtitle={t('notebooks.searchHint', 'Yazdığın ve el yazısından dönüştürdüğün metinlerde arar.')}
    >
      <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.accent} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('notebooks.searchPlaceholder', 'Not sayfalarında kelime ara...')}
          placeholderTextColor={colors.textSecondary + '80'}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />
        {hasQuery && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary + '99'} />
          </TouchableOpacity>
        )}
      </View>

      {hasQuery && (
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {results.length > 0
            ? t('notebooks.resultCount', { count: results.length, defaultValue: `${results.length} sayfada eşleşme` })
            : t('notebooks.noResults', 'Sonuç bulunamadı')}
        </Text>
      )}

      <FlatList
        data={hasQuery ? results : []}
        keyExtractor={(item) => item.pageId}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onSelectResult(item.pageIndex)}
            style={[styles.resultCard, { borderColor: colors.border + '80', backgroundColor: colors.card }]}
          >
            <View style={styles.resultHeader}>
              <Text style={[styles.resultPage, { color: colors.accent }]}>
                {t('diary.page', 'Sayfa')} {item.pageNumber}
              </Text>
              {item.matchCount > 1 && (
                <Text style={[styles.resultMatches, { color: colors.textSecondary }]}>
                  {t('notebooks.matchCount', { count: item.matchCount, defaultValue: `${item.matchCount} eşleşme` })}
                </Text>
              )}
            </View>
            <Text style={[styles.resultSnippet, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.snippet}
            </Text>
          </TouchableOpacity>
        )}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    marginTop: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  listContent: {
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultPage: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultMatches: {
    fontSize: 12,
  },
  resultSnippet: {
    fontSize: 14,
    lineHeight: 20,
  },
});
