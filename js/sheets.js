/* ==========================================================================
   GOOGLE SHEETS & LOCAL STORAGE DATA ENGINE (DADOS OFICIAIS DO EVENTO)
   ========================================================================== */

const STORAGE_KEYS = {
  SETTINGS: 'rsvp_event_settings_v1',
  GUESTS: 'rsvp_guests_list_v1',
  DISPATCH_INDEX: 'rsvp_dispatch_index_v1'
};

const DEFAULT_SETTINGS = {
  eventType: 'Aniversário / Festa Social',
  eventTitle: 'Aniversário de 88 Anos',
  eventSubtitle: 'Venha comemorar esta data tão especial conosco!',
  eventDate: '2026-10-17',
  eventTime: '18:30',
  locationName: 'Gramercy Park - Edificio ONE - Sala de Festas Principal',
  locationAddress: 'Avenida Parkinson 42 - Gramercy Park - Barueri - SP',
  mapsUrl: 'https://maps.app.goo.gl/qkGN112BtbveD2r7A',
  specialNotice: 'RSVP - Confirme sua presença até o dia 30/09 por favor. Obs.: devido a limitação de vagas internas, o estacionamento dos veículos deve ser feito fora do condomínio Gramercy Park',
  webhookUrl: '',
  publicSiteUrl: 'https://rsvp-chi-umber.vercel.app',
  messageTemplate: 'Oi {nome}! 🎉 Você está convidado(a) para celebrar conosco o {tipo_evento}! Dá uma olhada em todos os detalhes e confirma sua presença pelo link: {link}'
};

const INITIAL_DEMO_GUESTS = [];

class StorageEngine {
  constructor() {
    this.init();
  }

  init() {
    // Sobrescreve/atualiza as configurações para garantir os dados oficiais da imagem
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }

  getSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  getGuestsLocal() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GUESTS);
      return saved ? JSON.parse(saved) : INITIAL_DEMO_GUESTS;
    } catch (e) {
      return INITIAL_DEMO_GUESTS;
    }
  }

  saveGuestsLocal(guests) {
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(guests));
  }

  async fetchGuests() {
    const settings = this.getSettings();
    if (settings.webhookUrl && settings.webhookUrl.trim().startsWith('http')) {
      try {
        const response = await fetch(settings.webhookUrl.trim(), { method: 'GET', redirect: 'follow' });
        const text = await response.text();
        const data = JSON.parse(text);
        if (data && data.success && Array.isArray(data.guests)) {
          this.saveGuestsLocal(data.guests);
          return data.guests;
        }
      } catch (err) {
        console.warn('Erro ao conectar com Google Apps Script. Usando dados locais.', err);
      }
    }
    return this.getGuestsLocal();
  }

  async updateGuestRsvp(guestData) {
    const settings = this.getSettings();
    const guests = this.getGuestsLocal();
    const index = guests.findIndex(g => String(g.id) === String(guestData.id) || g.name.toLowerCase() === guestData.name.toLowerCase());
    
    const isSent = guestData.sent !== undefined ? guestData.sent : (index !== -1 ? guests[index].sent : false);
    
    const updatedRecord = {
      id: guestData.id || (index !== -1 ? guests[index].id : String(Date.now())),
      name: guestData.name,
      phone: guestData.phone || (index !== -1 ? guests[index].phone : ''),
      status: guestData.status || (index !== -1 ? guests[index].status : 'Pendente'),
      sent: isSent,
      checkSymbol: isSent ? '✓' : '',
      companionsCount: Number(guestData.companionsCount !== undefined ? guestData.companionsCount : (index !== -1 ? guests[index].companionsCount : 0)),
      companionNames: guestData.companionNames !== undefined ? guestData.companionNames : (index !== -1 ? guests[index].companionNames : ''),
      notes: guestData.notes !== undefined ? guestData.notes : (index !== -1 ? guests[index].notes : ''),
      updatedAt: guestData.updatedAt || new Date().toLocaleString('pt-BR')
    };

    if (index !== -1) {
      guests[index] = { ...guests[index], ...updatedRecord };
    } else {
      guests.push(updatedRecord);
    }
    
    this.saveGuestsLocal(guests);

    if (settings.webhookUrl && settings.webhookUrl.trim().startsWith('http')) {
      try {
        await fetch(settings.webhookUrl.trim(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(updatedRecord)
        });
      } catch (err) {
        console.warn('Erro ao sincronizar com Google Sheets:', err);
      }
    }

    return updatedRecord;
  }
}

window.storageEngine = new StorageEngine();
