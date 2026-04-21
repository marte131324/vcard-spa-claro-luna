// ═══════════════════════════════════════════════════════════
// CLARO DE LUNA SPA — COMMAND CENTER
// Treze Labs | Google Sheets Backend via GAS
// ═══════════════════════════════════════════════════════════
(function(){
    const allowed = ['vcard-spa-claro-luna.vercel.app','localhost','127.0.0.1'];
    const h = window.location.hostname;
    if (allowed.indexOf(h) === -1 && h !== '') {
        document.body.innerHTML = '<div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1A1814;color:#FAF8F5;font-family:monospace;text-align:center;padding:20px"><h1 style="color:#ef4444;font-size:2.5rem;margin-bottom:16px">ACCESO DENEGADO</h1><p style="color:#9A8E82;max-width:500px">Dominio no autorizado para este panel.</p><a href="https://wa.me/522214092478" style="margin-top:30px;padding:12px 24px;border:1px solid #D4A373;color:#D4A373;text-decoration:none;border-radius:8px">Contactar Treze Labs</a></div>';
        throw new Error('Blocked');
    }
})();

// API_URL viene de /js/config.js (cargado en admin/index.html)
const COMMISSION_RATE = 0.20;

let staffData = [];
let attendanceData = [];
let commissionData = [];
let checkinData = [];
let configData = {};

// ── Price map for services ──
const PRICE_MAP = {
    'Ritual Claro de Luna': 2650, 'Ritual de Intenciones': 2650, 'Ritual Ancestral': 6050,
    'Descontracturante 50min': 1750, 'Descontracturante 80min': 2650,
    'Herbal Relajante 50min': 1650, 'Herbal Relajante 80min': 2500,
    'Piedras Calientes 50min': 1750, 'Piedras Calientes 80min': 2650,
    'Piernas Cansadas': 1550, 'Drenaje Linfatico 50min': 1650, 'Drenaje Linfatico 80min': 2500,
    'Masaje 4 Manos': 3300, 'Facial Antioxidante': 1080, 'Facial Control Grasa': 1080,
    'Exfoliacion Cafe Tisu': 1880, 'Envoltura Agave Azul': 2250, 'Tratamiento Moldeador': 2750,
    'Tina EMS': 600, 'Tina de Flotacion': 600, 'Circuito Hidroterapia': 1000
};

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
function switchView(id, el) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
}

// ═══════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}
function showLoader() { document.getElementById('loader').style.display = 'flex'; }
function hideLoader() { document.getElementById('loader').style.display = 'none'; }

async function postData(payload, msg) {
    showLoader();
    try {
        await fetch(API_URL, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        hideLoader();
        toast(msg);
        // Verificar: re-sincronizar datos del servidor después de 2s
        setTimeout(() => fetchAll(), 2000);
    } catch(e) { hideLoader(); toast('Error de conexión — Intente de nuevo'); }
}

// ═══════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    fetchAll();
    // Auto-fill commission price
    const cmService = document.getElementById('cm-service');
    const cmPrice = document.getElementById('cm-price');
    const cmComm = document.getElementById('cm-commission');
    if (cmService) {
        cmService.addEventListener('change', () => {
            const p = PRICE_MAP[cmService.value] || 0;
            cmPrice.value = p;
            cmComm.value = Math.round(p * COMMISSION_RATE);
        });
        cmPrice.addEventListener('input', () => {
            cmComm.value = Math.round((parseInt(cmPrice.value) || 0) * COMMISSION_RATE);
        });
    }
    // Set today's date
    const cmDate = document.getElementById('cm-date');
    if (cmDate) cmDate.value = new Date().toISOString().split('T')[0];
});

