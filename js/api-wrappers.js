/**
 * Safe API Wrappers
 * Canvas, Web Audio API, fetch 등의 안전한 래퍼
 */

class SafeCanvas {
    static getContext(canvasElement, contextType = '2d') {
        try {
            if (!canvasElement) {
                console.error('Canvas element not found');
                return null;
            }

            const ctx = canvasElement.getContext(contextType);
            if (!ctx) {
                console.error(`Failed to get ${contextType} context from canvas`);
                return null;
            }

            return ctx;
        } catch (e) {
            console.error('Canvas context error:', e.message);
            window.errorHandler?.handleError(e, 'Canvas Context');
            return null;
        }
    }

    static isSupported() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext && canvas.getContext('2d'));
        } catch (e) {
            return false;
        }
    }

    static drawText(ctx, text, x, y, options = {}) {
        try {
            if (!ctx) return;

            const {
                font = '16px Arial',
                color = '#000',
                align = 'left',
                maxWidth = null
            } = options;

            ctx.font = font;
            ctx.fillStyle = color;
            ctx.textAlign = align;

            if (maxWidth) {
                ctx.fillText(text, x, y, maxWidth);
            } else {
                ctx.fillText(text, x, y);
            }
        } catch (e) {
            console.warn('Canvas text drawing error:', e.message);
        }
    }

    static createGradient(ctx, type, ...args) {
        try {
            if (!ctx) return null;

            let gradient;
            if (type === 'linear') {
                gradient = ctx.createLinearGradient(...args);
            } else if (type === 'radial') {
                gradient = ctx.createRadialGradient(...args);
            } else if (type === 'conic') {
                gradient = ctx.createConicGradient(...args);
            }

            return gradient;
        } catch (e) {
            console.warn(`Gradient creation error (${type}):`, e.message);
            return null;
        }
    }

    static downloadCanvas(canvas, filename = 'image.png') {
        try {
            if (!canvas) return;

            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();

            return true;
        } catch (e) {
            console.error('Canvas download error:', e.message);
            window.errorHandler?.handleError(e, 'Canvas Download');
            return false;
        }
    }
}

class SafeAudio {
    static createContext() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn('Web Audio API not supported');
                return null;
            }

            return new AudioContext();
        } catch (e) {
            console.warn('Audio context creation error:', e.message);
            return null;
        }
    }

    static isSupported() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }

    static playTone(audioContext, frequency = 440, duration = 200, type = 'sine') {
        try {
            if (!audioContext) return;

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration / 1000);

            return true;
        } catch (e) {
            console.warn('Audio play error:', e.message);
            return false;
        }
    }

    static playSound(audioContext, notes) {
        if (!audioContext || !Array.isArray(notes)) return;

        try {
            const gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);

            let startTime = audioContext.currentTime;

            notes.forEach(({ frequency, duration }) => {
                const oscillator = audioContext.createOscillator();
                oscillator.connect(gainNode);
                oscillator.frequency.value = frequency;
                oscillator.start(startTime);
                oscillator.stop(startTime + duration / 1000);

                startTime += duration / 1000;
            });
        } catch (e) {
            console.warn('Audio sequence error:', e.message);
        }
    }
}

class SafeFetch {
    static async json(url, options = {}) {
        try {
            const response = await fetch(url, {
                timeout: options.timeout || 10000,
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (e) {
            console.error(`Fetch error for ${url}:`, e.message);
            window.errorHandler?.handleError(e, `Fetch: ${url}`);

            // 폴백 데이터 반환 (있으면)
            return options.fallback || null;
        }
    }

    static async text(url, options = {}) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        } catch (e) {
            console.error(`Fetch text error for ${url}:`, e.message);
            return options.fallback || '';
        }
    }

    static async blob(url, options = {}) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.blob();
        } catch (e) {
            console.error(`Fetch blob error for ${url}:`, e.message);
            return null;
        }
    }

    static async post(url, data, options = {}) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: JSON.stringify(data),
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (e) {
            console.error(`POST error to ${url}:`, e.message);
            window.errorHandler?.handleError(e, `POST: ${url}`);
            return options.fallback || null;
        }
    }
}

class SafeDOM {
    static getElementById(id) {
        try {
            const el = document.getElementById(id);
            if (!el) {
                console.warn(`Element with id '${id}' not found`);
            }
            return el;
        } catch (e) {
            console.error(`getElementById error for '${id}':`, e.message);
            return null;
        }
    }

    static querySelector(selector) {
        try {
            const el = document.querySelector(selector);
            if (!el) {
                console.warn(`Element matching '${selector}' not found`);
            }
            return el;
        } catch (e) {
            console.error(`querySelector error for '${selector}':`, e.message);
            return null;
        }
    }

    static querySelectorAll(selector) {
        try {
            return document.querySelectorAll(selector) || [];
        } catch (e) {
            console.error(`querySelectorAll error for '${selector}':`, e.message);
            return [];
        }
    }

    static addEventListener(element, event, handler, options) {
        try {
            if (!element) return false;
            element.addEventListener(event, handler, options);
            return true;
        } catch (e) {
            console.error(`addEventListener error for '${event}':`, e.message);
            return false;
        }
    }

    static setText(element, text) {
        try {
            if (!element) return false;
            element.textContent = String(text);
            return true;
        } catch (e) {
            console.error('setText error:', e.message);
            return false;
        }
    }

    static setHTML(element, html) {
        try {
            if (!element) return false;
            element.innerHTML = String(html);
            return true;
        } catch (e) {
            console.error('setHTML error:', e.message);
            return false;
        }
    }

    static addClass(element, className) {
        try {
            if (!element) return false;
            element.classList.add(className);
            return true;
        } catch (e) {
            console.error('addClass error:', e.message);
            return false;
        }
    }

    static removeClass(element, className) {
        try {
            if (!element) return false;
            element.classList.remove(className);
            return true;
        } catch (e) {
            console.error('removeClass error:', e.message);
            return false;
        }
    }

    static toggleClass(element, className) {
        try {
            if (!element) return false;
            element.classList.toggle(className);
            return true;
        } catch (e) {
            console.error('toggleClass error:', e.message);
            return false;
        }
    }
}

// 글로벌 네임스페이스
window.SafeCanvas = SafeCanvas;
window.SafeAudio = SafeAudio;
window.SafeFetch = SafeFetch;
window.SafeDOM = SafeDOM;
