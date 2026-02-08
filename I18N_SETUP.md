# Multi-Language Support Setup

## Files Created

### 1. i18n.js (`E:\Fire Project\projects\dream-fortune\js\i18n.js`)
- Core i18n class handling language detection, loading, and switching
- Supports: Korean (ko), English (en), Simplified Chinese (zh), Hindi (hi), Russian (ru)
- Detects browser language automatically, falls back to English
- Stores language preference in localStorage
- Updates UI elements with translated text

### 2. Locale Files (in `E:\Fire Project\projects\dream-fortune\js\locales\`)
- **ko.json** - Korean translations
- **en.json** - English translations
- **zh.json** - Simplified Chinese translations
- **hi.json** - Hindi translations
- **ru.json** - Russian translations

Each locale file contains translation keys for:
- App metadata (title, description)
- Header text
- Tab names
- Section labels (dream, fortune, tarot)
- Button text
- Ad text
- Recommendation section

### 3. HTML Changes (`index.html`)
- Added language selector dropdown (fixed top-right)
- Added `data-i18n` attributes to all translatable elements
- Added `data-i18n-placeholder` attributes for input fields
- Added language picker buttons for each supported language
- Included i18n.js script before other JavaScript files

### 4. CSS Changes (`css/style.css`)
- Added `.language-selector` styles (fixed positioning, z-index 1000)
- Added `.lang-btn` styles (glassmorphic design matching app theme)
- Added `.lang-menu` styles (dropdown menu)
- Added `.lang-option` styles (individual language buttons)
- Added `.active` state for selected language

### 5. JavaScript Changes (`js/app.js`)
- Added `setupI18n()` method to DreamFortuneApp class
- Language selector toggle functionality
- Automatic UI updates when language is changed
- Menu closing on outside click

## How It Works

1. **Initialization**: On page load, i18n detects user's language (saved preference or browser language)
2. **Loading**: Translations for current language are fetched from JSON files
3. **UI Update**: All elements with `data-i18n` attributes are updated with translated text
4. **Switching**: User can click language selector to change language
5. **Persistence**: Selected language is saved in localStorage for future visits

## Usage

Users can:
1. Click the 🌐 button in top-right corner
2. Select their preferred language from the dropdown
3. The entire app UI updates instantly
4. Their choice is remembered for next visit

## Technical Details

- All language data is in separate JSON files for easy maintenance
- Graceful fallback to English if translation fails
- Supports nested translation keys (e.g., "dream.question")
- Placeholder translations for input fields
- Meta tags (title, description) updated per language

