import React from 'react';
import '../i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import Skeleton from '../components/ui/Skeleton';
import { View, StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ThemedApp />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { colors, isLoaded } = useTheme();

  // Tema yüklenene kadar tam ekran zarif bir iskelet göster
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <View style={{ paddingTop: 60, paddingHorizontal: 16 }}>
          {/* Header İskeleti */}
          <Skeleton width={180} height={28} borderRadius={8} style={{ marginBottom: 24 }} />
          {/* Liste İskeletleri */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Skeleton width={60} height={60} borderRadius={16} style={{ marginRight: 16 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="70%" height={20} borderRadius={6} />
              <Skeleton width="40%" height={16} borderRadius={6} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Skeleton width={60} height={60} borderRadius={16} style={{ marginRight: 16 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="50%" height={20} borderRadius={6} />
              <Skeleton width="30%" height={16} borderRadius={6} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />
    </>
  );
}
