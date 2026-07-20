/**
 * Финансовый помощник для самозанятых
 * Логика калькуляторов
 */

// ============================================
// Утилиты
// ============================================

// Разбор суммы из .amount-field — значение приходит с пробелами-разделителями
// разрядов (напр. "1 840 000"), которые parseInt/parseFloat иначе бы обрезали.
// Число должно быть обычным десятичным целым: "1e9", "0x10", "Infinity" и пр.
// Number(...) их примет, поэтому явно отсекаем через регулярку цифр и пробелов.
function parseAmount(value) {
    const cleaned = String(value == null ? '' : value).replace(/\s/g, '');
    if (cleaned === '' || !/^\d+$/.test(cleaned)) return 0;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
}

// Форматирование денег в русской локали (разряды через пробел: 1 500 000).
// Округление — все расчёты дают целые копейки, анализы не показываем.
// Раньше у каждого калькулятора была своя копия, причём contributionCalculator
// забыл Math.round — теперь единая реализация для всех.
function formatMoney(amount) {
    return Math.round(amount).toLocaleString('ru-RU');
}

// Единое экранирование HTML для защиты от XSS (§11.1 дедупликация).
// Раньше дублировалось в concentrationTracker.escapeHtml (стр. ~962)
// и contractGenerator.escapeHtml (стр. ~1723). Используется также
// глобальной window.escapeHtml из js/components.js.
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// ============================================
// Валидация полей ввода
// ============================================

// Показать ошибку под полем ввода
function showFieldError(inputEl, errorEl, message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.add('is-visible');
    inputEl.setAttribute('aria-invalid', 'true');
}

// Скрыть ошибку под полем ввода
function clearFieldError(inputEl, errorEl) {
    if (!errorEl) return;
    errorEl.textContent = '';
    errorEl.classList.remove('is-visible');
    inputEl.removeAttribute('aria-invalid');
}

// Проверка: только цифры и пробелы-разделители (без букв).
// При decimals=true дополнительно разрешаются точка и запятая — для полей,
// где допустимы копейки или дробные значения (часы, ставка в час).
// ИНН и прочие целочисленные поля вызывают без decimals — строгая проверка.
function hasNonDigitChars(value, decimals) {
    const pattern = decimals ? /[^\d\s.,]/ : /[^\d\s]/;
    return pattern.test(value);
}

// Получить error-элемент по input
function getErrorElement(inputId) {
    return document.getElementById(inputId + '-error');
}

// Валидация ИНН: 12 цифр (физлицо) или 10 цифр (юрлицо)
// Возвращает { valid, length }
function validateInn(value) {
    const cleaned = value.replace(/\s/g, '');
    if (cleaned.length === 0) {
        return { valid: true, length: 0, empty: true };
    }
    if (hasNonDigitChars(cleaned)) {
        return { valid: false, length: cleaned.length, nonDigit: true };
    }
    if (cleaned.length !== 10 && cleaned.length !== 12) {
        return { valid: false, length: cleaned.length };
    }
    return { valid: true, length: cleaned.length };
}

// Timestamp для чека
function updateReceiptTimestamp() {
    const timestampEl = document.getElementById('receipt-timestamp');
    if (timestampEl) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        timestampEl.textContent = `${dateStr} ${timeStr}`;
    }
}

// ============================================
// Калькулятор №1: Взносы на больничный
// ============================================

const contributionCalculator = {
    // Константы — из единого конфига rules-2026.js
    get TARIFF() { return window.RULES_2026.socialInsurance.tariff; },
    
    get INSURANCE_AMOUNTS() {
        const amounts = window.RULES_2026.socialInsurance.insuranceAmounts;
        const obj = {};
        amounts.forEach(a => { obj[a] = { payout: a }; });
        return obj;
    },
    
    // Скидки по месяцам — справочно, параметры из конфига rules-2026.js
    get DISCOUNTS() {
        const si = window.RULES_2026.socialInsurance;
        return [
            { month: si.discountMonths10, factor: si.discountFactor10, label: 'Скидка 10%' },
            { month: si.discountMonths30, factor: si.discountFactor30, label: 'Скидка 30%' }
        ];
    },

    // Множитель тарифа для конкретного месяца (1-based).
    // По № 456-ФЗ, ст. 5: скидка с 19-го месяца (18 мес. без больничного),
    // скидка 30% с 25-го (24 мес. без больничного). Счётчик сбрасывается при больничном.
    monthlyFactor(month) {
        const si = window.RULES_2026.socialInsurance;
        if (month >= si.discountMonths30) return si.discountFactor30;   // −30%
        if (month >= si.discountMonths10) return si.discountFactor10;   // −10%
        return 1.0;                                                      // полный тариф
    },
    
    // Расчёт месячного взноса
    calculateMonthlyContribution(insuranceAmount) {
        return Math.round(insuranceAmount * this.TARIFF);
    },
    
    // Итоговая стоимость за horizonMonths месяцев
    calculateTotalCost(insuranceAmount, horizonMonths) {
        const base = insuranceAmount * this.TARIFF;
        let total = 0;
        for (let m = 1; m <= horizonMonths; m++) {
            total += base * this.monthlyFactor(m);
        }
        return Math.round(total);
    },
    
    // Инициализация
    init() {
        this.radioInputs = document.querySelectorAll('input[name="insuranceAmount"]');
        if (this.radioInputs.length === 0) return;

        this.monthlyContributionEl = document.getElementById('monthly-contribution');
        this.payoutAmountEl = document.getElementById('payout-amount');
        this.receiptInsuranceEl = document.getElementById('receipt-insurance');
        this.timelineListEl = document.getElementById('timeline-list');

        this.radioInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.update();
                this.saveState();
                if (window.achievements) window.achievements.unlock('first_calc');
            });
        });
        
        // Восстановление состояния
        this.restoreState();
        
        this.update(true); // firstLoad = true, без анимации
    },
    
    // Сохранение состояния в localStorage
    saveState() {
        try {
            const selectedAmount = document.querySelector('input[name="insuranceAmount"]:checked')?.value;
            if (selectedAmount) {
                localStorage.setItem('fe_insuranceAmount', selectedAmount);
            }
        } catch (e) {
            // Приватный режим или нет localStorage
        }
    },
    
    // Восстановление состояния
    restoreState() {
        try {
            // Приоритет у URL-параметров
            const urlParams = new URLSearchParams(window.location.search);
            const urlInsurance = urlParams.get('insurance');
            
            let savedAmount = null;
            
            if (urlInsurance) {
                savedAmount = urlInsurance;
            } else {
                // Если нет в URL, пробуем localStorage
                savedAmount = localStorage.getItem('fe_insuranceAmount');
            }
            
            if (savedAmount && (savedAmount === '35000' || savedAmount === '50000')) {
                const radio = document.querySelector(`input[name="insuranceAmount"][value="${savedAmount}"]`);
                if (radio) {
                    radio.checked = true;
                }
            }
        } catch (e) {
            // Приватный режим или ошибка парсинга URL
        }
    },
    
    // Обновление расчётов
    update(firstLoad = false) {
        const selectedAmount = parseInt(document.querySelector('input[name="insuranceAmount"]:checked').value);
        const monthlyContribution = this.calculateMonthlyContribution(selectedAmount);
        
        const payoutAfter6 = Math.round(selectedAmount * 0.7);
        const payoutAfter12 = selectedAmount;
        const yearCost = this.calculateTotalCost(selectedAmount, 12);
        
        const whyItems = [
            'Страховая сумма: ' + this.formatMoney(selectedAmount) + ' ₽',
            'Тариф: 3,84% (№ 456-ФЗ, ст. 5)',
            'Взнос в месяц: ' + this.formatMoney(monthlyContribution) + ' ₽',
            'Выплата через 6 мес: ' + this.formatMoney(payoutAfter6) + ' ₽ (70%)',
            'Выплата через 12 мес: ' + this.formatMoney(payoutAfter12) + ' ₽ (100%)',
            'Взнос за год: ' + this.formatMoney(yearCost) + ' ₽'
        ];
        
        const resultsEl = document.getElementById('monthly-result');
        if (resultsEl) {
            resultsEl.innerHTML = this._bflowHtml(
                'Взнос в месяц', this.formatMoney(monthlyContribution) + ' ₽',
                'green', 'Эксперимент СФР',
                'Право на выплату появляется через 6 месяцев непрерывной уплаты. Размер пособия: 70% после 6 мес, 100% после 12 мес.',
                whyItems, { to: 'risk-trudovyh.html', label: 'Оценить, нужно ли это вам' }
            );
        }
        
        // Лента и итоги — сохраняем совместимость с DOM
        this.renderTimeline(monthlyContribution);
        this.renderTotals(selectedAmount);
    },
    
    // Форматирование денег — делегирует к единой утилите
    formatMoney(amount) { return formatMoney(amount); },
    
    // Общий B-flow рендер
    _bflowHtml(label, big, level, riskTitle, riskDesc, whyItems, next) {
        const whyLis = whyItems.map(it => '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + '</span></li>').join('');
        return '' +
            '<div class="b-flow__result-label">' + label + '</div>' +
            '<div class="b-flow__result-big">' + big + '</div>' +
            '<div class="b-flow__why"><div class="b-flow__block-title"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Почему столько</span></div><ul class="b-flow__why-list">' + whyLis + '</ul></div>' +
            '<div class="b-flow__risk b-flow__risk--' + level + '"><div class="b-flow__risk-head"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span class="b-flow__risk-title">' + riskTitle + '</span></div><p class="b-flow__risk-desc">' + riskDesc + '</p></div>' +
            '<a class="b-flow__next" href="' + next.to + '"><span class="b-flow__next-label">' + next.label + '</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>' +
            '<div class="b-flow__trust"><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>По СФР</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Эксперимент 2026–2028</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Без отправки данных</span></span></div>';
    }
};

// ============================================
// Калькулятор №2: Лимит дохода
// ============================================

