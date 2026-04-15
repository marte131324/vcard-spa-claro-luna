/**
 * ================================================================
 *  CLARO DE LUNA — CLUB DE LEALTAD & CERTIFICADOS
 *  Backend: Google Apps Script (conectado a Google Sheets)
 *  
 *  RESPALDO RECONSTRUIDO por Treze Labs (Apr 2026)
 *  Basado en ingeniería inversa de la API desplegada:
 *  AKfycbymopbpOgPxakL19ye7Y9SvIDpxABKMpwyGkrlaFWs5aBQe2DKe9UyT-kObgD5-ZPDc
 *
 *  Endpoints verificados:
 *  - GET ?action=services     → Lista de servicios
 *  - GET ?action=lookup       → Buscar cliente por teléfono
 *  - GET ?action=stats        → Estadísticas (requiere PIN)
 *  - GET ?action=clients      → Lista de clientes (requiere PIN)
 *  - GET ?action=gifts        → Lista de certificados (requiere PIN)
 *  - GET ?action=generateCode → Generar código de sello temporal
 *  - GET ?action=redeemCode   → Canjear código de sello
 *  - GET ?action=register     → Registrar nuevo cliente (requiere PIN)
 *  - GET ?action=createGift   → Crear certificado de regalo
 *  - GET ?action=validateGift → Validar folio de certificado
 *  - GET ?action=redeemGift   → Marcar certificado como canjeado
 * ================================================================
 */

// ==================== CONFIGURACIÓN ====================
const ADMIN_PIN = '%%PIN_AQUI%%'; // PIN configurado por el desarrollador
const SHEET_ID = '%%SHEET_ID%%';  // ID de la Google Sheet vinculada

// ==================== HOJAS ====================
function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

// ==================== ROUTER ====================
function doGet(e) {
  var action = e.parameter.action || '';
  var result = {};

  try {
    switch (action) {
      case 'services':
        result = getServices();
        break;
      case 'lookup':
        result = lookupClient(e.parameter.phone);
        break;
      case 'stats':
        result = getStats(e.parameter.pin);
        break;
      case 'clients':
        result = getClients(e.parameter.pin);
        break;
      case 'register':
        result = registerClient(e.parameter.pin, e.parameter.phone, e.parameter.name);
        break;
      case 'generateCode':
        result = generateStampCode(e.parameter.pin, e.parameter.service, e.parameter.amount);
        break;
      case 'redeemCode':
        result = redeemStampCode(e.parameter.code, e.parameter.phone);
        break;
      case 'createGift':
        result = createGift(e.parameter.pin, e.parameter);
        break;
      case 'validateGift':
        result = validateGift(e.parameter.pin, e.parameter.folio);
        break;
      case 'redeemGift':
        result = redeemGift(e.parameter.pin, e.parameter.folio);
        break;
      case 'gifts':
        result = getGifts(e.parameter.pin);
        break;
      default:
        result = { success: false, error: 'Acción no válida' };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== AUTENTICACIÓN ====================
function validatePin(pin) {
  if (pin !== ADMIN_PIN) throw new Error('PIN incorrecto');
}

// ==================== SERVICIOS ====================
function getServices() {
  var sheet = getSheet('Servicios');
  var data = sheet.getDataRange().getValues();
  var services = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      services.push({
        name: data[i][0],
        category: data[i][1] || '',
        price: Number(data[i][2]) || 0,
        duration: data[i][3] || ''
      });
    }
  }

  return { success: true, services: services };
}

// ==================== LOOKUP CLIENTE ====================
function lookupClient(phone) {
  if (!phone || phone.length < 10) return { success: false, error: 'Teléfono inválido' };

  var sheet = getSheet('Clientes');
  var data = sheet.getDataRange().getValues();
  var historySheet = getSheet('Historial');
  var histData = historySheet ? historySheet.getDataRange().getValues() : [];

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(phone).trim()) {
      var client = {
        name: data[i][0],
        phone: String(data[i][1]),
        stamps: Number(data[i][2]) || 0,
        totalVisits: Number(data[i][3]) || 0,
        tier: data[i][4] || 'Invitado',
        history: getClientHistory(histData, String(phone))
      };
      return { success: true, found: true, client: client };
    }
  }

  return { success: true, found: false, message: 'No encontrado. Solicita tu registro al concierge del spa.' };
}

