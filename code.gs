/**
 * @OnlyCurrentDoc
 * ============================================================================
 * GOOGLE APPS SCRIPT - GERENCIADOR DE CONVITES RSVP (ATUALIZAÇÃO COLUNAS D & E)
 * PLANILHA: "LISTA DE CONVIDADOS - ANIVERSÁRIO MÃE 88 ANOS"
 * ============================================================================
 * ESTRUTURA DAS COLUNAS (LINHA 6 EM DIANTE):
 * Col B (2) : ID / Nº
 * Col C (3) : Nome do Convidado
 * Col D (4) : Qtd. Dependentes -> ATUALIZADO PELO APP (Acompanhantes)
 * Col E (5) : Total na Família -> ATUALIZADO PELO APP (1 + Qtd. Dependentes)
 * Col F (6) : Confirmado? (Sim/Não)
 * Col G (7) : Pessoas Confirmad (NÃO MEXER - Manual do Anfitrião)
 * Col H (8) : Acumulado de Pessoas
 * Col I (9) : Convite Enviado? (✓)
 * Col J (10): Telefone / Contato
 * Col K (11): Observações
 * Col L (12): Comentário do Convidado
 * Col M (13): CÓDIGO ÚNICO DO CONVITE (ex: K8X92P)
 * ============================================================================
 */

var API_SECRET_TOKEN = "RSVP_SECRET_YAMAMOTO_2026";

/**
 * Função utilitária para gerar todos os códigos únicos na Coluna M em 1 clique
 */
function gerarCodigosColunaM() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var count = 0;
  
  if (data.length >= 5) {
    sheet.getRange(5, 13).setValue("Código Único Convite");
  }

  for (var i = 5; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length < 3) continue;
    
    var nameVal = String(row[2] || '').trim();
    var phoneVal = String(row[9] || '').trim();
    if (!nameVal && !phoneVal) continue;
    
    var idVal = String(row[1] || (i - 4));
    var currentCode = String(row[12] || '').trim();
    
    if (!currentCode || currentCode.length < 4) {
      var newCode = generateGuestCode(idVal, nameVal);
      sheet.getRange(i + 1, 13).setValue(newCode);
      count++;
    }
  }
  
  SpreadsheetApp.flush();
  Logger.log("Concluído: " + count + " códigos únicos gravados na Coluna M!");
}

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
        sheet.getRange(i + 1, 13).setValue(guestCode);
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
      
      var companionsCount = Number(row[3] || 0);  // Coluna D (Qtd. Dependentes)
      var familyTotal = Number(row[4] || 1);      // Coluna E (Total na Família)
      var guestComment = String(row[11] || row[10] || '').trim(); // Coluna L / K
      
      guests.push({
        id: idVal,
        code: guestCode,
        name: nameVal,
        phone: phoneVal,
        status: statusVal,
        sent: isSent,
        checkSymbol: colIVal || (isSent ? '✓' : ''),
        companionsCount: companionsCount,
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
    
    // 2. REQUISIÇÃO DE CONVIDADO PÚBLICO (?code=K8X92P) -> Busca ESTRITAMENTE pela Coluna M
    if (requestCode) {
      var singleGuest = null;
      var reqClean = requestCode.toLowerCase().trim();
      
      for (var k = 0; k < guests.length; k++) {
        if (guests[k].code.toLowerCase().trim() === reqClean) {
          singleGuest = guests[k];
          break;
        }
      }

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
          guests: [singleGuest]
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
    var companionsCount = Number(postData.companionsCount || 0);
    var companionNames = String(postData.companionNames || '').trim();
    var notes = String(postData.notes || '').trim();
    
    var rowIndex = -1;
    
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
      if (name) sheet.getRange(rowIndex, 3).setValue(name); // Coluna C
      if (phone) sheet.getRange(rowIndex, 10).setValue(phone); // Coluna J
      
      if (status) {
        var sLower = String(status).toLowerCase().trim();
        if (sLower === 'confirmado' || sLower === 'sim') {
          sheet.getRange(rowIndex, 6).setValue('Sim'); // Coluna F
          
          // ATUALIZA COLUNAS D e E CONFORME SOLICITADO
          var totalFamily = 1 + companionsCount;
          sheet.getRange(rowIndex, 4).setValue(companionsCount); // Coluna D (Qtd. Dependentes)
          sheet.getRange(rowIndex, 5).setValue(totalFamily);     // Coluna E (Total na Família)
          
        } else if (sLower === 'recusado' || sLower === 'não' || sLower === 'nao') {
          sheet.getRange(rowIndex, 6).setValue('Não'); // Coluna F
          
          sheet.getRange(rowIndex, 4).setValue(0); // Coluna D (0 Dependentes)
          sheet.getRange(rowIndex, 5).setValue(0); // Coluna E (0 Total na Família)
        }
      }
      
      var finalComment = notes;
      if (companionNames) {
        finalComment = (finalComment ? finalComment + ' | Acompanhantes: ' : 'Acompanhantes: ') + companionNames;
      }
      if (finalComment) {
        sheet.getRange(rowIndex, 12).setValue(finalComment); // Coluna L
      }
      
      if (sent === true) {
        sheet.getRange(rowIndex, 9).setValue('✓'); // Coluna I
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
