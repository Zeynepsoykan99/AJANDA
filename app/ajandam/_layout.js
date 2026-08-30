import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

/**
 * Ajanda iç sayfa navigasyonu
 * /ajandam/pages ve /ajandam/[pageId] sayfalarını yönetir.
 */
export default function AjandamLayout() {
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
