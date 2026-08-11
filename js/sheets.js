/* ==========================================================================
   GOOGLE SHEETS & LOCAL STORAGE DATA ENGINE (COM SUPORTE A URL DO SITE PÚBLICO)
   ========================================================================== */

const STORAGE_KEYS = {
  SETTINGS: 'rsvp_event_settings_v1',
  GUESTS: 'rsvp_guests_list_v1',
  DISPATCH_INDEX: 'rsvp_dispatch_index_v1'
};

const DEFAULT_SETTINGS = {
  eventType: 'Aniversário',
  eventTitle: 'Aniversário de 88 Anos',
  eventSubtitle: 'Venha comemorar esta data tão especial conosco!',
  eventDate: '2026-09-20',
  eventTime: '19:30',
  locationName: 'Espaço Festa & Celebração',
  locationAddress: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
  mapsUrl: 'https://maps.google.com/?q=Av.+Paulista,+1000,+Sao+Paulo',
  specialNotice: 'Traje: Esporte Fino | Estacionamento no local | Confirme sua presença pelo site.',
  webhookUrl: '', // URL do Google Apps Script
  publicSiteUrl: '', // URL do site publicado (ex: https://meu-evento.vercel.app)
  messageTemplate: 'Oi {nome}! 🎉 Você está convidado(a) para celebrar conosco o {tipo_evento}! Dá uma olhada em todos os detalhes e confirma sua presença pelo link: {link}'
};

const INITIAL_DEMO_GUESTS = [
  { id: '1', name: 'João Silva', phone: '5511999998888', status: 'Pendente', sent: false, checkSymbol: '', companionsCount: 0, companionNames: '', notes: '', updatedAt: '' },
  { id: '2', name: 'Maria Santos', phone: '5511988887777', status: 'Confirmado', sent: true, checkSymbol: '✓', companionsCount: 2, companionNames: 'Lucas Santos, Clara Santos', notes: 'Chegaremos às 20h!', updatedAt: '10/08/2026 15:30' },
  { id: '3', name: 'Carlos Oliveira', phone: '5511977776666', status: 'Recusado', sent: true, checkSymbol: '✓', companionsCount: 0, companionNames: '', notes: 'Estarei viajando nessa data, parabéns!', updatedAt: '10/08/2026 16:15' }
];

class StorageEngine {
  constructor() {
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.GUESTS)) {
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(INITIAL_DEMO_GUESTS));
    }
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
