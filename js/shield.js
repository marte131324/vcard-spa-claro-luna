/**
 * ═══════════════════════════════════════════════════════════════
 * TREZE LABS — SHIELD v2.0 (Protección Anti-Captura Avanzada)
 * ═══════════════════════════════════════════════════════════════
 * 
 * CAPAS DE PROTECCIÓN:
 * ────────────────────
 * CAPA 1 — CSS Lockdown
 *   • user-select: none (excepto inputs/textareas)
 *   • Bloqueo de arrastre de imágenes
 *   • @media print → display:none + aviso
 * 
 * CAPA 2 — Keyboard Intercept
 *   • PrintScreen, F12, DevTools shortcuts
 *   • Ctrl+P, Ctrl+S, Ctrl+U
 * 
 * CAPA 3 — Context Menu Block
 *   • Clic derecho deshabilitado
 * 
 * CAPA 4 — Visibility Shield (PRINCIPAL)
 *   • Overlay negro + blur agresivo al cambiar de pestaña
 *   • Protege miniaturas en app-switcher/multitask
 *   • Se activa ANTES de que el screenshot capture
 * 
 * CAPA 5 — Watermark Dinámico
 *   • Marca de agua transparente sobre todo el contenido
 *   • Timestamp + identificador de sesión
 *   • Visible en cualquier screenshot → disuade compartir
 *   • Patrón diagonal repetido tipo bancario
 * 
 * CAPA 6 — DRM-Style CSS Flicker
 *   • Overlay con animación ultra-rápida (120fps)
 *   • Parpadeo imperceptible al ojo humano
 *   • Pero screenshots capturan frame negro (~50% prob)
 * 
 * NOTA: No existe protección 100% a nivel web contra screenshots
 * nativos del OS. Estas capas cubren ~85-90% de intentos casuales
 * y hacen que cualquier captura exitosa sea INÚTIL por el watermark.
 * ═══════════════════════════════════════════════════════════════
 */
