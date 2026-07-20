/**
 * Финансовый помощник для самозанятых
 * Визуальные контролы калькулятора: segmented / amount-field / month-picker.
 *
 * Архитектура: скрытые нативные <input type="radio">/<select> остаются
 * источником правды для js/calculators.js (restoreState/saveState/calculate
 * не меняются для этих полей). Эти функции — только синхронизация визуала
 * поверх них. Подключать ПОСЛЕ calculators.js, чтобы к моменту инициализации
 * restoreState() уже проставил корректные .checked/.value.
 */

function initSegmented(root) {
    const radios = Array.from(root.querySelectorAll('input[type="radio"]'));
    const options = Array.from(root.querySelectorAll('.segmented__option'));
    const thumb = root.querySelector('.segmented__thumb');
    if (!radios.length || !options.length) return;

    // ARIA-семантика для segmented control (ТЗ §11.5):
    // Визуальная обёртка = radiogroup, опции = radio. Нативные radio
    // скрыты (.control-native) и недоступны фокусу, поэтому键盘ную
    // навигацию стрелками реализуем на видимых опциях (roving tabindex).
    root.setAttribute('role', 'radiogroup');
    const label = root.closest('.segmented-field, fieldset')
        && root.closest('.segmented-field, fieldset').querySelector('.amount-field__label, legend');
    if (label && label.textContent.trim()) {
        root.setAttribute('aria-label', label.textContent.trim());
    }
    options.forEach((opt) => opt.setAttribute('role', 'radio'));
    // Скрытые нативные radio выводим из tab-очереди — навигация идёт через
    // видимые опции (roving tabindex выше). Иначе фокус дублируется.
    radios.forEach((radio) => radio.setAttribute('tabindex', '-1'));

    function sync() {
        const index = radios.findIndex((r) => r.checked);
        const activeIndex = index === -1 ? 0 : index;
        options.forEach((opt, i) => {
            const isActive = i === activeIndex;
            opt.classList.toggle('is-active', isActive);
            opt.setAttribute('aria-checked', isActive ? 'true' : 'false');
            // Roving tabindex: только активная опция в tab-очереди.
            opt.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        if (thumb) thumb.style.transform = `translateX(${activeIndex * 100}%)`;
    }

    // Клик по опции → отметить связанный radio (label уже это делает,
    // но дублируем для надёжности на случай не-label обёрток).
    options.forEach((opt, i) => {
        opt.addEventListener('click', () => {
            if (!radios[i].checked) {
                radios[i].checked = true;
                radios[i].dispatchEvent(new Event('change', { bubbles: true }));
                sync();
            }
        });
        // Клавиатура: стрелки ←→ и Home/End, как требует ARIA Authoring Guide
        // для radiogroup. Space/Enter на активной опции не нужны — клик уже сработал.
        opt.addEventListener('keydown', (e) => {
            let next = null;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                next = (i + 1) % options.length;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                next = (i - 1 + options.length) % options.length;
            } else if (e.key === 'Home') {
                next = 0;
            } else if (e.key === 'End') {
                next = options.length - 1;
            }
            if (next !== null) {
                e.preventDefault();
                radios[next].checked = true;
                radios[next].dispatchEvent(new Event('change', { bubbles: true }));
                sync();
                options[next].focus();
            }
        });
    });

    radios.forEach((radio) => radio.addEventListener('change', sync));
    sync();
}

function initMonthPicker(root) {
    const select = root.querySelector('select');
    const chips = Array.from(root.querySelectorAll('.month-picker__chip'));
    if (!select || !chips.length) return;

    function sync(scrollToActive) {
        chips.forEach((chip) => chip.classList.toggle('is-active', chip.dataset.value === select.value));
        if (scrollToActive) {
            const active = chips.find((c) => c.dataset.value === select.value);
            if (active) active.scrollIntoView({ inline: 'center', block: 'nearest' });
        }
    }

    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            if (select.value === chip.dataset.value) return;
            select.value = chip.dataset.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            sync(false);
        });
    });
    select.addEventListener('change', () => sync(false));
    // Select визуально скрыт — при клавиатурном фокусе подсвечиваем активный чип,
    // чтобы фокус оставался видимым (см. .month-picker.is-focused в controls.css).
    select.addEventListener('focus', () => root.classList.add('is-focused'));
    select.addEventListener('blur', () => root.classList.remove('is-focused'));
    sync(true);
}

function formatAmountDigits(raw) {
    const digits = raw.replace(/\D/g, '');
    return digits ? Number(digits).toLocaleString('ru-RU') : '';
}

function initAmountField(input) {
    if (!input) return;

    input.addEventListener('input', (e) => {
        const caretFromEnd = e.target.value.length - e.target.selectionStart;
        e.target.value = formatAmountDigits(e.target.value);
        const pos = Math.max(e.target.value.length - caretFromEnd, 0);
        e.target.setSelectionRange(pos, pos);
    });

    // Значение могло быть проставлено calculators.js (restoreState из URL/localStorage)
    // до инициализации этого поля — переформатировать его пробелами-разделителями.
    if (input.value) {
        input.value = formatAmountDigits(input.value);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.segmented').forEach(initSegmented);
    document.querySelectorAll('.month-picker').forEach(initMonthPicker);
    document.querySelectorAll('.amount-field__input').forEach(initAmountField);
});
