/**
 * ═══════════════════════════════════════════════════════════════
 * TREZE LABS — SHIELD v3.1 (EME ClearKey + Hardware Surface)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Técnica: Encrypted Media Extensions (EME) con ClearKey DRM.
 * Al asociar MediaKeys con el video overlay, el navegador 
 * lo trata como "contenido protegido" y puede activar la ruta
 * de renderizado seguro del GPU que produce pantalla negra
 * en screenshots.
 * 
 * Protecciones silenciosas incluidas:
 * 1. Video overlay DRM-tagged (hardware surface)
 * 2. user-select: none (excepto inputs)  
 * 3. Bloqueo de clic derecho
 * 4. Bloqueo de atajos de teclado
 * 5. Bloqueo de arrastre de imágenes
 * 6. Bloqueo de impresión
 * 7. Overlay negro al cambiar pestaña
 * ═══════════════════════════════════════════════════════════════
 */
(function TREZE_SHIELD() {
    'use strict';

    var OVERLAY_ID = 'treze-shield-overlay';
    var VIDEO_ID = 'treze-shield-video';

    // ═══ CSS ═══
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
        'pointer-events:none!important;object-fit:cover!important;opacity:0.005!important}',
        '@media print{body{display:none!important}',
        'html::after{content:"Contenido protegido";display:flex;align-items:center;',
        'justify-content:center;height:100vh;font-size:2rem;color:#333;font-family:sans-serif}}'
    ].join('');
    document.head.appendChild(css);

    // ═══════════════════════════════════════════════
    // EME CLEARKEY VIDEO SURFACE
    // ═══════════════════════════════════════════════
    function initProtectedVideo() {
        // Step 1: Generar micro-video via Canvas + MediaRecorder
        var canvas = document.createElement('canvas');
        canvas.width = 4;
        canvas.height = 4;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.01)';
        ctx.fillRect(0, 0, 4, 4);

        if (!canvas.captureStream || typeof MediaRecorder === 'undefined') return;

        var stream;
        try { stream = canvas.captureStream(1); } catch(e) { return; }

        // Buscar codec soportado
        var mime = '';
        var codecs = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        for (var i = 0; i < codecs.length; i++) {
            if (MediaRecorder.isTypeSupported(codecs[i])) { mime = codecs[i]; break; }
        }
        if (!mime) return;

        var recorder;
        try { recorder = new MediaRecorder(stream, { mimeType: mime }); } catch(e) { return; }

        var chunks = [];
        recorder.ondataavailable = function(e) {
            if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = function() {
            if (!chunks.length) return;
            var blob = new Blob(chunks, { type: mime });
            var url = URL.createObjectURL(blob);
            mountVideo(url);
        };

        recorder.start();
        setTimeout(function() { try { recorder.stop(); } catch(e){} }, 300);
    }

    function mountVideo(videoUrl) {
        var video = document.createElement('video');
        video.id = VIDEO_ID;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('disablePictureInPicture', '');
        video.setAttribute('x-webkit-airplay', 'deny');
        video.controls = false;

        // Step 2: Intentar asociar EME ClearKey (marca como DRM content)
        tryEME(video).then(function() {
            video.src = videoUrl;
            document.body.appendChild(video);
            startPlayback(video);
        }).catch(function() {
            // Si EME falla, montar igual sin DRM tag
            video.src = videoUrl;
            document.body.appendChild(video);
            startPlayback(video);
        });
    }

    function tryEME(videoElement) {
        if (!navigator.requestMediaKeySystemAccess) {
            return Promise.reject('no EME');
        }

        var configs = [
            {
                initDataTypes: ['webm'],
                videoCapabilities: [
                    { contentType: 'video/webm; codecs="vp9"', robustness: '' },
                    { contentType: 'video/webm; codecs="vp8"', robustness: '' }
                ]
            },
            {
                initDataTypes: ['cenc'],
                videoCapabilities: [
                    { contentType: 'video/mp4; codecs="avc1.42E01E"', robustness: '' }
                ]
            }
        ];

        // Intentar ClearKey primero
        return navigator.requestMediaKeySystemAccess('org.w3.clearkey', configs)
            .then(function(keySystemAccess) {
                return keySystemAccess.createMediaKeys();
            })
            .then(function(mediaKeys) {
                return videoElement.setMediaKeys(mediaKeys);
            })
            .catch(function() {
                // Fallback: intentar con Widevine (solo marca, no necesita license server)
                return navigator.requestMediaKeySystemAccess('com.widevine.alpha', [{
                    initDataTypes: ['webm', 'cenc'],
                    videoCapabilities: [
                        { contentType: 'video/webm; codecs="vp9"', robustness: '' },
                        { contentType: 'video/webm; codecs="vp8"', robustness: '' }
                    ]
                }]).then(function(keySystemAccess) {
                    return keySystemAccess.createMediaKeys();
                }).then(function(mediaKeys) {
                    return videoElement.setMediaKeys(mediaKeys);
                }).catch(function() {
                    return Promise.resolve(); // Continuar sin DRM
                });
            });
    }

    function startPlayback(video) {
        var play = function() {
            var p = video.play();
            if (p && p.catch) p.catch(function(){});
        };

        play();

        // Retry en interacción del usuario (Android requiere gesto)
        var activate = function() {
            play();
            document.removeEventListener('touchstart', activate);
            document.removeEventListener('click', activate);
            document.removeEventListener('scroll', activate);
        };
        document.addEventListener('touchstart', activate, { passive: true });
        document.addEventListener('click', activate);
        document.addEventListener('scroll', activate, { passive: true });

        // Mantener vivo
        video.addEventListener('pause', function() {
            setTimeout(play, 50);
        });
        video.addEventListener('ended', function() {
            video.currentTime = 0;
            play();
        });
    }

    // Iniciar al cargar DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProtectedVideo);
    } else {
        initProtectedVideo();
    }

    // ═══════════════════════════════════════════════
    // VISIBILITY SHIELD
    // ═══════════════════════════════════════════════
    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    (document.body || document.documentElement).appendChild(overlay);

    function shieldOn()  { overlay.classList.add('active'); }
    function shieldOff() { setTimeout(function() { overlay.classList.remove('active'); }, 250); }

    document.addEventListener('visibilitychange', function() {
        document.hidden ? shieldOn() : shieldOff();
    });
    window.addEventListener('blur', shieldOn);
    window.addEventListener('focus', shieldOff);

    // ═══════════════════════════════════════════════
    // KEYBOARD / CONTEXT / DRAG
    // ═══════════════════════════════════════════════
    document.addEventListener('keydown', function(e) {
        if (e.key === 'PrintScreen') { e.preventDefault(); shieldOn(); setTimeout(shieldOff, 1000); return false; }
        if (e.metaKey && e.shiftKey && ['3','4','5'].indexOf(e.key) !== -1) { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); return false; }
        if (e.key === 'F12') { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && 'ijc'.indexOf(e.key.toLowerCase()) !== -1) { e.preventDefault(); return false; }
        if ((e.ctrlKey || e.metaKey) && 'us'.indexOf(e.key.toLowerCase()) !== -1) { e.preventDefault(); return false; }
    }, true);
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') { e.preventDefault(); return false; }
    });

})();
