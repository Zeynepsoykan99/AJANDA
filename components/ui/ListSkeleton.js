import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import Skeleton from './Skeleton';
import { useTheme } from '../../context/ThemeContext';

export default function ListSkeleton({ count = 4 }) {
  const { colors } = useTheme();
  
  const dummyData = Array.from({ length: count }).map((_, i) => i.toString());

  const renderItem = () => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton width={52} height={52} borderRadius={14} style={styles.iconSkeleton} />
      
      <View style={styles.infoContainer}>
        <Skeleton width="60%" height={20} borderRadius={6} />
        <Skeleton width="40%" height={16} borderRadius={6} />
        <Skeleton width="80%" height={14} borderRadius={6} />
      </View>
      
      <Skeleton width={24} height={24} borderRadius={12} style={styles.actionSkeleton} />
    </View>
  );

  return (
    <FlatList
      data={dummyData}
      keyExtractor={(item) => item}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
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
  iconSkeleton: {
    marginRight: 14,
  },
  infoContainer: {
    flex: 1,
    gap: 8,
  },
  actionSkeleton: {
    marginLeft: 16,
  },
});
