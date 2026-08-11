/* ==========================================================================
   ADMIN DASHBOARD MODULE (CONFIGURAÇÕES 100% DINÂMICAS & WHATSAPP TEMPLATES)
   ========================================================================== */

class AdminController {
  constructor() {
    this.guests = [];
    this.activeFilter = 'ALL';
    this.searchQuery = '';
    this.pendingConfirmGuest = null;
  }

  async init() {
    await this.refreshDataFromSheets();
    this.loadSettingsFormValues();
    this.bindEvents();
  }

  async refreshDataFromSheets() {
    this.guests = await window.storageEngine.fetchGuests();
    this.renderMetrics();
    this.renderTable();
    this.renderDispatchQueue();
  }

  getGuestBaseUrl() {
    const settings = window.storageEngine.getSettings();
    if (settings.publicSiteUrl && settings.publicSiteUrl.trim().startsWith('http')) {
      let cleanUrl = settings.publicSiteUrl.trim();
      cleanUrl = cleanUrl.replace('admin.html', 'index.html');
      if (!cleanUrl.endsWith('.html') && !cleanUrl.endsWith('/')) {
        cleanUrl += '/';
      }
      return cleanUrl;
    }
    
    if (window.location.protocol.startsWith('http')) {
      return window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
    }

    return 'https://seu-site-rsvp.vercel.app/index.html';
  }

  renderMetrics() {
    const totalGuests = this.guests.length;
    const confirmedCount = this.guests.filter(g => g.status === 'Confirmado').length;
    const declinedCount = this.guests.filter(g => g.status === 'Recusado').length;
    const pendingCount = this.guests.filter(g => !g.status || g.status === 'Pendente').length;
    
    const totalAttendees = this.guests
      .filter(g => g.status === 'Confirmado')
      .reduce((acc, g) => acc + 1 + (g.companionsCount || 0), 0);

    const elTotal = document.getElementById('stat-total-guests');
    const elConfirmed = document.getElementById('stat-confirmed-guests');
    const elDeclined = document.getElementById('stat-declined-guests');
    const elPending = document.getElementById('stat-pending-guests');
    const elAttendees = document.getElementById('stat-total-attendees');

    if (elTotal) elTotal.textContent = totalGuests;
    if (elConfirmed) elConfirmed.textContent = confirmedCount;
    if (elDeclined) elDeclined.textContent = declinedCount;
    if (elPending) elPending.textContent = pendingCount;
    if (elAttendees) elAttendees.textContent = totalAttendees;
  }

  getFilteredGuests() {
    return this.guests.filter(g => {
      const matchFilter = 
        this.activeFilter === 'ALL' ? true :
        this.activeFilter === 'CONFIRMED' ? g.status === 'Confirmado' :
        this.activeFilter === 'DECLINED' ? g.status === 'Recusado' :
        this.activeFilter === 'PENDING' ? (!g.status || g.status === 'Pendente') : true;

      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q ? true : (
        g.name.toLowerCase().includes(q) || 
        (g.phone && g.phone.includes(q)) || 
        (g.companionNames && g.companionNames.toLowerCase().includes(q))
      );

      return matchFilter && matchSearch;
    });
  }

