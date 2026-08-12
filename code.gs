/**
 * @OnlyCurrentDoc
 * ============================================================================
 * GOOGLE APPS SCRIPT - GERENCIADOR DE CONVITES RSVP (COM COLUNA M: CÓDIGO ÚNICO)
 * PLANILHA: "LISTA DE CONVIDADOS - ANIVERSÁRIO MÃE 88 ANOS"
 * ============================================================================
 * ESTRUTURA DAS COLUNAS (LINHA 6 EM DIANTE):
 * Col B (2) : ID / Nº
 * Col C (3) : Nome do Convidado
 * Col D (4) : Qtd. Dependentes
 * Col E (5) : Total na Família
 * Col F (6) : Confirmado? (Sim/Não)
 * Col G (7) : Pessoas Confirmad (NÃO MEXER - Manual do Anfitrião)
 * Col H (8) : Acumulado de Pessoas
 * Col I (9) : Convite Enviado? (✓)
 * Col J (10): Telefone / Contato
 * Col K (11): Observações
 * Col L (12): Comentário do Convidado
 * Col M (13): CÓDIGO ÚNICO DO CONVITE (ex: K8X92P) -> GRAVADO DEFINITIVAMENTE
 * ============================================================================
 */

var API_SECRET_TOKEN = "RSVP_SECRET_YAMAMOTO_2026";

