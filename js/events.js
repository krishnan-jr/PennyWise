(function () {
  'use strict';

  const ET = (window.ET = window.ET || {});

  ET.EVENT_TYPES = [
    { id: 'trip', label: 'Trip / Travel' },
    { id: 'function', label: 'Function / Wedding' },
    { id: 'project', label: 'Project / Renovation' },
    { id: 'other', label: 'General / Other' }
  ];

  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  ET.getEvents = function () {
    return ET.load(ET.KEYS.events, []);
  };

  ET.getEventById = function (id) {
    return ET.getEvents().find((e) => e.id === id) || null;
  };

  ET.addEvent = function (data) {
    const list = ET.getEvents();
    const item = {
      id: (crypto.randomUUID && crypto.randomUUID()) || `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: data.name.trim(),
      type: data.type || 'trip',
      budget: Number(data.budget) || 0,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      status: data.status || 'active',
      notes: (data.notes || '').trim(),
      items: []
    };
    list.push(item);
    ET.save(ET.KEYS.events, list);
    return item;
  };

  ET.updateEvent = function (id, data) {
    const list = ET.getEvents();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      name: data.name.trim(),
      type: data.type || list[idx].type,
      budget: Number(data.budget) || 0,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      status: data.status || list[idx].status,
      notes: (data.notes || '').trim()
    };
    ET.save(ET.KEYS.events, list);
    return list[idx];
  };

  ET.deleteEvent = function (id) {
    ET.save(ET.KEYS.events, ET.getEvents().filter((e) => e.id !== id));
  };

  ET.addEventItem = function (eventId, itemData) {
    const list = ET.getEvents();
    const event = list.find((e) => e.id === eventId);
    if (!event) return null;

    let settlementType = itemData.settlementType || 'full';
    let quoted = Number(itemData.quotedAmount !== undefined ? itemData.quotedAmount : (itemData.unpaidQuotedAmount !== undefined ? itemData.unpaidQuotedAmount : itemData.totalAmount)) || 0;
    let paid = Number(itemData.paidAmount) || 0;

    if (settlementType === 'full') {
      const amt = Number(itemData.totalAmount !== undefined ? itemData.totalAmount : (itemData.paidAmount !== undefined ? itemData.paidAmount : itemData.quotedAmount)) || 0;
      quoted = amt;
      paid = amt;
    } else if (settlementType === 'unpaid') {
      paid = 0;
    }

    let status = 'unpaid';
    if (paid >= quoted && quoted > 0) {
      status = 'paid';
      settlementType = 'full';
    } else if (paid > 0) {
      status = 'partial';
      settlementType = 'partial';
    } else {
      status = 'unpaid';
      settlementType = 'unpaid';
    }

    const item = {
      id: (crypto.randomUUID && crypto.randomUUID()) || `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: itemData.name.trim(),
      category: (itemData.category || '').trim(),
      quotedAmount: quoted,
      paidAmount: paid,
      settlementType: settlementType,
      status: status,
      dueDate: itemData.dueDate || null,
      notes: (itemData.notes || '').trim()
    };

    event.items = event.items || [];
    event.items.push(item);
    ET.save(ET.KEYS.events, list);
    return item;
  };

  ET.updateEventItem = function (eventId, itemId, itemData) {
    const list = ET.getEvents();
    const event = list.find((e) => e.id === eventId);
    if (!event || !event.items) return null;

    const idx = event.items.findIndex((i) => i.id === itemId);
    if (idx === -1) return null;

    let settlementType = itemData.settlementType || 'full';
    let quoted = Number(itemData.quotedAmount !== undefined ? itemData.quotedAmount : (itemData.unpaidQuotedAmount !== undefined ? itemData.unpaidQuotedAmount : itemData.totalAmount)) || 0;
    let paid = Number(itemData.paidAmount) || 0;

    if (settlementType === 'full') {
      const amt = Number(itemData.totalAmount !== undefined ? itemData.totalAmount : (itemData.paidAmount !== undefined ? itemData.paidAmount : itemData.quotedAmount)) || 0;
      quoted = amt;
      paid = amt;
    } else if (settlementType === 'unpaid') {
      paid = 0;
    }

    let status = 'unpaid';
    if (paid >= quoted && quoted > 0) {
      status = 'paid';
      settlementType = 'full';
    } else if (paid > 0) {
      status = 'partial';
      settlementType = 'partial';
    } else {
      status = 'unpaid';
      settlementType = 'unpaid';
    }

    event.items[idx] = {
      ...event.items[idx],
      name: itemData.name.trim(),
      category: (itemData.category || '').trim(),
      quotedAmount: quoted,
      paidAmount: paid,
      settlementType: settlementType,
      status: status,
      dueDate: itemData.dueDate || null,
      notes: (itemData.notes || '').trim()
    };

    ET.save(ET.KEYS.events, list);
    return event.items[idx];
  };

  ET.settleEventItem = function (eventId, itemId) {
    const list = ET.getEvents();
    const event = list.find((e) => e.id === eventId);
    if (!event || !event.items) return null;

    const item = event.items.find((i) => i.id === itemId);
    if (!item) return null;

    item.paidAmount = item.quotedAmount;
    item.status = 'paid';
    item.settlementType = 'full';
    ET.save(ET.KEYS.events, list);
    return item;
  };

  ET.deleteEventItem = function (eventId, itemId) {
    const list = ET.getEvents();
    const event = list.find((e) => e.id === eventId);
    if (!event || !event.items) return;

    event.items = event.items.filter((i) => i.id !== itemId);
    ET.save(ET.KEYS.events, list);
  };

  ET.eventSummary = function (event) {
    const items = event.items || [];
    const itemsQuoted = items.reduce((sum, i) => sum + (Number(i.quotedAmount) || 0), 0);
    const totalQuoted = itemsQuoted > 0 ? itemsQuoted : (Number(event.budget) || 0);
    const totalPaid = items.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
    const totalPending = Math.max(0, totalQuoted - totalPaid);
    const progressPct = totalQuoted > 0 ? Math.min(100, Math.round((totalPaid / totalQuoted) * 100)) : 0;

    const paidCount = items.filter((i) => i.status === 'paid').length;
    const partialCount = items.filter((i) => i.status === 'partial').length;
    const unpaidCount = items.filter((i) => i.status === 'unpaid').length;

    return {
      totalQuoted,
      totalPaid,
      totalPending,
      progressPct,
      itemsCount: items.length,
      paidCount,
      partialCount,
      unpaidCount
    };
  };

  let activeEventId = null;
  let editingEventItemId = null;

  ET.setActiveEventId = function (id) {
    activeEventId = id;
  };

  ET.getActiveEventId = function () {
    return activeEventId;
  };

  ET.renderEvents = function (container, refreshApp) {
    function rerender() {
      if (activeEventId) {
        renderEventDetail(container, activeEventId, rerender, refreshApp);
      } else {
        renderEventsList(container, rerender, refreshApp);
      }
    }

    rerender();
  };

  function renderEventsList(container, rerender, refreshApp) {
    const events = ET.getEvents().slice().sort((a, b) => ((a.startDate || '') < (b.startDate || '') ? 1 : -1));

    container.innerHTML = `
      <!-- Program Creation Panel -->
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3 class="panel-title">Track Program or Trip</h3>
          </div>
          <span class="hint">Organize trips, weddings, functions, and program quotes & advances</span>
        </div>
        <form id="create-event-form" class="form-grid">
          <div class="field" style="grid-column: 1 / -1;">
            <span class="field-label">Program / Event Name</span>
            <input name="name" type="text" required placeholder="e.g. Goa Trip, Cousin's Wedding, House Renovation" />
          </div>
          <div class="field">
            <span class="field-label">Start Date (optional)</span>
            <input name="startDate" type="date" />
          </div>
          <div class="field">
            <span class="field-label">End Date (optional)</span>
            <input name="endDate" type="date" />
          </div>
          <div class="field" style="grid-column: 1 / -1;">
            <span class="field-label">Notes (optional)</span>
            <textarea name="notes" rows="3" placeholder="Add program notes, itinerary, accommodation, or vendor details..."></textarea>
          </div>
          <div style="grid-column: 1 / -1; margin-top: 0.25rem;">
            <button type="submit" class="btn btn-primary">Create Program</button>
          </div>
        </form>
      </section>

      <!-- Events List -->
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3 class="panel-title">Active Programs & Trips</h3>
          </div>
          <span class="panel-badge">${events.length} ${events.length === 1 ? 'program' : 'programs'}</span>
        </div>

        <div id="events-card-list" class="events-grid">
          ${events.length === 0 ? `
            <div class="empty-box"><p>No programs or trips created yet. Create one above to track advance payments and quotes.</p></div>
          ` : events.map((evt) => {
            const sum = ET.eventSummary(evt);
            const dateStr = evt.startDate ? `${evt.startDate}${evt.endDate ? ` &rarr; ${evt.endDate}` : ''}` : 'Dates not set';
            return `
              <div class="event-card" data-id="${evt.id}">
                <div class="event-card-top">
                  <div class="event-card-title-wrap">
                    <h4 class="event-card-title">${escapeHtml(evt.name)}</h4>
                    <div class="event-meta-mobile">
                      <span class="expense-date">${dateStr}</span>
                    </div>
                  </div>
                  <div class="event-card-badge">
                    <span class="tag ${sum.totalPending === 0 && sum.totalQuoted > 0 ? 'tag-paid' : 'tag-partial'}">
                      ${sum.totalPending === 0 && sum.totalQuoted > 0 ? 'Fully Paid' : `${sum.progressPct}% Paid`}
                    </span>
                  </div>
                </div>

                <div class="event-card-metrics">
                  <div class="event-metric">
                    <span class="event-metric-label">Quoted / Total</span>
                    <span class="event-metric-val">${ET.formatAmount(sum.totalQuoted)}</span>
                  </div>
                  <div class="event-metric">
                    <span class="event-metric-label">Paid / Advance</span>
                    <span class="event-metric-val positive-text">${ET.formatAmount(sum.totalPaid)}</span>
                  </div>
                  <div class="event-metric">
                    <span class="event-metric-label">Balance Due</span>
                    <span class="event-metric-val ${sum.totalPending > 0 ? 'negative-text' : ''}">${ET.formatAmount(sum.totalPending)}</span>
                  </div>
                </div>

                <div class="progress-wrap" style="margin: 0.5rem 0;">
                  <div class="progress-track" style="background: #e2e8f0; height: 6px;">
                    <div class="progress-fill" style="width: ${sum.progressPct}%; background: var(--brand-secondary);"></div>
                  </div>
                </div>

                <div class="event-card-footer">
                  <span class="hint">${sum.itemsCount} ${sum.itemsCount === 1 ? 'item' : 'items'} &bull; ${sum.paidCount} paid, ${sum.partialCount} advance</span>
                  <div class="actions-cell-wrap" style="flex-wrap: wrap;">
                    <button class="btn btn-sm btn-secondary export-card-png-btn" data-id="${evt.id}" type="button">Export PNG</button>
                    <button class="btn btn-sm btn-primary open-event-btn" data-id="${evt.id}">Manage &rarr;</button>
                    <button class="link-btn link-btn-danger delete-event-btn" data-id="${evt.id}">Delete</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;

    const form = container.querySelector('#create-event-form');
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const data = new FormData(form);
      const newEvt = ET.addEvent({
        name: data.get('name'),
        startDate: data.get('startDate') || null,
        endDate: data.get('endDate') || null,
        notes: data.get('notes') || ''
      });
      activeEventId = newEvt.id;
      rerender();
    });

    container.querySelectorAll('.open-event-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeEventId = btn.dataset.id;
        rerender();
      });
    });

    container.querySelectorAll('.export-card-png-btn').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const id = btn.dataset.id;
        if (ET.exportEventToPNG) {
          ET.exportEventToPNG(id);
        }
      });
    });

    container.querySelectorAll('.delete-event-btn').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const id = btn.dataset.id;
        const evt = ET.getEventById(id);
        const evtName = evt ? evt.name : 'this program';
        const confirmed = await ET.showConfirm({
          title: 'Delete Program',
          message: `Are you sure you want to delete "${evtName}" and all its recorded payments and quotes?`,
          confirmText: 'Delete Program',
          cancelText: 'Cancel',
          isDestructive: true
        });

        if (confirmed) {
          ET.deleteEvent(id);
          rerender();
        }
      });
    });
  }

  function renderEventDetail(container, eventId, rerender, refreshApp) {
    const event = ET.getEventById(eventId);
    if (!event) {
      activeEventId = null;
      rerender();
      return;
    }

    const sum = ET.eventSummary(event);
    const items = event.items || [];
    const editingItem = editingEventItemId ? items.find((i) => i.id === editingEventItemId) : null;
    if (editingEventItemId && !editingItem) {
      editingEventItemId = null;
    }

    const dateStr = event.startDate ? `${event.startDate}${event.endDate ? ` &rarr; ${event.endDate}` : ''}` : '';

    let initialMode = 'full';
    if (editingItem) {
      if (editingItem.settlementType) {
        initialMode = editingItem.settlementType;
      } else if (editingItem.paidAmount >= editingItem.quotedAmount && editingItem.quotedAmount > 0) {
        initialMode = 'full';
      } else if (editingItem.paidAmount > 0) {
        initialMode = 'partial';
      } else {
        initialMode = 'unpaid';
      }
    }

    container.innerHTML = `
      <div class="event-nav-bar">
        <button id="back-to-events" class="back-btn" type="button">
          &larr; All Programs
        </button>
        <button id="export-event-png-btn" class="btn btn-secondary btn-sm export-btn" type="button">
          Export PNG
        </button>
      </div>

      <!-- Event Header Hero Card -->
      <section class="panel event-hero-panel">
        <div class="event-hero-header">
          <div>
            <h2 class="event-hero-title">${escapeHtml(event.name)}</h2>
            ${dateStr ? `<p class="event-hero-dates">${dateStr}</p>` : ''}
          </div>
          <span class="tag ${sum.totalPending === 0 && sum.totalQuoted > 0 ? 'tag-paid' : 'tag-partial'}">
            ${sum.totalPending === 0 && sum.totalQuoted > 0 ? 'Fully Settled' : `${sum.progressPct}% Settled`}
          </span>
        </div>

        ${event.notes ? `
          <div class="event-notes-box">
            <span class="event-notes-label">Program Notes & Details:</span>
            <p class="event-notes-text">${escapeHtml(event.notes)}</p>
          </div>` : ''}

        <div class="kpi-grid" style="margin-top: 0.75rem;">
          <div class="kpi">
            <div class="kpi-header"><span class="kpi-label">Quoted Total</span></div>
            <div class="kpi-value">${ET.formatAmount(sum.totalQuoted)}</div>
            <span class="kpi-subtext">${sum.itemsCount} cost items</span>
          </div>

          <div class="kpi">
            <div class="kpi-header"><span class="kpi-label">Total Paid (Advance)</span></div>
            <div class="kpi-value positive-text">${ET.formatAmount(sum.totalPaid)}</div>
            <span class="kpi-subtext">${sum.paidCount} fully paid, ${sum.partialCount} advance</span>
          </div>

          <div class="kpi">
            <div class="kpi-header"><span class="kpi-label">Pending Balance</span></div>
            <div class="kpi-value ${sum.totalPending > 0 ? 'negative-text' : ''}">${ET.formatAmount(sum.totalPending)}</div>
            <span class="kpi-subtext">${sum.unpaidCount} unpaid items</span>
          </div>

          <div class="kpi">
            <div class="kpi-header"><span class="kpi-label">Settlement Rate</span></div>
            <div class="kpi-value">${sum.progressPct}%</div>
            <span class="kpi-subtext">${sum.totalPending === 0 && sum.totalQuoted > 0 ? 'Completed' : 'In Progress'}</span>
          </div>
        </div>

        <div class="progress-wrap" style="margin-top: 0.85rem;">
          <div class="progress-track" style="background: #e2e8f0; height: 8px;">
            <div class="progress-fill" style="width: ${sum.progressPct}%; background: var(--brand-accent);"></div>
          </div>
        </div>
      </section>

      <!-- Add / Edit Line Item Form -->
      <section id="item-form-panel" class="panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3 class="panel-title">${editingItem ? 'Edit Cost Item / Payment' : 'Add Cost Item & Settlement'}</h3>
            ${editingItem ? '<span class="panel-badge badge-accent">Editing</span>' : ''}
          </div>
          <span class="hint">${editingItem ? 'Update payment amount, quote, or settlement status' : 'Log vendor quotes, hotel bookings, advance payments, or full one-time settlements'}</span>
        </div>

        <form id="event-item-form" class="form-grid">
          <div class="field" style="grid-column: 1 / -1;">
            <span class="field-label">Payment / Settlement Mode</span>
            <div class="settlement-mode-toggle" id="settlement-mode-toggle">
              <button type="button" class="settlement-mode-btn ${initialMode === 'full' ? 'active' : ''}" data-mode="full">
                Paid in Full
              </button>
              <button type="button" class="settlement-mode-btn ${initialMode === 'partial' ? 'active' : ''}" data-mode="partial">
                Advance / Partial
              </button>
              <button type="button" class="settlement-mode-btn ${initialMode === 'unpaid' ? 'active' : ''}" data-mode="unpaid">
                Unpaid Quote
              </button>
            </div>
            <input type="hidden" name="settlementType" id="item-settlement-type" value="${initialMode}" />
          </div>

          <div class="field">
            <span class="field-label">Item / Service Name</span>
            <input name="name" type="text" required placeholder="e.g. Resort Booking, DJ & Sound, Caterer, Fuel" value="${editingItem ? escapeHtml(editingItem.name) : ''}" />
          </div>

          <div class="field">
            <span class="field-label">Category (optional)</span>
            <input name="category" type="text" placeholder="e.g. Stay, Food, Travel, Venue, Decor" value="${editingItem && editingItem.category ? escapeHtml(editingItem.category) : ''}" />
          </div>

          <!-- Dynamic Settlement Fields Container -->
          <div id="dynamic-fields-container" style="grid-column: 1 / -1; width: 100%;">
            <!-- Full Settlement Mode: 1 Amount Field -->
            <div id="fields-full" class="form-grid" style="${initialMode === 'full' ? '' : 'display: none;'}">
              <div class="field">
                <span class="field-label">Total Settled Amount (₹)</span>
                <input name="totalAmount" id="input-total-amount" type="number" min="0" step="any" ${initialMode === 'full' ? 'required' : ''} placeholder="0.00" value="${editingItem ? (editingItem.paidAmount || editingItem.quotedAmount || '') : ''}" />
                <span class="hint">One-time payment automatically logged as 100% fully settled (zero remaining balance).</span>
              </div>
            </div>

            <!-- Partial / Advance Mode: 2 Amount Fields -->
            <div id="fields-partial" class="form-grid" style="${initialMode === 'partial' ? '' : 'display: none;'}">
              <div class="field">
                <span class="field-label">Quoted / Estimated Total (₹)</span>
                <input name="quotedAmount" id="input-quoted-amount" type="number" min="0" step="any" ${initialMode === 'partial' ? 'required' : ''} placeholder="0.00" value="${editingItem ? editingItem.quotedAmount : ''}" />
              </div>
              <div class="field">
                <span class="field-label">Advance / Amount Paid So Far (₹)</span>
                <input name="paidAmount" id="input-paid-amount" type="number" min="0" step="any" ${initialMode === 'partial' ? 'required' : ''} placeholder="0.00" value="${editingItem ? editingItem.paidAmount : ''}" />
              </div>
              <div class="field">
                <span class="field-label">Due Date for Balance (optional)</span>
                <input name="dueDatePartial" type="date" value="${editingItem && editingItem.dueDate ? editingItem.dueDate : ''}" />
              </div>
            </div>

            <!-- Unpaid Mode: 1 Quoted Field -->
            <div id="fields-unpaid" class="form-grid" style="${initialMode === 'unpaid' ? '' : 'display: none;'}">
              <div class="field">
                <span class="field-label">Quoted / Estimated Total (₹)</span>
                <input name="unpaidQuotedAmount" id="input-unpaid-quoted" type="number" min="0" step="any" ${initialMode === 'unpaid' ? 'required' : ''} placeholder="0.00" value="${editingItem ? editingItem.quotedAmount : ''}" />
              </div>
              <div class="field">
                <span class="field-label">Due Date (optional)</span>
                <input name="dueDateUnpaid" type="date" value="${editingItem && editingItem.dueDate ? editingItem.dueDate : ''}" />
              </div>
            </div>
          </div>

          <div class="field" style="grid-column: 1 / -1;">
            <span class="field-label">Notes (optional)</span>
            <textarea name="notes" rows="2" placeholder="e.g. Balance due at checkout, includes breakfast">${editingItem && editingItem.notes ? escapeHtml(editingItem.notes) : ''}</textarea>
          </div>

          <div class="form-actions-wrap" style="grid-column: 1 / -1; margin-top: 0.5rem; display: flex; gap: 0.75rem; align-items: center;">
            <button type="submit" class="btn btn-primary">${editingItem ? 'Save Item Changes' : 'Add Cost Item'}</button>
            ${editingItem ? '<button type="button" id="cancel-item-edit-btn" class="btn btn-secondary">Cancel</button>' : ''}
          </div>
        </form>
      </section>

      <!-- Items & Payments Breakdown -->
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3 class="panel-title">Cost Items & Payment Ledger</h3>
          </div>
          <span class="panel-badge">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>
        </div>

        <div id="event-items-list">
          ${items.length === 0 ? `
            <div class="empty-box"><p>No expense items added yet for this program. Add full settlements or quotes above.</p></div>
          ` : `
            <div class="table-wrap">
              <table class="table table-event-ledger">
                <thead>
                  <tr>
                    <th>Item & Details</th>
                    <th>Category</th>
                    <th>Due Date</th>
                    <th class="text-right">Quoted Total</th>
                    <th class="text-right">Paid (Advance)</th>
                    <th class="text-right">Balance Due</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((i) => {
                    const pending = Math.max(0, (Number(i.quotedAmount) || 0) - (Number(i.paidAmount) || 0));
                    const statusTag = i.status === 'paid'
                      ? 'tag-paid'
                      : i.status === 'partial'
                        ? 'tag-partial'
                        : 'tag-unpaid';
                    const statusLabel = i.status === 'paid'
                      ? 'Fully Paid'
                      : i.status === 'partial'
                        ? `Advance (${ET.formatAmount(i.paidAmount)})`
                        : 'Unpaid Quote';

                    return `
                      <tr class="event-ledger-row ${editingEventItemId === i.id ? 'row-active' : ''}">
                        <!-- Mobile Structured Card Block -->
                        <td class="mobile-only-block" style="padding: 0; border: none;">
                          <div class="event-item-main">
                            <!-- Top Row: Name and Quoted Amount -->
                            <div class="event-item-top">
                              <span class="event-item-name">${escapeHtml(i.name)}</span>
                              <div class="event-item-amount-wrap">
                                <span class="event-item-quoted-val">${ET.formatAmount(i.quotedAmount)}</span>
                              </div>
                            </div>

                            <!-- Meta Row: Status Badge, Category, Due Date -->
                            <div class="event-item-meta">
                              <span class="tag ${statusTag}">${statusLabel}</span>
                              ${i.category ? `<span class="tag" style="background: var(--surface-subtle); color: var(--text-muted);">${escapeHtml(i.category)}</span>` : ''}
                              ${i.dueDate ? `<span class="expense-date">Due: ${i.dueDate}</span>` : ''}
                            </div>

                            <!-- Notes Row (if present) -->
                            ${i.notes ? `<div class="event-item-notes">${escapeHtml(i.notes)}</div>` : ''}

                            <!-- Bottom Row: Payment Breakdown & Action Buttons -->
                            <div class="event-item-bottom">
                              <div class="event-item-balance-text">
                                ${i.status === 'paid'
                                  ? '<span class="positive-text" style="font-weight: 600;">Paid in Full</span>'
                                  : i.status === 'partial'
                                    ? `Paid: <span class="positive-text" style="font-weight: 600;">${ET.formatAmount(i.paidAmount)}</span> &bull; Due: <strong class="negative-text">${ET.formatAmount(pending)}</strong>`
                                    : `Full Due: <strong class="negative-text">${ET.formatAmount(pending)}</strong>`}
                              </div>
                              <div class="actions-cell-wrap">
                                ${pending > 0 ? `<button class="btn-action-settle settle-item-btn" data-id="${i.id}" type="button" title="Mark full balance settled">Settle</button>` : ''}
                                <button class="link-btn link-btn-edit edit-item-btn" data-id="${i.id}" type="button">Edit</button>
                                <button class="link-btn link-btn-danger delete-item-btn" data-id="${i.id}" type="button">Delete</button>
                              </div>
                            </div>
                          </div>
                        </td>

                        <!-- Desktop Table Cells -->
                        <td class="desktop-only-cell cell-desktop">
                          <span class="expense-name" style="font-weight: 600; font-size: 0.9rem;">${escapeHtml(i.name)}</span>
                          ${i.notes ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">${escapeHtml(i.notes)}</div>` : ''}
                        </td>
                        <td class="desktop-only-cell cell-desktop">${escapeHtml(i.category) || '-'}</td>
                        <td class="desktop-only-cell cell-desktop">${i.dueDate || '-'}</td>
                        <td class="desktop-only-cell cell-desktop text-right amount-cell">
                          <strong>${ET.formatAmount(i.quotedAmount)}</strong>
                        </td>
                        <td class="desktop-only-cell cell-desktop text-right amount-cell positive-text">
                          ${ET.formatAmount(i.paidAmount)}
                        </td>
                        <td class="desktop-only-cell cell-desktop text-right amount-cell ${pending > 0 ? 'negative-text' : ''}">
                          ${pending > 0 ? ET.formatAmount(pending) : '-'}
                        </td>
                        <td class="desktop-only-cell cell-desktop">
                          <span class="tag ${statusTag}">${statusLabel}</span>
                        </td>
                        <td class="desktop-only-cell cell-desktop text-right cell-action">
                          <div class="actions-cell-wrap">
                            ${pending > 0 ? `<button class="btn-action-settle settle-item-btn" data-id="${i.id}" type="button" title="Mark full balance settled">Settle</button>` : ''}
                            <button class="link-btn link-btn-edit edit-item-btn" data-id="${i.id}" type="button">Edit</button>
                            <button class="link-btn link-btn-danger delete-item-btn" data-id="${i.id}" type="button">Delete</button>
                          </div>
                        </td>
                      </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </section>
    `;

    container.querySelector('#back-to-events').addEventListener('click', () => {
      activeEventId = null;
      editingEventItemId = null;
      rerender();
    });

    const exportPngBtn = container.querySelector('#export-event-png-btn');
    if (exportPngBtn) {
      exportPngBtn.addEventListener('click', () => {
        if (ET.exportEventToPNG) {
          ET.exportEventToPNG(eventId);
        }
      });
    }

    const modeToggle = container.querySelector('#settlement-mode-toggle');
    const hiddenModeInput = container.querySelector('#item-settlement-type');
    const fieldsFull = container.querySelector('#fields-full');
    const fieldsPartial = container.querySelector('#fields-partial');
    const fieldsUnpaid = container.querySelector('#fields-unpaid');

    const inputTotal = container.querySelector('#input-total-amount');
    const inputQuoted = container.querySelector('#input-quoted-amount');
    const inputPaid = container.querySelector('#input-paid-amount');
    const inputUnpaidQuoted = container.querySelector('#input-unpaid-quoted');

    if (modeToggle) {
      modeToggle.querySelectorAll('.settlement-mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const selectedMode = btn.dataset.mode;
          modeToggle.querySelectorAll('.settlement-mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
          hiddenModeInput.value = selectedMode;

          const currentVal = Number(inputTotal.value || inputQuoted.value || inputUnpaidQuoted.value) || '';

          if (selectedMode === 'full') {
            fieldsFull.style.display = 'grid';
            fieldsPartial.style.display = 'none';
            fieldsUnpaid.style.display = 'none';
            if (currentVal && !inputTotal.value) inputTotal.value = currentVal;
            inputTotal.required = true;
            inputQuoted.required = false;
            inputPaid.required = false;
            inputUnpaidQuoted.required = false;
          } else if (selectedMode === 'partial') {
            fieldsFull.style.display = 'none';
            fieldsPartial.style.display = 'grid';
            fieldsUnpaid.style.display = 'none';
            if (currentVal && !inputQuoted.value) inputQuoted.value = currentVal;
            inputTotal.required = false;
            inputQuoted.required = true;
            inputPaid.required = true;
            inputUnpaidQuoted.required = false;
          } else if (selectedMode === 'unpaid') {
            fieldsFull.style.display = 'none';
            fieldsPartial.style.display = 'none';
            fieldsUnpaid.style.display = 'grid';
            if (currentVal && !inputUnpaidQuoted.value) inputUnpaidQuoted.value = currentVal;
            inputTotal.required = false;
            inputQuoted.required = false;
            inputPaid.required = false;
            inputUnpaidQuoted.required = true;
          }
        });
      });
    }

    const itemForm = container.querySelector('#event-item-form');
    itemForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const data = new FormData(itemForm);
      const mode = data.get('settlementType') || 'full';

      let quoted = 0;
      let paid = 0;
      let dueDate = null;

      if (mode === 'full') {
        const amt = Number(data.get('totalAmount')) || 0;
        quoted = amt;
        paid = amt;
      } else if (mode === 'partial') {
        quoted = Number(data.get('quotedAmount')) || 0;
        paid = Number(data.get('paidAmount')) || 0;
        dueDate = data.get('dueDatePartial') || null;
      } else if (mode === 'unpaid') {
        quoted = Number(data.get('unpaidQuotedAmount')) || 0;
        paid = 0;
        dueDate = data.get('dueDateUnpaid') || null;
      }

      const payload = {
        name: data.get('name'),
        category: data.get('category'),
        quotedAmount: quoted,
        paidAmount: paid,
        settlementType: mode,
        dueDate: dueDate,
        notes: data.get('notes')
      };

      if (editingEventItemId) {
        ET.updateEventItem(eventId, editingEventItemId, payload);
        editingEventItemId = null;
      } else {
        ET.addEventItem(eventId, payload);
      }
      rerender();
    });

    const cancelItemEditBtn = container.querySelector('#cancel-item-edit-btn');
    if (cancelItemEditBtn) {
      cancelItemEditBtn.addEventListener('click', () => {
        editingEventItemId = null;
        rerender();
      });
    }

    container.querySelectorAll('.edit-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingEventItemId = btn.dataset.id;
        rerender();
        const formPanel = container.querySelector('#item-form-panel');
        if (formPanel) {
          formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    container.querySelectorAll('.settle-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.id;
        ET.settleEventItem(eventId, itemId);
        rerender();
      });
    });

    container.querySelectorAll('.delete-item-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const itemId = btn.dataset.id;
        const it = items.find((i) => i.id === itemId);
        const itName = it ? it.name : 'this item';
        const confirmed = await ET.showConfirm({
          title: 'Delete Cost Item',
          message: `Are you sure you want to delete "${itName}"?`,
          confirmText: 'Delete Item',
          cancelText: 'Cancel',
          isDestructive: true
        });

        if (confirmed) {
          if (editingEventItemId === itemId) {
            editingEventItemId = null;
          }
          ET.deleteEventItem(eventId, itemId);
          rerender();
        }
      });
    });
  }
})();
