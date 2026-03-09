// ============================================================
// РЕГИСТРАЦИЯ С EMAIL ПОДТВЕРЖДЕНИЕМ
// ============================================================

// Временное хранение данных регистрации
let pendingRegistration = {
    email: '',
    username: '',
    password: ''
};

// Таймер для повторной отправки
let resendTimer = null;
let resendCountdown = 60;

// Флаг для предотвращения множественных отправок
let isSubmitting = false;

// --- Шаг 1: Отправка кода ---
function handleRegisterStep1(event) {
    event.preventDefault();
    
    // Защита от повторных отправок
    if (isSubmitting) {
        console.log('Уже отправляется...');
        return;
    }

    const username = document.getElementById('reg-username')?.value?.trim();
    const email = document.getElementById('reg-email')?.value?.trim();
    const password = document.getElementById('reg-password')?.value;
    const passwordConfirm = document.getElementById('reg-confirm-password')?.value;

    // Валидация
    if (!username || !email || !password || !passwordConfirm) {
        showNotification('Все поля обязательны', 'error');
        return;
    }

    if (username.length < 3) {
        showNotification('Имя пользователя минимум 3 символа', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showNotification('Пароли не совпадают!', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showNotification('Введите корректный email', 'error');
        return;
    }

    // Сохраняем данные
    pendingRegistration = { username, email, password };

    // Устанавливаем флаг
    isSubmitting = true;

    // Блокируем кнопку и форму
    const btn = document.getElementById('registerBtn');
    const form = document.getElementById('registerForm');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'ОТПРАВКА...';
    }
    if (form) {
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => input.disabled = true);
    }

    // Отправляем код
    API.sendCode(username, email, password)
        .then(data => {
            showNotification('Код отправлен на ' + (data.email || email), 'success');
            
            // Переключаемся на модалку с кодом
            closeModal('register');
            openVerifyModal(email);
        })
        .catch(error => {
            console.error('Registration error:', error);
            showNotification(error.message || 'Ошибка отправки. Проверьте, запущен ли сервер.', 'error');
        })
        .finally(() => {
            // Снимаем флаг
            isSubmitting = false;
            
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'ПОЛУЧИТЬ КОД';
            }
            if (form) {
                const inputs = form.querySelectorAll('input');
                inputs.forEach(input => input.disabled = false);
            }
        });
}

// --- Открытие модалки подтверждения ---
function openVerifyModal(email) {
    const modal = document.getElementById('verifyModal');
    const emailDisplay = document.getElementById('verifyEmail');
    const codeInput = document.getElementById('verify-code');
    
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    if (emailDisplay) {
        // Маскируем email для отображения
        const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
        emailDisplay.textContent = maskedEmail;
    }
    
    if (codeInput) {
        codeInput.value = '';
        codeInput.focus();
    }
    
    // Запускаем таймер
    startResendTimer();
}

// --- Шаг 2: Проверка кода ---
function handleVerifyCode(event) {
    event.preventDefault();

    const code = document.getElementById('verify-code')?.value?.trim();

    if (!code || code.length !== 6) {
        showNotification('Введите 6-значный код', 'error');
        return;
    }

    const btn = document.getElementById('verifyBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'ПРОВЕРКА...';
    }

    API.verifyCode(pendingRegistration.email, code)
        .then(data => {
            showNotification('Регистрация успешна!', 'success');
            
            // Очищаем данные
            pendingRegistration = { email: '', username: '', password: '' };
            stopResendTimer();
            
            // Закрываем модалку и переходим в профиль
            closeModal('verify');
            
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1000);
        })
        .catch(error => {
            showNotification(error.message, 'error');
            
            // Очищаем поле ввода
            const codeInput = document.getElementById('verify-code');
            if (codeInput) {
                codeInput.value = '';
                codeInput.focus();
            }
        })
        .finally(() => {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'ПОДТВЕРДИТЬ';
            }
        });
}

// --- Повторная отправка кода ---
function handleResendCode() {
    const btn = document.getElementById('resendBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'ОТПРАВКА...';
    }

    API.resendCode(pendingRegistration.email)
        .then(data => {
            showNotification('Новый код отправлен', 'success');
            startResendTimer();
        })
        .catch(error => {
            showNotification(error.message, 'error');
            // Если ошибка с таймером — показываем оставшееся время
            if (error.message.includes('Подождите')) {
                const match = error.message.match(/(\d+)/);
                if (match) {
                    resendCountdown = parseInt(match[1]);
                    startResendTimer();
                }
            }
        })
        .finally(() => {
            if (btn) {
                btn.textContent = 'ОТПРАВИТЬ ПОВТОРНО';
            }
        });
}

// --- Таймер повторной отправки ---
function startResendTimer() {
    stopResendTimer();
    
    resendCountdown = 60;
    const timerText = document.getElementById('resendTimer');
    const timerSeconds = document.getElementById('timerSeconds');
    const resendBtn = document.getElementById('resendBtn');
    
    if (timerText) timerText.style.display = 'block';
    if (resendBtn) resendBtn.disabled = true;
    
    resendTimer = setInterval(() => {
        resendCountdown--;
        
        if (timerSeconds) {
            timerSeconds.textContent = resendCountdown;
        }
        
        if (resendCountdown <= 0) {
            stopResendTimer();
            if (timerText) timerText.style.display = 'none';
            if (resendBtn) resendBtn.disabled = false;
        }
    }, 1000);
}

