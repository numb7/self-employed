/**
 * Финансовый помощник для самозанятых
 * Мастер выбора режима налогообложения (самозанятый / ИП на УСН).
 * Независимый модуль: не использует и не изменяет js/calculators.js,
 * читает числовые константы через js/tax-constants.js (адаптер над rules-2026.js).
 */

// ============================================
// Данные вопросов
// ============================================

const WIZARD_QUESTIONS = [
    {
        key: 'activityType',
        title: 'Чем вы занимаетесь?',
        options: [
            { value: 'services', label: 'Оказываю услуги', caption: 'Фриланс, консультации, работы' },
            { value: 'own_goods', label: 'Продаю товары собственного производства' },
            { value: 'resale', label: 'Перепродаю товары', caption: 'Не своего производства' },
            { value: 'rental', label: 'Сдаю в аренду недвижимость' }
        ]
    },
    {
        key: 'hasEmployees',
        title: 'Планируете нанимать сотрудников?',
        options: [
            { value: 'true', label: 'Да' },
            { value: 'false', label: 'Нет' }
        ]
    },
    {
        key: 'expectedIncome',
        title: 'Сколько примерно планируете зарабатывать в год?',
        options: [
            { value: 'under_2_4m', label: 'До 2,4 млн ₽' },
            { value: '2_4_to_10m', label: 'От 2,4 до 10 млн ₽' },
            { value: 'over_10m', label: 'От 10 млн ₽' }
        ]
    },
    {
        key: 'expenseShare',
        title: 'Какая часть дохода уходит на расходы (закупка, аренда, материалы)?',
        options: [
            { value: 'none', label: 'Расходов почти нет', caption: 'Услуги, консультации' },
            { value: 'low', label: 'Небольшие расходы', caption: 'До 20–30% от дохода' },
            { value: 'high', label: 'Существенные расходы', caption: 'От 40% и выше' }
        ]
    }
];

// ============================================
// Логика принятия решения
// ============================================

function buildNpdReasons(answers) {
    const reasons = ['Доход в пределах лимита НПД (2,4 млн ₽/год)'];
    reasons.push(answers.hasEmployees === 'false' ? 'Не планируете нанимать сотрудников' : 'Нет наёмных сотрудников');
    if (answers.activityType === 'rental') {
        reasons.push('Сдача недвижимости в аренду допускается на НПД');
    } else {
        reasons.push('Деятельность не связана с перепродажей товаров');
    }
    return reasons;
}

function buildUsnReasons(answers, regime) {
    const reasons = [];
    if (answers.activityType === 'resale') {
        reasons.push('Перепродажа товаров не подпадает под НПД');
    }
    if (answers.hasEmployees === 'true') {
        reasons.push('Планируете нанимать сотрудников — НПД это запрещает');
    }
    if (answers.expectedIncome === '2_4_to_10m' || answers.expectedIncome === 'over_10m') {
        reasons.push('Ожидаемый доход выше лимита НПД (2,4 млн ₽/год)');
    }
    if (regime === 'usn_income_minus_expenses') {
        reasons.push('Высокая доля расходов делает эту схему выгоднее');
    } else if (reasons.length < 2) {
        reasons.push('Расходы минимальны — платить с полного дохода проще и выгоднее');
    }
    return reasons.slice(0, 3);
}

function recommendRegime(answers) {
    const { activityType, hasEmployees, expectedIncome, expenseShare } = answers;

    const npdExcluded =
        activityType === 'resale' ||
        hasEmployees === 'true' ||
        expectedIncome === 'over_10m' ||
        expectedIncome === '2_4_to_10m';

    if (!npdExcluded) {
        return { regime: 'npd', reasons: buildNpdReasons(answers) };
    }

    if (expenseShare === 'high') {
        return { regime: 'usn_income_minus_expenses', reasons: buildUsnReasons(answers, 'usn_income_minus_expenses') };
    }

    return { regime: 'usn_income', reasons: buildUsnReasons(answers, 'usn_income') };
}

// ============================================
// Состояние
// ============================================

const wizardState = {
    step: 0, // 0 = вход, 1..4 = вопросы, 5 = результат
    answers: {
        activityType: null,
        hasEmployees: null,
        expectedIncome: null,
        expenseShare: null
    }
};

