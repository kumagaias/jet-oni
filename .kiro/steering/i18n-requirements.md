---
inclusion: always
---

# Internationalization (i18n) Requirements

## Language Support

- **Required languages**: English (en) and Japanese (jp)
- **Default language**: English (en)
- **Language persistence**: Save user's language preference to localStorage
- **Language switching**: Allow users to switch languages at runtime

## Implementation Guidelines

### Translation File Structure

All user-facing text must be defined in translation files with both English and Japanese versions:

```typescript
const translations = {
  en: {
    // English translations
    menuTitle: 'Game Menu',
    startButton: 'Start Game',
  },
  jp: {
    // Japanese translations
    menuTitle: 'ゲームメニュー',
    startButton: 'ゲーム開始',
  }
};
```

### Translation Keys

- **Use descriptive keys**: Keys should clearly indicate what text they represent
- **Nested structure**: Group related translations using nested objects
- **Consistent naming**: Use camelCase for translation keys

Example:
```typescript
{
  menu: {
    title: 'Menu',
    start: 'Start',
    settings: 'Settings'
  },
  game: {
    status: {
      oni: 'ONI',
      runner: 'RUNNER'
    }
  }
}
```

### Parameter Substitution

Support dynamic text with parameters:

```typescript
// Translation
taggedPlayer: 'Tagged {player}!'

// Usage
i18n.t('taggedPlayer', { player: 'Player1' })
// Result: "Tagged Player1!"
```

### UI Integration

#### HTML Attributes

Use `data-i18n` attribute for automatic translation:

```html
<button data-i18n="menu.start">Start</button>
```

#### Programmatic Translation

Use the `t()` function for dynamic content:

```typescript
const message = i18n.t('game.status.oni');
```

### Language Switcher

- **Visible location**: Place language switcher in accessible location (e.g., title screen)
- **Clear labels**: Use language codes (EN/JP) or native names (English/日本語)
- **Active state**: Highlight currently selected language
- **Immediate update**: Apply language change immediately to all UI elements

## Translation Guidelines

### English (en)

- **Use clear, concise language**: Avoid jargon and complex terms
- **Active voice**: Use active voice for actions (e.g., "Start Game" not "Game is Started")
- **Consistent terminology**: Use the same terms throughout the app
- **Title case for buttons**: Use title case for button labels (e.g., "Start Game")
- **Sentence case for messages**: Use sentence case for messages (e.g., "You became ONI!")

### Japanese (jp)

- **Natural Japanese**: Use natural, conversational Japanese
- **Appropriate formality**: Use appropriate level of formality for game context (casual is usually fine)
- **Consistent terminology**: Maintain consistent game-specific terms
- **Kanji usage**: Use appropriate mix of kanji, hiragana, and katakana
- **No unnecessary particles**: Keep text concise, especially for UI labels

### Common Game Terms

Maintain consistency for these game-specific terms:

| English | Japanese | Notes |
|---------|----------|-------|
| ONI | 鬼 | Traditional Japanese term for demon/ogre |
| Runner | 逃げる側 | "The escaping side" |
| Jetpack | ジェットパック | Katakana for foreign word |
| Dash | ダッシュ | Katakana for foreign word |
| Beacon | ビーコン | Katakana for foreign word |
| Tagged | 鬼にした | "Made into oni" |
| Spotted | 見つかった | "Was found" |

## Testing i18n

### Manual Testing

1. **Switch languages**: Test language switcher functionality
2. **Check all screens**: Verify translations on all screens (menu, game, settings, results)
3. **Test dynamic content**: Verify parameter substitution works correctly
4. **Check text overflow**: Ensure translated text fits in UI elements
5. **Verify persistence**: Confirm language preference is saved and restored

### Automated Testing

Write tests for i18n functionality:

```typescript
describe('I18n', () => {
  it('should return English translation by default', () => {
    const i18n = new I18n('en');
    expect(i18n.t('menu.start')).toBe('Start Game');
  });
  
  it('should return Japanese translation when language is set to jp', () => {
    const i18n = new I18n('jp');
    expect(i18n.t('menu.start')).toBe('ゲーム開始');
  });
  
  it('should substitute parameters correctly', () => {
    const i18n = new I18n('en');
    expect(i18n.t('taggedPlayer', { player: 'Test' })).toBe('Tagged Test!');
  });
});
```

## Missing Translations

- **Fallback behavior**: If translation is missing, display the translation key
- **Log warnings**: Log warnings in development mode for missing translations
- **Never show empty text**: Always display something, even if it's the key

## Adding New Translations

When adding new user-facing text:

1. **Add to both languages**: Always add translations for both en and jp
2. **Use descriptive keys**: Choose clear, descriptive translation keys
3. **Test both languages**: Verify text displays correctly in both languages
4. **Update documentation**: Document any new game-specific terminology

## File Organization

- **Separate i18n file**: Keep translations in dedicated i18n file(s)
- **Split large files**: If translations exceed 500 lines, split by feature/screen
- **Export i18n instance**: Export a singleton i18n instance for app-wide use

Example structure:
```
src/
  i18n/
    index.ts          # Main i18n class and instance
    translations/
      en.ts           # English translations
      jp.ts           # Japanese translations
      menu.ts         # Menu-specific translations (if needed)
      game.ts         # Game-specific translations (if needed)
```
