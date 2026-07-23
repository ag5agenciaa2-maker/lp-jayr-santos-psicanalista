/**
 * Cookie Banner Universal — Skill Profissional
 * Versão: 3.0.0 (Padrão AG5)
 * Sem dependências externas. Funciona em qualquer site HTML/JS.
 * LGPD (Brasil) / GDPR (Europa) compliant.
 */

(function () {
    'use strict';

    var CONFIG = {
        storageKey: 'site_cookie_consent',
        expiryDays: 365,
        bannerDelay: 600,
        showFloatingBtn: false,
        privacyPolicyUrl: 'politica-de-privacidade.html',
    };

    var TOGGLE_MAP = {
        'ck-functional': 'functional',
        'ck-analytics': 'analytics',
        'ck-performance': 'performance',
        'ck-advertising': 'advertising',
    };

    var state = {
        necessary: true,
        functional: false,
        analytics: false,
        performance: false,
        advertising: false,
        decided: false,
        timestamp: null,
    };

    function load() {
        try {
            var raw = localStorage.getItem(CONFIG.storageKey);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function save(prefs) {
        try {
            prefs.timestamp = Date.now();
            prefs.decided = true;
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(prefs));
        } catch (e) { }
    }

    function isExpired(timestamp) {
        if (!timestamp) return true;
        return Date.now() - timestamp > CONFIG.expiryDays * 86400000;
    }

    function showBanner() {
        var el = document.getElementById('ck-banner');
        if (!el) return;
        el.classList.add('ck-banner--visible');
        el.removeAttribute('aria-hidden');
    }

    function hideBanner() {
        var el = document.getElementById('ck-banner');
        if (!el) return;
        el.classList.remove('ck-banner--visible');
        el.classList.add('ck-banner--hidden');
        el.setAttribute('aria-hidden', 'true');
        if (CONFIG.showFloatingBtn) {
            setTimeout(showFloatingBtn, 400);
        }
    }

    function showFloatingBtn() {
        var btn = document.getElementById('ck-prefs-btn');
        if (btn) btn.classList.add('ck-prefs-btn--visible');
    }

    function openModal() {
        var modal = document.getElementById('ck-modal');
        if (!modal) return;
        syncToggles();
        modal.classList.add('ck-modal--visible');
        modal.removeAttribute('aria-hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(function () {
            var closeBtn = document.getElementById('ck-modal-close');
            if (closeBtn) closeBtn.focus();
        }, 100);
    }

    function closeModal() {
        var modal = document.getElementById('ck-modal');
        if (!modal) return;
        modal.classList.remove('ck-modal--visible');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function syncToggles() {
        Object.keys(TOGGLE_MAP).forEach(function (id) {
            var key = TOGGLE_MAP[id];
            var el = document.getElementById(id);
            if (el) el.checked = !!state[key];
        });
    }

    function readToggles() {
        var result = { necessary: true };
        Object.keys(TOGGLE_MAP).forEach(function (id) {
            var key = TOGGLE_MAP[id];
            var el = document.getElementById(id);
            result[key] = el ? el.checked : false;
        });
        return result;
    }

    function acceptAll() {
        state = { necessary: true, functional: true, analytics: true, performance: true, advertising: true, decided: true };
        save(state);
        syncToggles();
        dispatch(state);
        hideBanner();
        closeModal();
        updateFooterToggleIcon();
        toast('Todos os cookies aceitos.');
    }

    function rejectAll() {
        state = { necessary: true, functional: false, analytics: false, performance: false, advertising: false, decided: true };
        save(state);
        syncToggles();
        dispatch(state);
        hideBanner();
        closeModal();
        updateFooterToggleIcon();
        toast('Apenas cookies necessários salvos.');
    }

    function saveCustom() {
        var custom = readToggles();
        state = Object.assign({}, custom, { decided: true });
        save(state);
        syncToggles();
        dispatch(state);
        hideBanner();
        closeModal();
        updateFooterToggleIcon();
        toast('Suas preferências foram salvas.');
    }

    function dispatch(prefs) {
        try {
            window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: { preferences: prefs } }));
        } catch (e) { }
    }

    function toast(message) {
        var existing = document.getElementById('ck-toast');
        if (existing) existing.remove();

        var el = document.createElement('div');
        el.id = 'ck-toast';
        el.className = 'ck-toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.textContent = '✓ ' + message;
        document.body.appendChild(el);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                el.classList.add('ck-toast--visible');
            });
        });

        setTimeout(function () {
            el.classList.remove('ck-toast--visible');
            setTimeout(function () { el.remove(); }, 350);
        }, 3000);
    }

    function on(id, event, handler) {
        var el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    }

    function bindEvents() {
        on('ck-accept-all', 'click', acceptAll);
        on('ck-reject', 'click', rejectAll);
        on('ck-customize', 'click', openModal);

        on('ck-modal-close', 'click', closeModal);
        on('ck-modal-overlay', 'click', closeModal);
        on('ck-modal-accept-all', 'click', acceptAll);
        on('ck-modal-reject', 'click', rejectAll);
        on('ck-modal-save', 'click', saveCustom);

        on('ck-prefs-btn', 'click', openModal);

        on('ck-prefs-link', 'click', function (e) {
            e.preventDefault();
            openModal();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var modal = document.getElementById('ck-modal');
                if (modal && modal.classList.contains('ck-modal--visible')) closeModal();
            }
        });
    }

    function updateFooterToggleIcon() {
        var toggle = document.getElementById('cookie-toggle');
        if (!toggle) return;

        var prefs = load();
        if (prefs && prefs.decided) {
            if (prefs.functional || prefs.analytics || prefs.performance || prefs.advertising) {
                toggle.classList.remove('inactive');
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
                toggle.classList.add('inactive');
            }
        } else {
            toggle.classList.remove('inactive');
            toggle.classList.add('active');
        }
    }

    function init() {
        var saved = load();

        if (saved && saved.decided && !isExpired(saved.timestamp)) {
            state = Object.assign({}, state, saved);
            dispatch(state);
            if (CONFIG.showFloatingBtn) showFloatingBtn();
            updateFooterToggleIcon();
            return;
        }

        updateFooterToggleIcon();
        setTimeout(showBanner, CONFIG.bannerDelay);
    }

    window.CookieBanner = {
        open: openModal,
        acceptAll: acceptAll,
        rejectAll: rejectAll,
        saveCustom: saveCustom,
        getPreferences: load,
        hasDecided: function () { var s = load(); return !!(s && s.decided && !isExpired(s.timestamp)); },
        reset: function () { localStorage.removeItem(CONFIG.storageKey); },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { bindEvents(); init(); });
    } else {
        bindEvents();
        init();
    }

})();