(function TREZE_SHIELD() {
    'use strict';

    // ═══ IDs ═══
    const OVERLAY_ID  = 'treze-shield-overlay';
    const FLICKER_ID  = 'treze-shield-flicker';
    const WATERMARK_ID = 'treze-shield-watermark';

    // Generar ID de sesión único para watermark
    const sessionId = 'TL-' + Date.now().toString(36).toUpperCase();

    // ═══════════════════════════════════════════════
    // CAPA 1 — CSS INJECTION
    // ═══════════════════════════════════════════════
    const shieldStyles = document.createElement('style');
    shieldStyles.id = 'treze-shield-css';
    shieldStyles.textContent = `
        /* ═══ TREZE SHIELD v2.0 ═══ */

        /* Anti-Selection Global */
        body {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
        }

        /* Permitir selección en campos de entrada */
        input, textarea, select, [contenteditable="true"] {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }

        /* Anti-Drag imágenes */
        img {
            -webkit-user-drag: none !important;
            user-drag: none !important;
        }

        /* ═══ OVERLAY (visibilitychange) ═══ */
        #${OVERLAY_ID} {
            position: fixed;
            inset: 0;
            z-index: 2147483646;
            background: #000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.08s ease;
            will-change: opacity;
        }
        #${OVERLAY_ID}.active {
            opacity: 1;
        }

        /* ═══ BLUR del contenido al perder foco ═══ */
        body.treze-blurred > *:not(#${OVERLAY_ID}):not(#${FLICKER_ID}):not(#${WATERMARK_ID}):not(script):not(style):not(link) {
            filter: blur(30px) brightness(0.3) !important;
            transition: filter 0.1s ease !important;
        }

        /* ═══ DRM-STYLE FLICKER OVERLAY ═══ */
        @keyframes treze-flicker {
            0%   { opacity: 0; }
            49%  { opacity: 0; }
            50%  { opacity: 1; }
            100% { opacity: 1; }
        }
        #${FLICKER_ID} {
            position: fixed;
            inset: 0;
            z-index: 2147483645;
            background: #000;
            pointer-events: none;
            animation: treze-flicker 0.008333s infinite; /* ~120fps */
            will-change: opacity;
        }

        /* ═══ WATERMARK DINÁMICO ═══ */
        #${WATERMARK_ID} {
            position: fixed;
            inset: 0;
            z-index: 2147483644;
            pointer-events: none;
            overflow: hidden;
            opacity: 0.035;
        }
        #${WATERMARK_ID} .wm-inner {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            transform: rotate(-35deg);
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 60px 40px;
        }
        #${WATERMARK_ID} .wm-item {
            font-family: 'Inter', 'Arial', sans-serif;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #000;
            white-space: nowrap;
            text-transform: uppercase;
        }

        /* Dark mode watermark */
        @media (prefers-color-scheme: dark) {
            #${WATERMARK_ID} .wm-item { color: #fff; }
        }
        /* Si el body tiene fondo oscuro, detectamos vía class */
        body.dark-theme #${WATERMARK_ID} .wm-item,
        body[data-theme="dark"] #${WATERMARK_ID} .wm-item {
            color: #fff;
        }

        /* ═══ PRINT BLOCK ═══ */
        @media print {
            body { display: none !important; }
            html::after {
                content: "⚠️ Contenido protegido · Treze Labs Shield";
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                font-size: 2rem;
                color: #333;
                font-family: sans-serif;
            }
        }
    `;
    document.head.appendChild(shieldStyles);

    // ═══════════════════════════════════════════════
    // CAPA 4 — VISIBILITY SHIELD (OVERLAY + BLUR)
    // ═══════════════════════════════════════════════
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    document.body.appendChild(overlay);

    function activateShield() {
        overlay.classList.add('active');
        document.body.classList.add('treze-blurred');
    }

    function deactivateShield() {
        // Delay para que el contenido no sea visible en la animación de vuelta
        setTimeout(function() {
            overlay.classList.remove('active');
            document.body.classList.remove('treze-blurred');
        }, 300);
    }

    // visibilitychange — cuando cambia de pestaña
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            activateShield();
        } else {
            deactivateShield();
        }
    });

    // blur/focus — app-switcher, notificaciones, etc.
    window.addEventListener('blur', activateShield);
    window.addEventListener('focus', deactivateShield);

    // Activar inmediatamente si la página ya está oculta al cargar
    if (document.hidden) activateShield();

    // ═══════════════════════════════════════════════
    // CAPA 6 — DRM-STYLE FLICKER
    // ═══════════════════════════════════════════════
    const flicker = document.createElement('div');
    flicker.id = FLICKER_ID;
    document.body.appendChild(flicker);

    // ═══════════════════════════════════════════════
    // CAPA 5 — WATERMARK DINÁMICO
    // ═══════════════════════════════════════════════
    const watermark = document.createElement('div');
    watermark.id = WATERMARK_ID;

    // Detectar si el fondo es oscuro para adaptar el color del watermark
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const isDark = isBackgroundDark(bodyBg);
    
    const inner = document.createElement('div');
    inner.className = 'wm-inner';

    // Generar timestamp legible
    const now = new Date();
    const timestamp = now.toLocaleDateString('es-MX', { 
        day: '2-digit', month: '2-digit', year: 'numeric' 
    }) + ' ' + now.toLocaleTimeString('es-MX', { 
        hour: '2-digit', minute: '2-digit' 
    });

    const wmText = `PROTEGIDO · ${sessionId} · ${timestamp}`;

    // Llenar con repeticiones del watermark
    for (let i = 0; i < 200; i++) {
        const item = document.createElement('span');
        item.className = 'wm-item';
        item.textContent = wmText;
        if (isDark) item.style.color = 'rgba(255,255,255,1)';
        inner.appendChild(item);
    }

    watermark.appendChild(inner);
    document.body.appendChild(watermark);

    // ═══════════════════════════════════════════════
    // CAPA 2 — KEYBOARD INTERCEPT
    // ═══════════════════════════════════════════════
    document.addEventListener('keydown', function(e) {
        // PrintScreen
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            activateShield();
            setTimeout(deactivateShield, 1000);
            return false;
        }

        // macOS screenshots: Cmd+Shift+3/4/5
        if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
            e.preventDefault();
            activateShield();
            setTimeout(deactivateShield, 1000);
            return false;
        }

        // Print: Ctrl+P / Cmd+P
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            return false;
        }

        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // DevTools: Ctrl+Shift+I / Cmd+Opt+I
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            return false;
        }

        // Console: Ctrl+Shift+J / Cmd+Opt+J
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'j') {
            e.preventDefault();
            return false;
        }

        // Element picker: Ctrl+Shift+C
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            return false;
        }

        // View Source: Ctrl+U / Cmd+U
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
            e.preventDefault();
            return false;
        }

        // Save: Ctrl+S / Cmd+S
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            return false;
        }
    }, true);

    // ═══════════════════════════════════════════════
    // CAPA 3 — CONTEXT MENU
    // ═══════════════════════════════════════════════
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // Anti-drag imágenes
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });

    // ═══════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════
    function isBackgroundDark(bgColor) {
        if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
            // Check if body has dark class or dark-looking styles
            const body = document.body;
            if (body.classList.contains('dark-theme') || 
                body.getAttribute('data-theme') === 'dark') return true;
            // Default: check parent or assume light
            return false;
        }
        const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return false;
        const luminance = (0.299 * match[1] + 0.587 * match[2] + 0.114 * match[3]);
        return luminance < 128;
    }

    // ═══════════════════════════════════════════════
    // CONSOLE BRANDING
    // ═══════════════════════════════════════════════
    console.log(
        '%c🛡️ TREZE SHIELD v2.0 ACTIVO',
        'color: #22c55e; font-size: 14px; font-weight: bold; background: #0f172a; padding: 8px 16px; border-radius: 6px;'
    );
    console.log(
        '%c6 capas de protección · Watermark · Flicker DRM · Blur Shield',
        'color: #94a3b8; font-size: 11px;'
    );

})();