function getClientHistory(histData, phone) {
  var history = [];
  for (var i = 1; i < histData.length; i++) {
    if (String(histData[i][0]).trim() === phone) {
      history.push({
        stamp: Number(histData[i][1]) || 0,
        service: histData[i][2] || '',
        amount: Number(histData[i][3]) || 0,
        date: histData[i][4] || ''
      });
    }
  }
  return history;
}

// ==================== ESTADÍSTICAS ====================
function getStats(pin) {
  validatePin(pin);

  var sheet = getSheet('Clientes');
  var data = sheet.getDataRange().getValues();
  var totalClients = Math.max(0, data.length - 1);
  var totalVisits = 0;
  var rewardsReady = 0;

  for (var i = 1; i < data.length; i++) {
    totalVisits += Number(data[i][3]) || 0;
    if (Number(data[i][2]) >= 3) rewardsReady++;
  }

  return {
    success: true,
    totalClients: totalClients,
    totalVisits: totalVisits,
    rewardsReady: rewardsReady
  };
}

// ==================== LISTA DE CLIENTES ====================
function getClients(pin) {
  validatePin(pin);

  var sheet = getSheet('Clientes');
  var data = sheet.getDataRange().getValues();
  var clients = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      clients.push({
        name: data[i][0],
        phone: String(data[i][1]),
        stamps: Number(data[i][2]) || 0,
        totalVisits: Number(data[i][3]) || 0,
        tier: data[i][4] || 'Invitado'
      });
    }
  }

  return { success: true, clients: clients };
}

// ==================== REGISTRAR CLIENTE ====================
function registerClient(pin, phone, name) {
  validatePin(pin);
  if (!phone || phone.length < 10) return { success: false, error: 'Teléfono de 10 dígitos requerido' };
  if (!name || name.length < 2) return { success: false, error: 'Nombre requerido' };

  var sheet = getSheet('Clientes');
  var data = sheet.getDataRange().getValues();

  // Check duplicate
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(phone).trim()) {
      return { success: false, error: 'Este teléfono ya está registrado' };
    }
  }

  sheet.appendRow([name, phone, 0, 0, 'Invitado', new Date()]);
  return { success: true, message: 'Cliente registrado exitosamente ✓' };
}

// ==================== GENERAR CÓDIGO DE SELLO ====================
function generateStampCode(pin, service, amount) {
  validatePin(pin);
  if (!service) return { success: false, error: 'Servicio requerido' };

  var code = generateRandomCode(6);
  var expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  var sheet = getSheet('Códigos');
  sheet.appendRow([code, service, Number(amount) || 0, new Date(), expiresAt, 'ACTIVO']);

  return {
    success: true,
    code: code,
    service: service,
    amount: Number(amount) || 0,
    expiresAt: expiresAt.toISOString()
  };
}

