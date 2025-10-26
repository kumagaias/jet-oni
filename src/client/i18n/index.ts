/**
 * I18n module exports
 * Provides internationalization support for JetOni game
 */

import { I18n, type Language, type Translations, type TranslationSet } from './i18n';
import { en } from './translations/en';
import { jp } from './translations/jp';

// Create translation set
const translations: TranslationSet = {
  en,
  jp,
};

// Create and export singleton i18n instance
export const i18n = new I18n(translations, 'en');

// Export types and classes for external use
export { I18n, type Language, type Translations, type TranslationSet };
