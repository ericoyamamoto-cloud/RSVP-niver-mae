/* ==========================================================================
   APP MAIN CONTROLLER, ROUTING & UI ENGINE
   ========================================================================== */

class App {
  constructor() {
    this.currentView = 'rsvp'; // 'rsvp' or 'admin'
    this.countdownTimer = null;
  }

  async init() {
    this.setupViewSwitcher();
    this.startCountdownTimer();
    
    // Initialize child controllers
    if (window.rsvpController) await window.rsvpController.init();
    if (window.adminController) await window.adminController.init();
  }

  setupViewSwitcher() {
    const isAdminRoute = window.location.pathname.endsWith('admin.html') || window.location.hash === '#admin';
    if (isAdminRoute) {
      this.switchView('admin');
    } else {
      this.switchView('rsvp');
    }

    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#admin') {
        this.switchView('admin');
      } else {
        this.switchView('rsvp');
      }
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    const rsvpView = document.getElementById('view-rsvp');
    const adminView = document.getElementById('view-admin');
    const btnToAdmin = document.getElementById('nav-btn-admin');
    const btnToRsvp = document.getElementById('nav-btn-rsvp');

    if (viewName === 'admin') {
      if (rsvpView) rsvpView.style.display = 'none';
      if (adminView) adminView.style.display = 'block';
      if (btnToAdmin) btnToAdmin.style.display = 'none';
      if (btnToRsvp) btnToRsvp.style.display = 'inline-flex';
    } else {
      if (rsvpView) rsvpView.style.display = 'block';
      if (adminView) adminView.style.display = 'none';
      if (btnToAdmin) btnToAdmin.style.display = 'inline-flex';
      if (btnToRsvp) btnToRsvp.style.display = 'none';
    }
  }

  startCountdownTimer() {
    const updateCountdown = () => {
      const settings = window.storageEngine.getSettings();
      if (!settings.eventDate) return;

      const dateParts = settings.eventDate.split('-');
      const timeParts = (settings.eventTime || '19:00').split(':');
      
      const targetDate = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10),
        parseInt(timeParts[0], 10),
        parseInt(timeParts[1] || 0, 10)
      );

      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();

      const daysEl = document.getElementById('timer-days');
      const hoursEl = document.getElementById('timer-hours');
      const minutesEl = document.getElementById('timer-minutes');
      const secondsEl = document.getElementById('timer-seconds');

      if (diffMs <= 0) {
        if (daysEl) daysEl.textContent = '00';
        if (hoursEl) hoursEl.textContent = '00';
        if (minutesEl) minutesEl.textContent = '00';
        if (secondsEl) secondsEl.textContent = '00';
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
      const seconds = Math.floor((diffMs / 1000) % 60);

      if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
      if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    };

    updateCountdown();
    this.countdownTimer = setInterval(updateCountdown, 1000);
  }

  showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : '⚠️'}</span>
      <div>${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#f59e0b', '#fbbf24', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: Math.random() * 5 + 3,
        speedX: Math.random() * 4 - 2,
        rotation: Math.random() * 360,
        rotSpeed: Math.random() * 10 - 5
      });
    }

    let animationFrame;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeCount = 0;

      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotSpeed;

        if (p.y < canvas.height) activeCount++;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (activeCount > 0) {
        animationFrame = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrame);
      }
    };

    render();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