async function fetchAll() {
    try {
        const res = await fetch(API_URL + '?action=getAdmin');
        const data = await res.json();
        if (data.config) {
            configData = data.config;
            if (document.getElementById('cfg-status')) document.getElementById('cfg-status').value = data.config.spaStatus || 'ACTIVA';
            if (document.getElementById('cfg-horario')) document.getElementById('cfg-horario').value = data.config.horario || '';
            if (document.getElementById('cfg-banner')) document.getElementById('cfg-banner').value = data.config.banner || '';
        }
        staffData = data.personal || [];
        attendanceData = data.asistencia || [];
        commissionData = data.comisiones || [];
        checkinData = data.checkins || [];
    } catch(e) {
        console.warn('Fetch failed, using empty data', e);
    }
    renderAll();
    hideLoader();
}

function renderAll() {
    renderStaff();
    renderAttendance();
    renderCommissions();
    renderCheckins();
    updateStats();
    populateSelects();
}

function updateStats() {
    const therapists = staffData.filter(s => s.role === 'Terapeuta' && s.status === 'ACTIVO');
    document.getElementById('s-personal').textContent = therapists.length;
    const st = document.getElementById('cfg-status');
    const statusEl = document.getElementById('s-status');
    if (st && statusEl) {
        const v = st.value;
        statusEl.textContent = v === 'ACTIVA' ? 'Activa' : v === 'EN PAUSA' ? 'Pausa' : 'Agenda';
        statusEl.style.color = v === 'ACTIVA' ? 'var(--success)' : v === 'EN PAUSA' ? 'var(--danger)' : 'var(--warning)';
    }
    document.getElementById('s-checkins').textContent = checkinData.length;
    document.getElementById('badge-checkins').textContent = checkinData.length;

    // Monthly commissions total
    const now = new Date();
    const monthComm = commissionData.filter(c => {
        const d = new Date(c.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalComm = monthComm.reduce((s, c) => s + (parseFloat(c.commission) || 0), 0);
    document.getElementById('s-comisiones').textContent = '$' + totalComm.toLocaleString();
}

function populateSelects() {
    const activeStaff = staffData.filter(s => s.status === 'ACTIVO');
    const options = activeStaff.map(s => `<option value="${s.name}">${s.name} (${s.role})</option>`).join('');
    const noOpt = '<option value="">-- Sin personal registrado --</option>';
    ['att-person', 'cm-person'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = options || noOpt;
    });
}

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════
function saveConfig() {
    const cfg = {
        spaStatus: document.getElementById('cfg-status').value,
        horario: document.getElementById('cfg-horario').value,
        banner: document.getElementById('cfg-banner').value
    };
    postData({ action: 'saveConfig', data: cfg }, 'Estado del Spa Actualizado');
    configData = cfg;
    updateStats();
}

// ═══════════════════════════════════════
// STAFF CRUD
// ═══════════════════════════════════════
function renderStaff() {
    const dom = document.getElementById('dom-staff');
    if (!dom) return;
    if (staffData.length === 0) {
        dom.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);"><i class="ri-team-line" style="font-size:2.5rem;display:block;margin-bottom:8px;"></i>Sin personal registrado.</div>';
        return;
    }
    dom.innerHTML = staffData.map(s => `
        <div class="list-item">
            <div class="info">
                <div class="name">${s.name}</div>
                <div class="meta">${s.role} | ${s.phone || 'Sin tel.'}</div>
            </div>
            <span class="status ${s.status === 'ACTIVO' ? 'status-on' : 'status-off'}">${s.status}</span>
            <button class="btn btn-secondary" onclick="editStaff('${s.id}')">Editar</button>
        </div>
    `).join('');
}

function openStaffModal() {
    document.getElementById('sf-id').value = '';
    document.getElementById('sf-name').value = '';
    document.getElementById('sf-role').value = 'Terapeuta';
    document.getElementById('sf-phone').value = '';
    document.getElementById('sf-status').value = 'ACTIVO';
    document.getElementById('btn-del-staff').style.display = 'none';
    document.getElementById('staff-modal-title').textContent = 'Nuevo Empleado';
    document.getElementById('modal-staff').classList.add('show');
}

function editStaff(id) {
    const s = staffData.find(x => x.id === id);
    if (!s) return;
    document.getElementById('sf-id').value = s.id;
    document.getElementById('sf-name').value = s.name;
    document.getElementById('sf-role').value = s.role;
    document.getElementById('sf-phone').value = s.phone || '';
    document.getElementById('sf-status').value = s.status;
    document.getElementById('btn-del-staff').style.display = 'block';
    document.getElementById('staff-modal-title').textContent = 'Editar Empleado';
    document.getElementById('modal-staff').classList.add('show');
}

function saveStaff() {
    const id = document.getElementById('sf-id').value || 'staff_' + Date.now();
    const obj = {
        id, name: document.getElementById('sf-name').value,
        role: document.getElementById('sf-role').value,
        phone: document.getElementById('sf-phone').value,
        status: document.getElementById('sf-status').value
    };
    const existing = staffData.findIndex(x => x.id === id);
    if (existing >= 0) staffData[existing] = obj;
    else staffData.push(obj);
    renderStaff(); populateSelects(); updateStats();
    document.getElementById('modal-staff').classList.remove('show');
    postData({ action: 'saveStaff', personal: staffData }, 'Personal Actualizado');
}

function deleteStaff() {
    if (!confirm('Eliminar este empleado?')) return;
    const id = document.getElementById('sf-id').value;
    staffData = staffData.filter(x => x.id !== id);
    renderStaff(); populateSelects(); updateStats();
    document.getElementById('modal-staff').classList.remove('show');
    postData({ action: 'saveStaff', personal: staffData }, 'Empleado Eliminado');
}

// ═══════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════
function renderAttendance() {
    const dom = document.getElementById('dom-attendance');
    if (!dom) return;
    if (attendanceData.length === 0) {
        dom.innerHTML = '<p style="color:var(--text-dim);font-size:12px;text-align:center;padding:20px;">Sin registros de asistencia.</p>';
        return;
    }
    const recent = [...attendanceData].reverse().slice(0, 20);
    dom.innerHTML = recent.map(a => `
        <div class="list-item">
            <div class="info">
                <div class="name">${a.person}</div>
                <div class="meta">${a.date} | ${a.time} | ${a.notes || ''}</div>
            </div>
            <span class="status ${a.type === 'ENTRADA' ? 'status-on' : 'status-warn'}">${a.type}</span>
        </div>
    `).join('');
}

function logAttendance() {
    const person = document.getElementById('att-person').value;
    if (!person) { alert('Seleccione un empleado'); return; }
    const now = new Date();
    const record = {
        person,
        type: document.getElementById('att-type').value,
        date: now.toLocaleDateString('es-MX'),
        time: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        notes: document.getElementById('att-notes').value
    };
    attendanceData.push(record);
    renderAttendance();
    document.getElementById('att-notes').value = '';
    postData({ action: 'logAttendance', record }, 'Asistencia Registrada');
}

// ═══════════════════════════════════════
// COMMISSIONS
// ═══════════════════════════════════════
function renderCommissions() {
    const domHist = document.getElementById('dom-commissions');
    const domSum = document.getElementById('dom-comm-summary');
    if (!domHist) return;

    if (commissionData.length === 0) {
        domHist.innerHTML = '<p style="color:var(--text-dim);font-size:12px;text-align:center;padding:20px;">Sin servicios registrados.</p>';
        domSum.innerHTML = domHist.innerHTML;
        return;
    }

    // Summary by therapist
    const summary = {};
    commissionData.forEach(c => {
        if (!summary[c.person]) summary[c.person] = { services: 0, revenue: 0, commission: 0 };
        summary[c.person].services++;
        summary[c.person].revenue += parseFloat(c.price) || 0;
        summary[c.person].commission += parseFloat(c.commission) || 0;
    });

    domSum.innerHTML = Object.entries(summary).map(([name, d]) => `
        <div class="list-item">
            <div class="info">
                <div class="name">${name}</div>
                <div class="meta">${d.services} servicios | Facturado: $${d.revenue.toLocaleString()}</div>
            </div>
            <div style="text-align:right;">
                <div style="color:var(--accent);font-family:var(--font-display);font-size:18px;font-weight:600;">$${d.commission.toLocaleString()}</div>
                <div style="font-size:9px;color:var(--text-dim);">COMISION</div>
            </div>
        </div>
    `).join('');

    // History
    const recent = [...commissionData].reverse().slice(0, 30);
    domHist.innerHTML = recent.map(c => `
        <div class="list-item">
            <div class="info">
                <div class="name">${c.service}</div>
                <div class="meta">${c.person} | ${c.date}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:12px;">$${parseFloat(c.price).toLocaleString()}</div>
                <div style="font-size:10px;color:var(--accent);">Com: $${parseFloat(c.commission).toLocaleString()}</div>
            </div>
        </div>
    `).join('');
}

function openCommModal() {
    document.getElementById('cm-date').value = new Date().toISOString().split('T')[0];
    const svc = document.getElementById('cm-service');
    const p = PRICE_MAP[svc.value] || 0;
    document.getElementById('cm-price').value = p;
    document.getElementById('cm-commission').value = Math.round(p * COMMISSION_RATE);
    document.getElementById('modal-comm').classList.add('show');
}

function saveCommission() {
    const person = document.getElementById('cm-person').value;
    if (!person) { alert('Seleccione un terapeuta'); return; }
    const price = parseFloat(document.getElementById('cm-price').value) || 0;
    const record = {
        person,
        service: document.getElementById('cm-service').value,
        date: document.getElementById('cm-date').value,
        price,
        commission: Math.round(price * COMMISSION_RATE)
    };
    commissionData.push(record);
    renderCommissions(); updateStats();
    document.getElementById('modal-comm').classList.remove('show');
    postData({ action: 'logCommission', record }, 'Comision Registrada');
}

// ═══════════════════════════════════════
// CHECK-INS
// ═══════════════════════════════════════
function renderCheckins() {
    const dom = document.getElementById('dom-checkins');
    if (!dom) return;
    if (checkinData.length === 0) {
        dom.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);"><i class="ri-user-heart-line" style="font-size:2.5rem;display:block;margin-bottom:8px;"></i>Sin registros de check-in.</div>';
        return;
    }
    const recent = [...checkinData].reverse();
    dom.innerHTML = recent.map(c => `
        <div class="list-item" style="flex-direction:column;align-items:flex-start;gap:8px;">
            <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                <div>
                    <div class="name" style="font-size:14px;">${c.nombre || 'Sin nombre'}</div>
                    <div class="meta">${c.telefono || ''} | ${c.email || ''}</div>
                </div>
                <div class="meta">${c.fecha || ''} ${c.hora || ''}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;font-size:11px;color:var(--text-dim);">
                <div><strong style="color:var(--accent);">Primera visita:</strong> ${c.primeraVisita || '-'}</div>
                <div><strong style="color:var(--accent);">Presion:</strong> ${c.presion || '-'}</div>
                <div><strong style="color:var(--accent);">Objetivo:</strong> ${c.objetivo || '-'}</div>
                <div><strong style="color:var(--accent);">Areas:</strong> ${c.areasAtencion || '-'}</div>
                <div><strong style="color:var(--accent);">Condicion:</strong> ${c.condicionMedica || 'Ninguna'}</div>
                <div><strong style="color:var(--accent);">Alergias:</strong> ${c.alergias || 'Ninguna'}</div>
            </div>
            ${c.servicio ? `<div style="font-size:11px;"><strong style="color:var(--accent);">Servicio:</strong> ${c.servicio}</div>` : ''}
            ${c.comentarios ? `<div style="font-size:11px;color:var(--text-dim);font-style:italic;">"${c.comentarios}"</div>` : ''}
        </div>
    `).join('');
}

