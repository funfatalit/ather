// ============================================================
// dashboard.js — исправленная версия
// ============================================================

const API_BASE_URL = 'http://localhost:3000/api';

// --- Утилита: получить токен ---
function getToken() {
    return localStorage.getItem('authToken');
}

// --- Утилита: заголовки для запросов ---
function authHeaders(json = false) {
    const headers = {
        'Authorization': `Bearer ${getToken()}`
    };
    if (json) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

// --- Уведомления (была не определена!) ---
function showNotification(message, type = 'info') {
    // Удаляем старое уведомление, если есть
    const existing = document.getElementById('notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.textContent = message;

    // Базовые стили
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '14px 24px',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '10000',
        opacity: '0',
        transform: 'translateY(-10px)',
        transition: 'all 0.3s ease',
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    });

    // Цвет по типу
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        info: '#3498db',
        warning: '#f39c12'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    // Анимация появления
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    });

    // Автоудаление через 4 секунды
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// --- Переключение вкладок (исправлено: event передаётся явно) ---
function switchTab(tabName, event) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Убираем active у всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Показываем выбранную вкладку
    const targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // Подсвечиваем нажатую кнопку
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// --- Безопасный fetch с проверкой ответа ---
async function apiFetch(url, options = {}) {
    const token = getToken();
    if (!token) {
        throw new Error('Нет токена авторизации');
    }

    const response = await fetch(url, options);

    // Если 401 — токен невалиден
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = 'index.html';
        throw new Error('Сессия истекла');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
}

// --- Fallback API (если api.js не подключён) ---
function getAPI() {
    if (typeof API !== 'undefined' && API.getProfile) {
        return API;
    }

    // Встроенная реализация
    return {
        getProfile() {
            return apiFetch(`${API_BASE_URL}/profile`, {
                headers: authHeaders()
            });
        },

        updateSettings(settings) {
            return apiFetch(`${API_BASE_URL}/settings`, {
                method: 'PUT',
                headers: authHeaders(true),
                body: JSON.stringify(settings)
            });
        },

        logout() {
            localStorage.removeItem('authToken');
            window.location.href = 'index.html';
        }
    };
}

// --- Загрузка данных профиля при старте ---
window.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) {
        console.log('No auth token found, redirecting to login');
        window.location.href = 'index.html';
        return;
    }

    const api = getAPI();

    api.getProfile()
        .then(data => {
            console.log('Profile loaded:', data);

            // Безопасное обновление элементов
            setText('profileUsername', data.username || 'Пользователь');
            setValue('username', data.username || '');
            setValue('email', data.email || '');

            const status = data.profile?.status || 'Активен';
            setText('userStatus', status);
            setText('accountStatus', status);

            if (data.profile?.avatar) {
                const avatarImg = document.getElementById('avatarImg');
                if (avatarImg) avatarImg.src = data.profile.avatar;
            }

            // Статистика
            setText('activeKeys', data.profile?.activeKeys || 0);

            const balance = `${data.profile?.balance || 0} ₽`;
            setText('balance', balance);

            if (data.createdAt) {
                const memberDate = new Date(data.createdAt).toLocaleDateString('ru-RU');
                setText('memberSince', memberDate);
            }

            // Загружаем списки
            loadKeys();
            
            // Проверяем хеш URL для открытия нужной вкладки
            if (window.location.hash === '#shop') {
                const shopBtn = document.querySelector('.tab-btn[onclick*="shop"]');
                if (shopBtn) {
                    shopBtn.click();
                }
            }
        })
        .catch(error => {
            console.error('Failed to load profile:', error);
            localStorage.removeItem('authToken');
            window.location.href = 'index.html';
        });
});

// --- Утилиты для безопасного обновления DOM ---
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

