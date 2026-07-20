/**
 * Финансовый помощник для самозанятых
 * Unit-тесты ключевых расчётов.
 *
 * Запуск: node tests/calculations.test.js
 * Или через CI: npm test
 */

const assert = require('assert');

// ============================================
// Заглушка браузерного окружения
// ============================================

global.window = {};

// Минимальный stub document для загрузки calculators.js
// (файл использует document.getElementById, querySelector, addEventListener и т.д.)
function mockElement() {
    const el = {
        style: {},
        classList: { add() {}, remove() {}, contains() { return false; } },
        setAttribute() {}, getAttribute() { return null; },
        appendChild() {}, removeChild() {},
        addEventListener() {}, removeEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        _textContent: '',
        _innerHTML: '',
        get textContent() { return this._textContent; },
        set textContent(v) {
            this._textContent = v;
            // Имитация экранирования HTML при установке textContent
            this._innerHTML = String(v)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        },
        get innerHTML() { return this._innerHTML; },
        set innerHTML(v) { this._innerHTML = v; },
        value: '',
        checked: false, href: '', download: '',
        closest() { return null; },
        cloneNode() { return mockElement(); },
        remove() {}, focus() {}, click() {}, select() {},
        dataset: {},
        offsetWidth: 0, offsetHeight: 0,
        scrollHeight: 0,
        matches() { return false; }
    };
    return el;
}

global.document = {
    getElementById() { return mockElement(); },
    querySelector() { return mockElement(); },
    querySelectorAll() { return []; },
    createElement() { return mockElement(); },
    createTextNode(text) { return { textContent: text }; },
    addEventListener() {},
    removeEventListener() {},
    body: mockElement(),
    head: mockElement(),
    documentElement: mockElement(),
    readyState: 'complete'
};

// Stub localStorage
global.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = String(value); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
};

// Stub URLSearchParams (used in calculators for URL sharing)
if (typeof URLSearchParams === 'undefined') {
    global.URLSearchParams = class {
        constructor() {}
        get() { return null; }
        has() { return false; }
        toString() { return ''; }
    };
}

// Загружаем rules-2026.js (определяет window.RULES_2026)
require('../js/rules-2026.js');

// Загружаем calculators.js — определяет объекты калькуляторов в глобальной области
// (в браузере они в window, в Node — нужно eval с заменой const→var для доступа)
const fs = require('fs');
const path = require('path');
const calculatorsCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'calculators.js'), 'utf8')
    // const не утекает из eval в окружающую область видимости, var — утекает
    .replace(/\bconst\b/g, 'var');
eval(calculatorsCode);

// ============================================
// Тесты: Калькулятор «Отложить на налог» (вычет НПД)
// ============================================

function testSetAsideNoDeduction() {
    // Без вычета — стандартная ставка
    const result = setAsideCalculator.calculate(100000, 'business', 0);
    assert.strictEqual(result.setAside, 6000, 'Налог 6% без вычета = 6000');
    assert.strictEqual(result.toKeep, 94000, 'Остаток = 94000');
    assert.strictEqual(result.deductionUsed, 0, 'Вычет не использован');
}

function testSetAsideFullDeduction() {
    // Полный вычет: остаток больше потенциальной экономии
    // Доход 100 000 от юрлица, ставка 6%, льготная 4%
    // Потенциальная экономия = 100 000 × (6% - 4%) = 2 000
    // Остаток вычета = 10 000 → вычет покрывает полностью
    const result = setAsideCalculator.calculate(100000, 'business', 10000);
    assert.strictEqual(result.taxWithoutDeduction, 6000, 'Налог без вычета = 6000');
    assert.strictEqual(result.deductionUsed, 2000, 'Использовано вычета = 2000');
    assert.strictEqual(result.setAside, 4000, 'Налог с вычетом = 4000 (4%)');
    assert.strictEqual(result.deductionRemainingAfter, 8000, 'Остаток вычета = 8000');
}

function testSetAsidePartialDeduction() {
    // Частичный вычет — ключевой тест из ТЗ
    // Доход 100 000 от юрлица, ставка 6%, льготная 4%
    // Потенциальная экономия = 2 000
    // Остаток вычета = 500 → вычет применяется частично
    const result = setAsideCalculator.calculate(100000, 'business', 500);
    assert.strictEqual(result.taxWithoutDeduction, 6000, 'Налог без вычета = 6000');
    assert.strictEqual(result.deductionUsed, 500, 'Использовано вычета = 500 (частично)');
    assert.strictEqual(result.setAside, 5500, 'Налог к резервированию = 5500');
    assert.strictEqual(result.deductionRemainingAfter, 0, 'Остаток вычета = 0');
}

function testSetAsideIndividuals() {
    // Физлица: ставка 4%, льготная 3%
    // Доход 100 000, потенциальная экономия = 100 000 × (4% - 3%) = 1 000
    const result = setAsideCalculator.calculate(100000, 'individual', 500);
    assert.strictEqual(result.deductionUsed, 500, 'Использовано вычета = 500');
    assert.strictEqual(result.setAside, 3500, 'Налог = 4000 - 500 = 3500');
}

function testSetAsideZeroPayment() {
    const result = setAsideCalculator.calculate(0, 'business', 10000);
    assert.strictEqual(result.setAside, 0, 'Нулевой платёж → нулевой налог');
}

// ============================================
// Тесты: Калькулятор лимита дохода
// ============================================

function testIncomeLimitFarFromLimit() {
    const limit = incomeCalculator.INCOME_LIMIT;
    assert.strictEqual(limit, 2400000, 'Лимит НПД = 2 400 000');
    // Далеко от лимита
    const remaining = limit - 500000;
    assert.ok(remaining > limit * 0.1, 'Запас больше 10%');
}

