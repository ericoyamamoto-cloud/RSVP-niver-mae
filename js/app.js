/* ==========================================================================
   MAIN APPLICATION CONTROLLER (PRIVACIDADE & NAVEGAÇÃO SEGURA DO ANFITRIÃO)
   ========================================================================== */

class AppController {
  constructor() {
    this.currentView = 'rsvp';
  }

  async init() {
    this.setupThemeAndEffects();
    
    // Verifica se a URL é de acesso do Anfitrião (admin.html ou ?view=admin)
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminMode = urlParams.get('view') === 'admin' || urlParams.get('admin') === 'true' || window.location.pathname.endsWith('admin.html');

    const navBtnAdmin = document.getElementById('nav-btn-admin');
    
    if (isAdminMode) {
      // Modo Anfitrião: Mostra botão e inicia no painel
      if (navBtnAdmin) navBtnAdmin.style.display = 'inline-flex';
      await window.adminController.init();
      this.switchView('admin');
    } else {
      // Modo Convidado: ESCONDE totalmente o botão do Painel do Anfitrião
      if (navBtnAdmin) navBtnAdmin.style.display = 'none';
      await window.rsvpController.init();
      this.switchView('rsvp');
    }

    this.bindGlobalEvents();
  }

  switchView(viewName) {
    this.currentView = viewName;
    const viewRsvp = document.getElementById('view-rsvp');
    const viewAdmin = document.getElementById('view-admin');
    const navBtnRsvp = document.getElementById('nav-btn-rsvp');
    const navBtnAdmin = document.getElementById('nav-btn-admin');

    const urlParams = new URLSearchParams(window.location.search);
    const isAdminMode = urlParams.get('view') === 'admin' || urlParams.get('admin') === 'true';

    if (viewName === 'admin') {
      if (viewRsvp) viewRsvp.style.display = 'none';
      if (viewAdmin) viewAdmin.style.display = 'block';
      if (navBtnRsvp) navBtnRsvp.style.display = 'inline-flex';
      if (navBtnAdmin) navBtnAdmin.style.display = 'none';
      window.scrollTo(0, 0);
    } else {
      if (viewRsvp) viewRsvp.style.display = 'block';
      if (viewAdmin) viewAdmin.style.display = 'none';
      if (navBtnRsvp) navBtnRsvp.style.display = 'none';
      // Só mostra o botão admin se o usuário iniciou no modo anfitrião
      if (navBtnAdmin) navBtnAdmin.style.display = isAdminMode ? 'inline-flex' : 'none';
      window.scrollTo(0, 0);
    }
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span style="margin-right:0.5rem;">${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#d4af37', '#f3e5ab', '#ec4899', '#3b82f6', '#10b981', '#a855f7'];

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: Math.random() * 3 + 2,
        speedX: Math.random() * 2 - 1,
        rotation: Math.random() * 360,
        rotSpeed: Math.random() * 4 - 2
      });
    }

    let animationFrame;
    const startTime = Date.now();

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      pieces.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (Date.now() - startTime < 4500) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    render();
  }

  setupThemeAndEffects() {
    window.addEventListener('resize', () => {
      const canvas = document.getElementById('confetti-canvas');
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    });
  }

  bindGlobalEvents() {
    // Tecla ESC fecha modais
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay.active');
        modals.forEach(m => m.classList.remove('active'));
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});
