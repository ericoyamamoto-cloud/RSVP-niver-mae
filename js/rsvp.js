/* ==========================================================================
   GUEST RSVP MODULE (PREENCHIMENTO PRÉVIO & REMOÇÃO DE CAMPO DE OBSERVAÇÃO)
   ========================================================================== */

class RsvpController {
  constructor() {
    this.currentGuest = null;
    this.allGuests = [];
    this.timerInterval = null;
  }

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const guestCode = urlParams.get('code') || urlParams.get('id');

    if (guestCode) {
      const singleList = await window.storageEngine.fetchGuests(guestCode);
      if (Array.isArray(singleList) && singleList.length > 0) {
        this.currentGuest = singleList[0];
        this.allGuests = singleList;
      }
    } else {
      this.allGuests = await window.storageEngine.fetchGuests();
    }

    this.renderEventDetails();
    this.detectGuestFromUrl();
    this.bindEvents();
  }

  sanitizeInput(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  maskPhone(phoneStr) {
    if (!phoneStr) return '';
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length >= 10) {
      const ddd = digits.substring(0, 2);
      const lastFour = digits.substring(digits.length - 4);
      return `(${ddd}) 9****-${lastFour}`;
    }
    return phoneStr;
  }

  renderEventDetails() {
    const settings = window.storageEngine.getSettings();

    const heroTitleEl = document.getElementById('event-hero-title');
    const heroSubtitleEl = document.getElementById('event-hero-subtitle');
    const heroBadgeEl = document.getElementById('event-hero-badge');

    if (heroTitleEl) heroTitleEl.textContent = settings.eventTitle || 'Aniversário de 88 anos de Leiko Fukushima Yamamoto';
    if (heroSubtitleEl) heroSubtitleEl.textContent = settings.eventSubtitle || 'Venha comemorar esta data tão especial conosco!';
    if (heroBadgeEl) heroBadgeEl.textContent = settings.eventType || 'Aniversário / Festa Social';

    const eventDateEl = document.getElementById('event-info-date');
    const eventTimeEl = document.getElementById('event-info-time');
    const eventLocationEl = document.getElementById('event-info-location');
    const eventAddressEl = document.getElementById('event-info-address');
    const eventMapsBtn = document.getElementById('event-maps-btn');
    const specialNoticeEl = document.getElementById('event-special-notice');

    if (eventDateEl && settings.eventDate) {
      const parts = settings.eventDate.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        const dayOfWeekStr = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        const capitalizedWeekday = dayOfWeekStr.charAt(0).toUpperCase() + dayOfWeekStr.slice(1);
        
        eventDateEl.textContent = `${capitalizedWeekday}, ${day}/${month}/${year}`;
      } else {
        eventDateEl.textContent = settings.eventDate;
      }
    }

    if (eventTimeEl) eventTimeEl.textContent = (settings.eventTime || '18:30') + 'h';
    if (eventLocationEl) eventLocationEl.textContent = settings.locationName || 'Gramercy Park - Edificio ONE - Salão de Festas Principal';
    if (eventAddressEl) eventAddressEl.textContent = settings.locationAddress || 'Avenida Parkinson 42 - Gramercy Park - Barueri - SP';
    if (eventMapsBtn) eventMapsBtn.href = settings.mapsUrl || 'https://maps.app.goo.gl/qkGN112BtbveD2r7A';

    if (specialNoticeEl && settings.specialNotice) {
      specialNoticeEl.innerHTML = `<p>${this.sanitizeInput(settings.specialNotice)}</p>`;
    }

    this.startCountdownTimer(settings.eventDate || '2026-10-17', settings.eventTime || '18:30');
  }

  startCountdownTimer(dateStr, timeStr) {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const updateTimer = () => {
      if (!dateStr) return;

      const dateParts = dateStr.split('-');
      if (dateParts.length !== 3) return;

      const [year, month, day] = dateParts.map(n => parseInt(n, 10));
      let hours = 18, minutes = 30;

      if (timeStr) {
        const timeParts = timeStr.split(':');
        if (timeParts.length >= 2) {
          hours = parseInt(timeParts[0], 10);
          minutes = parseInt(timeParts[1], 10);
        }
      }

      const targetDate = new Date(year, month - 1, day, hours, minutes, 0).getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      const timerDaysEl = document.getElementById('timer-days');
      const timerHoursEl = document.getElementById('timer-hours');
      const timerMinEl = document.getElementById('timer-minutes');
      const timerSecEl = document.getElementById('timer-seconds');

      if (difference <= 0) {
        if (timerDaysEl) timerDaysEl.textContent = '00';
        if (timerHoursEl) timerHoursEl.textContent = '00';
        if (timerMinEl) timerMinEl.textContent = '00';
        if (timerSecEl) timerSecEl.textContent = '00';
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesLeft = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((difference % (1000 * 60)) / 1000);

      if (timerDaysEl) timerDaysEl.textContent = String(days).padStart(2, '0');
      if (timerHoursEl) timerHoursEl.textContent = String(hoursLeft).padStart(2, '0');
      if (timerMinEl) timerMinEl.textContent = String(minutesLeft).padStart(2, '0');
      if (timerSecEl) timerSecEl.textContent = String(secondsLeft).padStart(2, '0');
    };

    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  }

  detectGuestFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const guestCode = urlParams.get('code') || urlParams.get('id');
    const guestName = urlParams.get('name');

    if (this.currentGuest) {
      this.showRsvpFormForGuest(this.currentGuest);
      return;
    }

    if (guestCode) {
      this.currentGuest = this.allGuests.find(g => (g.code && g.code.toLowerCase() === guestCode.toLowerCase()) || String(g.id) === String(guestCode));
    } else if (guestName) {
      this.currentGuest = this.allGuests.find(g => g.name.toLowerCase().includes(guestName.toLowerCase()));
    }

    if (this.currentGuest) {
      this.showRsvpFormForGuest(this.currentGuest);
    } else {
      this.showGuestSelectorPrompt();
    }
  }

  showGuestSelectorPrompt() {
    const selectorSection = document.getElementById('guest-selector-section');
    const rsvpFormSection = document.getElementById('rsvp-form-section');
    const rsvpSuccessSection = document.getElementById('rsvp-success-section');

    if (selectorSection) selectorSection.style.display = 'block';
    if (rsvpFormSection) rsvpFormSection.style.display = 'none';
    if (rsvpSuccessSection) rsvpSuccessSection.style.display = 'none';
  }

  showRsvpFormForGuest(guest) {
    this.currentGuest = guest;
    
    const selectorSection = document.getElementById('guest-selector-section');
    const rsvpFormSection = document.getElementById('rsvp-form-section');
    const rsvpSuccessSection = document.getElementById('rsvp-success-section');

    if (selectorSection) selectorSection.style.display = 'none';
    if (rsvpSuccessSection) rsvpSuccessSection.style.display = 'none';
    if (rsvpFormSection) rsvpFormSection.style.display = 'block';

    const guestNameEl = document.getElementById('rsvp-guest-name');
    const guestAvatarEl = document.getElementById('rsvp-guest-avatar');
    const guestStatusBadgeEl = document.getElementById('rsvp-guest-status-badge');

    if (guestNameEl) guestNameEl.textContent = this.sanitizeInput(guest.name);
    if (guestAvatarEl) guestAvatarEl.textContent = guest.name.charAt(0).toUpperCase();
    if (guestStatusBadgeEl) {
      guestStatusBadgeEl.textContent = `Status: ${guest.status || 'Pendente'}`;
      guestStatusBadgeEl.className = `badge ${guest.status === 'Confirmado' ? 'badge-green' : guest.status === 'Recusado' ? 'badge-red' : 'badge-gold'}`;
    }

    // Carrega e preenche previamente a resposta caso o convidado já tenha respondido!
    const choiceYes = document.getElementById('choice-yes-btn');
    const choiceNo = document.getElementById('choice-no-btn');
    const radioYes = document.getElementById('choice-yes');
    const radioNo = document.getElementById('choice-no');

    if (guest.status === 'Confirmado') {
      if (radioYes) radioYes.checked = true;
      if (choiceYes) choiceYes.classList.add('selected-yes');
      if (choiceNo) choiceNo.classList.remove('selected-no');
      this.toggleCompanionsGroup(true);

      const companionsSelect = document.getElementById('companions-count');
      if (companionsSelect) {
        companionsSelect.value = guest.companionsCount || 0;
        const namesToFill = guest.companionNames || guest.notes || '';
        this.renderCompanionInputFields(guest.companionsCount || 0, namesToFill);
      }
    } else if (guest.status === 'Recusado') {
      if (radioNo) radioNo.checked = true;
      if (choiceNo) choiceNo.classList.add('selected-no');
      if (choiceYes) choiceYes.classList.remove('selected-yes');
      this.toggleCompanionsGroup(false);
    } else {
      if (radioYes) radioYes.checked = false;
      if (radioNo) radioNo.checked = false;
      if (choiceYes) choiceYes.classList.remove('selected-yes');
      if (choiceNo) choiceNo.classList.remove('selected-no');
      this.toggleCompanionsGroup(false);
    }
  }

  toggleCompanionsGroup(show) {
    const group = document.getElementById('companions-details-group');
    if (group) group.style.display = show ? 'block' : 'none';
  }

  renderCompanionInputFields(count, existingNamesStr = '') {
    const container = document.getElementById('companion-names-container');
    if (!container) return;

    container.innerHTML = '';
    
    // Limpa o prefixo "Acompanhantes: " se existir
    let cleanNamesStr = existingNamesStr.replace(/^Acompanhantes:\s*/i, '');
    const existingNames = cleanNamesStr ? cleanNamesStr.split(',').map(n => this.sanitizeInput(n.trim())) : [];

    for (let i = 0; i < count; i++) {
      const fieldDiv = document.createElement('div');
      fieldDiv.className = 'form-group';
      fieldDiv.style.marginBottom = '0.75rem';
      fieldDiv.innerHTML = `
        <label class="form-label" style="font-size: 0.8rem;">Nome do Acompanhante ${i + 1}:</label>
        <input type="text" class="form-control companion-name-input" placeholder="Ex: Maria Silva" value="${existingNames[i] || ''}" required />
      `;
      container.appendChild(fieldDiv);
    }
  }

  bindEvents() {
    const choiceYesBtn = document.getElementById('choice-yes-btn');
    const choiceNoBtn = document.getElementById('choice-no-btn');
    const radioYes = document.getElementById('choice-yes');
    const radioNo = document.getElementById('choice-no');

    if (choiceYesBtn) {
      choiceYesBtn.addEventListener('click', () => {
        if (radioYes) radioYes.checked = true;
        choiceYesBtn.classList.add('selected-yes');
        if (choiceNoBtn) choiceNoBtn.classList.remove('selected-no');
        this.toggleCompanionsGroup(true);
      });
    }

    if (choiceNoBtn) {
      choiceNoBtn.addEventListener('click', () => {
        if (radioNo) radioNo.checked = true;
        choiceNoBtn.classList.add('selected-no');
        if (choiceYesBtn) choiceYesBtn.classList.remove('selected-yes');
        this.toggleCompanionsGroup(false);
      });
    }

    const companionsSelect = document.getElementById('companions-count');
    if (companionsSelect) {
      companionsSelect.addEventListener('change', (e) => {
        const count = parseInt(e.target.value, 10);
        this.renderCompanionInputFields(count);
      });
    }

    const rsvpForm = document.getElementById('rsvp-main-form');
    if (rsvpForm) {
      rsvpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleFormSubmit();
      });
    }

    const openSearchBtn = document.getElementById('btn-open-search-modal');
    const closeSearchBtn = document.getElementById('btn-close-search-modal');
    const searchModal = document.getElementById('search-modal-overlay');
    const searchInput = document.getElementById('search-guest-input');

    if (openSearchBtn && searchModal) {
      openSearchBtn.addEventListener('click', () => searchModal.classList.add('active'));
    }

    if (closeSearchBtn && searchModal) {
      closeSearchBtn.addEventListener('click', () => searchModal.classList.remove('active'));
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleGuestSearch(e.target.value));
    }
  }

  handleGuestSearch(query) {
    const resultsContainer = document.getElementById('search-results-list');
    if (!resultsContainer) return;

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      resultsContainer.innerHTML = '<p style="color: var(--text-dim); text-align: center; padding: 1rem;">Digite o nome ou telefone para buscar seu convite.</p>';
      return;
    }

    const matches = this.allGuests.filter(g => 
      g.name.toLowerCase().includes(trimmed) || 
      (g.phone && g.phone.replace(/\D/g, '').includes(trimmed))
    );

    if (matches.length === 0) {
      resultsContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Nenhum convidado encontrado. Verifique a grafia ou entre em contato com o anfitrião.</p>';
      return;
    }

    resultsContainer.innerHTML = matches.map(g => {
      const safeName = this.sanitizeInput(g.name);
      return `
        <div class="stat-card" style="cursor: pointer; margin-bottom: 0.5rem;" onclick="window.rsvpController.selectGuestFromSearch('${g.id}')">
          <div class="stat-icon stat-icon-purple">${safeName.charAt(0).toUpperCase()}</div>
          <div style="flex:1;">
            <h4 style="font-size: 1rem; margin-bottom: 0.1rem;">${safeName}</h4>
            <span class="badge ${g.status === 'Confirmado' ? 'badge-green' : g.status === 'Recusado' ? 'badge-red' : 'badge-gold'}" style="font-size: 0.7rem;">${g.status || 'Pendente'}</span>
          </div>
          <button class="btn btn-sm btn-primary">Selecionar</button>
        </div>
      `;
    }).join('');
  }

  selectGuestFromSearch(guestId) {
    const guest = this.allGuests.find(g => String(g.id) === String(guestId) || (g.code && g.code === guestId));
    if (guest) {
      this.showRsvpFormForGuest(guest);
      const modal = document.getElementById('search-modal-overlay');
      if (modal) modal.classList.remove('active');
    }
  }

  async handleFormSubmit() {
    if (!this.currentGuest) {
      window.app.showToast('Selecione seu nome na lista para confirmar a presença.', 'error');
      return;
    }

    const isAttending = document.getElementById('choice-yes')?.checked;
    const isDeclining = document.getElementById('choice-no')?.checked;

    if (!isAttending && !isDeclining) {
      window.app.showToast('Por favor, selecione "Sim, irei!" ou "Não poderei ir".', 'error');
      return;
    }

    const status = isAttending ? 'Confirmado' : 'Recusado';
    const companionsCount = isAttending ? parseInt(document.getElementById('companions-count')?.value || '0', 10) : 0;
    
    const companionInputs = document.querySelectorAll('.companion-name-input');
    const rawCompanionNames = Array.from(companionInputs).map(inp => inp.value.trim()).filter(Boolean).join(', ');
    const companionNames = this.sanitizeInput(rawCompanionNames);

    const submitBtn = document.getElementById('rsvp-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Salvando confirmação...';
    }

    try {
      const updatedGuest = await window.storageEngine.updateGuestRsvp({
        id: this.currentGuest.id,
        code: this.currentGuest.code,
        name: this.currentGuest.name,
        phone: this.currentGuest.phone,
        status: status,
        companionsCount: companionsCount,
        companionNames: companionNames,
        notes: ''
      });

      this.currentGuest = updatedGuest;

      document.getElementById('rsvp-form-section').style.display = 'none';
      const successSection = document.getElementById('rsvp-success-section');
      if (successSection) {
        successSection.style.display = 'block';
        
        const titleEl = document.getElementById('success-title');
        const descEl = document.getElementById('success-desc');

        if (status === 'Confirmado') {
          if (titleEl) titleEl.textContent = 'Presença Confirmada com Sucesso! 🎉';
          if (descEl) descEl.textContent = `Que excelente notícia, ${this.sanitizeInput(this.currentGuest.name)}! Estamos muito felizes por ter você ${companionsCount > 0 ? `e mais ${companionsCount} acompanhante(s)` : ''} conosco!`;
          window.app.triggerConfetti();
        } else {
          if (titleEl) titleEl.textContent = 'Resposta Registrada!';
          if (descEl) descEl.textContent = `Agradecemos por nos avisar, ${this.sanitizeInput(this.currentGuest.name)}. Sentiremos sua falta na celebração!`;
        }
      }

      window.app.showToast('Confirmação salva com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      window.app.showToast('Ocorreu um erro ao salvar sua confirmação. Tente novamente.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Confirmar Resposta';
      }
    }
  }
}

window.rsvpController = new RsvpController();