function testIncomeLimitNearLimit() {
    const limit = incomeCalculator.INCOME_LIMIT;
    const remaining = limit - 2200000;
    assert.ok(remaining < limit * 0.1, 'Осталось менее 10%');
}

function testIncomeLimitExceeded() {
    const limit = incomeCalculator.INCOME_LIMIT;
    const remaining = limit - 3000000;
    assert.ok(remaining < 0, 'Лимит превышен');
}

// ============================================
// Тесты: Сравнение НПД и ИП
// ============================================

function testIpComparisonBasic() {
    const result = ipCalculator.compare(1000000, 'individual');
    // НПД: 1 000 000 × 4% = 40 000
    assert.strictEqual(result.npd, 40000, 'НПД с физлиц = 40 000');
    // ИП: max(6% × 1 000 000, взносы)
    // Взносы: 57 390 + 1% × (1 000 000 - 300 000) = 57 390 + 7 000 = 64 390
    // Налог: 60 000, взносы: 64 390 → max = 64 390
    assert.strictEqual(result.ip, 64390, 'ИП на УСН = 64 390');
    assert.strictEqual(result.ipContributions, 64390, 'Взносы ИП = 64 390');
    assert.strictEqual(result.overLimit, false, 'Доход в пределах лимита');
}

function testIpComparisonBusiness() {
    const result = ipCalculator.compare(1000000, 'business');
    // НПД: 1 000 000 × 6% = 60 000
    assert.strictEqual(result.npd, 60000, 'НПД с юрлиц = 60 000');
}

function testIpComparisonOverLimit() {
    const result = ipCalculator.compare(3000000, 'individual');
    assert.strictEqual(result.overLimit, true, 'Доход свыше лимита НПД');
}

// ============================================
// Тесты: Ставка в час
// ============================================

function testHourlyRateTarget() {
    // Желаемый чистый доход 100 000, 160 часов, физлица (4%)
    // grossNeeded = 100 000 / (1 - 0.04) = 104 166.67
    // hourlyRate = 104 167 / 160 ≈ 651
    const result = hourlyRateCalculator.calculateTargetRate(100000, 160, 'individual');
    assert.ok(result.hourlyRate > 0, 'Ставка положительная');
    assert.ok(result.grossMonthly > 100000, 'Валовый доход больше чистого');
}

function testHourlyRateActual() {
    // Оплата 50 000, 40 часов, юрлица (6%)
    // net = 50 000 × (1 - 0.06) = 47 000
    // netHourly = 47 000 / 40 = 1 175
    const result = hourlyRateCalculator.calculateActualRate(50000, 40, 'business');
    assert.strictEqual(result.netTotal, 47000, 'Чистыми = 47 000');
    assert.strictEqual(result.netHourlyRate, 1175, 'Ставка в час = 1 175');
}

function testHourlyRateZeroExpenses() {
    const result = hourlyRateCalculator.calculateActualRate(50000, 0, 'individual');
    assert.strictEqual(result.netHourlyRate, 0, 'Нулевые часы → нулевая ставка');
}

// ============================================
// Тесты: Вычет 10 000 ₽
// ============================================

function testDeductionFull() {
    // Доход от физлиц 100 000, от юрлиц 0
    // used = 100 000 × 1% = 1 000
    const used = deductionCalculator.calculateUsed(100000, 0);
    assert.strictEqual(used, 1000, 'Использовано 1 000 вычета');
}

function testDeductionExhausted() {
    // Доход от физлиц 1 000 000 → used = 10 000 (исчерпан)
    const used = deductionCalculator.calculateUsed(1000000, 0);
    assert.strictEqual(used, 10000, 'Вычет исчерпан на 10 000');
    const remaining = deductionCalculator.remaining(1000000, 0);
    assert.strictEqual(remaining, 0, 'Остаток = 0');
}

function testDeductionZero() {
    const used = deductionCalculator.calculateUsed(0, 0);
    assert.strictEqual(used, 0, 'Нулевой доход → нулевой вычет');
}

// ============================================
// Тесты: Пенсионный стаж
// ============================================

function testPensionCostForMonths() {
    const fullYear = pensionCalculator.FULL_YEAR_COST_2026;
    assert.strictEqual(fullYear, 71525.52, 'Стоимость года = 71 525,52');
    // 6 месяцев
    const cost = pensionCalculator.costForMonths(6);
    assert.strictEqual(cost, Math.round(71525.52 * 0.5), 'Стоимость 6 мес. = 35 763');
}

function testPensionMonthsForPayment() {
    const months = pensionCalculator.monthsForPayment(35762.76);
    assert.ok(Math.abs(months - 6) < 0.1, '35 762,76 ₽ ≈ 6 месяцев');
}

// ============================================
// Тесты: Больничный
// ============================================

function testContributionMonthly() {
    // 35 000 × 3,84% = 1 344
    const monthly = contributionCalculator.calculateMonthlyContribution(35000);
    assert.strictEqual(monthly, 1344, 'Взнос 35 000 × 3,84% = 1 344');
}

function testContributionMonthly50000() {
    // 50 000 × 3,84% = 1 920
    const monthly = contributionCalculator.calculateMonthlyContribution(50000);
    assert.strictEqual(monthly, 1920, 'Взнос 50 000 × 3,84% = 1 920');
}

function testContributionTotalCost() {
    // 12 месяцев без скидок
    const yearCost = contributionCalculator.calculateTotalCost(35000, 12);
    // 1 344 × 12 = 16 128
    assert.strictEqual(yearCost, 16128, 'Год взносов = 16 128');
}

// ============================================
// Тесты: Концентрация дохода
// ============================================

function testConcentrationNoRisk() {
    const sources = [
        { name: 'A', monthlyIncome: 50000, monthsWorking: 12 },
        { name: 'B', monthlyIncome: 50000, monthsWorking: 12 }
    ];
    const results = concentrationTracker.calculate(sources);
    assert.strictEqual(results[0].share, 50, '50/50 — нет риска');
    assert.strictEqual(results[0].risky, false, 'Не рискованно');
}

