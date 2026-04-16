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

const API = 'https://script.google.com/macros/s/AKfycbwWqsyzxQbVUeEMtyyzTLhs4w8yGG13PErX6tX-fCUASc45bH5IBoMpDVjJJzNEXQw/exec';
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
        await fetch(API, {
            method: 'POST', mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        hideLoader();
        toast(msg);
    } catch(e) { hideLoader(); alert('Error de conexion'); }
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
        const res = await fetch(API + '?action=getAdmin');
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