function doGet(e) {
  try {
    var params = e ? e.parameter : {};
    var requestToken = String(params.token || '').trim();
    var requestCode = String(params.code || params.id || '').trim();
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    if (!data || data.length < 6) {
      return responseJSON({ success: true, guests: [], message: 'Sem dados a partir da linha 6.' });
    }

    var guests = [];
    var needsUpdateSheet = false;
    
    // Leitura a partir da Linha 6 (índice 5 no array JS)
    for (var i = 5; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length < 3) continue;
      
      var nameVal = String(row[2] || '').trim();  // Coluna C (Nome)
      var phoneVal = String(row[9] || '').trim(); // Coluna J (Telefone)
      
      if (!nameVal && !phoneVal) continue;
      
      var idVal = String(row[1] || (i - 4));     // Coluna B (Nº)
      
      // Coluna M (13): Código Único de Convite Fixo
      var guestCode = String(row[12] || '').trim();
      if (!guestCode || guestCode.length < 4) {
        guestCode = generateGuestCode(idVal, nameVal);
        sheet.getRange(i + 1, 13).setValue(guestCode); // Grava na Coluna M
        needsUpdateSheet = true;
      }
      
      var rawStatus = String(row[5] || '').trim().toLowerCase(); // Coluna F (Sim/Não)
      var statusVal = 'Pendente';
      if (rawStatus === 'sim' || rawStatus === 'confirmado') {
        statusVal = 'Confirmado';
      } else if (rawStatus === 'não' || rawStatus === 'nao' || rawStatus === 'recusado') {
        statusVal = 'Recusado';
      }
      
      var colIVal = String(row[8] || '').trim(); // Coluna I (✓)
      var isSent = colIVal === '✓' || colIVal.toLowerCase() === 'sim' || colIVal.toLowerCase() === 'true';
      
      var familyTotal = Number(row[4] || 1);    // Coluna E
      var guestComment = String(row[11] || row[10] || '').trim(); // Coluna L / K
      
      guests.push({
        id: idVal,
        code: guestCode,
        name: nameVal,
        phone: phoneVal,
        status: statusVal,
        sent: isSent,
        checkSymbol: colIVal || (isSent ? '✓' : ''),
        companionsCount: 0,
        familyTotal: familyTotal,
        notes: guestComment,
        updatedAt: ''
      });
    }

    if (needsUpdateSheet) {
      SpreadsheetApp.flush();
    }
    
    // 1. REQUISIÇÃO DO ANFITRIÃO COM TOKEN -> Retorna todos os convidados
    if (requestToken === API_SECRET_TOKEN) {
      return responseJSON({ 
        success: true, 
        guests: guests, 
        totalFound: guests.length 
      });
    }
    
    // 2. REQUISIÇÃO DE CONVIDADO PÚBLICO (?code=K8X92P) -> Busca ESTRITAMENTE pela Coluna M (guestCode)
    if (requestCode) {
      var singleGuest = null;
      var reqClean = requestCode.toLowerCase().trim();
      
      for (var k = 0; k < guests.length; k++) {
        if (guests[k].code.toLowerCase().trim() === reqClean) {
          singleGuest = guests[k];
          break;
        }
      }

      // Fallback secundário por nome exato apenas se code não bater
      if (!singleGuest) {
        for (var m = 0; m < guests.length; m++) {
          if (guests[m].name.toLowerCase().trim() === reqClean) {
            singleGuest = guests[m];
            break;
          }
        }
      }
      
      if (singleGuest) {
        return responseJSON({
          success: true,
          guests: [singleGuest] // Retorna estritamente 1 único convidado
        });
      } else {
        return responseJSON({ success: false, error: 'Convite não encontrado.' });
      }
    }
    
    // 3. SEM TOKEN E SEM CÓDIGO -> Rejeita o acesso
    return responseJSON({ 
      success: false, 
      error: 'Acesso Negado: Token de Segurança Inválido.' 
    }, 403);

  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    var guestId = String(postData.id || '');
    var guestCode = String(postData.code || '');
    var name = String(postData.name || '');
    var phone = String(postData.phone || '');
    var status = String(postData.status || '');
    var sent = postData.sent;
    var companionNames = String(postData.companionNames || '').trim();
    var notes = String(postData.notes || '').trim();
    
    var rowIndex = -1;
    
    // Busca a linha a partir da Linha 6 (índice 5)
    for (var i = 5; i < data.length; i++) {
      var rowId = String(data[i][1]);                        // Coluna B
      var rowName = String(data[i][2]).toLowerCase().trim(); // Coluna C
      var rowCode = String(data[i][12] || '').trim();        // Coluna M
      
      if ((guestCode && rowCode && rowCode.toLowerCase() === guestCode.toLowerCase()) ||
          (guestId && rowId === guestId) || 
          (name && rowName === name.toLowerCase().trim())) {
        rowIndex = i + 1; // 1-indexed no Sheets
        break;
      }
    }
    
    if (rowIndex !== -1) {
      if (name) sheet.getRange(rowIndex, 3).setValue(name);
      if (phone) sheet.getRange(rowIndex, 10).setValue(phone);
      
      if (status) {
        var sLower = String(status).toLowerCase().trim();
        if (sLower === 'confirmado' || sLower === 'sim') {
          sheet.getRange(rowIndex, 6).setValue('Sim');
        } else if (sLower === 'recusado' || sLower === 'não' || sLower === 'nao') {
          sheet.getRange(rowIndex, 6).setValue('Não');
        }
      }
      
      var finalComment = notes;
      if (companionNames) {
        finalComment = (finalComment ? finalComment + ' | Acompanhantes: ' : 'Acompanhantes: ') + companionNames;
      }
      if (finalComment) {
        sheet.getRange(rowIndex, 12).setValue(finalComment);
      }
      
      if (sent === true) {
        sheet.getRange(rowIndex, 9).setValue('✓');
      } else if (sent === false) {
        sheet.getRange(rowIndex, 9).setValue('');
      }
      
      return responseJSON({ success: true, message: 'Planilha atualizada com sucesso!' });
    } else {
      return responseJSON({ success: false, error: 'Convidado não encontrado na planilha.' });
    }
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

/**
 * Gerador de Código Único Alfanumérico (ex: K8X92P)
 */
function generateGuestCode(idStr, nameStr) {
  var str = String(idStr) + "_" + String(nameStr).toLowerCase().trim();
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var code = "";
  var positiveHash = Math.abs(hash);
  for (var j = 0; j < 6; j++) {
    code += chars.charAt(positiveHash % chars.length);
    positiveHash = Math.floor(positiveHash / chars.length) + (j * 7);
  }
  return code;
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
