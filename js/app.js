(function () {
  'use strict';

  const ET = (window.ET = window.ET || {});

  // Custom Confirmation Modal
  ET.showConfirm = function ({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false
  }) {
    return new Promise((resolve) => {
      const confirmModal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-title');
      const msgEl = document.getElementById('confirm-message');
      const okBtn = document.getElementById('confirm-ok-btn');
      const cancelBtn = document.getElementById('confirm-cancel-btn');

      if (!confirmModal || !okBtn || !cancelBtn) {
        resolve(true);
        return;
      }

      titleEl.textContent = title;
      msgEl.textContent = message;
      okBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      okBtn.className = isDestructive ? 'btn btn-destructive' : 'btn btn-primary';

      confirmModal.hidden = false;

      function cleanup(result) {
        confirmModal.hidden = true;
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        window.removeEventListener('keydown', onKey);
        confirmModal.removeEventListener('click', onBackdrop);
        resolve(result);
      }

      function onOk() {
        cleanup(true);
      }

      function onCancel() {
        cleanup(false);
      }

      function onKey(e) {
        if (e.key === 'Escape') {
          cleanup(false);
        } else if (e.key === 'Enter') {
          cleanup(true);
        }
      }

      function onBackdrop(e) {
        if (e.target === confirmModal) {
          cleanup(false);
        }
      }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      window.addEventListener('keydown', onKey);
      confirmModal.addEventListener('click', onBackdrop);
      okBtn.focus();
    });
  };

  const state = { month: ET.currentYM() };

  const views = {
    dashboard: document.getElementById('view-dashboard'),
    expenses: document.getElementById('view-expenses'),
    events: document.getElementById('view-events'),
    settings: document.getElementById('view-settings')
  };

  const navLinks = document.querySelectorAll('.nav-btn, .drawer-nav-item');

  function parseHash() {
    const raw = (window.location.hash || '#dashboard').replace(/^#\/?/, '');
    const parts = raw.split('/');
    const viewName = parts[0] || 'dashboard';
    const subParam = parts[1] || null;
    return {
      view: views[viewName] ? viewName : 'dashboard',
      param: subParam
    };
  }

  function renderCurrentRoute() {
    const route = parseHash();

    // If viewing a specific event detail
    if (route.view === 'events' && route.param && ET.setActiveEventId) {
      ET.setActiveEventId(route.param);
    } else if (route.view === 'events' && !route.param && ET.setActiveEventId) {
      ET.setActiveEventId(null);
    }

    // Toggle active view panel
    Object.keys(views).forEach((key) => {
      views[key].hidden = key !== route.view;
    });

    // Update active states on nav buttons
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.view === route.view);
    });

    // Render active view contents
    if (route.view === 'dashboard') ET.renderDashboard(views.dashboard, state, refreshActiveView);
    if (route.view === 'expenses') ET.renderExpenseManager(views.expenses, refreshActiveView);
    if (route.view === 'events') ET.renderEvents(views.events, refreshActiveView);
    if (route.view === 'settings') ET.renderSettingsPanel(views.settings, refreshActiveView);
  }

  function refreshActiveView() {
    const route = parseHash();
    if (route.view === 'dashboard') {
      ET.renderDashboard(views.dashboard, state, refreshActiveView);
    } else if (route.view === 'expenses') {
      ET.renderExpenseManager(views.expenses, refreshActiveView);
    } else if (route.view === 'events') {
      ET.renderEvents(views.events, refreshActiveView);
    } else if (route.view === 'settings') {
      ET.renderSettingsPanel(views.settings, refreshActiveView);
    }
  }

  ET.switchView = function (name) {
    window.location.hash = `#${name}`;
  };

  // Listen to browser hash changes
  window.addEventListener('hashchange', renderCurrentRoute);

  // Setup Mobile Hamburger Drawer
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const drawer = document.getElementById('mobile-drawer');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');

  function openDrawer() {
    if (!drawer) return;
    drawer.hidden = false;
    if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.hidden = true;
    if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', openDrawer);
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }

  if (drawer) {
    drawer.addEventListener('click', (ev) => {
      if (ev.target === drawer) {
        closeDrawer();
      }
    });
  }

  // Close drawer on link click
  document.querySelectorAll('.drawer-nav-item').forEach((link) => {
    link.addEventListener('click', () => {
      closeDrawer();
    });
  });

  // Setup Quick Add Floating Action Button & Modal
  const fab = document.getElementById('quick-add-fab');
  const modal = document.getElementById('quick-add-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalForm = document.getElementById('modal-expense-form');
  const modalTypeSelect = modalForm ? modalForm.querySelector('select[name="type"]') : null;

  const today = new Date().toISOString().slice(0, 10);

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    modalForm.reset();
    if (modalTypeSelect) {
      modalTypeSelect.value = 'emi';
    }
    const dateInput = modalForm.querySelector('input[name="startDate"]');
    if (dateInput) {
      dateInput.value = today;
    }
    const firstInput = modalForm.querySelector('input[name="name"]');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
  }

  if (fab) {
    fab.addEventListener('click', openModal);
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) {
        closeModal();
      }
    });
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      closeModal();
      closeDrawer();
    }
  });

  if (modalForm) {
    modalForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const data = new FormData(modalForm);

      ET.addExpense({
        type: data.get('type'),
        name: data.get('name'),
        amount: data.get('amount'),
        category: data.get('category'),
        startDate: data.get('startDate'),
        endDate: data.get('endDate') || null
      });

      closeModal();
      refreshActiveView();
    });
  }

  // PWA Install Handlers & Platform Detection
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    console.log('Pennywise PWA installed successfully.');
  });

  ET.isStandalone = function () {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  };

  ET.isIOS = function () {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  };

  ET.showInstallPrompt = function () {
    const modal = document.getElementById('pwa-install-modal');
    const bodyEl = document.getElementById('install-modal-body');
    const actionBtn = document.getElementById('install-modal-action-btn');
    const dismissBtn = document.getElementById('install-modal-dismiss-btn');
    const closeBtn = document.getElementById('install-modal-close-btn');

    if (!modal || !bodyEl) return;

    function closeModal() {
      modal.hidden = true;
    }

    if (closeBtn) closeBtn.onclick = closeModal;
    if (dismissBtn) dismissBtn.onclick = closeModal;

    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    if (ET.isStandalone()) {
      bodyEl.innerHTML = `
        <div class="install-step-card" style="text-align: center; padding: 1.25rem 0.5rem;">
          <div class="install-success-icon">✓</div>
          <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text); margin-bottom: 0.35rem;">Pennywise is Already Installed</h4>
          <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.4;">You are running Pennywise in standalone app mode with offline caching enabled.</p>
        </div>
      `;
      if (actionBtn) actionBtn.style.display = 'none';
      modal.hidden = false;
      return;
    }

    if (ET.isIOS()) {
      bodyEl.innerHTML = `
        <div class="install-guide">
          <p style="font-size: 0.88rem; color: var(--text); margin-bottom: 1rem; line-height: 1.5;">
            Apple Safari requires manual installation to your iPhone / iPad home screen:
          </p>
          <div class="install-steps">
            <div class="install-step-item">
              <span class="step-num">1</span>
              <div class="step-text">
                <strong>Tap the Share Button</strong>
                <p>Tap the <strong>Share icon</strong> (the box with an upward arrow) in Safari's bottom toolbar.</p>
              </div>
            </div>
            <div class="install-step-item">
              <span class="step-num">2</span>
              <div class="step-text">
                <strong>Select "Add to Home Screen"</strong>
                <p>Scroll down the share options and tap <strong>Add to Home Screen</strong> (+).</p>
              </div>
            </div>
            <div class="install-step-item">
              <span class="step-num">3</span>
              <div class="step-text">
                <strong>Tap "Add"</strong>
                <p>Tap <strong>Add</strong> in the top-right corner to place Pennywise on your home screen.</p>
              </div>
            </div>
          </div>
        </div>
      `;
      if (actionBtn) actionBtn.style.display = 'none';
      modal.hidden = false;
      return;
    }

    if (deferredPrompt) {
      bodyEl.innerHTML = `
        <div class="install-guide">
          <p style="font-size: 0.9rem; color: var(--text); margin-bottom: 1rem; line-height: 1.5;">
            Install Pennywise for a dedicated window experience, faster offline launch, and home screen access.
          </p>
        </div>
      `;
      if (actionBtn) {
        actionBtn.style.display = 'inline-flex';
        actionBtn.onclick = async () => {
          closeModal();
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
        };
      }
      modal.hidden = false;
      return;
    }

    // Default desktop / generic browser guide
    bodyEl.innerHTML = `
      <div class="install-guide">
        <p style="font-size: 0.88rem; color: var(--text); margin-bottom: 1rem; line-height: 1.5;">
          To install Pennywise on your device:
        </p>
        <div class="install-steps">
          <div class="install-step-item">
            <span class="step-num">1</span>
            <div class="step-text">
              <strong>Check Browser Address Bar</strong>
              <p>Look for the <strong>Install</strong> or <strong>App Available</strong> icon on the right side of the URL bar.</p>
            </div>
          </div>
          <div class="install-step-item">
            <span class="step-num">2</span>
            <div class="step-text">
              <strong>Click "Install Pennywise"</strong>
              <p>Confirm the install prompt to launch Pennywise as a standalone desktop/mobile app.</p>
            </div>
          </div>
        </div>
      </div>
    `;
    if (actionBtn) actionBtn.style.display = 'none';
    modal.hidden = false;
  };

  // Wire Drawer Install Button
  const drawerInstallBtn = document.getElementById('drawer-install-btn');
  if (drawerInstallBtn) {
    drawerInstallBtn.addEventListener('click', () => {
      closeDrawer();
      ET.showInstallPrompt();
    });
  }

  // Register PWA Service Worker (when running on http/https)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Service Worker registration skipped:', err);
      });
    });
  }

  // Initial Route Render
  if (!window.location.hash) {
    window.location.hash = '#dashboard';
  } else {
    renderCurrentRoute();
  }
})();
