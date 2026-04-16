/**
 * ═══════════════════════════════════════════════════════════
 * CLARO DE LUNA SPA — Backend Maestro Unificado (v3.2)
 * ═══════════════════════════════════════════════════════════
 * 
 * SISTEMAS INTEGRADOS:
 * 1. Club de Lealtad (Base de Clientes)
 * 2. Certificados de Regalo (Folio y Canje)
 * 3. Command Center (Personal y Comisiones)
 * 4. Check-In Digital (Huéspedes)
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

// ── CONFIGURACIÓN DE HOJAS Y COLUMNAS ──
const SHEETS = {
  CONFIG:     { name: 'Config',     headers: ['Key', 'Value'], color: '#7E57C2' },
  CLIENTES:   { name: 'Clientes',   headers: ['Phone', 'Name', 'Stamps', 'TotalVisits', 'Tier', 'History', 'LastStamp', 'RegisteredBy', 'CreatedAt'], color: '#1E88E5' },
  CODIGOS:    { name: 'Códigos',    headers: ['Code', 'Service', 'Amount', 'Pin', 'CreatedAt', 'ExpiresAt', 'Used', 'UsedBy'], color: '#FB8C00' },
  SERVICIOS:  { name: 'Servicios',  headers: ['Name', 'Category', 'Price', 'Duration', 'Active'], color: '#FDD835' },
  CERTIFICADOS: { name: 'Certificados', headers: ['Folio', 'Para', 'De', 'Servicio', 'Monto', 'FechaCompra', 'Estatus', 'FechaCanje'], color: '#D81B60' },
  PERSONAL:   { name: 'Personal',   headers: ['id', 'name', 'role', 'phone', 'status'], color: '#43A047' },
  ASISTENCIA: { name: 'Asistencia', headers: ['person', 'type', 'date', 'time', 'notes'], color: '#3949AB' },
  COMISIONES: { name: 'Comisiones', headers: ['person', 'service', 'date', 'price', 'commission'], color: '#00897B' },
  REGISTROS:  { name: 'Registros',  headers: ['nombre', 'email', 'telefono', 'nacimiento', 'primeraVisita', 'condicionMedica', 'alergias', 'lesiones', 'areasAtencion', 'presion', 'objetivo', 'servicio', 'comentarios', 'fecha', 'hora'], color: '#455A64' }
};

// ============ CONFIG HELPERS ============
function getConfig() {
  const sheet = getSheet('Config');
  const data = sheet.getDataRange().getValues();
  const config = {};
  for (let i = 1; i < data.length; i++) {
    config[String(data[i][0]).trim()] = String(data[i][1]).trim();
  }
  return {
    STAFF_PIN: config.STAFF_PIN || '7741',
    STAMPS_GOAL: parseInt(config.STAMPS_GOAL) || 3,
    DISCOUNT_PCT: parseInt(config.DISCOUNT_PCT) || 50,
    CODE_EXPIRY: parseInt(config.CODE_EXPIRY) || 5,
    SPA_PHONE: config.SPA_PHONE || '522294023957',
    spaStatus: config.spaStatus || 'ACTIVA',
    horario: config.horario || '9:00 - 18:00',
    banner: config.banner || ''
  };
}

function validatePin(pin) { return pin === getConfig().STAFF_PIN; }

// ============ MAIN HANDLERS (DISPATCHER) ============
function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  let params = e.parameter || {};
  let body = {};
  if (e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents); } catch(err) {}
  }
  const action = (params.action || body.action || '').trim();
  let result;
  try {
    switch (action) {
      case 'getadmin':       result = getAdminData(); break;
      case 'saveconfig':     result = saveConfig(body.data); break;
      case 'savestaff':      result = saveStaff(body.personal); break;
      case 'logattendance':  result = logAttendance(body.record); break;
      case 'logcommission':  result = logCommission(body.record); break;
      case 'savecheckin':    result = saveCheckin(body.data); break;
      case 'getstatus':      result = { success: true, ...getConfig() }; break;
      case 'lookup':         result = lookupClient(params.phone); break;
      case 'register':       result = registerClient(params.pin, params.phone, params.name); break;
      case 'generateCode':   result = generateStampCode(params.pin, params.service, params.amount); break;
      case 'redeemCode':     result = redeemStampCode(params.code, params.phone); break;
      case 'redeemReward':   result = redeemReward(params.phone, params.pin); break;
      case 'services':       result = getServices(); break;
      case 'stats':          result = getStats(params.pin); break;
      case 'clients':        result = getClients(params.pin); break;
      case 'createGift':     result = createGift(params.pin, params.giftTo, params.giftFrom, params.service, params.amount); break;
      case 'validateGift':   result = validateGift(params.pin, params.folio); break;
      case 'redeemGift':     result = redeemGift(params.pin, params.folio); break;
      case 'gifts':          result = getGifts(params.pin); break;
      default:               result = { success: false, error: 'Acción no válida: ' + action };
    }
  } catch (err) { result = { success: false, error: err.message }; }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// ============ FUNCIONES COMMAND CENTER & CHECK-IN ============
function getAdminData() {
  return {
    success: true,
    config: getConfig(),
    personal:   sheetToArray(getSheet('Personal')),
    asistencia: sheetToArray(getSheet('Asistencia')),
    comisiones: sheetToArray(getSheet('Comisiones')),
    checkins:   sheetToArray(getSheet('Registros')),
    clientes:   sheetToArray(getSheet('Clientes'))
  };
}

function saveConfig(data) {
  const sheet = getSheet('Config');
  const current = getConfig();
  const merged = { ...current, ...data };
  sheet.clear();
  sheet.appendRow(['Key', 'Value']);
  Object.entries(merged).forEach(([k, v]) => sheet.appendRow([k, String(v)]));
  embellecerBaseDeDatos();
  return { success: true };
}

function saveStaff(personal) {
  const sheet = getSheet('Personal');
  sheet.clear();
  sheet.appendRow(['id', 'name', 'role', 'phone', 'status']);
  if (personal && personal.length > 0) {
    const rows = personal.map(p => [p.id, p.name, p.role, p.phone, p.status]);
    sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }
  embellecerBaseDeDatos();
  return { success: true };
}

function logAttendance(r) { getSheet('Asistencia').appendRow([r.person, r.type, r.date, r.time, r.notes || '']); return { success: true }; }
function logCommission(r) { getSheet('Comisiones').appendRow([r.person, r.service, r.date, r.price, r.commission]); return { success: true }; }
function saveCheckin(d) {
  const headers = SHEETS.REGISTROS.headers;
  getSheet('Registros').appendRow(headers.map(h => d[h] || ''));
  return { success: true };
}

// ============ RE-IMPLEM BASADAS EN TU SCRIPT ANTERIOR ============
function getServices() {
  const data = getSheet('Servicios').getDataRange().getValues();
  const h = data[0];
  const services = [];
  for (let i = 1; i < data.length; i++) {
    const row = rowToObject(h, data[i]);
    if (String(row.Active).toUpperCase() !== 'NO') {
      services.push({ name: row.Name || '', category: row.Category || '', price: Number(row.Price) || 0, duration: row.Duration || '' });
    }
  }
  return { success: true, services };
}

function registerClient(pin, phone, name) {
  if (!validatePin(pin)) return { success: false, error: 'PIN incorrecto' };
  phone = normalizePhone(phone);
  const sheet = getSheet('Clientes');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { if (normalizePhone(String(data[i][0])) === phone) return { success: false, error: 'Ya registrado' }; }
  sheet.appendRow([phone, name.trim(), 0, 0, 'Invitado', '[]', '', 'Staff', new Date().toISOString()]);
  return { success: true, message: `Cliente registrado` };
}

function lookupClient(phone) {
  phone = normalizePhone(phone);
  const data = getSheet('Clientes').getDataRange().getValues();
  const config = getConfig();
  for (let i = 1; i < data.length; i++) {
    if (normalizePhone(String(data[i][0])) === phone) {
      const stamps = Number(data[i][2]) || 0;
      return { success: true, found: true, client: { phone: data[i][0], name: data[i][1], stamps: stamps, totalVisits: Number(data[i][3]) || 0, tier: data[i][4] || 'Invitado', history: safeParseJSON(data[i][5] || '[]'), lastStamp: data[i][6] || null, rewardReady: stamps >= config.STAMPS_GOAL } };
    }
  }
  return { success: true, found: false };
}

function generateStampCode(pin, service, amount) {
  if (!validatePin(pin)) return { success: false, error: 'PIN incorrecto' };
  const config = getConfig();
  const code = generateRandomCode(6);
  const expires = new Date(new Date().getTime() + config.CODE_EXPIRY * 60000);
  getSheet('Códigos').appendRow([code, service, Number(amount) || 0, pin, new Date().toISOString(), expires.toISOString(), 'NO', '']);
  return { success: true, code, expiresAt: expires.toISOString() };
}

function redeemStampCode(code, phone) {
  phone = normalizePhone(phone);
  const clientSheet = getSheet('Clientes');
  const clientData = clientSheet.getDataRange().getValues();
  let cRow = -1;
  for (let i = 1; i < clientData.length; i++) { if (normalizePhone(String(clientData[i][0])) === phone) { cRow = i; break; } }
  if (cRow === -1) return { success: false, error: 'No registrado' };
  const codesSheet = getSheet('Códigos');
  const codesData = codesSheet.getDataRange().getValues();
  let coRow = -1;
  for (let i = 1; i < codesData.length; i++) { if (String(codesData[i][0]).toUpperCase() === String(code).toUpperCase()) { coRow = i; break; } }
  if (coRow === -1 || String(codesData[coRow][6]).toUpperCase() === 'SÍ') return { success: false, error: 'Código inválido o usado' };
  codesSheet.getRange(coRow + 1, 7).setValue('SÍ');
  const config = getConfig();
  let stamps = Number(clientData[cRow][2]) + 1;
  clientSheet.getRange(cRow + 1, 3).setValue(stamps);
  clientSheet.getRange(cRow + 1, 4).setValue(Number(clientData[cRow][3]) + 1);
  return { success: true, message: `¡Sello registrado!`, stamps };
}

function createGift(pin, giftTo, giftFrom, service, amount) {
  if (!validatePin(pin)) return { success: false, error: 'PIN incorrecto' };
  const folio = 'CDL-' + generateRandomCode(5);
  getSheet('Certificados').appendRow([folio, giftTo||'', giftFrom||'', service||'', Number(amount)||0, new Date().toISOString(), 'ACTIVO', '']);
  return { success: true, folio };
}

function getGifts(pin) {
  if (!validatePin(pin)) return { success: false, error: 'PIN incorrecto' };
  const data = getSheet('Certificados').getDataRange().getValues();
  return { success: true, gifts: data.slice(1).map(d => ({ folio: d[0], giftTo: d[1], status: d[6] })).reverse() };
}

// ============ CORE HELPERS & VISUALS ============
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const config = Object.values(SHEETS).find(s => s.name === name);
    if (config) {
      sheet.appendRow(config.headers);
      if (name === 'Config') {
        [['STAFF_PIN','7741'],['STAMPS_GOAL','3'],['DISCOUNT_PCT','50'],['CODE_EXPIRY','5'],['SPA_PHONE','522294023957']].forEach(r => sheet.appendRow(r));
      }
    }
  }
  return sheet;
}

function inicializarEcosistema() {
  Object.keys(SHEETS).forEach(k => getSheet(SHEETS[k].name));
  embellecerBaseDeDatos();
  return "¡Ecosistema Inicializado!";
}

function embellecerBaseDeDatos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.values(SHEETS).forEach(conf => {
    let s = ss.getSheetByName(conf.name); if (!s) return;
    s.setFrozenRows(1);
    const r = s.getDataRange();
    const rows = r.getNumRows();
    const cols = r.getNumColumns();
    
    // Header Estilizado
    const h = s.getRange(1, 1, 1, cols);
    h.setBackground(conf.color).setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
    s.setRowHeight(1, 40);
    
    // Cuerpo con Spacing
    if (rows > 1) {
      s.setRowHeights(2, rows - 1, 35);
      const dataRange = s.getRange(2, 1, rows - 1, cols);
      dataRange.setVerticalAlignment('middle').setHorizontalAlignment('center');
      dataRange.getBandings().forEach(b => b.remove());
      dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
    }
    
    // Padding de Columnas
    s.autoResizeColumns(1, cols);
    for (let i = 1; i <= cols; i++) {
        s.setColumnWidth(i, s.getColumnWidth(i) + 60);
    }
    
    s.setTabColor(conf.color);
  });
  return "Tablas refinadas y colorizadas.";
}

function normalizePhone(p) { return String(p).replace(/\D/g, '').slice(-10); }
function generateRandomCode(l) {
  const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = ''; for (let i=0; i<l; i++) c += ch[Math.floor(Math.random()*ch.length)];
  return c;
}
function rowToObject(h, r) { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; }
function safeParseJSON(s) { try { return JSON.parse(s); } catch (e) { return []; } }
