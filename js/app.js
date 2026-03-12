// 꿈해몽 & 운세 앱

class DreamFortuneApp {
    constructor() {
        // 저장소 관리자 초기화
        this.storage = new StorageManager('dreamfortune');
        this.selectedZodiac = this.loadFromStorage('selectedZodiac', null);
        this.init();
    }

    init() {
        try {
            this.dreamDiary = this.loadFromStorage('dreamDiary', []);
            this.setupI18n();
            this.setupTabs();
            this.setupDreamTab();
            this.setupFortuneTab();
            this.setupTarotTab();
            this.renderDreamDiary();
            this.registerServiceWorker();
        } catch (e) {
            window.errorHandler?.handleError(e, 'App Initialization');
        }
    }

    // i18n initialization with enhanced error handling
    setupI18n() {
        (async () => {
            try {
                // 기존 i18n 사용 또는 폴백
                if (window.i18n && typeof window.i18n.loadTranslations === 'function') {
                    await window.i18n.loadTranslations(window.i18n.getCurrentLanguage());
                    window.i18n.updateUI();
                } else if (window.safeI18n) {
                    await window.safeI18n.init();
                }
            } catch (e) {
                console.warn('i18n load failed:', e.message);
                if (window.safeI18n) window.safeI18n.enableFallback();
            }

            try {
                const langToggle = document.getElementById('lang-toggle');
                const langMenu = document.getElementById('lang-menu');
                const langOptions = document.querySelectorAll('.lang-option');

                const currentLang = window.i18n?.getCurrentLanguage?.() || 'en';
                const langOptionActive = document.querySelector(`[data-lang="${currentLang}"]`);
                if (langOptionActive) langOptionActive.classList.add('active');

                if (langToggle && langMenu) {
                    langToggle.addEventListener('click', () => langMenu.classList.toggle('hidden'));
                }

                document.addEventListener('click', (e) => {
                    if (langMenu && !e.target.closest?.('.language-selector')) langMenu.classList.add('hidden');
                });

                langOptions.forEach(opt => {
                    opt.addEventListener('click', async () => {
                        const lang = opt.getAttribute('data-lang');
                        if (lang) {
                            try {
                                if (window.i18n?.setLanguage) {
                                    await window.i18n.setLanguage(lang);
                                } else if (window.safeI18n?.setLanguage) {
                                    await window.safeI18n.setLanguage(lang);
                                }
                            } catch (e) {
                                window.errorHandler?.handleError(e, 'Language Change');
                            }
                            langOptions.forEach(o => o.classList.remove('active'));
                            opt.classList.add('active');
                            if (langMenu) langMenu.classList.add('hidden');

                            // GA4: 언어 변경 추적
                            if (typeof gtag === 'function') {
                                gtag('event', 'language_change', {
                                    language: lang,
                                    app_name: 'dream-fortune'
                                });
                            }
                        }
                    });
                });
            } catch (e) {
                console.warn('Language UI setup failed:', e.message);
            }

            // Initialize Theme Toggle
            this.initTheme();
        })();
    }

    // Theme Toggle Function
    initTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const html = document.documentElement;

