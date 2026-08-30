(function () {
  'use strict';

  const ET = (window.ET = window.ET || {});

  const CURRENT_DB_SCHEMA = 'V2';
  ET.CURRENT_DB_SCHEMA = CURRENT_DB_SCHEMA;

  ET.KEYS = {
    schemaVersion: 'et.schemaVersion',
    settings: 'et.settings',
    expenses: 'et.expenses',
    incomeOverrides: 'et.incomeOverrides',
    events: 'et.events',
    excludedExpenses: 'et.excludedExpenses'
  };

  ET.load = function (key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  ET.save = function (key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  };

  // Migration V1 -> V2: Normalize event cost items with explicit settlementType
  function migrateV1ToV2(data) {
    const updated = Object.assign({}, data);
    if (Array.isArray(updated.events)) {
      updated.events = updated.events.map((evt) => {
        const items = Array.isArray(evt.items)
          ? evt.items.map((item) => {
              const quoted = Number(item.quotedAmount) || 0;
              const paid = Number(item.paidAmount) || 0;
              let status = item.status;
              let settlementType = item.settlementType;
              if (!settlementType) {
                if (paid >= quoted && quoted > 0) {
                  settlementType = 'full';
                  status = 'paid';
                } else if (paid > 0) {
                  settlementType = 'partial';
                  status = 'partial';
                } else {
                  settlementType = 'unpaid';
                  status = 'unpaid';
                }
              }
              return {
                ...item,
                quotedAmount: quoted,
                paidAmount: paid,
                status: status,
                settlementType: settlementType
              };
            })
          : [];
        return {
          ...evt,
          items: items
        };
      });
    }
    return updated;
  }

  // Schema initialization & migration pipeline
  ET.migrateData = function (source, fromVersion, toVersion) {
    let migrated = Object.assign({}, source);
    let currentVer = fromVersion || 'V1';

    if (currentVer === 'V1' && toVersion === 'V2') {
      migrated = migrateV1ToV2(migrated);
      currentVer = 'V2';
    }

    return {
      schemaVersion: toVersion,
      data: migrated
    };
  };

  ET.initSchema = function () {
    try {
      const storedVersion = localStorage.getItem(ET.KEYS.schemaVersion);
      if (!storedVersion) {
        localStorage.setItem(ET.KEYS.schemaVersion, CURRENT_DB_SCHEMA);
      } else if (storedVersion !== CURRENT_DB_SCHEMA) {
        // Run migration pipeline on local storage data if schema evolved
        const currentData = {
          settings: ET.load(ET.KEYS.settings, { currency: 'INR', defaultIncome: 0 }),
          expenses: ET.load(ET.KEYS.expenses, []),
          incomeOverrides: ET.load(ET.KEYS.incomeOverrides, {}),
          events: ET.load(ET.KEYS.events, []),
          excludedExpenses: ET.load(ET.KEYS.excludedExpenses, {})
        };
        const result = ET.migrateData(currentData, storedVersion, CURRENT_DB_SCHEMA);
        if (result && result.data) {
          if (result.data.settings) ET.save(ET.KEYS.settings, result.data.settings);
          if (result.data.expenses) ET.save(ET.KEYS.expenses, result.data.expenses);
          if (result.data.incomeOverrides) ET.save(ET.KEYS.incomeOverrides, result.data.incomeOverrides);
          if (result.data.events) ET.save(ET.KEYS.events, result.data.events);
          if (result.data.excludedExpenses) ET.save(ET.KEYS.excludedExpenses, result.data.excludedExpenses);
        }
        localStorage.setItem(ET.KEYS.schemaVersion, CURRENT_DB_SCHEMA);
      }
    } catch (e) {
      console.warn('Pennywise schema initialization notice:', e);
    }
  };

  ET.exportData = function () {
    const payload = {
      schemaVersion: CURRENT_DB_SCHEMA,
      version: 1, // Legacy backward compatibility
      exportedAt: new Date().toISOString(),
      data: {
        settings: ET.load(ET.KEYS.settings, { currency: 'INR', defaultIncome: 0 }),
        expenses: ET.load(ET.KEYS.expenses, []),
        incomeOverrides: ET.load(ET.KEYS.incomeOverrides, {}),
        events: ET.load(ET.KEYS.events, []),
        excludedExpenses: ET.load(ET.KEYS.excludedExpenses, {})
      }
    };
    return JSON.stringify(payload, null, 2);
  };

  ET.importData = function (jsonString) {
    let parsed;
    try {
      parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch {
      throw new Error('Invalid JSON format. Please select a valid backup file.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup file structure.');
    }

    const importedSchemaVersion = parsed.schemaVersion || (parsed.version === 1 ? 'V1' : 'V1');

    // Support both wrapped { schemaVersion, data: { ... } } and direct { settings, expenses, ... }
    const rawSource = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

    if (!rawSource.expenses && !rawSource.settings && !rawSource.incomeOverrides && !rawSource.events && !rawSource.excludedExpenses) {
      throw new Error('Backup file does not contain Pennywise data.');
    }

    // Run migration on imported data if schema version differs from current
    const migrationResult = ET.migrateData(rawSource, importedSchemaVersion, CURRENT_DB_SCHEMA);
    const source = migrationResult.data || rawSource;

    const expenses = Array.isArray(source.expenses) ? source.expenses : [];
    const settings = source.settings && typeof source.settings === 'object' ? source.settings : { currency: 'INR', defaultIncome: 0 };
    const overrides = source.incomeOverrides && typeof source.incomeOverrides === 'object' ? source.incomeOverrides : {};
    const events = Array.isArray(source.events) ? source.events : [];
    const excludedExpenses = source.excludedExpenses && typeof source.excludedExpenses === 'object' ? source.excludedExpenses : {};

    ET.save(ET.KEYS.expenses, expenses);
    ET.save(ET.KEYS.settings, settings);
    ET.save(ET.KEYS.incomeOverrides, overrides);
    ET.save(ET.KEYS.events, events);
    ET.save(ET.KEYS.excludedExpenses, excludedExpenses);
    localStorage.setItem(ET.KEYS.schemaVersion, CURRENT_DB_SCHEMA);

    return {
      success: true,
      schemaVersion: CURRENT_DB_SCHEMA,
      expensesCount: expenses.length,
      overridesCount: Object.keys(overrides).length,
      eventsCount: events.length,
      currency: settings.currency || 'INR'
    };
  };

  // Run schema initialization immediately
  ET.initSchema();

  // High-Resolution PNG Graphic Report Export
  ET.exportMonthToPNG = function (ym) {
    const parts = ym.split('-').map(Number);
    const FULL_MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = FULL_MONTH_NAMES[parts[1] - 1];
    const year = parts[0];

    const income = ET.incomeForMonth(ym);
    const spent = ET.totalForMonth(ym);
    const remaining = income - spent;
    const savedPct = income > 0 ? Math.max(0, Math.round(((income - spent) / income) * 100)) : 0;
    const spentPct = income > 0 ? Math.min(100, Math.round((spent / income) * 100)) : 0;
    const breakdown = ET.expenseBreakdown ? ET.expenseBreakdown(ym) : [];
    const items = ET.expensesForMonth(ym);

    const canvas = document.createElement('canvas');
    const scale = 2; // 2x retina
    const W = 840;
    const pad = 36;
    const cardW = W - pad * 2;
    const FONT = '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Type configuration for badges
    const TYPE_CONFIG = {
      household: { label: 'Household', bg: '#ffe4e6', text: '#be123c' },
      subscription: { label: 'Subscription', bg: '#e0f2fe', text: '#0369a1' },
      emi: { label: 'EMI', bg: '#ede9fe', text: '#6d28d9' },
      sip: { label: 'SIP', bg: '#e0e7ff', text: '#3730a3' },
      one_time: { label: 'One-Off', bg: '#fef3c7', text: '#b45309' },
      adhoc: { label: 'Miscellaneous', bg: '#f1f5f9', text: '#475569' }
    };

    // Calculate exact tight heights
    const headerH = 175;
    const bodyPadTop = 22;
    const kpiH = 92;
    const breakdownH = breakdown.length > 0 ? 140 : 0;
    const tableHeaderH = 36;
    const rowH = 44;
    const rowsH = Math.max(items.length * rowH, 50);
    const totalRowH = items.length > 0 ? 46 : 0;
    const tableTitleH = 34;
    const bodyPadBottom = 20;
    const footerH = 46;

    const bodyH = bodyPadTop + kpiH + (breakdownH > 0 ? breakdownH + 20 : 0) + 20 + tableTitleH + tableHeaderH + rowsH + totalRowH + footerH + bodyPadBottom;
    const cardH = headerH + bodyH;
    const totalH = cardH + pad * 2;

    canvas.width = W * scale;
    canvas.height = totalH * scale;

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    function roundRect(x, y, w, h, r, fill, stroke, strokeColor, lineWidth = 1) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = strokeColor || '#e2e8f0';
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    }

    function drawTopRoundedRect(x, y, w, h, r, fill) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
    }

    // 1. Canvas Background
    ctx.fillStyle = '#f1f5f4';
    ctx.fillRect(0, 0, W, totalH);

    // 2. Main Outer Card Container
    roundRect(pad, pad, cardW, cardH, 20, '#ffffff', true, '#e2e8f0');

    // 3. Top Header Panel (Emerald)
    drawTopRoundedRect(pad, pad, cardW, headerH, 20, '#0f3e36');

    // Brand row
    roundRect(pad + 24, pad + 20, 38, 38, 9, '#164e43', true, '#2d6a4f');
    ctx.fillStyle = '#52b788';
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PW', pad + 43, pad + 39);

    // Title & Tagline
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 19px ${FONT}`;
    ctx.fillText('Pennywise', pad + 72, pad + 36);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = `500 11px ${FONT}`;
    ctx.fillText('EVERY PENNY COUNTS', pad + 72, pad + 52);

    // Month Badge (Top Right)
    const monthBadgeText = `${monthName} ${year}`;
    ctx.font = `bold 12px ${FONT}`;
    const badgeTextW = ctx.measureText(monthBadgeText).width;
    const badgeW = badgeTextW + 24;
    roundRect(pad + cardW - badgeW - 24, pad + 24, badgeW, 28, 14, '#164e43', true, '#2d6a4f');
    ctx.fillStyle = '#a7f3d0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(monthBadgeText, pad + cardW - badgeW / 2 - 24, pad + 38);

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad + 24, pad + 70);
    ctx.lineTo(pad + cardW - 24, pad + 70);
    ctx.stroke();

    // Net Savings Section inside Header
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#a7f3d0';
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillText('• NET REMAINING', pad + 24, pad + 92);

    // Saved Pill Badge (Right)
    const savedPillText = `${savedPct}% Saved`;
    ctx.font = `bold 12px ${FONT}`;
    const savedPillW = ctx.measureText(savedPillText).width + 20;
    roundRect(pad + cardW - savedPillW - 24, pad + 80, savedPillW, 26, 13, '#164e43', true, '#2d6a4f');
    ctx.fillStyle = '#a3e635';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(savedPillText, pad + cardW - savedPillW / 2 - 24, pad + 93);

    // Big Number Amount
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 34px ${FONT}`;
    ctx.fillText(ET.formatAmount(remaining), pad + 24, pad + 130);

    // Progress Bar Track
    const trackX = pad + 24;
    const trackY = pad + 146;
    const trackW = cardW - 48;
    const trackH = 8;
    roundRect(trackX, trackY, trackW, trackH, 4, 'rgba(255, 255, 255, 0.16)');
    if (savedPct > 0) {
      const fillW = Math.max(8, Math.round((trackW * Math.min(100, savedPct)) / 100));
      roundRect(trackX, trackY, fillW, trackH, 4, '#52b788');
    }

    // 4. White Card Body Content
    let curY = pad + headerH + bodyPadTop;

    // 3 KPI Metric Cards
    const kpiGap = 12;
    const kpiW = (cardW - 48 - kpiGap * 2) / 3;
    const kpis = [
      { label: 'Monthly Income', val: ET.formatAmount(income), sub: 'Baseline budget', dot: '#10b981' },
      { label: 'Total Spent', val: ET.formatAmount(spent), sub: `${spentPct}% of income`, dot: '#f59e0b' },
      { label: 'Savings Rate', val: `${savedPct}%`, sub: remaining >= 0 ? 'On track' : 'Over budget', dot: '#0f766e' }
    ];

    kpis.forEach((k, idx) => {
      const kx = pad + 24 + idx * (kpiW + kpiGap);
      roundRect(kx, curY, kpiW, kpiH, 12, '#f8fafc', true, '#e2e8f0');

      ctx.beginPath();
      ctx.arc(kx + 16, curY + 22, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = k.dot;
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748b';
      ctx.font = `bold 10px ${FONT}`;
      ctx.fillText(k.label.toUpperCase(), kx + 26, curY + 22);

      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 18px ${FONT}`;
      ctx.fillText(k.val, kx + 16, curY + 54);

      ctx.fillStyle = '#94a3b8';
      ctx.font = `500 11px ${FONT}`;
      ctx.fillText(k.sub, kx + 16, curY + 74);
    });

    curY += kpiH + 20;

    // 5. Expense Breakdown (if available)
    if (breakdown.length > 0) {
      const sectionW = cardW - 48;
      roundRect(pad + 24, curY, sectionW, breakdownH, 12, '#f8fafc', true, '#e2e8f0');

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 13px ${FONT}`;
      ctx.fillText(`Expense Breakdown (${breakdown.length} categories)`, pad + 40, curY + 28);

      // Rounded clipping path for segmented bar
      const barX = pad + 40;
      const barY = curY + 42;
      const barW = sectionW - 32;
      const barH = 12;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(barX + 6, barY);
      ctx.lineTo(barX + barW - 6, barY);
      ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + 6);
      ctx.lineTo(barX + barW, barY + barH - 6);
      ctx.quadraticCurveTo(barX + barW, barY + barH, barX + barW - 6, barY + barH);
      ctx.lineTo(barX + 6, barY + barH);
      ctx.quadraticCurveTo(barX, barY + barH, barX, barY + barH - 6);
      ctx.lineTo(barX, barY + 6);
      ctx.quadraticCurveTo(barX, barY, barX + 6, barY);
      ctx.closePath();
      ctx.clip();

      // Background track
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(barX, barY, barW, barH);

      const COLORS = ['#0f766e', '#8b5cf6', '#f59e0b', '#0284c7', '#ec4899', '#10b981', '#6366f1', '#f97316'];
      let segX = barX;
      breakdown.forEach((item, idx) => {
        const segW = Math.max(4, (barW * item.pctRaw) / 100);
        ctx.fillStyle = COLORS[idx % COLORS.length];
        ctx.fillRect(segX, barY, segW, barH);
        segX += segW;
      });
      ctx.restore();

      // Legend items
      const legY = curY + 70;
      const legW = (sectionW - 32) / Math.min(breakdown.length, 3);
      breakdown.slice(0, 3).forEach((item, idx) => {
        const lx = pad + 40 + idx * legW;
        const color = COLORS[idx % COLORS.length];

        ctx.fillStyle = color;
        ctx.fillRect(lx, legY, 3.5, 32);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 12px ${FONT}`;
        const truncated = item.name.length > 16 ? item.name.slice(0, 14) + '...' : item.name;
        ctx.fillText(truncated, lx + 10, legY + 14);

        ctx.fillStyle = '#64748b';
        ctx.font = `500 11px ${FONT}`;
        ctx.fillText(`${ET.formatAmount(item.amount)} (${item.pct}%)`, lx + 10, legY + 29);
      });

      curY += breakdownH + 20;
    }

    // 6. Itemized Expenses Table
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(`Expenses in ${monthName} ${year} (${items.length})`, pad + 24, curY + 16);

    curY += tableTitleH;

    // Table Header Row
    const tableX = pad + 24;
    const tableW = cardW - 48;
    roundRect(tableX, curY, tableW, tableHeaderH, 6, '#f8fafc', true, '#e2e8f0');

    ctx.fillStyle = '#64748b';
    ctx.font = `bold 10px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('NAME', tableX + 16, curY + tableHeaderH / 2);
    ctx.fillText('TYPE', tableX + 260, curY + tableHeaderH / 2);
    ctx.fillText('CATEGORY', tableX + 400, curY + tableHeaderH / 2);
    ctx.textAlign = 'right';
    ctx.fillText('AMOUNT', tableX + tableW - 16, curY + tableHeaderH / 2);

    curY += tableHeaderH;

    if (items.length === 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      ctx.font = `13px ${FONT}`;
      ctx.fillText('Zero active expenses for this month.', tableX + tableW / 2, curY + 25);
      curY += 50;
    } else {
      items.forEach((item, idx) => {
        const rowY = curY + idx * rowH;
        if (idx % 2 === 1) {
          ctx.fillStyle = '#fafcfb';
          ctx.fillRect(tableX, rowY, tableW, rowH);
        }

        // Bottom border line
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tableX, rowY + rowH);
        ctx.lineTo(tableX + tableW, rowY + rowH);
        ctx.stroke();

        // Expense Name
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 13px ${FONT}`;
        const maxNameLen = 26;
        const nameText = item.name.length > maxNameLen ? item.name.slice(0, maxNameLen - 2) + '...' : item.name;
        ctx.fillText(nameText, tableX + 16, rowY + rowH / 2);

        // Type Pill (Center-Aligned)
        const typeCfg = TYPE_CONFIG[item.type] || { label: item.type.toUpperCase(), bg: '#f1f5f9', text: '#475569' };
        ctx.font = `bold 10px ${FONT}`;
        const pillTextW = ctx.measureText(typeCfg.label).width;
        const pillW = Math.max(64, pillTextW + 16);
        const pillH = 20;
        const pillX = tableX + 260;
        const pillY = rowY + (rowH - pillH) / 2;

        roundRect(pillX, pillY, pillW, pillH, 10, typeCfg.bg);
        ctx.fillStyle = typeCfg.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typeCfg.label, pillX + pillW / 2, pillY + pillH / 2);

        // Category
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#64748b';
        ctx.font = `12px ${FONT}`;
        ctx.fillText(item.category || '-', tableX + 400, rowY + rowH / 2);

        // Amount
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 13px ${FONT}`;
        ctx.fillText(ET.formatAmount(item.amount), tableX + tableW - 16, rowY + rowH / 2);
      });

      curY += items.length * rowH;

      // Total Summary Row
      roundRect(tableX, curY + 6, tableW, 36, 6, '#f8fafc', true, '#e2e8f0');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 12px ${FONT}`;
      ctx.fillText('Total Monthly Spend', tableX + 16, curY + 24);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f766e';
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(ET.formatAmount(spent), tableX + tableW - 16, curY + 24);

      curY += 46;
    }

    // 7. Footer Divider & Text inside main card
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad + 24, curY + 10);
    ctx.lineTo(pad + cardW - 24, curY + 10);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 11px ${FONT}`;
    ctx.fillText('Generated by Pennywise • Every Penny Counts • 100% Offline & Private', W / 2, curY + 28);

    // Convert to PNG blob & trigger download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pennywise-report-${ym}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  // High-Resolution Event & Program PNG Graphic Report Export
  ET.exportEventToPNG = function (eventId) {
    const event = ET.getEventById(eventId);
    if (!event) return;

    const sum = ET.eventSummary(event);
    const items = event.items || [];
    const dateStr = event.startDate ? `${event.startDate}${event.endDate ? ` → ${event.endDate}` : ''}` : 'Dates not specified';

    const canvas = document.createElement('canvas');
    const scale = 2; // 2x Retina
    const W = 840;
    const pad = 36;
    const cardW = W - pad * 2;
    const FONT = '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Calculate dynamic height
    const headerH = 175;
    const bodyPadTop = 22;
    const kpiH = 92;
    const notesH = event.notes ? 54 : 0;
    const tableTitleH = 34;
    const tableHeaderH = 36;
    const rowH = 46;
    const rowsH = Math.max(items.length * rowH, 50);
    const totalRowH = items.length > 0 ? 46 : 0;
    const bodyPadBottom = 20;
    const footerH = 46;

    const bodyH = bodyPadTop + kpiH + (notesH > 0 ? notesH + 16 : 0) + 16 + tableTitleH + tableHeaderH + rowsH + totalRowH + footerH + bodyPadBottom;
    const cardH = headerH + bodyH;
    const totalH = cardH + pad * 2;

    canvas.width = W * scale;
    canvas.height = totalH * scale;

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    function roundRect(x, y, w, h, r, fill, stroke, strokeColor, lineWidth = 1) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = strokeColor || '#e2e8f0';
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    }

    function drawTopRoundedRect(x, y, w, h, r, fill) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
    }

    // 1. Background
    ctx.fillStyle = '#f1f5f4';
    ctx.fillRect(0, 0, W, totalH);

    // 2. Main Outer Card
    roundRect(pad, pad, cardW, cardH, 20, '#ffffff', true, '#e2e8f0');

    // 3. Top Header Panel (Emerald)
    drawTopRoundedRect(pad, pad, cardW, headerH, 20, '#0f3e36');

    // Brand Monogram
    roundRect(pad + 24, pad + 20, 38, 38, 9, '#164e43', true, '#2d6a4f');
    ctx.fillStyle = '#52b788';
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PW', pad + 43, pad + 39);

    // Brand Title & Tagline
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillText('Pennywise', pad + 72, pad + 30);
    ctx.fillStyle = '#52b788';
    ctx.font = `600 9.5px ${FONT}`;
    ctx.fillText('EVERY PENNY COUNTS', pad + 72, pad + 47);

    // Right Status Badge
    const isSettled = sum.totalPending === 0 && sum.totalQuoted > 0;
    const badgeText = isSettled ? 'Fully Settled' : `${sum.progressPct}% Settled`;
    const badgeBg = isSettled ? 'rgba(82, 183, 136, 0.25)' : 'rgba(255, 255, 255, 0.15)';
    const badgeBorder = isSettled ? '#52b788' : 'rgba(255, 255, 255, 0.3)';
    const badgeColor = isSettled ? '#a7f3d0' : '#ffffff';

    roundRect(pad + cardW - 130, pad + 24, 106, 26, 13, badgeBg, true, badgeBorder);
    ctx.fillStyle = badgeColor;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, pad + cardW - 77, pad + 37);

    // Event Title & Dates in Header
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(event.name, pad + 24, pad + 90);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = `500 12.5px ${FONT}`;
    ctx.fillText(dateStr, pad + 24, pad + 112);

    // Header Progress Bar
    const progTrackX = pad + 24;
    const progTrackY = pad + 134;
    const progTrackW = cardW - 48;
    roundRect(progTrackX, progTrackY, progTrackW, 8, 4, 'rgba(255,255,255,0.2)');
    if (sum.progressPct > 0) {
      const progFillW = Math.max(8, (progTrackW * sum.progressPct) / 100);
      roundRect(progTrackX, progTrackY, progFillW, 8, 4, '#52b788');
    }

    // Mini Subtext under progress
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `500 11px ${FONT}`;
    ctx.fillText(`Quoted Total: ${ET.formatAmount(sum.totalQuoted)}   •   Paid: ${ET.formatAmount(sum.totalPaid)}   •   Pending: ${ET.formatAmount(sum.totalPending)}`, progTrackX, pad + 158);

    let curY = pad + headerH + bodyPadTop;

    // 4. KPI Row (4 Cards)
    const kpiGap = 12;
    const kpiCount = 4;
    const kpiW = (cardW - 48 - kpiGap * (kpiCount - 1)) / kpiCount;

    const kpis = [
      { label: 'Quoted Total', val: ET.formatAmount(sum.totalQuoted), sub: `${sum.itemsCount} cost items`, valColor: '#0f172a' },
      { label: 'Total Paid (Advance)', val: ET.formatAmount(sum.totalPaid), sub: `${sum.paidCount} paid, ${sum.partialCount} advance`, valColor: '#0f766e' },
      { label: 'Pending Balance', val: ET.formatAmount(sum.totalPending), sub: `${sum.unpaidCount} unpaid items`, valColor: sum.totalPending > 0 ? '#b91c1c' : '#0f172a' },
      { label: 'Settlement Rate', val: `${sum.progressPct}%`, sub: isSettled ? 'Completed' : 'In Progress', valColor: '#0f766e' }
    ];

    kpis.forEach((k, idx) => {
      const kx = pad + 24 + idx * (kpiW + kpiGap);
      roundRect(kx, curY, kpiW, kpiH, 10, '#f8fafc', true, '#e2e8f0');

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748b';
      ctx.font = `bold 10px ${FONT}`;
      ctx.fillText(k.label.toUpperCase(), kx + 12, curY + 18);

      ctx.fillStyle = k.valColor;
      ctx.font = `bold 17px ${FONT}`;
      ctx.fillText(k.val, kx + 12, curY + 46);

      ctx.fillStyle = '#94a3b8';
      ctx.font = `500 10.5px ${FONT}`;
      ctx.fillText(k.sub, kx + 12, curY + 72);
    });

    curY += kpiH;

    // Optional Program Notes Box
    if (event.notes) {
      curY += 16;
      roundRect(pad + 24, curY, cardW - 48, notesH, 8, '#f1f5f9', true, '#e2e8f0');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#0f766e';
      ctx.font = `bold 10.5px ${FONT}`;
      ctx.fillText('PROGRAM NOTES:', pad + 38, curY + 10);

      ctx.fillStyle = '#334155';
      ctx.font = `12px ${FONT}`;
      ctx.fillText(event.notes.length > 95 ? `${event.notes.slice(0, 92)}...` : event.notes, pad + 38, curY + 28);
      curY += notesH;
    }

    curY += 16;

    // 5. Itemized Table
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText(`Cost Items & Advance Payments (${items.length})`, pad + 24, curY + 16);

    curY += tableTitleH;

    const tableX = pad + 24;
    const tableW = cardW - 48;
    roundRect(tableX, curY, tableW, tableHeaderH, 6, '#f8fafc', true, '#e2e8f0');

    ctx.fillStyle = '#64748b';
    ctx.font = `bold 10px ${FONT}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('ITEM & DETAILS', tableX + 16, curY + tableHeaderH / 2);
    ctx.fillText('CATEGORY', tableX + 220, curY + tableHeaderH / 2);
    ctx.fillText('DUE DATE', tableX + 320, curY + tableHeaderH / 2);
    ctx.fillText('STATUS', tableX + 410, curY + tableHeaderH / 2);
    ctx.textAlign = 'right';
    ctx.fillText('QUOTED', tableX + 540, curY + tableHeaderH / 2);
    ctx.fillText('PAID', tableX + 630, curY + tableHeaderH / 2);
    ctx.fillText('BALANCE', tableX + tableW - 16, curY + tableHeaderH / 2);

    curY += tableHeaderH;

    if (items.length === 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#94a3b8';
      ctx.font = `13px ${FONT}`;
      ctx.fillText('No expense items recorded for this program.', tableX + tableW / 2, curY + 25);
      curY += 50;
    } else {
      items.forEach((item, idx) => {
        const rowY = curY + idx * rowH;
        if (idx % 2 === 1) {
          ctx.fillStyle = '#fafcfb';
          ctx.fillRect(tableX, rowY, tableW, rowH);
        }

        // Item Name & Notes
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 12.5px ${FONT}`;
        const displayName = item.name.length > 24 ? `${item.name.slice(0, 22)}...` : item.name;
        ctx.fillText(displayName, tableX + 16, rowY + (item.notes ? rowH / 2 - 7 : rowH / 2));

        if (item.notes) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `10.5px ${FONT}`;
          const subNote = item.notes.length > 28 ? `${item.notes.slice(0, 26)}...` : item.notes;
          ctx.fillText(subNote, tableX + 16, rowY + rowH / 2 + 9);
        }

        // Category
        ctx.fillStyle = '#64748b';
        ctx.font = `12px ${FONT}`;
        ctx.fillText(item.category || '-', tableX + 220, rowY + rowH / 2);

        // Due Date
        ctx.fillStyle = '#64748b';
        ctx.font = `11.5px ${FONT}`;
        ctx.fillText(item.dueDate || '-', tableX + 320, rowY + rowH / 2);

        // Status Badge
        const isItemPaid = item.status === 'paid';
        const isItemPartial = item.status === 'partial';
        const itemTagBg = isItemPaid ? '#dcfce7' : isItemPartial ? '#e0f2fe' : '#f1f5f9';
        const itemTagText = isItemPaid ? '#15803d' : isItemPartial ? '#0369a1' : '#475569';
        const itemTagLabel = isItemPaid ? 'Fully Paid' : isItemPartial ? 'Advance' : 'Unpaid';

        const pillW = 74;
        const pillH = 22;
        const pillX = tableX + 410;
        const pillY = rowY + (rowH - pillH) / 2;
        roundRect(pillX, pillY, pillW, pillH, 11, itemTagBg);

        ctx.fillStyle = itemTagText;
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(itemTagLabel, pillX + pillW / 2, pillY + pillH / 2);

        // Quoted
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 12.5px ${FONT}`;
        ctx.fillText(ET.formatAmount(item.quotedAmount), tableX + 540, rowY + rowH / 2);

        // Paid
        ctx.fillStyle = '#0f766e';
        ctx.fillText(ET.formatAmount(item.paidAmount), tableX + 630, rowY + rowH / 2);

        // Balance
        const pending = Math.max(0, (Number(item.quotedAmount) || 0) - (Number(item.paidAmount) || 0));
        ctx.fillStyle = pending > 0 ? '#b91c1c' : '#94a3b8';
        ctx.fillText(pending > 0 ? ET.formatAmount(pending) : '-', tableX + tableW - 16, rowY + rowH / 2);
      });

      curY += items.length * rowH;

      // Summary Ledger Total Row
      roundRect(tableX, curY + 6, tableW, 36, 6, '#f8fafc', true, '#e2e8f0');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 12px ${FONT}`;
      ctx.fillText('Grand Total', tableX + 16, curY + 24);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold 13px ${FONT}`;
      ctx.fillText(ET.formatAmount(sum.totalQuoted), tableX + 540, curY + 24);

      ctx.fillStyle = '#0f766e';
      ctx.fillText(ET.formatAmount(sum.totalPaid), tableX + 630, curY + 24);

      ctx.fillStyle = sum.totalPending > 0 ? '#b91c1c' : '#0f172a';
      ctx.fillText(sum.totalPending > 0 ? ET.formatAmount(sum.totalPending) : 'Settled', tableX + tableW - 16, curY + 24);

      curY += 46;
    }

    // 6. Footer Divider & Text
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad + 24, curY + 10);
    ctx.lineTo(pad + cardW - 24, curY + 10);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 11px ${FONT}`;
    ctx.fillText('Generated by Pennywise • Every Penny Counts • 100% Offline & Private', W / 2, curY + 28);

    // Convert to PNG & Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (event.name || 'Program').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      a.download = `pennywise-program-${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  // Excel (.xlsx / SpreadsheetML XML) Export
  ET.exportMonthToExcel = function (ym) {
    const parts = ym.split('-').map(Number);
    const FULL_MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = FULL_MONTH_NAMES[parts[1] - 1];
    const year = parts[0];

    const income = ET.incomeForMonth(ym);
    const spent = ET.totalForMonth(ym);
    const remaining = income - spent;
    const savedPct = income > 0 ? Math.round(((income - spent) / income) * 100) : 0;
    const items = ET.expensesForMonth(ym);
    const currency = ET.getCurrency ? ET.getCurrency().code : 'INR';

    function escapeXml(str) {
      return String(str || '').replace(/[<>&'"]/g, (c) => ({
        '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
      }[c]));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0F3E36"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F3E36" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Currency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="CurrencyBold">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:Bold="1"/>
   <NumberFormat ss:Format="#,##0.00"/>
  </Style>
  <Style ss:ID="TotalRow">
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="2" ss:Color="#0F3E36"/>
   </Borders>
   <Font ss:Bold="1"/>
   <Interior ss:Color="#F1F5F3" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Monthly Summary">
  <Table ss:DefaultColumnWidth="140">
   <Column ss:Width="220"/>
   <Column ss:Width="140"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="Title"><Data ss:Type="String">Pennywise — ${escapeXml(monthName)} ${year} Financial Summary</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Subtitle"><Data ss:Type="String">Every Penny Counts | Currency: ${escapeXml(currency)} | Exported: ${new Date().toISOString().slice(0, 10)}</Data></Cell>
   </Row>
   <Row/>
   <Row ss:Height="20">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Metric</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Amount</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Monthly Income</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${income}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Total Expenses</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${spent}</Data></Cell>
   </Row>
   <Row ss:StyleID="TotalRow">
    <Cell><Data ss:Type="String">Net Savings / Remaining</Data></Cell>
    <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${remaining}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">Savings Rate</Data></Cell>
    <Cell><Data ss:Type="String">${savedPct}%</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Itemized Expenses">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="200"/>
   <Column ss:Width="120"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Row ss:Height="24">
    <Cell ss:StyleID="Title"><Data ss:Type="String">Pennywise Expenses: ${escapeXml(monthName)} ${year}</Data></Cell>
   </Row>
   <Row/>
   <Row ss:Height="20">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Expense Name</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Type</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Category</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Amount (${escapeXml(currency)})</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Start Date</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">End Date</Data></Cell>
   </Row>
   ${items.map((i) => `
   <Row>
    <Cell><Data ss:Type="String">${escapeXml(i.name)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(ET.typeLabel ? ET.typeLabel(i.type) : i.type)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.category || '-')}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${i.amount}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.startDate || '-')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(i.endDate || 'ongoing')}</Data></Cell>
   </Row>`).join('')}
   <Row ss:StyleID="TotalRow">
    <Cell><Data ss:Type="String">Total Monthly Spend</Data></Cell>
    <Cell/>
    <Cell/>
    <Cell ss:StyleID="CurrencyBold"><Data ss:Type="Number">${spent}</Data></Cell>
    <Cell/>
    <Cell/>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pennywise-report-${ym}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CSV Export
  ET.exportMonthToCSV = function (ym) {
    const parts = ym.split('-').map(Number);
    const FULL_MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = FULL_MONTH_NAMES[parts[1] - 1];
    const year = parts[0];
    const items = ET.expensesForMonth(ym);

    const headers = ['Expense Name', 'Type', 'Category', 'Amount', 'Start Date', 'End Date'];
    const rows = items.map((i) => [
      `"${(i.name || '').replace(/"/g, '""')}"`,
      `"${ET.typeLabel ? ET.typeLabel(i.type) : i.type}"`,
      `"${(i.category || '').replace(/"/g, '""')}"`,
      i.amount,
      `"${i.startDate || ''}"`,
      `"${i.endDate || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pennywise-expenses-${ym}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
})();
