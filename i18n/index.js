import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { StorageService } from '../services/storageService';
import tr from '../locales/tr.json';
import en from '../locales/en.json';
import de from '../locales/de.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';

const resources = {
  tr: { translation: tr },
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
  fr: { translation: fr },
};

export const SUPPORTED_LANGUAGES = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

/**
 * Cihazın mevcut sistem dilini algılar.
 * Desteklenen dillerden biriyse doğrudan o dili, değilse 'en' döner.
 */
export const getDeviceLanguage = () => {
  try {
    const locales = Localization.getLocales ? Localization.getLocales() : [];
    const languageCode = locales[0]?.languageCode || (Localization.locale ? Localization.locale.split('-')[0] : null);
    if (languageCode && SUPPORTED_CODES.includes(languageCode)) {
      return languageCode;
    }
    return 'en';
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
  if (savedLang && SUPPORTED_CODES.includes(savedLang) && savedLang !== i18n.language) {
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
    if (!SUPPORTED_CODES.includes(newLang)) return;
    await i18n.changeLanguage(newLang);
    await StorageService.setLanguage(newLang);
  } catch (error) {
    console.warn('changeAppLanguage error:', error);
  }
};

export default i18n;