// ==================== CANJEAR CÓDIGO DE SELLO ====================
function redeemStampCode(code, phone) {
  if (!code || !phone) return { success: false, error: 'Código y teléfono requeridos' };

  var codesSheet = getSheet('Códigos');
  var codesData = codesSheet.getDataRange().getValues();
  var codeRow = -1;
  var service = '';
  var amount = 0;

  for (var i = 1; i < codesData.length; i++) {
    if (String(codesData[i][0]).toUpperCase() === code.toUpperCase() && codesData[i][5] === 'ACTIVO') {
      var expiry = new Date(codesData[i][4]);
      if (new Date() > expiry) {
        codesSheet.getRange(i + 1, 6).setValue('EXPIRADO');
        return { success: false, error: 'Código expirado' };
      }
      codeRow = i + 1;
      service = codesData[i][1];
      amount = Number(codesData[i][2]) || 0;
      break;
    }
  }

  if (codeRow === -1) return { success: false, error: 'Código inválido o ya usado' };

  // Mark code as used
  codesSheet.getRange(codeRow, 6).setValue('USADO');

  // Update client stamps
  var clientsSheet = getSheet('Clientes');
  var clientsData = clientsSheet.getDataRange().getValues();

  for (var j = 1; j < clientsData.length; j++) {
    if (String(clientsData[j][1]).trim() === String(phone).trim()) {
      var stamps = Math.min((Number(clientsData[j][2]) || 0) + 1, 3);
      var totalVisits = (Number(clientsData[j][3]) || 0) + 1;
      var tier = 'Invitado';
      if (totalVisits >= 12) tier = 'Elite Platinum';
      else if (totalVisits >= 6) tier = 'Gold';
      else if (totalVisits >= 1) tier = 'Miembro';

      clientsSheet.getRange(j + 1, 3).setValue(stamps);
      clientsSheet.getRange(j + 1, 4).setValue(totalVisits);
      clientsSheet.getRange(j + 1, 5).setValue(tier);

      // Record in history
      var histSheet = getSheet('Historial');
      histSheet.appendRow([phone, stamps, service, amount, new Date()]);

      // Get updated history
      var histData = histSheet.getDataRange().getValues();
      var history = getClientHistory(histData, String(phone));

      return {
        success: true,
        message: '¡Sello ' + stamps + ' registrado! ✨',
        stamps: stamps,
        totalVisits: totalVisits,
        tier: tier,
        history: history,
        rewardReady: stamps >= 3
      };
    }
  }

  return { success: false, error: 'Cliente no encontrado' };
}

// ==================== CERTIFICADOS DE REGALO ====================
function createGift(pin, params) {
  validatePin(pin);

  var giftTo = params.giftTo;
  var giftFrom = params.giftFrom;
  var service = params.service;
  var amount = params.amount;

  if (!giftTo || !giftFrom || !service) {
    return { success: false, error: 'Datos incompletos' };
  }

  var folio = 'CDL-' + generateRandomCode(5);
  var sheet = getSheet('Certificados');
  sheet.appendRow([folio, giftTo, giftFrom, service, Number(amount) || 0, new Date(), 'ACTIVO']);

  return { success: true, folio: folio };
}

function validateGift(pin, folio) {
  validatePin(pin);
  if (!folio) return { success: false, error: 'Folio requerido' };

  var sheet = getSheet('Certificados');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === folio.toUpperCase()) {
      return {
        success: true,
        gift: {
          folio: data[i][0],
          giftTo: data[i][1],
          giftFrom: data[i][2],
          service: data[i][3],
          amount: Number(data[i][4]) || 0,
          date: data[i][5],
          status: data[i][6]
        }
      };
    }
  }

  return { success: false, error: 'Folio no encontrado' };
}

function redeemGift(pin, folio) {
  validatePin(pin);
  if (!folio) return { success: false, error: 'Folio requerido' };

  var sheet = getSheet('Certificados');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === folio.toUpperCase()) {
      if (data[i][6] !== 'ACTIVO') {
        return { success: false, error: 'Certificado ya canjeado o inactivo' };
      }
      sheet.getRange(i + 1, 7).setValue('CANJEADO');
      sheet.getRange(i + 1, 8).setValue(new Date()); // Fecha de canje
      return { success: true, message: 'Certificado canjeado exitosamente' };
    }
  }

  return { success: false, error: 'Folio no encontrado' };
}

function getGifts(pin) {
  validatePin(pin);

  var sheet = getSheet('Certificados');
  var data = sheet.getDataRange().getValues();
  var gifts = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      gifts.push({
        folio: data[i][0],
        giftTo: data[i][1],
        giftFrom: data[i][2],
        service: data[i][3],
        amount: Number(data[i][4]) || 0,
        date: data[i][5],
        status: data[i][6]
      });
    }
  }

  // Most recent first
  gifts.reverse();
  return { success: true, gifts: gifts };
}

// ==================== UTILIDADES ====================
function generateRandomCode(length) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin 0/O/I/1 para evitar confusión
  var code = '';
  for (var i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}