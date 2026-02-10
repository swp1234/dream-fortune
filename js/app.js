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
        const aiTitle = window.i18n?.t('dynamic.aiTitle')?.replace('{keyword}', keyword) || `"${keyword}" AI 심층 해몽`;
        document.getElementById('ai-dream-title').textContent = aiTitle;

        // 심리학적 의미
        const psychoMeaning = foundKeywords.length > 0
            ? this.generatePsychoAnalysis(foundKeywords)
            : (window.i18n?.t('dynamic.fallbackMessage') || '이 꿈은 당신의 개인적인 무의식의 메시지를 담고 있습니다. 꿈에서 느낀 감정이 핵심입니다. 그 감정이 현재 삶과 어떻게 연결되는지 생각해보세요.');
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
        const luckyColor = this.getTodayLuckyColorName(foundKeywords.length > 0 ? dreamData[foundKeywords[0]]?.luckyColor : '금색', seed);
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
                "지금 시작한 일이 좋은 결과를 가져올 거예요. 자신감을 가지고 나아가세요.",
                "주변 사람들과의 소통을 소중히 하세요. 중요한 대화가 좋은 기회를 만들 수 있습니다.",
                "이 시기는 새로운 시도에 좋은 때입니다. 미루던 일을 시작해보세요."
            ],
            window.i18n?.t('dynamic.recommendedActions.medium') || [
                "신중함과 열정의 균형을 맞추세요. 서두르지 않아도 됩니다.",
                "자신의 직관을 믿고 행동하되, 작은 결정부터 천천히 진행하세요.",
                "현재 상황을 객관적으로 관찰하고 다음 스텝을 준비하세요."
            ],
            window.i18n?.t('dynamic.recommendedActions.low') || [
                "내면의 목소리에 귀 기울이세요. 지금은 성찰의 시간입니다.",
                "자신을 돌보는 것이 가장 중요합니다. 명상이나 충분한 수면을 취하세요.",
                "이 시기는 준비의 시간입니다. 기초를 튼튼히 하세요."
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
        const colors = window.i18n?.t('dynamic.colors') || ["금색", "은색", "하늘색", "연두색", "코랄", "라벤더", "민트"];
        if (baseColor) {
            return baseColor + ' & ' + colors[Math.abs(seed) % colors.length];
        }
        return colors[Math.abs(seed) % colors.length];
    }

    // 행운의 방향 반환
    getTodayLuckyDirection(seed) {
        const directions = window.i18n?.t('dynamic.directions') || ["동쪽", "서쪽", "남쪽", "북쪽", "동북쪽", "남동쪽"];
        return directions[Math.abs(seed) % directions.length];
    }
    
    generatePsychoAnalysis(keywords) {
        const i18nAnalyses = window.i18n?.t('dynamic.psychoAnalyses') || {};
        const defaultAnalyses = {
            "뱀": "뱀은 프로이트 심리학에서 억압된 욕망과 본능을 상징합니다. 당신의 무의식이 현재 억누르고 있는 욕구나 감정을 표현하려 하고 있습니다. 동시에 융 심리학에서는 변화와 치유의 상징이기도 합니다.",
            "용": "용은 자아실현과 잠재력의 완전한 발현을 상징합니다. 당신 안에 큰 가능성이 깨어나려 하고 있습니다. 이 에너지를 어떻게 활용할지 진지하게 고민해보세요.",
            "물": "물은 감정의 흐름을 나타냅니다. 꿈에서 물의 상태가 현재 감정 상태를 반영합니다. 감정을 억누르지 말고 자연스럽게 흐르게 하세요.",
            "비행": "하늘을 나는 꿈은 현재 제약에서 벗어나고 싶은 강한 욕구를 보여줍니다. 자유를 향한 갈망이 있습니다. 어떤 것이 당신을 묶고 있는지 생각해보세요.",
            "추락": "추락은 통제력 상실에 대한 두려움입니다. 현재 삶에서 불안정하게 느끼는 영역이 있을 수 있습니다. 안전한 기반을 다지는 데 집중하세요.",
            "죽음": "죽음 꿈은 자아의 일부가 변화하고 있음을 의미합니다. 오래된 습관, 관계, 또는 자아상이 끝나고 새로운 당신이 태어나고 있습니다.",
            "default": "이 꿈은 당신의 현재 심리 상태와 무의식적 욕구를 반영합니다. 꿈에서 느낀 감정이 핵심입니다."
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
            return `• 지금은 행동의 시기입니다. 미루던 일을 시작하세요.\n• 새로운 기회에 적극적으로 응하세요.\n• 자신감을 가지고 목표를 향해 나아가세요.`;
        } else if (avgLuck >= 60) {
            return `• 균형 잡힌 접근이 필요합니다. 급하게 서두르지 마세요.\n• 주변의 조언을 구하되 최종 결정은 스스로 하세요.\n• 작은 성공들을 축적해 나가세요.`;
        } else {
            return `• 지금은 준비의 시기입니다. 기반을 다지세요.\n• 내면을 돌보는 시간을 가지세요. 명상이나 일기가 도움됩니다.\n• 조급해하지 말고 때를 기다리세요.`;
        }
    }
    
    getWeeklyAdvice(keywords) {
        const advices = [
            "중요한 만남이나 기회가 찾아올 수 있습니다. 열린 마음을 유지하세요.",
            "에너지를 분산시키지 말고 가장 중요한 것에 집중하세요.",
            "주변 사람들과의 관계에서 좋은 일이 생길 수 있습니다.",
            "새로운 정보나 통찰을 얻을 수 있는 시기입니다. 배움에 열린 자세를 가지세요."
        ];
        return advices[Math.floor(Math.random() * advices.length)];
    }
    
    getMonthlyAdvice(keywords) {
        const advices = [
            "장기적인 목표를 위해 꾸준히 노력하면 결실을 볼 수 있습니다.",
            "변화의 조짐이 있습니다. 유연하게 대응할 준비를 하세요.",
            "관계와 재정 모두 안정되는 시기로 접어들고 있습니다.",
            "자기 계발에 투자하면 나중에 큰 보상으로 돌아올 것입니다."
        ];
        return advices[Math.floor(Math.random() * advices.length)];
    }
    
    shareAIDream() {
        const title = document.getElementById('ai-dream-title').textContent;
        const psychology = document.getElementById('ai-psychology-meaning').textContent.substring(0, 80);
        const luckIndex = document.getElementById('luck-percentage').textContent;
        const luckyNumber = document.getElementById('lucky-numbers').textContent;
        const luckyColor = document.getElementById('lucky-color-name').textContent;

        const shareTemplate = window.i18n?.t('dynamic.shareTexts.aiDream') || `✨ {title}\n\n🌟 행운 지수: {luck}\n🔢 행운의 숫자: {number}\n🎨 행운의 색상: {color}\n\n🧠 {meaning}...\n\n꿈해몽 & 운세 앱에서 AI 심층 분석을 받아보세요! 🔮`;
        const text = shareTemplate
            .replace('{title}', title)
            .replace('{luck}', luckIndex)
            .replace('{number}', luckyNumber)
            .replace('{color}', luckyColor)
            .replace('{meaning}', psychology);
        const url = 'https://dopabrain.com/dream-fortune/';

        if (navigator.share) {
            navigator.share({
                title: window.i18n?.t('dynamic.shareTexts.aiDreamTitle') || '내 꿈해몽 결과 ✨',
                text: text,
                url: url
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text + '\n\n' + url).then(() => {
                alert(window.i18n?.t('dynamic.shareTexts.aiDreamClipboard') || '결과가 클립보드에 복사되었습니다! 친구에게 공유해보세요 ✨');
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
        const keywordLabel = `"${keyword}" ${window.i18n?.t('dream.interpret')?.replace(/하기.*/, '') || '꿈 해석'}`;
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
            const categoryLabel = window.i18n?.t('dynamic.resultLabels.category') || '📂 분류';
            fullMeaning += `${categoryLabel}: ${result.category}\n\n`;
        }

        // 핵심 의미 + 오늘의 특별 메시지
        if (result.mainMeaning) {
            const meaningLabel = window.i18n?.t('dynamic.resultLabels.meaning') || '🔮 핵심 의미';
            const todayMessageLabel = window.i18n?.t('dynamic.resultLabels.todayMessage') || '✨ 오늘의 메시지';
            fullMeaning += `${meaningLabel}: ${result.mainMeaning}\n`;
            fullMeaning += `${todayMessageLabel}: ${this.getTodayMessage(keyword, seed)}\n\n`;
        }

        // 상세 해석 (변형 추가)
        const detailedLabel = window.i18n?.t('dynamic.resultLabels.detailedExplanation') || '📖 상세 해석';
        fullMeaning += `${detailedLabel}\n${result.detailed || result.meaning}\n`;
        fullMeaning += `${this.getAdditionalInterpretation(keyword, seed)}\n\n`;

        // 상황별 해석 (랜덤하게 2-3개 선택)
        if (result.situations) {
            const situations = Object.entries(result.situations);
            const selectedSituations = this.selectRandom(situations, seed, 2, 3);

            fullMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
            const situationLabel = window.i18n?.t('dynamic.resultLabels.situationInterpretation') || '🎭 오늘 주목할 상황 해석';
            fullMeaning += `${situationLabel}\n`;
            selectedSituations.forEach(([situation, meaning]) => {
                fullMeaning += `• ${situation}: ${meaning}\n`;
            });
            fullMeaning += `\n`;
        }

        // 오늘의 분야별 운세 (변형 추가)
        fullMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const fieldFortuneLabel = window.i18n?.t('dynamic.resultLabels.fieldFortune') || '📊 오늘의 분야별 운세';
        const loveLabel = window.i18n?.t('dynamic.resultLabels.love') || '💕 연애';
        const moneyLabel = window.i18n?.t('dynamic.resultLabels.money') || '💰 재물';
        const healthLabel = window.i18n?.t('dynamic.resultLabels.health') || '💪 건강';
        const workLabel = window.i18n?.t('dynamic.resultLabels.work') || '💼 직장';
        fullMeaning += `${fieldFortuneLabel}\n`;
        fullMeaning += `${loveLabel}: ${this.enhanceAdvice(result.love, 'love', seed)}\n`;
        fullMeaning += `${moneyLabel}: ${this.enhanceAdvice(result.money, 'money', seed)}\n`;
        fullMeaning += `${healthLabel}: ${this.enhanceAdvice(result.health, 'health', seed)}\n`;
        fullMeaning += `${workLabel}: ${this.enhanceAdvice(result.work, 'work', seed)}\n`;
        fullMeaning += `\n`;

        // 시간대별 조언
        fullMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const timeBasedLabel = window.i18n?.t('dynamic.resultLabels.timeBasedGuidance') || '⏰ 시간대별 행동 지침';
        fullMeaning += `${timeBasedLabel}\n`;
        fullMeaning += this.getTimeBasedAdvice(seed) + '\n\n';

        // 행운 아이템 (동적)
        fullMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const luckyItemsLabel = window.i18n?.t('dynamic.resultLabels.luckyItems') || '🍀 오늘의 행운';
        const luckyColorLabel = window.i18n?.t('dynamic.resultLabels.luckyColor') || '🎨 행운 색상';
        const luckyNumberLabel = window.i18n?.t('dynamic.resultLabels.luckyNumber') || '🔢 행운 숫자';
        const luckyDirectionLabel = window.i18n?.t('dynamic.resultLabels.luckyDirection') || '🧭 행운 방향';
        const luckyTimeLabel = window.i18n?.t('dynamic.resultLabels.luckyTime') || '🌟 행운의 시간';
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
            const relatedDreamsLabel = window.i18n?.t('dynamic.resultLabels.relatedDreams') || '🔗 함께 해석하면 좋은 키워드';
            fullMeaning += `\n${relatedDreamsLabel}: ${result.relatedDreams.join(', ')}`;
        }

        // 오늘의 행운 변동 (-5 ~ +10)
        const luckVariation = this.seededRandom(seed, -5, 10);
        const todayLuck = Math.min(100, Math.max(0, result.luck + luckVariation));

        document.getElementById('dream-meaning').textContent = fullMeaning;
        const luckIndexLabel = window.i18n?.t('dynamic.resultLabels.luckIndex') || '🍀 오늘의 행운지수';
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
            `오늘 ${keyword} 꿈을 꾸셨다면, 무의식이 특별한 메시지를 보내고 있습니다.`,
            `${keyword}의 에너지가 오늘 하루를 좌우할 수 있습니다.`,
            `${keyword} 꿈은 오늘 중요한 결정의 힌트가 될 수 있습니다.`,
            `이 시기에 ${keyword} 꿈을 꾸는 것은 변화의 전조입니다.`,
            `${keyword}이(가) 당신의 잠재의식에서 깨어나고 있습니다.`,
            `오늘 ${keyword}의 기운이 당신과 함께합니다.`,
            `${keyword} 꿈은 내면 깊은 곳의 소망을 반영합니다.`
        ];
        return messages[Math.abs(seed) % messages.length].replace(/{keyword}/g, keyword);
    }

    // 추가 해석 문구 생성
    getAdditionalInterpretation(keyword, seed) {
        const additions = window.i18n?.t('dynamic.additionalInterpretations') || [
            "특히 오늘 이 꿈을 꾸셨다면, 가까운 시일 내에 관련된 일이 현실에서 일어날 수 있습니다.",
            "이 꿈은 당신의 현재 감정 상태와 밀접하게 연결되어 있습니다. 마음을 살펴보세요.",
            "무의식은 종종 우리가 의식적으로 놓치는 것들을 보여줍니다. 주변을 다시 살펴보세요.",
            "이 상징이 반복해서 나타난다면, 더 깊은 의미가 있을 수 있습니다.",
            "꿈에서 느낀 감정이 해석의 핵심입니다. 긍정적이었다면 좋은 징조, 부정적이었다면 주의가 필요합니다.",
            "고대부터 이 꿈은 중요한 전환점을 알리는 것으로 해석되어 왔습니다.",
            "현재 고민하고 있는 문제의 해답이 이 꿈에 숨어있을 수 있습니다."
        ];
        return additions[Math.abs(seed + 7) % additions.length];
    }

    // 조언 강화
    enhanceAdvice(baseAdvice, category, seed) {
        const calmText = window.i18n?.t('dynamic.enhanceAdvices.calm') || '오늘은 평온한 흐름을 유지하세요.';
        if (!baseAdvice) return calmText;

        const enhancements = {
            love: window.i18n?.t('dynamic.enhanceAdvices.love') || [
                " 특히 오후 3시경에 좋은 기운이 있습니다.",
                " 진심 어린 대화가 관계를 깊게 합니다.",
                " 작은 선물이나 메시지가 큰 효과를 발휘합니다.",
                " 상대방의 말에 귀 기울이는 것이 중요합니다."
            ],
            money: window.i18n?.t('dynamic.enhanceAdvices.money') || [
                " 오늘 중 좋은 소식이 있을 수 있습니다.",
                " 충동 구매는 피하세요.",
                " 예상치 못한 수입이 생길 수 있습니다.",
                " 장기적 관점에서 결정하세요."
            ],
            health: window.i18n?.t('dynamic.enhanceAdvices.health') || [
                " 충분한 수분 섭취를 잊지 마세요.",
                " 가벼운 스트레칭이 도움이 됩니다.",
                " 오늘은 무리하지 않는 것이 좋습니다.",
                " 긍정적인 마인드가 건강에도 영향을 줍니다."
            ],
            work: window.i18n?.t('dynamic.enhanceAdvices.work') || [
                " 오전에 중요한 업무를 처리하세요.",
                " 동료와의 협력이 성과를 높입니다.",
                " 새로운 아이디어를 적극적으로 제안해보세요.",
                " 세부사항에 주의를 기울이세요."
            ]
        };

        const categoryEnhancements = enhancements[category] || [];
        if (categoryEnhancements.length === 0) return baseAdvice;

        return baseAdvice + categoryEnhancements[Math.abs(seed + category.charCodeAt(0)) % categoryEnhancements.length];
    }

    // 시간대별 조언
    getTimeBasedAdvice(seed) {
        const morningAdvice = window.i18n?.t('dynamic.timeBasedAdvices.morning') || [
            "오전: 중요한 결정이나 시작에 좋은 시간입니다.",
            "오전: 명상이나 계획 수립에 적합합니다.",
            "오전: 에너지가 높으니 도전적인 일을 시작하세요."
        ];
        const afternoonAdvice = window.i18n?.t('dynamic.timeBasedAdvices.afternoon') || [
            "오후: 대인관계에서 좋은 일이 생길 수 있습니다.",
            "오후: 집중력이 필요한 업무를 처리하세요.",
            "오후: 잠시 휴식을 취하면 아이디어가 떠오릅니다."
        ];
        const eveningAdvice = window.i18n?.t('dynamic.timeBasedAdvices.evening') || [
            "저녁: 사랑하는 사람과의 시간이 행운을 부릅니다.",
            "저녁: 하루를 정리하며 감사한 것을 떠올리세요.",
            "저녁: 꿈 일기를 쓰면 더 깊은 통찰을 얻습니다."
        ];

        return `${morningAdvice[Math.abs(seed) % morningAdvice.length]}\n` +
               `${afternoonAdvice[Math.abs(seed + 1) % afternoonAdvice.length]}\n` +
               `${eveningAdvice[Math.abs(seed + 2) % eveningAdvice.length]}`;
    }

    // 오늘의 행운 색상
    getTodayLuckyColor(baseColor, seed) {
        const additionalColors = ["금색", "은색", "하늘색", "연두색", "코랄", "라벤더", "민트"];
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
            "오전 9시 ~ 11시", "오전 10시 ~ 12시", "오후 1시 ~ 3시",
            "오후 2시 ~ 4시", "오후 3시 ~ 5시", "저녁 6시 ~ 8시",
            "저녁 7시 ~ 9시", "밤 9시 ~ 11시"
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
        const discoveredSymbolsLabel = window.i18n?.t('dynamic.resultLabels.discoveredSymbols') || '🔮 발견된 상징';
        let combinedMeaning = `${discoveredSymbolsLabel}: ${keywords.join(', ')}\n`;
        combinedMeaning += `✨ ${this.getMultiKeywordMessage(keywords, seed)}\n\n`;

        // 각 키워드 해석 (변형 추가)
        const meaningLabel = window.i18n?.t('dynamic.resultLabels.meaning') || '핵심';
        const todayMeaningLabel = window.i18n?.t('dynamic.resultLabels.todayMessage')?.replace('✨ ', '').replace(':', '') || '오늘의 의미';
        results.forEach((r, i) => {
            combinedMeaning += `【${r.keyword}】\n`;
            combinedMeaning += `• ${meaningLabel}: ${r.mainMeaning || '무의식의 메시지'}\n`;
            combinedMeaning += `• ${todayMeaningLabel}: ${this.getDynamicMeaning(r, seed + i)}\n\n`;
        });

        // 키워드 조합 특별 해석
        combinedMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const keywordCombinationLabel = window.i18n?.t('dynamic.resultLabels.keywordCombination') || '✨ 키워드 조합 해석';
        combinedMeaning += `${keywordCombinationLabel}\n`;
        combinedMeaning += this.generateDynamicCombinedInterpretation(results, seed, input) + '\n\n';

        // 종합 분야별 운세 (강화)
        combinedMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const combinedFieldFortuneLabel = window.i18n?.t('dynamic.resultLabels.combinedFieldFortune') || '📊 오늘의 종합 운세';
        const loveLabel = window.i18n?.t('dynamic.resultLabels.love') || '💕 연애';
        const moneyLabel = window.i18n?.t('dynamic.resultLabels.money') || '💰 재물';
        const workLabel = window.i18n?.t('dynamic.resultLabels.work') || '💼 직장';
        const healthLabel = window.i18n?.t('dynamic.resultLabels.health') || '💪 건강';
        combinedMeaning += `${combinedFieldFortuneLabel}\n`;
        combinedMeaning += `${loveLabel}: ${this.generateCombinedFieldFortune(results, 'love', seed)}\n`;
        combinedMeaning += `${moneyLabel}: ${this.generateCombinedFieldFortune(results, 'money', seed)}\n`;
        combinedMeaning += `${workLabel}: ${this.generateCombinedFieldFortune(results, 'work', seed)}\n`;
        combinedMeaning += `${healthLabel}: ${this.generateCombinedFieldFortune(results, 'health', seed)}\n\n`;

        // 시간대별 조언
        combinedMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const timeBasedLabel = window.i18n?.t('dynamic.resultLabels.timeBasedGuidance') || '⏰ 시간대별 행동 지침';
        combinedMeaning += `${timeBasedLabel}\n`;
        combinedMeaning += this.getTimeBasedAdvice(seed) + '\n\n';
        
        // 종합 행운 아이템
        const allColors = results.map(r => r.luckyColor).filter(Boolean);
        const allNumbers = results.flatMap(r => r.luckyNumber || []);

        combinedMeaning += `━━━━━━━━━━━━━━━━━━━━\n`;
        const combinedLuckyItemsLabel = window.i18n?.t('dynamic.resultLabels.combinedLuckyItems') || '🍀 오늘의 종합 행운';
        const luckyColorLabel = window.i18n?.t('dynamic.resultLabels.luckyColor') || '🎨 행운 색상';
        const luckyNumberLabel = window.i18n?.t('dynamic.resultLabels.luckyNumber') || '🔢 행운 숫자';
        const luckyTimeLabel = window.i18n?.t('dynamic.resultLabels.luckyTime') || '🌟 행운의 시간';
        const todayQuoteLabel = window.i18n?.t('dynamic.resultLabels.todayQuote') || '💫 오늘의 한마디';
        combinedMeaning += `${combinedLuckyItemsLabel}\n`;
        combinedMeaning += `${luckyColorLabel}: ${[...new Set(allColors)].join(', ') || '금색'}\n`;
        combinedMeaning += `${luckyNumberLabel}: ${[...new Set([...allNumbers, (Math.abs(seed) % 45) + 1])].slice(0, 5).join(', ')}\n`;
        combinedMeaning += `${luckyTimeLabel}: ${this.getLuckyTime(seed)}\n`;
        combinedMeaning += `\n${todayQuoteLabel}: "${this.getTodayQuote(seed)}"`;

        const combinedInterpretationLabel = window.i18n?.t('dynamic.resultLabels.combinedInterpretation') || '종합 꿈 해석';
        document.getElementById('dream-keyword').textContent = `${combinedInterpretationLabel} (${results.length}${window.i18n?.t('dynamic.resultLabels.discoveredSymbols')?.match(/상징|Symbol|symbols/i) ? '상징' : 'symbols'})`;
        document.getElementById('dream-meaning').textContent = combinedMeaning;
        const combinedLuckIndexLabel = window.i18n?.t('dynamic.resultLabels.combinedLuckIndex') || '🍀 오늘의 종합 행운지수';
        document.getElementById('dream-luck').textContent = `${combinedLuckIndexLabel} ${avgLuck}%`;

        const resultCard = document.getElementById('dream-result');
        resultCard.classList.remove('hidden');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 꿈 일기에 자동 저장
        const keywords = results.map(r => r.keyword);
        this.saveToDiary(keywords.join(', '), avgLuck);
    }
    
    // 복합 키워드 특별 메시지
    getMultiKeywordMessage(keywords, seed) {
        const messages = window.i18n?.t('dynamic.multiKeywordMessages') || [
            `여러 상징이 함께 나타난 것은 복합적인 메시지입니다. 각각의 의미가 서로를 보완하며 더 깊은 통찰을 제공합니다.`,
            `${keywords.length}개의 상징이 조화를 이루며 나타났습니다. 이는 삶의 여러 영역이 연결되어 있음을 보여줍니다.`,
            `흥미로운 조합입니다! 무의식이 여러 층위의 메시지를 동시에 보내고 있습니다.`,
            `이 상징들의 만남은 우연이 아닙니다. 당신의 내면이 중요한 이야기를 하고 있습니다.`
        ];
        return messages[Math.abs(seed) % messages.length].replace(/{count}/g, keywords.length);
    }
    
    // 동적 의미 생성
    getDynamicMeaning(result, seed) {
        const base = result.detailed || result.meaning || '';
        const shortBase = base.substring(0, 60);

        const additions = window.i18n?.t('dynamic.dynamicMeanings') || [
            `${shortBase}... 오늘 특히 이 에너지가 강하게 작용합니다.`,
            `${shortBase}... 가까운 시일 내에 관련된 일이 일어날 수 있습니다.`,
            `${shortBase}... 현재 상황과 밀접하게 연결되어 있습니다.`,
            `${shortBase}... 이 메시지에 주의를 기울이세요.`
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
                "동물-자연": i18nCategoryMeanings.animalNature || "본능과 환경이 조화를 이루고 있습니다. 자연의 흐름을 따르세요.",
                "동물-행동": i18nCategoryMeanings.animalAction || "행동으로 옮길 때입니다. 본능을 믿고 움직이세요.",
                "자연-행동": i18nCategoryMeanings.natureAction || "자연스러운 행동이 좋은 결과를 가져옵니다.",
                "동물-물건": i18nCategoryMeanings.animalThing || "물질적 변화가 예고됩니다. 재물운과 연결됩니다.",
                "default": (i18nCategoryMeanings.default || `${categories.join('과 ')} 관련 상징의 만남은 삶의 다양한 영역이 연결되어 있음을 보여줍니다.`).replace(/{categories}/g, categories.join('과 '))
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
            "일요일의 이 꿈은 한 주의 방향을 알려줍니다.",
            "월요일의 이 꿈은 새로운 시작을 암시합니다.",
            "화요일의 이 꿈은 열정과 행동을 요구합니다.",
            "수요일의 이 꿈은 소통과 연결의 중요성을 말합니다.",
            "목요일의 이 꿈은 확장과 성장의 기회를 보여줍니다.",
            "금요일의 이 꿈은 관계와 조화에 대한 메시지입니다.",
            "토요일의 이 꿈은 휴식과 성찰을 권합니다."
        ];
        interpretation += '\n\n🗓️ ' + dayMessages[dayOfWeek];
        
        return interpretation;
    }
    
    // 2개 키워드 조합 해석
    getTwoKeywordInterpretation(keywords, luck, seed) {
        const [k1, k2] = keywords;

        const templateTexts = window.i18n?.t('dynamic.twoKeywordInterpretations') || [
            `${k1}과(와) ${k2}의 만남은 ${luck >= 70 ? '매우 길한' : luck >= 50 ? '의미 있는' : '주의가 필요한'} 조합입니다. ${k1}의 에너지가 ${k2}를 통해 구체화됩니다.`,
            `${k1}이(가) 나타내는 내면의 욕구와 ${k2}이(가) 상징하는 외부 상황이 만나고 있습니다. ${luck >= 60 ? '조화로운 진행이 예상됩니다.' : '균형을 찾아야 합니다.'}`,
            `두 상징이 서로를 보완합니다. ${k1}에서 시작된 흐름이 ${k2}로 이어지며, ${luck >= 70 ? '긍정적인 결과를 예고합니다.' : '신중한 접근이 필요합니다.'}`,
            `${k1}과(와) ${k2}이(가) 함께 나타난 것은 드문 조합입니다. ${luck >= 65 ? '특별한 기회가 찾아올 수 있습니다.' : '변화에 대비하세요.'}`
        ];

        const quality = luck >= 70 ? '매우 길한' : luck >= 50 ? '의미 있는' : '주의가 필요한';
        const balance = luck >= 60 ? '조화로운 진행이 예상됩니다.' : '균형을 찾아야 합니다.';
        const result = luck >= 70 ? '긍정적인 결과를 예고합니다.' : '신중한 접근이 필요합니다.';
        const opportunity = luck >= 65 ? '특별한 기회가 찾아올 수 있습니다.' : '변화에 대비하세요.';

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
            `${keywords.length}개의 상징이 복합적으로 나타났습니다. 이는 삶의 여러 측면이 동시에 변화하고 있음을 의미합니다. ${luck >= 70 ? '전반적으로 긍정적인 흐름입니다.' : '하나씩 차분히 접근하세요.'}`,
            `풍부한 상징의 향연입니다! ${keywords.slice(0, 2).join(', ')} 등이 어우러져 ${luck >= 65 ? '다양한 기회' : '복잡한 상황'}을 예고합니다. 직관을 따르세요.`,
            `무의식이 풍부한 메시지를 보내고 있습니다. 각 상징을 개별적으로 이해하되, 전체 그림을 놓치지 마세요. ${luck >= 60 ? '통합적 시각이 열쇠입니다.' : '우선순위를 정하세요.'}`
        ];

        const overall = luck >= 70 ? '전반적으로 긍정적인 흐름입니다.' : '하나씩 차분히 접근하세요.';
        const expectation = luck >= 65 ? '다양한 기회' : '복잡한 상황';
        const key = luck >= 60 ? '통합적 시각이 열쇠입니다.' : '우선순위를 정하세요.';

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
                love: i18nDefaults.love || "새로운 만남이나 관계의 발전이 기대됩니다.",
                money: i18nDefaults.money || "재물운이 안정적으로 흐르고 있습니다.",
                work: i18nDefaults.work || "업무에서 순조로운 진행이 예상됩니다.",
                health: i18nDefaults.health || "전반적으로 건강한 흐름입니다."
            };
            return defaults[field] + this.getFieldBonus(field, seed);
        }

        // 첫 번째 조언 + 조합 보너스
        const base = advices[0];
        if (advices.length > 1) {
            return `${base} 여러 상징의 조합으로 ${this.getFieldCombinationBonus(field, seed)}`;
        }
        return base + this.getFieldBonus(field, seed);
    }
    
    getFieldBonus(field, seed) {
        const i18nBonuses = window.i18n?.t('dynamic.fieldBonuses') || {};
        const bonuses = {
            love: i18nBonuses.love || [" 특히 저녁 시간이 좋습니다.", " 진심 어린 표현이 효과적입니다.", ""],
            money: i18nBonuses.money || [" 오후에 좋은 소식이 있을 수 있습니다.", " 직감을 믿으세요.", ""],
            work: i18nBonuses.work || [" 협업이 성과를 높입니다.", " 오전에 중요한 업무를 처리하세요.", ""],
            health: i18nBonuses.health || [" 가벼운 산책이 도움이 됩니다.", " 충분한 휴식을 취하세요.", ""]
        };
        return (bonuses[field] || [""])[Math.abs(seed) % 3];
    }
    
    getFieldCombinationBonus(field, seed) {
        const i18nBonuses = window.i18n?.t('dynamic.fieldCombinationBonuses') || {};
        const bonuses = {
            love: i18nBonuses.love || "더 깊은 연결이 가능해집니다.",
            money: i18nBonuses.money || "예상보다 좋은 결과가 기대됩니다.",
            work: i18nBonuses.work || "시너지 효과가 발휘됩니다.",
            health: i18nBonuses.health || "총체적인 균형이 회복됩니다."
        };
        return bonuses[field] || i18nBonuses.default || "긍정적인 변화가 예상됩니다.";
    }
    
    // 오늘의 명언
    getTodayQuote(seed) {
        const quotes = window.i18n?.t('dynamic.quotes') || [
            "꿈은 무의식의 왕도이다. - 프로이트",
            "모든 꿈은 이루어진다, 그것을 쫓을 용기가 있다면.",
            "밤의 꿈은 낮의 지혜가 된다.",
            "당신의 무의식은 언제나 당신을 돕고 있다.",
            "꿈을 믿는 자에게 길이 열린다.",
            "오늘 꾼 꿈이 내일의 현실이 된다.",
            "우주는 꿈을 통해 당신에게 말을 건넨다.",
            "직관을 따르라, 그것이 당신의 진정한 나침반이다."
        ];
        return quotes[Math.abs(seed) % quotes.length];
    }
    
    combineCategoryAdvice(results, category) {
        const advices = results.map(r => r[category]).filter(Boolean);
        if (advices.length === 0) return '여러 기운이 복합적으로 작용합니다.';
        if (advices.length === 1) return advices[0];
        return advices[0] + ' 또한, ' + advices.slice(1).join(' ').toLowerCase();
    }

    generateCombinedInterpretation(results) {
        const avgLuck = Math.round(results.reduce((sum, r) => sum + r.luck, 0) / results.length);
        const keywords = results.map(r => r.keyword);
        const categories = [...new Set(results.map(r => r.category).filter(Boolean))];
        
        let interpretation = '';
        
        // 카테고리 기반 해석
        if (categories.length > 1) {
            interpretation += `${categories.join('과 ')} 관련 상징이 함께 나타났습니다. `;
        }
        
        // 행운지수에 따른 종합 메시지
        if (avgLuck >= 85) {
            interpretation += `${keywords.join('과 ')}이(가) 함께 나타난 꿈은 매우 길한 꿈입니다! 여러 긍정적인 에너지가 결합되어 큰 행운이 찾아올 징조입니다. 이 시기에 중요한 결정을 내리거나 새로운 시작을 하면 좋은 결과를 얻을 수 있습니다. 적극적으로 기회를 잡으세요!`;
        } else if (avgLuck >= 70) {
            interpretation += `${keywords.join('과 ')}의 조합은 긍정적인 변화를 암시합니다. 각각의 상징이 서로를 보완하며, 당신의 무의식이 새로운 가능성을 보여주고 있습니다. 변화에 열린 마음을 가지고 직관을 따라가 보세요.`;
        } else if (avgLuck >= 55) {
            interpretation += `${keywords.join('과 ')}이(가) 함께 나타난 것은 현재 상황에 대한 복합적인 메시지입니다. 긍정적인 면과 주의할 점이 공존하니, 균형 잡힌 시각으로 상황을 바라보세요. 성급한 판단보다는 신중한 접근이 좋습니다.`;
        } else {
            interpretation += `${keywords.join('과 ')}의 조합은 내면의 갈등이나 해결해야 할 과제를 나타냅니다. 하지만 꿈은 문제를 인식하게 해주는 것이므로, 이를 통해 성장할 기회로 삼으세요. 자신을 돌보는 시간을 가지세요.`;
        }
        
        return interpretation;
    }

    shareDream() {
        const keyword = document.getElementById('dream-keyword').textContent;
        const meaning = document.getElementById('dream-meaning').textContent;
        const url = 'https://dopabrain.com/dream-fortune/';
        const shareTemplate = window.i18n?.t('dynamic.shareTexts.dreamShare') || `🌙 나의 꿈해몽 결과\n\n{keyword}\n{meaning}\n\n너도 어젯밤 꿈 해석해봐! 👇\n{url}`;
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
            navigator.share({ title: window.i18n?.t('dynamic.shareTexts.dreamShareTitle') || '나의 꿈해몽 결과 🔮', text, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text).then(() => {
                alert(window.i18n?.t('dynamic.shareTexts.dreamShareClipboard') || '결과가 복사되었습니다! 친구에게 공유해보세요 🌙');
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
        const zodiacMessages = detailedFortuneMessages[zodiac.name] || detailedFortuneMessages["양자리"];
        const msgIndex = Math.abs(seed) % zodiacMessages.length;
        const mainMessage = zodiacMessages[msgIndex];
        
        // 시간대별 조언
        const hour = new Date().getHours();
        let timeKey = 'morning';
        if (hour >= 12 && hour < 18) timeKey = 'afternoon';
        else if (hour >= 18) timeKey = 'evening';
        const timeMsg = timeAdvice[timeKey][Math.abs(seed + 10) % timeAdvice[timeKey].length];

        // 종합 메시지 생성
        const fullMessage = `${mainMessage}\n\n⏰ 시간대 조언\n${timeMsg}\n\n📊 ${zodiac.name} 특징\n• 원소: ${zodiac.element} | 지배성: ${zodiac.ruling}\n• 성향: ${zodiac.traits}\n• 연애 스타일: ${zodiac.love}\n• 적합 분야: ${zodiac.career}`;

        document.getElementById('fortune-message').textContent = fullMessage;

        // 별자리 정보
        document.getElementById('fortune-zodiac-icon').textContent = zodiac.icon;
        const fortuneZodiacLabel = window.i18n?.t('dynamic.resultLabels.fortuneZodiacInfo')?.replace('{zodiac}', zodiac.name).replace('{dates}', zodiac.dates) || `${zodiac.name}의 오늘 (${zodiac.dates})`;
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

        const shareTemplate = window.i18n?.t('dynamic.shareTexts.fortuneShare') || `⭐ 오늘의 {zodiac} 운세\n\n{message}\n\n🎨 행운 색상: {color}\n🔢 행운 숫자: {number}\n\n너의 오늘 운세도 확인해봐! 👇\n{url}`;
        const text = shareTemplate
            .replace('{zodiac}', zodiac)
            .replace('{message}', message)
            .replace('{color}', color)
            .replace('{number}', number)
            .replace('{url}', url);

        if (navigator.share) {
            const shareTitle = window.i18n?.t('dynamic.shareTexts.fortuneShareTitle')?.replace('{zodiac}', zodiac) || `오늘의 ${zodiac} 운세 ⭐`;
            navigator.share({ title: shareTitle, text, url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text).then(() => {
                alert(window.i18n?.t('dynamic.shareTexts.fortuneShareClipboard') || '결과가 복사되었습니다! 친구에게 공유해보세요 ⭐');
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
        const directionLabel = isReversed ? window.i18n?.t('dynamic.resultLabels.tarotDirection')?.replace('{direction}', '역방향') || '(역방향)' : window.i18n?.t('dynamic.resultLabels.tarotDirection')?.replace('{direction}', '정방향') || '(정방향)';
        const direction = directionLabel.includes('역') || directionLabel.includes('Reversed') ? window.i18n?.t('dynamic.resultLabels.tarotDirection')?.replace('{direction}', '역방향') || '(역방향)' : window.i18n?.t('dynamic.resultLabels.tarotDirection')?.replace('{direction}', '정방향') || '(정방향)';

        document.getElementById('tarot-icon').textContent = tarot.icon;
        document.getElementById('tarot-name').textContent = `${tarot.name} ${isReversed ? window.i18n?.t('dynamic.resultLabels.tarotDirection')?.replace('{direction}', '역방향') || '(역방향)' : window.i18n?.t('dynamic.resultLabels.tarotDirection')?.replace('{direction}', '정방향') || '(정방향)'}`;

        // 상세 해석 생성
        const tarotKeywordLabel = window.i18n?.t('dynamic.resultLabels.tarotKeyword') || '🔑 키워드';
        const tarotMeaningLabel = window.i18n?.t('dynamic.resultLabels.tarotMeaning') || '📖 의미';
        const tarotLoveLabel = window.i18n?.t('dynamic.resultLabels.tarotLove') || '💕 연애 관점';
        const tarotCareerLabel = window.i18n?.t('dynamic.resultLabels.tarotCareer') || '💼 직장/재정 관점';
        const fullMeaning = `${tarotKeywordLabel}: ${reading.keyword}\n\n` +
            `${tarotMeaningLabel}\n${reading.meaning}\n\n` +
            `${tarotLoveLabel}\n${reading.love}\n\n` +
            `${tarotCareerLabel}\n${reading.career}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━`;

        document.getElementById('tarot-meaning').textContent = fullMeaning;
        const tarotAdviceLabel = window.i18n?.t('dynamic.resultLabels.tarotAdvice') || '💫 오늘의 조언';
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
            const emptyMessage = window.i18n?.t('dynamic.resultLabels.diaryEmpty') || '아직 해석한 꿈이 없습니다.';
            container.innerHTML = `<p class="diary-empty">${emptyMessage}</p>`;
            return;
        }

        container.innerHTML = this.dreamDiary.map(entry => {
            const d = new Date(entry.date);
            const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
            const diaryLuckLabel = window.i18n?.t('dynamic.resultLabels.diaryLuck')?.replace('{luck}', entry.luck) || `행운 ${entry.luck}%`;
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
    dreamApp = new DreamFortuneApp();

    // Hide app loader
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 300);
    }
});