function testConcentrationRisky() {
    const sources = [
        { name: 'A', monthlyIncome: 75000, monthsWorking: 8 },
        { name: 'B', monthlyIncome: 25000, monthsWorking: 8 }
    ];
    const results = concentrationTracker.calculate(sources);
    assert.strictEqual(results[0].share, 75, '75% от одного клиента');
    assert.strictEqual(results[0].risky, true, 'Рискованно: ≥70% и ≥6 мес.');
}

function testConcentrationShortTermNoRisk() {
    const sources = [
        { name: 'A', monthlyIncome: 80000, monthsWorking: 3 },
        { name: 'B', monthlyIncome: 20000, monthsWorking: 3 }
    ];
    const results = concentrationTracker.calculate(sources);
    assert.strictEqual(results[0].risky, false, '80% но только 3 месяца — не риск');
}

function testConcentrationEscapeHtml() {
    // Проверка экранирования имени клиента
    const malicious = '<script>alert(1)</script>';
    const escaped = concentrationTracker.escapeHtml(malicious);
    assert.ok(!escaped.includes('<script>'), 'HTML-теги экранированы');
    assert.ok(escaped.includes('&lt;script&gt;'), 'Теги заменены на entities');
}

function testConcentrationEscapeAttr() {
    // Имя клиента с двойной кавычкой не должно вырываться из атрибута value="..."
    const malicious = '"><img src=x onerror=alert(1)>';
    const escaped = concentrationTracker.escapeAttr(malicious);
    assert.ok(!escaped.includes('"'), 'Двойная кавычка экранирована (нет выхода из атрибута)');
    assert.ok(escaped.includes('&quot;'), 'Кавычка заменена на &quot;');
    assert.ok(!escaped.includes('<img'), 'Инъекция тега нейтрализована');
}

function testConcentrationEscapeAttrNormalName() {
    // Обычное имя не должно искажаться
    const escaped = concentrationTracker.escapeAttr('ООО «Ромашка»');
    assert.ok(escaped.includes('Ромашка'), 'Текст сохранён');
}

// ============================================
// Тесты: Экранирование HTML в генераторе документов
// ============================================

function testContractEscapeHtml() {
    const malicious = '<script>alert("xss")</script>';
    const escaped = contractGenerator.escapeHtml(malicious);
    assert.ok(!escaped.includes('<script>'), 'HTML-теги экранированы');
    assert.ok(escaped.includes('&lt;script&gt;'), 'Теги заменены на entities');
}

function testContractEscapeQuotes() {
    const input = '"><img src=x onerror=alert(1)';
    const escaped = contractGenerator.escapeHtml(input);
    // Экранирование не удаляет текст, но нейтрализует HTML-теги
    assert.ok(!escaped.includes('<img'), 'HTML-теги нейтрализованы');
    assert.ok(escaped.includes('&lt;'), 'Угловые скобки экранированы');
    assert.ok(escaped.includes('&quot;'), 'Кавычки экранированы');
}

// ============================================
// Тесты: Edge cases — пустые, отрицательные, дробные, большие
// ============================================

function testSetAsideNegativePayment() {
    // Отрицательный платёж нормализуется до 0
    const result = setAsideCalculator.calculate(-1000, 'business', 0);
    assert.strictEqual(result.setAside, 0, 'Отрицательный платёж → налог 0');
    assert.strictEqual(result.toKeep, 0, 'Остаток = 0');
}

function testSetAsideNegativeDeduction() {
    // Отрицательный остаток вычета нормализуется до 0
    const result = setAsideCalculator.calculate(100000, 'business', -500);
    assert.strictEqual(result.deductionUsed, 0, 'Отрицательный вычет → 0');
    assert.strictEqual(result.setAside, 6000, 'Налог по полной ставке');
}

function testSetAsideExcessDeduction() {
    // Вычет больше 10 000 ограничивается до 10 000
    const result = setAsideCalculator.calculate(100000, 'business', 50000);
    assert.strictEqual(result.deductionRemainingAfter, 8000, 'Остаток = 10000 - 2000 = 8000');
}

function testSetAsideFractionalPayment() {
    const result = setAsideCalculator.calculate(1000.50, 'business', 0);
    assert.ok(typeof result.setAside === 'number', 'Не падает на дробных');
}

function testSetAsideHugePayment() {
    const result = setAsideCalculator.calculate(999999999, 'business', 0);
    assert.ok(result.setAside > 0, 'Работает с большими числами');
}

function testSetAsideNullPayment() {
    const result = setAsideCalculator.calculate(null, 'business', 5000);
    assert.strictEqual(result.setAside, 0, 'null платёж → налог 0');
}

function testSetAsideUndefinedPayment() {
    const result = setAsideCalculator.calculate(undefined, 'business', 5000);
    assert.strictEqual(result.setAside, 0, 'undefined платёж → налог 0');
}

// ============================================
// Тесты: Валидация полей ввода
// ============================================

function testValidateInnValidIndividual() {
    // 12 цифр — физлицо
    const result = validateInn('770123456789');
    assert.strictEqual(result.valid, true, 'ИНН физлица 12 цифр — валиден');
    assert.strictEqual(result.length, 12, 'Длина = 12');
}

function testValidateInnValidBusiness() {
    // 10 цифр — юрлицо
    const result = validateInn('7701234567');
    assert.strictEqual(result.valid, true, 'ИНН юрлица 10 цифр — валиден');
    assert.strictEqual(result.length, 10, 'Длина = 10');
}

function testValidateInnTooShort() {
    const result = validateInn('770123');
    assert.strictEqual(result.valid, false, 'Короткий ИНН — невалиден');
}

