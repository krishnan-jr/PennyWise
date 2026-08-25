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