function stopResendTimer() {
    if (resendTimer) {
        clearInterval(resendTimer);
        resendTimer = null;
    }
}

// --- Вернуться к форме регистрации ---
function backToRegister() {
    closeModal('verify');
    stopResendTimer();
    openModal('register');
    
    // Восстанавливаем введённые данные
    const usernameInput = document.getElementById('reg-username');
    const emailInput = document.getElementById('reg-email');
    
    if (usernameInput) usernameInput.value = pendingRegistration.username;
    if (emailInput) emailInput.value = pendingRegistration.email;
}

// --- Закрытие модалки verify ---
function closeVerifyModal() {
    closeModal('verify');
    stopResendTimer();
}


// ============================================================
// АНИМАЦИЯ ТРЕУГОЛЬНИКОВ НА ФОНЕ
// ============================================================

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let triangles = [];
const triangleCount = 40;
let time = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Рисуем динамическую сетку на фоне
function drawGrid() {
    const gridSize = 80;
    const waveAmplitude = 5;
    const waveFrequency = 0.001;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 0.5;
    
    // Вертикальные линии с волнами
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        for (let y = 0; y <= canvas.height; y += 10) {
            const wave = Math.sin(y * waveFrequency + time * 0.0005 + x * 0.005) * waveAmplitude;
            const xPos = x + wave;
            
            if (y === 0) {
                ctx.moveTo(xPos, y);
            } else {
                ctx.lineTo(xPos, y);
            }
        }
        ctx.stroke();
    }
    
    // Горизонтальные линии с волнами
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 10) {
            const wave = Math.sin(x * waveFrequency + time * 0.0005 + y * 0.005) * waveAmplitude;
            const yPos = y + wave;
            
            if (x === 0) {
                ctx.moveTo(x, yPos);
            } else {
                ctx.lineTo(x, yPos);
            }
        }
        ctx.stroke();
    }
}

class Triangle {
    constructor() {
        this.reset();
        this.y = Math.random() * canvas.height;
        this.opacity = Math.random() * 0.15 + 0.08;
    }

    reset() {
        this.size = Math.random() * 80 + 40;
        this.x = Math.random() * canvas.width;
        this.y = -this.size;
        this.speed = Math.random() * 0.2 + 0.05;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.003;
        this.opacity = Math.random() * 0.15 + 0.08;
        this.rotationY = Math.random() * Math.PI * 2;
        this.rotationYSpeed = (Math.random() - 0.5) * 0.005;
        this.deformX = 1;
        this.deformY = 1;
        this.targetDeformX = 1;
        this.targetDeformY = 1;
    }

