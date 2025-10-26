/**
 * Tests for I18n system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { I18n } from './i18n';
import type { TranslationSet } from './i18n';

// Mock translations for testing
const mockTranslations: TranslationSet = {
  en: {
    simple: 'Hello',
    nested: {
      key: 'Nested value',
      deep: {
        value: 'Deep nested value',
      },
    },
    withParam: 'Hello {name}!',
    multiParam: '{greeting} {name}, you have {count} messages',
  },
  jp: {
    simple: 'こんにちは',
    nested: {
      key: 'ネストされた値',
      deep: {
        value: '深くネストされた値',
      },
    },
    withParam: 'こんにちは {name}！',
    multiParam: '{greeting} {name}、{count}件のメッセージがあります',
  },
};

describe('I18n', () => {
  let i18n: I18n;
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      key: vi.fn(),
      length: 0,
    };

    // Mock DOM for updateUI tests
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Translation retrieval', () => {
    it('should return English translation by default', () => {
      i18n = new I18n(mockTranslations, 'en');
      expect(i18n.t('simple')).toBe('Hello');
    });

    it('should return Japanese translation when language is set to jp', () => {
      i18n = new I18n(mockTranslations, 'jp');
      expect(i18n.t('simple')).toBe('こんにちは');
    });

    it('should retrieve nested translations using dot notation', () => {
      i18n = new I18n(mockTranslations, 'en');
      expect(i18n.t('nested.key')).toBe('Nested value');
      expect(i18n.t('nested.deep.value')).toBe('Deep nested value');
    });

    it('should return key if translation not found', () => {
      i18n = new I18n(mockTranslations, 'en');
      expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should handle missing nested keys gracefully', () => {
      i18n = new I18n(mockTranslations, 'en');
      expect(i18n.t('nested.missing.key')).toBe('nested.missing.key');
    });
  });

  describe('Language switching', () => {
    beforeEach(() => {
      i18n = new I18n(mockTranslations, 'en');
    });

    it('should switch from English to Japanese', () => {
      expect(i18n.getLanguage()).toBe('en');
      expect(i18n.t('simple')).toBe('Hello');

      i18n.setLanguage('jp');

      expect(i18n.getLanguage()).toBe('jp');
      expect(i18n.t('simple')).toBe('こんにちは');
    });

    it('should switch from Japanese to English', () => {
      i18n.setLanguage('jp');
      expect(i18n.t('simple')).toBe('こんにちは');

      i18n.setLanguage('en');
      expect(i18n.t('simple')).toBe('Hello');
    });

    it('should persist language to localStorage', () => {
      i18n.setLanguage('jp');
      expect(localStorage.setItem).toHaveBeenCalledWith('jetoni_language', 'jp');
      expect(localStorageMock['jetoni_language']).toBe('jp');
    });

    it('should load saved language from localStorage on initialization', () => {
      localStorageMock['jetoni_language'] = 'jp';
      
      const newI18n = new I18n(mockTranslations, 'en');
      
      expect(newI18n.getLanguage()).toBe('jp');
      expect(newI18n.t('simple')).toBe('こんにちは');
    });

    it('should use default language if localStorage is empty', () => {
      const newI18n = new I18n(mockTranslations, 'en');
      expect(newI18n.getLanguage()).toBe('en');
    });

    it('should dispatch languageChanged event when language changes', () => {
      const eventListener = vi.fn();
      window.addEventListener('languageChanged', eventListener);

      i18n.setLanguage('jp');

      expect(eventListener).toHaveBeenCalled();
      const event = eventListener.mock.calls[0][0] as CustomEvent;
      expect(event.detail.language).toBe('jp');

      window.removeEventListener('languageChanged', eventListener);
    });
  });

  describe('Parameter substitution', () => {
    beforeEach(() => {
      i18n = new I18n(mockTranslations, 'en');
    });

    it('should substitute single parameter', () => {
      const result = i18n.t('withParam', { name: 'Alice' });
      expect(result).toBe('Hello Alice!');
    });

    it('should substitute multiple parameters', () => {
      const result = i18n.t('multiParam', {
        greeting: 'Hi',
        name: 'Bob',
        count: '5',
      });
      expect(result).toBe('Hi Bob, you have 5 messages');
    });

    it('should substitute numeric parameters', () => {
      const result = i18n.t('multiParam', {
        greeting: 'Hello',
        name: 'Charlie',
        count: 42,
      });
      expect(result).toBe('Hello Charlie, you have 42 messages');
    });

    it('should work with Japanese translations', () => {
      i18n.setLanguage('jp');
      const result = i18n.t('withParam', { name: 'アリス' });
      expect(result).toBe('こんにちは アリス！');
    });

    it('should handle missing parameters gracefully', () => {
      const result = i18n.t('withParam', {});
      expect(result).toBe('Hello {name}!');
    });

    it('should replace all occurrences of the same parameter', () => {
      const translations: TranslationSet = {
        en: {
          repeated: '{name} and {name} are friends',
        },
        jp: {
          repeated: '{name}と{name}は友達です',
        },
      };
      
      const testI18n = new I18n(translations, 'en');
      const result = testI18n.t('repeated', { name: 'Alice' });
      expect(result).toBe('Alice and Alice are friends');
    });
  });

  describe('UI updates', () => {
    beforeEach(() => {
      i18n = new I18n(mockTranslations, 'en');
    });

    it('should update text content of elements with data-i18n attribute', () => {
      const button = document.createElement('button');
      button.setAttribute('data-i18n', 'simple');
      button.textContent = 'Old text';
      document.body.appendChild(button);

      i18n.updateUI();

      expect(button.textContent).toBe('Hello');
    });

    it('should update placeholder of input elements', () => {
      const input = document.createElement('input');
      input.setAttribute('data-i18n', 'simple');
      input.placeholder = 'Old placeholder';
      document.body.appendChild(input);

      i18n.updateUI();

      expect(input.placeholder).toBe('Hello');
    });

    it('should update multiple elements', () => {
      const div1 = document.createElement('div');
      div1.setAttribute('data-i18n', 'simple');
      const div2 = document.createElement('div');
      div2.setAttribute('data-i18n', 'nested.key');
      
      document.body.appendChild(div1);
      document.body.appendChild(div2);

      i18n.updateUI();

      expect(div1.textContent).toBe('Hello');
      expect(div2.textContent).toBe('Nested value');
    });

    it('should update UI when language changes', () => {
      const span = document.createElement('span');
      span.setAttribute('data-i18n', 'simple');
      document.body.appendChild(span);

      i18n.updateUI();
      expect(span.textContent).toBe('Hello');

      i18n.setLanguage('jp');
      expect(span.textContent).toBe('こんにちは');
    });
  });

  describe('Utility methods', () => {
    beforeEach(() => {
      i18n = new I18n(mockTranslations, 'en');
    });

    it('should check if translation exists', () => {
      expect(i18n.hasTranslation('simple')).toBe(true);
      expect(i18n.hasTranslation('nested.key')).toBe(true);
      expect(i18n.hasTranslation('nonexistent')).toBe(false);
    });

    it('should return available languages', () => {
      const languages = i18n.getAvailableLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('jp');
      expect(languages).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      global.localStorage = {
        getItem: vi.fn(() => {
          throw new Error('Storage error');
        }),
        setItem: vi.fn(() => {
          throw new Error('Storage error');
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      };

      // Should not throw, should use default language
      expect(() => {
        i18n = new I18n(mockTranslations, 'en');
      }).not.toThrow();

      expect(i18n.getLanguage()).toBe('en');

      // Should not throw when setting language
      expect(() => {
        i18n.setLanguage('jp');
      }).not.toThrow();

      expect(i18n.getLanguage()).toBe('jp');
    });

    it('should warn when translation key is not found', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      i18n = new I18n(mockTranslations, 'en');
      i18n.t('nonexistent.key');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Translation key "nonexistent.key" not found')
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
