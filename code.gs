/**
 * @OnlyCurrentDoc
 * ============================================================================
 * GOOGLE APPS SCRIPT - GERENCIADOR DE CONVITES RSVP
 * PLANILHA: "LISTA DE CONVIDADOS - ANIVERSÁRIO MÃE 88 ANOS"
 * ============================================================================
 * REGRAS DE ESCRITA NA PLANILHA:
 * 1. Resposta do Convidado -> Atualiza Coluna F (6) para "Sim" ou "Não".
 * 2. Comentários / Acompanhantes do Convidado -> Atualiza a Coluna L (12).
 * 3. Envio de Convite WhatsApp -> Atualiza a Coluna I (9) com o símbolo "✓".
 * 4. A Coluna G NÃO é alterada pelo script.
 * ============================================================================
 */

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    if (!data || data.length < 6) {
      return responseJSON({ success: true, guests: [], message: 'Sem dados a partir da linha 6.' });
    }

    var guests = [];
    
    // Leitura a partir da Linha 6 (índice 5 no array JS)
    for (var i = 5; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length < 3) continue;
      
      var nameVal = String(row[2] || '').trim();  // Coluna C (Nome)
      var phoneVal = String(row[9] || '').trim(); // Coluna J (Telefone)
      
      if (!nameVal && !phoneVal) continue;
      
      var idVal = String(row[1] || (i - 4));     // Coluna B (Nº)
      var rawStatus = String(row[5] || '').trim().toLowerCase(); // Coluna F (Confirmado? Sim/Não)
      
      var statusVal = 'Pendente';
      if (rawStatus === 'sim' || rawStatus === 'confirmado') {
        statusVal = 'Confirmado';
      } else if (rawStatus === 'não' || rawStatus === 'nao' || rawStatus === 'recusado') {
        statusVal = 'Recusado';
      }
      
      var colIVal = String(row[8] || '').trim(); // Coluna I (Convite Enviado?)
      var isSent = colIVal === '✓' || colIVal.toLowerCase() === 'sim' || colIVal.toLowerCase() === 'true';
      
      var familyTotal = Number(row[4] || 1);    // Coluna E (Total na Família)
      var guestComment = String(row[11] || row[10] || '').trim(); // Coluna L (Comentário) ou K (Obs)
      
      guests.push({
        id: idVal,
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
    
    return responseJSON({ 
      success: true, 
      guests: guests, 
      totalFound: guests.length 
    });
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
    var name = String(postData.name || '');
    var phone = String(postData.phone || '');
    var status = String(postData.status || '');
    var sent = postData.sent;
    var companionNames = String(postData.companionNames || '').trim();
    var notes = String(postData.notes || '').trim();
    
    var rowIndex = -1;
    
    // Localiza a linha do convidado a partir da Linha 6 (índice 5)
    for (var i = 5; i < data.length; i++) {
      var rowId = String(data[i][1]);                        // Coluna B
      var rowName = String(data[i][2]).toLowerCase().trim(); // Coluna C
      var rowPhone = String(data[i][9]).replace(/\D/g, ''); // Coluna J
      var cleanPhone = phone.replace(/\D/g, '');
      
      if ((guestId && rowId === guestId) || 
          (name && rowName === name.toLowerCase().trim()) || 
          (cleanPhone && rowPhone && rowPhone === cleanPhone)) {
        rowIndex = i + 1; // 1-indexed no Sheets
        break;
      }
    }
    
    if (rowIndex !== -1) {
      // 1. Nome na Coluna C (3)
      if (name) sheet.getRange(rowIndex, 3).setValue(name);
      
      // 2. Telefone na Coluna J (10)
      if (phone) sheet.getRange(rowIndex, 10).setValue(phone);
      
      // 3. ATUALIZA APENAS A COLUNA F (Confirmado? Sim/Não) - A Coluna G NÃO é alterada
      if (status) {
        var sLower = String(status).toLowerCase().trim();
        if (sLower === 'confirmado' || sLower === 'sim') {
          sheet.getRange(rowIndex, 6).setValue('Sim'); // Coluna F
        } else if (sLower === 'recusado' || sLower === 'não' || sLower === 'nao') {
          sheet.getRange(rowIndex, 6).setValue('Não'); // Coluna F
        }
      }
      
      // 4. ATUALIZA A COLUNA L (12) COM OS COMENTÁRIOS / ACOMPANHANTES DO CONVIDADO
      var finalComment = notes;
      if (companionNames) {
        finalComment = (finalComment ? finalComment + ' | Acompanhantes: ' : 'Acompanhantes: ') + companionNames;
      }
      if (finalComment) {
        sheet.getRange(rowIndex, 12).setValue(finalComment); // Coluna L (12)
      }
      
      // 5. Convite Enviado (✓) na Coluna I (9)
      if (sent === true) {
        sheet.getRange(rowIndex, 9).setValue('✓');
      } else if (sent === false) {
        sheet.getRange(rowIndex, 9).setValue('');
      }
      
      return responseJSON({ success: true, message: 'Coluna F e Coluna L atualizadas com sucesso!' });
    } else {
      return responseJSON({ success: false, error: 'Convidado não encontrado na planilha.' });
    }
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