function copyCheckinLink() {
    const url = window.location.origin + '/checkin/';
    navigator.clipboard.writeText(url).then(() => toast('Link copiado al portapapeles'));
}

// ═══════════════════════════════════════
// LOYALTY CLUB (COMMAND CENTER)
// ═══════════════════════════════════════
let loyaltyClients = [];

function getPin() {
    return sessionStorage.getItem('cdl_pin') || '';
}

async function fetchLoyaltyData() {
    const pin = getPin();
    if (!pin) { toast('Sesión expirada. Recarga la página.'); return; }
    try {
        const [clientsRes, statsRes] = await Promise.all([
            fetch(API_URL + '?action=clients&pin=' + encodeURIComponent(pin)).then(r => r.json()),
            fetch(API_URL + '?action=stats&pin=' + encodeURIComponent(pin)).then(r => r.json())
        ]);
        if (clientsRes.success) {
            loyaltyClients = clientsRes.clients || [];
            renderLoyaltyList();
        }
        if (statsRes.success && statsRes.stats) {
            const s = statsRes.stats;
            document.getElementById('ls-clients').textContent = s.totalClients || 0;
            document.getElementById('ls-visits').textContent = s.totalVisits || 0;
            document.getElementById('ls-rewards').textContent = s.rewardsReady || 0;
            const avg = s.totalClients > 0 ? (s.totalVisits / s.totalClients).toFixed(1) : '--';
            document.getElementById('ls-avg').textContent = avg;
            document.getElementById('badge-loyalty').textContent = s.rewardsReady || 0;
        }
    } catch(e) {
        console.error('Loyalty fetch error:', e);
        toast('Error cargando datos de lealtad');
    }
}

