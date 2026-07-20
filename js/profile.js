/**
 * Финансовый помощник для самозанятых
 * localStorage-профиль (§7 ТЗ) — строго optional.
 *
 * Data model (ключ "npd_profile"):
 * {
 *   "version": 1,
 *   "income": [ { "month": "2026-01", "amount": 210000, "type": "phys", "clientId": "client_1" } ],
 *   "clients": [ { "id": "client_1", "name": "ООО Ромашка" } ],
 *   "updatedAt": "2026-07-18T13:01:00Z"
 * }
 *
 * Приватность: суммы и имена НЕ отправлять в метрику.
 * Экспорт: window.NPD.profile = { addIncome, addClient, getYearIncome, ... }
 */
(function () {
    "use strict";

    window.NPD = window.NPD || {};

    var KEY = "npd_profile";
    var LIMIT = 2400000; // лимит дохода НПД 2,4 млн ₽/год

    // ============================================
    // Чтение / запись
    // ============================================
    function read() {
        try {
            var raw = localStorage.getItem(KEY);
            if (!raw) return { version: 1, income: [], clients: [], updatedAt: null };
            var data = JSON.parse(raw);
            if (!data.income) data.income = [];
            if (!data.clients) data.clients = [];
            return data;
        } catch (e) {
            return { version: 1, income: [], clients: [], updatedAt: null };
        }
    }

    function write(data) {
        data.updatedAt = new Date().toISOString();
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
        } catch (e) {
            // приватный режим — не блокируем
        }
    }

    // ============================================
    // API
    // ============================================
    function addClient(name) {
        if (!name) return null;
        var data = read();
        // Проверка существующего
        var existing = data.clients.find(function (c) { return c.name.toLowerCase() === name.toLowerCase(); });
        if (existing) return existing.id;
        var id = "client_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
        data.clients.push({ id: id, name: name });
        write(data);
        return id;
    }

    function addIncome(month, amount, type, clientId) {
        if (!month || !amount || amount <= 0) return;
        var data = read();
        // Обновить существующую запись за этот месяц+клиента или добавить
        var idx = data.income.findIndex(function (i) {
            return i.month === month && i.clientId === clientId;
        });
        var entry = { month: month, amount: Math.round(amount), type: type || "phys", clientId: clientId || null };
        if (idx >= 0) data.income[idx] = entry;
        else data.income.push(entry);
        write(data);
    }

    function getYearIncome() {
        var data = read();
        var year = new Date().getFullYear();
        return data.income
            .filter(function (i) { return i.month && i.month.indexOf(String(year)) === 0; })
            .reduce(function (sum, i) { return sum + (i.amount || 0); }, 0);
    }

    function getLimitProgress() {
        var used = getYearIncome();
        var remaining = Math.max(0, LIMIT - used);
        var percent = Math.round((used / LIMIT) * 100);
        return { used: used, remaining: remaining, percent: percent, limit: LIMIT };
    }

    function getConcentration() {
        var data = read();
        var year = new Date().getFullYear();
        var byClient = {};
        var total = 0;
        data.income.forEach(function (i) {
            if (!i.month || i.month.indexOf(String(year)) !== 0) return;
            if (!i.clientId) return;
            byClient[i.clientId] = (byClient[i.clientId] || 0) + (i.amount || 0);
            total += i.amount || 0;
        });
        if (total === 0) return { topClientName: null, topShare: 0, risk: "green" };
        var clientIds = Object.keys(byClient);
        if (clientIds.length === 0) return { topClientName: null, topShare: 0, risk: "green" };
        var topId = clientIds.reduce(function (a, b) {
            return byClient[a] > byClient[b] ? a : b;
        }, clientIds[0]);
        var topShare = Math.round((byClient[topId] / total) * 100);
        var client = data.clients.find(function (c) { return c.id === topId; });
        var risk = topShare > 80 ? "red" : (topShare >= 50 ? "amber" : "green");
        return { topClientName: client ? client.name : "Неизвестно", topShare: topShare, risk: risk };
    }

    function getForecast() {
        var data = read();
        var now = new Date();
        var year = now.getFullYear();
        var monthIdx = now.getMonth(); // 0-11
        var yearIncome = data.income
            .filter(function (i) { return i.month && i.month.indexOf(String(year)) === 0; })
            .reduce(function (sum, i) { return sum + (i.amount || 0); }, 0);
        var monthsPassed = monthIdx + 1;
        if (monthsPassed === 0 || yearIncome === 0) return { willHitLimit: false, etaMonth: null };
        var avgPerMonth = yearIncome / monthsPassed;
        var remaining = LIMIT - yearIncome;
        if (remaining <= 0) return { willHitLimit: true, etaMonth: "превышен" };
        var monthsToLimit = Math.ceil(remaining / avgPerMonth);
        if (monthsToLimit + monthsPassed > 12) return { willHitLimit: false, etaMonth: null };
        var etaDate = new Date(year, monthIdx + monthsToLimit, 1);
        var etaMonth = etaDate.toLocaleString("ru-RU", { month: "long" });
        return { willHitLimit: true, etaMonth: etaMonth, avgPerMonth: Math.round(avgPerMonth) };
    }

    function clearProfile() {
        try { localStorage.removeItem(KEY); } catch (e) {}
    }

    function exportProfile() {
        var data = read();
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "npd-profile.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function isEmpty() {
        var data = read();
        return data.income.length === 0;
    }

    // ============================================
    // Виджет (рендерится в контейнер [data-profile-widget])
    // ============================================
    function renderWidget(container) {
        if (!container) return;
        if (isEmpty()) {
            container.hidden = true;
            container.innerHTML = "";
            return;
        }
        container.hidden = false;
        var progress = getLimitProgress();
        var conc = getConcentration();
        var forecast = getForecast();
        var tax = Math.round(progress.used * 0.06); // грубая оценка налога
        var riskLabel = conc.risk === "red" ? "Высокий риск" : (conc.risk === "amber" ? "Внимание" : "Норма");

        var nudge = "";
        if (forecast.willHitLimit && forecast.etaMonth) {
            nudge = '<div class="profile-widget__nudge">При текущем темпе лимит в ' + forecast.etaMonth + ' → <a href="ip-ili-samozanyatyy.html">оценить переход на ИП</a></div>';
        }

        container.innerHTML =
            '<div class="profile-widget__inner">' +
            '<div class="profile-widget__kpi">' +
                '<span class="profile-widget__kpi-label">Доход с начала года</span>' +
                '<span class="profile-widget__kpi-value">' + progress.used.toLocaleString("ru-RU") + ' ₽</span>' +
            '</div>' +
            '<div class="profile-widget__kpi">' +
                '<span class="profile-widget__kpi-label">До лимита</span>' +
                '<span class="profile-widget__kpi-value">' + progress.remaining.toLocaleString("ru-RU") + ' ₽</span>' +
            '</div>' +
            '<div class="profile-widget__kpi">' +
                '<span class="profile-widget__kpi-label">Налог (оценка)</span>' +
                '<span class="profile-widget__kpi-value">' + tax.toLocaleString("ru-RU") + ' ₽</span>' +
            '</div>' +
            '<div class="profile-widget__kpi">' +
                '<span class="profile-widget__kpi-label">Главный заказчик</span>' +
                '<span class="profile-widget__kpi-value profile-widget__kpi-value--' + conc.risk + '">' + conc.topShare + '% · ' + riskLabel + '</span>' +
            '</div>' +
            '<div class="profile-widget__progress">' +
                '<div class="profile-widget__progress-bar">' +
                    '<div class="profile-widget__progress-fill" style="width:' + progress.percent + '%"></div>' +
                '</div>' +
                '<span class="profile-widget__progress-text">' + progress.percent + '% из 2,4 млн ₽</span>' +
            '</div>' +
            nudge +
            '<div class="profile-widget__footer">' +
                '<span class="profile-widget__privacy">Данные только на вашем устройстве</span>' +
                '<button class="profile-widget__btn" data-action="export-profile">Экспорт</button>' +
                '<button class="profile-widget__btn profile-widget__btn--danger" data-action="clear-profile">Очистить</button>' +
            '</div>' +
            '</div>';

        // Привязка кнопок
        container.querySelector('[data-action="export-profile"]').addEventListener("click", exportProfile);
        container.querySelector('[data-action="clear-profile"]').addEventListener("click", function () {
            clearProfile();
            renderWidget(container);
        });
    }

    function initWidgets() {
        document.querySelectorAll("[data-profile-widget]").forEach(renderWidget);
    }

    // ============================================
    // Экспорт
    // ============================================
    window.NPD.profile = {
        addIncome: addIncome,
        addClient: addClient,
        getYearIncome: getYearIncome,
        getLimitProgress: getLimitProgress,
        getConcentration: getConcentration,
        getForecast: getForecast,
        clearProfile: clearProfile,
        exportProfile: exportProfile,
        isEmpty: isEmpty,
        renderWidget: renderWidget,
        LIMIT: LIMIT
    };

    document.addEventListener("DOMContentLoaded", initWidgets);
})();
