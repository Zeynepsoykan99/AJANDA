import React, { useState, useEffect } from 'react';
import '../i18n';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import Skeleton from '../components/ui/Skeleton';
import { View, StyleSheet } from 'react-native';
import InAppNotificationBanner from '../components/ui/InAppNotificationBanner';
import {
  configureNotificationHandler,
  setupNotificationChannel,
  addNotificationListeners,
} from '../services/notificationService';

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
  const router = useRouter();
  const { colors, isLoaded } = useTheme();

  // Ön plan uygulama içi bildirim banner durumu
  const [inAppBanner, setInAppBanner] = useState({
    visible: false,
    title: '',
    message: '',
    data: null,
  });

  // Bildirim altyapısını ve dinleyicilerini başlat
  useEffect(() => {
    configureNotificationHandler();
    setupNotificationChannel();

    const unsubscribe = addNotificationListeners({
      onReceived: (notification) => {
        const content = notification?.request?.content || {};
        setInAppBanner({
          visible: true,
          title: content.title || 'AJANDA Hatırlatıcısı',
          message: content.body || '',
          data: content.data || null,
        });
      },
      onResponse: (response) => {
        const data = response?.notification?.request?.content?.data;
        if (data?.route) {
          router.push(data.route);
        } else if (data?.pageId && data?.category === 'todo') {
          router.push(`/todolist/${data.pageId}`);
        } else if (data?.pageId && data?.category) {
          router.push(`/ajandam/${data.pageId}`);
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

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

      {/* Ön Plan Bildirim Banner'ı */}
      <InAppNotificationBanner
        visible={inAppBanner.visible}
        title={inAppBanner.title}
        message={inAppBanner.message}
        data={inAppBanner.data}
        onDismiss={() => setInAppBanner((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}

