(function () {
  'use strict';

  const ET = (window.ET = window.ET || {});

  const CURRENCIES = [
    { code: 'INR', symbol: '₹' },
    { code: 'USD', symbol: '$' },
    { code: 'AED', symbol: 'AED ' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' }
  ];

  ET.getSettings = function () {
    return ET.load(ET.KEYS.settings, { currency: 'INR', defaultIncome: 0 });
  };

  ET.updateSettings = function (patch) {
    const next = Object.assign({}, ET.getSettings(), patch);
    ET.save(ET.KEYS.settings, next);
    return next;
  };

  ET.getCurrency = function () {
    return CURRENCIES.find((c) => c.code === ET.getSettings().currency) || CURRENCIES[0];
  };

  ET.formatAmount = function (value) {
    const currency = ET.getCurrency();
    const n = Number(value) || 0;
    const formatted = n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    return `${currency.symbol}${formatted}`;
  };

  ET.renderSettingsPanel = function (container, onChange) {
    const s = ET.getSettings();
    container.innerHTML = `
      <div class="settings-grid">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3 class="panel-title">Display Currency</h3>
            </div>
            <span class="panel-badge">Regional</span>
          </div>
          <p class="hint">Choose your preferred currency symbol for formatting monetary values.</p>
          <div class="field">
            <span class="field-label">Currency</span>
            <select id="setting-currency">
              ${CURRENCIES.map((c) => `<option value="${c.code}" ${c.code === s.currency ? 'selected' : ''}>${c.code} (${c.symbol.trim()})</option>`).join('')}
            </select>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3 class="panel-title">Default Monthly Income</h3>
            </div>
            <span class="panel-badge">Baseline</span>
          </div>
          <p class="hint">Applied as the baseline for every month. You can also customize individual months from the dashboard.</p>
          <div class="field">
            <span class="field-label">Baseline Income Amount</span>
            <input id="setting-income" type="number" min="0" step="any" value="${s.defaultIncome || ''}" placeholder="e.g. 60000" />
          </div>
        </section>

        <section class="panel" style="grid-column: 1 / -1;">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3 class="panel-title">App Installation & Offline Usage</h3>
            </div>
            <span class="panel-badge" id="pwa-status-badge">PWA</span>
          </div>
          <p class="hint">Install Pennywise directly to your home screen or desktop for a fullscreen app experience, offline caching, and instant launch.</p>
          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <button id="settings-install-btn" class="btn btn-secondary" type="button">Install / Add to Home Screen</button>
            <span id="pwa-install-note" style="font-size: 0.82rem; color: var(--text-muted);"></span>
          </div>
        </section>

        <section class="panel" style="grid-column: 1 / -1;">
          <div class="panel-header">
            <div class="panel-title-wrap">
              <h3 class="panel-title">Data Backup & Restore</h3>
            </div>
            <span class="panel-badge">Local Storage</span>
          </div>
          <p class="hint">Export your entire financial history (expenses, monthly overrides, and preferences) as a JSON file, or restore from an existing backup file.</p>
          
          <div class="backup-actions">
            <button id="export-backup" class="btn btn-secondary" type="button">Export JSON Backup</button>
            <label class="btn btn-secondary" style="cursor: pointer; margin: 0;">
              Import JSON Backup
              <input id="import-backup-file" type="file" accept=".json,application/json" style="display: none;" />
            </label>
          </div>

          <div id="backup-status" style="display: none;"></div>
        </section>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
        <button id="save-settings" class="btn btn-primary">Save Settings</button>
      </div>
    `;

    // Update PWA Status in Settings
    const isStandalone = ET.isStandalone && ET.isStandalone();
    const pwaBadge = container.querySelector('#pwa-status-badge');
    const pwaNote = container.querySelector('#pwa-install-note');
    const pwaInstallBtn = container.querySelector('#settings-install-btn');

    if (isStandalone) {
      if (pwaBadge) pwaBadge.textContent = 'Installed';
      if (pwaNote) pwaNote.textContent = 'Pennywise is running as an installed standalone app.';
      if (pwaInstallBtn) pwaInstallBtn.textContent = 'App Installed ✓';
    } else {
      if (pwaNote) pwaNote.textContent = 'Available for iOS Safari, Android, and Desktop.';
    }

    if (pwaInstallBtn) {
      pwaInstallBtn.addEventListener('click', () => {
        if (ET.showInstallPrompt) {
          ET.showInstallPrompt();
        }
      });
    }

    function showStatus(message, type) {
      const statusEl = container.querySelector('#backup-status');
      if (!statusEl) return;
      statusEl.className = `status-banner status-${type}`;
      statusEl.textContent = message;
      statusEl.style.display = 'flex';
    }

    container.querySelector('#save-settings').addEventListener('click', () => {
      ET.updateSettings({
        currency: container.querySelector('#setting-currency').value,
        defaultIncome: Number(container.querySelector('#setting-income').value) || 0
      });
      ET.renderSettingsPanel(container, onChange);
      showStatus('Settings saved successfully.', 'success');
      onChange();
    });

    const exportBtn = container.querySelector('#export-backup');
    exportBtn.addEventListener('click', () => {
      try {
        const jsonStr = ET.exportData();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `pennywise-backup-${today}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showStatus('Backup exported successfully.', 'success');
      } catch {
        showStatus('Failed to export backup.', 'error');
      }
    });

    const fileInput = container.querySelector('#import-backup-file');
    fileInput.addEventListener('change', async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;

      const confirmed = await ET.showConfirm({
        title: 'Restore Backup',
        message: 'Restoring a backup will replace your current expenses, events, and settings with the data in this backup file. Proceed?',
        confirmText: 'Restore Data',
        cancelText: 'Cancel',
        isDestructive: true
      });

      if (!confirmed) {
        fileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = ET.importData(e.target.result);
          ET.renderSettingsPanel(container, onChange);
          showStatus(`Backup restored successfully: ${result.expensesCount} expenses, ${result.eventsCount || 0} programs, and ${result.overridesCount} overrides loaded.`, 'success');
          if (onChange) onChange();
        } catch (err) {
          showStatus(err.message || 'Failed to import backup.', 'error');
        }
      };
      reader.onerror = () => {
        showStatus('Failed to read selected file.', 'error');
      };
      reader.readAsText(file);
    });
  };
})();