function renderLoyaltyList() {
    const dom = document.getElementById('dom-loyalty');
    if (!dom) return;
    if (loyaltyClients.length === 0) {
        dom.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);"><i class="ri-vip-crown-line" style="font-size:2.5rem;display:block;margin-bottom:8px;"></i>Sin miembros registrados.</div>';
        return;
    }
    dom.innerHTML = loyaltyClients.map(c => {
        const name = c.Name || c.name || 'Sin nombre';
        const phone = c.Phone || c.phone || '';
        const stamps = Number(c.Stamps || c.stamps || 0);
        const visits = Number(c.TotalVisits || c.totalVisits || 0);
        const tier = c.Tier || c.tier || 'Invitado';
        const rewardReady = stamps >= 3;
        const dots = [1,2,3].map(i => `<div style="width:12px;height:12px;border-radius:50%;border:2px solid ${i <= stamps ? 'var(--accent)' : 'var(--border)'};background:${i <= stamps ? 'var(--accent)' : 'transparent'};transition:0.3s;"></div>`).join('');
        return `
        <div class="list-item" style="cursor:pointer;transition:background 0.3s;" onclick="openLoyaltyDetail('${phone}')" onmouseover="this.style.background='rgba(212,163,115,0.05)'" onmouseout="this.style.background=''">
            <div class="info">
                <div class="name">${name}</div>
                <div class="meta">${phone} · ${tier} · ${visits} visitas</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                <div style="display:flex;gap:4px;">${dots}</div>
                ${rewardReady ? '<span class="status status-warn" style="margin-left:8px;">🎁 PREMIO</span>' : ''}
            </div>
        </div>`;
    }).join('');
}