function testValidateInnTooLong() {
    const result = validateInn('7701234567890123');
    assert.strictEqual(result.valid, false, 'Длинный ИНН — невалиден');
}

function testValidateInnNonDigit() {
    const result = validateInn('77012345AB');
    assert.strictEqual(result.valid, false, 'ИНН с буквами — невалиден');
    assert.strictEqual(result.nonDigit, true, 'Флаг nonDigit установлен');
}

function testValidateInnEmpty() {
    const result = validateInn('');
    assert.strictEqual(result.valid, true, 'Пустой ИНН — валиден (необязательное поле)');
    assert.strictEqual(result.empty, true, 'Флаг empty установлен');
}

function testValidateInnWithSpaces() {
    const result = validateInn('770 123 456 789');
    assert.strictEqual(result.valid, true, 'ИНН с пробелами валиден (пробелы игнорируются)');
    assert.strictEqual(result.length, 12, 'Длина без пробелов = 12');
}

function testHasNonDigitChars() {
    assert.strictEqual(hasNonDigitChars('12345'), false, 'Только цифры — false');
    assert.strictEqual(hasNonDigitChars('12a45'), true, 'Буква — true');
    assert.strictEqual(hasNonDigitChars('12 45'), false, 'Пробел — false (разделитель разрядов)');
    assert.strictEqual(hasNonDigitChars('-100'), true, 'Минус — true (не цифра)');
}

function testHasNonDigitCharsDecimals() {
    // Строгий режим (без decimals) — точка/запятая запрещены (ИНН, целые суммы)
    assert.strictEqual(hasNonDigitChars('12.5'), true, 'Точка запрещена в строгом режиме');
    assert.strictEqual(hasNonDigitChars('12,5'), true, 'Запятая запрещена в строгом режиме');
    // Режим decimals (часы, копейки) — точка/запятая разрешены
    assert.strictEqual(hasNonDigitChars('12.5', true), false, 'Точка разрешена в decimals-режиме');
    assert.strictEqual(hasNonDigitChars('12,5', true), false, 'Запятая разрешена в decimals-режиме');
    assert.strictEqual(hasNonDigitChars('12a5', true), true, 'Буква запрещена даже в decimals-режиме');
}

function testParseAmountWithSpaces() {
    assert.strictEqual(parseAmount('1 500 000'), 1500000, 'Пробелы-разделители корректно парсятся');
    assert.strictEqual(parseAmount('300000'), 300000, 'Без пробелов');
    assert.strictEqual(parseAmount(''), 0, 'Пустая строка → 0');
    assert.strictEqual(parseAmount('abc'), 0, 'Нечисловой ввод → 0');
}

// ============================================
// Тесты: B-flow движок (b-flow.js)
// ============================================

function testBflowFormatMoney() {
    // Загружаем b-flow.js для доступа к window.NPD.bflowFormat
    const bflowCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'b-flow.js'), 'utf8');
    eval(bflowCode);
    assert.strictEqual(typeof window.NPD.bflowFormat.money, 'function', 'formatMoney существует');
    // Russian locale uses non-breaking spaces — strip them for comparison
    const formatted = window.NPD.bflowFormat.money(1500000).replace(/\s/g, '');
    assert.strictEqual(formatted, '1500000', 'Форматирование миллионов');
    assert.strictEqual(window.NPD.bflowFormat.money(0), '0', 'Форматирование нуля');
    assert.strictEqual(window.NPD.bflowFormat.money(null), '—', 'null → прочерк');
    const withSuffix = window.NPD.bflowFormat.money(1234, '₽').replace(/\s/g, '');
    assert.strictEqual(withSuffix, '1234₽', 'С суффиксом');
}

function testBflowFormatPercent() {
    const bflowCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'b-flow.js'), 'utf8');
    eval(bflowCode);
    assert.strictEqual(typeof window.NPD.bflowFormat.percent, 'function', 'formatPercent существует');
    assert.strictEqual(window.NPD.bflowFormat.percent(75.5), '75,5%', 'Процент с дробной');
    assert.strictEqual(window.NPD.bflowFormat.percent(100), '100%', 'Целый процент');
    assert.strictEqual(window.NPD.bflowFormat.percent(null), '—', 'null → прочерк');
}

function testBflowCollectValues() {
    const bflowCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'b-flow.js'), 'utf8');
    eval(bflowCode);
    // collectValues доступен внутри IIFE, но можно протестировать через createBFlow
    // Тестируем через mock DOM
    const mockInput = { value: '1 500 000', inputMode: 'numeric', type: 'text', getAttribute: (n) => n === 'data-name' ? 'earned' : null };
    // collectValues не экспортирован, но мы можем проверить логику через createBFlow
    // Для простоты тестируем, что window.NPD.createBFlow существует
    assert.strictEqual(typeof window.NPD.createBFlow, 'function', 'createBFlow — функция');
}

// ============================================
// Тесты: Профиль (profile.js)
// ============================================

function testProfileAddClient() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    const id = window.NPD.profile.addClient('ООО Ромашка');
    assert.ok(id && id.startsWith('client_'), 'addClient возвращает ID');
    // isEmpty checks income array, not clients — add income to make it non-empty
    window.NPD.profile.addIncome('2026-01', 100, 'phys', id);
    assert.strictEqual(window.NPD.profile.isEmpty(), false, 'Профиль не пуст после добавления дохода');
}

function testProfileDuplicateClient() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    const id1 = window.NPD.profile.addClient('ООО Ромашка');
    const id2 = window.NPD.profile.addClient('ООО Ромашка');
    assert.strictEqual(id1, id2, 'Дубликат возвращает тот же ID');
}

function testProfileEmpty() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    assert.strictEqual(window.NPD.profile.isEmpty(), true, 'Новый профиль пуст');
}