// --- Защита от XSS ---
function escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Загрузка ключей ---
function loadKeys() {
    const keysList = document.getElementById('keysList');
    if (!keysList) return;

    apiFetch(`${API_BASE_URL}/keys`, {
        headers: authHeaders()
    })
    .then(data => {
        if (data.keys && data.keys.length > 0) {
            keysList.innerHTML = data.keys.map(key => `
                <div class="key-card">
                    <div class="key-info">
                        <h4>${escapeHtml(key.name)}</h4>
                        <p>Действует до: ${new Date(key.expiresAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <div class="status-badge" style="
                        border-color: ${key.active ? 'var(--text-main)' : 'var(--border-dim)'};
                        color: ${key.active ? 'var(--text-main)' : 'var(--text-dim)'}
                    ">
                        ${key.active ? 'Активен' : 'Истек'}
                    </div>
                </div>
            `).join('');
        } else {
            keysList.innerHTML = `
                <p style="text-align:center; color:var(--text-dim); padding:40px;">
                    У вас пока нет активированных ключей
                </p>`;
        }
    })
    .catch(error => {
        console.error('Error loading keys:', error);
        keysList.innerHTML = `
            <p style="text-align:center; color:var(--text-dim); padding:40px;">
                Ошибка загрузки ключей
            </p>`;
    });
}

// --- Активация ключа ---
function activateKey(event) {
    event.preventDefault();

    const keyInput = document.getElementById('keyInput');
    if (!keyInput) return;

    const key = keyInput.value.trim();

    if (!key) {
        showNotification('Введите ключ активации', 'error');
        return;
    }

    apiFetch(`${API_BASE_URL}/keys/activate`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ key })
    })
    .then(data => {
        showNotification('Ключ успешно активирован!', 'success');
        keyInput.value = '';
        loadKeys();
        setTimeout(() => location.reload(), 1500);
    })
    .catch(error => {
        showNotification(error.message || 'Ошибка активации ключа', 'error');
        console.error(error);
    });
}

// --- Лаунчер ---
function downloadLauncher() {
    showNotification('Загрузка лаунчера...', 'success');
    setTimeout(() => {
        window.open('https://t.me/nelexyse', '_blank');
    }, 2000);
}

function showLauncherGuide() {
    showNotification(
        'Инструкция: Скачайте → Установите → Войдите → Играйте!',
        'info'
    );
}

function showTopUpModal() {
    showNotification('Для пополнения свяжитесь в Telegram: @nelexyse', 'info');
}

// --- Магазин ---
function buyItem(itemId, price) {
    if (!confirm(`Купить этот товар за ${price} ₽?`)) return;

    apiFetch(`${API_BASE_URL}/shop/buy`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ itemId, price })
    })
    .then(data => {
        showNotification(
            'Покупка успешна! Ключ: ' + (data.key || 'Активирован'),
            'success'
        );
        loadKeys();
        setTimeout(() => location.reload(), 2000);
    })
    .catch(error => {
        showNotification(error.message || 'Ошибка при покупке', 'error');
        console.error(error);
    });
}

// --- Настройки ---
function saveSettings(event) {
    event.preventDefault();

    const username = document.getElementById('username')?.value || '';
    const email = document.getElementById('email')?.value || '';
    const currentPassword = document.getElementById('current-password')?.value || '';
    const newPassword = document.getElementById('new-password')?.value || '';
    const confirmPassword = document.getElementById('confirm-password')?.value || '';

    if (newPassword && newPassword !== confirmPassword) {
        showNotification('Новые пароли не совпадают!', 'error');
        return;
    }

    const settings = { username, email };

    if (newPassword) {
        if (!currentPassword) {
            showNotification('Введите текущий пароль', 'error');
            return;
        }
        settings.currentPassword = currentPassword;
        settings.newPassword = newPassword;
    }

    const api = getAPI();

    api.updateSettings(settings)
        .then(() => {
            showNotification('Настройки сохранены!', 'success');

            // Очищаем поля паролей
            ['current-password', 'new-password', 'confirm-password'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            setTimeout(() => location.reload(), 1500);
        })
        .catch(error => {
            showNotification('Ошибка: ' + (error.message || 'Не удалось сохранить'), 'error');
        });
}

// --- Выход ---
function logout() {
    if (!confirm('Вы уверены, что хотите выйти?')) return;

    const api = getAPI();
    api.logout();
}