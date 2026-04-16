// === TREZE LABS ANTI-CLONE & EASTER EGG ===
(function() {
    const signature = `
    ████████╗██████╗ ███████╗███████╗███████╗    ██╗      █████╗ ██████╗ ███████╗
    ╚══██╔══╝██╔══██╗██╔════╝╚══███╔╝██╔════╝    ██║     ██╔══██╗██╔══██╗██╔════╝
       ██║   ██████╔╝█████╗    ███╔╝ █████╗      ██║     ███████║██████╔╝███████╗
       ██║   ██╔══██╗██╔══╝   ███╔╝  ██╔══╝      ██║     ██╔══██║██╔══██╗╚════██║
       ██║   ██║  ██║███████╗███████╗███████╗    ███████╗██║  ██║██████╔╝███████║
       ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝    ╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝
    `;
    console.log("%c" + signature, "color: #38bdf8; font-weight: bold;");
    console.log("%c⚠️ ALERTA DE PROPIEDAD INTELECTUAL", "color: #ef4444; font-size: 16px; font-weight: bold;");
    
    const allowedDomains = ["vcard-spa-claro-luna.vercel.app", "spa-claro-de-luna.vercel.app", "localhost", "127.0.0.1"];
    const currentDomain = window.location.hostname;
    
    if (!allowedDomains.includes(currentDomain) && currentDomain !== "") {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.innerHTML = '<div style="height:100vh; display:flex; align-items:center; justify-content:center; background:#0f172a; color:#ef4444; font-family:monospace; font-size: 2rem;text-align:center;">🚨 ACCESO DENEGADO<br>VIOLACIÓN DE PROPIEDAD INTELECTUAL 🚨</div>';
        });
        throw new Error("Ejecución detenida: Violación de Propiedad Intelectual.");
    }
})();