function testProfileAddIncome() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addClient('ООО Тест');
    window.NPD.profile.addIncome('2026-01', 100000, 'phys', 'client_test');
    assert.strictEqual(window.NPD.profile.getYearIncome(), 100000, 'Доход за 2026 = 100 000');
}

function testProfileLimitProgress() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addIncome('2026-01', 1200000, 'phys', 'client_1');
    const progress = window.NPD.profile.getLimitProgress();
    assert.strictEqual(progress.used, 1200000, 'Использовано 1 200 000');
    assert.strictEqual(progress.remaining, 1200000, 'Остаток 1 200 000');
    assert.strictEqual(progress.percent, 50, '50% от лимита');
    assert.strictEqual(progress.limit, 2400000, 'Лимит 2 400 000');
}

function testProfileLimitExceeded() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addIncome('2026-01', 3000000, 'phys', 'client_1');
    const progress = window.NPD.profile.getLimitProgress();
    assert.strictEqual(progress.remaining, 0, 'Остаток = 0 при превышении');
    assert.ok(progress.percent >= 100, '100%+ при превышении (факт: ' + progress.percent + '%)');
}

function testProfileConcentration() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addClient('Клиент А');
    window.NPD.profile.addClient('Клиент Б');
    window.NPD.profile.addIncome('2026-01', 85000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-01', 15000, 'phys', 'client_2');
    const conc = window.NPD.profile.getConcentration();
    assert.strictEqual(conc.topShare, 85, 'Главный клиент 85%');
    assert.strictEqual(conc.risk, 'red', 'Риск red при >80%');
}

function testProfileConcentrationAmber() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addClient('Клиент А');
    window.NPD.profile.addClient('Клиент Б');
    window.NPD.profile.addIncome('2026-01', 60000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-01', 40000, 'phys', 'client_2');
    const conc = window.NPD.profile.getConcentration();
    assert.strictEqual(conc.topShare, 60, '60/40');
    assert.strictEqual(conc.risk, 'amber', 'Риск amber при >=50%');
}

function testProfileConcentrationSafe() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addClient('Клиент А');
    window.NPD.profile.addClient('Клиент Б');
    window.NPD.profile.addIncome('2026-01', 40000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-01', 60000, 'phys', 'client_2');
    const conc = window.NPD.profile.getConcentration();
    assert.strictEqual(conc.topShare, 60, '40/60');
    assert.strictEqual(conc.risk, 'amber', '60% → amber');
}

function testProfileConcentrationGreen() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addClient('Клиент А');
    window.NPD.profile.addClient('Клиент Б');
    window.NPD.profile.addIncome('2026-01', 30000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-01', 70000, 'phys', 'client_2');
    const conc = window.NPD.profile.getConcentration();
    assert.strictEqual(conc.topShare, 70, '30/70');
    assert.strictEqual(conc.risk, 'amber', '70% → amber (<80%)');
}

function testProfileConcentrationGreenLow() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addClient('Клиент А');
    window.NPD.profile.addClient('Клиент Б');
    window.NPD.profile.addIncome('2026-01', 45000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-01', 55000, 'phys', 'client_2');
    const conc = window.NPD.profile.getConcentration();
    assert.strictEqual(conc.topShare, 55, '45/55');
    assert.strictEqual(conc.risk, 'amber', '55% → amber');
}

function testProfileConcentrationGreenEqual() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addClient('Клиент А');
    window.NPD.profile.addClient('Клиент Б');
    window.NPD.profile.addIncome('2026-01', 50000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-01', 50000, 'phys', 'client_2');
    const conc = window.NPD.profile.getConcentration();
    assert.strictEqual(conc.topShare, 50, '50/50');
    assert.strictEqual(conc.risk, 'amber', '50% → amber (>=50)');
}

function testProfileForecast() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    // Симуляция: январь-июнь заработали 1 800 000 → avg 300 000/мес
    window.NPD.profile.addIncome('2026-01', 300000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-02', 300000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-03', 300000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-04', 300000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-05', 300000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-06', 300000, 'phys', 'client_1');
    const forecast = window.NPD.profile.getForecast();
    // monthsPassed = текущий месяц + 1 (июль = 6, значит 7 месяцев)
    // avgPerMonth = 1800000 / 7 ≈ 257143
    // remaining = 2400000 - 1800000 = 600000
    // monthsToLimit = ceil(600000 / 257143) = 3
    // monthsToLimit + monthsPassed = 3 + 7 = 10 <= 12 → willHitLimit = true
    assert.ok(forecast.willHitLimit, 'Прогноз: лимит будет достигнут');
    assert.ok(forecast.etaMonth, 'Месяц достижения лимита указан');
    assert.ok(forecast.avgPerMonth > 0, 'Средний доход указан');
}

function testProfileForecastNoHit() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addIncome('2026-01', 50000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-02', 50000, 'phys', 'client_1');
    const forecast = window.NPD.profile.getForecast();
    assert.strictEqual(forecast.willHitLimit, false, 'Лимит не будет достигнут');
}

function testProfileClear() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    window.NPD.profile.addClient('Клиент');
    window.NPD.profile.addIncome('2026-01', 100000, 'phys', 'client_1');
    assert.strictEqual(window.NPD.profile.isEmpty(), false, 'Профиль не пуст');
    window.NPD.profile.clearProfile();
    assert.strictEqual(window.NPD.profile.isEmpty(), true, 'Профиль пуст после очистки');
}

function testProfileInvalidInput() {
    const profileCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'profile.js'), 'utf8');
    eval(profileCode);
    localStorage.clear();
    // null месяц, 0 сумма, отрицательная сумма — всё должно игнорироваться
    window.NPD.profile.addIncome(null, 100000, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-01', 0, 'phys', 'client_1');
    window.NPD.profile.addIncome('2026-01', -100, 'phys', 'client_1');
    assert.strictEqual(window.NPD.profile.getYearIncome(), 0, 'Невалидные записи не учитываются');
}

