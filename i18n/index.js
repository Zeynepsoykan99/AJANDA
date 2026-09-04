import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { StorageService } from '../services/storageService';
import tr from '../locales/tr.json';
import en from '../locales/en.json';

const resources = {
  tr: { translation: tr },
  en: { translation: en },
};

export const SUPPORTED_LANGUAGES = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

/**
 * Cihazın mevcut sistem dilini algılar.
 * Eğer sistem dili 'tr' ise 'tr', değilse fallback olarak 'en' döner.
 */
export const getDeviceLanguage = () => {
  try {
    const locales = Localization.getLocales ? Localization.getLocales() : [];
    const languageCode = locales[0]?.languageCode || (Localization.locale ? Localization.locale.split('-')[0] : null);
    return languageCode === 'tr' ? 'tr' : 'en';
  } catch (e) {
    return 'en';
  }
};

// 1. Senkron ilk başlatma: Cihaz dili ile anında hazır olur (0 bekleme süresi, beyaz ekran önleme)
const initialLang = getDeviceLanguage();

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v4',
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

// 2. AsyncStorage'da daha önce kaydedilmiş kullanıcı tercihi varsa senkronize et
StorageService.getLanguage().then((savedLang) => {
  if (savedLang && (savedLang === 'tr' || savedLang === 'en') && savedLang !== i18n.language) {
    i18n.changeLanguage(savedLang);
  }
}).catch((err) => {
  console.warn('i18n AsyncStorage sync error:', err);
});

/**
 * Kullanıcı arayüzünden dil değiştirildiğinde çağrılır.
 * Hem i18next state'ini günceller hem de tercihi AsyncStorage'a kalıcı kaydeder.
 */
export const changeAppLanguage = async (newLang) => {
  try {
    if (newLang !== 'tr' && newLang !== 'en') return;
    await i18n.changeLanguage(newLang);
    await StorageService.setLanguage(newLang);
  } catch (error) {
    console.warn('changeAppLanguage error:', error);
  }
};

export default i18n;