async function openLoyaltyDetail(phone) {
    const pin = getPin();
    if (!pin) return;
    toast('Cargando detalle...');
    try {
        const res = await fetch(API_URL + '?action=lookup&phone=' + encodeURIComponent(phone)).then(r => r.json());
        if (!res.success || !res.found) { toast('Cliente no encontrado'); return; }
        const c = res.client;
        const stamps = Number(c.stamps || 0);
        const history = c.history || [];
        const rewardReady = stamps >= 3;

        // Stamps visual
        const stampsHTML = [1,2,3].map(i => {
            const entry = history.find(h => h.stamp === i);
            const filled = i <= stamps;
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                <div style="width:48px;height:48px;border-radius:50%;border:3px ${filled ? 'solid var(--accent)' : 'dashed var(--border)'};display:flex;align-items:center;justify-content:center;font-size:1.2rem;background:${filled ? 'rgba(212,163,115,0.15)' : 'transparent'};color:${filled ? 'var(--accent)' : 'var(--text-dim)'};transition:0.3s;">
                    <i class="ri-moon-line"></i>
                </div>
                <span style="font-size:10px;color:${filled ? 'var(--accent)' : 'var(--text-dim)'};max-width:70px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${entry ? entry.service.split(' ').slice(0,2).join(' ') : '—'}</span>
            </div>`;
        }).join('');

        // Gift stamp
        const giftStamp = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="width:48px;height:48px;border-radius:50%;border:3px ${rewardReady ? 'solid #FFD700' : 'dashed var(--border)'};display:flex;align-items:center;justify-content:center;font-size:1.2rem;background:${rewardReady ? 'rgba(255,215,0,0.15)' : 'transparent'};color:${rewardReady ? '#FFD700' : 'var(--text-dim)'};">
                <i class="ri-gift-line"></i>
            </div>
            <span style="font-size:10px;color:${rewardReady ? '#FFD700' : 'var(--text-dim)'};">50% OFF</span>
        </div>`;

        // History table
        let historyHTML = '';
        if (history.length > 0) {
            historyHTML = `<div style="margin-top:20px;">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--accent);margin-bottom:10px;font-weight:600;">Historial Completo</div>
                ${history.map(h => {
                    const isReward = h.service === 'RECOMPENSA 50% APLICADA';
                    const date = h.date ? new Date(h.date).toLocaleDateString('es-MX', {day:'numeric',month:'short',year:'numeric'}) : '--';
                    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:${isReward ? 'rgba(255,215,0,0.05)' : 'rgba(0,0,0,0.15)'};border:1px solid ${isReward ? 'rgba(255,215,0,0.2)' : 'var(--border)'};border-radius:8px;margin-bottom:6px;font-size:12px;">
                        <div>
                            <div style="font-weight:500;color:${isReward ? '#FFD700' : 'var(--text-pure)'};">${isReward ? '🎁 ' : ''}${h.service || 'Servicio'}</div>
                            <div style="color:var(--text-dim);font-size:10px;margin-top:2px;">${date}${h.stamp ? ' · Sello #' + h.stamp : ''}</div>
                        </div>
                        ${h.amount ? `<div style="color:var(--accent);font-weight:600;">$${Number(h.amount).toLocaleString()}</div>` : ''}
                    </div>`;
                }).join('')}
            </div>`;
        }

        // Reward button
        const rewardBtn = rewardReady
            ? `<button class="btn btn-primary" style="width:100%;margin-top:16px;gap:8px;" onclick="redeemLoyaltyCC('${c.phone}')"><i class="ri-gift-line"></i> Aplicar Recompensa 50% (-3 Sellos)</button>`
            : `<div style="text-align:center;padding:12px;margin-top:16px;background:rgba(0,0,0,0.15);border-radius:8px;font-size:12px;color:var(--text-dim);"><i class="ri-information-line"></i> El cliente necesita ${3 - stamps} sello${3 - stamps !== 1 ? 's' : ''} más para su recompensa.</div>`;

        document.getElementById('loyalty-detail-body').innerHTML = `
            <div style="text-align:center;margin-bottom:20px;">
                <h3 style="font-family:var(--font-display);font-size:24px;color:var(--accent);font-weight:400;">${c.name || 'Sin nombre'}</h3>
                <p style="color:var(--text-dim);font-size:13px;margin-top:4px;">${c.phone} · ${c.tier} · ${c.totalVisits} visitas totales</p>
            </div>
            <div style="display:flex;justify-content:center;gap:16px;margin:20px 0;">${stampsHTML}${giftStamp}</div>
            ${rewardBtn}
            ${historyHTML}
        `;
        document.getElementById('modal-loyalty-detail').classList.add('show');
    } catch(e) {
        console.error('Loyalty detail error:', e);
        toast('Error al cargar detalle');
    }
}

async function redeemLoyaltyCC(phone) {
    if (!confirm('¿Aplicar el descuento de 50% y restar 3 sellos?\n\n(Las visitas totales se conservan intactas)')) return;
    const pin = getPin();
    if (!pin) return;
    toast('Aplicando recompensa...');
    try {
        const res = await fetch(API_URL + '?action=redeemreward&phone=' + encodeURIComponent(phone) + '&pin=' + encodeURIComponent(pin)).then(r => r.json());
        if (res.success) {
            toast(res.message || 'Recompensa aplicada exitosamente');
            document.getElementById('modal-loyalty-detail').classList.remove('show');
            fetchLoyaltyData();
        } else {
            toast(res.error || 'Error al aplicar recompensa');
        }
    } catch(e) {
        toast('Error de conexión');
    }
}

// ═══════════════════════════════════════
// GIFT CERTIFICATES (COMMAND CENTER)
// ═══════════════════════════════════════
let giftCerts = [];

async function fetchGiftsData() {
    const pin = getPin();
    if (!pin) { toast('Sesión expirada. Recarga la página.'); return; }
    try {
        const res = await fetch(API_URL + '?action=gifts&pin=' + encodeURIComponent(pin)).then(r => r.json());
        if (res.success) {
            giftCerts = res.gifts || [];
            renderGiftsList();
            // Stats
            const total = giftCerts.length;
            const active = giftCerts.filter(g => g.status === 'ACTIVO').length;
            const redeemed = total - active;
            document.getElementById('gs-total').textContent = total;
            document.getElementById('gs-active').textContent = active;
            document.getElementById('gs-redeemed').textContent = redeemed;
            document.getElementById('gs-value').textContent = '--';
            document.getElementById('badge-gifts').textContent = active;
        }
    } catch(e) {
        console.error('Gifts fetch error:', e);
        toast('Error cargando certificados');
    }
}

function renderGiftsList() {
    const dom = document.getElementById('dom-gifts-cc');
    if (!dom) return;
    if (giftCerts.length === 0) {
        dom.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);"><i class="ri-gift-line" style="font-size:2.5rem;display:block;margin-bottom:8px;"></i>Sin certificados emitidos.</div>';
        return;
    }
    dom.innerHTML = giftCerts.map(g => {
        const isActive = g.status === 'ACTIVO';
        return `
        <div class="list-item" style="cursor:pointer;transition:background 0.3s;" onclick="openGiftDetail('${g.folio}')" onmouseover="this.style.background='rgba(212,163,115,0.05)'" onmouseout="this.style.background=''">
            <div class="info">
                <div class="name" style="font-family:monospace;letter-spacing:1px;color:var(--accent);">${g.folio}</div>
                <div class="meta">Para: ${g.giftTo || '--'} · ${(g.service || '').split(' ').slice(0,3).join(' ')}</div>
            </div>
            <span class="status ${isActive ? 'status-on' : 'status-off'}">${g.status}</span>
        </div>`;
    }).join('');
}

async function openGiftDetail(folio) {
    const pin = getPin();
    if (!pin) return;
    toast('Cargando certificado...');
    try {
        const res = await fetch(API_URL + '?action=validateGift&pin=' + encodeURIComponent(pin) + '&folio=' + encodeURIComponent(folio)).then(r => r.json());
        if (!res.success) { toast(res.error || 'Certificado no encontrado'); return; }
        const g = res.gift;
        const isActive = g.status === 'ACTIVO';
        const date = g.date ? new Date(g.date).toLocaleDateString('es-MX', {day:'numeric',month:'long',year:'numeric'}) : '--';

        const redeemBtn = isActive
            ? `<button class="btn btn-danger" style="width:100%;margin-top:16px;gap:8px;" onclick="redeemGiftCC('${g.folio}')"><i class="ri-check-double-line"></i> Marcar como CANJEADO</button>`
            : `<div style="text-align:center;padding:12px;margin-top:16px;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:8px;font-size:12px;color:var(--danger);"><i class="ri-close-circle-line"></i> Este certificado ya fue canjeado</div>`;

        document.getElementById('gift-detail-body').innerHTML = `
            <div style="text-align:center;margin-bottom:24px;">
                <div style="font-family:monospace;font-size:28px;letter-spacing:4px;color:var(--accent);font-weight:700;">${g.folio}</div>
                <span class="status ${isActive ? 'status-on' : 'status-off'}" style="margin-top:8px;display:inline-block;">${g.status}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div style="background:rgba(0,0,0,0.2);padding:14px;border-radius:10px;border:1px solid var(--border);">
                    <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:4px;">Para</div>
                    <div style="font-size:14px;font-weight:500;">${g.giftTo || '--'}</div>
                </div>
                <div style="background:rgba(0,0,0,0.2);padding:14px;border-radius:10px;border:1px solid var(--border);">
                    <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:4px;">De parte de</div>
                    <div style="font-size:14px;font-weight:500;">${g.giftFrom || '--'}</div>
                </div>
            </div>
            <div style="background:rgba(0,0,0,0.2);padding:14px;border-radius:10px;border:1px solid var(--border);margin-bottom:12px;">
                <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:4px;">Servicio</div>
                <div style="font-size:16px;font-weight:500;color:var(--accent);">${g.service || '--'}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div style="background:rgba(0,0,0,0.2);padding:14px;border-radius:10px;border:1px solid var(--border);">
                    <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:4px;">Monto</div>
                    <div style="font-size:14px;font-weight:500;">${g.amount ? '$' + Number(g.amount).toLocaleString() + ' MXN' : '--'}</div>
                </div>
                <div style="background:rgba(0,0,0,0.2);padding:14px;border-radius:10px;border:1px solid var(--border);">
                    <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:4px;">Fecha Compra</div>
                    <div style="font-size:14px;font-weight:500;">${date}</div>
                </div>
            </div>
            ${redeemBtn}
        `;
        document.getElementById('modal-gift-detail').classList.add('show');
    } catch(e) {
        console.error('Gift detail error:', e);
        toast('Error al cargar certificado');
    }
}

async function redeemGiftCC(folio) {
    if (!confirm(`¿Marcar el certificado ${folio} como CANJEADO?\n\nEsta acción es irreversible.`)) return;
    const pin = getPin();
    if (!pin) return;
    toast('Procesando canje...');
    try {
        const res = await fetch(API_URL + '?action=redeemGift&pin=' + encodeURIComponent(pin) + '&folio=' + encodeURIComponent(folio)).then(r => r.json());
        if (res.success) {
            toast('Certificado canjeado exitosamente');
            document.getElementById('modal-gift-detail').classList.remove('show');
            fetchGiftsData();
        } else {
            toast(res.error || 'Error al canjear');
        }
    } catch(e) {
        toast('Error de conexión');
    }
}

// ═══════════════════════════════════════
// ENHANCED NAVIGATION (lazy-load data)
// ═══════════════════════════════════════
const _originalSwitchView = switchView;
switchView = function(id, el) {
    _originalSwitchView(id, el);
    if (id === 'v-loyalty') fetchLoyaltyData();
    if (id === 'v-gifts') fetchGiftsData();
};