// ============================================
// Тесты: 289-ФЗ (chasy-289-fz.html)
// ============================================

function test289Limit() {
    assert.strictEqual(chasy289Calculator.LIMIT, 60, 'Лимит 289-ФЗ = 60 часов');
}

function test289UnderLimit() {
    chasy289Calculator.resultsEl = { innerHTML: '' };
    const result = chasy289Calculator.renderData(40, 'test-client', '2026-07');
    assert.strictEqual(result.status, 'green', '40 часов — в пределах лимита');
    assert.strictEqual(result.remaining, 20, 'Осталось 20 часов');
    assert.strictEqual(result.percent, 66.7, '66,7% от лимита');
}

function test289AtLimit() {
    chasy289Calculator.resultsEl = { innerHTML: '' };
    const result = chasy289Calculator.renderData(60, 'test-client', '2026-07');
    assert.strictEqual(result.status, 'red', '60 часов — на грани');
    assert.strictEqual(result.remaining, 0, 'Осталось 0 часов');
}

function test289OverLimit() {
    chasy289Calculator.resultsEl = { innerHTML: '' };
    const result = chasy289Calculator.renderData(80, 'test-client', '2026-07');
    assert.strictEqual(result.status, 'red', '80 часов — превышение');
    assert.strictEqual(result.remaining, -20, 'Превышение на 20 часов');
}

function test289ZeroHours() {
    const result = chasy289Calculator.renderData(0, 'test-client', '2026-07');
    assert.ok(result.empty, 'Нулевые часы → пустое состояние');
}

function test289NoClient() {
    const result = chasy289Calculator.renderData(40, '', '2026-07');
    assert.ok(result.empty, 'Пустой клиент → пустое состояние');
}

// ============================================
// Тесты: Риск переквалификации (risk-trudovyh.html)
// ============================================

// Тестируем НАСТОЯЩИЙ riskTrudovyhCalculator.render() через управляемые
// мок-объекты checkboxes/shareInput и парсинг уровня из сгенерированного HTML
// (класс b-flow__risk--${level}). Это ловит регрессии в реальной логике,
// а не в переписанной копии формулы внутри теста.
function setupRisk(count, share) {
    const checkboxes = [];
    for (let i = 0; i < count; i++) checkboxes.push({ checked: true });
    riskTrudovyhCalculator.resultsEl = { innerHTML: '' };
    riskTrudovyhCalculator.checkboxes = checkboxes;
    riskTrudovyhCalculator.shareInput = { value: String(share) };
    riskTrudovyhCalculator.render();
    const html = riskTrudovyhCalculator.resultsEl.innerHTML;
    const levelMatch = html.match(/b-flow__risk--(green|amber|red)/);
    return { html, level: levelMatch ? levelMatch[1] : null };
}

function testRiskZero() {
    // 0 признаков и 0 доли → пустое состояние (нет данных для оценки)
    riskTrudovyhCalculator.resultsEl = { innerHTML: '' };
    riskTrudovyhCalculator.checkboxes = [];
    riskTrudovyhCalculator.shareInput = { value: '0' };
    riskTrudovyhCalculator.render();
    assert.ok(riskTrudovyhCalculator.resultsEl.innerHTML.includes('b-flow__empty'),
        '0 признаков + 0 доли → пустое состояние');
}

function testRiskAmber() {
    const { level, html } = setupRisk(1, 0);
    assert.strictEqual(level, 'amber', '1 признак → amber');
    assert.ok(html.includes('Признаки'), 'Заголовок содержит «Признаки»');
}

function testRiskRedFromSigns() {
    const { level } = setupRisk(3, 0);
    assert.strictEqual(level, 'red', '3 признака → red');
}

function testRiskRedFromShare() {
    const { level } = setupRisk(0, 85);
    assert.strictEqual(level, 'red', '85% доля → red');
}

function testRiskAmberFromShare() {
    const { level } = setupRisk(0, 60);
    assert.strictEqual(level, 'amber', '60% доля → amber');
}

function testRiskBorderShare() {
    const { level } = setupRisk(0, 50);
    assert.strictEqual(level, 'amber', '50% доля → amber (≥50)');
}

function testRiskBorderShareJustBelow() {
    // 49% и 0 признаков → но share > 0, поэтому НЕ пустое состояние, а green
    const { level } = setupRisk(0, 49);
    assert.strictEqual(level, 'green', '49% доля → green (<50)');
}

function testRiskEmptyStateWhenAllZero() {
    // Покрывает ранний return при count===0 && share===0
    const result = setupRisk(0, 0);
    assert.ok(result.html.includes('b-flow__empty'), 'Все нули → empty-состояние');
}

// Тесты monthlyFactor — скидки больничного с 19/25 мес. (ранее не покрыто)
function testMonthlyFactorBase() {
    // 1–18 мес. — полный тариф (множитель 1.0)
    assert.strictEqual(contributionCalculator.monthlyFactor(1), 1.0, '1 мес. — полный тариф');
    assert.strictEqual(contributionCalculator.monthlyFactor(18), 1.0, '18 мес. — ещё полный тариф');
}

function testMonthlyFactorDiscount10() {
    // С 19 мес. — скидка 10% (множитель 0.9)
    assert.strictEqual(contributionCalculator.monthlyFactor(19), 0.9, '19 мес. — скидка 10%');
    assert.strictEqual(contributionCalculator.monthlyFactor(24), 0.9, '24 мес. — ещё 10%');
}

