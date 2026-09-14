import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

/**
 * Günlüğüm modülü navigasyon düzeni
 * /gunlugum (Kapak) ve /gunlugum/pages (Çoklu Sayfa Tuvali) rotalarını yönetir.
 */
export default function GunlugumLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        animation: 'slide_from_right',
      }}
    />
  );
}