        // Load theme preference from localStorage
        const savedTheme = this.loadFromStorage('app-theme', 'dark');
        html.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme);

        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = html.getAttribute('data-theme') || 'dark';
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                html.setAttribute('data-theme', newTheme);
                this.saveToStorage('app-theme', newTheme);
                this.updateThemeButton(newTheme);

                // GA4: 테마 변경 추적
                if (typeof gtag === 'function') {
                    gtag('event', 'theme_change', {
                        theme: newTheme,
                        app_name: 'dream-fortune'
                    });
                }
            });
        }
    }

    updateThemeButton(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
            themeToggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        }
    }

    // LocalStorage 관리 - StorageManager 사용
    loadFromStorage(key, defaultValue) {
        try {
            const value = this.storage.getItem(key);
            return value !== null && value !== undefined ? value : defaultValue;
        } catch (e) {
            console.warn(`Failed to load ${key} from storage:`, e.message);
            return defaultValue;
        }
    }

    saveToStorage(key, value) {
        try {
            this.storage.setItem(key, value);
        } catch (e) {
            console.warn(`Failed to save ${key} to storage:`, e.message);
            // Storage 실패해도 메모리에는 저장되어 있음
        }
    }

    // 탭 전환
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;

                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }

    // 꿈해몽 탭
    setupDreamTab() {
        const input = document.getElementById('dream-input');
        const btn = document.getElementById('interpret-btn');
        const resultCard = document.getElementById('dream-result');

        btn.addEventListener('click', () => {
            const keyword = input.value.trim();
            if (!keyword) {
                input.focus();
                input.style.borderColor = '#e74c3c';
                setTimeout(() => input.style.borderColor = '', 1000);
                return;
            }
            // GA4: 테스트 시작
            if (typeof gtag === 'function') {
                gtag('event', 'test_start', {
                    app_name: 'dream-fortune',
                    content_type: 'dream_interpretation'
                });
            }
            this.interpretDream(keyword);
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btn.click();
        });

        document.getElementById('share-dream').addEventListener('click', () => {
            this.shareDream();
        });
        
        document.getElementById('ai-deep-dream').addEventListener('click', () => {
            this.showAIDreamInterpretation();
        });
        
        document.getElementById('share-ai-dream').addEventListener('click', () => {
            this.shareAIDream();
        });
    }
    
    // AI 심층 해석 (광고 후 프리미엄 콘텐츠)
    showAIDreamInterpretation() {
        const keyword = document.getElementById('dream-input').value.trim();
        if (!keyword) return;

        // 광고 표시 (AdSense 연동 전 시뮬레이션)
        this.showInterstitialAd(() => {
            // 광고 완료 후 AI 해석 표시
            this.generatePremiumAnalysis(keyword);
        });
    }
    
    // 전면 광고 표시
    showInterstitialAd(callback) {
        const adModal = document.getElementById('interstitial-ad');
        const closeBtn = document.getElementById('close-ad');
        const countdown = document.getElementById('countdown');
        
        adModal.classList.remove('hidden');
        closeBtn.disabled = true;
        
        let seconds = 5;
        countdown.textContent = seconds;
        
        const timer = setInterval(() => {
            seconds--;
            countdown.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(timer);
                closeBtn.disabled = false;
                closeBtn.textContent = window.i18n?.t('ads.close') || 'Close';

                closeBtn.onclick = () => {
                    adModal.classList.add('hidden');
                    closeBtn.textContent = (window.i18n?.t('ads.close') || 'Close') + ' (5)';
                    if (callback) callback();
                };
            }
        }, 1000);
    }
    
    // 프리미엄 분석 생성 (강화된 UI)
    generatePremiumAnalysis(keyword) {
        const today = new Date();
        const seed = this.hashCode(today.toDateString() + keyword);

        // 키워드 찾기
        const foundKeywords = [];
        for (const key in dreamData) {
            if (key === 'default') continue;
            if (keyword.includes(key)) {
                foundKeywords.push(key);
            }
        }

        if (foundKeywords.length === 0) {
            const words = keyword.split(/[\s,.:;!?]+/).filter(w => w.length > 1);
            for (const word of words) {
                for (const key in dreamData) {
                    if (key === 'default') continue;
                    if (key.includes(word) || word.includes(key)) {
                        if (!foundKeywords.includes(key)) foundKeywords.push(key);
                    }
                }
            }
        }

        // 제목
        const aiTitle = window.i18n?.t('dynamic.aiTitle')?.replace('{keyword}', keyword) || `"${keyword}" AI Deep Interpretation`;
        document.getElementById('ai-dream-title').textContent = aiTitle;

        // 심리학적 의미
        const psychoMeaning = foundKeywords.length > 0
            ? this.generatePsychoAnalysis(foundKeywords)
            : (window.i18n?.t('dynamic.fallbackMessage') || 'This dream carries a personal message from your unconscious. The emotion you felt in the dream is key. Think about how that emotion connects to your current life.');
        document.getElementById('ai-psychology-meaning').textContent = psychoMeaning;

        // 행운 지수 계산
        let luckIndex = 60;
        if (foundKeywords.length > 0) {
            const avgLuck = foundKeywords.reduce((sum, k) => sum + (dreamData[k]?.luck || 60), 0) / foundKeywords.length;
            luckIndex = Math.min(100, Math.max(20, avgLuck + this.seededRandom(seed, -10, 15)));
        }

        // 행운 바 업데이트
        document.getElementById('luck-fill').style.width = luckIndex + '%';
        document.getElementById('luck-percentage').textContent = luckIndex + '%';

        // 추천 행동 3가지
        const actions = this.generateRecommendedActions(foundKeywords, luckIndex, seed);
        document.getElementById('action-1').textContent = actions[0];
        document.getElementById('action-2').textContent = actions[1];
        document.getElementById('action-3').textContent = actions[2];

        // 행운 아이템
        const luckyNumbers = this.getTodayLuckyNumbers(foundKeywords.length > 0 ? dreamData[foundKeywords[0]]?.luckyNumber : 7, seed);
        const luckyColor = this.getTodayLuckyColorName(foundKeywords.length > 0 ? dreamData[foundKeywords[0]]?.luckyColor : (window.i18n?.t('dynamic.colors.0') || 'Gold'), seed);
        const luckyDirection = this.getTodayLuckyDirection(seed);

        document.getElementById('lucky-numbers').textContent = luckyNumbers.join(', ');
        document.getElementById('lucky-color-name').textContent = luckyColor;
        document.getElementById('lucky-direction').textContent = luckyDirection;

        // 결과 표시
        const aiResult = document.getElementById('ai-dream-result');
        aiResult.classList.remove('hidden');
        aiResult.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 애니메이션
        aiResult.style.animation = 'none';
        setTimeout(() => aiResult.style.animation = 'slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)', 10);
    }

    // 추천 행동 생성
    generateRecommendedActions(keywords, luck, seed) {
        const actions = [];

        const templates = [
            window.i18n?.t('dynamic.recommendedActions.high') || [
                "The work you start now will bring good results. Move forward with confidence.",
                "Value communication with those around you. Important conversations can create great opportunities.",
                "This is a good time for new attempts. Start what you've been putting off."
            ],
            window.i18n?.t('dynamic.recommendedActions.medium') || [
                "Balance caution with passion. No need to rush.",
                "Trust your intuition, but move through small decisions slowly.",
                "Observe your current situation objectively and prepare for the next step."
            ],
            window.i18n?.t('dynamic.recommendedActions.low') || [
                "Listen to your inner voice. This is a time for reflection.",
                "Self-care is most important. Meditation or adequate sleep will help.",
                "This period is for preparation. Build a strong foundation."
            ]
        ];

        let templateSet;
        if (luck >= 75) {
            templateSet = templates[0];
        } else if (luck >= 50) {
            templateSet = templates[1];
        } else {
            templateSet = templates[2];
        }

        // 랜덤하게 3개 선택 (다만 모두 다른 것)
        const shuffled = templateSet.sort(() => 0.5 - Math.sin(seed++));
        return shuffled.slice(0, 3);
    }

    // 행운의 색상 이름 반환
    getTodayLuckyColorName(baseColor, seed) {
        const colors = window.i18n?.t('dynamic.colors') || ["Gold", "Silver", "Sky Blue", "Light Green", "Coral", "Lavender", "Mint"];
        if (baseColor) {
            return baseColor + ' & ' + colors[Math.abs(seed) % colors.length];
        }
        return colors[Math.abs(seed) % colors.length];
    }

    // 행운의 방향 반환
    getTodayLuckyDirection(seed) {
        const directions = window.i18n?.t('dynamic.directions') || ["East", "West", "South", "North", "Northeast", "Southeast"];
        return directions[Math.abs(seed) % directions.length];
    }
    
    generatePsychoAnalysis(keywords) {
        const i18nAnalyses = window.i18n?.t('dynamic.psychoAnalyses') || {};
        const defaultAnalyses = {
            "뱀": "In Freudian psychology, snakes symbolize repressed desires and instincts. Your unconscious is trying to express desires or emotions you're currently suppressing. In Jungian psychology, it also represents transformation and healing.",
            "용": "Dragons symbolize self-realization and the complete manifestation of potential. Great possibilities are awakening within you. Think carefully about how to use this energy.",
            "물": "Water represents the flow of emotions. The state of water in your dream reflects your current emotional state. Don't suppress emotions; let them flow naturally.",
            "비행": "Flying dreams show a strong desire to escape current constraints. You have a longing for freedom. Think about what's holding you back.",
            "추락": "Falling is fear of loss of control. You may feel unstable in some area of your life. Focus on building a solid foundation.",
            "죽음": "Death dreams mean a part of your self is changing. Old habits, relationships, or self-image are ending, and a new you is being born.",
            "default": "This dream reflects your current psychological state and unconscious desires. The emotion you felt in the dream is key."
        };
        const analyses = Object.keys(i18nAnalyses).length > 0 ? i18nAnalyses : defaultAnalyses;

        let result = '';
        for (const keyword of keywords) {
            if (analyses[keyword]) {
                result += analyses[keyword] + '\n\n';
            }
        }

        return result || analyses['default'];
    }
    
    generateActionAdvice(keywords) {
        const avgLuck = keywords.reduce((sum, k) => sum + (dreamData[k]?.luck || 60), 0) / keywords.length;

        if (avgLuck >= 80) {
            const advice = window.i18n?.t('dynamic.actionAdvice.high') || "• Now is the time for action. Start what you've been putting off.\n• Actively embrace new opportunities.\n• Move toward your goals with confidence.";
            return advice;
        } else if (avgLuck >= 60) {
            const advice = window.i18n?.t('dynamic.actionAdvice.medium') || "• A balanced approach is needed. Don't rush.\n• Seek advice from others, but make the final decision yourself.\n• Accumulate small successes.";
            return advice;
        } else {
            const advice = window.i18n?.t('dynamic.actionAdvice.low') || "• Now is the time for preparation. Build your foundation.\n• Take time to look inward. Meditation or journaling helps.\n• Don't be impatient; wait for the right moment.";
            return advice;
        }
    }
    
    getWeeklyAdvice(keywords) {
        const advices = window.i18n?.t('dynamic.advices.weekly') || [
            "Important meetings or opportunities may come. Stay open-minded.",
            "Don't scatter your energy; focus on what matters most.",
            "Good things may happen in your relationships with others.",
            "This is a time to gain new information and insight. Stay open to learning."
        ];
        return advices[Math.floor(Math.random() * advices.length)];
    }
    
    getMonthlyAdvice(keywords) {
        const advices = window.i18n?.t('dynamic.advices.monthly') || [
            "Steady effort toward long-term goals will bear fruit.",
            "Change is coming. Prepare to respond flexibly.",
            "Both relationships and finances are entering a stable period.",
            "Investment in self-development will bring great rewards later."
        ];
        return advices[Math.floor(Math.random() * advices.length)];
    }
    
    shareAIDream() {
        const title = document.getElementById('ai-dream-title').textContent;
        const psychology = document.getElementById('ai-psychology-meaning').textContent.substring(0, 80);
        const luckIndex = document.getElementById('luck-percentage').textContent;
        const luckyNumber = document.getElementById('lucky-numbers').textContent;
        const luckyColor = document.getElementById('lucky-color-name').textContent;

        const shareTemplate = window.i18n?.t('dynamic.shareTexts.aiDream') || `✨ {title}\n\n🌟 Luck Index: {luck}\n🔢 Lucky Numbers: {number}\n🎨 Lucky Color: {color}\n\n🧠 {meaning}...\n\nGet AI deep analysis in the Dream & Fortune app! 🔮`;
        const text = shareTemplate
            .replace('{title}', title)
            .replace('{luck}', luckIndex)
            .replace('{number}', luckyNumber)
            .replace('{color}', luckyColor)
            .replace('{meaning}', psychology);
        const url = 'https://dopabrain.com/dream-fortune/';

        if (navigator.share) {
            navigator.share({
                title: window.i18n?.t('dynamic.shareTexts.aiDreamTitle') || 'My Dream Interpretation Result ✨',
                text: text,
                url: url
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text + '\n\n' + url).then(() => {
                alert(window.i18n?.t('dynamic.shareTexts.aiDreamClipboard') || 'Result copied to clipboard! Share with your friends ✨');
            }).catch(() => {});
        }
    }

    interpretDream(input) {
        // 오늘 날짜 기반 시드 생성 (매일 다른 해석)
        const today = new Date();
        const daySeed = this.hashCode(today.toDateString() + input);
        
        // 문장에서 여러 키워드 추출
        const foundKeywords = [];
        const results = [];

        // 모든 키워드와 매칭 시도
        for (const key in dreamData) {
            if (key === 'default') continue;
            if (input.includes(key)) {
                foundKeywords.push(key);
                results.push({ keyword: key, ...dreamData[key] });
            }
        }

        // 키워드를 찾지 못한 경우
        if (foundKeywords.length === 0) {
            // 단어 단위로 분리해서 부분 매칭 시도
            const words = input.split(/[\s,.:;!?]+/).filter(w => w.length > 1);
            for (const word of words) {
                for (const key in dreamData) {
                    if (key === 'default') continue;
                    if (key.includes(word) || word.includes(key)) {
                        if (!foundKeywords.includes(key)) {
                            foundKeywords.push(key);
                            results.push({ keyword: key, ...dreamData[key] });
                        }
                    }
                }
            }
        }

        // 여전히 없으면 기본 해석
        if (foundKeywords.length === 0) {
            this.showSingleResult(input, dreamData['default'], daySeed);
            return;
        }

        // 여러 키워드면 종합 해석
        if (results.length > 1) {
            this.showMultipleResults(results, daySeed, input);
        } else {
            this.showSingleResult(foundKeywords[0], results[0], daySeed);
        }
    }

    showSingleResult(keyword, result, seed) {
        const keywordLabel = `"${keyword}" ${window.i18n?.t('dream.interpret')?.replace(/하기.*|Interpret\s*/i, '') || 'Dream Interpretation'}`;
        document.getElementById('dream-keyword').textContent = keywordLabel;

        // GA4: 테스트 완료
        if (typeof gtag === 'function') {
            gtag('event', 'test_complete', {
                app_name: 'dream-fortune',
                result_type: keyword,
                luck_index: result.luck || 50
            });
        }

        // 동적 해석 생성
        let fullMeaning = '';

        if (result.category) {
            const categoryLabel = window.i18n?.t('dynamic.resultLabels.category') || '📂 Category';
            fullMeaning += `${categoryLabel}: ${result.category}\n\n`;
        }

        // 핵심 의미 + 오늘의 특별 메시지
        if (result.mainMeaning) {
            const meaningLabel = window.i18n?.t('dynamic.resultLabels.meaning') || '🔮 Core Meaning';
            const todayMessageLabel = window.i18n?.t('dynamic.resultLabels.todayMessage') || "✨ Today's Message";
            fullMeaning += `${meaningLabel}: ${result.mainMeaning}\n`;
            fullMeaning += `${todayMessageLabel}: ${this.getTodayMessage(keyword, seed)}\n\n`;
        }

        // 상세 해석 (변형 추가)
        const detailedLabel = window.i18n?.t('dynamic.resultLabels.detailedExplanation') || '📖 Detailed Explanation';
        fullMeaning += `${detailedLabel}\n${result.detailed || result.meaning}\n`;
        fullMeaning += `${this.getAdditionalInterpretation(keyword, seed)}\n\n`;

        // 상황별 해석 (랜덤하게 2-3개 선택)
        if (result.situations) {
            const situations = Object.entries(result.situations);
            const selectedSituations = this.selectRandom(situations, seed, 2, 3);

            fullMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
            const situationLabel = window.i18n?.t('dynamic.resultLabels.situationInterpretation') || "🎭 Today's Situation Interpretation";
            fullMeaning += `${situationLabel}\n`;
            selectedSituations.forEach(([situation, meaning]) => {
                fullMeaning += `• ${situation}: ${meaning}\n`;
            });
            fullMeaning += `\n`;
        }

        // 오늘의 분야별 운세 (변형 추가)
        fullMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const fieldFortuneLabel = window.i18n?.t('dynamic.resultLabels.fieldFortune') || "📊 Today's Field Fortunes";
        const loveLabel = window.i18n?.t('dynamic.resultLabels.love') || '💕 Love';
        const moneyLabel = window.i18n?.t('dynamic.resultLabels.money') || '💰 Money';
        const healthLabel = window.i18n?.t('dynamic.resultLabels.health') || '💪 Health';
        const workLabel = window.i18n?.t('dynamic.resultLabels.work') || '💼 Work';
        fullMeaning += `${fieldFortuneLabel}\n`;
        fullMeaning += `${loveLabel}: ${this.enhanceAdvice(result.love, 'love', seed)}\n`;
        fullMeaning += `${moneyLabel}: ${this.enhanceAdvice(result.money, 'money', seed)}\n`;
        fullMeaning += `${healthLabel}: ${this.enhanceAdvice(result.health, 'health', seed)}\n`;
        fullMeaning += `${workLabel}: ${this.enhanceAdvice(result.work, 'work', seed)}\n`;
        fullMeaning += `\n`;

        // 시간대별 조언
        fullMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const timeBasedLabel = window.i18n?.t('dynamic.resultLabels.timeBasedGuidance') || '⏰ Time-Based Guidance';
        fullMeaning += `${timeBasedLabel}\n`;
        fullMeaning += this.getTimeBasedAdvice(seed) + '\n\n';

        // lucky items (dynamic)
        fullMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const luckyItemsLabel = window.i18n?.t('dynamic.resultLabels.luckyItems') || "🍀 Today's Luck";
        const luckyColorLabel = window.i18n?.t('dynamic.resultLabels.luckyColor') || '🎨 Lucky Color';
        const luckyNumberLabel = window.i18n?.t('dynamic.resultLabels.luckyNumber') || '🔢 Lucky Numbers';
        const luckyDirectionLabel = window.i18n?.t('dynamic.resultLabels.luckyDirection') || '🧭 Lucky Direction';
        const luckyTimeLabel = window.i18n?.t('dynamic.resultLabels.luckyTime') || '🌟 Lucky Time';
        fullMeaning += `${luckyItemsLabel}\n`;
        const todayColor = this.getTodayLuckyColor(result.luckyColor, seed);
        fullMeaning += `${luckyColorLabel}: ${todayColor}\n`;
        const todayNumbers = this.getTodayLuckyNumbers(result.luckyNumber, seed);
        fullMeaning += `${luckyNumberLabel}: ${todayNumbers.join(', ')}\n`;
        if (result.luckyDirection) {
            fullMeaning += `${luckyDirectionLabel}: ${result.luckyDirection}\n`;
        }
        fullMeaning += `${luckyTimeLabel}: ${this.getLuckyTime(seed)}\n`;

        // 연관 꿈
        if (result.relatedDreams && result.relatedDreams.length > 0) {
            const relatedDreamsLabel = window.i18n?.t('dynamic.resultLabels.relatedDreams') || '🔗 Related Dream Keywords';
            fullMeaning += `\n${relatedDreamsLabel}: ${result.relatedDreams.join(', ')}`;
        }

        // 오늘의 행운 변동 (-5 ~ +10)
        const luckVariation = this.seededRandom(seed, -5, 10);
        const todayLuck = Math.min(100, Math.max(0, result.luck + luckVariation));

        document.getElementById('dream-meaning').textContent = fullMeaning;
        const luckIndexLabel = window.i18n?.t('dynamic.resultLabels.luckIndex') || "🍀 Today's Luck Index";
        document.getElementById('dream-luck').textContent = `${luckIndexLabel} ${todayLuck}%`;

        const resultCard = document.getElementById('dream-result');
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 결과 텍스트 표시 후 파티클 효과 추가
        this.animateResultDisplay(keyword, seed);

        // 꿈 일기에 자동 저장
        this.saveToDiary(keyword, todayLuck);
    }

    // 오늘의 특별 메시지 생성
    getTodayMessage(keyword, seed) {
        const messages = window.i18n?.t('dynamic.todayMessages') || [
            `If you dreamed of ${keyword} today, your unconscious is sending a special message.`,
            `The energy of ${keyword} can influence your entire day.`,
            `${keyword} dream may be a hint for an important decision today.`,
            `Dreaming of ${keyword} at this time is a sign of change.`,
            `${keyword} is awakening in your subconscious.`,
            `Today, the energy of ${keyword} is with you.`,
            `${keyword} dream reflects a deep wish from within.`
        ];
        return messages[Math.abs(seed) % messages.length].replace(/{keyword}/g, keyword);
    }

    // 추가 해석 문구 생성
    getAdditionalInterpretation(keyword, seed) {
        const additions = window.i18n?.t('dynamic.additionalInterpretations') || [
            "If you dreamed this today, something related may happen soon.",
            "This dream is closely connected to your current emotional state. Examine your feelings.",
            "Your unconscious often shows you what you consciously miss. Look around again.",
            "If this symbol appears repeatedly, there may be deeper meaning.",
            "The emotion in the dream is key. If positive, it's a good sign; if negative, caution is needed.",
            "Throughout history, this dream has been interpreted as signaling an important turning point.",
            "The answer to a problem you're currently facing may be hidden in this dream."
        ];
        return additions[Math.abs(seed + 7) % additions.length];
    }

    // 조언 강화
    enhanceAdvice(baseAdvice, category, seed) {
        const calmText = window.i18n?.t('dynamic.enhanceAdvices.calm') || 'Maintain a peaceful flow today.';
        if (!baseAdvice) return calmText;

        const enhancements = {
            love: window.i18n?.t('dynamic.enhanceAdvices.love') || [
                " Good energy especially around 3 PM.",
                " Sincere conversation deepens relationships.",
                " A small gift or message can have great effect.",
                " Listening to others is most important."
            ],
            money: window.i18n?.t('dynamic.enhanceAdvices.money') || [
                " Good news may come today.",
                " Avoid impulsive purchases.",
                " Unexpected income may arrive.",
                " Decide from a long-term perspective."
            ],
            health: window.i18n?.t('dynamic.enhanceAdvices.health') || [
                " Don't forget adequate water intake.",
                " Light stretching helps.",
                " Don't overdo things today.",
                " A positive mindset affects health."
            ],
            work: window.i18n?.t('dynamic.enhanceAdvices.work') || [
                " Handle important tasks in the morning.",
                " Collaboration boosts results.",
                " Boldly propose new ideas.",
                " Pay attention to details."
            ]
        };

        const categoryEnhancements = enhancements[category] || [];
        if (categoryEnhancements.length === 0) return baseAdvice;

        return baseAdvice + categoryEnhancements[Math.abs(seed + category.charCodeAt(0)) % categoryEnhancements.length];
    }

    // 시간대별 조언
    getTimeBasedAdvice(seed) {
        const morningAdvice = window.i18n?.t('dynamic.timeBasedAdvices.morning') || [
            "Morning: A good time for important decisions or new starts.",
            "Morning: Good for meditation or planning.",
            "Morning: Energy is high; tackle challenging tasks."
        ];
        const afternoonAdvice = window.i18n?.t('dynamic.timeBasedAdvices.afternoon') || [
            "Afternoon: Good things may happen in relationships.",
            "Afternoon: Handle tasks requiring focus.",
            "Afternoon: Rest and ideas will come."
        ];
        const eveningAdvice = window.i18n?.t('dynamic.timeBasedAdvices.evening') || [
            "Evening: Time with loved ones brings luck.",
            "Evening: Reflect on the day and gratitude.",
            "Evening: Writing a dream diary provides deeper insight."
        ];

        return `${morningAdvice[Math.abs(seed) % morningAdvice.length]}\n` +
               `${afternoonAdvice[Math.abs(seed + 1) % afternoonAdvice.length]}\n` +
               `${eveningAdvice[Math.abs(seed + 2) % eveningAdvice.length]}`;
    }

    // 오늘의 행운 색상
    getTodayLuckyColor(baseColor, seed) {
        const additionalColors = window.i18n?.t('dynamic.colors') || ["Gold", "Silver", "Sky Blue", "Light Green", "Coral", "Lavender", "Mint"];
        const extraColor = additionalColors[Math.abs(seed) % additionalColors.length];
        return baseColor ? `${baseColor}, ${extraColor}` : extraColor;
    }

    // 오늘의 행운 숫자
    getTodayLuckyNumbers(baseNumbers, seed) {
        const base = Array.isArray(baseNumbers) ? baseNumbers : [baseNumbers || 7];
        const extra = [(Math.abs(seed) % 45) + 1, (Math.abs(seed + 5) % 45) + 1];
        return [...new Set([...base, ...extra])].slice(0, 4);
    }

    // 행운의 시간
    getLuckyTime(seed) {
        const times = window.i18n?.t('dynamic.luckyTimes') || [
            "9-11 AM", "10 AM-12 PM", "1-3 PM",
            "2-4 PM", "3-5 PM", "6-8 PM",
            "7-9 PM", "9-11 PM"
        ];
        return times[Math.abs(seed) % times.length];
    }

    // 랜덤 선택 (min~max개)
    selectRandom(arr, seed, min, max) {
        const count = min + (Math.abs(seed) % (max - min + 1));
        const shuffled = [...arr].sort(() => 0.5 - Math.sin(seed++));
        return shuffled.slice(0, Math.min(count, arr.length));
    }

    showMultipleResults(results, seed, input) {
        // 평균 행운지수 + 변동
        const baseAvgLuck = Math.round(results.reduce((sum, r) => sum + r.luck, 0) / results.length);
        const luckBonus = this.seededRandom(seed, -5, 15); // 복합 꿈은 보너스 기회
        const avgLuck = Math.min(100, Math.max(0, baseAvgLuck + luckBonus));

        // 키워드 목록
        const keywords = results.map(r => r.keyword);

        // 종합 해석 생성 (동적)
        const discoveredSymbolsLabel = window.i18n?.t('dynamic.resultLabels.discoveredSymbols') || '🔮 Discovered Symbols';
        let combinedMeaning = `${discoveredSymbolsLabel}: ${keywords.join(', ')}\n`;
        combinedMeaning += `✨ ${this.getMultiKeywordMessage(keywords, seed)}\n\n`;

        // 각 키워드 해석 (변형 추가)
        const meaningLabel = window.i18n?.t('dynamic.resultLabels.meaning') || 'Core';
        const todayMeaningLabel = window.i18n?.t('dynamic.resultLabels.todayMessage')?.replace('✨ ', '').replace(':', '') || "Today's Meaning";
        results.forEach((r, i) => {
            combinedMeaning += `【${r.keyword}】\n`;
            combinedMeaning += `• ${meaningLabel}: ${r.mainMeaning || 'Message from the unconscious'}\n`;
            combinedMeaning += `• ${todayMeaningLabel}: ${this.getDynamicMeaning(r, seed + i)}\n\n`;
        });

        // 키워드 조합 특별 해석
        combinedMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const keywordCombinationLabel = window.i18n?.t('dynamic.resultLabels.keywordCombination') || '✨ Keyword Combination Interpretation';
        combinedMeaning += `${keywordCombinationLabel}\n`;
        combinedMeaning += this.generateDynamicCombinedInterpretation(results, seed, input) + '\n\n';

        // 종합 분야별 운세 (강화)
        combinedMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const combinedFieldFortuneLabel = window.i18n?.t('dynamic.resultLabels.combinedFieldFortune') || "📊 Today's Combined Fortunes";
        const loveLabel = window.i18n?.t('dynamic.resultLabels.love') || '💕 Love';
        const moneyLabel = window.i18n?.t('dynamic.resultLabels.money') || '💰 Money';
        const workLabel = window.i18n?.t('dynamic.resultLabels.work') || '💼 Work';
        const healthLabel = window.i18n?.t('dynamic.resultLabels.health') || '💪 Health';
        combinedMeaning += `${combinedFieldFortuneLabel}\n`;
        combinedMeaning += `${loveLabel}: ${this.generateCombinedFieldFortune(results, 'love', seed)}\n`;
        combinedMeaning += `${moneyLabel}: ${this.generateCombinedFieldFortune(results, 'money', seed)}\n`;
        combinedMeaning += `${workLabel}: ${this.generateCombinedFieldFortune(results, 'work', seed)}\n`;
        combinedMeaning += `${healthLabel}: ${this.generateCombinedFieldFortune(results, 'health', seed)}\n\n`;

        // 시간대별 조언
        combinedMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const timeBasedLabel = window.i18n?.t('dynamic.resultLabels.timeBasedGuidance') || '⏰ Time-Based Guidance';
        combinedMeaning += `${timeBasedLabel}\n`;
        combinedMeaning += this.getTimeBasedAdvice(seed) + '\n\n';
        
        // 종합 행운 아이템
        const allColors = results.map(r => r.luckyColor).filter(Boolean);
        const allNumbers = results.flatMap(r => r.luckyNumber || []);

        combinedMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const combinedLuckyItemsLabel = window.i18n?.t('dynamic.resultLabels.combinedLuckyItems') || "🍀 Today's Combined Luck";
        const luckyColorLabel = window.i18n?.t('dynamic.resultLabels.luckyColor') || '🎨 Lucky Color';
        const luckyNumberLabel = window.i18n?.t('dynamic.resultLabels.luckyNumber') || '🔢 Lucky Numbers';
        const luckyTimeLabel = window.i18n?.t('dynamic.resultLabels.luckyTime') || '🌟 Lucky Time';
        const todayQuoteLabel = window.i18n?.t('dynamic.resultLabels.todayQuote') || "💫 Today's Quote";
        combinedMeaning += `${combinedLuckyItemsLabel}\n`;
        combinedMeaning += `${luckyColorLabel}: ${[...new Set(allColors)].join(', ') || 'Gold'}\n`;
        combinedMeaning += `${luckyNumberLabel}: ${[...new Set([...allNumbers, (Math.abs(seed) % 45) + 1])].slice(0, 5).join(', ')}\n`;
        combinedMeaning += `${luckyTimeLabel}: ${this.getLuckyTime(seed)}\n`;
        combinedMeaning += `\n${todayQuoteLabel}: "${this.getTodayQuote(seed)}"`;

        const combinedInterpretationLabel = window.i18n?.t('dynamic.resultLabels.combinedInterpretation') || 'Combined Dream Interpretation';
        document.getElementById('dream-keyword').textContent = `${combinedInterpretationLabel} (${results.length} ${window.i18n?.t('dynamic.resultLabels.discoveredSymbols')?.match(/상징|Symbol|symbols/i) ? window.i18n?.t('dynamic.resultLabels.discoveredSymbols')?.replace(/[🔮\s]/g, '').trim() : 'symbols'})`;
        document.getElementById('dream-meaning').textContent = combinedMeaning;
        const combinedLuckIndexLabel = window.i18n?.t('dynamic.resultLabels.combinedLuckIndex') || "🍀 Today's Combined Luck Index";
        document.getElementById('dream-luck').textContent = `${combinedLuckIndexLabel} ${avgLuck}%`;

        const resultCard = document.getElementById('dream-result');
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // save to dream diary
        this.saveToDiary(keywords.join(', '), avgLuck);
    }
    
    // 복합 키워드 특별 메시지
    getMultiKeywordMessage(keywords, seed) {
        const messages = window.i18n?.t('dynamic.multiKeywordMessages') || [
            `Multiple symbols appearing together convey complex messages. Each meaning complements the others, providing deeper insight.`,
            `${keywords.length} symbols harmonize together. This shows that multiple areas of your life are connected.`,
            `An interesting combination! Your unconscious is sending messages on multiple levels.`,
            `The meeting of these symbols is no accident. Your inner self is telling an important story.`
        ];
        return messages[Math.abs(seed) % messages.length].replace(/{count}/g, keywords.length);
    }
    
    // 동적 의미 생성
    getDynamicMeaning(result, seed) {
        const base = result.detailed || result.meaning || '';
        const shortBase = base.substring(0, 60);

        const additions = window.i18n?.t('dynamic.dynamicMeanings') || [
            `${shortBase}... This energy is especially strong today.`,
            `${shortBase}... Something related may happen soon.`,
            `${shortBase}... Closely connected to your current situation.`,
            `${shortBase}... Pay attention to this message.`
        ];
        return additions[Math.abs(seed) % additions.length].replace(/{meaning}/g, shortBase);
    }
    
    // 동적 종합 해석 생성
    generateDynamicCombinedInterpretation(results, seed, input) {
        const avgLuck = Math.round(results.reduce((sum, r) => sum + r.luck, 0) / results.length);
        const keywords = results.map(r => r.keyword);
        const categories = [...new Set(results.map(r => r.category).filter(Boolean))];
        
        let interpretation = '';
        
        // 카테고리 조합 해석
        if (categories.length > 1) {
            const i18nCategoryMeanings = window.i18n?.t('dynamic.categoryMeanings') || {};
            const categoryMeanings = {
                "동물-자연": i18nCategoryMeanings.animalNature || "Instinct and environment are in harmony. Follow nature's flow.",
                "동물-행동": i18nCategoryMeanings.animalAction || "It's time to act. Trust your instinct and move.",
                "자연-행동": i18nCategoryMeanings.natureAction || "Natural action brings good results.",
                "동물-물건": i18nCategoryMeanings.animalThing || "Material change is coming. Connected to wealth luck.",
                "default": (i18nCategoryMeanings.default || `The meeting of symbols related to ${categories.join(' and ')} shows that different areas of your life are connected.`).replace(/{categories}/g, categories.join(' and '))
            };
            const catKey = categories.slice(0, 2).sort().join('-');
            interpretation += (categoryMeanings[catKey] || categoryMeanings['default']) + '\n\n';
        }
        
        // 키워드 수에 따른 해석
        if (keywords.length === 2) {
            interpretation += this.getTwoKeywordInterpretation(keywords, avgLuck, seed);
        } else if (keywords.length >= 3) {
            interpretation += this.getMultiKeywordInterpretation(keywords, avgLuck, seed);
        }
        
        // 오늘 날짜 기반 특별 메시지
        const today = new Date();
        const dayOfWeek = today.getDay();
        const dayMessages = window.i18n?.t('dynamic.dayMessages') || [
            "This Sunday dream shows the direction of your week.",
            "This Monday dream suggests a new beginning.",
            "This Tuesday dream demands passion and action.",
            "This Wednesday dream speaks of communication and connection.",
            "This Thursday dream shows opportunities for expansion and growth.",
            "This Friday dream is a message about relationships and harmony.",
            "This Saturday dream recommends rest and reflection."
        ];
        interpretation += '\n\n🗓️ ' + dayMessages[dayOfWeek];
        
        return interpretation;
    }
    
    // 2개 키워드 조합 해석
    getTwoKeywordInterpretation(keywords, luck, seed) {
        const [k1, k2] = keywords;

        const templateTexts = window.i18n?.t('dynamic.twoKeywordInterpretations') || [
            `The meeting of ${k1} and ${k2} is a ${luck >= 70 ? 'very auspicious' : luck >= 50 ? 'meaningful' : 'cautionary'} combination. The energy of ${k1} takes concrete form through ${k2}.`,
            `The inner desire ${k1} represents meets the external situation ${k2} symbolizes. ${luck >= 60 ? 'Harmonious progress is expected.' : 'Balance must be found.'}`,
            `Two symbols complement each other. The flow from ${k1} continues through ${k2}, ${luck >= 70 ? 'heralding positive results.' : 'requiring careful approach.'}`,
            `The appearance of ${k1} and ${k2} together is a rare combination. ${luck >= 65 ? 'A special opportunity may come.' : 'Prepare for change.'}`
        ];

        const quality = luck >= 70 ? 'very auspicious' : luck >= 50 ? 'meaningful' : 'cautionary';
        const balance = luck >= 60 ? 'Harmonious progress is expected.' : 'Balance must be found.';
        const result = luck >= 70 ? 'heralding positive results.' : 'requiring careful approach.';
        const opportunity = luck >= 65 ? 'A special opportunity may come.' : 'Prepare for change.';

        return templateTexts[Math.abs(seed) % templateTexts.length]
            .replace(/{k1}/g, k1)
            .replace(/{k2}/g, k2)
            .replace(/{quality}/g, quality)
            .replace(/{balance}/g, balance)
            .replace(/{result}/g, result)
            .replace(/{opportunity}/g, opportunity);
    }
    
    // 다중 키워드 조합 해석
    getMultiKeywordInterpretation(keywords, luck, seed) {
        const templates = window.i18n?.t('dynamic.multiKeywordInterpretations') || [
            `${keywords.length} symbols appear complexly. Multiple aspects of your life are changing simultaneously. ${luck >= 70 ? 'Overall positive flow.' : 'Approach one at a time calmly.'}`,
            `A rich display of symbols! ${keywords.slice(0, 2).join(', ')} and others combine to predict ${luck >= 65 ? 'diverse opportunities' : 'complex situations'}. Trust your intuition.`,
            `Your unconscious is sending rich messages. Understand each symbol individually, but don't miss the big picture. ${luck >= 60 ? 'An integrative perspective is key.' : 'Set your priorities.'}`
        ];

        const overall = luck >= 70 ? 'Overall positive flow.' : 'Approach one at a time calmly.';
        const expectation = luck >= 65 ? 'diverse opportunities' : 'complex situations';
        const key = luck >= 60 ? 'An integrative perspective is key.' : 'Set your priorities.';

        return templates[Math.abs(seed) % templates.length]
            .replace(/{count}/g, keywords.length)
            .replace(/{symbols}/g, keywords.slice(0, 2).join(', '))
            .replace(/{overall}/g, overall)
            .replace(/{expectation}/g, expectation)
            .replace(/{key}/g, key);
    }
    
    // 분야별 종합 운세 생성
    generateCombinedFieldFortune(results, field, seed) {
        const advices = results.map(r => r[field]).filter(Boolean);
        if (advices.length === 0) {
            const i18nDefaults = window.i18n?.t('dynamic.fortuneDefaults') || {};
            const defaults = {
                love: i18nDefaults.love || "New meetings or relationship development are expected.",
                money: i18nDefaults.money || "Wealth luck is flowing steadily.",
                work: i18nDefaults.work || "Smooth progress is expected.",
                health: i18nDefaults.health || "Overall healthy flow."
            };
            return defaults[field] + this.getFieldBonus(field, seed);
        }

        // 첫 번째 조언 + 조합 보너스
        const base = advices[0];
        if (advices.length > 1) {
            const combLabel = window.i18n?.t('dynamic.fortuneLabels.symbolCombination') || 'Combined symbols bring';
            return `${base} ${combLabel} ${this.getFieldCombinationBonus(field, seed)}`;
        }
        return base + this.getFieldBonus(field, seed);
    }
    
    getFieldBonus(field, seed) {
        const i18nBonuses = window.i18n?.t('dynamic.fieldBonuses') || {};
        const bonuses = {
            love: i18nBonuses.love || [" Especially good in the evening.", " Sincere expression is effective.", ""],
            money: i18nBonuses.money || [" Good news may come this afternoon.", " Trust your intuition.", ""],
            work: i18nBonuses.work || [" Collaboration boosts results.", " Handle important tasks in the morning.", ""],
            health: i18nBonuses.health || [" A light walk helps.", " Get adequate rest.", ""]
        };
        return (bonuses[field] || [""])[Math.abs(seed) % 3];
    }
    
    getFieldCombinationBonus(field, seed) {
        const i18nBonuses = window.i18n?.t('dynamic.fieldCombinationBonuses') || {};
        const bonuses = {
            love: i18nBonuses.love || "Deeper connection is possible.",
            money: i18nBonuses.money || "Better results than expected.",
            work: i18nBonuses.work || "Synergy is activated.",
            health: i18nBonuses.health || "Overall balance is restored."
        };
        return bonuses[field] || i18nBonuses.default || "Positive change is expected.";
    }
    
    // 오늘의 명언
    getTodayQuote(seed) {
        const quotes = window.i18n?.t('dynamic.quotes') || [
            "Dreams are the royal road to the unconscious. - Freud",
            "All dreams come true if you have the courage to pursue them.",
            "Night dreams become daytime wisdom.",
            "Your unconscious is always helping you.",
            "For those who believe in dreams, the path opens.",
            "Today's dream becomes tomorrow's reality.",
            "The universe speaks to you through dreams.",
            "Follow intuition; it is your true compass."
        ];
        return quotes[Math.abs(seed) % quotes.length];
    }
    
    combineCategoryAdvice(results, category) {
        const advices = results.map(r => r[category]).filter(Boolean);
        if (advices.length === 0) return 'Multiple energies are at work.';
        if (advices.length === 1) return advices[0];
        return advices[0] + ' Also, ' + advices.slice(1).join(' ').toLowerCase();
    }

    generateCombinedInterpretation(results) {
        const avgLuck = Math.round(results.reduce((sum, r) => sum + r.luck, 0) / results.length);
        const keywords = results.map(r => r.keyword);
        const categories = [...new Set(results.map(r => r.category).filter(Boolean))];
        
        let interpretation = '';
        
        // category-based interpretation
        const i18nCombined = window.i18n?.t('dynamic.combinedInterpretations') || {};
        if (categories.length > 1) {
            interpretation += `Symbols related to ${categories.join(' and ')} appeared together. `;
        }

        // luck-based combined message
        if (avgLuck >= 85) {
            interpretation += i18nCombined.veryLucky?.replace(/{keywords}/g, keywords.join(' and ')) || `The dream where ${keywords.join(' and ')} appear together is very auspicious! Multiple positive energies combine to herald great luck. Important decisions or new starts made now will yield good results. Seize opportunities actively!`;
        } else if (avgLuck >= 70) {
            interpretation += i18nCombined.lucky?.replace(/{keywords}/g, keywords.join(' and ')) || `The combination of ${keywords.join(' and ')} suggests positive change. Each symbol complements the others, and your unconscious shows new possibilities. Open your mind to change and follow your intuition.`;
        } else if (avgLuck >= 55) {
            interpretation += i18nCombined.mixed?.replace(/{keywords}/g, keywords.join(' and ')) || `The appearance of ${keywords.join(' and ')} together is a complex message about the current situation. Positive and cautious aspects coexist. View the situation with balanced perspective. Careful consideration is better than hasty judgment.`;
        } else {
            interpretation += i18nCombined.challenging?.replace(/{keywords}/g, keywords.join(' and ')) || `The combination of ${keywords.join(' and ')} indicates inner conflict or tasks to resolve. But dreams help us recognize problems, so use this as an opportunity for growth. Take time to care for yourself.`;
        }
        
        return interpretation;
    }

    shareDream() {
        const keyword = document.getElementById('dream-keyword').textContent;
        const meaning = document.getElementById('dream-meaning').textContent;
        const url = 'https://dopabrain.com/dream-fortune/';
        const shareTemplate = window.i18n?.t('dynamic.shareTexts.dreamShare') || `🌙 My Dream Interpretation Result\n\n{keyword}\n{meaning}\n\nInterpret your dream too! 👇\n{url}`;
        const text = shareTemplate
            .replace('{keyword}', keyword)
            .replace('{meaning}', meaning)
            .replace('{url}', url);

        // GA4: 결과 공유
        if (typeof gtag === 'function') {
            gtag('event', 'share', {
                method: navigator.share ? 'native' : 'clipboard',
                content_type: 'test_result',
                app_name: 'dream-fortune'
            });
        }

        if (navigator.share) {
            navigator.share({ title: window.i18n?.t('dynamic.shareTexts.dreamShareTitle') || 'My Dream Interpretation Result 🔮', text, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text).then(() => {
                alert(window.i18n?.t('dynamic.shareTexts.dreamShareClipboard') || 'Result copied to clipboard! Share with your friends 🌙');
            }).catch(() => {});
        }
    }

    // 오늘의 운세 탭
    setupFortuneTab() {
        const grid = document.getElementById('zodiac-grid');

        // 별자리 버튼 생성
        zodiacData.forEach((zodiac, index) => {
            const item = document.createElement('div');
            item.className = 'zodiac-item';
            const icon = document.createElement('span');
            icon.className = 'zodiac-icon';
            icon.textContent = zodiac.icon;
            const name = document.createElement('span');
            name.className = 'zodiac-name';
            name.textContent = zodiac.name;
            item.appendChild(icon);
            item.appendChild(name);
            item.addEventListener('click', () => {
                document.querySelectorAll('.zodiac-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.selectedZodiac = zodiac.name;
                this.saveToStorage('selectedZodiac', zodiac.name);
                this.showFortune(zodiac);
            });
            grid.appendChild(item);

            // 저장된 별자리 복원
            if (this.selectedZodiac === zodiac.name) {
                item.classList.add('selected');
                this.showFortune(zodiac);
            }
        });

        document.getElementById('share-fortune').addEventListener('click', () => {
            this.shareFortune();
        });
    }

    showFortune(zodiac) {
        // 오늘 날짜 기반 시드로 일관된 운세 생성
        const today = new Date().toDateString();
        const seed = this.hashCode(today + zodiac.name);

        // 각 운세 점수 생성 (1-5)
        const love = this.seededRandom(seed, 1, 5);
        const money = this.seededRandom(seed + 1, 1, 5);
        const work = this.seededRandom(seed + 2, 1, 5);
        const luck = this.seededRandom(seed + 3, 1, 5);

        // 별 표시
        document.getElementById('love-stars').textContent = '★'.repeat(love) + '☆'.repeat(5 - love);
        document.getElementById('money-stars').textContent = '★'.repeat(money) + '☆'.repeat(5 - money);
        document.getElementById('work-stars').textContent = '★'.repeat(work) + '☆'.repeat(5 - work);
        document.getElementById('luck-stars').textContent = '★'.repeat(luck) + '☆'.repeat(5 - luck);

        // 상세 운세 메시지 (별자리별)
        const zodiacMessages = detailedFortuneMessages[zodiac.name] || detailedFortuneMessages[Object.keys(detailedFortuneMessages)[0]];
        const msgIndex = Math.abs(seed) % zodiacMessages.length;
        const mainMessage = zodiacMessages[msgIndex];
        
        // 시간대별 조언
        const hour = new Date().getHours();
        let timeKey = 'morning';
        if (hour >= 12 && hour < 18) timeKey = 'afternoon';
        else if (hour >= 18) timeKey = 'evening';
        const timeMsg = timeAdvice[timeKey][Math.abs(seed + 10) % timeAdvice[timeKey].length];

        // 종합 메시지 생성
        const lTimeAdvice = window.i18n?.t('dynamic.fortuneLabels.timeAdvice') || 'Time-Based Advice';
        const lTraits = window.i18n?.t('dynamic.fortuneLabels.traits') || 'Traits';
        const lElement = window.i18n?.t('dynamic.fortuneLabels.element') || 'Element';
        const lRuling = window.i18n?.t('dynamic.fortuneLabels.ruling') || 'Ruling Planet';
        const lPersonality = window.i18n?.t('dynamic.fortuneLabels.personality') || 'Personality';
        const lLoveStyle = window.i18n?.t('dynamic.fortuneLabels.loveStyle') || 'Love Style';
        const lCareerFit = window.i18n?.t('dynamic.fortuneLabels.careerFit') || 'Career Fit';
        const fullMessage = `${mainMessage}\n\n⏰ ${lTimeAdvice}\n${timeMsg}\n\n📊 ${zodiac.name} ${lTraits}\n• ${lElement}: ${zodiac.element} | ${lRuling}: ${zodiac.ruling}\n• ${lPersonality}: ${zodiac.traits}\n• ${lLoveStyle}: ${zodiac.love}\n• ${lCareerFit}: ${zodiac.career}`;

        document.getElementById('fortune-message').textContent = fullMessage;

        // 별자리 정보
        document.getElementById('fortune-zodiac-icon').textContent = zodiac.icon;
        const fortuneZodiacLabel = window.i18n?.t('dynamic.resultLabels.fortuneZodiacInfo')?.replace('{zodiac}', zodiac.name).replace('{dates}', zodiac.dates) || `${zodiac.name} Today (${zodiac.dates})`;
        document.getElementById('fortune-zodiac-name').textContent = fortuneZodiacLabel;

        // 행운 아이템 (상세)
        const colorData = luckyColors[Math.abs(seed + 4) % luckyColors.length];
        const luckyNum = (Math.abs(seed + 5) % 45) + 1;
        const luckyNum2 = (Math.abs(seed + 6) % 45) + 1;
        document.getElementById('lucky-color').textContent = `${colorData.name} (${colorData.meaning})`;
        document.getElementById('lucky-number').textContent = `${luckyNum}, ${luckyNum2}`;

        // 결과 표시
        const resultCard = document.getElementById('fortune-result');
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    shareFortune() {
        const zodiac = document.getElementById('fortune-zodiac-name').textContent;
        const message = document.getElementById('fortune-message').textContent;
        const color = document.getElementById('lucky-color').textContent;
        const number = document.getElementById('lucky-number').textContent;
        const url = 'https://dopabrain.com/dream-fortune/';

        const shareTemplate = window.i18n?.t('dynamic.shareTexts.fortuneShare') || `⭐ Today's {zodiac} Horoscope\n\n{message}\n\n🎨 Lucky Color: {color}\n🔢 Lucky Numbers: {number}\n\nCheck your horoscope too! 👇\n{url}`;
        const text = shareTemplate
            .replace('{zodiac}', zodiac)
            .replace('{message}', message)
            .replace('{color}', color)
            .replace('{number}', number)
            .replace('{url}', url);

        if (navigator.share) {
            const shareTitle = window.i18n?.t('dynamic.shareTexts.fortuneShareTitle')?.replace('{zodiac}', zodiac) || `Today's ${zodiac} Horoscope ⭐`;
            navigator.share({ title: shareTitle, text, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text).then(() => {
                alert(window.i18n?.t('dynamic.shareTexts.fortuneShareClipboard') || 'Result copied to clipboard! Share with your friends ⭐');
            }).catch(() => {});
        }
    }

    // 타로 탭
    setupTarotTab() {
        const cards = document.querySelectorAll('.tarot-card');
        const resultCard = document.getElementById('tarot-result');

        cards.forEach(card => {
            card.addEventListener('click', () => {
                if (card.classList.contains('flipped')) return;

                // 모든 카드 비활성화
                cards.forEach(c => c.style.pointerEvents = 'none');

                // 선택한 카드 뒤집기
                card.classList.add('flipped');

                // 랜덤 타로 선택 + 정방향/역방향
                const tarot = tarotData[Math.floor(Math.random() * tarotData.length)];
                const isReversed = Math.random() < 0.3; // 30% 확률로 역방향
                
                setTimeout(() => {
                    card.textContent = tarot.icon;
                    if (isReversed) {
                        card.style.transform = 'rotateY(180deg)';
                    }
                    this.showTarotResult(tarot, isReversed);
                }, 300);
            });
        });

        document.getElementById('retry-tarot').addEventListener('click', () => {
            this.resetTarot();
        });
    }

    showTarotResult(tarot, isReversed = false) {
        const reading = isReversed ? tarot.reversed : tarot.upright;
        const reversedLabel = window.i18n?.t('dynamic.tarotReversed') || 'Reversed';
        const uprightLabel = window.i18n?.t('dynamic.tarotUpright') || 'Upright';
        const directionText = isReversed ? reversedLabel : uprightLabel;
        const directionLabel = window.i18n?.t('dynamic.resultLabels.tarotDirection')?.replace('{direction}', directionText) || `(${directionText})`;

        document.getElementById('tarot-icon').textContent = tarot.icon;
        document.getElementById('tarot-name').textContent = `${tarot.name} ${directionLabel}`;

        // detailed reading
        const tarotKeywordLabel = window.i18n?.t('dynamic.resultLabels.tarotKeyword') || '🔑 Keyword';
        const tarotMeaningLabel = window.i18n?.t('dynamic.resultLabels.tarotMeaning') || '📖 Meaning';
        const tarotLoveLabel = window.i18n?.t('dynamic.resultLabels.tarotLove') || '💕 Love Perspective';
        const tarotCareerLabel = window.i18n?.t('dynamic.resultLabels.tarotCareer') || '💼 Career/Finance Perspective';
        const fullMeaning = `${tarotKeywordLabel}: ${reading.keyword}\n\n` +
            `${tarotMeaningLabel}\n${reading.meaning}\n\n` +
            `${tarotLoveLabel}\n${reading.love}\n\n` +
            `${tarotCareerLabel}\n${reading.career}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━`;

        document.getElementById('tarot-meaning').textContent = fullMeaning;
        const tarotAdviceLabel = window.i18n?.t('dynamic.resultLabels.tarotAdvice') || "💫 Today's Advice";
        document.getElementById('tarot-advice').textContent = `${tarotAdviceLabel}: ${reading.advice}`;

        const resultCard = document.getElementById('tarot-result');
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    resetTarot() {
        const cards = document.querySelectorAll('.tarot-card');
        const resultCard = document.getElementById('tarot-result');

        resultCard.classList.add('hidden');

        cards.forEach(card => {
            card.classList.remove('flipped');
            card.textContent = '🂠';
            card.style.pointerEvents = 'auto';
            card.style.transform = '';
        });
    }

    // 유틸리티
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    seededRandom(seed, min, max) {
        const x = Math.sin(seed) * 10000;
        const rand = x - Math.floor(x);
        return Math.floor(rand * (max - min + 1)) + min;
    }

    // 꿈 일기 저장
    saveToDiary(keyword, luck) {
        const entry = {
            id: Date.now(),
            keyword: keyword,
            luck: luck,
            date: new Date().toISOString()
        };

        this.dreamDiary.unshift(entry);
        if (this.dreamDiary.length > 20) {
            this.dreamDiary = this.dreamDiary.slice(0, 20);
        }

        this.saveToStorage('dreamDiary', this.dreamDiary);
        this.renderDreamDiary();
    }

    // 꿈 일기 렌더링
    renderDreamDiary() {
        const container = document.getElementById('dream-diary-list');
        if (!container) return;

        if (this.dreamDiary.length === 0) {
            const emptyMessage = window.i18n?.t('dynamic.resultLabels.diaryEmpty') || 'No dream interpretations yet.';
            container.innerHTML = `<p class="diary-empty">${emptyMessage}</p>`;
            return;
        }

        container.innerHTML = this.dreamDiary.map(entry => {
            const d = new Date(entry.date);
            const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
            const diaryLuckLabel = window.i18n?.t('dynamic.resultLabels.diaryLuck')?.replace('{luck}', entry.luck) || `Luck ${entry.luck}%`;
            return `
                <div class="diary-item">
                    <span class="diary-date">${dateStr}</span>
                    <div class="diary-content">
                        <div class="diary-keyword">${entry.keyword}</div>
                        <div class="diary-luck">${diaryLuckLabel}</div>
                    </div>
                    <button class="diary-delete" onclick="dreamApp.deleteDiary(${entry.id})">✕</button>
                </div>
            `;
        }).join('');
    }

    // 꿈 일기 삭제
    deleteDiary(id) {
        this.dreamDiary = this.dreamDiary.filter(e => e.id !== id);
        this.saveToStorage('dreamDiary', this.dreamDiary);
        this.renderDreamDiary();
    }

    // 결과 표시 애니메이션 및 파티클 효과
    animateResultDisplay(keyword, seed) {
        const resultCard = document.getElementById('dream-result');
        if (!resultCard) return;

        // 이모지 파티클 생성
        const emojis = ['✨', '🌟', '💫', '🔮', '⭐'];
        const rect = resultCard.getBoundingClientRect();

        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];

                const startX = rect.left + rect.width / 2;
                const startY = rect.top + rect.height / 2;
                const angle = (Math.PI * 2 * i) / 8;
                const distance = 100 + Math.random() * 100;

                particle.style.left = startX + 'px';
                particle.style.top = startY + 'px';
                particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
                particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');

                document.body.appendChild(particle);

                setTimeout(() => particle.remove(), 1500);
            }, i * 100);
        }
    }

    // 서비스 워커 등록
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(() => console.log('Service Worker registered'))
                .catch(err => console.log('SW registration failed:', err));
        }
    }
}

// 앱 시작
let dreamApp;
document.addEventListener('DOMContentLoaded', () => {
    try {
        dreamApp = new DreamFortuneApp();
    } catch (e) {
        console.error('DreamFortuneApp init error:', e);
    } finally {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 300);
        }
    }
});

// Failsafe: ensure loader is hidden even if everything above fails
setTimeout(() => { const l = document.getElementById('app-loader'); if (l) { l.classList.add('hidden'); setTimeout(() => l.remove(), 300); } }, 3000);
