import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

/**
 * Notlarım (Defterlerim) modülü navigasyon düzeni
 * /defterlerim (defter rafı), /defterlerim/[notebookId] (kapak) ve
 * /defterlerim/[notebookId]/pages (çoklu sayfa) rotalarını yönetir.
 */
export default function DefterlerimLayout() {
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
