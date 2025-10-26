/**
 * I18n module exports
 * Provides internationalization support for JetOni game
 */

import { I18n, TranslationData } from './i18n';
import { en } from './translations/en';
import { jp } from './translations/jp';

// Combine translations
const translations: TranslationData = {
  en,
  jp,
};

// Create and export singleton i18n instance
export const i18n = new I18n(translations, 'en');

// Export types and classes for external use
export { I18n, Language, Translations, TranslationData } from './i18n';
