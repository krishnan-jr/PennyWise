(function () {
  'use strict';

  const ET = (window.ET = window.ET || {});

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const FULL_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const BREAKDOWN_COLORS = [
    '#0f766e', // Deep emerald/teal
    '#8b5cf6', // Violet
    '#f59e0b', // Amber / warm gold
    '#0284c7', // Sky blue
    '#ec4899', // Pink / magenta
    '#10b981', // Emerald green
    '#6366f1', // Indigo
    '#f97316', // Orange
    '#64748b'  // Muted slate
  ];

  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  ET.currentYM = function () {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  function shiftYM(ym, delta) {
    const parts = ym.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function formatYM(ym) {
    const parts = ym.split('-').map(Number);
    return `${FULL_MONTH_NAMES[parts[1] - 1]} ${parts[0]}`;
  }

  ET.renderDashboard = function (container, state, onChange) {
    const ym = state.month;
    const year = Number(ym.split('-')[0]);
    const monthIdx = Number(ym.split('-')[1]) - 1;

    const income = ET.incomeForMonth(ym);
    const spent = ET.totalForMonth(ym);
    const remaining = income - spent;
    const savedPct = income > 0 ? Math.max(0, Math.round(((income - spent) / income) * 100)) : 0;
    const spentPct = income > 0 ? Math.min(100, Math.round((spent / income) * 100)) : (spent > 0 ? 100 : 0);

    const isOverridden = ET.isOverridden(ym);
    const breakdown = ET.expenseBreakdown(ym);

    container.innerHTML = `
      <div class="month-nav-card">
        <div class="month-nav-title">
          <h2>${FULL_MONTH_NAMES[monthIdx]} ${year}</h2>
          <span class="month-badge">${isOverridden ? 'Custom Income' : 'Default Income'}</span>
        </div>
        <div class="month-nav-controls">
          <div class="export-dropdown-wrap">
            <button id="export-menu-btn" class="btn-nav btn-nav-export" title="Export Month Report" aria-label="Export Month Report">
              Export
            </button>
            <div id="export-dropdown-menu" class="export-menu" hidden>
              <button class="export-menu-item" id="export-png-btn">
                <span class="export-item-title">Download Graphic Report (.png)</span>
                <span class="export-item-sub">High-resolution visual summary</span>
              </button>
              <button class="export-menu-item" id="export-excel-btn">
                <span class="export-item-title">Download Excel (.xlsx)</span>
                <span class="export-item-sub">Formatted workbook with sheets</span>
              </button>
              <button class="export-menu-item" id="export-csv-btn">
                <span class="export-item-title">Download CSV (.csv)</span>
                <span class="export-item-sub">Raw spreadsheet data</span>
              </button>
            </div>
          </div>
          <button id="prev-month" class="btn-nav" title="Previous month" aria-label="Previous month">&larr;</button>
          <button id="next-month" class="btn-nav" title="Next month" aria-label="Next month">&rarr;</button>
        </div>
      </div>

      ${isOverridden ? `
        <div class="override-banner">
          <span>Income customized for this month (${ET.formatAmount(income)})</span>
          <button id="clear-override" class="link-btn">Reset to default</button>
        </div>` : ''}

      <section class="kpi-grid">
        <div class="kpi kpi-hero ${remaining < 0 ? 'kpi-negative' : ''}">
          <div class="kpi-header">
            <span class="kpi-label">
              <span class="kpi-dot hero"></span>
              ${remaining < 0 ? 'Net Deficit' : 'Net Remaining'}
            </span>
            <span class="kpi-subtext">${savedPct}% saved</span>
          </div>
          <div class="kpi-value">${ET.formatAmount(Math.abs(remaining))}</div>
          <div class="progress-wrap">
            <div class="progress-track">
              <div class="progress-fill" style="width: ${Math.min(100, Math.max(0, savedPct))}%;"></div>
            </div>
          </div>
        </div>

        <div class="kpi">
          <div class="kpi-header">
            <span class="kpi-label">
              <span class="kpi-dot income"></span>
              Monthly Income
            </span>
          </div>
          <div class="kpi-value">${ET.formatAmount(income)}</div>
          <div class="income-input-wrap">
            <input id="override-income" class="income-input" type="number" min="0" step="any" placeholder="Set custom" value="${income || ''}" />
          </div>
        </div>

        <div class="kpi">
          <div class="kpi-header">
            <span class="kpi-label">
              <span class="kpi-dot spent"></span>
              Total Spent
            </span>
          </div>
          <div class="kpi-value">${ET.formatAmount(spent)}</div>
          <span class="kpi-subtext">${income > 0 ? `${spentPct}% of income` : 'No income set'}</span>
        </div>

        <div class="kpi">
          <div class="kpi-header">
            <span class="kpi-label">
              <span class="kpi-dot saved"></span>
              Savings Rate
            </span>
          </div>
          <div class="kpi-value">${savedPct}%</div>
          <span class="kpi-subtext">${remaining >= 0 ? 'On track' : 'Over budget'}</span>
        </div>
      </section>

      <!-- Expense Breakdown Section -->
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3 class="panel-title">Expense Breakdown</h3>
          </div>
          <span class="panel-badge">${breakdown.length} ${breakdown.length === 1 ? 'expense' : 'expenses'}</span>
        </div>

        ${breakdown.length === 0 ? `
          <div class="empty-box"><p>No expense data to break down for this month.</p></div>
        ` : `
          <div class="breakdown-bar-wrap">
            <div class="breakdown-bar">
              ${breakdown.map((item, idx) => `
                <div class="breakdown-segment" style="width: ${item.pctRaw}%; background-color: ${BREAKDOWN_COLORS[idx % BREAKDOWN_COLORS.length]};" title="${escapeHtml(item.name)}: ${item.pct}% (${ET.formatAmount(item.amount)})"></div>
              `).join('')}
            </div>
          </div>

          <div class="breakdown-grid">
            ${breakdown.map((item, idx) => {
              const color = BREAKDOWN_COLORS[idx % BREAKDOWN_COLORS.length];
              return `
                <div class="breakdown-item">
                  <div class="breakdown-left">
                    <span class="breakdown-color-bar" style="background-color: ${color};"></span>
                    <div class="breakdown-info">
                      <span class="breakdown-name">${escapeHtml(item.name)}</span>
                      <span class="breakdown-amount amount-cell">${ET.formatAmount(item.amount)}${item.category ? ` &bull; ${escapeHtml(item.category)}` : ''}</span>
                    </div>
                  </div>
                  <span class="breakdown-pct">${item.pct}%</span>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3 class="panel-title">Expenses in ${MONTH_NAMES[monthIdx]} ${year}</h3>
          </div>
          <div id="month-badge-wrap"></div>
        </div>
        <div id="month-expenses"></div>
      </section>

      <!-- 12-Month Expense Trend Chart -->
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3 class="panel-title">12-Month Spending Trend</h3>
          </div>
          <span class="hint">Past 12 months &bull; Hover or tap point to inspect</span>
        </div>
        <div id="trend-chart-container" class="trend-chart-wrap"></div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3 class="panel-title">${year} Annual Overview</h3>
          </div>
          <span class="hint">Tap any month to inspect</span>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Month</th>
                <th class="text-right">Spent</th>
                <th class="text-right">Income</th>
                <th class="text-right">Saved %</th>
              </tr>
            </thead>
            <tbody id="year-rows"></tbody>
          </table>
        </div>
      </section>
    `;

    function rerender() {
      ET.renderDashboard(container, state, onChange);
    }

    const exportBtn = container.querySelector('#export-menu-btn');
    const exportMenu = container.querySelector('#export-dropdown-menu');
    if (exportBtn && exportMenu) {
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.hidden = !exportMenu.hidden;
      });

      document.addEventListener('click', () => {
        if (exportMenu) exportMenu.hidden = true;
      });

      const pngBtn = container.querySelector('#export-png-btn');
      if (pngBtn) {
        pngBtn.addEventListener('click', () => {
          exportMenu.hidden = true;
          ET.exportMonthToPNG(ym);
        });
      }

      const excelBtn = container.querySelector('#export-excel-btn');
      if (excelBtn) {
        excelBtn.addEventListener('click', () => {
          exportMenu.hidden = true;
          ET.exportMonthToExcel(ym);
        });
      }

      const csvBtn = container.querySelector('#export-csv-btn');
      if (csvBtn) {
        csvBtn.addEventListener('click', () => {
          exportMenu.hidden = true;
          ET.exportMonthToCSV(ym);
        });
      }
    }

    container.querySelector('#prev-month').addEventListener('click', () => {
      state.month = shiftYM(state.month, -1);
      rerender();
    });
    container.querySelector('#next-month').addEventListener('click', () => {
      state.month = shiftYM(state.month, 1);
      rerender();
    });

    const overrideInput = container.querySelector('#override-income');
    overrideInput.addEventListener('change', () => {
      ET.setOverride(ym, overrideInput.value);
      rerender();
      if (onChange) onChange();
    });

    const clearBtn = container.querySelector('#clear-override');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        ET.setOverride(ym, null);
        rerender();
        if (onChange) onChange();
      });
    }

    const listEl = container.querySelector('#month-expenses');
    const badgeWrap = container.querySelector('#month-badge-wrap');
    const items = ET.expensesForMonth(ym);
    const excluded = ET.getExcludedExpensesForMonth(ym);

    if (badgeWrap) {
      badgeWrap.innerHTML = `<span class="panel-badge">${items.length} ${items.length === 1 ? 'item' : 'items'}</span>`;
    }

    let itemsHtml = '';
    if (items.length === 0) {
      itemsHtml = '<div class="empty-box"><p>Zero active expenses for this month.</p></div>';
    } else {
      itemsHtml = `
        <div class="table-wrap">
          <table class="table table-expenses">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((e) => `
                <tr class="expense-row">
                  <td class="cell-name">
                    <span class="expense-name">${escapeHtml(e.name)}</span>
                    <div class="expense-meta-mobile">
                      <span class="tag tag-${e.type}">${ET.typeLabel(e.type)}</span>
                      ${e.category ? `<span class="expense-cat">${escapeHtml(e.category)}</span>` : ''}
                    </div>
                  </td>
                  <td class="cell-type"><span class="tag tag-${e.type}">${ET.typeLabel(e.type)}</span></td>
                  <td class="cell-cat">${escapeHtml(e.category) || '-'}</td>
                  <td class="text-right amount-cell cell-amount">
                    <strong>${ET.formatAmount(e.amount)}</strong>
                  </td>
                  <td class="text-right cell-action">
                    <div class="actions-cell-wrap">
                      <button class="link-btn link-btn-danger delete-month-expense" data-id="${e.id}">Delete</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    let excludedHtml = '';
    if (excluded.length > 0) {
      excludedHtml = `
        <div class="excluded-box">
          <div class="excluded-header">
            <span class="excluded-title">Excluded from ${formatYM(ym)} (${excluded.length})</span>
            <span class="hint">Skipped for this month only</span>
          </div>
          <div class="excluded-list">
            ${excluded.map((e) => `
              <div class="excluded-item">
                <div class="excluded-item-info">
                  <span class="excluded-name">${escapeHtml(e.name)}</span>
                  <span class="tag tag-${e.type}">${ET.typeLabel(e.type)}</span>
                  <span class="excluded-amt">${ET.formatAmount(e.amount)}</span>
                </div>
                <button class="btn btn-sm btn-secondary restore-expense-btn" data-id="${e.id}">
                  Restore
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    listEl.innerHTML = itemsHtml + excludedHtml;

    listEl.querySelectorAll('.delete-month-expense').forEach((btn) => {
      btn.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const id = btn.dataset.id;
        const exp = ET.getExpenseById(id);
        const expName = exp ? exp.name : 'this expense';
        const confirmed = await ET.showConfirm({
          title: `Exclude from ${formatYM(ym)}`,
          message: `Do you want to exclude "${expName}" from ${formatYM(ym)}? It will remain in master data and other months.`,
          confirmText: 'Exclude from Month',
          cancelText: 'Keep',
          isDestructive: true
        });
        if (confirmed) {
          ET.excludeExpenseFromMonth(id, ym);
          rerender();
          if (onChange) onChange();
        }
      });
    });

    listEl.querySelectorAll('.restore-expense-btn').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const id = btn.dataset.id;
        ET.restoreExpenseToMonth(id, ym);
        rerender();
        if (onChange) onChange();
      });
    });

    // Render 12-Month Spending Trend Chart
    const trendContainer = container.querySelector('#trend-chart-container');
    if (trendContainer) {
      renderTrendChart(trendContainer, ym, (selectedMonth) => {
        state.month = selectedMonth;
        rerender();
      });
    }

    const yearData = ET.yearSummary(year);
    const maxSpent = Math.max(...yearData.map((d) => d.total), 1);
    const rowsEl = container.querySelector('#year-rows');

    rowsEl.innerHTML = yearData
      .map(({ ym: m, total }) => {
        const inc = ET.incomeForMonth(m);
        const pct = inc > 0 ? Math.round(((inc - total) / inc) * 100) : 0;
        const label = MONTH_NAMES[Number(m.split('-')[1]) - 1];
        const barPct = total > 0 ? Math.max(8, Math.round((total / maxSpent) * 100)) : 0;

        return `
          <tr class="${m === state.month ? 'row-active' : ''} row-link" data-ym="${m}">
            <td><strong>${label}</strong></td>
            <td class="text-right">
              <div class="year-bar-cell">
                <span class="amount-cell">${total > 0 ? ET.formatAmount(total) : '-'}</span>
                ${total > 0 ? `<span class="year-bar-track"><span class="year-bar-fill" style="width: ${barPct}%;"></span></span>` : ''}
              </div>
            </td>
            <td class="text-right amount-cell">${inc > 0 ? ET.formatAmount(inc) : '-'}</td>
            <td class="text-right amount-cell">${inc > 0 ? `${pct}%` : '-'}</td>
          </tr>`;
      })
      .join('');

    rowsEl.querySelectorAll('.row-link').forEach((row) => {
      row.addEventListener('click', () => {
        state.month = row.dataset.ym;
        rerender();
      });
    });
  };

  function renderTrendChart(chartContainer, selectedYM, onSelectMonth) {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      months.push(shiftYM(selectedYM, -i));
    }

    const series = months.map((m) => {
      const parts = m.split('-').map(Number);
      return {
        ym: m,
        label: MONTH_NAMES[parts[1] - 1],
        year: parts[0],
        fullLabel: `${FULL_MONTH_NAMES[parts[1] - 1]} ${parts[0]}`,
        spent: ET.totalForMonth(m),
        income: ET.incomeForMonth(m)
      };
    });

    const maxSpent = Math.max(...series.map((s) => s.spent), 100);
    let yMax = Math.ceil((maxSpent * 1.15) / 1000) * 1000;
    if (yMax < 1000) yMax = 1000;

    const points = series.map((s, idx) => {
      const xPct = (idx / (series.length - 1)) * 100;
      const yPct = 100 - (s.spent / yMax) * 100;
      return { ...s, xPct, yPct, idx };
    });

    // Spline curve generation in 0..100 percentage coordinate space
    let pathD = `M ${points[0].xPct.toFixed(2)} ${points[0].yPct.toFixed(2)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.xPct + (p2.xPct - p0.xPct) / 6;
      const cp1y = p1.yPct + (p2.yPct - p0.yPct) / 6;
      const cp2x = p2.xPct - (p3.xPct - p1.xPct) / 6;
      const cp2y = p2.yPct - (p3.yPct - p1.yPct) / 6;

      pathD += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.xPct.toFixed(2)} ${p2.yPct.toFixed(2)}`;
    }

    const lastXPct = points[points.length - 1].xPct.toFixed(2);
    const firstXPct = points[0].xPct.toFixed(2);
    const areaD = `${pathD} L ${lastXPct} 100 L ${firstXPct} 100 Z`;

    const yTicks = [
      { val: yMax, yPct: 0 },
      { val: Math.round((yMax * 2) / 3), yPct: 33.3 },
      { val: Math.round(yMax / 3), yPct: 66.6 },
      { val: 0, yPct: 100 }
    ];

    const cur = ET.getCurrency().symbol;
    function formatYLabel(val) {
      if (val === 0) return `${cur}0`;
      if (val >= 100000) return `${cur}${(val / 100000).toFixed(1).replace(/\.0$/, '')}L`;
      if (val >= 1000) return `${cur}${Math.round(val / 1000)}k`;
      const inK = Math.round((val / 1000) * 10) / 10;
      return inK >= 1 ? `${cur}${Math.round(inK)}k` : `${cur}${inK}k`;
    }

    const selectedIdx = points.findIndex((p) => p.ym === selectedYM);
    const initPoint = selectedIdx !== -1 ? points[selectedIdx] : points[points.length - 1];

    chartContainer.innerHTML = `
      <div class="trend-chart-inner">
        <div class="trend-chart-body">
          <!-- HTML Y-Axis Labels -->
          <div class="chart-y-axis">
            ${yTicks.map((t) => `<span class="chart-y-label">${formatYLabel(t.val)}</span>`).join('')}
          </div>

          <!-- Chart Drawing Area -->
          <div class="chart-plot-area">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="trend-chart-svg">
              <defs>
                <linearGradient id="trend-area-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0f766e" stop-opacity="0.32" />
                  <stop offset="65%" stop-color="#0f766e" stop-opacity="0.08" />
                  <stop offset="100%" stop-color="#0f766e" stop-opacity="0.0" />
                </linearGradient>
              </defs>

              <!-- Grid Lines -->
              <line x1="0" y1="0" x2="100" y2="0" class="chart-grid-line" vector-effect="non-scaling-stroke" />
              <line x1="0" y1="33.3" x2="100" y2="33.3" class="chart-grid-line" vector-effect="non-scaling-stroke" />
              <line x1="0" y1="66.6" x2="100" y2="66.6" class="chart-grid-line" vector-effect="non-scaling-stroke" />
              <line x1="0" y1="100" x2="100" y2="100" class="chart-grid-line" vector-effect="non-scaling-stroke" />

              <!-- Area Fill & Spline Line -->
              <path d="${areaD}" fill="url(#trend-area-gradient)" class="chart-area-path" />
              <path d="${pathD}" class="chart-line-path" fill="none" stroke="#0f766e" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />
            </svg>

            <!-- Interactive Focus Line & Dot -->
            <div id="chart-focus-line" class="chart-focus-line"></div>
            <div id="chart-focus-halo" class="chart-focus-halo"></div>
            <div id="chart-focus-dot" class="chart-focus-dot"></div>

            <!-- Floating Tooltip Card -->
            <div id="chart-tooltip" class="chart-tooltip">
              <div class="chart-tooltip-title" id="chart-tooltip-month">${initPoint.fullLabel}</div>
              <div class="chart-tooltip-val">
                <span class="chart-tooltip-dot"></span>
                <span id="chart-tooltip-spent">${ET.formatAmount(initPoint.spent)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- HTML X-Axis Month Labels -->
        <div class="chart-x-axis">
          ${points.map((p) => `
            <span class="chart-x-label ${p.ym === selectedYM ? 'chart-x-active' : ''}" data-ym="${p.ym}">${p.label}</span>
          `).join('')}
        </div>
      </div>
    `;

    const plotArea = chartContainer.querySelector('.chart-plot-area');
    const tooltipEl = chartContainer.querySelector('#chart-tooltip');
    const focusLine = chartContainer.querySelector('#chart-focus-line');
    const focusHalo = chartContainer.querySelector('#chart-focus-halo');
    const focusDot = chartContainer.querySelector('#chart-focus-dot');
    const tooltipMonth = chartContainer.querySelector('#chart-tooltip-month');
    const tooltipSpent = chartContainer.querySelector('#chart-tooltip-spent');

    function updateFocus(point) {
      if (!point || !focusLine || !tooltipEl) return;
      const xPct = point.xPct;
      const yPct = point.yPct;

      focusLine.style.left = `${xPct}%`;
      focusHalo.style.left = `${xPct}%`;
      focusHalo.style.top = `${yPct}%`;
      focusDot.style.left = `${xPct}%`;
      focusDot.style.top = `${yPct}%`;

      tooltipMonth.textContent = point.fullLabel;
      tooltipSpent.textContent = ET.formatAmount(point.spent);

      tooltipEl.style.left = `${xPct}%`;
      tooltipEl.style.top = `${yPct}%`;
      tooltipEl.style.opacity = '1';

      if (xPct > 75) {
        tooltipEl.style.transform = 'translate(-90%, -125%)';
      } else if (xPct < 25) {
        tooltipEl.style.transform = 'translate(-10%, -125%)';
      } else {
        tooltipEl.style.transform = 'translate(-50%, -125%)';
      }

      chartContainer.querySelectorAll('.chart-x-label').forEach((lbl) => {
        lbl.classList.toggle('chart-x-active', lbl.dataset.ym === point.ym);
      });
    }

    updateFocus(initPoint);

    function getClosestPoint(clientX) {
      if (clientX === undefined) return null;
      const rect = plotArea.getBoundingClientRect();
      const relXPct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));

      let closest = points[0];
      let minDist = Infinity;
      for (const p of points) {
        const dist = Math.abs(p.xPct - relXPct);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      }
      return closest;
    }

    plotArea.addEventListener('pointermove', (e) => {
      const pt = getClosestPoint(e.clientX);
      if (pt) updateFocus(pt);
    });

    plotArea.addEventListener('pointerleave', () => {
      updateFocus(initPoint);
    });

    plotArea.addEventListener('click', (e) => {
      const pt = getClosestPoint(e.clientX);
      if (pt && onSelectMonth) {
        onSelectMonth(pt.ym);
      }
    });

    chartContainer.querySelectorAll('.chart-x-label').forEach((lbl) => {
      lbl.addEventListener('click', () => {
        if (onSelectMonth) onSelectMonth(lbl.dataset.ym);
      });
    });
  }

  // State for Expenses Tab Filter and Editing
  let expenseFilter = 'all'; // 'all', 'recurring', 'one_off'
  let editingExpenseId = null;

  ET.startEditExpense = function (id) {
    editingExpenseId = id;
    if (ET.switchView) {
      ET.switchView('expenses');
    }
  };

  ET.renderExpenseManager = function (container, onChange) {
    const today = new Date().toISOString().slice(0, 10);
    const editingExpense = editingExpenseId ? ET.getExpenseById(editingExpenseId) : null;
    if (editingExpenseId && !editingExpense) {
      editingExpenseId = null; // if deleted
    }

    const currentType = editingExpense ? editingExpense.type : 'emi';
    const isRecurring = ['emi', 'subscription', 'sip'].includes(currentType);

    function dateFields(startVal, endVal) {
      return `
        <div class="field">
          <span class="field-label">Start Date</span>
          <input name="startDate" type="date" required value="${startVal || today}" />
        </div>
        <div class="field">
          <span class="field-label">End Date (optional)</span>
          <input name="endDate" type="date" value="${endVal || ''}" />
        </div>
        <div style="grid-column: 1 / -1;">
          <p class="hint">Recurring expenses apply monthly (open-ended if empty). One-off & Miscellaneous apply to start month or specified range.</p>
        </div>`;
    }

    const allExpenses = ET.getExpenses().slice().sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    const recurringExpenses = allExpenses.filter((e) => ['emi', 'subscription', 'sip'].includes(e.type));
    const oneOffExpenses = allExpenses.filter((e) => !['emi', 'subscription', 'sip'].includes(e.type));

    const displayedExpenses = expenseFilter === 'recurring'
      ? recurringExpenses
      : expenseFilter === 'one_off'
        ? oneOffExpenses
        : allExpenses;

    container.innerHTML = `
      <section id="expense-form-panel" class="panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3 class="panel-title">${editingExpense ? 'Edit Expense' : 'Add Expense'}</h3>
            ${editingExpense ? '<span class="panel-badge badge-accent">Editing</span>' : ''}
          </div>
          <span class="hint">${editingExpense ? 'Modify existing recurring or one-off expense details' : 'Log a new recurring or one-off transaction'}</span>
        </div>
        <form id="expense-form" class="form-grid">
          <div class="field">
            <span class="field-label">Expense Name</span>
            <input name="name" type="text" required placeholder="e.g. Netflix, Car Loan, Groceries" value="${editingExpense ? escapeHtml(editingExpense.name) : ''}" />
          </div>
          <div class="field">
            <span class="field-label">Amount</span>
            <input name="amount" type="number" min="0" step="any" required placeholder="0.00" value="${editingExpense ? editingExpense.amount : ''}" />
          </div>
          <div class="field">
            <span class="field-label">Type</span>
            <select name="type">
              <option value="emi" ${currentType === 'emi' ? 'selected' : ''}>EMI</option>
              <option value="subscription" ${currentType === 'subscription' ? 'selected' : ''}>Subscription</option>
              <option value="sip" ${currentType === 'sip' ? 'selected' : ''}>SIP</option>
              <option value="one_time" ${currentType === 'one_time' ? 'selected' : ''}>One-Off</option>
              <option value="adhoc" ${currentType === 'adhoc' ? 'selected' : ''}>Miscellaneous</option>
            </select>
          </div>
          <div class="field">
            <span class="field-label">Category (optional)</span>
            <input name="category" type="text" placeholder="e.g. Housing, Entertainment" value="${editingExpense && editingExpense.category ? escapeHtml(editingExpense.category) : ''}" />
          </div>
          <div id="type-fields" class="form-grid" style="grid-column: 1 / -1; margin-top: 0.25rem;">
            ${dateFields(editingExpense ? editingExpense.startDate : null, editingExpense ? editingExpense.endDate : null)}
          </div>

          ${editingExpense && ['emi', 'subscription', 'sip'].includes(editingExpense.type) ? `
            <div id="price-change-section" class="price-change-card" style="grid-column: 1 / -1;">
              <div class="price-change-header">
                <span class="price-change-title">Rate / Price Revision Options</span>
                <span class="hint">Preserve past logged months when price increases or changes</span>
              </div>
              <div class="price-change-options">
                <label class="price-radio-label">
                  <input type="radio" name="priceChangeMode" value="effective" checked />
                  <div class="price-radio-text">
                    <strong>Apply from a specific date onwards (Recommended)</strong>
                    <span class="price-radio-desc">Preserves past months at the previous price (${ET.formatAmount(editingExpense.amount)}) in your history.</span>
                  </div>
                </label>
                
                <div id="effective-date-wrap" class="field" style="margin-left: 1.75rem; margin-top: 0.25rem;">
                  <span class="field-label">Effective From Month / Date</span>
                  <input type="date" name="effectiveDate" value="${today}" />
                </div>

                <label class="price-radio-label" style="margin-top: 0.5rem;">
                  <input type="radio" name="priceChangeMode" value="all" />
                  <div class="price-radio-text">
                    <strong>Update across all months (past & future)</strong>
                    <span class="price-radio-desc">Overwrites the price for all historical and future months in this tenure.</span>
                  </div>
                </label>
              </div>
            </div>
          ` : ''}

          <div class="form-actions-wrap" style="grid-column: 1 / -1; margin-top: 0.5rem; display: flex; gap: 0.75rem; align-items: center;">
            <button type="submit" class="btn btn-primary">${editingExpense ? 'Save Changes' : 'Add Expense'}</button>
            ${editingExpense ? '<button type="button" id="cancel-edit-btn" class="btn btn-secondary">Cancel</button>' : ''}
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title-wrap">
            <h3 class="panel-title">Manage Expenses</h3>
          </div>
          <div class="filter-pills" role="tablist">
            <button class="filter-pill ${expenseFilter === 'all' ? 'active' : ''}" data-filter="all">All (${allExpenses.length})</button>
            <button class="filter-pill ${expenseFilter === 'recurring' ? 'active' : ''}" data-filter="recurring">Recurring (${recurringExpenses.length})</button>
            <button class="filter-pill ${expenseFilter === 'one_off' ? 'active' : ''}" data-filter="one_off">One-Off (${oneOffExpenses.length})</button>
          </div>
        </div>

        <div id="all-expenses">
          ${displayedExpenses.length === 0 ? `
            <div class="empty-box"><p>${expenseFilter === 'recurring' ? 'No recurring expenses (EMIs, Subscriptions, SIPs) found.' : 'No expenses recorded yet.'}</p></div>
          ` : `
            <div class="table-wrap">
              <table class="table table-expenses">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th class="text-right">Amount</th>
                    <th>Start</th>
                    <th>End</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${displayedExpenses.map((e) => `
                    <tr class="expense-row ${editingExpenseId === e.id ? 'row-active' : ''}">
                      <td class="cell-name">
                        <span class="expense-name">${escapeHtml(e.name)}</span>
                        <div class="expense-meta-mobile">
                          <span class="tag tag-${e.type}">${ET.typeLabel(e.type)}</span>
                          ${e.category ? `<span class="expense-cat">${escapeHtml(e.category)}</span>` : ''}
                          <span class="expense-date">${e.startDate || ''}${e.endDate ? ` &rarr; ${e.endDate}` : ''}</span>
                        </div>
                      </td>
                      <td class="cell-type"><span class="tag tag-${e.type}">${ET.typeLabel(e.type)}</span></td>
                      <td class="cell-cat">${escapeHtml(e.category) || '-'}</td>
                      <td class="text-right amount-cell cell-amount">
                        <strong>${ET.formatAmount(e.amount)}</strong>
                      </td>
                      <td class="cell-start">${e.startDate || '-'}</td>
                      <td class="cell-end">${e.endDate || 'ongoing'}</td>
                      <td class="text-right cell-action">
                        <div class="actions-cell-wrap">
                          <button class="link-btn link-btn-edit edit-expense" data-id="${e.id}">Edit</button>
                          <button class="link-btn link-btn-danger delete-expense" data-id="${e.id}">Delete</button>
                        </div>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </section>
    `;

    function rerender() {
      ET.renderExpenseManager(container, onChange);
    }

    const form = container.querySelector('#expense-form');

    const cancelEditBtn = container.querySelector('#cancel-edit-btn');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        editingExpenseId = null;
        rerender();
      });
    }

    // Toggle effective date field based on price change radio
    const radioInputs = form.querySelectorAll('input[name="priceChangeMode"]');
    const effectiveDateWrap = form.querySelector('#effective-date-wrap');
    if (radioInputs && effectiveDateWrap) {
      radioInputs.forEach((r) => {
        r.addEventListener('change', () => {
          effectiveDateWrap.style.display = r.value === 'effective' && r.checked ? 'block' : 'none';
        });
      });
    }

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const data = new FormData(form);
      const newAmount = Number(data.get('amount')) || 0;
      const expensePayload = {
        type: data.get('type'),
        name: data.get('name'),
        amount: newAmount,
        category: data.get('category'),
        startDate: data.get('startDate'),
        endDate: data.get('endDate') || null
      };

      if (editingExpenseId) {
        const mode = data.get('priceChangeMode');
        const effectiveDate = data.get('effectiveDate');
        const origExp = ET.getExpenseById(editingExpenseId);
        const isRecurring = origExp && ['emi', 'subscription', 'sip'].includes(origExp.type);
        const amountChanged = origExp && origExp.amount !== newAmount;

        if (isRecurring && amountChanged && mode === 'effective' && effectiveDate) {
          ET.updateExpenseWithEffectiveDate(editingExpenseId, expensePayload, effectiveDate);
        } else {
          ET.updateExpense(editingExpenseId, expensePayload);
        }
        editingExpenseId = null;
      } else {
        ET.addExpense(expensePayload);
      }

      rerender();
      if (onChange) onChange();
    });

    // Filter Pills Event Listeners
    container.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        expenseFilter = pill.dataset.filter;
        rerender();
      });
    });

    // Edit and Delete handlers
    container.querySelectorAll('.edit-expense').forEach((btn) => {
      btn.addEventListener('click', () => {
        editingExpenseId = btn.dataset.id;
        rerender();
        const formPanel = container.querySelector('#expense-form-panel');
        if (formPanel) {
          formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    container.querySelectorAll('.delete-expense').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const exp = ET.getExpenseById(id);
        const expName = exp ? exp.name : 'this expense';
        const confirmed = await ET.showConfirm({
          title: 'Delete Master Expense',
          message: `Permanently delete "${expName}" from master records and all months? This action cannot be undone.`,
          confirmText: 'Delete Permanently',
          cancelText: 'Cancel',
          isDestructive: true
        });

        if (confirmed) {
          if (editingExpenseId === id) {
            editingExpenseId = null;
          }
          ET.deleteExpense(id);
          rerender();
          if (onChange) onChange();
        }
      });
    });
  };
})();