  renderTable() {
    const tableBody = document.getElementById('admin-table-body');
    if (!tableBody) return;

    const filtered = this.getFilteredGuests();

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-dim); padding: 2rem;">
            Nenhum convidado encontrado nesta visualização.
          </td>
        </tr>
      `;
      return;
    }

    const baseUrl = this.getGuestBaseUrl();

    tableBody.innerHTML = filtered.map(g => {
      const guestLink = baseUrl.includes('?') ? `${baseUrl}&id=${g.id}` : `${baseUrl}?id=${g.id}`;
      const statusBadge = 
        g.status === 'Confirmado' ? '<span class="badge badge-green">Confirmado</span>' :
        g.status === 'Recusado' ? '<span class="badge badge-red">Recusado</span>' :
        '<span class="badge badge-gold">Pendente</span>';

      const sentBadge = g.sent || g.checkSymbol === '✓' ? 
        '<span class="badge badge-green" style="font-size: 0.9rem; font-weight:800;" title="Convite Enviado com Sucesso">✓ (Enviado)</span>' : 
        '<span class="badge badge-gold" style="font-size: 0.75rem;">Pendente</span>';

      return `
        <tr>
          <td><strong>${g.name}</strong></td>
          <td>${g.phone ? `<span style="font-family:monospace;">${g.phone}</span>` : '<span style="color:var(--accent-red); font-size:0.8rem;">⚠️ Sem celular</span>'}</td>
          <td>${statusBadge}</td>
          <td>${sentBadge}</td>
          <td>${g.status === 'Confirmado' ? (1 + (g.companionsCount || 0)) : '-'}</td>
          <td>${g.companionNames || '-'}</td>
          <td><span style="font-size:0.85rem; color:var(--text-muted);">${g.notes || '-'}</span></td>
          <td>
            <div class="table-action-btns">
              <button class="btn btn-sm btn-whatsapp" title="Enviar Convite no WhatsApp" onclick="window.adminController.startWhatsAppInviteFlow('${g.id}')">📱 Enviar</button>
              <button class="btn btn-sm btn-secondary" title="Editar Convidado" onclick="window.adminController.openEditGuestModal('${g.id}')">✏️</button>
              <button class="btn btn-sm btn-secondary" title="Copiar Link Individual" onclick="window.adminController.copyLink('${guestLink}')">🔗</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderDispatchQueue() {
    const pendingUnsent = this.guests.filter(g => !g.sent && g.checkSymbol !== '✓');
    const container = document.getElementById('dispatch-queue-container');
    if (!container) return;

    if (pendingUnsent.length === 0) {
      container.innerHTML = `
        <div class="dispatch-banner" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3);">
          <div class="dispatch-info">
            <h3 style="color: var(--accent-green);">🎉 Todos os convites foram disparados e confirmados (✓)!</h3>
            <p>Sua lista de convidados na planilha do Google Sheets está 100% atualizada com o checkmark na Coluna I.</p>
          </div>
        </div>
      `;
      return;
    }

    const currentGuest = pendingUnsent[0];
    const settings = window.storageEngine.getSettings();
    const baseUrl = this.getGuestBaseUrl();
    const guestLink = baseUrl.includes('?') ? `${baseUrl}&id=${currentGuest.id}` : `${baseUrl}?id=${currentGuest.id}`;

    let msg = settings.messageTemplate || DEFAULT_SETTINGS.messageTemplate;
    msg = msg
      .replace(/{nome}/g, currentGuest.name)
      .replace(/{link}/g, guestLink)
      .replace(/{tipo_evento}/g, settings.eventType || 'evento')
      .replace(/{titulo_evento}/g, settings.eventTitle || 'Aniversário')
      .replace(/{data}/g, settings.eventDate || '');

    const hasValidPhone = currentGuest.phone && currentGuest.phone.replace(/\D/g, '').length >= 8;

    container.innerHTML = `
      <div class="dispatch-banner">
        <div class="dispatch-info">
          <h3>📱 Fila de Envio do WhatsApp (${pendingUnsent.length} pendentes)</h3>
          <p>Próximo convidado: <strong style="color:var(--text-main); font-size:1.1rem;">${currentGuest.name}</strong> (${currentGuest.phone ? `<span style="font-family:monospace; color:var(--accent-gold);">${currentGuest.phone}</span>` : '<span style="color:var(--accent-red);">⚠️ Celular Não Informado</span>'})</p>
          <div class="dispatch-preview-box" style="margin-top:0.75rem;">${msg}</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.5rem; min-width:200px;">
          ${hasValidPhone ? `
            <button class="btn btn-whatsapp btn-block" style="padding: 1rem 1.25rem;" onclick="window.adminController.startWhatsAppInviteFlow('${currentGuest.id}')">
              🚀 Disparar Convite WhatsApp
            </button>
          ` : `
            <button class="btn btn-secondary btn-block" style="border-color:var(--accent-red); color:var(--accent-red);" onclick="window.adminController.openEditGuestModal('${currentGuest.id}')">
              ⚠️ Cadastrar Celular Primeiro
            </button>
          `}
        </div>
      </div>
    `;
  }