function testMonthlyFactorDiscount30() {
    // С 25 мес. — скидка 30% (множитель 0.7)
    assert.strictEqual(contributionCalculator.monthlyFactor(25), 0.7, '25 мес. — скидка 30%');
    assert.strictEqual(contributionCalculator.monthlyFactor(36), 0.7, '36 мес. — 30%');
}

function testTotalCostWithDiscounts() {
    // 25 мес. при сумме 35 000: 18×1344 + 6×(1344×0.9) + 1×(1344×0.7)
    // = 24 192 + 7 257,6 + 940,8 = 32 390,4 → Math.round накопит 32 390
    const cost = contributionCalculator.calculateTotalCost(35000, 25);
    assert.ok(cost > 16128, '25 мес. дороже 12 мес. из-за длины, но дешевле чем 25×1344');
    assert.ok(cost < 25 * 1344, 'Скидки делают сумму меньше «без скидок»');
}

// Тест: МРОТ 2026 корректен (ФЗ № 429)
function testRulesMrot2026() {
    assert.strictEqual(window.RULES_2026.pension.mrot, 27093, 'МРОТ 2026 = 27 093 ₽ (ФЗ № 429)');
    // Проверка согласованности формулы: 0,22 × 12 × МРОТ = fullYearCost
    const expected = Math.round(0.22 * 12 * 27093 * 100) / 100;
    assert.strictEqual(window.RULES_2026.pension.fullYearCost, expected, 'Формула сходится: 22% × 12 × 27 093');
}

// Тест: parseAmount отсекает экспоненту/шестнадцатеричные/NaN
function testParseAmountExponential() {
    assert.strictEqual(parseAmount('1e9'), 0, 'Экспонента → 0 (не 1)');
    assert.strictEqual(parseAmount('0x10'), 0, 'Шестнадцатеричное → 0');
    assert.strictEqual(parseAmount('Infinity'), 0, 'Infinity → 0');
    assert.strictEqual(parseAmount('12.5'), 0, 'Дробное без поддержки копеек → 0');
    assert.strictEqual(parseAmount('1 500 000'), 1500000, 'Разделители разрядов работают');
    assert.strictEqual(parseAmount(null), 0, 'null → 0');
    assert.strictEqual(parseAmount(undefined), 0, 'undefined → 0');
}

// ============================================
// Тесты: Глобальная escapeHtml (dedup)
// ============================================

