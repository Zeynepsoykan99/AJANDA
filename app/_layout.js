import React, { useState, useEffect } from 'react';
import '../i18n';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import Skeleton from '../components/ui/Skeleton';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import InAppNotificationBanner from '../components/ui/InAppNotificationBanner';
import {
  configureNotificationHandler,
  setupNotificationChannel,
  addNotificationListeners,
} from '../services/notificationService';

/**
 * GlobalErrorBoundary - React Render Ağacındaki Tüm Ölümcül Hataları Yakalayan Kalkan
 * Beyaz ekran oluşmasını engeller, hatayı ve stack trace'i ekrana yansıtır.
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('⚠️ [AJANDA GlobalErrorBoundary] Hata yakalandı:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <View style={errorStyles.card}>
            <Text style={errorStyles.icon}>⚠️</Text>
            <Text style={errorStyles.title}>Uygulama Hatası Yakalandı</Text>
            <Text style={errorStyles.subtitle}>
              Bileşen render edilirken beklenmeyen bir hata oluştu:
            </Text>
            <ScrollView style={errorStyles.errorBox} contentContainerStyle={{ padding: 10 }}>
              <Text style={errorStyles.errorMessage}>
                {this.state.error?.message || String(this.state.error)}
              </Text>
              {this.state.error?.stack && (
                <Text style={errorStyles.errorStack}>
                  {this.state.error.stack}
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity style={errorStyles.retryButton} onPress={this.handleRetry} activeOpacity={0.8}>
              <Text style={errorStyles.retryText}>Yeniden Dene</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * Expo Router Varsayılan Hata Sınırı (Route ErrorBoundary)
 */
export function ErrorBoundary({ error, retry }) {
  return (
    <View style={errorStyles.container}>
      <View style={errorStyles.card}>
        <Text style={errorStyles.icon}>⚠️</Text>
        <Text style={errorStyles.title}>Sayfa Yükleme Hatası (Expo Router)</Text>
        <ScrollView style={errorStyles.errorBox} contentContainerStyle={{ padding: 10 }}>
          <Text style={errorStyles.errorMessage}>
            {error?.message || String(error)}
          </Text>
          {error?.stack && (
            <Text style={errorStyles.errorStack}>
              {error.stack}
            </Text>
          )}
        </ScrollView>
        <TouchableOpacity style={errorStyles.retryButton} onPress={retry} activeOpacity={0.8}>
          <Text style={errorStyles.retryText}>Sayfayı Yeniden Yükle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <SafeAreaProvider>
            <ThemedApp />
          </SafeAreaProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </GlobalErrorBoundary>
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

  // Bildirim altyapısını ve dinleyicilerini başlat (Web ortamında güvenli)
  useEffect(() => {
    if (Platform.OS === 'web') return;

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
      unsubscribe && unsubscribe();
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

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#282A36',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#44475A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  icon: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF5555',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#F8F8F2',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  errorBox: {
    maxHeight: 220,
    backgroundColor: '#181920',
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#383A4A',
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF79C6',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 11,
    color: '#8BE9FD',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: '#50FA7B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  retryText: {
    color: '#1E1E2E',
    fontWeight: '700',
    fontSize: 15,
  },
});

