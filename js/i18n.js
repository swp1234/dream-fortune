// i18n IIFE with try-catch to prevent loader stuck
(function() {
    try {
        class I18n {
            constructor() {
                this.translations = {};
                this.supportedLanguages = ['ko', 'en', 'ja', 'es', 'pt', 'zh', 'id', 'tr', 'de', 'fr', 'hi', 'ru'];
                this.currentLang = this.detectLanguage();
            }
            detectLanguage() {
                try {
                    const savedLang = localStorage.getItem('app_language');
                    if (savedLang && this.supportedLanguages.includes(savedLang)) return savedLang;
                } catch (e) {
                    // localStorage not available (private mode)
                }
                try {
                    const browserLang = (navigator.language || navigator.userLanguage).split('-')[0];
                    if (this.supportedLanguages.includes(browserLang)) return browserLang;
                } catch (e) {}
                return 'en';
            }
            async loadTranslations(lang) {
                try {
                    const response = await fetch(`js/locales/${lang}.json`);
                    if (!response.ok) throw new Error('Not found');
                    this.translations[lang] = await response.json();
                    return true;
                } catch (e) {
                    console.error(`Failed to load ${lang}:`, e);
                    if (lang !== 'en') return this.loadTranslations('en');
                    return false;
                }
            }
            t(key) {
                const keys = key.split('.');
                let value = this.translations[this.currentLang];
                for (const k of keys) {
                    value = value?.[k];
                    if (!value) return key;
                }
                return value;
            }
            async setLanguage(lang) {
                if (!this.supportedLanguages.includes(lang)) return false;
                if (!this.translations[lang]) await this.loadTranslations(lang);
                this.currentLang = lang;
                try { localStorage.setItem('app_language', lang); } catch (e) {}
                document.documentElement.lang = lang;
                this.updateUI();
                return true;
            }
            updateUI() {
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    el.textContent = this.t(el.getAttribute('data-i18n'));
                });
                document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                    el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
                });
                document.title = this.t('app.title');
                const meta = document.querySelector('meta[name="description"]');
                if (meta) meta.content = this.t('app.description');
            }
            getCurrentLanguage() { return this.currentLang; }
            getLanguageName(lang) {
                const names = {
                    'ko': '한국어',
                    'en': 'English',
                    'ja': '日本語',
                    'es': 'Español',
                    'pt': 'Português',
                    'zh': '简体中文',
                    'id': 'Bahasa Indonesia',
                    'tr': 'Türkçe',
                    'de': 'Deutsch',
                    'fr': 'Français',
                    'hi': 'हिन्दी',
                    'ru': 'Русский'
                };
                return names[lang] || lang;
            }
        }
        window.i18n = new I18n();
    } catch (e) {
        console.error('i18n initialization failed:', e);
        // Provide minimal fallback so app.js doesn't crash
        window.i18n = { t: function(k) { return k; }, loadTranslations: async function() { return false; }, updateUI: function() {}, getCurrentLanguage: function() { return 'en'; }, setLanguage: async function() { return false; } };
    }
})();