    update() {
        // Плавное движение без взаимодействия с курсором
        this.targetDeformX = 1;
        this.targetDeformY = 1;
        
        // Плавная деформация
        this.deformX += (this.targetDeformX - this.deformX) * 0.15;
        this.deformY += (this.targetDeformY - this.deformY) * 0.15;
        
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
        this.rotationY += this.rotationYSpeed;

        if (this.y > canvas.height + this.size) {
            this.reset();
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Применяем деформацию
        ctx.scale(this.deformX, this.deformY);

        const size = this.size;
        const depth = size * 0.4;
        
        // 3D координаты вершин
        const cos = Math.cos(this.rotationY);
        const sin = Math.sin(this.rotationY);
        
        // Передние вершины
        const front = [
            { x: 0, y: -size / 2, z: depth / 2 },
            { x: -size / 2, y: size / 2, z: depth / 2 },
            { x: size / 2, y: size / 2, z: depth / 2 }
        ];
        
        // Задние вершины
        const back = [
            { x: 0, y: -size / 2, z: -depth / 2 },
            { x: -size / 2, y: size / 2, z: -depth / 2 },
            { x: size / 2, y: size / 2, z: -depth / 2 }
        ];
        
        // Применяем 3D вращение и проекцию
        const project = (point) => {
            const x = point.x * cos - point.z * sin;
            const z = point.x * sin + point.z * cos;
            const scale = 200 / (200 + z);
            return { x: x * scale, y: point.y * scale, z: z };
        };
        
        const frontProj = front.map(project);
        const backProj = back.map(project);
        
        // Рисуем задние грани (темнее)
        ctx.fillStyle = `rgba(80, 80, 80, ${this.opacity * 0.4})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.3})`;
        ctx.lineWidth = 1;
        
        // Задняя грань
        ctx.beginPath();
        ctx.moveTo(backProj[0].x, backProj[0].y);
        ctx.lineTo(backProj[1].x, backProj[1].y);
        ctx.lineTo(backProj[2].x, backProj[2].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Боковые грани
        // Левая грань
        ctx.fillStyle = `rgba(120, 120, 120, ${this.opacity * 0.5})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.4})`;
        ctx.beginPath();
        ctx.moveTo(frontProj[1].x, frontProj[1].y);
        ctx.lineTo(backProj[1].x, backProj[1].y);
        ctx.lineTo(backProj[0].x, backProj[0].y);
        ctx.lineTo(frontProj[0].x, frontProj[0].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Правая грань
        ctx.beginPath();
        ctx.moveTo(frontProj[2].x, frontProj[2].y);
        ctx.lineTo(backProj[2].x, backProj[2].y);
        ctx.lineTo(backProj[0].x, backProj[0].y);
        ctx.lineTo(frontProj[0].x, frontProj[0].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Нижняя грань
        ctx.fillStyle = `rgba(100, 100, 100, ${this.opacity * 0.45})`;
        ctx.beginPath();
        ctx.moveTo(frontProj[1].x, frontProj[1].y);
        ctx.lineTo(backProj[1].x, backProj[1].y);
        ctx.lineTo(backProj[2].x, backProj[2].y);
        ctx.lineTo(frontProj[2].x, frontProj[2].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Передняя грань (самая яркая)
        const gradient = ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity * 0.9})`);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${this.opacity * 0.7})`);
        gradient.addColorStop(1, `rgba(200, 200, 200, ${this.opacity * 0.5})`);
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(frontProj[0].x, frontProj[0].y);
        ctx.lineTo(frontProj[1].x, frontProj[1].y);
        ctx.lineTo(frontProj[2].x, frontProj[2].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

function initTriangles() {
    triangles = [];
    for (let i = 0; i < triangleCount; i++) {
        triangles.push(new Triangle());
    }
}

function animate() {
    time++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем динамическую сетку
    drawGrid();

    // Рисуем динамические связи между близкими треугольниками
    for (let i = 0; i < triangles.length; i++) {
        for (let j = i + 1; j < triangles.length; j++) {
            const dx = triangles[i].x - triangles[j].x;
            const dy = triangles[i].y - triangles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 180) {
                const opacity = (1 - distance / 180) * 0.08;
                const pulse = Math.sin(time * 0.002 + i * 0.5) * 0.03;
                
                // Градиентная линия (черно-белая)
                const gradient = ctx.createLinearGradient(
                    triangles[i].x, triangles[i].y,
                    triangles[j].x, triangles[j].y
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity + pulse})`);
                gradient.addColorStop(0.5, `rgba(255, 255, 255, ${(opacity * 1.5 + pulse) * 0.8})`);
                gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity + pulse})`);
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(triangles[i].x, triangles[i].y);
                ctx.lineTo(triangles[j].x, triangles[j].y);
                ctx.stroke();
            }
        }
    }

    triangles.forEach(triangle => {
        triangle.update();
        triangle.draw();
    });

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    resizeCanvas();
    initTriangles();
});

resizeCanvas();
initTriangles();
animate();

// Эффект для header при скролле
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// ============================================================
// МОДАЛЬНЫЕ ОКНА
// ============================================================

function openModal(modalId) {
    const modal = document.getElementById(modalId + 'Modal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId + 'Modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function switchModal(fromModalId, toModalId) {
    closeModal(fromModalId);
    openModal(toModalId);
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================

function handleAuthButton(event) {
    event.preventDefault();
    const token = localStorage.getItem('authToken');
    
    if (token) {
        window.location.href = 'profile.html';
    } else {
        openModal('login');
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    API.login(email, password)
        .then(data => {
            showNotification('Вход выполнен успешно!', 'success');
            closeModal('login');
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1000);
        })
        .catch(error => {
            showNotification(error.message, 'error');
        });
}

function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('reg-username')?.value?.trim();
    const email = document.getElementById('reg-email')?.value?.trim();
    const password = document.getElementById('reg-password')?.value;
    const confirmPassword = document.getElementById('reg-confirm-password')?.value;
    
    if (!username || !email || !password || !confirmPassword) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
        return;
    }
    
    API.register(username, email, password)
        .then(data => {
            showNotification('Регистрация успешна!', 'success');
            closeModal('register');
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1000);
        })
        .catch(error => {
            showNotification(error.message, 'error');
        });
}

// Проверка авторизации при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const authButton = document.getElementById('authButton');
    const heroButtons = document.getElementById('heroButtons');
    
    if (token && authButton) {
        authButton.textContent = 'ПРОФИЛЬ';
        authButton.onclick = (e) => {
            e.preventDefault();
            window.location.href = 'profile.html';
        };
        
        // Меняем кнопки в hero секции
        if (heroButtons) {
            heroButtons.innerHTML = `
                <button class="btn-primary" onclick="window.location.href='profile.html'">ЛИЧНЫЙ КАБИНЕТ</button>
                <button class="btn-secondary" onclick="window.location.href='profile.html#shop'">МАГАЗИН</button>
            `;
        }
    }
});

// Обработка клика по кнопкам магазина
function handleShopClick() {
    const token = localStorage.getItem('authToken');
    
    if (token) {
        // Если авторизован - переходим в профиль на вкладку магазина
        window.location.href = 'profile.html#shop';
    } else {
        // Если не авторизован - показываем окно регистрации
        openModal('register');
    }
}