  startWhatsAppInviteFlow(guestId) {
    const guest = this.guests.find(g => String(g.id) === String(guestId));
    if (!guest) return;

    const cleanPhone = (guest.phone || '').replace(/\D/g, '');

    if (!guest.name || !guest.name.trim()) {
      window.app.showToast('O nome do convidado precisa ser preenchido antes de enviar.', 'error');
      this.openEditGuestModal(guest.id);
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      window.app.showToast(`Informe o número de celular/WhatsApp de ${guest.name} para prosseguir.`, 'error');
      this.openEditGuestModal(guest.id);
      return;
    }

    const settings = window.storageEngine.getSettings();
    if (!settings.publicSiteUrl && window.location.protocol.startsWith('file')) {
      window.app.showToast('Preencha a "URL Pública do Site" nas Configurações do Evento para que os convidados possam abrir o link!', 'error');
    }

    const baseUrl = this.getGuestBaseUrl();
    const guestLink = baseUrl.includes('?') ? `${baseUrl}&id=${guest.id}` : `${baseUrl}?id=${guest.id}`;

    let msg = settings.messageTemplate || DEFAULT_SETTINGS.messageTemplate;
    msg = msg
      .replace(/{nome}/g, guest.name)
      .replace(/{link}/g, guestLink)
      .replace(/{tipo_evento}/g, settings.eventType || 'evento')
      .replace(/{titulo_evento}/g, settings.eventTitle || 'Aniversário')
      .replace(/{data}/g, settings.eventDate || '');

    const encodedMsg = encodeURIComponent(msg);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    
    window.open(waUrl, '_blank');

    this.pendingConfirmGuest = guest;
    this.openWhatsAppConfirmModal(guest);
  }

  openWhatsAppConfirmModal(guest) {
    const modalNameEl = document.getElementById('confirm-wa-guest-name');
    const modalPhoneEl = document.getElementById('confirm-wa-guest-phone');
    const confirmBtn = document.getElementById('btn-confirm-wa-sent');
    
    if (modalNameEl) modalNameEl.textContent = guest.name;
    if (modalPhoneEl) modalPhoneEl.textContent = guest.phone;
    if (confirmBtn) confirmBtn.setAttribute('data-guest-id', guest.id);

    const modal = document.getElementById('wa-confirm-modal-overlay');
    if (modal) modal.classList.add('active');
  }

  async confirmWhatsAppSentSuccess(guestIdParam) {
    const confirmBtn = document.getElementById('btn-confirm-wa-sent');
    const targetId = guestIdParam || (this.pendingConfirmGuest ? this.pendingConfirmGuest.id : confirmBtn?.getAttribute('data-guest-id'));
    const guest = this.guests.find(g => String(g.id) === String(targetId));

    if (!guest) {
      const modal = document.getElementById('wa-confirm-modal-overlay');
      if (modal) modal.classList.remove('active');
      return;
    }

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '⏳ Gravando ✓ na Planilha...';
    }

