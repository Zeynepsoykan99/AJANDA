import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';

/**
 * NotificationService - AJANDA Merkezi Bildirim ve Hatırlatıcı Servisi
 *
 * expo-notifications altyapısını kullanarak yerel bildirim zamanlama,
 * izin kontrolü, iptal etme ve dinleyici yönetimini sağlar.
 */

// Uygulama açıkken (foreground) bildirim davranışı:
// Sistem bildirimini bastırıyoruz; onun yerine projenin tema renklerine uyumlu
// özel InAppNotificationBanner bileşeni ekranda belirecek.
export const configureNotificationHandler = () => {
  if (Platform.OS === 'web') return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false, // Foreground'da yerel banner devrede
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    console.warn('configureNotificationHandler hatası:', error);
  }
};

/**
 * Android için yüksek öncelikli bildirim kanalı yapılandırır
 */
export const setupNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Hatırlatıcılar',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C2185B',
      sound: 'default',
    });
  } catch (error) {
    console.warn('Android bildirim kanalı oluşturma hatası:', error);
  }
};

/**
 * Mevcut bildirim izin durumunu kontrol eder
 * @returns {Promise<{ granted: boolean, canAskAgain: boolean }>}
 */
export const getPermissions = async () => {
  if (Platform.OS === 'web') {
    return { granted: false, canAskAgain: false };
  }
  try {
    const settings = await Notifications.getPermissionsAsync();
    const isGranted =
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    return {
      granted: isGranted,
      canAskAgain: settings.canAskAgain,
    };
  } catch (error) {
    console.warn('getPermissions hatası:', error);
    return { granted: false, canAskAgain: true };
  }
};

/**
 * Kullanıcıdan bildirim izni talep eder
 * İzin reddedilmişse ve showAlertIfDenied true ise kullanıcıyı kırmadan ayarlara yönlendirici uyarı gösterir.
 * @param {object} [options]
 * @param {boolean} [options.showAlertIfDenied=false]
 * @param {function} [options.t] - Çeviri fonksiyonu
 * @returns {Promise<{ granted: boolean, canAskAgain: boolean }>}
 */
export const requestPermissions = async ({ showAlertIfDenied = false, t } = {}) => {
  try {
    const current = await getPermissions();
    if (current.granted) {
      await setupNotificationChannel();
      return { granted: true, canAskAgain: true };
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    const isGranted =
      requested.granted ||
      requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (isGranted) {
      await setupNotificationChannel();
    } else if (showAlertIfDenied) {
      const title = t ? t('reminder.permissionDeniedTitle', 'Bildirim İzni Gerekli') : 'Bildirim İzni Gerekli';
      const message = t
        ? t('reminder.permissionDeniedMessage', 'Hatırlatıcı kurabilmek için ayarlardan bildirim izni vermeniz gerekmektedir.')
        : 'Hatırlatıcı kurabilmek için ayarlardan bildirim izni vermeniz gerekmektedir.';
      const cancelText = t ? t('common.cancel', 'Vazgeç') : 'Vazgeç';
      const settingsText = t ? t('reminder.goToSettings', 'Ayarlara Git') : 'Ayarlara Git';

      Alert.alert(title, message, [
        { text: cancelText, style: 'cancel' },
        { text: settingsText, onPress: () => Linking.openSettings().catch(() => {}) },
      ]);
    }

    return {
      granted: isGranted,
      canAskAgain: requested.canAskAgain,
    };
  } catch (error) {
    console.warn('requestPermissions hatası:', error);
    return { granted: false, canAskAgain: true };
  }
};

/**
 * İleri bir tarih için yerel hatırlatıcı bildirimi zamanlar
 *
 * @param {object} params
 * @param {string} params.title - Bildirim başlığı
 * @param {string} params.body - Bildirim gövdesi
 * @param {Date|string} params.date - Tetiklenme zamanı
 * @param {function} [params.t] - Çeviri fonksiyonu
 * @param {object} [params.data={}] - Ek veri (sayfa kimliği, kategori, yönlendirme rotası)
 * @returns {Promise<{ success: boolean, notificationId?: string, scheduledDate?: string, error?: string }>}
 */
export const scheduleReminderNotification = async ({
  title,
  body,
  date,
  t,
  data = {},
}) => {
  try {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();

    if (!targetDate || isNaN(targetDate.getTime())) {
      return { success: false, error: 'invalid_date' };
    }

    if (targetDate.getTime() <= now.getTime()) {
      return { success: false, error: 'past_date' };
    }

    const { granted } = await requestPermissions({ showAlertIfDenied: true, t });
    if (!granted) {
      return { success: false, error: 'permission_denied' };
    }

    await setupNotificationChannel();

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'AJANDA Hatırlatıcısı',
        body: body || 'Zamanı gelen bir göreviniz var!',
        sound: true,
        data: {
          ...data,
          scheduledAt: targetDate.toISOString(),
        },
      },
      trigger: {
        type: 'date',
        date: targetDate,
      },
    });

    return {
      success: true,
      notificationId,
      scheduledDate: targetDate.toISOString(),
    };
  } catch (error) {
    console.warn('scheduleReminderNotification hatası:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Zamanlanmış bir bildirimi iptal eder
 * @param {string} notificationId
 * @returns {Promise<boolean>}
 */
export const cancelScheduledNotification = async (notificationId) => {
  if (!notificationId) return false;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return true;
  } catch (error) {
    console.warn('cancelScheduledNotification hatası:', error);
    return false;
  }
};

/**
 * Sistemde bekleyen tüm bildirimleri listeler
 * @returns {Promise<Array>}
 */
export const getAllScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('getAllScheduledNotifications hatası:', error);
    return [];
  }
};

/**
 * Bildirim dinleyicilerini kaydeder (foreground ve background response)
 *
 * @param {object} callbacks
 * @param {function} [callbacks.onReceived] - Foreground'da bildirim geldiğinde tetiklenir: (notification) => void
 * @param {function} [callbacks.onResponse] - Kullanıcı bildirime tıkladığında tetiklenir: (response) => void
 * @returns {function} unsubscribe fonksiyonu
 */
export const addNotificationListeners = ({ onReceived, onResponse }) => {
  if (Platform.OS === 'web') {
    return () => {};
  }
  const subscriptions = [];

  if (onReceived) {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      onReceived(notification);
    });
    subscriptions.push(sub);
  }

  if (onResponse) {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      onResponse(response);
    });
    subscriptions.push(sub);
  }

  return () => {
    subscriptions.forEach((sub) => {
      try {
        sub.remove();
      } catch (e) {}
    });
  };
};

export const NotificationService = {
  configureNotificationHandler,
  setupNotificationChannel,
  getPermissions,
  requestPermissions,
  scheduleReminderNotification,
  cancelScheduledNotification,
  getAllScheduledNotifications,
  addNotificationListeners,
};

export default NotificationService;