function formatMoney(amount) {
    return Math.round(amount).toLocaleString('ru-RU');
}

// ============================================
// Сохранение последнего результата (localStorage) — опционально, не блокирует прохождение
// ============================================

function saveWizardResult(regime) {
    try {
        localStorage.setItem('fe_wizardResult', JSON.stringify({ regime, savedAt: Date.now() }));
    } catch (e) {
        // приватный режим / localStorage недоступен — не блокирует показ результата
    }
}

function loadWizardResult() {
    try {
        const raw = localStorage.getItem('fe_wizardResult');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function clearWizardResult() {
    try {
        localStorage.removeItem('fe_wizardResult');
    } catch (e) {
        // ignore
    }
}

const REGIME_LABELS = {
    npd: 'самозанятость',
    usn_income: 'ИП на УСН «Доходы»',
    usn_income_minus_expenses: 'ИП на УСН «Доходы минус расходы»'
};

// ============================================
// Рендер шагов
// ============================================

const wizardApp = {
    root: null,

    init() {
        this.root = document.getElementById('wizard-app');
        if (!this.root) return;
        this.root.innerHTML = '<div class="wizard-stage" id="wizard-stage"></div>';
        this.stage = document.getElementById('wizard-stage');
        this.renderPanel(0, null);
    },

    goToStep(step, direction) {
        wizardState.step = step;
        this.renderPanel(step, direction);
    },

    goNext(step) {
        this.goToStep(step, 'forward');
    },

    goBack(step) {
        this.goToStep(step, 'backward');
    },

    restart() {
        wizardState.answers = { activityType: null, hasEmployees: null, expectedIncome: null, expenseShare: null };
        this.goToStep(0, 'backward');
    },

    selectAnswer(questionKey, value) {
        wizardState.answers[questionKey] = value;
        const questionIndex = WIZARD_QUESTIONS.findIndex(q => q.key === questionKey);
        const nextStep = questionIndex + 2; // шаг вопроса = questionIndex+1, следующий шаг = +2
        if (nextStep <= WIZARD_QUESTIONS.length) {
            this.goNext(nextStep);
        } else {
            const recommendation = recommendRegime(wizardState.answers);
            saveWizardResult(recommendation.regime);
            this.goNext(WIZARD_QUESTIONS.length + 1);
        }
    },

    buildPanelContent(step) {
        if (step === 0) return this.buildIntroHtml();
        if (step >= 1 && step <= WIZARD_QUESTIONS.length) return this.buildQuestionHtml(step);
        return this.buildResultHtml();
    },

    buildIntroHtml() {
        const saved = loadWizardResult();
        const resumeHtml = saved
            ? `<div class="wizard-resume-banner">
                 <span>Вы уже проходили тест. Ваш результат: <strong>${REGIME_LABELS[saved.regime] || ''}</strong></span>
               </div>`
            : '';
        return `
            <div class="wizard-intro">
                <h2 class="wizard-intro__title">Не знаете, что выбрать — самозанятость или ИП? Ответьте на 4 вопроса, разберёмся вместе.</h2>
                ${resumeHtml}
                <button type="button" class="btn btn-primary" data-wizard-action="start">Начать</button>
            </div>
        `;
    },

    buildQuestionHtml(step) {
        const question = WIZARD_QUESTIONS[step - 1];
        const currentValue = wizardState.answers[question.key];
        const optionsHtml = question.options.map(opt => {
            const checked = currentValue !== null && String(currentValue) === opt.value ? 'checked' : '';
            const captionHtml = opt.caption ? `<span class="tap-card__caption">${opt.caption}</span>` : '';
            return `
                <label class="tap-card">
                    <input type="radio" class="control-native" name="${question.key}" value="${opt.value}" ${checked} data-wizard-question="${question.key}">
                    <span class="tap-card__title">${opt.label}</span>
                    ${captionHtml}
                </label>
            `;
        }).join('');

        const backBtn = step >= 1
            ? `<button type="button" class="wizard-back-btn" data-wizard-action="back" aria-label="Назад">←</button>`
            : '';

        return `
            <div class="wizard-step-header">
                ${backBtn}
                <div class="wizard-progress" role="progressbar" aria-valuenow="${step}" aria-valuemin="1" aria-valuemax="${WIZARD_QUESTIONS.length}" aria-label="Шаг ${step} из ${WIZARD_QUESTIONS.length}">
                    <div class="wizard-progress__track">
                        <div class="wizard-progress__fill" style="width: ${(step / WIZARD_QUESTIONS.length) * 100}%"></div>
                    </div>
                    <span class="wizard-progress__label">Шаг ${step} из ${WIZARD_QUESTIONS.length}</span>
                </div>
            </div>
            <h2 class="wizard-question-title">${question.title}</h2>
            <fieldset class="tap-cards" data-question="${question.key}">
                <legend class="sr-only">${question.title}</legend>
                ${optionsHtml}
            </fieldset>
        `;
    },

    buildResultHtml() {
        const recommendation = recommendRegime(wizardState.answers);
        const { regime, reasons } = recommendation;
        const c = TAX_CONSTANTS_2026;

        const reasonsHtml = reasons.map(r => `<li>${r}</li>`).join('');

        let titleText, rateBlockHtml, nextStepsHtml, ctaTitle, ctaText;

        if (regime === 'npd') {
            titleText = 'Вам подходит самозанятость';
            rateBlockHtml = `
                <div class="receipt-lines">
                    <div class="receipt-line">
                        <span class="label">Ставка налога (доход от физлиц)</span>
                        <span class="dots"></span>
                        <span class="amount green mono">${c.NPD_RATE_INDIVIDUAL * 100}%</span>
                    </div>
                    <div class="receipt-line">
                        <span class="label">Ставка налога (доход от юрлиц/ИП)</span>
                        <span class="dots"></span>
                        <span class="amount mono">${c.NPD_RATE_BUSINESS * 100}%</span>
                    </div>
                </div>
            `;
            nextStepsHtml = `
                <div class="wizard-result__next-steps">
                    <h3>Что дальше</h3>
                    <ol>
                        <li>Зарегистрироваться в приложении «Мой налог»</li>
                        <li>Открыть счёт самозанятого в банке-партнёре, если нужен отдельный счёт</li>
                    </ol>
                    <div class="wizard-result__actions">
                        <a href="limit-dohoda.html" class="calc-card">Калькулятор лимита дохода НПД →</a>
                    </div>
                </div>
            `;
            ctaTitle = 'Открыть счёт самозанятого';
            ctaText = 'Отдельный счёт для приёма оплат от клиентов — оформление в приложении банка-партнёра.';
        } else if (regime === 'usn_income') {
            titleText = 'Вам подходит ИП на УСН «Доходы»';
            rateBlockHtml = `
                <div class="receipt-lines">
                    <div class="receipt-line">
                        <span class="label">Ставка налога</span>
                        <span class="dots"></span>
                        <span class="amount mono">${c.USN_INCOME_RATE * 100}% с дохода</span>
                    </div>
                    <div class="receipt-line">
                        <span class="label">Фиксвзносы ИП «за себя» (2026)</span>
                        <span class="dots"></span>
                        <span class="amount mono">${formatMoney(c.IP_FIXED_CONTRIBUTION)} ₽/год</span>
                    </div>
                </div>
            `;
            nextStepsHtml = `
                <div class="wizard-result__next-steps">
                    <h3>Что дальше</h3>
                    <ol>
                        <li>Зарегистрировать ИП через Госуслуги или банк-партнёр</li>
                        <li>Открыть расчётный счёт для ИП</li>
                    </ol>
                    <div class="wizard-result__actions">
                        <a href="ip-ili-samozanyatyy.html" class="calc-card">Сравнить точную налоговую нагрузку →</a>
                    </div>
                </div>
            `;
            ctaTitle = 'Открыть ИП и расчётный счёт';
            ctaText = 'Оформление ИП и счёта в банке-партнёре — онлайн, без визита в налоговую.';
        } else {
            titleText = 'Вам подходит ИП на УСН «Доходы минус расходы»';
            rateBlockHtml = `
                <div class="receipt-lines">
                    <div class="receipt-line">
                        <span class="label">Ставка налога</span>
                        <span class="dots"></span>
                        <span class="amount mono">${c.USN_INCOME_MINUS_EXPENSES_RATE * 100}% с разницы (доходы − расходы)</span>
                    </div>
                    <div class="receipt-line">
                        <span class="label">Фиксвзносы ИП «за себя» (2026)</span>
                        <span class="dots"></span>
                        <span class="amount mono">${formatMoney(c.IP_FIXED_CONTRIBUTION)} ₽/год</span>
                    </div>
                </div>
            `;
            nextStepsHtml = `
                <div class="wizard-result__next-steps">
                    <h3>Что дальше</h3>
                    <ol>
                        <li>Зарегистрировать ИП через Госуслуги или банк-партнёр</li>
                        <li>Открыть расчётный счёт для ИП и вести учёт расходов с подтверждающими документами</li>
                    </ol>
                    <div class="wizard-result__actions">
                        <a href="ip-ili-samozanyatyy.html" class="calc-card">Сравнить точную налоговую нагрузку →</a>
                    </div>
                </div>
            `;
            ctaTitle = 'Открыть ИП и расчётный счёт';
            ctaText = 'Оформление ИП и счёта в банке-партнёре — онлайн, без визита в налоговую.';
        }

        return `
            <div class="wizard-step-header">
                <button type="button" class="wizard-back-btn" data-wizard-action="back" aria-label="Назад">←</button>
            </div>
            <section class="wizard-result" data-regime="${regime}">
                <span class="wizard-result__stamp"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Рекомендация готова</span>
                <h2 class="wizard-result__title">${titleText}</h2>
                <ul class="wizard-result__reasons">${reasonsHtml}</ul>
                ${rateBlockHtml}
                ${nextStepsHtml}
                <div class="partner-cta-card">
                    <span class="partner-cta-card__eyebrow">Следующий шаг</span>
                    <h3 class="partner-cta-card__title">${ctaTitle}</h3>
                    <p class="partner-cta-card__text">${ctaText}</p>
                    <a href="#" class="btn btn-primary partner-cta-card__btn">Открыть счёт →</a>
                    <p class="partner-cta-card__note">Партнёрская ссылка появится после подключения программы банка.</p>
                </div>
                <p class="receipt-disclaimer">Это ориентир, а не официальная консультация. Точный расчёт может отличаться в зависимости от региона и вида деятельности — проверьте на сайте ФНС или у бухгалтера перед регистрацией.</p>
                <div class="wizard-result__actions">
                    <button type="button" class="btn btn-secondary" data-wizard-action="restart">Пройти заново</button>
                </div>
            </section>
        `;
    },

    renderPanel(step, direction) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const oldPanel = this.stage.querySelector('.wizard-panel');
        const html = this.buildPanelContent(step);

        const newPanel = document.createElement('div');
        newPanel.className = 'wizard-panel';
        newPanel.innerHTML = html;

        if (prefersReducedMotion || !oldPanel || !direction) {
            if (oldPanel) oldPanel.remove();
            this.stage.appendChild(newPanel);
            this.bindPanelEvents(newPanel, step);
            return;
        }

        oldPanel.classList.add(direction === 'forward' ? 'wizard-panel--exit-left' : 'wizard-panel--exit-right');
        oldPanel.addEventListener('animationend', () => oldPanel.remove(), { once: true });

        newPanel.classList.add(direction === 'forward' ? 'wizard-panel--enter-right' : 'wizard-panel--enter-left');
        this.stage.appendChild(newPanel);
        this.bindPanelEvents(newPanel, step);

        requestAnimationFrame(() => {
            newPanel.classList.add('wizard-panel--enter-active');
        });
    },

    bindPanelEvents(panel, step) {
        const startBtn = panel.querySelector('[data-wizard-action="start"]');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.goNext(1));
        }

        const backBtn = panel.querySelector('[data-wizard-action="back"]');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.goBack(step - 1));
        }

        const restartBtn = panel.querySelector('[data-wizard-action="restart"]');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                clearWizardResult();
                this.restart();
            });
        }

        const radios = panel.querySelectorAll('input[data-wizard-question]');
        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.selectAnswer(radio.dataset.wizardQuestion, radio.value);
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    wizardApp.init();
});
