// ═══════════════════════════════════════════════════════════
// CLARO DE LUNA SPA — GOOGLE APPS SCRIPT BACKEND (EXPANDIDO)
// Treze Labs | v2.0 — Admin + Check-In + Personal + Comisiones
//
// HOJAS REQUERIDAS EN GOOGLE SHEETS:
// 1. Config       → Estado del spa, horarios, banners
// 2. Lealtad      → Club de lealtad (existente)
// 3. Personal     → Registro de empleados
// 4. Asistencia   → Control entrada/salida
// 5. Comisiones   → Servicios realizados por terapeuta
// 6. Registros    → Check-in de huespedes
//
// NOTA ESCALABILIDAD: La hoja "Servicios" esta preparada para
// cuando se migre el catalogo a dinamico. Por ahora los servicios
// estan hardcoded en el HTML de la VCard.
// ═══════════════════════════════════════════════════════════

const SS = SpreadsheetApp.getActiveSpreadsheet();

// ── Helpers ──
function getOrCreateSheet(name, headers) {
  let sheet = SS.getSheetByName(name);
  if (!sheet) {
    sheet = SS.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#D4A373')
        .setFontColor('#1A1814');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function sheetToArray(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════
// GET HANDLER
// ═══════════════════════════════════════
function doGet(e) {
  const action = (e.parameter.action || '').toLowerCase();
  
  // ── Admin Panel: get all data ──
  if (action === 'getadmin') {
    const configSheet = getOrCreateSheet('Config', ['key', 'value']);
    const personalSheet = getOrCreateSheet('Personal', ['id', 'name', 'role', 'phone', 'status']);
    const asistSheet = getOrCreateSheet('Asistencia', ['person', 'type', 'date', 'time', 'notes']);
    const commSheet = getOrCreateSheet('Comisiones', ['person', 'service', 'date', 'price', 'commission']);
    const regSheet = getOrCreateSheet('Registros', ['nombre', 'email', 'telefono', 'nacimiento', 'primeraVisita', 'condicionMedica', 'alergias', 'lesiones', 'areasAtencion', 'presion', 'objetivo', 'servicio', 'comentarios', 'fecha', 'hora']);

    // Config as key-value
    const configRows = configSheet.getDataRange().getValues();
    const config = {};
    configRows.slice(1).forEach(r => config[r[0]] = r[1]);

    return jsonResponse({
      config,
      personal: sheetToArray(personalSheet),
      asistencia: sheetToArray(asistSheet),
      comisiones: sheetToArray(commSheet),
      checkins: sheetToArray(regSheet)
    });
  }

  // ── Loyalty lookup (existing) ──
  if (action === 'lookup') {
    const phone = (e.parameter.phone || '').trim();
    const sheet = getOrCreateSheet('Lealtad', ['phone','name','tier','stamps','history']);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === phone) {
        return jsonResponse({
          found: true,
          phone: data[i][0], name: data[i][1],
          tier: data[i][2], stamps: data[i][3],
          history: data[i][4] ? JSON.parse(data[i][4]) : []
        });
      }
    }
    return jsonResponse({ found: false });
  }

  // ── Public config (for VCard to read status) ──
  if (action === 'getstatus') {
    const configSheet = getOrCreateSheet('Config', ['key', 'value']);
    const configRows = configSheet.getDataRange().getValues();
    const config = {};
    configRows.slice(1).forEach(r => config[r[0]] = r[1]);
    return jsonResponse({ status: config.spaStatus || 'ACTIVA', horario: config.horario || '', banner: config.banner || '' });
  }

  return jsonResponse({ error: 'Unknown action' });
}

// ═══════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch(err) {
    return jsonResponse({ error: 'Invalid JSON' });
  }

  const action = (body.action || '').toLowerCase();

  // ── Save Config ──
  if (action === 'saveconfig') {
    const sheet = getOrCreateSheet('Config', ['key', 'value']);
    sheet.clear();
    sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#D4A373').setFontColor('#1A1814');
    const d = body.data || {};
    const entries = Object.entries(d);
    if (entries.length > 0) {
      sheet.getRange(2, 1, entries.length, 2).setValues(entries);
    }
    return jsonResponse({ ok: true });
  }

  // ── Save Staff ──
  if (action === 'savestaff') {
    const sheet = getOrCreateSheet('Personal', ['id', 'name', 'role', 'phone', 'status']);
    sheet.clear();
    sheet.getRange(1, 1, 1, 5).setValues([['id', 'name', 'role', 'phone', 'status']]);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#D4A373').setFontColor('#1A1814');
    const personal = body.personal || [];
    if (personal.length > 0) {
      const rows = personal.map(p => [p.id, p.name, p.role, p.phone, p.status]);
      sheet.getRange(2, 1, rows.length, 5).setValues(rows);
    }
    return jsonResponse({ ok: true });
  }

  // ── Log Attendance ──
  if (action === 'logattendance') {
    const sheet = getOrCreateSheet('Asistencia', ['person', 'type', 'date', 'time', 'notes']);
    const r = body.record || {};
    sheet.appendRow([r.person, r.type, r.date, r.time, r.notes || '']);
    return jsonResponse({ ok: true });
  }

  // ── Log Commission ──
  if (action === 'logcommission') {
    const sheet = getOrCreateSheet('Comisiones', ['person', 'service', 'date', 'price', 'commission']);
    const r = body.record || {};
    sheet.appendRow([r.person, r.service, r.date, r.price, r.commission]);
    return jsonResponse({ ok: true });
  }

  // ── Save Check-In ──
  if (action === 'savecheckin') {
    const headers = ['nombre', 'email', 'telefono', 'nacimiento', 'primeraVisita', 'condicionMedica', 'alergias', 'lesiones', 'areasAtencion', 'presion', 'objetivo', 'servicio', 'comentarios', 'fecha', 'hora'];
    const sheet = getOrCreateSheet('Registros', headers);
    const d = body.data || {};
    sheet.appendRow(headers.map(h => d[h] || ''));
    return jsonResponse({ ok: true });
  }

  // ── Stamp Loyalty (existing) ──
  if (action === 'stamp') {
    const sheet = getOrCreateSheet('Lealtad', ['phone','name','tier','stamps','history']);
    const phone = (body.phone || '').trim();
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === phone) {
        let stamps = parseInt(data[i][3]) || 0;
        let history = data[i][4] ? JSON.parse(data[i][4]) : [];
        stamps++;
        history.push({ date: new Date().toISOString().split('T')[0], service: body.service || 'Servicio', amount: body.amount || 0 });
        sheet.getRange(i + 1, 4).setValue(stamps);
        sheet.getRange(i + 1, 5).setValue(JSON.stringify(history));
        return jsonResponse({ ok: true, stamps, history });
      }
    }
    return jsonResponse({ error: 'Phone not found' });
  }

  return jsonResponse({ error: 'Unknown action' });
}