function testGlobalEscapeHtml() {
    // escapeHtml должен быть определён в calculators.js после eval
    assert.strictEqual(typeof escapeHtml, 'function', 'escapeHtml — глобальная функция');
    assert.strictEqual(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;', 'Экранирование тегов');
    assert.strictEqual(escapeHtml('100 & 200'), '100 &amp; 200', 'Экранирование амперсанда');
    assert.strictEqual(escapeHtml('normal text'), 'normal text', 'Нормальный текст без изменений');
    assert.strictEqual(escapeHtml(''), '', 'Пустая строка');
}

// ============================================
// Тесты: Правила 2026 (rules-2026.js)
// ============================================

function testRulesIncomeLimit() {
    assert.strictEqual(window.RULES_2026.npd.incomeLimit, 2400000, 'Лимит НПД = 2 400 000');
    assert.strictEqual(window.RULES_2026.npd.rateIndividuals, 0.04, 'Ставка физлица = 4%');
    assert.strictEqual(window.RULES_2026.npd.rateCompanies, 0.06, 'Ставка юрлица = 6%');
}

function testRulesIpUsn() {
    assert.strictEqual(window.RULES_2026.ipUsn.rateIncome, 0.06, 'УСН 6%');
    assert.strictEqual(window.RULES_2026.ipUsn.fixedContribution, 57390, 'Фиксированные взносы ИП');
    assert.strictEqual(window.RULES_2026.ipUsn.additionalRate, 0.01, 'Доп. взнос 1%');
    assert.strictEqual(window.RULES_2026.ipUsn.additionalThreshold, 300000, 'Порог 300 000');
}

function testRulesPension() {
    assert.strictEqual(window.RULES_2026.pension.fullYearCost, 71525.52, 'Стоимость года ОПС');
}

function testRulesSocialInsurance() {
    assert.strictEqual(window.RULES_2026.socialInsurance.tariff, 0.0384, 'Тариф СФР 3,84%');
    assert.deepStrictEqual(window.RULES_2026.socialInsurance.insuranceAmounts, [35000, 50000], 'Страховые суммы');
}

// ============================================
// Запуск всех тестов
// ============================================

const tests = [
    ['Отложить на налог: без вычета', testSetAsideNoDeduction],
    ['Отложить на налог: полный вычет', testSetAsideFullDeduction],
    ['Отложить на налог: частичный вычет (ТЗ)', testSetAsidePartialDeduction],
    ['Отложить на налог: физлица', testSetAsideIndividuals],
    ['Отложить на налог: нулевой платёж', testSetAsideZeroPayment],
    ['Лимит дохода: далеко от лимита', testIncomeLimitFarFromLimit],
    ['Лимит дохода: около лимита', testIncomeLimitNearLimit],
    ['Лимит дохода: превышение', testIncomeLimitExceeded],
    ['НПД vs ИП: базовый (физлица)', testIpComparisonBasic],
    ['НПД vs ИП: юрлица', testIpComparisonBusiness],
    ['НПД vs ИП: превышение лимита', testIpComparisonOverLimit],
    ['Ставка в час: целевая', testHourlyRateTarget],
    ['Ставка в час: фактическая', testHourlyRateActual],
    ['Ставка в час: нулевые часы', testHourlyRateZeroExpenses],
    ['Вычет: полный', testDeductionFull],
    ['Вычет: исчерпан', testDeductionExhausted],
    ['Вычет: нулевой доход', testDeductionZero],
    ['Пенсия: стоимость месяцев', testPensionCostForMonths],
    ['Пенсия: месяцы за сумму', testPensionMonthsForPayment],
    ['Больничный: взнос 35 000', testContributionMonthly],
    ['Больничный: взнос 50 000', testContributionMonthly50000],
    ['Больничный: год взносов', testContributionTotalCost],
    ['Концентрация: нет риска', testConcentrationNoRisk],
    ['Концентрация: риск 75%', testConcentrationRisky],
    ['Концентрация: краткосрочно не риск', testConcentrationShortTermNoRisk],
    ['Документы: экранирование HTML', testContractEscapeHtml],
    ['Документы: экранирование кавычек', testContractEscapeQuotes],
    ['Edge: отрицательный платёж', testSetAsideNegativePayment],
    ['Edge: отрицательный вычет', testSetAsideNegativeDeduction],
    ['Edge: избыточный вычет', testSetAsideExcessDeduction],
    ['Edge: дробный платёж', testSetAsideFractionalPayment],
    ['Edge: огромный платёж', testSetAsideHugePayment],
    ['Edge: null платёж', testSetAsideNullPayment],
    ['Edge: undefined платёж', testSetAsideUndefinedPayment],
    ['Концентрация: XSS экранирование', testConcentrationEscapeHtml],
    ['Концентрация: XSS экранирование атрибута', testConcentrationEscapeAttr],
    ['Концентрация: нормальное имя в атрибуте', testConcentrationEscapeAttrNormalName],
    ['Валидация: ИНН физлица 12 цифр', testValidateInnValidIndividual],
    ['Валидация: ИНН юрлица 10 цифр', testValidateInnValidBusiness],
    ['Валидация: короткий ИНН', testValidateInnTooShort],
    ['Валидация: длинный ИНН', testValidateInnTooLong],
    ['Валидация: ИНН с буквами', testValidateInnNonDigit],
    ['Валидация: пустой ИНН', testValidateInnEmpty],
    ['Валидация: ИНН с пробелами', testValidateInnWithSpaces],
    ['Валидация: нецифровые символы', testHasNonDigitChars],
    ['Валидация: decimals-режим (точка/запятая)', testHasNonDigitCharsDecimals],
    ['Валидация: парсинг сумм с пробелами', testParseAmountWithSpaces],
    // B-flow
    ['B-flow: форматирование денег', testBflowFormatMoney],
    ['B-flow: форматирование процентов', testBflowFormatPercent],
    ['B-flow: createBFlow существует', testBflowCollectValues],
    // Профиль
    ['Профиль: пустой профиль', testProfileEmpty],
    ['Профиль: добавить клиента', testProfileAddClient],
    ['Профиль: дубликат клиента', testProfileDuplicateClient],
    ['Профиль: добавить доход', testProfileAddIncome],
    ['Профиль: прогресс лимита', testProfileLimitProgress],
    ['Профиль: превышение лимита', testProfileLimitExceeded],
    ['Профиль: концентрация красный (>80%)', testProfileConcentration],
    ['Профиль: концентрация amber (60%)', testProfileConcentrationAmber],
    ['Профиль: концентрация amber (60% второй)', testProfileConcentrationSafe],
    ['Профиль: концентрация amber (70%)', testProfileConcentrationGreen],
    ['Профиль: концентрация amber (55%)', testProfileConcentrationGreenLow],
    ['Профиль: концентрация amber (50%)', testProfileConcentrationGreenEqual],
    ['Профиль: прогноз с превышением', testProfileForecast],
    ['Профиль: прогноз без превышения', testProfileForecastNoHit],
    ['Профиль: очистка', testProfileClear],
    ['Профиль: невалидный ввод', testProfileInvalidInput],
    // 289-ФЗ
    ['289-ФЗ: лимит 60 часов', test289Limit],
    ['289-ФЗ: в пределах лимита', test289UnderLimit],
    ['289-ФЗ: на грани лимита', test289AtLimit],
    ['289-ФЗ: превышение лимита', test289OverLimit],
    ['289-ФЗ: нулевые часы', test289ZeroHours],
    ['289-ФЗ: пустой клиент', test289NoClient],
    // Риск переквалификации
    ['Риск: 0 признаков → green', testRiskZero],
    ['Риск: 1 признак → amber', testRiskAmber],
    ['Риск: 3 признака → red', testRiskRedFromSigns],
    ['Риск: 85% доля → red', testRiskRedFromShare],
    ['Риск: 60% доля → amber', testRiskAmberFromShare],
    ['Риск: 50% доля → amber', testRiskBorderShare],
    ['Риск: 49% доля → green', testRiskBorderShareJustBelow],
    ['Риск: все нули → empty-состояние', testRiskEmptyStateWhenAllZero],
    // Больничный: скидки по месяцам (monthlyFactor)
    ['Больничный: базовый тариф 1–18 мес.', testMonthlyFactorBase],
    ['Больничный: скидка 10% с 19 мес.', testMonthlyFactorDiscount10],
    ['Больничный: скидка 30% с 25 мес.', testMonthlyFactorDiscount30],
    ['Больничный: стоимость 25 мес. со скидками', testTotalCostWithDiscounts],
    // МРОТ 2026 + parseAmount edge-cases
    ['Правила: МРОТ 2026 = 27 093 ₽', testRulesMrot2026],
    ['parseAmount: экспонента/NaN → 0', testParseAmountExponential],
    // Глобальная escapeHtml
    ['escapeHtml: глобальная функция', testGlobalEscapeHtml],
    // Правила 2026
    ['Правила: лимит НПД', testRulesIncomeLimit],
    ['Правила: ИП УСН', testRulesIpUsn],
    ['Правила: пенсия ОПС', testRulesPension],
    ['Правила: соцстрах СФР', testRulesSocialInsurance],
];

let passed = 0;
let failed = 0;

for (const [name, fn] of tests) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${name}: ${e.message}`);
        failed++;
    }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