const incomeCalculator = {
    // Лимит дохода — из единого конфига rules-2026.js
    get INCOME_LIMIT() { return window.RULES_2026.npd.incomeLimit; },
    
    // Месяцы
    MONTHS: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ],
    
    // Инициализация
    init() {
        this.incomeInput = document.getElementById('income-earned');
        if (!this.incomeInput) return;

        this.avgMonthlyInput = document.getElementById('income-avg-monthly');
        this.avgMonthlyGroup = document.getElementById('avg-monthly-group');
        this.monthSelect = document.getElementById('current-month');
        this.resultsEl = document.getElementById('income-results');
        this.modeRadios = document.querySelectorAll('input[name="incomeMode"]');

        this.incomeInput.addEventListener('input', () => {
            this.validateAmount(this.incomeInput, 'income-earned');
            this.calculate();
            this.saveState();
            if (window.achievements) {
                window.achievements.unlock('first_calc');
                window.achievements.unlock('limit_checked');
            }
        });
        this.monthSelect.addEventListener('change', () => {
            this.calculate();
            this.saveState();
        });
        this.avgMonthlyInput.addEventListener('input', () => {
            this.validateAmount(this.avgMonthlyInput, 'income-avg-monthly');
            this.calculate();
            this.saveState();
        });

        this.modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.toggleMode();
                this.calculate();
                this.saveState();
            });
        });
        
        // Восстановление состояния
        this.restoreState();
        // Синхронизировать видимость групп ввода с фактически выбранным режимом
        // (по умолчанию или восстановленным) — не полагаемся на то, что inline
        // display:none в разметке всегда совпадает с чекнутым радио.
        this.toggleMode();
        this.calculate();
    },

    validateAmount(inputEl, inputId) {
        const errorEl = getErrorElement(inputId);
        const raw = inputEl.value.trim();
        if (raw === '') {
            clearFieldError(inputEl, errorEl);
            return;
        }
        if (hasNonDigitChars(raw)) {
            showFieldError(inputEl, errorEl, 'Здесь нужны только цифры — без букв и пробелов.');
            return;
        }
        const value = parseAmount(raw);
        if (value < 0) {
            showFieldError(inputEl, errorEl, 'Сумма не может быть отрицательной. Введите число от 0.');
            return;
        }
        clearFieldError(inputEl, errorEl);
    },

    // Сохранение состояния в localStorage
    saveState() {
        try {
            const state = {
                earned: this.incomeInput.value,
                avgMonthly: this.avgMonthlyInput.value,
                month: this.monthSelect.value,
                mode: document.querySelector('input[name="incomeMode"]:checked')?.value
            };
            localStorage.setItem('fe_incomeState', JSON.stringify(state));
            
            // Обновляем URL без перезагрузки
            this.updateUrl(state);
        } catch (e) {
            // Приватный режим или нет localStorage
        }
    },
    
    // Обновление URL
    updateUrl(state) {
        try {
            const url = new URL(window.location);
            if (state.earned) url.searchParams.set('income', state.earned);
            if (state.month) url.searchParams.set('month', state.month);
            if (state.mode === 'whenLimit' && state.avgMonthly) {
                url.searchParams.set('avgMonthly', state.avgMonthly);
            } else {
                url.searchParams.delete('avgMonthly');
            }
            window.history.replaceState({}, '', url);
        } catch (e) {
            // Ошибка работы с историей
        }
    },
    
    // Восстановление состояния
    restoreState() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            
            // Приоритет у URL-параметров
            if (urlParams.has('income')) {
                this.incomeInput.value = urlParams.get('income');
            }
            if (urlParams.has('month')) {
                this.monthSelect.value = urlParams.get('month');
            }
            if (urlParams.has('avgMonthly')) {
                this.avgMonthlyInput.value = urlParams.get('avgMonthly');
                // Переключить режим если есть avgMonthly в URL
                const whenLimitRadio = document.querySelector('input[name="incomeMode"][value="whenLimit"]');
                if (whenLimitRadio) {
                    whenLimitRadio.checked = true;
                    this.toggleMode();
                }
            } else {
                // Если нет в URL, пробуем localStorage
                const saved = localStorage.getItem('fe_incomeState');
                if (saved) {
                    const state = JSON.parse(saved);
                    if (state.earned) this.incomeInput.value = state.earned;
                    if (state.month) this.monthSelect.value = state.month;
                    if (state.avgMonthly) this.avgMonthlyInput.value = state.avgMonthly;
                    if (state.mode) {
                        const modeRadio = document.querySelector(`input[name="incomeMode"][value="${state.mode}"]`);
                        if (modeRadio) {
                            modeRadio.checked = true;
                            this.toggleMode();
                        }
                    }
                }
            }
        } catch (e) {
            // Приватный режим или ошибка парсинга
        }
    },
    
    // Переключение режима
    toggleMode() {
        const mode = document.querySelector('input[name="incomeMode"]:checked').value;
        if (mode === 'whenLimit') {
            this.avgMonthlyGroup.style.display = 'block';
        } else {
            this.avgMonthlyGroup.style.display = 'none';
        }
    },
    
    // Расчёт
    calculate() {
        const mode = document.querySelector('input[name="incomeMode"]:checked').value;
        const earned = parseAmount(this.incomeInput.value);
        const currentMonth = parseInt(this.monthSelect.value);
        
        if (mode === 'whenLimit') {
            this.calculateWhenLimit(earned, currentMonth);
        } else {
            this.calculateRemaining(earned, currentMonth);
        }
    },
    
    // Расчёт: когда упрусь в лимит
    calculateWhenLimit(earned, currentMonth) {
        const avgMonthly = parseAmount(this.avgMonthlyInput.value);
        
        if (earned === 0 && avgMonthly === 0) {
            this.resultsEl.innerHTML = '<p class="b-flow__empty">Введите доход и средний темп, чтобы увидеть расчёт</p>';
            return;
        }
        
        const remaining = this.INCOME_LIMIT - earned;
        
        if (remaining <= 0) {
            this._renderLimitExceeded(remaining);
            return;
        }
        
        if (avgMonthly === 0) {
            this.resultsEl.innerHTML = '<p class="b-flow__empty">Введите средний доход в месяц</p>';
            return;
        }
        
        const monthsToLimit = Math.floor(remaining / avgMonthly);
        const limitMonth = currentMonth + monthsToLimit;
        
        if (limitMonth > 12) {
            const monthsLeftInYear = 12 - currentMonth;
            const projectedIncome = earned + (avgMonthly * monthsLeftInYear);
            const safetyMargin = this.INCOME_LIMIT - projectedIncome;
            this._renderLimitSafe(earned, remaining, monthsLeftInYear, avgMonthly, safetyMargin);
        } else {
            const limitMonthName = this.MONTHS[limitMonth - 1];
            this._renderLimitWarning(earned, remaining, avgMonthly, monthsToLimit, limitMonthName);
        }
    },

    // Рендер: лимит не грозит в этом году
    _renderLimitSafe(earned, remaining, monthsLeftInYear, avgMonthly, safetyMargin) {
        const earnedPercent = (earned / this.INCOME_LIMIT) * 100;
        const whyItems = [
            'Лимит НПД: 2 400 000 ₽ в год (ФЗ № 422-ФЗ)',
            'Заработано с начала года: ' + this.formatMoney(earned) + ' ₽',
            'Остаток: ' + this.formatMoney(remaining) + ' ₽',
            'При темпе ' + this.formatMoney(avgMonthly) + ' ₽/мес лимит в этом году не исчерпается',
            'Запас на конец года: ' + this.formatMoney(Math.max(0, safetyMargin)) + ' ₽'
        ];
        this.resultsEl.innerHTML = this._bflowHtml(
            'До лимита', this.formatMoney(remaining) + ' ₽',
            'green', 'Рисков нет', 'При текущем темпе лимит 2,4 млн ₽ в этом году не будет превышен.',
            whyItems, earnedPercent, 'accent',
            { to: 'otlozhit-na-nalog.html', label: 'Посчитать налог с дохода' }
        );
    },

    // Рендер: упрётесь в лимит в конкретный месяц
    _renderLimitWarning(earned, remaining, avgMonthly, monthsToLimit, limitMonthName) {
        const earnedPercent = (earned / this.INCOME_LIMIT) * 100;
        const monthsLabel = monthsToLimit === 0 ? 'в этом месяце' : 'через ' + monthsToLimit + ' мес.';
        const whyItems = [
            'Лимит НПД: 2 400 000 ₽ в год (ФЗ № 422-ФЗ)',
            'Заработано: ' + this.formatMoney(earned) + ' ₽, остаток: ' + this.formatMoney(remaining) + ' ₽',
            'Темп: ' + this.formatMoney(avgMonthly) + ' ₽/мес',
            'При таком темпе лимит исчерпается в ' + limitMonthName + ' (' + monthsLabel + ')',
            'При превышении статус НПД слетает с начала месяца превышения'
        ];
        this.resultsEl.innerHTML = this._bflowHtml(
            'До лимита', this.formatMoney(remaining) + ' ₽',
            'amber', 'Близко к лимиту', 'Упрётесь в лимит 2,4 млн ₽ в ' + limitMonthName + '. Планируйте переход на ИП или снижение темпа.',
            whyItems, earnedPercent, 'amber',
            { to: 'ip-ili-samozanyatyy.html', label: 'Оценить переход на ИП' }
        );
    },

    // Рендер: лимит превышен
    _renderLimitExceeded(remaining) {
        const whyItems = [
            'Лимит НПД: 2 400 000 ₽ в год (ФЗ № 422-ФЗ)',
            'Превышение на ' + this.formatMoney(Math.abs(remaining)) + ' ₽',
            'Статус НПД аннулируется с начала месяца превышения',
            'Проверьте начисления в приложении «Мой налог»'
        ];
        this.resultsEl.innerHTML = this._bflowHtml(
            'Превышение лимита', '−' + this.formatMoney(Math.abs(remaining)) + ' ₽',
            'red', 'Лимит превышен', 'Статус НПД может быть аннулирован. Проверьте начисления в приложении «Мой налог» и переходите на ИП.',
            whyItems, 100, 'red',
            { to: 'ip-ili-samozanyatyy.html', label: 'Перейти на ИП — сравнение' }
        );
    },

    // Общий B-flow рендер для incomeCalculator
    _bflowHtml(label, big, level, riskTitle, riskDesc, whyItems, progressPercent, progressLevel, next) {
        const whyLis = whyItems.map(it => '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + '</span></li>').join('');
        const riskIcon = level === 'green' ? '<path d="M20 6 9 17l-5-5"/>' : (level === 'amber' ? '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>' : '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>');
        return '' +
            '<div class="b-flow__result-label">' + label + '</div>' +
            '<div class="b-flow__result-big">' + big + '</div>' +
            '<div class="b-flow__progress"><div class="b-flow__progress-bar"><div class="b-flow__progress-fill b-flow__progress-fill--' + progressLevel + '" style="width:' + Math.min(progressPercent, 100) + '%"></div></div><span class="b-flow__progress-text">' + progressPercent.toFixed(1) + '% из 2,4 млн ₽</span></div>' +
            '<div class="b-flow__why"><div class="b-flow__block-title"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Почему столько</span></div><ul class="b-flow__why-list">' + whyLis + '</ul></div>' +
            '<div class="b-flow__risk b-flow__risk--' + level + '"><div class="b-flow__risk-head"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + riskIcon + '</svg><span class="b-flow__risk-title">' + riskTitle + '</span></div><p class="b-flow__risk-desc">' + riskDesc + '</p></div>' +
            '<a class="b-flow__next" href="' + next.to + '"><span class="b-flow__next-label">' + next.label + '</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>' +
            '<div class="b-flow__trust"><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>По лимиту ФНС</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Актуально на июль 2026</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Без отправки данных</span></span></div>';
    },
    
    // Расчёт: сколько ещё можно заработать
    calculateRemaining(earned, currentMonth) {
        if (earned === 0) {
            this.resultsEl.innerHTML = '<p class="b-flow__empty">Введите доход с начала года, чтобы увидеть расчёт</p>';
            return;
        }
        
        const remaining = this.INCOME_LIMIT - earned;
        const monthsLeft = 12 - currentMonth + 1;
        const safePace = monthsLeft > 0 ? remaining / monthsLeft : 0;
        const earnedPercent = (earned / this.INCOME_LIMIT) * 100;
        
        if (remaining < 0) {
            this._renderLimitExceeded(remaining);
        } else if (earnedPercent >= 80) {
            const whyItems = [
                'Лимит НПД: 2 400 000 ₽ в год (ФЗ № 422-ФЗ)',
                'Заработано: ' + this.formatMoney(earned) + ' ₽ (' + earnedPercent.toFixed(1) + '% от лимита)',
                'Остаток: ' + this.formatMoney(remaining) + ' ₽',
                'Осталось месяцев: ' + monthsLeft,
                'Безопасный темп: ' + (remaining > 0 ? this.formatMoney(Math.round(safePace)) : '0') + ' ₽/мес'
            ];
            this.resultsEl.innerHTML = this._bflowHtml(
                'До лимита', this.formatMoney(remaining) + ' ₽',
                'amber', 'Близко к лимиту', 'Использовано ' + earnedPercent.toFixed(0) + '% лимита. Будьте внимательны с доходами — при превышении статус НПД слетает.',
                whyItems, earnedPercent, 'amber',
                { to: 'ip-ili-samozanyatyy.html', label: 'Оценить переход на ИП' }
            );
        } else {
            const whyItems = [
                'Лимит НПД: 2 400 000 ₽ в год (ФЗ № 422-ФЗ)',
                'Заработано: ' + this.formatMoney(earned) + ' ₽ (' + earnedPercent.toFixed(1) + '% от лимита)',
                'Остаток: ' + this.formatMoney(remaining) + ' ₽',
                'Осталось месяцев: ' + monthsLeft,
                'Безопасный темп: ' + this.formatMoney(Math.round(safePace)) + ' ₽/мес'
            ];
            this.resultsEl.innerHTML = this._bflowHtml(
                'До лимита', this.formatMoney(remaining) + ' ₽',
                'green', 'Рисков нет', 'Можно заработать ещё ' + this.formatMoney(remaining) + ' ₽ до конца года без риска статуса НПД.',
                whyItems, earnedPercent, 'accent',
                { to: 'otlozhit-na-nalog.html', label: 'Посчитать налог с дохода' }
            );
        }
    },
    
    // Форматирование денег — делегирует к единой утилите
    formatMoney(amount) { return formatMoney(amount); }
};