    try {
      guest.sent = true;
      guest.checkSymbol = '✓';

      await window.storageEngine.updateGuestRsvp({
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
        status: guest.status || 'Pendente',
        sent: true,
        companionsCount: guest.companionsCount || 0,
        companionNames: guest.companionNames || '',
        notes: guest.notes || ''
      });

      await this.refreshDataFromSheets();

      window.app.showToast(`Convite de ${guest.name} marcado como enviado (✓ gravado na Coluna I)!`, 'success');
    } catch (err) {
      console.error(err);
      window.app.showToast('Erro ao atualizar a planilha. Tente novamente.', 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '✅ Sim, Confirmar Envio (Gravar ✓ na Coluna I)';
      }
      const modal = document.getElementById('wa-confirm-modal-overlay');
      if (modal) modal.classList.remove('active');
      this.pendingConfirmGuest = null;
    }
  }

  cancelWhatsAppSent() {
    const modal = document.getElementById('wa-confirm-modal-overlay');
    if (modal) modal.classList.remove('active');
    this.pendingConfirmGuest = null;
    window.app.showToast('O envio do convite não foi marcado como concluído.', 'error');
  }

  copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
      window.app.showToast('Link individual copiado!', 'success');
    });
  }

  bindEvents() {
    const searchInp = document.getElementById('admin-search-input');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderTable();
      });
    }

    const pills = document.querySelectorAll('.pill-btn');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        pills.forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        this.activeFilter = e.target.getAttribute('data-filter') || 'ALL';
        this.renderTable();
      });
    });

    const guestForm = document.getElementById('guest-edit-form');
    if (guestForm) {
      guestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveGuestFromModal();
      });
    }

    const settingsForm = document.getElementById('settings-edit-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveSettingsFromModal();
      });
    }

    const btnTestConn = document.getElementById('btn-test-sheet-connection');
    if (btnTestConn) {
      btnTestConn.addEventListener('click', async () => {
        await this.testSheetsConnection();
      });
    }
  }

  async testSheetsConnection() {
    const urlInput = document.getElementById('set-webhook-url');
    let url = urlInput ? urlInput.value.trim() : '';

    if (!url) {
      const settings = window.storageEngine.getSettings();
      url = settings.webhookUrl || '';
    }

    if (!url) {
      window.app.showToast('Cole a URL do Google Apps Script para testar a conexão.', 'error');
      return;
    }

    if (!url.startsWith('https://script.google.com/macros/s/')) {
      window.app.showToast('A URL deve começar com https://script.google.com/macros/s/...', 'error');
      return;
    }

    if (url.endsWith('/dev')) {
      window.app.showToast('Aviso: A URL termina com /dev. Utilize a URL de produção que termina com /exec!', 'error');
      return;
    }

    window.app.showToast('Conectando à planilha do Google...', 'success');

    try {
      const resp = await fetch(url, { method: 'GET', redirect: 'follow' });
      const text = await resp.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        if (text.includes('google.com') || text.includes('ServiceLogin') || text.includes('doctype html')) {
          window.app.showToast('O Google exigiu login. Altere "Quem pode acessar" para "Qualquer pessoa" (sem restrição de conta).', 'error');
          return;
        }
        throw jsonErr;
      }

      if (data && data.success) {
        const count = Array.isArray(data.guests) ? data.guests.length : 0;
        window.app.showToast(`Conexão bem-sucedida! ${count} convidados carregados da planilha.`, 'success');
        
        window.storageEngine.saveSettings({ ...window.storageEngine.getSettings(), webhookUrl: url });
        await this.refreshDataFromSheets();
      } else {
        window.app.showToast(`Conectou, mas a planilha retornou: ${data.error || 'Verifique se adicionou linhas.'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      window.app.showToast('Falha na conexão. Certifique-se de que "Quem pode acessar" está como "Qualquer pessoa".', 'error');
    }
  }

  openAddGuestModal() {
    document.getElementById('modal-guest-title').textContent = 'Novo Convidado';
    document.getElementById('edit-guest-id').value = '';
    document.getElementById('edit-guest-name').value = '';
    document.getElementById('edit-guest-phone').value = '';
    document.getElementById('edit-guest-status').value = 'Pendente';
    
    const modal = document.getElementById('guest-modal-overlay');
    if (modal) modal.classList.add('active');
  }

  openEditGuestModal(guestId) {
    const guest = this.guests.find(g => String(g.id) === String(guestId));
    if (!guest) return;

    document.getElementById('modal-guest-title').textContent = 'Editar Convidado';
    document.getElementById('edit-guest-id').value = guest.id;
    document.getElementById('edit-guest-name').value = guest.name;
    document.getElementById('edit-guest-phone').value = guest.phone || '';
    document.getElementById('edit-guest-status').value = guest.status || 'Pendente';

    const modal = document.getElementById('guest-modal-overlay');
    if (modal) modal.classList.add('active');
  }

  async saveGuestFromModal() {
    const id = document.getElementById('edit-guest-id').value;
    const name = document.getElementById('edit-guest-name').value.trim();
    const phone = document.getElementById('edit-guest-phone').value.trim();
    const status = document.getElementById('edit-guest-status').value;

    if (!name) {
      window.app.showToast('Informe o nome do convidado.', 'error');
      return;
    }

    await window.storageEngine.updateGuestRsvp({
      id: id || String(Date.now()),
      name,
      phone,
      status
    });

    await this.refreshDataFromSheets();

    const modal = document.getElementById('guest-modal-overlay');
    if (modal) modal.classList.remove('active');

    window.app.showToast('Convidado salvo com sucesso!', 'success');
  }

  loadSettingsFormValues() {
    const s = window.storageEngine.getSettings();
    if (document.getElementById('set-event-type')) document.getElementById('set-event-type').value = s.eventType || '';
    if (document.getElementById('set-event-title')) document.getElementById('set-event-title').value = s.eventTitle || '';
    if (document.getElementById('set-event-subtitle')) document.getElementById('set-event-subtitle').value = s.eventSubtitle || '';
    if (document.getElementById('set-event-date')) document.getElementById('set-event-date').value = s.eventDate || '';
    if (document.getElementById('set-event-time')) document.getElementById('set-event-time').value = s.eventTime || '';
    if (document.getElementById('set-location-name')) document.getElementById('set-location-name').value = s.locationName || '';
    if (document.getElementById('set-location-address')) document.getElementById('set-location-address').value = s.locationAddress || '';
    if (document.getElementById('set-maps-url')) document.getElementById('set-maps-url').value = s.mapsUrl || '';
    if (document.getElementById('set-special-notice')) document.getElementById('set-special-notice').value = s.specialNotice || '';
    if (document.getElementById('set-webhook-url')) document.getElementById('set-webhook-url').value = s.webhookUrl || '';
    if (document.getElementById('set-public-site-url')) document.getElementById('set-public-site-url').value = s.publicSiteUrl || '';
    if (document.getElementById('set-message-template')) document.getElementById('set-message-template').value = s.messageTemplate || '';
  }

  async saveSettingsFromModal() {
    const newSettings = {
      eventType: document.getElementById('set-event-type').value.trim(),
      eventTitle: document.getElementById('set-event-title').value.trim(),
      eventSubtitle: document.getElementById('set-event-subtitle').value.trim(),
      eventDate: document.getElementById('set-event-date').value.trim(),
      eventTime: document.getElementById('set-event-time').value.trim(),
      locationName: document.getElementById('set-location-name').value.trim(),
      locationAddress: document.getElementById('set-location-address').value.trim(),
      mapsUrl: document.getElementById('set-maps-url').value.trim(),
      specialNotice: document.getElementById('set-special-notice').value.trim(),
      webhookUrl: document.getElementById('set-webhook-url').value.trim(),
      publicSiteUrl: document.getElementById('set-public-site-url').value.trim(),
      messageTemplate: document.getElementById('set-message-template').value.trim()
    };

    window.storageEngine.saveSettings(newSettings);
    
    const modal = document.getElementById('settings-modal-overlay');
    if (modal) modal.classList.remove('active');

    window.app.showToast('Configurações do Evento atualizadas com sucesso!', 'success');
    if (window.rsvpController) window.rsvpController.renderEventDetails();
    await this.refreshDataFromSheets();
  }
}

window.adminController = new AdminController();
