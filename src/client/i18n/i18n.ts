/**
 * Internationalization (i18n) system for JetOni game
 * Supports English and Japanese languages with localStorage persistence
 */

export type Language = 'en' | 'jp';

export interface Translations {
  [key: string]: string | Translations;
}

export interface TranslationSet {
  en: Translations;
  jp: Translations;
}

/**
 * I18n class for managing translations and language switching
 */
export class I18n {
  private currentLanguage: Language;
  private translations: TranslationSet;
  private readonly STORAGE_KEY = 'jetoni_language';

  constructor(translations: TranslationSet, defaultLanguage: Language = 'en') {
    this.translations = translations;
    
    // Try to load saved language from localStorage
    const savedLanguage = this.loadLanguageFromStorage();
    this.currentLanguage = savedLanguage || defaultLanguage;
  }

  /**
   * Get the current language
   */
  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Set the current language and persist to localStorage
   */
  setLanguage(language: Language): void {
    this.currentLanguage = language;
    this.saveLanguageToStorage(language);
    this.updateUI();
  }

  /**
   * Get a translation by key with optional parameter substitution
   * @param key - Translation key (supports nested keys with dot notation)
   * @param params - Optional parameters for substitution
   * @returns Translated string
   */
  t(key: string, params?: Record<string, string | number>): string {
    const translation = this.getNestedTranslation(key);
    
    if (typeof translation !== 'string') {
      console.warn(`Translation key "${key}" not found or is not a string`);
      return key;
    }

    // Substitute parameters if provided
    if (params) {
      return this.substituteParams(translation, params);
    }

    return translation;
  }

  /**
   * Get nested translation by dot notation key
   */
  private getNestedTranslation(key: string): string | Translations {
    const keys = key.split('.');
    let current: string | Translations = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return key; // Return key if not found
      }
    }

    return current;
  }

  /**
   * Substitute parameters in translation string
   * Supports {paramName} syntax
   */
  private substituteParams(
    translation: string,
    params: Record<string, string | number>
  ): string {
    let result = translation;
    
    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return result;
  }

  /**
   * Update all UI elements with data-i18n attribute
   */
  updateUI(): void {
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach((element) => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        const translation = this.t(key);
        
        // Update text content or placeholder based on element type
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.placeholder = translation;
        } else {
          element.textContent = translation;
        }
      }
    });

    // Dispatch custom event for components that need to react to language changes
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: this.currentLanguage }
    }));
  }

  /**
   * Load language preference from localStorage
   */
  private loadLanguageFromStorage(): Language | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved === 'en' || saved === 'jp') {
        return saved;
      }
    } catch (error) {
      console.warn('Failed to load language from localStorage:', error);
    }
    return null;
  }

  /**
   * Save language preference to localStorage
   */
  private saveLanguageToStorage(language: Language): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, language);
    } catch (error) {
      console.warn('Failed to save language to localStorage:', error);
    }
  }

  /**
   * Check if a translation key exists
   */
  hasTranslation(key: string): boolean {
    const translation = this.getNestedTranslation(key);
    return typeof translation === 'string';
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages(): Language[] {
    return Object.keys(this.translations) as Language[];
  }
}
