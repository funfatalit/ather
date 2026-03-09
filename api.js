// ============================================================
// api.js — с поддержкой email verification
// ============================================================

const API_URL = 'http://localhost:3000/api';

function getToken() {
    return localStorage.getItem('authToken');
}

function setToken(token) {
    if (token) {
        localStorage.setItem('authToken', token);
    }
}

function removeToken() {
    localStorage.removeItem('authToken');
}

const API = {

    // --- Шаг 1: Отправка кода на email ---
    async sendCode(username, email, password) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
            
            const response = await fetch(`${API_URL}/send-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка отправки кода');
            }

            return data;
        } catch (error) {
            console.error('Send code error:', error);
            
            if (error.name === 'AbortError') {
                throw new Error('Превышено время ожидания. Проверьте подключение к серверу.');
            }
            
            if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
                throw new Error('Не удалось подключиться к серверу. Запустите сервер командой: cd backend && npm start');
            }
            
            throw error;
        }
    },

    // --- Шаг 2: Проверка кода и завершение регистрации ---
    async verifyCode(email, code) {
        try {
            const response = await fetch(`${API_URL}/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка проверки кода');
            }

            if (data.token) {
                setToken(data.token);
            }

            return data;
        } catch (error) {
            console.error('Verify code error:', error);
            throw error;
        }
    },

    // --- Повторная отправка кода ---
    async resendCode(email) {
        try {
            const response = await fetch(`${API_URL}/resend-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка отправки кода');
            }

            return data;
        } catch (error) {
            console.error('Resend code error:', error);
            throw error;
        }
    },

    // --- Вход ---
    async login(email, password) {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка входа');
            }

            if (data.token) {
                setToken(data.token);
            }

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // --- Профиль ---
    async getProfile() {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('Требуется авторизация');
            }

            const response = await fetch(`${API_URL}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    removeToken();
                    window.location.href = 'index.html';
                    return;
                }
                throw new Error(data.error || 'Ошибка загрузки профиля');
            }

            return data;
        } catch (error) {
            console.error('Profile error:', error);
            throw error;
        }
    },

    // --- Обновление настроек ---
    async updateSettings(settings) {
        try {
            const token = getToken();
            if (!token) {
                throw new Error('Требуется авторизация');
            }

            const response = await fetch(`${API_URL}/profile/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка обновления настроек');
            }

            return data;
        } catch (error) {
            console.error('Settings update error:', error);
            throw error;
        }
    },

    // --- Выход ---
    logout() {
        removeToken();
        window.location.href = 'index.html';
    },

    // --- Проверка авторизации ---
    isAuthenticated() {
        return !!getToken();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}