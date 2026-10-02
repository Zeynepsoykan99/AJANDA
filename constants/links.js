/**
 * Uygulama dışındaki (web) adresler.
 *
 * Gizlilik politikasının kanonik metni repodaki `docs/` klasöründedir ve
 * GitHub Pages ile yayınlanır. Mağaza formlarına da bu adres girilir.
 */

/** GitHub Pages kök adresi */
export const SITE_BASE_URL = 'https://zeynepsoykan99.github.io/AJANDA';

/**
 * Dil koduna karşılık gelen gizlilik politikası yolu.
 * Türkçe kök adrestedir (`/privacy/`), diğerleri alt yoldadır.
 */
const PRIVACY_PATHS = {
  tr: '/privacy/',
  en: '/privacy/en/',
  de: '/privacy/de/',
  es: '/privacy/es/',
  fr: '/privacy/fr/',
};

/**
 * Kullanıcının diline uygun gizlilik politikası adresini döndürür.
 * Desteklenmeyen bir dil gelirse İngilizce sürüme düşer (politika yalnızca
 * bu beş dilde yayınlanıyor; Türkçe varsayılana düşmek yabancı bir kullanıcıyı
 * okuyamadığı bir metne götürürdü).
 *
 * @param {string} [language] - i18n dil kodu ('tr', 'en-US', 'de' ...)
 * @returns {string} Tam URL
 */
export const getPrivacyPolicyUrl = (language) => {
  const code = String(language || '').slice(0, 2).toLowerCase();
  const path = PRIVACY_PATHS[code] || PRIVACY_PATHS.en;
  return `${SITE_BASE_URL}${path}`;
};

export default { SITE_BASE_URL, getPrivacyPolicyUrl };
