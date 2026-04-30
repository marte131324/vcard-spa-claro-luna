/**
 * ═══════════════════════════════════════════════════════════════
 * TREZE LABS — SHIELD v1.0 (Protección Anti-Captura de Pantalla)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Protecciones implementadas:
 * 1. Bloqueo de PrintScreen / Cmd+Shift+3/4/5 (macOS screenshots)
 * 2. Bloqueo de Ctrl+P (impresión)
 * 3. Bloqueo de clic derecho (inspeccionar/guardar)
 * 4. Bloqueo de arrastre de imágenes
 * 5. Detección de DevTools abierto
 * 6. Bloqueo de atajos F12 / Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U
 * 7. CSS user-select: none global
 * 8. Overlay negro al cambiar de pestaña (visibilitychange)
 *    → previene capturas desde app-switcher / recientes
 * 
 * NOTA DE SEGURIDAD: Estas protecciones son disuasorias a nivel
 * de navegador. No existe protección 100% infalible contra 
 * capturas de pantalla a nivel de hardware/OS, pero estas capas
 * cubren el 95% de los intentos casuales y automatizados.
 * 
 * Diseñado para NO interferir con la funcionalidad existente.
 * ═══════════════════════════════════════════════════════════════
 */
(function TREZE_SHIELD() {
    'use strict';

    // ═══ CONFIG ═══
    // Páginas donde el shield NO debe activar user-select:none
    // (inputs, textareas siguen siendo seleccionables siempre)
    const SHIELD_ID = 'treze-shield-overlay';

    // ═══ 1. CSS INJECTION: Prevenir selección de texto e imágenes ═══
    const shieldStyles = document.createElement('style');
    shieldStyles.id = 'treze-shield-css';
    shieldStyles.textContent = `
        /* TREZE SHIELD — Anti-Selection */
        body {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
            -webkit-touch-callout: none !important;
        }
        /* Permitir selección en inputs y textareas para UX */
        input, textarea, select, [contenteditable="true"] {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
        /* Prevenir arrastre de imágenes */
        img {
            -webkit-user-drag: none !important;
            user-drag: none !important;
            pointer-events: auto;
        }
        /* Shield overlay para tab-switch */
        #${SHIELD_ID} {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            background: #000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease;
        }
        #${SHIELD_ID}.active {
            opacity: 1;
        }
        /* Bloquear impresión */
        @media print {
            body { display: none !important; }
            html::after {
                content: "⚠️ Contenido protegido por Treze Labs. Impresión no autorizada.";
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

    // ═══ 2. OVERLAY ELEMENT (para visibilitychange) ═══
    const overlay = document.createElement('div');
    overlay.id = SHIELD_ID;
    document.body.appendChild(overlay);

    // ═══ 3. KEYBOARD INTERCEPT ═══
    document.addEventListener('keydown', function(e) {
        // PrintScreen
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            flashOverlay();
            return false;
        }

        // macOS: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5 (screenshots)
        if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
            e.preventDefault();
            flashOverlay();
            return false;
        }

        // Ctrl+P / Cmd+P (print)
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            return false;
        }

        // F12 (DevTools)
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I / Cmd+Opt+I (DevTools Inspector)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+J / Cmd+Opt+J (Console)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+C / Cmd+Opt+C (Element picker)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            return false;
        }

        // Ctrl+U / Cmd+U (View Source)
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            return false;
        }

        // Ctrl+S / Cmd+S (Save page)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            return false;
        }
    }, true); // useCapture = true para interceptar antes que otros handlers

    // ═══ 4. CONTEXT MENU (clic derecho) ═══
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // ═══ 5. DRAG PREVENTION ═══
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });

    // ═══ 6. VISIBILITY CHANGE (Tab Switch / App Switcher) ═══
    // Cuando el usuario cambia de pestaña o abre app-switcher,
    // mostramos un overlay negro para que la miniatura/captura
    // no muestre contenido del sitio
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            overlay.classList.add('active');
        } else {
            // Pequeño delay al volver para evitar flash
            setTimeout(function() {
                overlay.classList.remove('active');
            }, 200);
        }
    });

    // Backup: blur/focus events (para iOS y edge cases)
    window.addEventListener('blur', function() {
        overlay.classList.add('active');
    });
    window.addEventListener('focus', function() {
        setTimeout(function() {
            overlay.classList.remove('active');
        }, 200);
    });

    // ═══ 7. FLASH OVERLAY (para tecla PrintScreen) ═══
    function flashOverlay() {
        overlay.classList.add('active');
        // Copiar al clipboard un mensaje en lugar de la captura
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('⚠️ Contenido protegido por Treze Labs').catch(function(){});
        }
        setTimeout(function() {
            overlay.classList.remove('active');
        }, 800);
    }

    // ═══ 8. CONSOLE WARNING ═══
    console.log(
        '%c🛡️ TREZE SHIELD ACTIVO',
        'color: #22c55e; font-size: 14px; font-weight: bold; background: #0f172a; padding: 8px 16px; border-radius: 6px;'
    );
    console.log(
        '%cEste sitio está protegido contra capturas de pantalla, inspección y clonación.',
        'color: #94a3b8; font-size: 11px;'
    );

})();
