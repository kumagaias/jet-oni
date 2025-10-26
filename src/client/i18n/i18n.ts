/**
 * Internationalization (i18n) system for JetOni game
 * Supports English (en) and Japanese (jp) languages
 */

export type Language = 'en' | 'jp';

export interface Translations {
  [key: string]: string | Translations;
}

export interface TranslationData {
  en: Translations;
  jp: Translations;
}

/**
 * I18n class for managing translations and language switching
 */
export class I18n {
  private currentLanguage: Language;
  private translations: TranslationData;
  private storageKey = 'jetoni_language';

  constructor(translations: TranslationData, defaultLanguage: Language = 'en') {
    this.translations = translations;
    
    // Load saved language preference from localStorage
    const savedLanguage = this.loadLanguagePreference();
    this.currentLanguage = savedLanguage || defaultLanguage;
  }

  /**
   * Get translation for a given key
   * Supports nested keys using dot notation (e.g., 'menu.title')
   * Supports parameter substitution using {param} syntax
   */
  t(key: string, params?: Record<string, string | number>): string {
    const translation = this.getNestedTranslation(key);
    
    if (typeof translation !== 'string') {
      console.warn(`Translation key not found or invalid: ${key}`);
      return key;
    }

    // Replace parameters if provided
    if (params) {
      return this.substituteParameters(translation, params);
    }

    return translation;
  }

  /**
   * Get nested translation using dot notation
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
   * Example: "Hello {name}!" with {name: "World"} -> "Hello World!"
   */
  private substituteParameters(
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
   * Get current language
   */
  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Set language and update UI
   */
  setLanguage(language: Language): void {
    if (language !== 'en' && language !== 'jp') {
      console.warn(`Invalid language: ${language}. Using 'en' as fallback.`);
      language = 'en';
    }

    this.currentLanguage = language;
    this.saveLanguagePreference(language);
    this.updateUI();
  }

  /**
   * Update all UI elements with data-i18n attribute
   */
  private updateUI(): void {
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach((element) => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        const translation = this.t(key);
        
        // Update text content
        if (element.textContent !== null) {
          element.textContent = translation;
        }
        
        // Update placeholder for input elements
        if (element instanceof HTMLInputElement && element.placeholder) {
          element.placeholder = translation;
        }
      }
    });

    // Dispatch custom event for manual UI updates
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: this.currentLanguage }
    }));
  }

  /**
   * Load language preference from localStorage
   */
  private loadLanguagePreference(): Language | null {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved === 'en' || saved === 'jp') {
        return saved;
      }
    } catch (error) {
      console.warn('Failed to load language preference:', error);
    }
    return null;
  }

  /**
   * Save language preference to localStorage
   */
  private saveLanguagePreference(language: Language): void {
    try {
      localStorage.setItem(this.storageKey, language);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
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
    return ['en', 'jp'];
  }
}
