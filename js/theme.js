(function () {
    var root = document.documentElement;
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    var themeColorMeta = document.querySelector('meta[name="theme-color"]');

    var ICON_SUN = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
    var ICON_MOON = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

    function applyTheme(theme) {
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
    }

    function syncPressed() {
        var isDark = root.getAttribute('data-theme') === 'dark';
        toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        toggle.setAttribute('aria-label', isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
        toggle.innerHTML = isDark ? ICON_SUN : ICON_MOON;
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', isDark ? '#15131c' : '#FAF9FD');
        }
    }

    /* Предварительная установка темы ДО отрисовки — предотвращает FOUC.
       Сначала проверяем localStorage, затем системную настройку. */
    (function () {
        var saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            applyTheme('dark');
        } else if (saved === 'light') {
            applyTheme('light');
        } else {
            /* По умолчанию — светлая тема (ТЗ §2.1). Тёмная — только по ручному выбору. */
            applyTheme('light');
        }
    })();

    /* Скрипт подключается с defer, поэтому к моменту выполнения DOM уже разобран
       и DOMContentLoaded уже прошёл — навешиваем слушатели напрямую. */
    syncPressed();

    toggle.addEventListener('click', function () {
        var isDark = root.getAttribute('data-theme') === 'dark';
        var next = isDark ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('theme', next);
        syncPressed();
    });

    /* Системную авто-смену темы не отслеживаем: светлая — дефолт по ТЗ,
       тёмная включается только вручную переключателем в шапке. */
})();

(function () {
    var nav = document.querySelector('.page-nav');
    if (!nav) return;

    var ticking = false;
    function update() {
        nav.classList.toggle('is-scrolled', window.scrollY > 4);
        ticking = false;
    }
    window.addEventListener('scroll', function () {
        if (!ticking) {
            window.requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });
    update();
})();
