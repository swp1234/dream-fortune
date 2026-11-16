// i18n IIFE with try-catch to prevent loader stuck
(function() {
    try {
        class I18n {
            constructor() {
                this.translations = {};
                this.supportedLanguages = ['ko', 'en', 'ja', 'es', 'pt', 'zh', 'id', 'tr', 'de', 'fr', 'hi', 'ru'];
                this.currentLang = this.detectLanguage();
                document.documentElement.lang = this.currentLang;
            }
            detectLanguage() {
                try {
                    const params = new URLSearchParams(window.location.search || '');
                    const urlLang = params.get('lang');
                    if (urlLang && this.supportedLanguages.includes(urlLang)) return urlLang;
                } catch (e) {}
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
                this.syncSeoState(lang);
                this.updateUI();
                return true;
            }
            getSeoHref(lang = this.currentLang) {
                const baseUrl = 'https://dopabrain.com/dream-fortune/';
                const safeLang = this.supportedLanguages.includes(lang) ? lang : 'en';
                const alt = document.querySelector(`link[rel="alternate"][hreflang="${safeLang}"]`);
                if (alt && alt.href) return alt.href;
                return safeLang === 'en' ? baseUrl : `${baseUrl}?lang=${encodeURIComponent(safeLang)}`;
            }
            syncSeoState(lang = this.currentLang) {
                const safeLang = this.supportedLanguages.includes(lang) ? lang : 'en';
                document.documentElement.lang = safeLang;
                const seoHref = this.getSeoHref(safeLang);
                const ogUrl = document.querySelector('meta[property="og:url"]');
                if (ogUrl) ogUrl.content = seoHref;
                const ogLocaleMap = {
                    ko: 'ko_KR', en: 'en_US', ja: 'ja_JP', zh: 'zh_CN', es: 'es_ES', pt: 'pt_BR',
                    hi: 'hi_IN', ru: 'ru_RU', id: 'id_ID', tr: 'tr_TR', de: 'de_DE', fr: 'fr_FR'
                };
                const ogLocale = document.querySelector('meta[property="og:locale"]');
                if (ogLocale && ogLocaleMap[safeLang]) ogLocale.content = ogLocaleMap[safeLang];
            }
            updateUI() {
                this.syncSeoState(this.currentLang);
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    const val = this.t(key);
                    if (val && val !== key) el.textContent = val;
                });
                document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                    const key = el.getAttribute('data-i18n-placeholder');
                    const val = this.t(key);
                    if (val && val !== key) el.placeholder = val;
                });
                const title = this.t('app.title');
                if (title && title !== 'app.title') document.title = title;
                const meta = document.querySelector('meta[name="description"]');
                const desc = this.t('app.description');
                if (meta && desc && desc !== 'app.description') meta.content = desc;
                const currentLang = this.currentLang || 'en';
                document.querySelectorAll('#related-grid a, .related-grid a').forEach(el => {
                    const raw = (el.getAttribute('data-base-href') || el.getAttribute('href') || '').split('?')[0];
                    if (raw && !raw.startsWith('http')) {
                        el.setAttribute('data-base-href', raw);
                        el.setAttribute('href', raw + '?lang=' + encodeURIComponent(currentLang));
                    }
                });
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