// ============================================
// Калькулятор №3: Самозанятый или ИП
// ============================================

const ipCalculator = {
    // Параметры — из единого конфига rules-2026.js
    get RULES_2026() { return window.RULES_2026; },

    calculateIpContributions(revenue) {
        const r = this.RULES_2026.ipUsn;
        const additional = Math.min(
            r.additionalRate * Math.max(0, revenue - r.additionalThreshold),
            r.additionalCap
        );
        return r.fixedContribution + additional;
    },

    calculateIpTotalCost(revenue) {
        const tax = revenue * this.RULES_2026.ipUsn.rateIncome;
        const contributions = this.calculateIpContributions(revenue);
        // Без сотрудников взносы уменьшают налог до нуля — итог max(налог, взносы)
        return Math.max(tax, contributions);
    },

    calculateNpdCost(revenue, clientType) {
        const r = this.RULES_2026.npd;
        const rate = clientType === 'business' ? r.rateCompanies : r.rateIndividuals;
        return revenue * rate;
    },

    compare(revenue, clientType) {
        return {
            npd: Math.round(this.calculateNpdCost(revenue, clientType)),
            ip: Math.round(this.calculateIpTotalCost(revenue)),
            ipContributions: Math.round(this.calculateIpContributions(revenue)),
            overLimit: revenue > this.RULES_2026.npd.incomeLimit
        };
    },

    init() {
        this.revenueInput = document.getElementById('ip-revenue');
        this.clientTypeRadios = document.querySelectorAll('input[name="clientType"]');
        this.resultsEl = document.getElementById('ip-results');

        if (!this.revenueInput) return;

        this.revenueInput.addEventListener('input', () => {
            this.validateAmount(this.revenueInput, 'ip-revenue');
            this.calculate();
            if (window.achievements) window.achievements.unlock('first_calc');
        });
        this.clientTypeRadios.forEach(r => r.addEventListener('change', () => this.calculate()));
    },

    validateAmount(inputEl, inputId) {
        const errorEl = getErrorElement(inputId);
        const raw = inputEl.value.trim();
        if (raw === '') {
            clearFieldError(inputEl, errorEl);
            return;
        }
        if (hasNonDigitChars(raw)) {
            showFieldError(inputEl, errorEl, 'Здесь нужны только цифры — без букв и пробелов.');
            return;
        }
        const value = parseAmount(raw);
        if (value < 0) {
            showFieldError(inputEl, errorEl, 'Сумма не может быть отрицательной. Введите число от 0.');
            return;
        }
        clearFieldError(inputEl, errorEl);
    },

    calculate() {
        const revenue = parseAmount(this.revenueInput.value);
        if (revenue === 0) {
            this.resultsEl.innerHTML = '<p class="b-flow__empty">Введите годовой доход, чтобы увидеть сравнение</p>';
            return;
        }
        const clientType = document.querySelector('input[name="clientType"]:checked').value;
        this.renderResults(this.compare(revenue, clientType));
    },

    renderResults(result) {
        if (result.overLimit) {
            const whyItems = [
                'Годовой доход: ' + formatMoney(this.revenueInput.value.replace(/\D/g, '')) + ' ₽',
                'Лимит НПД: 2 400 000 ₽ в год',
                'Превышение лимита — статус НПД аннулируется',
                'ИП на УСН 6% — единственный вариант'
            ];
            this.resultsEl.innerHTML = this._bflowHtml(
                'НПД недоступен', 'Лимит превышен',
                'red', 'Лимит НПД',
                'При доходе свыше 2 400 000 ₽ самозанятость невозможна. ИП на УСН 6% — единственный вариант.',
                whyItems, { to: 'otlozhit-na-nalog.html', label: 'Посчитать налог для ИП' }
            );
            return;
        }

        const diff = result.ip - result.npd;
        const cheaperLabel = diff >= 0 ? 'НПД дешевле' : 'ИП дешевле';
        const level = diff >= 0 ? 'green' : 'accent';
        const whyItems = [
            'Годовой доход: ' + formatMoney(this.revenueInput.value.replace(/\D/g, '')) + ' ₽',
            'НПД: ' + this.formatMoney(result.npd) + ' ₽',
            'ИП на УСН 6%: ' + this.formatMoney(result.ip) + ' ₽ (взносы ' + this.formatMoney(result.ipContributions) + ' ₽ + налог)',
            'Взносы ИП уменьшают налог до нуля',
            'Разница: ' + this.formatMoney(Math.abs(diff)) + ' ₽'
        ];

        this.resultsEl.innerHTML = this._bflowHtml(
            cheaperLabel, this.formatMoney(Math.abs(diff)) + ' ₽',
            level, 'Итого',
            diff >= 0
                ? 'НПД дешевле на ' + this.formatMoney(diff) + ' ₽ — нет фиксированных взносов.'
                : 'ИП дешевле на ' + this.formatMoney(Math.abs(diff)) + ' ₽ — взносы уменьшают налог УСН.',
            whyItems, { to: 'otlozhit-na-nalog.html', label: 'Посчитать налог' }
        );
    },

    _bflowHtml(label, big, level, riskTitle, riskDesc, whyItems, next) {
        const whyLis = whyItems.map(it => '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + '</span></li>').join('');
        return '' +
            '<div class="b-flow__result-label">' + label + '</div>' +
            '<div class="b-flow__result-big">' + big + '</div>' +
            '<div class="b-flow__why"><div class="b-flow__block-title"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Почему столько</span></div><ul class="b-flow__why-list">' + whyLis + '</ul></div>' +
            '<div class="b-flow__risk b-flow__risk--' + level + '"><div class="b-flow__risk-head"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span class="b-flow__risk-title">' + riskTitle + '</span></div><p class="b-flow__risk-desc">' + riskDesc + '</p></div>' +
            '<a class="b-flow__next" href="' + next.to + '"><span class="b-flow__next-label">' + next.label + '</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>' +
            '<div class="b-flow__trust"><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>По ставкам ФНС</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Актуально на июль 2026</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Без отправки данных</span></span></div>';
    },

    formatMoney(amount) { return formatMoney(amount); }
};

// ============================================
// Калькулятор №4: Пенсионный стаж (ОПС)
// ============================================

const pensionCalculator = {
    // Стоимость года стажа — из единого конфига rules-2026.js
    get FULL_YEAR_COST_2026() { return window.RULES_2026.pension.fullYearCost; },
    get MROT_2026() { return window.RULES_2026.pension.mrot; },

    costForMonths(months) {
        return Math.round(this.FULL_YEAR_COST_2026 * (months / 12));
    },

    monthsForPayment(amount) {
        return Math.round((amount / this.FULL_YEAR_COST_2026) * 12 * 10) / 10;
    },

    init() {
        this.modeRadios = document.querySelectorAll('input[name="pensionMode"]');
        this.monthsGroup = document.getElementById('pension-months-group');
        this.amountGroup = document.getElementById('pension-amount-group');
        this.monthsInput = document.getElementById('pension-months');
        this.amountInput = document.getElementById('pension-amount');
        this.resultsEl = document.getElementById('pension-results');

        if (!this.monthsInput) return;

        this.modeRadios.forEach(r => r.addEventListener('change', () => {
            this.toggleMode();
            this.calculate();
        }));
        this.monthsInput.addEventListener('input', () => {
            this.validateAmount(this.monthsInput, 'pension-months');
            this.calculate();
            if (window.achievements) window.achievements.unlock('first_calc');
        });
        this.amountInput.addEventListener('input', () => {
            this.validateAmount(this.amountInput, 'pension-amount');
            this.calculate();
        });

        // Синхронизировать видимость групп ввода с фактически выбранным радио при загрузке
        this.toggleMode();
    },

    validateAmount(inputEl, inputId) {
        const errorEl = getErrorElement(inputId);
        const raw = inputEl.value.trim();
        if (raw === '') {
            clearFieldError(inputEl, errorEl);
            return;
        }
        if (hasNonDigitChars(raw)) {
            showFieldError(inputEl, errorEl, 'Здесь нужны только цифры — без букв и пробелов.');
            return;
        }
        const value = parseAmount(raw);
        if (value < 0) {
            showFieldError(inputEl, errorEl, 'Сумма не может быть отрицательной. Введите число от 0.');
            return;
        }
        clearFieldError(inputEl, errorEl);
    },

    toggleMode() {
        const mode = document.querySelector('input[name="pensionMode"]:checked').value;
        if (mode === 'costForMonths') {
            this.monthsGroup.style.display = 'block';
            this.amountGroup.style.display = 'none';
        } else {
            this.monthsGroup.style.display = 'none';
            this.amountGroup.style.display = 'block';
        }
    },

    calculate() {
        const mode = document.querySelector('input[name="pensionMode"]:checked').value;

        if (mode === 'costForMonths') {
            const months = parseAmount(this.monthsInput.value);
            if (months === 0) {
                this.resultsEl.innerHTML = '<p class="b-flow__empty">Введите количество месяцев</p>';
                return;
            }
            const cost = this.costForMonths(months);
            const pct = (months / 12) * 100;
            const whyItems = [
                'Стоимость года стажа (2026): ' + this.formatMoney(this.FULL_YEAR_COST_2026) + ' ₽',
                'МРОТ 2026: ' + this.formatMoney(this.MROT_2026) + ' ₽',
                'Формула: 22% × 12 × МРОТ',
                'Стаж: ' + months + ' мес.',
                'Стоимость: ' + this.formatMoney(cost) + ' ₽'
            ];
            this.resultsEl.innerHTML = this._bflowHtml(
                'Стоимость стажа', this.formatMoney(cost) + ' ₽',
                'green', 'Расчёт корректен',
                'Сумма актуальна на 2026 год. Ежегодно индексируется вместе с МРОТ — обновляйте расчёт в январе.',
                whyItems, { to: 'bolnichny.html', label: 'Сравнить с больничным' }
            );
            if (window.renderPensionProgress) window.renderPensionProgress(months);
        } else {
            const amount = parseAmount(this.amountInput.value);
            if (amount === 0) {
                this.resultsEl.innerHTML = '<p class="b-flow__empty">Введите сумму взноса</p>';
                return;
            }
            const months = this.monthsForPayment(amount);
            const whyItems = [
                'Стоимость года стажа (2026): ' + this.formatMoney(this.FULL_YEAR_COST_2026) + ' ₽',
                'МРОТ 2026: ' + this.formatMoney(this.MROT_2026) + ' ₽',
                'Взнос: ' + this.formatMoney(amount) + ' ₽',
                'Стаж: ' + months + ' мес.',
                'Формула: (взнос ÷ годовой × 12)'
            ];
            this.resultsEl.innerHTML = this._bflowHtml(
                'Стаж за сумму', months + ' мес.',
                'green', 'Расчёт корректен',
                'Сумма актуальна на 2026 год. Ежегодно индексируется вместе с МРОТ — обновляйте расчёт в январе.',
                whyItems, { to: 'bolnichny.html', label: 'Сравнить с больничным' }
            );
            if (window.renderPensionProgress) window.renderPensionProgress(months);
        }
    },

    _bflowHtml(label, big, level, riskTitle, riskDesc, whyItems, next) {
        const whyLis = whyItems.map(it => '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + '</span></li>').join('');
        return '' +
            '<div class="b-flow__result-label">' + label + '</div>' +
            '<div class="b-flow__result-big">' + big + '</div>' +
            '<div class="b-flow__why"><div class="b-flow__block-title"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Почему столько</span></div><ul class="b-flow__why-list">' + whyLis + '</ul></div>' +
            '<div class="b-flow__risk b-flow__risk--' + level + '"><div class="b-flow__risk-head"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span class="b-flow__risk-title">' + riskTitle + '</span></div><p class="b-flow__risk-desc">' + riskDesc + '</p></div>' +
            '<a class="b-flow__next" href="' + next.to + '"><span class="b-flow__next-label">' + next.label + '</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>' +
            '<div class="b-flow__trust"><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>По ставкам СФР</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Актуально на июль 2026</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Без отправки данных</span></span></div>';
    },

    formatMoney(amount) { return formatMoney(amount); }
};

// ============================================
// Трекер концентрации дохода от одного клиента
// ============================================

const concentrationTracker = {
    rowCount: 0,

    calculate(sources) {
        const total = sources.reduce((sum, s) => sum + s.monthlyIncome, 0);
        return sources.map(s => {
            const share = total > 0 ? Math.round((s.monthlyIncome / total) * 100) : 0;
            const risky = share >= 70 && s.monthsWorking >= 6;
            return { ...s, share, risky };
        });
    },

    formatMoney(n) { return formatMoney(n); },

    // Экранирование HTML — делегирует к единой глобальной escapeHtml (§11.1)
    escapeHtml(str) {
        return escapeHtml(str);
    },

    // Экранирование для HTML-атрибута (двойная кавычка в value="...").
    // Используется в addRow для подстановки сохранённого имени в value="${...}".
    escapeAttr(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    addRow(name = '', income = '', months = '') {
        const tbody = document.getElementById('concentration-tbody');
        if (!tbody) return;
        this.rowCount++;
        const id = this.rowCount;
        const tr = document.createElement('tr');
        tr.className = 'concentration-row';
        tr.dataset.rowId = id;
        // name — свободный текст, экранируем для атрибута value="..."
        const safeName = this.escapeAttr(name);
        tr.innerHTML = `
            <td><input type="text" class="c-name" placeholder="Клиент ${id}" value="${safeName}" aria-label="Название клиента"></td>
            <td>
                <input type="number" class="c-income" placeholder="0" min="0" value="${income}" aria-label="Доход в месяц, ₽">
                <span class="amount-field__error c-income-error" role="alert"></span>
            </td>
            <td>
                <input type="number" class="c-months" placeholder="1" min="1" max="120" value="${months}" aria-label="Месяцев сотрудничества">
                <span class="amount-field__error c-months-error" role="alert"></span>
            </td>
            <td class="concentration-share" data-share=""></td>
            <td><button type="button" class="btn-delete-row" title="Удалить строку" aria-label="Удалить строку клиента">×</button></td>
        `;
        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            this.recalculate();
        });
        ['.c-name', '.c-income', '.c-months'].forEach(sel => {
            const el = tr.querySelector(sel);
            el.addEventListener('input', () => {
                this.validateRowInput(el, sel);
                this.recalculate();
            });
        });
        tbody.appendChild(tr);
        this.recalculate();
    },

    validateRowInput(el, selector) {
        const errorClass = selector === '.c-income' ? 'c-income-error' : 'c-months-error';
        const errorEl = el.parentElement.querySelector('.' + errorClass);
        const raw = el.value.trim();
        if (raw === '') {
            clearFieldError(el, errorEl);
            return;
        }
        if (hasNonDigitChars(raw)) {
            showFieldError(el, errorEl, 'Здесь нужны только цифры — без букв и пробелов.');
            return;
        }
        const value = parseInt(raw, 10);
        if (isNaN(value) || value < 0) {
            showFieldError(el, errorEl, 'Сумма не может быть отрицательной. Введите число от 0.');
            return;
        }
        clearFieldError(el, errorEl);
    },

    recalculate() {
        const tbody = document.getElementById('concentration-tbody');
        const resultsEl = document.getElementById('concentration-results');
        if (!tbody || !resultsEl) return;

        const rows = Array.from(tbody.querySelectorAll('.concentration-row'));
        if (rows.length === 0) {
            resultsEl.innerHTML = '<p class="b-flow__empty">Добавьте клиентов, чтобы увидеть расчёт</p>';
            return;
        }

        const sources = rows.map(tr => ({
            name: tr.querySelector('.c-name').value.trim() || 'Клиент',
            monthlyIncome: parseFloat(tr.querySelector('.c-income').value) || 0,
            monthsWorking: parseInt(tr.querySelector('.c-months').value) || 0
        }));

        const results = this.calculate(sources);
        const total = results.reduce((s, r) => s + r.monthlyIncome, 0);
        const hasRisk = results.some(r => r.risky);

        rows.forEach((tr, i) => {
            const r = results[i];
            const shareCell = tr.querySelector('.concentration-share');
            tr.classList.toggle('risky', r.risky);
            tr.classList.toggle('concentration-row-safe', !r.risky && r.share > 0);
            if (r.monthlyIncome > 0) {
                shareCell.innerHTML = r.share + '%' + (r.risky ? '<span class="concentration-risk-badge">риск</span>' : '');
            } else {
                shareCell.textContent = '—';
            }
        });

        if (total === 0) {
            resultsEl.innerHTML = '<p class="b-flow__empty">Введите доход по каждому клиенту</p>';
            if (window.renderConcentrationProgress) window.renderConcentrationProgress(0);
            return;
        }

        // Найдем максимальную долю
        const maxResult = results.length > 0 ? results.reduce((a, b) => a.share > b.share ? a : b) : { name: '—', share: 0, risky: false };
        const maxShare = maxResult.share;
        const level = maxShare >= 70 ? 'red' : (maxShare >= 50 ? 'amber' : 'green');
        const riskTitle = maxShare >= 70 ? 'Высокий риск' : (maxShare >= 50 ? 'Средний риск' : 'Рисков нет');
        const riskDesc = maxShare >= 70
            ? 'Один из клиентов занимает ≥70% дохода при сотрудничестве ≥6 месяцев — это признак риска переквалификации отношений в трудовые.'
            : (maxShare >= 50
                ? 'Доля одного клиента близка к критической. Диверсифицируйте источники дохода, чтобы снизить риск.'
                : 'Доля крупнейшего клиента в пределах нормы. Продолжайте диверсифицировать доход.');

        const whyItems = [
            'Общий доход в месяц: ' + this.formatMoney(total) + ' ₽',
            'Клиентов: ' + results.filter(r => r.monthlyIncome > 0).length,
            'Крупнейший: ' + (maxResult.name || '—') + ' — ' + maxShare + '%',
            ...results.filter(r => r.monthlyIncome > 0).map(r => '• ' + (r.name || 'Клиент') + ': ' + r.share + '%')
        ];

        resultsEl.innerHTML = this._bflowHtml(
            'Концентрация', maxShare + '%',
            level, riskTitle, riskDesc, whyItems,
            { to: 'dogovor-akt.html', label: 'Шаблон договора' }
        );

        // Аддитивный рендер прогресс-бара по уже посчитанной доле крупнейшего клиента
        if (window.renderConcentrationProgress) {
            window.renderConcentrationProgress(maxShare);
        }
    },

    _bflowHtml(label, big, level, riskTitle, riskDesc, whyItems, next) {
        const whyLis = whyItems.map(it => '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + '</span></li>').join('');
        const riskIcon = level === 'green' ? '<path d="M20 6 9 17l-5-5"/>' : (level === 'amber' ? '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>' : '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>');
        return '' +
            '<div class="b-flow__result-label">' + label + '</div>' +
            '<div class="b-flow__result-big">' + big + '</div>' +
            '<div class="b-flow__why"><div class="b-flow__block-title"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Почему столько</span></div><ul class="b-flow__why-list">' + whyLis + '</ul></div>' +
            '<div class="b-flow__risk b-flow__risk--' + level + '"><div class="b-flow__risk-head"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + riskIcon + '</svg><span class="b-flow__risk-title">' + riskTitle + '</span></div><p class="b-flow__risk-desc">' + riskDesc + '</p></div>' +
            '<a class="b-flow__next" href="' + next.to + '"><span class="b-flow__next-label">' + next.label + '</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>' +
            '<div class="b-flow__trust"><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>По признакам ФНС</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Актуально на июль 2026</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Без отправки данных</span></span></div>';
    },

    init() {
        const addBtn = document.getElementById('btn-add-client');
        if (!addBtn) return;
        addBtn.addEventListener('click', () => this.addRow());
        this.addRow('Клиент А', '', '');
        this.addRow('Клиент Б', '', '');
    }
};

// ============================================
// Счётчик налогового вычета 10 000 ₽
// ============================================

const deductionCalculator = {
    // Параметры вычета — из единого конфига rules-2026.js
    get BONUS_TOTAL() { return window.RULES_2026.npd.deductionLimit; },
    get RATE_REDUCTION_INDIVIDUAL() {
        return window.RULES_2026.npd.rateIndividuals - window.RULES_2026.npd.rateIndividualsDeducted;
    },
    get RATE_REDUCTION_BUSINESS() {
        return window.RULES_2026.npd.rateCompanies - window.RULES_2026.npd.rateCompaniesDeducted;
    },

    calculateUsed(incomeIndividual, incomeBusiness) {
        const used = incomeIndividual * this.RATE_REDUCTION_INDIVIDUAL
                   + incomeBusiness * this.RATE_REDUCTION_BUSINESS;
        return Math.min(Math.round(used), this.BONUS_TOTAL);
    },

    remaining(incomeIndividual, incomeBusiness) {
        return this.BONUS_TOTAL - this.calculateUsed(incomeIndividual, incomeBusiness);
    },

    formatMoney(n) { return formatMoney(n); },

    render() {
        const indInput = document.getElementById('deduction-individual');
        const bizInput = document.getElementById('deduction-business');
        const resultsEl = document.getElementById('deduction-results');
        if (!indInput || !resultsEl) return;

        const ind = parseAmount(indInput.value);
        const biz = parseAmount(bizInput ? bizInput.value : '');

        if (ind === 0 && biz === 0) {
            resultsEl.innerHTML = '<p class="b-flow__empty">Введите доход с момента регистрации</p>';
            return;
        }

        const used = this.calculateUsed(ind, biz);
        const rem = this.BONUS_TOTAL - used;
        const pct = Math.min(Math.round((used / this.BONUS_TOTAL) * 100), 100);
        const exhausted = used >= this.BONUS_TOTAL;
        const rateLabel = exhausted ? '4% / 6%' : (ind > 0 ? '3% / 4%' : '3% / 4%');
        const level = exhausted ? 'amber' : 'green';
        const riskTitle = exhausted ? 'Вычет исчерпан' : 'Вычет работает';
        const riskDesc = exhausted
            ? 'Вычет исчерпан — ставка стандартная: 4% с физлиц, 6% с юрлиц/ИП.'
            : 'Скидка работает: 3% с физлиц, 4% с юрлиц/ИП. Остаток: ' + this.formatMoney(rem) + ' ₽.';

        const whyItems = [
            'Единовременный вычет: ' + this.formatMoney(this.BONUS_TOTAL) + ' ₽',
            'Доход от физлиц: ' + this.formatMoney(ind) + ' ₽',
            'Доход от юрлиц/ИП: ' + this.formatMoney(biz) + ' ₽',
            'Использовано: ' + this.formatMoney(used) + ' ₽ (' + pct + '%)',
            'Осталось: ' + this.formatMoney(rem) + ' ₽',
            'Текущая ставка: ' + rateLabel
        ];

        resultsEl.innerHTML = this._bflowHtml(
            'Остаток вычета', this.formatMoney(rem) + ' ₽',
            level, riskTitle, riskDesc, whyItems,
            { to: 'otlozhit-na-nalog.html', label: 'Посчитать налог со ставки' }
        );
    },

    init() {
        const indInput = document.getElementById('deduction-individual');
        if (!indInput) return;
        const bizInput = document.getElementById('deduction-business');

        indInput.addEventListener('input', () => {
            this.validateAmount(indInput, 'deduction-individual');
            this.render();
        });
        if (bizInput) {
            bizInput.addEventListener('input', () => {
                this.validateAmount(bizInput, 'deduction-business');
                this.render();
            });
        }
    },

    validateAmount(inputEl, inputId) {
        const errorEl = getErrorElement(inputId);
        const raw = inputEl.value.trim();
        if (raw === '') {
            clearFieldError(inputEl, errorEl);
            return;
        }
        if (hasNonDigitChars(raw)) {
            showFieldError(inputEl, errorEl, 'Здесь нужны только цифры — без букв и пробелов.');
            return;
        }
        const value = parseAmount(raw);
        if (value < 0) {
            showFieldError(inputEl, errorEl, 'Сумма не может быть отрицательной. Введите число от 0.');
            return;
        }
        clearFieldError(inputEl, errorEl);
    },

    _bflowHtml(label, big, level, riskTitle, riskDesc, whyItems, next) {
        const whyLis = whyItems.map(it => '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + '</span></li>').join('');
        return '' +
            '<div class="b-flow__result-label">' + label + '</div>' +
            '<div class="b-flow__result-big">' + big + '</div>' +
            '<div class="b-flow__why"><div class="b-flow__block-title"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Почему столько</span></div><ul class="b-flow__why-list">' + whyLis + '</ul></div>' +
            '<div class="b-flow__risk b-flow__risk--' + level + '"><div class="b-flow__risk-head"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span class="b-flow__risk-title">' + riskTitle + '</span></div><p class="b-flow__risk-desc">' + riskDesc + '</p></div>' +
            '<a class="b-flow__next" href="' + next.to + '"><span class="b-flow__next-label">' + next.label + '</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>' +
            '<div class="b-flow__trust"><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>По ФНС</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Актуально на июль 2026</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Без отправки данных</span></span></div>';
    }
};

// ============================================
// Калькулятор №7: Отложить на налог
// ============================================

const setAsideCalculator = {
    // Ставки — из единого конфига rules-2026.js
    get RATE_INDIVIDUAL() { return window.RULES_2026.npd.rateIndividuals; },
    get RATE_BUSINESS() { return window.RULES_2026.npd.rateCompanies; },
    // Льготные ставки с учётом вычета 10 000 ₽: 4%→3% для физлиц, 6%→4% для юрлиц/ИП
    get RATE_INDIVIDUAL_DEDUCTED() { return window.RULES_2026.npd.rateIndividualsDeducted; },
    get RATE_BUSINESS_DEDUCTED() { return window.RULES_2026.npd.rateCompaniesDeducted; },

    // deductionRemaining — сколько ₽ вычета ещё не использовано (0, если исчерпан)
    //
    // Формулы по ТЗ:
    //   Налог без вычета = сумма × стандартная ставка
    //   Потенциальная экономия = сумма × (стандартная ставка − льготная ставка)
    //   Используемый вычет = min(остаток вычета, потенциальная экономия)
    //   Налог к резервированию = налог без вычета − используемый вычет
    calculate(paymentAmount, clientType, deductionRemaining = 0) {
        // Нормализация входных данных — защита от отрицательных и некорректных значений
        paymentAmount = Math.max(0, Math.round(paymentAmount || 0));
        const maxDeduction = window.RULES_2026.npd.deductionLimit;
        deductionRemaining = Math.max(0, Math.min(deductionRemaining || 0, maxDeduction));

        const baseRate = clientType === 'business' ? this.RATE_BUSINESS : this.RATE_INDIVIDUAL;
        const deductedRate = clientType === 'business'
            ? this.RATE_BUSINESS_DEDUCTED
            : this.RATE_INDIVIDUAL_DEDUCTED;

        const taxOnFullRate = Math.round(paymentAmount * baseRate);

        if (deductionRemaining <= 0) {
            return {
                taxWithoutDeduction: taxOnFullRate,
                deductionUsed: 0,
                deductionRemainingAfter: 0,
                setAside: taxOnFullRate,
                toKeep: paymentAmount - taxOnFullRate,
                rate: clientType === 'business' ? '6%' : '4%'
            };
        }

        const potentialSavings = Math.round(paymentAmount * (baseRate - deductedRate));
        const deductionUsed = Math.min(deductionRemaining, potentialSavings);
        const setAside = taxOnFullRate - deductionUsed;
        const deductionRemainingAfter = deductionRemaining - deductionUsed;

        return {
            taxWithoutDeduction: taxOnFullRate,
            deductionUsed,
            deductionRemainingAfter,
            setAside,
            toKeep: paymentAmount - setAside,
            rate: clientType === 'business' ? '6%' : '4%'
        };
    },

    formatMoney(amount) { return formatMoney(amount); },

    init() {
        this.paymentInput = document.getElementById('set-aside-payment');
        if (!this.paymentInput) return;
        this.clientTypeRadios = document.querySelectorAll('input[name="setAsideClientType"]');
        this.deductionInput = document.getElementById('set-aside-deduction-remaining');
        this.resultsEl = document.getElementById('set-aside-results');

        this.paymentInput.addEventListener('input', () => {
            this.validatePayment();
            this.render();
        });
        this.clientTypeRadios.forEach(r => r.addEventListener('change', () => this.render()));
        if (this.deductionInput) {
            this.deductionInput.addEventListener('input', () => {
                this.validateDeduction();
                this.render();
            });
        }

        this.render();
    },

    validatePayment() {
        const errorEl = getErrorElement('set-aside-payment');
        const raw = this.paymentInput.value.trim();
        if (raw === '') {
            clearFieldError(this.paymentInput, errorEl);
            return;
        }
        if (hasNonDigitChars(raw)) {
            showFieldError(this.paymentInput, errorEl, 'Здесь нужны только цифры — без букв и пробелов.');
            return;
        }
        const value = parseAmount(raw);
        if (value < 0) {
            showFieldError(this.paymentInput, errorEl, 'Сумма не может быть отрицательной. Введите число от 0.');
            return;
        }
        clearFieldError(this.paymentInput, errorEl);
    },

    validateDeduction() {
        if (!this.deductionInput) return;
        const errorEl = getErrorElement('set-aside-deduction-remaining');
        const raw = this.deductionInput.value.trim();
        if (raw === '') {
            clearFieldError(this.deductionInput, errorEl);
            return;
        }
        if (hasNonDigitChars(raw)) {
            showFieldError(this.deductionInput, errorEl, 'Здесь нужны только цифры — без букв и пробелов.');
            return;
        }
        const value = parseAmount(raw);
        if (value > 10000) {
            showFieldError(this.deductionInput, errorEl, 'Максимальный вычет — 10 000 ₽. Проверьте остаток.');
            return;
        }
        clearFieldError(this.deductionInput, errorEl);
    },

    render() {
        const payment = parseAmount(this.paymentInput.value);
        if (payment === 0) {
            this.resultsEl.innerHTML = '<p class="b-flow__empty">Введите сумму оплаты, чтобы увидеть расчёт</p>';
            return;
        }
        const clientType = document.querySelector('input[name="setAsideClientType"]:checked').value;
        const deductionRemaining = parseAmount(this.deductionInput?.value);
        const result = this.calculate(payment, clientType, deductionRemaining);

        // Автосохранение остатка вычета: после каждого расчёта обновляем поле
        // «остаток вычета» значением deductionRemainingAfter, чтобы при серии
        // платежей пользователь не терял прогресс и не вводил устаревший остаток
        // вручную. Пороги исчерпания: 1 млн ₽ для физлиц, 500 тыс. ₽ для юрлиц.
        if (this.deductionInput && result.deductionRemainingAfter !== deductionRemaining) {
            this.deductionInput.value = String(result.deductionRemainingAfter);
            this.validateDeduction();
        }

        // Оценка риска: прогноз годового дохода при таком темпе
        const monthIdx = new Date().getMonth();
        const monthsPassed = monthIdx + 1;
        const yearForecast = payment * 12 / Math.max(monthsPassed, 1);
        const limit = window.RULES_2026.npd.incomeLimit;
        let risk;
        if (yearForecast > limit) {
            risk = { level: 'amber', title: 'Риск превышения лимита', desc: 'При таком темпе годовой доход может превысить 2,4 млн ₽ — статус НПД слетит. Проверьте лимит.' };
        } else {
            risk = { level: 'green', title: 'Рисков нет', desc: 'Ставка ' + result.rate + ', налог откладывается в пределах нормы.' };
        }

        // Блок «Почему»
        const whyItems = [
            'Ставка ' + result.rate + (clientType === 'business' ? ' (юрлицо/ИП)' : ' (физлицо)'),
            this.formatMoney(payment) + ' ₽ × ' + result.rate + ' = ' + this.formatMoney(result.taxWithoutDeduction) + ' ₽'
        ];
        if (result.deductionUsed > 0) {
            whyItems.push('Вычет 10 000 ₽: использовано ' + this.formatMoney(result.deductionUsed) + ' ₽, остаток ' + this.formatMoney(result.deductionRemainingAfter) + ' ₽');
            const threshold = clientType === 'business' ? '500 тыс. ₽' : '1 млн ₽';
            whyItems.push('Вычет исчерпается при суммарном доходе ' + threshold + ' — поле остатка обновляется автоматически');
        }
        whyItems.push('Срок уплаты — 28-е число следующего месяца');

        // Кнопка сохранения в профиль (если профиль доступен)
        let saveBtn = '';
        if (window.NPD && window.NPD.profile) {
            saveBtn = '<button class="b-flow__save" type="button" id="set-aside-save">Сохранить доход в профиль</button>';
        }

        this.resultsEl.innerHTML = `
            <div class="b-flow__result-label">Налог к уплате</div>
            <div class="b-flow__result-big">${this.formatMoney(result.setAside)} ₽</div>
            <div class="b-flow__result-rate">${result.rate} от ${this.formatMoney(payment)} ₽ · можно тратить ${this.formatMoney(result.toKeep)} ₽</div>
            <div class="b-flow__why">
                <div class="b-flow__block-title"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Почему столько</span></div>
                <ul class="b-flow__why-list">
                    ${whyItems.map(it => '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + '</span></li>').join('')}
                </ul>
            </div>
            <div class="b-flow__risk b-flow__risk--${risk.level}">
                <div class="b-flow__risk-head">
                    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${risk.level === 'green' ? '<path d="M20 6 9 17l-5-5"/>' : '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'}</svg>
                    <span class="b-flow__risk-title">${risk.title}</span>
                </div>
                <p class="b-flow__risk-desc">${risk.desc}</p>
            </div>
            <a class="b-flow__next" href="limit-dohoda.html">
                <span class="b-flow__next-label">Проверить лимит дохода 2,4 млн</span>
                <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
            <div class="b-flow__trust">
                <span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>По ставкам ФНС</span></span>
                <span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Актуально на июль 2026</span></span>
                <span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Без отправки данных</span></span>
            </div>
            ${saveBtn}
        `;

        // Привязка кнопки сохранения в профиль
        const saveBtnEl = document.getElementById('set-aside-save');
        if (saveBtnEl && window.NPD && window.NPD.profile) {
            saveBtnEl.addEventListener('click', () => {
                const month = new Date().toISOString().slice(0, 7);
                window.NPD.profile.addIncome(month, payment, clientType === 'business' ? 'legal' : 'phys', null);
                if (window.toast) window.toast.show('Доход сохранён в профиль');
                saveBtnEl.textContent = 'Сохранено';
                saveBtnEl.disabled = true;
            });
        }
    }
};

// ============================================
// Калькулятор №8: Реальная ставка в час
// ============================================

const hourlyRateCalculator = {
    // Ставки НПД — из единого конфига rules-2026.js
    get TAX_RATE_INDIVIDUAL() { return window.RULES_2026.npd.rateIndividuals; },
    get TAX_RATE_BUSINESS() { return window.RULES_2026.npd.rateCompanies; },

    // Режим А: "Сколько просить за час/проект"
    calculateTargetRate(desiredNetIncome, hoursPerMonth, clientType) {
        const rate = clientType === 'business' ? this.TAX_RATE_BUSINESS : this.TAX_RATE_INDIVIDUAL;
        const grossNeeded = desiredNetIncome / (1 - rate);
        return {
            hourlyRate: Math.round(grossNeeded / hoursPerMonth),
            grossMonthly: Math.round(grossNeeded)
        };
    },

    // Режим Б: "Сколько я реально получаю в час"
    calculateActualRate(projectPayment, actualHoursSpent, clientType) {
        const rate = clientType === 'business' ? this.TAX_RATE_BUSINESS : this.TAX_RATE_INDIVIDUAL;
        const net = projectPayment * (1 - rate);
        return {
            netHourlyRate: actualHoursSpent > 0 ? Math.round(net / actualHoursSpent) : 0,
            netTotal: Math.round(net)
        };
    },

    formatMoney(amount) { return formatMoney(amount); },

    init() {
        this.modeRadios = document.querySelectorAll('input[name="hourlyRateMode"]');
        if (this.modeRadios.length === 0) return;

        this.clientTypeRadios = document.querySelectorAll('input[name="hourlyRateClientType"]');
        this.targetGroup = document.getElementById('hourly-mode-target-group');
        this.actualGroup = document.getElementById('hourly-mode-actual-group');

        this.desiredIncomeInput = document.getElementById('hourly-desired-income');
        this.hoursPerMonthInput = document.getElementById('hourly-hours-per-month');
        this.projectPaymentInput = document.getElementById('hourly-project-payment');
        this.actualHoursInput = document.getElementById('hourly-actual-hours');

        this.resultsEl = document.getElementById('hourly-results');

        this.desiredIncomeInput.addEventListener('input', () => {
            this.validateAmount(this.desiredIncomeInput, 'hourly-desired-income');
            this.render();
            this.saveState();
        });
        this.hoursPerMonthInput.addEventListener('input', () => {
            this.validateAmount(this.hoursPerMonthInput, 'hourly-hours-per-month');
            this.render();
            this.saveState();
        });
        this.projectPaymentInput.addEventListener('input', () => {
            this.validateAmount(this.projectPaymentInput, 'hourly-project-payment');
            this.render();
            this.saveState();
        });
        this.actualHoursInput.addEventListener('input', () => {
            this.validateAmount(this.actualHoursInput, 'hourly-actual-hours');
            this.render();
            this.saveState();
        });

        this.clientTypeRadios.forEach(r => r.addEventListener('change', () => {
            this.render();
            this.saveState();
        }));

        this.modeRadios.forEach(r => r.addEventListener('change', () => {
            this.toggleMode();
            this.render();
            this.saveState();
        }));

        this.restoreState();
        this.toggleMode();
        this.render();
    },

    validateAmount(inputEl, inputId) {
        const errorEl = getErrorElement(inputId);
        const raw = inputEl.value.trim();
        if (raw === '') {
            clearFieldError(inputEl, errorEl);
            return;
        }
        // Для поля часов разрешаем дробный ввод (12.5 ч / 12,5 ч)
        const allowDecimals = inputId === 'hourly-actual-hours';
        if (hasNonDigitChars(raw, allowDecimals)) {
            showFieldError(inputEl, errorEl, 'Здесь нужны только цифры — без букв и пробелов.');
            return;
        }
        if (allowDecimals) {
            // Для часов — float, не только целые
            const floatVal = parseFloat(raw.replace(',', '.'));
            if (isNaN(floatVal) || floatVal <= 0) {
                showFieldError(inputEl, errorEl, 'Укажите количество часов больше нуля.');
                return;
            }
        } else {
            const value = parseAmount(raw);
            // parseAmount уже отсекает нецифры и отдаёт ≥0; ветка остаётся
            // как защитный барьер на случай будущих изменений parseAmount.
            if (value < 0) {
                showFieldError(inputEl, errorEl, 'Сумма не может быть отрицательной. Введите число от 0.');
                return;
            }
        }
        clearFieldError(inputEl, errorEl);
    },

    // Переключение режима — display:none/block, значения полей не сбрасываются
    toggleMode() {
        const mode = document.querySelector('input[name="hourlyRateMode"]:checked').value;
        this.targetGroup.style.display = mode === 'target' ? 'block' : 'none';
        this.actualGroup.style.display = mode === 'actual' ? 'block' : 'none';
    },

    render() {
        const mode = document.querySelector('input[name="hourlyRateMode"]:checked').value;
        const clientType = document.querySelector('input[name="hourlyRateClientType"]:checked').value;

        if (mode === 'target') {
            this.renderTarget(clientType);
        } else {
            this.renderActual(clientType);
        }
    },

    renderTarget(clientType) {
        const desiredIncome = parseAmount(this.desiredIncomeInput.value);
        const hours = parseAmount(this.hoursPerMonthInput.value);

        if (desiredIncome === 0 || hours === 0) {
            this.resultsEl.innerHTML = '<p class="b-flow__empty">Введите желаемый доход и часы в месяц, чтобы увидеть расчёт</p>';
            return;
        }

        const result = this.calculateTargetRate(desiredIncome, hours, clientType);
        const rate = clientType === 'business' ? '6%' : '4%';
        const whyItems = [
            'Желаемый чистый доход: ' + this.formatMoney(desiredIncome) + ' ₽/мес',
            'Ставка НПД: ' + rate + (clientType === 'business' ? ' (юрлицо/ИП)' : ' (физлицо)'),
            'Доход до налога: ' + this.formatMoney(result.grossMonthly) + ' ₽',
            'Часов в месяц: ' + hours,
            'Ставка = доход до налога ÷ часы'
        ];
        this.resultsEl.innerHTML = this._bflowHtml(
            'Ставка в час', this.formatMoney(result.hourlyRate) + ' ₽',
            'green', 'Расчёт корректен', 'Чтобы получать ' + this.formatMoney(desiredIncome) + ' ₽ чистыми, выставляйте ' + this.formatMoney(result.grossMonthly) + ' ₽ до налога.',
            whyItems, { to: 'otlozhit-na-nalog.html', label: 'Посчитать налог с этой суммы' }
        );
    },

    renderActual(clientType) {
        const payment = parseAmount(this.projectPaymentInput.value);
        const hours = parseFloat(this.actualHoursInput.value) || 0;

        if (payment === 0 || hours === 0) {
            this.resultsEl.innerHTML = '<p class="b-flow__empty">Введите оплату за проект и реально потраченные часы, чтобы увидеть расчёт</p>';
            return;
        }

        const result = this.calculateActualRate(payment, hours, clientType);
        const rate = clientType === 'business' ? '6%' : '4%';
        const whyItems = [
            'Оплата за проект: ' + this.formatMoney(payment) + ' ₽',
            'Ставка НПД: ' + rate + (clientType === 'business' ? ' (юрлицо/ИП)' : ' (физлицо)'),
            'Налог: ' + this.formatMoney(result.tax) + ' ₽',
            'Чистыми за проект: ' + this.formatMoney(result.netTotal) + ' ₽',
            'Реально потрачено часов: ' + hours + ' (с учётом правок)',
            'Ставка = чистыми ÷ часы'
        ];
        this.resultsEl.innerHTML = this._bflowHtml(
            'Реальная ставка в час', this.formatMoney(result.netHourlyRate) + ' ₽',
            'green', 'Расчёт корректен', 'Чистыми за проект: ' + this.formatMoney(result.netTotal) + ' ₽. Если ставка ниже ожидаемой — закладывайте больше времени на правки.',
            whyItems, { to: 'otlozhit-na-nalog.html', label: 'Посчитать налог с этой сделки' }
        );
    },

    // Общий B-flow рендер для hourlyRateCalculator
    _bflowHtml(label, big, level, riskTitle, riskDesc, whyItems, next) {
        const whyLis = whyItems.map(it => '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + '</span></li>').join('');
        return '' +
            '<div class="b-flow__result-label">' + label + '</div>' +
            '<div class="b-flow__result-big">' + big + '</div>' +
            '<div class="b-flow__why"><div class="b-flow__block-title"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Почему столько</span></div><ul class="b-flow__why-list">' + whyLis + '</ul></div>' +
            '<div class="b-flow__risk b-flow__risk--' + level + '"><div class="b-flow__risk-head"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span class="b-flow__risk-title">' + riskTitle + '</span></div><p class="b-flow__risk-desc">' + riskDesc + '</p></div>' +
            '<a class="b-flow__next" href="' + next.to + '"><span class="b-flow__next-label">' + next.label + '</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>' +
            '<div class="b-flow__trust"><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>По ставкам ФНС</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Актуально на июль 2026</span></span><span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>Без отправки данных</span></span></div>';
    },

    saveState() {
        try {
            const state = {
                mode: document.querySelector('input[name="hourlyRateMode"]:checked')?.value,
                clientType: document.querySelector('input[name="hourlyRateClientType"]:checked')?.value,
                desiredIncome: this.desiredIncomeInput.value,
                hoursPerMonth: this.hoursPerMonthInput.value,
                projectPayment: this.projectPaymentInput.value,
                actualHours: this.actualHoursInput.value
            };
            localStorage.setItem('fe_hourlyRateState', JSON.stringify(state));
        } catch (e) {
            // Приватный режим или нет localStorage
        }
    },

    restoreState() {
        try {
            const saved = localStorage.getItem('fe_hourlyRateState');
            if (!saved) return;
            const state = JSON.parse(saved);
            if (state.desiredIncome) this.desiredIncomeInput.value = state.desiredIncome;
            if (state.hoursPerMonth) this.hoursPerMonthInput.value = state.hoursPerMonth;
            if (state.projectPayment) this.projectPaymentInput.value = state.projectPayment;
            if (state.actualHours) this.actualHoursInput.value = state.actualHours;
            if (state.clientType) {
                const radio = document.querySelector(`input[name="hourlyRateClientType"][value="${state.clientType}"]`);
                if (radio) radio.checked = true;
            }
            if (state.mode) {
                const radio = document.querySelector(`input[name="hourlyRateMode"][value="${state.mode}"]`);
                if (radio) radio.checked = true;
            }
        } catch (e) {
            // Приватный режим или ошибка парсинга
        }
    }
};

// ============================================
// Генератор договора/акта
// ============================================

const contractGenerator = {
    TEMPLATE_TYPES: {
        service_agreement: 'Договор возмездного оказания услуг',
        act: 'Акт выполненных работ'
    },

    FILE_NAMES: {
        service_agreement: 'dogovor.txt',
        act: 'akt.txt'
    },

    fillTemplate(type, data) {
        // data: { performerName, performerInn, clientName, clientInn,
        //         serviceDescription, amount, date, city }
        const templates = {
            service_agreement: this.serviceAgreementTemplate,
            act: this.actTemplate
        };
        return templates[type](data);
    },

    serviceAgreementTemplate(data) {
        return `
ДОГОВОР ВОЗМЕЗДНОГО ОКАЗАНИЯ УСЛУГ №___

г. ${data.city}                                            ${data.date}

${data.performerName} (ИНН ${data.performerInn}), именуемый в дальнейшем
«Исполнитель», действующий на основании статуса плательщика налога на
профессиональный доход, с одной стороны, и ${data.clientName}
(ИНН ${data.clientInn}), именуемый в дальнейшем «Заказчик», с другой
стороны, заключили настоящий договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА
1.1. Исполнитель обязуется оказать услуги: ${data.serviceDescription}
1.2. Стоимость услуг составляет ${data.amount} рублей.

2. ПОРЯДОК РАСЧЁТОВ
2.1. Оплата производится в течение 5 рабочих дней после подписания акта.

3. ПРОЧИЕ УСЛОВИЯ
3.1. Исполнитель является плательщиком налога на профессиональный доход
и не является плательщиком НДС.

Исполнитель: _________________ / ${data.performerName}
Заказчик: _________________ / ${data.clientName}
        `.trim();
    },

    actTemplate(data) {
        return `
АКТ ВЫПОЛНЕННЫХ РАБОТ (ОКАЗАННЫХ УСЛУГ)

г. ${data.city}                                            ${data.date}

Исполнитель: ${data.performerName} (ИНН ${data.performerInn})
Заказчик: ${data.clientName} (ИНН ${data.clientInn})

Исполнитель выполнил, а Заказчик принял следующие услуги/работы:
${data.serviceDescription}

Сумма к оплате: ${data.amount} рублей.
Претензий по объёму, качеству и срокам оказания услуг Заказчик не имеет.

Исполнитель: _________________ / ${data.performerName}
Заказчик: _________________ / ${data.clientName}
        `.trim();
    },

    formatMoney(amount) { return formatMoney(amount); },

    // Экранирование пользовательского ввода — делегирует к единой глобальной escapeHtml (§11.1)
    escapeHtml(str) {
        return escapeHtml(str);
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}.${month}.${year}`;
    },

    collectFormData() {
        return {
            performerName: this.performerNameInput.value.trim(),
            performerInn: this.performerInnInput.value.trim(),
            clientName: this.clientNameInput.value.trim(),
            clientInn: this.clientInnInput.value.trim(),
            serviceDescription: this.serviceDescriptionInput.value.trim(),
            amount: this.formatMoney(parseFloat(this.amountInput.value) || 0),
            date: this.formatDate(this.dateInput.value),
            city: this.cityInput.value.trim()
        };
    },

    isDataComplete(data) {
        return Object.values(data).every(v => v !== '' && v !== '0');
    },

    init() {
        this.generateBtn = document.getElementById('btn-generate-contract');
        if (!this.generateBtn) return;

        this.performerNameInput = document.getElementById('contract-performer-name');
        this.performerInnInput = document.getElementById('contract-performer-inn');
        this.clientNameInput = document.getElementById('contract-client-name');
        this.clientInnInput = document.getElementById('contract-client-inn');
        this.serviceDescriptionInput = document.getElementById('contract-service-description');
        this.amountInput = document.getElementById('contract-amount');
        this.dateInput = document.getElementById('contract-date');
        this.cityInput = document.getElementById('contract-city');
        this.validationEl = document.getElementById('contract-validation');
        this.previewEl = document.getElementById('document-preview-output');
        this.actionsEl = document.getElementById('document-actions');
        this.copyBtn = document.getElementById('btn-copy-contract');
        this.downloadBtn = document.getElementById('btn-download-contract');

        // Дата по умолчанию — сегодня
        if (this.dateInput && !this.dateInput.value) {
            this.dateInput.value = new Date().toISOString().split('T')[0];
        }

        this.generateBtn.addEventListener('click', () => this.generate());
        if (this.copyBtn) this.copyBtn.addEventListener('click', () => this.copyText());
        if (this.downloadBtn) this.downloadBtn.addEventListener('click', () => this.downloadTxt());

        // Валидация ИНН в реальном времени
        if (this.performerInnInput) {
            this.performerInnInput.addEventListener('input', () => {
                this.validateInnField(this.performerInnInput, 'contract-performer-inn');
            });
        }
        if (this.clientInnInput) {
            this.clientInnInput.addEventListener('input', () => {
                this.validateInnField(this.clientInnInput, 'contract-client-inn');
            });
        }
    },

    validateInnField(inputEl, inputId) {
        const errorEl = getErrorElement(inputId);
        const value = inputEl.value.trim();
        if (value === '') {
            clearFieldError(inputEl, errorEl);
            return;
        }
        const result = validateInn(value);
        if (!result.valid) {
            if (result.nonDigit) {
                showFieldError(inputEl, errorEl, 'Здесь нужны только цифры — без букв и пробелов.');
            } else {
                showFieldError(inputEl, errorEl, 'ИНН физлица — 12 цифр, юрлица — 10. Проверьте номер.');
            }
            return;
        }
        clearFieldError(inputEl, errorEl);
    },

    // Карта полей → человекочитаемые названия для подсказки
    FIELD_LABELS: {
        performerName: 'ФИО исполнителя',
        performerInn: 'ИНН исполнителя',
        clientName: 'ФИО или название заказчика',
        clientInn: 'ИНН заказчика',
        serviceDescription: 'описание услуги',
        amount: 'сумму',
        date: 'дату',
        city: 'город'
    },

    // Найти первое незаполненное поле и вернуть его ключ и название
    findFirstMissing(data) {
        for (const [key, value] of Object.entries(data)) {
            if (value === '' || value === '0') {
                return { key, label: this.FIELD_LABELS[key] || key };
            }
        }
        return null;
    },

    // Получить input-элемент по ключу данных формы
    getInputByKey(key) {
        const map = {
            performerName: this.performerNameInput,
            performerInn: this.performerInnInput,
            clientName: this.clientNameInput,
            clientInn: this.clientInnInput,
            serviceDescription: this.serviceDescriptionInput,
            amount: this.amountInput,
            date: this.dateInput,
            city: this.cityInput
        };
        return map[key] || null;
    },

    generate() {
        const data = this.collectFormData();

        if (!this.isDataComplete(data)) {
            const missing = this.findFirstMissing(data);
            if (this.validationEl) {
                this.validationEl.textContent = missing
                    ? `Укажите ${missing.label}, чтобы собрать документ.`
                    : 'Заполните все поля — без них документ будет неполным.';
                this.validationEl.style.display = 'block';
            }
            // Подсветить первое незаполненное поле
            if (missing) {
                const inputEl = this.getInputByKey(missing.key);
                if (inputEl) {
                    inputEl.focus();
                    inputEl.classList.add('field-highlight');
                    setTimeout(() => inputEl.classList.remove('field-highlight'), 2000);
                }
            }
            this.previewEl.classList.remove('visible');
            this.actionsEl.classList.remove('visible');
            return;
        }

        if (this.validationEl) {
            this.validationEl.style.display = 'none';
        }

        // Проверка валидности ИНН — блокируем генерацию при неверной длине
        const performerInnResult = validateInn(data.performerInn);
        const clientInnResult = validateInn(data.clientInn);
        if (!performerInnResult.valid || !clientInnResult.valid) {
            const badInnInput = !performerInnResult.valid ? this.performerInnInput : this.clientInnInput;
            const badInnId = !performerInnResult.valid ? 'contract-performer-inn' : 'contract-client-inn';
            this.validateInnField(badInnInput, badInnId);
            if (this.validationEl) {
                this.validationEl.textContent = 'ИНН физлица — 12 цифр, юрлица — 10. Проверьте номер.';
                this.validationEl.style.display = 'block';
            }
            badInnInput.focus();
            badInnInput.classList.add('field-highlight');
            setTimeout(() => badInnInput.classList.remove('field-highlight'), 2000);
            this.previewEl.classList.remove('visible');
            this.actionsEl.classList.remove('visible');
            return;
        }

        const type = document.querySelector('input[name="contractType"]:checked').value;
        this.currentType = type;
        this.currentText = this.fillTemplate(type, data);

        this.previewEl.innerHTML = this.escapeHtml(this.currentText);
        this.previewEl.classList.add('visible');
        this.actionsEl.classList.add('visible');
    },

    async copyText() {
        if (!this.currentText) return;
        const originalLabel = this.copyBtn.textContent;
        try {
            await navigator.clipboard.writeText(this.currentText);
        } catch (e) {
            // Фолбэк для старых браузеров / запрещённого доступа к Clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = this.currentText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        this.copyBtn.textContent = '✓ Текст скопирован!';
        setTimeout(() => { this.copyBtn.textContent = originalLabel; }, 2000);
    },

    downloadTxt() {
        if (!this.currentText) return;
        const blob = new Blob([this.currentText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.FILE_NAMES[this.currentType] || 'document.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.achievements) window.achievements.unlock('contract_downloaded');
    }
};

// ============================================
// Калькулятор: Риск переквалификации ГПХ→трудовых (§6.6, risk-trudovyh.html)
// ============================================

const riskTrudovyhCalculator = {
    init() {
        this.resultsEl = document.getElementById('risk-trudovyh-results');
        if (!this.resultsEl) return;
        this.checkboxes = document.querySelectorAll('input[name="riskSign"]');
        this.shareInput = document.getElementById('risk-share');

        const recalc = () => this.render();
        this.checkboxes.forEach(cb => cb.addEventListener('change', recalc));
        if (this.shareInput) this.shareInput.addEventListener('input', recalc);
        this.render();
    },

    render() {
        const checked = Array.from(this.checkboxes).filter(cb => cb.checked);
        const count = checked.length;
        const share = parseAmount(this.shareInput ? this.shareInput.value : '0');

        if (count === 0 && share === 0) {
            this.resultsEl.innerHTML = '<p class="b-flow__empty">Отметьте признаки, чтобы увидеть оценку риска</p>';
            return;
        }

        // Уровень риска: ≥3 признаков ИЛИ доля >80% → red; 1–2 → amber; 0 → green
        let level, title, desc;
        if (count >= 3 || share > 80) {
            level = 'red';
            title = 'Высокий риск переквалификации';
            desc = count + ' признаков трудовых отношений' + (share > 80 ? ', доля главного заказчика ' + share + '% (>80%)' : '') + '. Высокая вероятность доначисления НДФЛ 13% + взносы 30%.';
        } else if (count >= 1 || share >= 50) {
            level = 'amber';
            title = 'Признаки есть — будьте внимательны';
            desc = count + ' признак(ов)' + (share >= 50 ? ', доля заказчика ' + share + '%' : '') + '. Оформите полноценный ГПХ с фиксированной ценой, работайте удалённо.';
        } else {
            level = 'green';
            title = 'Рисков не найдено';
            desc = 'Признаки трудовых отношений не выявлены. Продолжайте работать по договору ГПХ с фиксированной ценой за результат.';
        }

        const whyItems = [
            '13 признаков ФНС/судов (ст. 15 ТК РФ, ст. 420 ГК РФ)',
            'Сработало признаков: ' + count + ' из 13',
            share > 0 ? 'Доля главного заказчика: ' + share + '%' : 'Доля заказчика не указана',
            'При переквалификации: НДФЛ 13% + взносы 30% + штрафы для заказчика',
            'Для самозанятого: потеря статуса НПД с начала месяца'
        ];

        this.resultsEl.innerHTML = this._bflowHtml('Индикатор риска', count + ' / 13', level, title, desc, whyItems,
            { to: 'ip-ili-samozanyatyy.html', label: 'Сравнить с ИП — альтернатива' },
            ['По признакам ФНС и судов', 'Актуально на июль 2026', 'Оценка информационная, не юридическая']
        );
    },

    _bflowHtml(label, big, level, riskTitle, riskDesc, whyItems, next, trust) {
        const whyLis = whyItems.map(it => '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + '</span></li>').join('');
        const riskIcon = level === 'green' ? '<path d="M20 6 9 17l-5-5"/>' : (level === 'amber' ? '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>' : '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>');
        const trustItems = trust.map(t => '<span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>' + t + '</span></span>').join('');
        return '' +
            '<div class="b-flow__result-label">' + label + '</div>' +
            '<div class="b-flow__result-big">' + big + '</div>' +
            '<div class="b-flow__why"><div class="b-flow__block-title"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Почему такая оценка</span></div><ul class="b-flow__why-list">' + whyLis + '</ul></div>' +
            '<div class="b-flow__risk b-flow__risk--' + level + '"><div class="b-flow__risk-head"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + riskIcon + '</svg><span class="b-flow__risk-title">' + riskTitle + '</span></div><p class="b-flow__risk-desc">' + riskDesc + '</p></div>' +
            '<a class="b-flow__next" href="' + next.to + '"><span class="b-flow__next-label">' + next.label + '</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>' +
            '<div class="b-flow__trust">' + trustItems + '</div>';
    }
};

// ============================================
// Калькулятор: Трекер 60 часов по 289-ФЗ (§8, chasy-289-fz.html)
// ============================================

const chasy289Calculator = {
    LIMIT: 60, // часов/мес по 289-ФЗ

    init() {
        this.resultsEl = document.getElementById('chasy-289-results');
        if (!this.resultsEl) return;
        this.hoursInput = document.getElementById('chasy-hours');
        this.clientInput = document.getElementById('chasy-client');
        this.monthInput = document.getElementById('chasy-month');

        // Установить текущий месяц по умолчанию
        if (this.monthInput && !this.monthInput.value) {
            this.monthInput.value = new Date().toISOString().slice(0, 7);
        }

        const recalc = () => this.render();
        if (this.hoursInput) this.hoursInput.addEventListener('input', recalc);
        if (this.clientInput) this.clientInput.addEventListener('input', recalc);
        if (this.monthInput) this.monthInput.addEventListener('change', recalc);
        this.render();
    },

    render() {
        const hours = parseAmount(this.hoursInput ? this.hoursInput.value : '0');
        const client = this.clientInput ? (this.clientInput.value || '').trim() : '';
        const month = this.monthInput ? (this.monthInput.value || '').trim() : '';
        return this.renderData(hours, client, month);
    },

    renderData(hours, client, month) {
        if (hours === 0 || !client || !month) {
            return { empty: true };
        }

        const remaining = Math.max(0, this.LIMIT - hours);
        const percent = Math.min(100, (hours / this.LIMIT) * 100);
        let level, title, desc, progressLevel;
        if (hours >= this.LIMIT) {
            level = 'red';
            progressLevel = 'red';
            title = 'Превышение лимита по 289-ФЗ';
            desc = 'Отработано ' + hours + ' ч при лимите 60 ч/мес. Превышение может привести к переквалификации отношений в трудовые.';
        } else if (hours > 50) {
            level = 'amber';
            progressLevel = 'amber';
            title = 'Близко к лимиту';
            desc = 'Отработано ' + hours + ' ч из 60. Осталось ' + remaining + ' ч. Будьте внимательны — лимит близко.';
        } else {
            level = 'green';
            progressLevel = 'accent';
            title = 'В пределах лимита';
            desc = 'Отработано ' + hours + ' ч из 60. Осталось ' + remaining + ' ч до конца месяца.';
        }

        const whyItems = [
            'Закон № 289-ФЗ + постановление № 760',
            'Лимит: 60 часов/мес на одного заказчика через платформу (ПЦП)',
            'Действует с 01.10.2026',
            'Только для платформ цифровых посредников (не для прямого ГПХ)',
            'Отработано: ' + hours + ' ч, остаток: ' + remaining + ' ч'
        ];

        const riskIcon = level === 'green' ? '<path d="M20 6 9 17l-5-5"/>' : (level === 'amber' ? '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>' : '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/>');
        const trustItems = ['По данным 289-ФЗ (с 01.10.2026)', 'Без отправки данных'].map(t => '<span class="b-flow__trust-item"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>' + t + '</span></span>').join('');
        const whyLis = whyItems.map(it => '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + '</span></li>').join('');

        this.resultsEl.innerHTML = '' +
            '<div class="b-flow__result-label">Осталось часов до лимита</div>' +
            '<div class="b-flow__result-big">' + remaining + ' ч</div>' +
            '<div class="b-flow__result-rate">' + hours + ' из 60 ч · ' + percent.toFixed(0) + '% лимита</div>' +
            '<div class="b-flow__progress"><div class="b-flow__progress-bar"><div class="b-flow__progress-fill b-flow__progress-fill--' + progressLevel + '" style="width:' + percent + '%"></div></div><span class="b-flow__progress-text">' + percent.toFixed(0) + '% из 60 ч</span></div>' +
            '<div class="b-flow__why"><div class="b-flow__block-title"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg><span>Почему столько</span></div><ul class="b-flow__why-list">' + whyLis + '</ul></div>' +
            '<div class="b-flow__risk b-flow__risk--' + level + '"><div class="b-flow__risk-head"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + riskIcon + '</svg><span class="b-flow__risk-title">' + title + '</span></div><p class="b-flow__risk-desc">' + desc + '</p></div>' +
            '<a class="b-flow__next" href="koncentracia-dohoda.html"><span class="b-flow__next-label">Оценить концентрацию дохода</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></a>' +
            '<div class="b-flow__trust">' + trustItems + '</div>';

        // Возвращаем данные для тестирования
        return { status: level, remaining: hours >= this.LIMIT ? this.LIMIT - hours : remaining, percent: Math.round(percent * 10) / 10, empty: false };
    }
};

// ============================================
// Инициализация при загрузке
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    updateReceiptTimestamp();
    contributionCalculator.init();
    incomeCalculator.init();
    ipCalculator.init();
    pensionCalculator.init();
    concentrationTracker.init();
    deductionCalculator.init();
    setAsideCalculator.init();
    hourlyRateCalculator.init();
    contractGenerator.init();
    riskTrudovyhCalculator.init();
    chasy289Calculator.init();

    // Кнопка копирования ссылки
    const copyLinkBtn = document.getElementById('btn-copy-link');
    if (copyLinkBtn) {
        const copyStatusEl = document.getElementById('copy-link-status');
        const originalText = copyLinkBtn.textContent;
        const announceCopied = () => {
            copyLinkBtn.textContent = '✓ Скопировано';
            copyLinkBtn.classList.add('btn-pill--copied');
            copyLinkBtn.disabled = true;
            if (copyStatusEl) copyStatusEl.textContent = 'Ссылка на расчёт скопирована';
            if (window.toast) window.toast.show('Ссылка скопирована', 'success');
            setTimeout(() => {
                copyLinkBtn.textContent = originalText;
                copyLinkBtn.classList.remove('btn-pill--copied');
                copyLinkBtn.disabled = false;
            }, 1500);
        };
        copyLinkBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.href);
                announceCopied();
            } catch (e) {
                // Фолбэк для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = window.location.href;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                announceCopied();
            }
        });
    }
    
    // Кнопка сохранения чека — печать
    const saveReceiptBtn = document.getElementById('btn-save-receipt');
    if (saveReceiptBtn) {
        saveReceiptBtn.addEventListener('click', () => {
            window.print();
        });
    }
});
