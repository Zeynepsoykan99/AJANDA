import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { THEMES, DEFAULT_THEME_ID, getThemeById } from '../constants/themes';
import { StorageService } from '../services/storageService';

/**
 * AJANDA - Tema Context
 * Uygulamanın her yerinden aktif temaya erişmeyi ve değiştirmeyi sağlar.
 */

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [isLoaded, setIsLoaded] = useState(false);

  // Uygulama açılışında kaydedilmiş temayı yükle
  useEffect(() => {
    (async () => {
      try {
        const savedThemeId = await StorageService.getTheme();
        if (savedThemeId && THEMES[savedThemeId]) {
          setThemeId(savedThemeId);
        }
      } catch (error) {
        console.warn('Tema yüklenirken hata:', error);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Tema değiştirme fonksiyonu
  const setTheme = useCallback(async (newThemeId) => {
    if (THEMES[newThemeId]) {
      setThemeId(newThemeId);
      try {
        await StorageService.setTheme(newThemeId);
      } catch (error) {
        console.warn('Tema kaydedilirken hata:', error);
      }
    }
  }, []);

  const theme = getThemeById(themeId);

  const value = {
    theme,           // Tam tema nesnesi { id, name, emoji, colors }
    themeId,         // Aktif tema ID'si
    colors: theme.colors,  // Kısayol: doğrudan renk paletine erişim
    setTheme,        // Tema değiştirme fonksiyonu
    isLoaded,        // Tema yüklenmesinin tamamlanıp tamamlanmadığı
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme hook - tema verilerine erişim sağlar
 * @returns {{ theme: object, themeId: string, colors: object, setTheme: function, isLoaded: boolean }}
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme hook\'u ThemeProvider içinde kullanılmalıdır.');
  }
  return context;
}

export default ThemeContext;
