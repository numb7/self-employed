/**
 * Финансовый помощник для самозанятых
 * Компоненты редизайна v3: toast, dropdown/меню, tooltip, поиск/фильтры хаба,
 * поиск FAQ, мини-достижения.
 * Не трогает js/calculators.js — только читает уже вычисленные значения
 * из DOM/localStorage, не содержит налоговой логики.
 * Порядок подключения: theme.js → components.js → controls.js (если есть) → calculators.js/wizard.js.
 */

// ============================================
// Иконки (переиспользуемые SVG-строки для динамического рендера)
// ============================================
const ICONS = {
    check: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    x: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>',
    info: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    search: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    stamp: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
};

// ============================================
// Toast singleton
// ============================================
const toast = {
    root: null,

    ensureRoot() {
        if (this.root) return this.root;
        let root = document.getElementById('toast-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'toast-root';
            root.setAttribute('aria-live', 'polite');
            root.setAttribute('role', 'status');
            document.body.appendChild(root);
        }
        this.root = root;
        return root;
    },

    show(message, variant = 'default') {
        const root = this.ensureRoot();
        const el = document.createElement('div');
        const variantClass = variant && variant !== 'default' ? ` toast--${variant}` : '';
        el.className = `toast${variantClass}`;
        const icon = variant === 'achievement' ? ICONS.stamp : ICONS.check;
        el.innerHTML = `${icon}<span>${message}</span>`;
        root.appendChild(el);

        const remove = () => {
            el.classList.add('toast--leaving');
            el.addEventListener('animationend', () => el.remove(), { once: true });
            // Фолбэк, если анимация отключена (prefers-reduced-motion: 0.001ms
            // всё равно даёт animationend, но на всякий случай подстрахуемся)
            setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
        };
        setTimeout(remove, 2600);
    }
};

// ============================================
// Dropdown / мобильное меню
// ============================================
function initDropdown(trigger) {
    const menuId = trigger.getAttribute('aria-controls');
    const menu = menuId ? document.getElementById(menuId) : null;
    if (!menu) return;

    function close() {
        menu.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', 'Открыть меню');
    }

    function open() {
        menu.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        trigger.setAttribute('aria-label', 'Закрыть меню');
    }

    trigger.addEventListener('click', () => {
        const isOpen = menu.classList.contains('is-open');
        if (isOpen) close(); else open();
    });

    document.addEventListener('click', (e) => {
        if (!menu.classList.contains('is-open')) return;
        if (menu.contains(e.target) || trigger.contains(e.target)) return;
        close();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('is-open')) {
            close();
            trigger.focus();
        }
    });
}

// ============================================
// Tooltip
// ============================================
function initTooltip(trigger) {
    const tooltipId = trigger.getAttribute('aria-describedby');
    const tip = tooltipId ? document.getElementById(tooltipId) : null;
    if (!tip) return;

    function show() { tip.hidden = false; }
    function hide() { tip.hidden = true; }

    trigger.addEventListener('mouseenter', show);
    trigger.addEventListener('mouseleave', hide);
    trigger.addEventListener('focus', show);
    trigger.addEventListener('blur', hide);
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hide();
    });
}

// ============================================
// Хаб — поиск + фильтр по категориям
// ============================================
function initHubFilters() {
    const searchInput = document.getElementById('hub-search');
    const grid = document.querySelector('.bento-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.hub-card[data-category]'));
    const filterButtons = Array.from(document.querySelectorAll('.category-filters [data-category]'));
    const emptyState = document.getElementById('hub-empty-state');

    let activeCategory = 'all';
    let query = '';

    function applyFilters() {
        let visibleCount = 0;
        cards.forEach(card => {
            const category = card.dataset.category || '';
            const haystack = ((card.dataset.title || '') + ' ' + (card.dataset.keywords || '')).toLowerCase();
            const matchesCategory = activeCategory === 'all' || category === activeCategory;
            const matchesQuery = query === '' || haystack.includes(query);
            const visible = matchesCategory && matchesQuery;
            card.hidden = !visible;
            if (visible) visibleCount++;
        });

        if (emptyState) {
            emptyState.hidden = visibleCount !== 0;
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            query = searchInput.value.trim().toLowerCase();
            applyFilters();
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            activeCategory = btn.dataset.category;
            filterButtons.forEach(b => {
                const isActive = b === btn;
                b.classList.toggle('is-active', isActive);
                b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
            applyFilters();
        });
    });
}

// ============================================
// Поиск по FAQ (poleznoe.html)
// ============================================
function initFaqSearch(input, detailsList) {
    if (!input || !detailsList || detailsList.length === 0) return;
    const emptyState = document.getElementById('faq-empty-state');

    input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        let visibleCount = 0;
        detailsList.forEach(details => {
            const summary = details.querySelector('summary');
            const text = (summary ? summary.textContent : details.textContent).toLowerCase();
            const visible = query === '' || text.includes(query);
            details.hidden = !visible;
            if (visible) visibleCount++;
        });
        if (emptyState) emptyState.hidden = visibleCount !== 0;
    });
}

// ============================================
// Риск-индикаторы (progress bar с safe/warning/error), переиспользуют
// цветовую систему .income-progress-bar (уже используется в лимите дохода).
// Вызываются АДДИТИВНО из уже посчитанных значений в calculators.js —
// сами ничего не считают, только рендерят готовое число/состояние.
// ============================================
function renderRiskProgressBar(containerEl, percent, state, text) {
    if (!containerEl) return;
    const clamped = Math.max(0, Math.min(100, percent));
    containerEl.innerHTML = `
        <div class="income-progress-container">
            <div class="income-progress-bar">
                <div class="income-progress-fill ${state}" style="width: ${clamped}%"></div>
                <span class="income-progress-text">${text}</span>
            </div>
        </div>
    `;
}

