/**
 * ═══════════════════════════════════════════════════════════════
 * TREZE LABS — SHIELD v3.0 (Hardware Video Surface Trick)
 * ═══════════════════════════════════════════════════════════════
 * 
 * TÉCNICA PRINCIPAL: Video Overlay con Hardware Acceleration
 * ──────────────────────────────────────────────────────────
 * En Android, los <video> se renderizan vía SurfaceView/TextureView
 * del hardware decoder del GPU. Cuando el OS toma un screenshot,
 * esa superficie aparece NEGRA porque el screenshot captura ANTES
 * de que el compositor mezcle el frame de video.
 * 
 * Este script crea un micro-video transparente (generado en JS vía
 * Canvas + MediaRecorder, sin archivos externos) y lo reproduce
 * como overlay fullscreen con pointer-events:none. El usuario
 * no percibe nada, pero el screenshot captura negro.
 * 
 * CAPAS ADICIONALES (silenciosas):
 * 1. user-select: none
 * 2. Bloqueo de clic derecho
 * 3. Bloqueo de atajos de teclado
 * 4. Bloqueo de arrastre de imágenes
 * 5. Bloqueo de impresión
 * 6. Overlay negro al cambiar pestaña
 * ═══════════════════════════════════════════════════════════════
 */
(function TREZE_SHIELD() {
    'use strict';

    var OVERLAY_ID = 'treze-shield-overlay';
    var VIDEO_ID   = 'treze-shield-video';

    // ═══════════════════════════════════════════════
    // CSS INJECTION (silencioso)
    // ═══════════════════════════════════════════════
    var css = document.createElement('style');
    css.id = 'treze-shield-css';
    css.textContent = [
        'body{-webkit-user-select:none!important;-moz-user-select:none!important;',
        '-ms-user-select:none!important;user-select:none!important;',
        '-webkit-touch-callout:none!important}',
        'input,textarea,select,[contenteditable="true"]{-webkit-user-select:text!important;',
        '-moz-user-select:text!important;user-select:text!important}',
        'img{-webkit-user-drag:none!important;user-drag:none!important}',
        '#', OVERLAY_ID, '{position:fixed;inset:0;z-index:2147483647;background:#000;',
        'pointer-events:none;opacity:0;transition:opacity .12s ease}',
        '#', OVERLAY_ID, '.active{opacity:1}',
        '#', VIDEO_ID, '{position:fixed!important;top:0!important;left:0!important;',
        'width:100vw!important;height:100vh!important;z-index:2147483646!important;',
        'pointer-events:none!important;object-fit:cover!important;',
        'opacity:0.01!important}',
        '@media print{body{display:none!important}',
        'html::after{content:"Contenido protegido";display:flex;align-items:center;',
        'justify-content:center;height:100vh;font-size:2rem;color:#333;font-family:sans-serif}}'
    ].join('');
    document.head.appendChild(css);

    // ═══════════════════════════════════════════════
    // HARDWARE VIDEO SURFACE (técnica principal)
    // ═══════════════════════════════════════════════
    function createProtectionVideo() {
        // Crear un canvas minúsculo para generar frames de video
        var canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 2;
        var ctx = canvas.getContext('2d');

        // Dibujar un pixel casi transparente (invisible al ojo)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
        ctx.fillRect(0, 0, 2, 2);

        // Intentar capturar como stream de video
        if (!canvas.captureStream) {
            // Fallback: si captureStream no existe, no hacemos nada
            return;
        }

        var stream;
        try {
            stream = canvas.captureStream(1); // 1 fps — mínimo consumo
        } catch (e) {
            return;
        }

        // Grabar un micro-video WebM
        var mimeType = '';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            mimeType = 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mimeType = 'video/webm';
        } else {
            return; // No soportado
        }

        var recorder;
        try {
            recorder = new MediaRecorder(stream, { mimeType: mimeType });
        } catch (e) {
            return;
        }

        var chunks = [];
        recorder.ondataavailable = function(e) {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = function() {
            if (chunks.length === 0) return;

            var blob = new Blob(chunks, { type: mimeType });
            var url = URL.createObjectURL(blob);

            var video = document.createElement('video');
            video.id = VIDEO_ID;
            video.src = url;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.setAttribute('disablePictureInPicture', '');
            video.setAttribute('x-webkit-airplay', 'deny');
            video.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
            video.controls = false;

            document.body.appendChild(video);

            // Forzar reproducción (necesario en algunos navegadores)
            var playPromise = video.play();
            if (playPromise !== undefined) {
                playPromise.catch(function() {
                    // Si autoplay falla, intentar al primer toque del usuario
                    document.addEventListener('touchstart', function handler() {
                        video.play().catch(function(){});
                        document.removeEventListener('touchstart', handler);
                    }, { once: true });
                    document.addEventListener('click', function handler() {
                        video.play().catch(function(){});
                        document.removeEventListener('click', handler);
                    }, { once: true });
                });
            }

            // Mantener loop activo constantemente
            video.addEventListener('ended', function() {
                video.currentTime = 0;
                video.play().catch(function(){});
            });
            video.addEventListener('pause', function() {
                setTimeout(function() { video.play().catch(function(){}); }, 100);
            });
        };

        recorder.start();
        // Grabar 200ms de frames (suficiente para un loop)
        setTimeout(function() {
            try { recorder.stop(); } catch(e) {}
        }, 200);
    }

    // Ejecutar al cargar el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createProtectionVideo);
    } else {
        createProtectionVideo();
    }

    // ═══════════════════════════════════════════════
    // VISIBILITY SHIELD (overlay al cambiar pestaña)
    // ═══════════════════════════════════════════════
    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    (document.body || document.documentElement).appendChild(overlay);

    function shieldOn()  { overlay.classList.add('active'); }
    function shieldOff() {
        setTimeout(function() { overlay.classList.remove('active'); }, 250);
    }

    document.addEventListener('visibilitychange', function() {
        document.hidden ? shieldOn() : shieldOff();
    });
    window.addEventListener('blur', shieldOn);
    window.addEventListener('focus', shieldOff);

    // ═══════════════════════════════════════════════
    // KEYBOARD INTERCEPT
    // ═══════════════════════════════════════════════
    document.addEventListener('keydown', function(e) {
        if (e.key === 'PrintScreen') { e.preventDefault(); shieldOn(); setTimeout(shieldOff, 1000); return false; }
        if (e.metaKey && e.shiftKey && ['3','4','5'].indexOf(e.key) !== -1) { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); return false; }
        if (e.key === 'F12') { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && 'ijc'.indexOf(e.key.toLowerCase()) !== -1) { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && 'us'.indexOf(e.key.toLowerCase()) !== -1) { e.preventDefault(); return false; }
    }, true);

    // ═══════════════════════════════════════════════
    // CONTEXT MENU + DRAG
    // ═══════════════════════════════════════════════
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') { e.preventDefault(); return false; }
    });

})();
