/**
 * Финансовый помощник для самозанятых
 * B-flow движок — единый шаблон калькулятора (§5 ТЗ).
 *
 * Архитектура: каждый калькулятор = двухколоночный flow:
 *   слева ввод → справа результат (ответ → почему → риск → next → trust).
 *
 * Фабрика createBFlow({ root, inputs, calc, format, onSave, saveLabel }):
 *   - root: корневой элемент калькулятора (.b-flow)
 *   - inputs: массив селекторов/элементов полей ввода, на которые реагирует движок
 *   - calc(values) → { big, rate, whyItems[], risk:{level,title,desc}, next:{to,label}, invalid?, empty? }
 *   - format: необязательный форматтер главной цифры (по умолчанию ru-RU)
 *   - onSave / saveLabel: необязательная интеграция с localStorage-профилем
 *
 * Экспорт: window.NPD.createBFlow
 * Подключается через <script defer>. Не зависит от сборщика.
 */
(function () {
    "use strict";

    window.NPD = window.NPD || {};

    // ============================================
    // Утилиты форматирования
    // ============================================
    function formatMoney(value, suffix) {
        if (value === null || value === undefined || Number.isNaN(value)) return "—";
        var formatted = Number(value).toLocaleString("ru-RU", {
            maximumFractionDigits: 0
        });
        return suffix ? formatted + " " + suffix : formatted;
    }

    function formatPercent(value) {
        if (value === null || value === undefined || Number.isNaN(value)) return "—";
        return Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + "%";
    }

    // ============================================
    // Рендереры блоков результат-панели
    // ============================================
    var ICONS = {
        why: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
        green: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
        amber: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        red: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></svg>',
        next: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
        trust: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
    };

    function renderWhy(items) {
        if (!items || !items.length) return "";
        var lis = items.map(function (it) {
            return '<li class="b-flow__why-item"><span class="b-flow__why-bullet">—</span><span>' + it + "</span></li>";
        }).join("");
        return (
            '<div class="b-flow__why">' +
            '<div class="b-flow__block-title">' + ICONS.why + '<span>Почему столько</span></div>' +
            '<ul class="b-flow__why-list">' + lis + "</ul>" +
            "</div>"
        );
    }

    function renderRisk(risk) {
        if (!risk) return "";
        var level = risk.level || "green";
        var icon = ICONS[level] || ICONS.green;
        return (
            '<div class="b-flow__risk b-flow__risk--' + level + '">' +
            '<div class="b-flow__risk-head">' + icon + '<span class="b-flow__risk-title">' + (risk.title || "") + "</span></div>" +
            (risk.desc ? '<p class="b-flow__risk-desc">' + risk.desc + "</p>" : "") +
            "</div>"
        );
    }

    function renderNext(next) {
        if (!next || !next.to) return "";
        return (
            '<a class="b-flow__next" href="' + next.to + '">' +
            '<span class="b-flow__next-label">' + (next.label || "Следующее действие") + "</span>" +
            ICONS.next +
            "</a>"
        );
    }

    function renderTrust(trust) {
        var items = (trust || []).map(function (t) {
            return '<span class="b-flow__trust-item">' + ICONS.trust + "<span>" + t + "</span></span>";
        }).join("");
        return items ? '<div class="b-flow__trust">' + items + "</div>" : "";
    }

    // ============================================
    // Пустое состояние / невалидный результат
    // ============================================
    function renderEmpty() {
        return '<p class="b-flow__empty">Введите данные, чтобы увидеть расчёт</p>';
    }

    function renderInvalid() {
        return (
            '<div class="b-flow__result-label">Результат</div>' +
            '<div class="b-flow__result-big b-flow__result-big--muted">—</div>'
        );
    }

    // ============================================
    // Главный рендер результат-панели
    // ============================================
    function renderResult(panel, data, opts) {
        if (!data || data.empty) {
            panel.innerHTML = renderEmpty();
            return;
        }
        if (data.invalid) {
            panel.innerHTML = renderInvalid();
            return;
        }

        var bigValue = opts.format ? opts.format(data.big) : formatMoney(data.big, data.bigSuffix || "₽");
        var html =
            '<div class="b-flow__result-label">' + (data.label || "Результат") + "</div>" +
            '<div class="b-flow__result-big">' +
                bigValue +
            "</div>";

        if (data.rate) {
            html += '<div class="b-flow__result-rate">' + data.rate + "</div>";
        }
        if (data.progress !== undefined && data.progress !== null) {
            var pct = Math.max(0, Math.min(100, data.progress.percent || 0));
            html +=
                '<div class="b-flow__progress">' +
                '<div class="b-flow__progress-bar">' +
                '<div class="b-flow__progress-fill b-flow__progress-fill--' + (data.progress.level || "accent") +
                '" style="width:' + pct + '%"></div>' +
                "</div>" +
                (data.progress.text ? '<span class="b-flow__progress-text">' + data.progress.text + "</span>" : "") +
                "</div>";
        }
        html += renderWhy(data.why);
        html += renderRisk(data.risk);
        html += renderNext(data.next);
        html += renderTrust(data.trust);

        if (opts.onSave) {
            html += '<button class="b-flow__save" type="button">' + (opts.saveLabel || "Сохранить в профиль") + "</button>";
        }

        panel.innerHTML = html;

        // Привязка кнопки сохранения в профиль
        if (opts.onSave) {
            var saveBtn = panel.querySelector(".b-flow__save");
            if (saveBtn) {
                saveBtn.addEventListener("click", function () {
                    opts.onSave(data);
                });
            }
        }
    }

    // ============================================
    // Сбор значений полей ввода
    // ============================================
    function collectValues(inputEls) {
        var values = {};
        inputEls.forEach(function (el) {
            var name = el.getAttribute("name") || el.id || el.getAttribute("data-name");
            if (!name) return;
            if (el.type === "radio") {
                // только отмеченный radio попадёт — обрабатываем ниже группами
                if (el.checked) values[name] = el.value;
            } else if (el.type === "checkbox") {
                values[name] = el.checked;
            } else if (el.tagName === "SELECT") {
                values[name] = el.value;
            } else {
                // text/number — убираем пробелы-разделители
                var raw = (el.value || "").replace(/\s/g, "").replace(",", ".");
                values[name] = raw === "" ? "" : (el.inputMode === "numeric" || el.type === "number" ? Number(raw) : raw);
            }
        });
        return values;
    }

    // ============================================
    // Фабрика createBFlow
    // ============================================
    function createBFlow(opts) {
        var root = typeof opts.root === "string" ? document.querySelector(opts.root) : opts.root;
        if (!root) return null;

        var panel = root.querySelector(".b-flow__result") || opts.resultEl;
        if (!panel) return null;

        // Сбор всех интерактивных полей внутри root
        var inputEls = Array.from(root.querySelectorAll("input, select, textarea"));
        if (opts.extraInputs) {
            opts.extraInputs.forEach(function (el) {
                var node = typeof el === "string" ? document.querySelector(el) : el;
                if (node) inputEls.push(node);
            });
        }

        // Элементы ошибок валидации (по data-error-for)
        var errorEls = Array.from(root.querySelectorAll("[data-error-for]"));

        function clearErrors() {
            errorEls.forEach(function (el) {
                el.textContent = "";
                el.removeAttribute("role");
            });
            inputEls.forEach(function (el) {
                el.removeAttribute("aria-invalid");
                el.removeAttribute("aria-describedby");
            });
        }

        function showError(name, message) {
            var inputEl = inputEls.find(function (e) {
                return (e.getAttribute("name") || e.id) === name;
            });
            var errEl = errorEls.find(function (e) {
                return e.getAttribute("data-error-for") === name;
            });
            if (inputEl) {
                inputEl.setAttribute("aria-invalid", "true");
                if (errEl) {
                    inputEl.setAttribute("aria-describedby", errEl.id || "");
                    errEl.textContent = message;
                    errEl.setAttribute("role", "alert");
                }
            }
        }

        function recalc() {
            clearErrors();
            var values = collectValues(inputEls);
            var data;
            try {
                data = opts.calc(values, { showError: showError, formatMoney: formatMoney, formatPercent: formatPercent });
            } catch (e) {
                data = { invalid: true };
            }
            renderResult(panel, data, opts);

            // Событие завершения расчёта (для метрики)
            if (data && !data.empty && !data.invalid) {
                root.dispatchEvent(new CustomEvent("bflow:complete", { detail: data, bubbles: true }));
            }
        }

        // Авто-пересчёт на input/change
        inputEls.forEach(function (el) {
            el.addEventListener("input", recalc);
            el.addEventListener("change", recalc);
        });

        // Первичный рендер (пустое состояние)
        recalc();

        return {
            root: root,
            panel: panel,
            recalc: recalc,
            getValues: function () { return collectValues(inputEls); }
        };
    }

    // ============================================
    // Экспорт
    // ============================================
    window.NPD.createBFlow = createBFlow;
    window.NPD.bflowFormat = { money: formatMoney, percent: formatPercent };
})();