// Концентрация дохода: доля крупнейшего клиента → safe/warning/error
function renderConcentrationProgress(maxShare) {
    const container = document.getElementById('concentration-progress');
    if (!container) return;
    let state = 'safe';
    if (maxShare >= 70) state = 'error';
    else if (maxShare >= 50) state = 'warning';
    renderRiskProgressBar(container, maxShare, state, `${maxShare}% у крупнейшего клиента`);
}

// Пенсионный стаж: доля года, "куплена" взносом → safe/warning (не error — тут нет "риска",
// это просто индикатор заполненности года стажем)
function renderPensionProgress(monthsCovered) {
    const container = document.getElementById('pension-progress');
    if (!container) return;
    const percent = Math.max(0, Math.min(100, (monthsCovered / 12) * 100));
    const state = percent >= 100 ? 'safe' : (percent >= 50 ? 'warning' : 'warning');
    renderRiskProgressBar(container, percent, state, `${monthsCovered} из 12 мес. стажа`);
}

// ============================================
// Мини-достижения — localStorage 'fe_achievements'
// ============================================
const ACHIEVEMENT_LABELS = {
    first_calc: 'Первый расчёт',
    limit_checked: 'Лимит проверен',
    contract_downloaded: 'Договор скачан'
};

const achievements = {
    KEY: 'fe_achievements',

    list() {
        try {
            const raw = localStorage.getItem(this.KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    has(id) {
        return this.list().indexOf(id) !== -1;
    },

    unlock(id) {
        if (this.has(id)) return;
        try {
            const current = this.list();
            current.push(id);
            localStorage.setItem(this.KEY, JSON.stringify(current));
        } catch (e) {
            // приватный режим/нет localStorage — не блокирует работу калькулятора
        }
        const label = ACHIEVEMENT_LABELS[id] || id;
        toast.show(`Достижение: ${label}`, 'achievement');
    }
};

// ============================================
// Хлебные крошки (§9.3) — рендер из data-атрибутов + JSON-LD BreadcrumbList
// Разметка: <nav class="breadcrumbs" data-breadcrumbs='[{"name":"Home","url":"index.html"},{"name":"Калькуляторы","url":"#"},{"name":"Налог"}]'></nav>
// ============================================
function initBreadcrumbs() {
    var containers = document.querySelectorAll('[data-breadcrumbs]');
    containers.forEach(function (container) {
        var raw = container.getAttribute('data-breadcrumbs');
        if (!raw) return;
        var items;
        try { items = JSON.parse(raw); } catch (e) { return; }
        if (!Array.isArray(items) || items.length === 0) return;

        // Рендер HTML
        var html = items.map(function (item, i) {
            var isLast = i === items.length - 1;
            if (isLast) {
                return '<span class="breadcrumbs__current" aria-current="page">' + escapeHtml(item.name) + '</span>';
            }
            return '<a href="' + escapeHtml(item.url || '#') + '">' + escapeHtml(item.name) + '</a><span class="breadcrumbs__sep" aria-hidden="true">/</span>';
        }).join('');
        container.setAttribute('aria-label', 'Хлебные крошки');
        container.innerHTML = html;

        // JSON-LD BreadcrumbList
        var ld = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": items.map(function (item, i) {
                return {
                    "@type": "ListItem",
                    "position": i + 1,
                    "name": item.name,
                    "item": item.url ? (item.url.indexOf('http') === 0 ? item.url : 'https://samozanyatye.vercel.app/' + item.url) : undefined
                };
            })
        };
        var script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(ld);
        document.head.appendChild(script);
    });
}

// ============================================
// Share / Print (§11.4)
// ============================================
function initSharePrint() {
    // Кнопка «Поделиться» — Web Share API с fallback на копирование ссылки
    document.querySelectorAll('[data-action="share"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var url = window.location.href;
            var title = document.title;
            if (navigator.share) {
                navigator.share({ title: title, url: url }).catch(function () {});
            } else {
                // Fallback — копирование ссылки
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(function () {
                        if (window.toast) window.toast.show('Ссылка скопирована');
                    }, function () {});
                }
            }
        });
    });

    // Кнопка «Печать»
    document.querySelectorAll('[data-action="print"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            window.print();
        });
    });
}

// ============================================
// escapeHtml — единая утилита (§11.1 дедупликация)
// ============================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================
// Инициализация
// ============================================
// Экспорт в window — calculators.js/wizard.js подключаются позже и обращаются
// к window.toast / window.achievements как к необязательным зависимостям
// (проверка `if (window.toast)` перед вызовом на случай, если components.js
// почему-то не подключён на странице).
window.toast = toast;
window.achievements = achievements;
window.renderConcentrationProgress = renderConcentrationProgress;
window.renderPensionProgress = renderPensionProgress;
window.escapeHtml = escapeHtml;

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-dropdown-trigger]').forEach(initDropdown);
    document.querySelectorAll('.tooltip-trigger').forEach(initTooltip);
    initHubFilters();
    initBreadcrumbs();
    initSharePrint();

    const faqSearchInput = document.getElementById('faq-search');
    if (faqSearchInput) {
        const detailsList = Array.from(document.querySelectorAll('.faq-list .faq-item, .faq-list details'));
        initFaqSearch(faqSearchInput, detailsList);
    }
});
