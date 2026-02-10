/**
 * Safe i18n Loader
 * i18n 로드 실패 시 폴백 처리
 */

class SafeI18n {
    constructor() {
        this.isReady = false;
        this.defaultLanguage = 'en';
        this.fallbackTranslations = {
            'en': {
                'app.title': 'App',
                'app.loading': 'Loading...',
                'error.network': 'Network error. Please try again.',
                'error.storage': 'Storage access failed. Using temporary storage.',
                'error.permission': 'Permission denied.',
                'error.unknown': 'An error occurred. Please refresh the page.',
                'button.retry': 'Retry',
                'button.close': 'Close',
                'button.ok': 'OK',
                'button.cancel': 'Cancel'
            },
            'ko': {
                'app.title': '앱',
                'app.loading': '로딩 중...',
                'error.network': '네트워크 오류입니다. 다시 시도해주세요.',
                'error.storage': '저장소 접근에 실패했습니다. 임시 저장소를 사용합니다.',
                'error.permission': '접근 권한이 없습니다.',
                'error.unknown': '오류가 발생했습니다. 페이지를 새로고침해주세요.',
                'button.retry': '다시 시도',
                'button.close': '닫기',
                'button.ok': '확인',
                'button.cancel': '취소'
            }
        };
    }

    // i18n 초기화 (기존 i18n 존재 시 사용, 없으면 폴백)
    async init() {
        try {
            // 기존 i18n 객체 확인
            if (window.i18n && typeof window.i18n.loadTranslations === 'function') {
                await window.i18n.loadTranslations(window.i18n.getCurrentLanguage());
                window.i18n.updateUI();
                this.isReady = true;
                return;
            }
        } catch (e) {
            console.warn('i18n initialization failed:', e.message);
        }

        // 폴백 모드 활성화
        this.enableFallback();
    }

    // 폴백 모드 활성화
    enableFallback() {
        if (!window.i18n) {
            window.i18n = this;
        }

        // 폴백 메서드 추가
        window.i18n.t = this.t.bind(this);
        window.i18n.getCurrentLanguage = this.getCurrentLanguage.bind(this);
        window.i18n.setLanguage = this.setLanguage.bind(this);
        window.i18n.updateUI = this.updateUI.bind(this);

        this.isReady = true;
    }

    // 번역 가져오기
    t(key, defaultValue = null) {
        const lang = this.getCurrentLanguage();
        const translations = this.fallbackTranslations[lang] || this.fallbackTranslations[this.defaultLanguage];

        if (translations && translations[key]) {
            return translations[key];
        }

        // 폴백: 기존 i18n 시도
        try {
            if (window.i18n && window.i18n !== this && typeof window.i18n.t === 'function') {
                return window.i18n.t(key);
            }
        } catch (e) {
            // 무시
        }

        return defaultValue || key;
    }

    // 현재 언어 가져오기
    getCurrentLanguage() {
        try {
            // localStorage에서 저장된 언어 확인
            const saved = localStorage.getItem('selected_language');
            if (saved && this.isValidLanguage(saved)) {
                return saved;
            }
        } catch (e) {
            // 무시
        }

        // 브라우저 언어 확인
        const browserLang = navigator.language?.split('-')[0];
        if (browserLang && this.isValidLanguage(browserLang)) {
            return browserLang;
        }

        // 기본 언어
        return this.defaultLanguage;
    }

    // 유효한 언어 확인
    isValidLanguage(lang) {
        return this.fallbackTranslations.hasOwnProperty(lang);
    }

    // 언어 변경
    async setLanguage(lang) {
        try {
            if (!this.isValidLanguage(lang)) {
                console.warn(`Invalid language: ${lang}`);
                return false;
            }

            localStorage.setItem('selected_language', lang);

            // 기존 i18n이 있으면 사용
            if (window.i18n && window.i18n !== this && typeof window.i18n.setLanguage === 'function') {
                await window.i18n.setLanguage(lang);
            }

            this.updateUI();
            return true;
        } catch (e) {
            console.error('Failed to set language:', e.message);
            return false;
        }
    }

    // UI 업데이트
    updateUI() {
        try {
            // [data-i18n] 속성을 가진 모든 요소 찾기
            const elements = document.querySelectorAll('[data-i18n]');
            elements.forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (key) {
                    const text = this.t(key);
                    if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') {
                        el.value = text;
                    } else {
                        el.textContent = text;
                    }
                }
            });

            // [data-i18n-title] 속성 업데이트
            const titleElements = document.querySelectorAll('[data-i18n-title]');
            titleElements.forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                if (key) {
                    el.title = this.t(key);
                }
            });

            // 기존 i18n updateUI 호출
            if (window.i18n && window.i18n !== this && typeof window.i18n.updateUI === 'function') {
                window.i18n.updateUI();
            }
        } catch (e) {
            console.warn('UI update error:', e.message);
        }
    }

    // 모든 지원 언어 목록
    getSupportedLanguages() {
        return Object.keys(this.fallbackTranslations);
    }

    // 언어 이름 가져오기
    getLanguageName(lang) {
        const names = {
            'en': 'English',
            'ko': '한국어',
            'zh': '中文',
            'hi': 'हिन्दी',
            'ru': 'Русский',
            'ja': '日本語',
            'es': 'Español',
            'pt': 'Português',
            'id': 'Bahasa Indonesia',
            'tr': 'Türkçe',
            'de': 'Deutsch',
            'fr': 'Français'
        };
        return names[lang] || lang;
    }
}

// 글로벌 i18n 안전 로더
window.safeI18n = new SafeI18n();

// 페이지 로드 후 자동 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.safeI18n.init();
    });
} else {
    window.safeI18n.init();
}
