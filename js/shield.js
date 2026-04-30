/**
 * ═══════════════════════════════════════════════════════════════
 * TREZE LABS — SHIELD v2.1 (Protección Silenciosa)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Protecciones 100% invisibles — cero impacto visual:
 * 1. user-select: none (excepto inputs)
 * 2. Bloqueo de clic derecho
 * 3. Bloqueo de atajos (F12, DevTools, Print, Save, Source)
 * 4. Bloqueo de arrastre de imágenes
 * 5. Bloqueo de impresión (@media print)
 * 6. Overlay negro SOLO al cambiar de pestaña/app-switcher
 * ═══════════════════════════════════════════════════════════════
 */
(function TREZE_SHIELD() {
    'use strict';

    var OVERLAY_ID = 'treze-shield-overlay';

    // ═══ CSS ═══
    var css = document.createElement('style');
    css.id = 'treze-shield-css';
    css.textContent = 
        'body{-webkit-user-select:none!important;-moz-user-select:none!important;' +
        '-ms-user-select:none!important;user-select:none!important;' +
        '-webkit-touch-callout:none!important}' +
        'input,textarea,select,[contenteditable="true"]{-webkit-user-select:text!important;' +
        '-moz-user-select:text!important;-ms-user-select:text!important;user-select:text!important}' +
        'img{-webkit-user-drag:none!important;user-drag:none!important}' +
        '#' + OVERLAY_ID + '{position:fixed;inset:0;z-index:2147483647;background:#000;' +
        'pointer-events:none;opacity:0;transition:opacity .15s ease}' +
        '#' + OVERLAY_ID + '.active{opacity:1}' +
        '@media print{body{display:none!important}' +
        'html::after{content:"Contenido protegido";display:flex;align-items:center;' +
        'justify-content:center;height:100vh;font-size:2rem;color:#333;font-family:sans-serif}}';
    document.head.appendChild(css);

    // ═══ OVERLAY (solo para tab-switch) ═══
    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    document.body.appendChild(overlay);

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            overlay.classList.add('active');
        } else {
            setTimeout(function() { overlay.classList.remove('active'); }, 200);
        }
    });
    window.addEventListener('blur', function() { overlay.classList.add('active'); });
    window.addEventListener('focus', function() {
        setTimeout(function() { overlay.classList.remove('active'); }, 200);
    });

    // ═══ KEYBOARD ═══
    document.addEventListener('keydown', function(e) {
        if (e.key === 'PrintScreen') { e.preventDefault(); return false; }
        if (e.metaKey && e.shiftKey && ['3','4','5'].indexOf(e.key) !== -1) { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); return false; }
        if (e.key === 'F12') { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'j') { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); return false; }
    }, true);

    // ═══ CONTEXT MENU ═══
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });

    // ═══ DRAG ═══
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') { e.preventDefault(); return false; }
    });

})();