document.addEventListener('DOMContentLoaded', () => {

    /* ==================================================
       CONFIGURACIÓN API
       ================================================== */
    const API_URL = 'https://script.google.com/macros/s/AKfycbymopbpOgPxakL19ye7Y9SvIDpxABKMpwyGkrlaFWs5aBQe2DKe9UyT-kObgD5-ZPDc/exec'; // ← URL de Google Apps Script deployment

    /* ========================================================
       SPLASH SCREEN
       ======================================================== */
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('done');
            setTimeout(() => splash.remove(), 800);
        }, 3000);
    }

    /* ========================================================
       DARK / LIGHT MODE
       ======================================================== */
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const root = document.documentElement;

    const savedTheme = localStorage.getItem('cdl_theme');
    if (savedTheme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = root.getAttribute('data-theme') === 'dark';
            if (isDark) {
                root.removeAttribute('data-theme');
                themeIcon.classList.replace('fa-sun', 'fa-moon');
                localStorage.setItem('cdl_theme', 'light');
            } else {
                root.setAttribute('data-theme', 'dark');
                themeIcon.classList.replace('fa-moon', 'fa-sun');
                localStorage.setItem('cdl_theme', 'dark');
            }
        });
    }

    /* ========================================================
       HERO VIDEO — LOOP ONLY FIRST 3 SECONDS
       ======================================================== */
    const heroVideo = document.getElementById('hero-video');
    if (heroVideo) {
        const LOOP_END = 2;
        heroVideo.addEventListener('timeupdate', () => {
            if (heroVideo.currentTime >= LOOP_END) heroVideo.currentTime = 0;
        });
        heroVideo.play().catch(() => {
            document.addEventListener('touchstart', () => heroVideo.play(), { once: true });
            document.addEventListener('click', () => heroVideo.play(), { once: true });
        });
    }

    /* ========================================================
       SCROLL CTA
       ======================================================== */
    const scrollCta = document.getElementById('scroll-cta');
    if (scrollCta) {
        scrollCta.addEventListener('click', () => {
            const main = document.getElementById('main-content');
            if (main) main.scrollIntoView({ behavior: 'smooth' });
        });
    }

    /* ========================================================
       AUDIO TOGGLE
       ======================================================== */
    const audioBtn = document.getElementById('audio-btn');
    const bgAudio = document.getElementById('bg-audio');
    let isPlaying = false;
    if (audioBtn && bgAudio) {
        audioBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isPlaying) { bgAudio.pause(); audioBtn.innerHTML = '<i class="fa-solid fa-music"></i>'; }
            else { bgAudio.play(); audioBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>'; }
            isPlaying = !isPlaying;
        });
    }

    /* ========================================================
       MODE TOGGLE — PERSONAL / GIFT
       ======================================================== */
    let isGiftMode = false;
    const btnForMe = document.getElementById('btn-for-me');
    const btnGift = document.getElementById('btn-gift');
    const modeToggle = document.getElementById('mode-toggle');
    const bookText = document.getElementById('btn-book-text');

    if (btnForMe && btnGift) {
        btnForMe.addEventListener('click', () => {
            isGiftMode = false;
            btnForMe.classList.add('active'); btnGift.classList.remove('active');
            modeToggle.classList.remove('mode-gift');
            if (bookText) bookText.textContent = 'Reservar';
        });
        btnGift.addEventListener('click', () => {
            isGiftMode = true;
            btnGift.classList.add('active'); btnForMe.classList.remove('active');
            modeToggle.classList.add('mode-gift');
            if (bookText) bookText.textContent = 'Regalar';
        });
    }

    /* ========================================================
       CATEGORY NAVIGATOR — Pill Switching
       ======================================================== */
    const catNav = document.getElementById('cat-nav');
    const catPills = document.querySelectorAll('.cat-nav__pill');
    const categories = document.querySelectorAll('.category');

    catPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const target = pill.dataset.target;
            // Update active pill
            catPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            // Scroll pill into view within nav
            pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            // Show target category, hide others
            categories.forEach(cat => {
                if (cat.dataset.category === target) {
                    cat.classList.add('open');
                    // Re-trigger animation
                    const body = cat.querySelector('.category__body');
                    if (body) { body.style.animation = 'none'; body.offsetHeight; body.style.animation = ''; }
                } else {
                    cat.classList.remove('open');
                }
            });
        });
    });

    // Keep legacy hero click working (fallback)
    document.querySelectorAll('.category__hero').forEach(hero => {
        hero.addEventListener('click', () => {
            const cat = hero.closest('.category');
            const target = cat.dataset.category;
            const pill = document.querySelector(`.cat-nav__pill[data-target="${target}"]`);
            if (pill) pill.click();
        });
    });

    /* ========================================================
       SENSORY FILTERS
       ======================================================== */
    const pills = document.querySelectorAll('.pill');
    const allServices = document.querySelectorAll('.service');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            const isActive = pill.classList.contains('active');
            pills.forEach(p => p.classList.remove('active'));
            if (isActive) {
                allServices.forEach(s => s.classList.remove('dimmed'));
                // Return to active pill's category
                const activePill = document.querySelector('.cat-nav__pill.active');
                if (activePill) activePill.click();
                return;
            }
            pill.classList.add('active');
            const tag = pill.dataset.filter;
            allServices.forEach(s => s.classList.toggle('dimmed', !(s.dataset.tags || '').includes(tag)));
            // Show ALL categories that have matching services
            categories.forEach(c => {
                const hasMatch = c.querySelector('.service:not(.dimmed)');
                if (hasMatch) c.classList.add('open');
                else c.classList.remove('open');
            });
        });
    });

    /* ========================================================
       CART SYSTEM — Expandable with Cancel
       ======================================================== */
    let selectedServices = [];
    let totalPrice = 0;
    const floatingCart = document.getElementById('floating-cart');
    const cartCount = document.getElementById('cart-count');
    const cartPrice = document.getElementById('cart-price');
    const cartItems = document.getElementById('cart-items');
    const cartHeader = document.getElementById('cart-header');
    const btnCartClear = document.getElementById('btn-cart-clear');
    const companionModal = document.getElementById('companion-modal');
    const companionInput = document.getElementById('companion-name');

    // Toggle expand/collapse cart item list
    if (cartHeader) {
        cartHeader.addEventListener('click', (e) => {
            // Don't toggle if clicking buttons
            if (e.target.closest('.cart__btn') || e.target.closest('.cart__clear')) return;
            floatingCart.classList.toggle('expanded');
        });
    }

    // Clear all selections
    if (btnCartClear) {
        btnCartClear.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedServices = [];
            totalPrice = 0;
            allServices.forEach(s => s.classList.remove('selected'));
            floatingCart.classList.remove('expanded');
            updateCart();
        });
    }

    // Remove individual item
    function removeService(idx) {
        const removed = selectedServices[idx];
        if (!removed) return;
        totalPrice -= removed.price;
        selectedServices.splice(idx, 1);
        // Deselect the service card
        const card = document.querySelector(`.service[data-name="${removed.originalName || removed.name}"]`);
        if (card) card.classList.remove('selected');
        updateCart();
    }

    allServices.forEach(item => {
        item.addEventListener('click', () => {
            const name = item.dataset.name;
            const price = parseInt(item.dataset.price);
            const tags = item.dataset.tags || '';
            const isCouple = tags.includes('pareja');

            if (item.classList.contains('selected')) {
                item.classList.remove('selected');
                totalPrice -= price;
                const idx = selectedServices.findIndex(s => (s.originalName || s.name) === name);
                if (idx > -1) selectedServices.splice(idx, 1);
                updateCart();
            } else {
                item.classList.add('selected');
                totalPrice += price;
                if (isCouple && companionModal) {
                    companionModal.classList.add('active');
                    document.getElementById('btn-companion').onclick = () => {
                        const guest = companionInput.value.trim();
                        selectedServices.push({ 
                            name: guest ? `${name} (con ${guest})` : name, 
                            originalName: name,
                            price 
                        });
                        companionModal.classList.remove('active');
                        companionInput.value = '';
                        updateCart();
                    };
                } else {
                    selectedServices.push({ name, originalName: name, price });
                    updateCart();
                }
            }
        });
    });

    function updateCart() {
        if (selectedServices.length > 0) {
            floatingCart.classList.add('visible');
            cartCount.textContent = `${selectedServices.length} servicio${selectedServices.length > 1 ? 's' : ''}`;
            cartPrice.textContent = `$${totalPrice.toLocaleString('en-US')} MXN`;
            // Render item list
            if (cartItems) {
                cartItems.innerHTML = selectedServices.map((s, i) => `
                    <div class="cart__item">
                        <span class="cart__item-name">${s.name}</span>
                        <span class="cart__item-price">$${s.price.toLocaleString('en-US')}</span>
                        <button class="cart__item-remove" onclick="event.stopPropagation(); window.__removeCartItem(${i})" aria-label="Quitar">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                `).join('');
            }
        } else {
            floatingCart.classList.remove('visible');
            floatingCart.classList.remove('expanded');
            if (cartItems) cartItems.innerHTML = '';
        }
    }
    // Expose remove function globally
    window.__removeCartItem = removeService;

    /* ========================================================
       CHECKOUT FLOW
       ======================================================== */
    const checkoutModal = document.getElementById('checkout-modal');
    const btnCheckout = document.getElementById('btn-checkout');
    let peopleCount = 1;
    const pMinus = document.getElementById('p-minus');
    const pPlus = document.getElementById('p-plus');
    const pVal = document.getElementById('p-val');

    if (pMinus && pPlus) {
        pMinus.addEventListener('click', (e) => { e.stopPropagation(); if (peopleCount > 1) { peopleCount--; pVal.textContent = peopleCount; } });
        pPlus.addEventListener('click', (e) => { e.stopPropagation(); if (peopleCount < 10) { peopleCount++; pVal.textContent = peopleCount; } });
    }

    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            const title = document.getElementById('checkout-title');
            const desc = document.getElementById('checkout-desc');
            const bookingFields = document.getElementById('checkout-booking-fields');
            const giftFields = document.getElementById('checkout-gift-fields');
            if (isGiftMode) { 
                title.textContent = 'Certificado de Regalo'; 
                desc.textContent = 'Complete los datos para generar el certificado digital.'; 
                if (bookingFields) bookingFields.style.display = 'none';
                if (giftFields) giftFields.style.display = 'block';
            }
            else { 
                title.textContent = 'Configuración de Reserva'; 
                desc.textContent = 'Permítanos conocer su preferencia de fecha.'; 
                if (bookingFields) bookingFields.style.display = 'block';
                if (giftFields) giftFields.style.display = 'none';
            }
            checkoutModal.classList.add('active');
        });
    }

    const btnWA = document.getElementById('btn-final-whatsapp');
    if (btnWA) {
        btnWA.addEventListener('click', () => {
            const itemsList = selectedServices.map(s => `• ${s.name} ($${s.price.toLocaleString()})`).join('\n');
            let msg = '';
            if (isGiftMode) {
                const giftTo = document.getElementById('gift-to').value.trim() || '[No especificado]';
                const giftFrom = document.getElementById('gift-from').value.trim() || '[No especificado]';
                const giftMsg = document.getElementById('gift-msg').value.trim();
                const note = giftMsg ? `\n📝 *Mensaje:* "${giftMsg}"` : '';
                msg = `¡Hola Concierge! ✨\n\nDeseo adquirir un *Certificado de Regalo Premium*.\n(He leído y acepto los T&C).\n\n🎁 *Para:* ${giftTo}\n💌 *De parte de:* ${giftFrom}${note}\n\n💎 *Servicio seleccionado:*\n${itemsList}\n\n💳 *Total a certificar:* $${totalPrice.toLocaleString()} MXN\n\n¿Me proporcionan método de pago para que generen mi código?`;
            } else {
                const dateVal = document.getElementById('booking-date').value;
                const formattedDate = dateVal
                    ? new Date(dateVal).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    : 'A coordinar';
                msg = `¡Hola Concierge! ✨\n\nSeleccioné mi itinerario desde el Catálogo Digital.\n\n🛎 *Reserva:*\n📅 *${formattedDate}*\n👥 *${peopleCount}* persona(s)\n\n💎 *Selección:*\n${itemsList}\n\n*Total:* $${totalPrice.toLocaleString()} MXN`;
            }
            window.open(`https://wa.me/522294023957?text=${encodeURIComponent(msg)}`, '_blank');
            checkoutModal.classList.remove('active');
        });
    }


    /* ========================================================
       LOYALTY SYSTEM — GOOGLE SHEETS + QR + PIN
       
       Flujo:
       1. Cliente ingresa SOLO su teléfono
       2. Si existe → muestra tarjeta con sellos y servicios
       3. Si NO existe → "Solicita registro al concierge"
       4. Para sellar: escanea QR o ingresa código manual
       5. Cada sello muestra el servicio prestado
       ======================================================== */

    const LOYALTY_KEY = 'cdl_loyalty_user';

    // DOM refs
    const registerSection = document.getElementById('loyalty-register');
    const activeSection = document.getElementById('loyalty-active');
    const notFoundSection = document.getElementById('loyalty-not-found');
    const phoneInput = document.getElementById('loyalty-phone');
    const btnRegister = document.getElementById('btn-loyalty-register');
    const btnLogout = document.getElementById('btn-loyalty-logout');
    const codeInput = document.getElementById('stamp-code-input');
    const btnRedeemCode = document.getElementById('btn-redeem-code');
    const btnRedeemReward = document.getElementById('btn-redeem-reward');
    const rewardSection = document.getElementById('loyalty-reward-section');
    const codeSection = document.getElementById('loyalty-code-section');
    const userDisplay = document.getElementById('loyalty-user-display');

    let loyaltyUser = null;

    // ── Session management ──
    function loadSession() {
        try {
            const saved = JSON.parse(localStorage.getItem(LOYALTY_KEY));
            if (saved && saved.phone) {
                loyaltyUser = saved;
                showActiveCard();
                syncWithServer(saved.phone);
            }
        } catch(e) {}
    }

    function saveSession(data) {
        loyaltyUser = data;
        localStorage.setItem(LOYALTY_KEY, JSON.stringify(data));
    }

    function clearSession() {
        loyaltyUser = null;
        localStorage.removeItem(LOYALTY_KEY);
        showRegisterForm();
    }

    // ── UI State ──
    function showRegisterForm() {
        if (registerSection) registerSection.style.display = '';
        if (activeSection) activeSection.style.display = 'none';
        if (notFoundSection) notFoundSection.style.display = 'none';
    }

    function showNotFound() {
        if (notFoundSection) {
            notFoundSection.style.display = '';
            setTimeout(() => notFoundSection.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
        }
    }

    function showActiveCard() {
        if (registerSection) registerSection.style.display = 'none';
        if (activeSection) activeSection.style.display = '';
        if (notFoundSection) notFoundSection.style.display = 'none';
        renderStamps(loyaltyUser);
    }

    // ── Render stamps with service names ──
    function renderStamps(data) {
        if (!data) return;
        const stamps = data.stamps || 0;
        const history = data.history || [];

        // Stamp circles
        document.querySelectorAll('.stamp[data-stamp]').forEach(el => {
            const num = parseInt(el.dataset.stamp);
            if (!isNaN(num)) el.classList.toggle('stamped', num <= stamps);
        });

        // Stamp labels — show service name from history
        for (let i = 1; i <= 3; i++) {
            const label = document.getElementById(`stamp-label-${i}`);
            if (!label) continue;
            const entry = history.find(h => h.stamp === i);
            if (entry && i <= stamps) {
                // Show short service name (first 2 words) + amount
                const shortName = entry.service.split(' ').slice(0, 2).join(' ');
                label.textContent = shortName;
                label.title = `${entry.service} · $${(entry.amount || 0).toLocaleString()} · ${new Date(entry.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
            } else {
                label.textContent = `Visita ${i}`;
                label.title = '';
            }
        }

        // Reward stamp
        const rewardStamp = document.querySelector('.stamp--reward');
        if (rewardStamp) rewardStamp.classList.toggle('unlocked', stamps >= 3);

        // Progress bar
        const bar = document.getElementById('loyalty-bar');
        if (bar) bar.style.width = (stamps >= 3 ? 100 : (stamps / 3) * 100) + '%';

        // Status text
        const status = document.getElementById('loyalty-status');
        if (status) {
            if (stamps >= 3) {
                status.textContent = '¡Recompensa lista!';
                status.style.color = '#FFD700';
            } else {
                status.textContent = `${stamps} de 3 visitas`;
                status.style.color = '';
            }
        }

        // Tier
        const tier = document.getElementById('loyalty-tier');
        if (tier) tier.textContent = data.tier || 'Invitado';

        // User display
        if (userDisplay) {
            const name = data.name || '';
            const phone = data.phone || '';
            const masked = phone.length >= 10 ? '••••' + phone.slice(-4) : phone;
            userDisplay.textContent = name ? `${name} · ${masked}` : masked;
        }

        // Reward vs code section
        if (stamps >= 3) {
            if (rewardSection) rewardSection.style.display = '';
            if (codeSection) codeSection.style.display = 'none';
            // Show discount amount
            const discountText = document.getElementById('reward-discount-text');
            if (discountText && history.length >= 3) {
                const lastThree = history.slice(-3);
                const avg = lastThree.reduce((s, h) => s + (h.amount || 0), 0) / 3;
                const discount = Math.round(avg * 0.5);
                discountText.textContent = `~$${discount.toLocaleString()} MXN de descuento en tu próximo servicio`;
            }
        } else {
            if (rewardSection) rewardSection.style.display = 'none';
            if (codeSection) codeSection.style.display = '';
        }
    }

    // ── API calls ──
    function apiCall(params) {
        if (!API_URL) return Promise.resolve(offlineFallback(params));
        const url = new URL(API_URL);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) url.searchParams.set(k, v);
        });
        return fetch(url.toString()).then(r => r.json())
            .catch(() => ({ success: false, error: 'Sin conexión. Intenta de nuevo.' }));
    }

    // Offline/demo fallback
    function offlineFallback(params) {
        const local = loyaltyUser || {
            phone: params.phone, name: 'Demo', stamps: 0,
            totalVisits: 0, tier: 'Invitado', history: []
        };

        switch (params.action) {
            case 'lookup':
                if (local.phone === params.phone || !loyaltyUser) {
                    return { success: true, found: true, client: local };
                }
                return { success: true, found: false };

            case 'redeemCode':
                if (local.stamps >= 3) return { success: false, error: 'Canjea tu recompensa primero.' };
                local.stamps++;
                local.totalVisits++;
                local.history = local.history || [];
                local.history.push({
                    date: new Date().toISOString(),
                    service: 'Servicio Demo',
                    amount: 1500,
                    stamp: local.stamps
                });
                if (local.totalVisits >= 12) local.tier = 'Elite Platinum';
                else if (local.totalVisits >= 6) local.tier = 'Gold';
                else if (local.totalVisits >= 1) local.tier = 'Miembro';
                return {
                    success: true, message: `¡Sello ${local.stamps} registrado!`,
                    stamps: local.stamps, totalVisits: local.totalVisits,
                    tier: local.tier, history: local.history,
                    rewardReady: local.stamps >= 3
                };

            default:
                return { success: false, error: 'Modo demo' };
        }
    }

    function syncWithServer(phone) {
        apiCall({ action: 'lookup', phone }).then(res => {
            if (res.success && res.found && res.client) {
                const merged = { ...loyaltyUser, ...res.client };
                saveSession(merged);
                renderStamps(merged);
            }
        });
    }

    // ── Event: Phone Lookup (NOT registration) ──
    if (btnRegister) {
        btnRegister.addEventListener('click', () => {
            const phone = (phoneInput.value || '').replace(/\D/g, '');
            if (phone.length < 10) {
                showToast('Ingresa un teléfono de 10 dígitos', true);
                return;
            }

            btnRegister.disabled = true;
            btnRegister.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';

            apiCall({ action: 'lookup', phone }).then(res => {
                btnRegister.disabled = false;
                btnRegister.innerHTML = '<i class="fa-solid fa-id-card"></i> Acceder a mi Tarjeta';

                if (res.success && res.found) {
                    saveSession(res.client);
                    showActiveCard();
                    showToast(`¡Bienvenido${res.client.name ? ', ' + res.client.name : ''}! 🌙`);
                    checkPendingStamp();
                } else if (res.success && !res.found) {
                    showNotFound();
                    showToast('Solicita tu registro al concierge', true);
                } else {
                    showToast(res.error || 'Error de conexión', true);
                }
            });
        });
    }

    // Enter key + numeric-only filter on phone input
    if (phoneInput) {
        phoneInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') btnRegister.click();
        });
        phoneInput.addEventListener('input', () => {
            phoneInput.value = phoneInput.value.replace(/\D/g, '');
        });
    }

    // ── Event: Logout ──
    if (btnLogout) btnLogout.addEventListener('click', clearSession);

    // ── Event: Redeem Stamp Code ──
    if (btnRedeemCode) {
        btnRedeemCode.addEventListener('click', () => {
            const code = (codeInput.value || '').toUpperCase().trim();
            if (code.length < 4) { showToast('Ingresa un código válido', true); return; }
            if (!loyaltyUser || !loyaltyUser.phone) { showToast('Primero ingresa tu teléfono', true); return; }

            btnRedeemCode.disabled = true;
            btnRedeemCode.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            apiCall({ action: 'redeemCode', code, phone: loyaltyUser.phone }).then(res => {
                btnRedeemCode.disabled = false;
                btnRedeemCode.innerHTML = '<i class="fa-solid fa-stamp"></i> Sellar';
                codeInput.value = '';

                if (res.success) {
                    loyaltyUser.stamps = res.stamps;
                    loyaltyUser.totalVisits = res.totalVisits;
                    loyaltyUser.tier = res.tier;
                    loyaltyUser.history = res.history || loyaltyUser.history;
                    saveSession(loyaltyUser);
                    renderStamps(loyaltyUser);
                    showToast(res.message || '¡Sello registrado! ✨');
                } else {
                    showToast(res.error || 'Código inválido', true);
                }
            });
        });
    }

    // ── Event: Redeem Reward via WhatsApp ──
    if (btnRedeemReward) {
        btnRedeemReward.addEventListener('click', () => {
            if (!loyaltyUser) return;
            const history = loyaltyUser.history || [];
            const lastThree = history.slice(-3);
            const avg = lastThree.length > 0
                ? lastThree.reduce((s, h) => s + (h.amount || 0), 0) / lastThree.length : 0;
            const discount = Math.round(avg * 0.5);

            const serviceList = lastThree.map((h, i) =>
                `  ${i + 1}. ${h.service} — $${(h.amount || 0).toLocaleString()}`
            ).join('\n');

            const msg = `¡Hola Concierge! ✨\n\nHe completado mis 3 sellos del *Club Claro de Luna* y deseo canjear mi recompensa.\n\n🎁 *Descuento: 50%* (~$${discount.toLocaleString()} MXN)\n📱 ${loyaltyUser.phone}\n👤 ${loyaltyUser.name || 'Miembro'}\n🏅 ${loyaltyUser.tier || 'Miembro'}\n\n📋 *Servicios sellados:*\n${serviceList}\n\nQuedo atento/a a su confirmación.`;

            window.open(`https://wa.me/522294023957?text=${encodeURIComponent(msg)}`, '_blank');
        });
    }

    // ── QR AUTO-STAMP from URL ──
    const urlParams = new URLSearchParams(window.location.search);
    const stampFromURL = urlParams.get('stamp');

    if (stampFromURL) {
        window.history.replaceState({}, '', window.location.pathname);
        setTimeout(() => {
            if (loyaltyUser && loyaltyUser.phone) {
                codeInput.value = stampFromURL;
                showToast('Código QR detectado. Registrando...');
                setTimeout(() => btnRedeemCode.click(), 800);
            } else {
                sessionStorage.setItem('cdl_pending_stamp', stampFromURL);
                showToast('QR detectado — ingresa tu teléfono para sellar');
                document.getElementById('rewards').scrollIntoView({ behavior: 'smooth' });
            }
        }, 3500);
    }

    function checkPendingStamp() {
        const pending = sessionStorage.getItem('cdl_pending_stamp');
        if (pending && loyaltyUser && loyaltyUser.phone) {
            sessionStorage.removeItem('cdl_pending_stamp');
            codeInput.value = pending;
            setTimeout(() => btnRedeemCode.click(), 500);
        }
    }

    // ── Toast Notifications ──
    let toastTimeout;
    function showToast(msg, isError = false) {
        let toast = document.getElementById('loyalty-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'loyalty-toast';
            toast.className = 'loyalty-toast';
            toast.innerHTML = '<i class="fa-solid fa-check-circle"></i> <span></span>';
            document.body.appendChild(toast);
        }
        toast.querySelector('i').className = isError ? 'fa-solid fa-exclamation-circle' : 'fa-solid fa-check-circle';
        toast.classList.toggle('loyalty-toast--error', isError);
        toast.querySelector('span').textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.remove('show'), 4000);
    }

    // ── Modal Closers ──
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
        const close = modal.querySelector('.modal__close');
        if (close) close.addEventListener('click', () => modal.classList.remove('active'));
    });

    // ── INIT ──
    loadSession();
});
