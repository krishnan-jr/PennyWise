(function () {
  'use strict';

  const ET = (window.ET = window.ET || {});

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const FULL_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const FUEL_TYPES = [
    { id: 'petrol', label: 'Petrol', unit: 'L' },
    { id: 'diesel', label: 'Diesel', unit: 'L' },
    { id: 'cng', label: 'CNG', unit: 'kg' },
    { id: 'electric', label: 'Electric (EV)', unit: 'kWh' }
  ];

  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatNum(val, decimals = 1) {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return Number(val).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // Sample seed data to help user immediately visualize the rich dashboard & charts
  const SAMPLE_FUEL_LOGS = [
    {
      id: 'fuel-sample-1',
      date: '2026-08-05',
      vehicle: 'Car (Swift)',
      fuelType: 'petrol',
      amount: 3200,
      liters: 31.25,
      pricePerLiter: 102.40,
      odometer: 41200,
      isFullTank: true,
      station: 'IndianOil City Center',
      notes: 'Monthly start fill-up',
      syncExpense: false
    },
    {
      id: 'fuel-sample-2',
      date: '2026-08-19',
      vehicle: 'Car (Swift)',
      fuelType: 'petrol',
      amount: 3350,
      liters: 32.70,
      pricePerLiter: 102.45,
      odometer: 41690,
      isFullTank: true,
      station: 'Shell Expressway',
      notes: 'Highway refill',
      syncExpense: false
    },
    {
      id: 'fuel-sample-3',
      date: '2026-09-02',
      vehicle: 'Car (Swift)',
      fuelType: 'petrol',
      amount: 3150,
      liters: 30.70,
      pricePerLiter: 102.60,
      odometer: 42160,
      isFullTank: true,
      station: 'BPCL Highway',
      notes: 'Commute and weekend drive',
      syncExpense: false
    },
    {
      id: 'fuel-sample-4',
      date: '2026-09-18',
      vehicle: 'Car (Swift)',
      fuelType: 'petrol',
      amount: 3400,
      liters: 33.10,
      pricePerLiter: 102.72,
      odometer: 42670,
      isFullTank: true,
      station: 'HP Auto Fuel',
      notes: 'Full tank for outstation trip',
      syncExpense: false
    },
    {
      id: 'fuel-sample-5',
      date: '2026-09-24',
      vehicle: 'Bike (Hunter 350)',
      fuelType: 'petrol',
      amount: 1100,
      liters: 10.71,
      pricePerLiter: 102.70,
      odometer: 8400,
      isFullTank: true,
      station: 'Shell Main Road',
      notes: 'Local errands fill',
      syncExpense: false
    },
    {
      id: 'fuel-sample-6',
      date: '2026-10-04',
      vehicle: 'Car (Swift)',
      fuelType: 'petrol',
      amount: 3500,
      liters: 34.05,
      pricePerLiter: 102.80,
      odometer: 43200,
      isFullTank: true,
      station: 'IndianOil Outer Ring',
      notes: 'Regular commute refill',
      syncExpense: false
    },
    {
      id: 'fuel-sample-7',
      date: '2026-10-12',
      vehicle: 'Bike (Hunter 350)',
      fuelType: 'petrol',
      amount: 1150,
      liters: 11.18,
      pricePerLiter: 102.85,
      odometer: 8780,
      isFullTank: true,
      station: 'Shell Main Road',
      notes: 'Weekend ride top-up',
      syncExpense: false
    }
  ];

  // -------------------------------------------------------------------------
  // Data Access & CRUD
  // -------------------------------------------------------------------------

  ET.getFuelLogs = function () {
    return ET.load(ET.KEYS.fuelLogs, []);
  };

  ET.saveFuelLogs = function (list) {
    ET.save(ET.KEYS.fuelLogs, list);
  };

  ET.getFuelLogById = function (id) {
    return ET.getFuelLogs().find((l) => l.id === id) || null;
  };

  ET.getFuelVehicles = function () {
    const logs = ET.getFuelLogs();
    const set = new Set();
    logs.forEach((l) => {
      if (l.vehicle && l.vehicle.trim()) {
        set.add(l.vehicle.trim());
      }
    });
    return Array.from(set).sort();
  };

  ET.getLatestOdometer = function (vehicleName) {
    const logs = ET.getFuelLogs()
      .filter((l) => !vehicleName || l.vehicle.toLowerCase().trim() === vehicleName.toLowerCase().trim())
      .filter((l) => Number(l.odometer) > 0)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (Number(b.odometer) || 0) - (Number(a.odometer) || 0));

    return logs.length > 0 ? Number(logs[0].odometer) : null;
  };

  ET.addFuelLog = function (logData) {
    const list = ET.getFuelLogs();
    const id = (crypto.randomUUID && crypto.randomUUID()) || `fuel-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const amt = Number(logData.amount) || 0;
    const ltrs = Number(logData.liters) || 0;
    let unitPrice = Number(logData.pricePerLiter) || 0;
    if (unitPrice <= 0 && ltrs > 0 && amt > 0) {
      unitPrice = Math.round((amt / ltrs) * 100) / 100;
    }

    let linkedExpenseId = null;
    if (logData.syncExpense) {
      const exp = ET.addExpense({
        type: 'adhoc',
        name: `Fuel: ${logData.vehicle || 'Vehicle'}${logData.station ? ` (${logData.station})` : ''}`,
        amount: amt,
        category: 'Fuel',
        startDate: logData.date,
        endDate: null
      });
      if (exp) linkedExpenseId = exp.id;
    }

    const item = {
      id: id,
      date: logData.date || new Date().toISOString().slice(0, 10),
      vehicle: (logData.vehicle || 'Car').trim(),
      fuelType: logData.fuelType || 'petrol',
      amount: amt,
      liters: ltrs,
      pricePerLiter: unitPrice,
      odometer: Number(logData.odometer) || 0,
      isFullTank: logData.isFullTank !== false,
      station: (logData.station || '').trim(),
      notes: (logData.notes || '').trim(),
      syncExpense: !!logData.syncExpense,
      expenseId: linkedExpenseId
    };

    list.push(item);
    ET.saveFuelLogs(list);
    return item;
  };

  ET.updateFuelLog = function (id, logData) {
    const list = ET.getFuelLogs();
    const idx = list.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    const existing = list[idx];
    const amt = Number(logData.amount) || 0;
    const ltrs = Number(logData.liters) || 0;
    let unitPrice = Number(logData.pricePerLiter) || 0;
    if (unitPrice <= 0 && ltrs > 0 && amt > 0) {
      unitPrice = Math.round((amt / ltrs) * 100) / 100;
    }

    let linkedExpenseId = existing.expenseId;

    if (logData.syncExpense && !linkedExpenseId) {
      const exp = ET.addExpense({
        type: 'adhoc',
        name: `Fuel: ${logData.vehicle || 'Vehicle'}${logData.station ? ` (${logData.station})` : ''}`,
        amount: amt,
        category: 'Fuel',
        startDate: logData.date,
        endDate: null
      });
      if (exp) linkedExpenseId = exp.id;
    } else if (logData.syncExpense && linkedExpenseId) {
      ET.updateExpense(linkedExpenseId, {
        type: 'adhoc',
        name: `Fuel: ${logData.vehicle || 'Vehicle'}${logData.station ? ` (${logData.station})` : ''}`,
        amount: amt,
        category: 'Fuel',
        startDate: logData.date,
        endDate: null
      });
    } else if (!logData.syncExpense && linkedExpenseId) {
      ET.deleteExpense(linkedExpenseId);
      linkedExpenseId = null;
    }

    list[idx] = {
      ...existing,
      date: logData.date || existing.date,
      vehicle: (logData.vehicle || 'Car').trim(),
      fuelType: logData.fuelType || existing.fuelType || 'petrol',
      amount: amt,
      liters: ltrs,
      pricePerLiter: unitPrice,
      odometer: Number(logData.odometer) || 0,
      isFullTank: logData.isFullTank !== false,
      station: (logData.station || '').trim(),
      notes: (logData.notes || '').trim(),
      syncExpense: !!logData.syncExpense,
      expenseId: linkedExpenseId
    };

    ET.saveFuelLogs(list);
    return list[idx];
  };

  ET.deleteFuelLog = function (id) {
    const list = ET.getFuelLogs();
    const target = list.find((l) => l.id === id);
    if (target && target.expenseId) {
      ET.deleteExpense(target.expenseId);
    }
    const filtered = list.filter((l) => l.id !== id);
    ET.saveFuelLogs(filtered);
  };

  ET.seedSampleFuelLogs = function () {
    const existing = ET.getFuelLogs();
    if (existing.length === 0) {
      ET.saveFuelLogs(SAMPLE_FUEL_LOGS);
    }
  };

  // -------------------------------------------------------------------------
  // Calculations: Chronological Mileage & Monthly Analytics
  // -------------------------------------------------------------------------

  // Augments every log with computed distance, mileage (km/L), and cost/km
  ET.getAugmentedFuelLogs = function () {
    const rawList = ET.getFuelLogs();
    if (rawList.length === 0) return [];

    // Sort chronologically ascending to compute progressive odometer differences
    const sorted = rawList.slice().sort((a, b) => {
      const dCmp = (a.date || '').localeCompare(b.date || '');
      if (dCmp !== 0) return dCmp;
      return (Number(a.odometer) || 0) - (Number(b.odometer) || 0);
    });

    // Track previous log by vehicle
    const vehicleTracker = {};

    const augmented = sorted.map((log) => {
      const vKey = (log.vehicle || 'default').toLowerCase().trim();
      const prev = vehicleTracker[vKey];
      let distance = null;
      let mileage = null;
      let costPerKm = null;

      const currOdo = Number(log.odometer) || 0;
      const currLiters = Number(log.liters) || 0;
      const currAmt = Number(log.amount) || 0;

      if (prev && currOdo > prev.odometer && prev.odometer > 0) {
        distance = currOdo - prev.odometer;
        if (currLiters > 0) {
          mileage = Math.round((distance / currLiters) * 10) / 10;
        }
        if (distance > 0 && currAmt > 0) {
          costPerKm = Math.round((currAmt / distance) * 100) / 100;
        }
      }

      vehicleTracker[vKey] = {
        odometer: currOdo,
        isFullTank: log.isFullTank
      };

      return {
        ...log,
        distance,
        mileage,
        costPerKm
      };
    });

    // Return in reverse chronological order (newest first for UI display)
    return augmented.reverse();
  };

  // Get aggregated stats for the selected vehicle and year
  ET.getFuelStats = function (filterVehicle, filterYear) {
    const augmented = ET.getAugmentedFuelLogs();

    const filtered = augmented.filter((l) => {
      if (filterVehicle && filterVehicle !== 'all' && l.vehicle !== filterVehicle) return false;
      if (filterYear && filterYear !== 'all') {
        const y = (l.date || '').slice(0, 4);
        if (y !== String(filterYear)) return false;
      }
      return true;
    });

    const totalSpent = filtered.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const totalLiters = filtered.reduce((sum, l) => sum + (Number(l.liters) || 0), 0);
    const validDistanceLogs = filtered.filter((l) => l.distance !== null && l.distance > 0);
    const totalDistance = validDistanceLogs.reduce((sum, l) => sum + l.distance, 0);

    const avgPricePerLiter = totalLiters > 0 ? Math.round((totalSpent / totalLiters) * 100) / 100 : 0;
    const avgMileage = totalLiters > 0 && totalDistance > 0 ? Math.round((totalDistance / totalLiters) * 10) / 10 : null;
    const avgCostPerKm = totalDistance > 0 && totalSpent > 0 ? Math.round((totalSpent / totalDistance) * 100) / 100 : null;

    return {
      totalSpent,
      totalLiters: Math.round(totalLiters * 10) / 10,
      totalDistance,
      avgPricePerLiter,
      avgMileage,
      avgCostPerKm,
      logCount: filtered.length
    };
  };

  // Monthly breakdown for 12 months of a specific year
  ET.getFuelMonthlyTrend = function (year, filterVehicle) {
    const augmented = ET.getAugmentedFuelLogs();

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, '0')}`;
      const logsInMonth = augmented.filter((l) => {
        if (!l.date || !l.date.startsWith(ym)) return false;
        if (filterVehicle && filterVehicle !== 'all' && l.vehicle !== filterVehicle) return false;
        return true;
      });

      const spent = logsInMonth.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
      const liters = logsInMonth.reduce((sum, l) => sum + (Number(l.liters) || 0), 0);
      const validDists = logsInMonth.filter((l) => l.distance !== null && l.distance > 0);
      const distance = validDists.reduce((sum, l) => sum + l.distance, 0);
      const efficiency = liters > 0 && distance > 0 ? Math.round((distance / liters) * 10) / 10 : 0;
      const avgPrice = liters > 0 ? Math.round((spent / liters) * 100) / 100 : 0;

      months.push({
        ym,
        monthIdx: m - 1,
        monthName: MONTH_NAMES[m - 1],
        fullMonthName: FULL_MONTH_NAMES[m - 1],
        spent,
        liters: Math.round(liters * 10) / 10,
        distance,
        efficiency,
        avgPrice,
        logCount: logsInMonth.length
      });
    }

    return months;
  };

  // -------------------------------------------------------------------------
  // Fuel View UI Rendering
  // -------------------------------------------------------------------------

  ET.renderFuelView = function (container, refreshApp) {
    if (!container) return;

    // View state
    const state = {
      vehicle: 'all',
      year: new Date().getFullYear(),
      chartMetric: 'spent', // 'spent' | 'liters' | 'mileage'
      showMonthlyTable: false,
      searchQuery: ''
    };

    function rerender() {
      const vehicles = ET.getFuelVehicles();
      const allLogs = ET.getAugmentedFuelLogs();

      // Find available years from logs
      const yearsSet = new Set([new Date().getFullYear()]);
      allLogs.forEach((l) => {
        if (l.date) {
          const y = Number(l.date.slice(0, 4));
          if (y) yearsSet.add(y);
        }
      });
      const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

      const stats = ET.getFuelStats(state.vehicle, state.year);
      const monthlyTrend = ET.getFuelMonthlyTrend(state.year, state.vehicle);

      // Filtered logs list
      const filteredLogs = allLogs.filter((l) => {
        if (state.vehicle !== 'all' && l.vehicle !== state.vehicle) return false;
        if (state.year !== 'all' && (!l.date || !l.date.startsWith(String(state.year)))) return false;
        if (state.searchQuery) {
          const q = state.searchQuery.toLowerCase();
          const matchVehicle = (l.vehicle || '').toLowerCase().includes(q);
          const matchStation = (l.station || '').toLowerCase().includes(q);
          const matchNotes = (l.notes || '').toLowerCase().includes(q);
          if (!matchVehicle && !matchStation && !matchNotes) return false;
        }
        return true;
      });

      container.innerHTML = `
        <div class="fuel-view-wrapper">
          <!-- Fuel Section Header & Filter Controls -->
          <div class="fuel-header-card">
            <div class="fuel-header-left">
              <div class="fuel-header-title-row">
                <h2>Fuel Expenses</h2>
                <span class="fuel-badge-count">${allLogs.length} fill-ups</span>
              </div>
              <p class="fuel-header-sub">Vehicle fill-up logs, consumption analysis, and monthly mileage trends</p>
            </div>

            <div class="fuel-header-actions">
              <button id="fuel-btn-log" class="btn btn-primary btn-fuel-log" type="button">
                <span>+</span> Log Fill-up
              </button>
            </div>
          </div>

          <!-- Vehicle and Year Filter Toolbar -->
          <div class="fuel-filter-toolbar">
            <div class="fuel-filter-group">
              <label for="fuel-vehicle-filter" class="filter-label">Vehicle:</label>
              <select id="fuel-vehicle-filter" class="form-input filter-select">
                <option value="all" ${state.vehicle === 'all' ? 'selected' : ''}>All Vehicles (${vehicles.length || 0})</option>
                ${vehicles.map((v) => `<option value="${escapeHtml(v)}" ${state.vehicle === v ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}
              </select>
            </div>

            <div class="fuel-filter-group">
              <label for="fuel-year-filter" class="filter-label">Year:</label>
              <select id="fuel-year-filter" class="form-input filter-select">
                ${availableYears.map((y) => `<option value="${y}" ${state.year === y ? 'selected' : ''}>${y}</option>`).join('')}
                <option value="all" ${state.year === 'all' ? 'selected' : ''}>All Time</option>
              </select>
            </div>

            ${allLogs.length === 0 ? `
              <div class="fuel-filter-group" style="margin-left: auto;">
                <button id="fuel-seed-btn" class="btn btn-sm btn-secondary" type="button">
                  Load Demo Data
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Fuel KPI Dashboard Grid -->
          <div class="fuel-kpi-grid">
            <div class="kpi kpi-hero">
              <div class="kpi-header">
                <span class="kpi-label">TOTAL FUEL SPENT</span>
                <span class="kpi-badge-pill">${state.year === 'all' ? 'All Time' : state.year}</span>
              </div>
              <div class="kpi-value">${ET.formatAmount(stats.totalSpent)}</div>
              <div class="kpi-subtext">
                ${stats.logCount} fill-ups recorded ${state.vehicle !== 'all' ? `for ${escapeHtml(state.vehicle)}` : ''}
              </div>
            </div>

            <div class="kpi">
              <div class="kpi-header">
                <span class="kpi-dot" style="background: #0284c7;"></span>
                <span class="kpi-label">TOTAL VOLUME</span>
              </div>
              <div class="kpi-value">${formatNum(stats.totalLiters, 1)} <span class="kpi-unit">L</span></div>
              <div class="kpi-subtext">Avg ${ET.formatAmount(stats.avgPricePerLiter)} / Litre</div>
            </div>

            <div class="kpi">
              <div class="kpi-header">
                <span class="kpi-dot" style="background: #10b981;"></span>
                <span class="kpi-label">OVERALL MILEAGE</span>
              </div>
              <div class="kpi-value">
                ${stats.avgMileage !== null ? `${stats.avgMileage} <span class="kpi-unit">km/L</span>` : '<span class="kpi-unit">Awaiting 2nd fill-up</span>'}
              </div>
              <div class="kpi-subtext">
                ${stats.totalDistance > 0 ? `${formatNum(stats.totalDistance, 0)} km tracked` : 'Tracked via odometer'}
              </div>
            </div>

            <div class="kpi">
              <div class="kpi-header">
                <span class="kpi-dot" style="background: #f59e0b;"></span>
                <span class="kpi-label">RUNNING COST</span>
              </div>
              <div class="kpi-value">
                ${stats.avgCostPerKm !== null ? `${ET.formatAmount(stats.avgCostPerKm)} <span class="kpi-unit">/ km</span>` : '-'}
              </div>
              <div class="kpi-subtext">Direct fuel cost efficiency</div>
            </div>
          </div>

          <!-- Per-Month Interactive SVG Chart & Analysis -->
          <div class="fuel-chart-card">
            <div class="fuel-chart-header">
              <div class="fuel-chart-title-wrap">
                <h3 class="fuel-chart-title">Monthly Fuel Trends (${state.year === 'all' ? new Date().getFullYear() : state.year})</h3>
                <span class="fuel-chart-subtitle">Interactive 12-month visual breakdown</span>
              </div>

              <!-- Metric switcher buttons -->
              <div class="fuel-chart-toggles">
                <button type="button" class="fuel-toggle-btn ${state.chartMetric === 'spent' ? 'active' : ''}" data-metric="spent">
                  Spend (${ET.getCurrency().symbol})
                </button>
                <button type="button" class="fuel-toggle-btn ${state.chartMetric === 'liters' ? 'active' : ''}" data-metric="liters">
                  Volume (L)
                </button>
                <button type="button" class="fuel-toggle-btn ${state.chartMetric === 'mileage' ? 'active' : ''}" data-metric="mileage">
                  Mileage (km/L)
                </button>
              </div>
            </div>

            <!-- SVG Chart Container -->
            <div id="fuel-svg-chart-container" class="fuel-chart-body">
              ${renderFuelSvgChart(monthlyTrend, state.chartMetric)}
            </div>

            <!-- Monthly Summary Table Toggle -->
            <div class="fuel-table-toggle-bar">
              <button id="toggle-monthly-table-btn" class="link-btn" type="button">
                ${state.showMonthlyTable ? 'Hide Monthly Table' : 'Show 12-Month Data Table'}
              </button>
            </div>

            <!-- Expandable Monthly Table -->
            <div id="fuel-monthly-table-container" class="fuel-monthly-table-wrap" ${state.showMonthlyTable ? '' : 'hidden'}>
              <div class="table-wrap">
                <table class="table-compact">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th class="text-right">Fill-ups</th>
                      <th class="text-right">Spend</th>
                      <th class="text-right">Volume</th>
                      <th class="text-right">Distance</th>
                      <th class="text-right">Avg Mileage</th>
                      <th class="text-right">Avg Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${monthlyTrend.map((m) => `
                      <tr>
                        <td><strong>${m.monthName}</strong></td>
                        <td class="text-right num">${m.logCount || '-'}</td>
                        <td class="text-right num amount-cell">${m.spent > 0 ? ET.formatAmount(m.spent) : '-'}</td>
                        <td class="text-right num">${m.liters > 0 ? `${formatNum(m.liters, 1)} L` : '-'}</td>
                        <td class="text-right num">${m.distance > 0 ? `${formatNum(m.distance, 0)} km` : '-'}</td>
                        <td class="text-right num">${m.efficiency > 0 ? `<span class="mileage-pill">${m.efficiency} km/L</span>` : '-'}</td>
                        <td class="text-right num">${m.avgPrice > 0 ? ET.formatAmount(m.avgPrice) : '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Fill-up History / Ledger Section -->
          <div class="fuel-ledger-section">
            <div class="fuel-ledger-header">
              <div class="fuel-ledger-title">
                <h3>Fill-up History & Logs</h3>
                <span class="ledger-count-tag">${filteredLogs.length} entries</span>
              </div>

              <div class="fuel-ledger-search">
                <input type="text" id="fuel-search-input" class="form-input form-input-sm" placeholder="Search vehicle, station, notes..." value="${escapeHtml(state.searchQuery)}" />
              </div>
            </div>

            ${filteredLogs.length === 0 ? `
              <div class="empty-box">
                <p>No fuel logs found for the selected filter.</p>
                <button id="empty-log-btn" class="btn btn-primary btn-sm" style="margin-top: 1rem;">
                  + Record Your First Fill-up
                </button>
              </div>
            ` : `
              <div class="fuel-cards-list">
                ${filteredLogs.map((log) => renderFuelCard(log)).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- Log / Edit Fuel Modal Container -->
        <div id="fuel-entry-modal" class="modal-overlay" hidden>
          <div class="modal-dialog fuel-modal-dialog">
            <div class="modal-header">
              <h3 id="fuel-modal-title" class="modal-title">Log Fuel Fill-up</h3>
              <button type="button" id="fuel-modal-close" class="modal-close-btn" aria-label="Close modal">&times;</button>
            </div>

            <form id="fuel-entry-form" class="form-grid">
              <input type="hidden" name="id" value="" />

              <div class="field">
                <span class="field-label">Date</span>
                <input type="date" id="fuel-form-date" name="date" required />
              </div>

              <div class="field" id="fuel-vehicle-field-group">
                <span class="field-label">Vehicle</span>
                <div id="fuel-vehicle-select-wrap" ${vehicles.length === 0 ? 'style="display: none;"' : ''}>
                  <select id="fuel-form-vehicle-select">
                    ${vehicles.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}
                    <option value="__new__">+ Add New Vehicle...</option>
                  </select>
                </div>
                <div id="fuel-new-vehicle-wrap" ${vehicles.length > 0 ? 'style="display: none; margin-top: 0.4rem;"' : ''}>
                  <input type="text" id="fuel-form-vehicle-custom" placeholder="Enter vehicle name (e.g. Scooter)" ${vehicles.length === 0 ? 'required' : ''} />
                  ${vehicles.length > 0 ? `
                    <div style="display: flex; justify-content: flex-end; margin-top: 0.25rem;">
                      <button type="button" id="fuel-vehicle-custom-cancel" class="btn btn-ghost btn-xs" style="padding: 0; font-size: 0.75rem; color: var(--text-muted); text-decoration: underline;">
                        Cancel (choose existing)
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Fuel Type Selector -->
              <div class="field full-width">
                <span class="field-label">Fuel Type</span>
                <div class="fuel-type-toggle-group">
                  ${FUEL_TYPES.map((ft, idx) => `
                    <label class="fuel-type-radio-label">
                      <input type="radio" name="fuelType" value="${ft.id}" ${idx === 0 ? 'checked' : ''} />
                      <span class="fuel-type-radio-pill">${ft.label}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <!-- Instant Two-Way Amount / Liters / Price Auto-calculation -->
              <div class="field">
                <span class="field-label">Total Amount (${ET.getCurrency().symbol})</span>
                <input type="number" id="fuel-form-amount" name="amount" step="0.01" min="0" placeholder="0.00" required />
              </div>

              <div class="field">
                <span class="field-label">Volume (Litres)</span>
                <input type="number" id="fuel-form-liters" name="liters" step="0.01" min="0" placeholder="0.00" required />
              </div>

              <div class="field full-width">
                <span class="field-label">Price / Litre (${ET.getCurrency().symbol})</span>
                <input type="number" id="fuel-form-price" name="pricePerLiter" step="0.01" min="0" placeholder="0.00" />
                <span class="fuel-calc-hint">Enter any two fields (Amount, Volume, Price) to auto-calculate the third.</span>
              </div>

              <!-- Odometer Reading with Previous Hint -->
              <div class="field">
                <span class="field-label">Current Odometer (km)</span>
                <input type="number" id="fuel-form-odometer" name="odometer" min="0" placeholder="e.g. 42350" />
                <span id="fuel-form-last-odo" class="fuel-last-odo-hint"></span>
              </div>

              <div class="field" style="justify-content: flex-end; padding-bottom: 0.5rem;">
                <label class="fuel-checkbox-label" for="fuel-form-fulltank">
                  <input type="checkbox" id="fuel-form-fulltank" name="isFullTank" checked />
                  <span>Full Tank Fill-up</span>
                </label>
              </div>

              <!-- Fuel Station & Sync Option -->
              <div class="field full-width">
                <span class="field-label">Station / Brand (optional)</span>
                <input type="text" id="fuel-form-station" name="station" placeholder="e.g. Shell Expressway, IndianOil" />
              </div>

              <div class="field full-width">
                <label class="fuel-checkbox-label" for="fuel-form-sync">
                  <input type="checkbox" id="fuel-form-sync" name="syncExpense" />
                  <span>Also record in Monthly Expenses (Dashboard Spent)</span>
                </label>
              </div>

              <div class="field full-width">
                <span class="field-label">Notes (optional)</span>
                <input type="text" id="fuel-form-notes" name="notes" placeholder="e.g. Tire pressure checked, long road trip" />
              </div>

              <div class="modal-actions full-width" style="margin-top: 1rem;">
                <button type="button" id="fuel-modal-cancel" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Fill-up</button>
              </div>
            </form>
          </div>
        </div>
      `;

      attachFuelEvents();
    }

    // Render individual fill-up card
    function renderFuelCard(log) {
      const typeObj = FUEL_TYPES.find((t) => t.id === log.fuelType) || FUEL_TYPES[0];
      const unit = typeObj.unit;

      return `
        <div class="fuel-card" data-id="${log.id}">
          <div class="fuel-card-top">
            <div class="fuel-card-vehicle-block">
              <span class="fuel-card-vehicle">${escapeHtml(log.vehicle || 'Vehicle')}</span>
              <span class="fuel-type-pill fuel-type-${log.fuelType || 'petrol'}">${typeObj.label}</span>
              ${log.isFullTank ? '<span class="fuel-tank-badge">Full Tank</span>' : '<span class="fuel-tank-badge partial">Partial</span>'}
              ${log.syncExpense ? '<span class="fuel-sync-badge">In Dashboard</span>' : ''}
            </div>
            <div class="fuel-card-amount amount-cell">
              ${ET.formatAmount(log.amount)}
            </div>
          </div>

          <div class="fuel-card-meta">
            <span class="fuel-meta-item">
              <span class="meta-label">Date:</span> ${log.date}
            </span>
            ${log.station ? `
              <span class="fuel-meta-item">
                <span class="meta-label">Station:</span> ${escapeHtml(log.station)}
              </span>
            ` : ''}
            ${log.odometer > 0 ? `
              <span class="fuel-meta-item">
                <span class="meta-label">Odometer:</span> ${formatNum(log.odometer, 0)} km
              </span>
            ` : ''}
          </div>

          <div class="fuel-card-stats-row">
            <div class="fuel-stat-pill">
              <span class="fuel-stat-num">${formatNum(log.liters, 2)} ${unit}</span>
              <span class="fuel-stat-sub">@ ${ET.formatAmount(log.pricePerLiter)}/${unit}</span>
            </div>

            ${log.distance !== null ? `
              <div class="fuel-stat-pill">
                <span class="fuel-stat-num">+${formatNum(log.distance, 0)} km</span>
                <span class="fuel-stat-sub">Trip distance</span>
              </div>
            ` : ''}

            ${log.mileage !== null ? `
              <div class="fuel-stat-pill highlight-mileage">
                <span class="fuel-stat-num">${log.mileage} km/${unit}</span>
                <span class="fuel-stat-sub">${log.costPerKm ? `${ET.formatAmount(log.costPerKm)}/km` : 'Mileage'}</span>
              </div>
            ` : `
              <div class="fuel-stat-pill muted">
                <span class="fuel-stat-sub">Initial baseline log</span>
              </div>
            `}
          </div>

          ${log.notes ? `
            <div class="fuel-card-notes">${escapeHtml(log.notes)}</div>
          ` : ''}

          <div class="fuel-card-actions">
            <button class="btn btn-sm btn-secondary fuel-action-edit" data-id="${log.id}" type="button">Edit</button>
            <button class="btn btn-sm btn-ghost btn-danger-text fuel-action-delete" data-id="${log.id}" type="button">Delete</button>
          </div>
        </div>
      `;
    }

    // Render interactive SVG Chart
    function renderFuelSvgChart(monthlyData, metric) {
      let maxVal = 10;
      let unitLabel = '';

      if (metric === 'spent') {
        maxVal = Math.max(...monthlyData.map((d) => d.spent), 100);
        unitLabel = ET.getCurrency().symbol;
      } else if (metric === 'liters') {
        maxVal = Math.max(...monthlyData.map((d) => d.liters), 10);
        unitLabel = 'L';
      } else if (metric === 'mileage') {
        maxVal = Math.max(...monthlyData.map((d) => d.efficiency), 20);
        unitLabel = 'km/L';
      }

      // Nice rounded ceiling
      let yCeil = maxVal;
      if (metric === 'spent') {
        yCeil = Math.ceil((maxVal * 1.2) / 1000) * 1000;
        if (yCeil < 1000) yCeil = 1000;
      } else {
        yCeil = Math.ceil(maxVal * 1.25);
      }

      const points = monthlyData.map((d, idx) => {
        let val = 0;
        if (metric === 'spent') val = d.spent;
        if (metric === 'liters') val = d.liters;
        if (metric === 'mileage') val = d.efficiency;

        const xPct = (idx / 11) * 100;
        const yPct = 100 - (yCeil > 0 ? (val / yCeil) * 100 : 0);
        return {
          ...d,
          val,
          xPct: Math.round(xPct * 100) / 100,
          yPct: Math.round(yPct * 100) / 100,
          idx
        };
      });

      // Generate smooth spline curve
      let pathD = `M ${points[0].xPct} ${points[0].yPct}`;
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

      const areaD = `${pathD} L 100 100 L 0 100 Z`;

      function formatY(val) {
        if (metric === 'spent') {
          if (val >= 1000) return `${unitLabel}${Math.round(val / 1000)}k`;
          return `${unitLabel}${val}`;
        }
        return `${Math.round(val)} ${unitLabel}`;
      }

      const yTicks = [
        { label: formatY(yCeil), yPct: 0 },
        { label: formatY(Math.round((yCeil * 2) / 3)), yPct: 33.3 },
        { label: formatY(Math.round(yCeil / 3)), yPct: 66.6 },
        { label: formatY(0), yPct: 100 }
      ];

      return `
        <div class="trend-chart-inner">
          <div class="trend-chart-body">
            <div class="chart-y-axis">
              ${yTicks.map((t) => `<span class="chart-y-label">${t.label}</span>`).join('')}
            </div>

            <div class="chart-plot-area" id="fuel-chart-plot-area">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="trend-chart-svg">
                <defs>
                  <linearGradient id="fuel-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#0f766e" stop-opacity="0.32" />
                    <stop offset="70%" stop-color="#0f766e" stop-opacity="0.05" />
                    <stop offset="100%" stop-color="#0f766e" stop-opacity="0.0" />
                  </linearGradient>
                </defs>

                <!-- Grid lines -->
                <line x1="0" y1="0" x2="100" y2="0" class="chart-grid-line" vector-effect="non-scaling-stroke" />
                <line x1="0" y1="33.3" x2="100" y2="33.3" class="chart-grid-line" vector-effect="non-scaling-stroke" />
                <line x1="0" y1="66.6" x2="100" y2="66.6" class="chart-grid-line" vector-effect="non-scaling-stroke" />
                <line x1="0" y1="100" x2="100" y2="100" class="chart-grid-line" vector-effect="non-scaling-stroke" />

                <!-- Vertical month guideline tracks -->
                ${points.map((p) => `
                  <line x1="${p.xPct}" y1="0" x2="${p.xPct}" y2="100" stroke="#f1f5f9" stroke-width="1" vector-effect="non-scaling-stroke" />
                `).join('')}

                <!-- Spline line & Area fill -->
                <path d="${areaD}" fill="url(#fuel-area-gradient)" class="chart-area-path" />
                <path d="${pathD}" class="chart-line-path" fill="none" stroke="#0f766e" stroke-width="2.5" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />
              </svg>

              <!-- Interactive Focus indicator -->
              <div id="fuel-focus-line" class="chart-focus-line" style="display: none;"></div>
              <div id="fuel-focus-dot" class="chart-focus-dot" style="display: none;"></div>

              <!-- Tooltip floating card -->
              <div id="fuel-chart-tooltip" class="chart-tooltip" style="display: none;">
                <div class="chart-tooltip-title" id="fuel-tooltip-month">Month</div>
                <div class="chart-tooltip-val">
                  <span class="chart-tooltip-dot"></span>
                  <span id="fuel-tooltip-val">-</span>
                </div>
                <div id="fuel-tooltip-extra" style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;"></div>
              </div>
            </div>
          </div>

          <!-- X-Axis Months -->
          <div class="chart-x-axis">
            ${points.map((p) => `<span class="chart-x-label" data-idx="${p.idx}">${p.monthName}</span>`).join('')}
          </div>
        </div>
      `;
    }

    // Attach DOM handlers
    function attachFuelEvents() {
      // Vehicle Filter
      const vehicleFilter = container.querySelector('#fuel-vehicle-filter');
      if (vehicleFilter) {
        vehicleFilter.addEventListener('change', () => {
          state.vehicle = vehicleFilter.value;
          rerender();
        });
      }

      // Year Filter
      const yearFilter = container.querySelector('#fuel-year-filter');
      if (yearFilter) {
        yearFilter.addEventListener('change', () => {
          state.year = yearFilter.value === 'all' ? 'all' : Number(yearFilter.value);
          rerender();
        });
      }

      // Metric Toggles (Spend, Liters, Mileage)
      container.querySelectorAll('.fuel-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.chartMetric = btn.dataset.metric;
          rerender();
        });
      });

      // Show/Hide Monthly Table
      const tableToggleBtn = container.querySelector('#toggle-monthly-table-btn');
      if (tableToggleBtn) {
        tableToggleBtn.addEventListener('click', () => {
          state.showMonthlyTable = !state.showMonthlyTable;
          const tbl = container.querySelector('#fuel-monthly-table-container');
          if (tbl) tbl.hidden = !state.showMonthlyTable;
          tableToggleBtn.textContent = state.showMonthlyTable ? 'Hide Monthly Table' : 'Show 12-Month Data Table';
        });
      }

      // Search input
      const searchInput = container.querySelector('#fuel-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', () => {
          state.searchQuery = searchInput.value;
          // Debounce or immediate re-render cards
          rerenderCardsOnly();
        });
      }

      // Seed demo data button
      const seedBtn = container.querySelector('#fuel-seed-btn');
      if (seedBtn) {
        seedBtn.addEventListener('click', () => {
          ET.seedSampleFuelLogs();
          rerender();
          if (refreshApp) refreshApp();
        });
      }

      // Log Fill-up Button
      const logBtn = container.querySelector('#fuel-btn-log');
      const emptyLogBtn = container.querySelector('#empty-log-btn');
      if (logBtn) logBtn.addEventListener('click', () => openFuelModal());
      if (emptyLogBtn) emptyLogBtn.addEventListener('click', () => openFuelModal());

      // Card Edit & Delete handlers
      container.querySelectorAll('.fuel-action-edit').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const log = ET.getFuelLogById(btn.dataset.id);
          if (log) openFuelModal(log);
        });
      });

      container.querySelectorAll('.fuel-action-delete').forEach((btn) => {
        btn.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const log = ET.getFuelLogById(btn.dataset.id);
          if (!log) return;

          const confirmed = await ET.showConfirm({
            title: 'Delete Fuel Fill-up',
            message: `Delete this fill-up for ${log.vehicle} on ${log.date} (${ET.formatAmount(log.amount)})?`,
            confirmText: 'Delete Fill-up',
            cancelText: 'Keep',
            isDestructive: true
          });

          if (confirmed) {
            ET.deleteFuelLog(log.id);
            rerender();
            if (refreshApp) refreshApp();
          }
        });
      });

      // Chart interaction (Hover / Scrubbing)
      attachChartTooltip();

      // Modal Events
      setupFuelModal();
    }

    function rerenderCardsOnly() {
      const cardsList = container.querySelector('.fuel-cards-list');
      if (!cardsList) {
        rerender();
        return;
      }
      const allLogs = ET.getAugmentedFuelLogs();
      const filtered = allLogs.filter((l) => {
        if (state.vehicle !== 'all' && l.vehicle !== state.vehicle) return false;
        if (state.year !== 'all' && (!l.date || !l.date.startsWith(String(state.year)))) return false;
        if (state.searchQuery) {
          const q = state.searchQuery.toLowerCase();
          const matchVehicle = (l.vehicle || '').toLowerCase().includes(q);
          const matchStation = (l.station || '').toLowerCase().includes(q);
          const matchNotes = (l.notes || '').toLowerCase().includes(q);
          if (!matchVehicle && !matchStation && !matchNotes) return false;
        }
        return true;
      });

      cardsList.innerHTML = filtered.map((log) => renderFuelCard(log)).join('');

      cardsList.querySelectorAll('.fuel-action-edit').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const log = ET.getFuelLogById(btn.dataset.id);
          if (log) openFuelModal(log);
        });
      });

      cardsList.querySelectorAll('.fuel-action-delete').forEach((btn) => {
        btn.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const log = ET.getFuelLogById(btn.dataset.id);
          if (!log) return;
          const confirmed = await ET.showConfirm({
            title: 'Delete Fuel Fill-up',
            message: `Delete this fill-up for ${log.vehicle} on ${log.date} (${ET.formatAmount(log.amount)})?`,
            confirmText: 'Delete Fill-up',
            cancelText: 'Keep',
            isDestructive: true
          });
          if (confirmed) {
            ET.deleteFuelLog(log.id);
            rerender();
            if (refreshApp) refreshApp();
          }
        });
      });
    }

    function attachChartTooltip() {
      const plotArea = container.querySelector('#fuel-chart-plot-area');
      const tooltip = container.querySelector('#fuel-chart-tooltip');
      const focusLine = container.querySelector('#fuel-focus-line');
      const focusDot = container.querySelector('#fuel-focus-dot');
      const tooltipMonth = container.querySelector('#fuel-tooltip-month');
      const tooltipVal = container.querySelector('#fuel-tooltip-val');
      const tooltipExtra = container.querySelector('#fuel-tooltip-extra');

      if (!plotArea || !tooltip) return;

      const monthlyData = ET.getFuelMonthlyTrend(state.year === 'all' ? new Date().getFullYear() : state.year, state.vehicle);

      function updateScrub(e) {
        const rect = plotArea.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const idx = Math.min(11, Math.max(0, Math.round(relX * 11)));
        const d = monthlyData[idx];
        if (!d) return;

        const xPct = (idx / 11) * 100;
        focusLine.style.display = 'block';
        focusDot.style.display = 'block';
        tooltip.style.display = 'block';

        focusLine.style.left = `${xPct}%`;

        let mainText = '';
        if (state.chartMetric === 'spent') mainText = ET.formatAmount(d.spent);
        else if (state.chartMetric === 'liters') mainText = `${formatNum(d.liters, 1)} L`;
        else if (state.chartMetric === 'mileage') mainText = d.efficiency > 0 ? `${d.efficiency} km/L` : 'No data';

        tooltipMonth.textContent = `${d.fullMonthName} ${state.year === 'all' ? new Date().getFullYear() : state.year}`;
        tooltipVal.textContent = mainText;

        let extraText = `${d.logCount} logs`;
        if (d.spent > 0 && state.chartMetric !== 'spent') extraText += ` • ${ET.formatAmount(d.spent)}`;
        if (d.efficiency > 0 && state.chartMetric !== 'mileage') extraText += ` • ${d.efficiency} km/L`;
        tooltipExtra.textContent = extraText;

        // Position tooltip nicely within chart bounds
        const tipWidth = tooltip.offsetWidth || 130;
        let leftPx = (xPct / 100) * rect.width - tipWidth / 2;
        if (leftPx < 0) leftPx = 0;
        if (leftPx + tipWidth > rect.width) leftPx = rect.width - tipWidth;
        tooltip.style.left = `${leftPx}px`;
        tooltip.style.top = '10px';
      }

      plotArea.addEventListener('mousemove', updateScrub);
      plotArea.addEventListener('touchstart', updateScrub, { passive: true });
      plotArea.addEventListener('touchmove', updateScrub, { passive: true });

      plotArea.addEventListener('mouseleave', () => {
        focusLine.style.display = 'none';
        focusDot.style.display = 'none';
        tooltip.style.display = 'none';
      });
    }

    // Modal Handling & Instant 2-way auto calculation
    function setupFuelModal() {
      const modal = container.querySelector('#fuel-entry-modal');
      const closeBtn = container.querySelector('#fuel-modal-close');
      const cancelBtn = container.querySelector('#fuel-modal-cancel');
      const form = container.querySelector('#fuel-entry-form');

      const amountInput = container.querySelector('#fuel-form-amount');
      const litersInput = container.querySelector('#fuel-form-liters');
      const priceInput = container.querySelector('#fuel-form-price');
      const vehicleSelectWrap = container.querySelector('#fuel-vehicle-select-wrap');
      const vehicleSelect = container.querySelector('#fuel-form-vehicle-select');
      const vehicleNewWrap = container.querySelector('#fuel-new-vehicle-wrap');
      const vehicleCustom = container.querySelector('#fuel-form-vehicle-custom');
      const vehicleCustomCancel = container.querySelector('#fuel-vehicle-custom-cancel');
      const lastOdoHint = container.querySelector('#fuel-form-last-odo');

      if (!modal || !form) return;

      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);
      modal.addEventListener('click', (ev) => {
        if (ev.target === modal) closeModal();
      });

      function getChosenVehicle() {
        const vehicles = ET.getFuelVehicles();
        if (vehicles.length > 0 && vehicleSelect && vehicleSelect.value !== '__new__') {
          return vehicleSelect.value.trim();
        }
        if (vehicleCustom) {
          return vehicleCustom.value.trim();
        }
        return '';
      }

      // Update last odometer reading hint on vehicle change
      function updateOdoHint() {
        const v = getChosenVehicle();
        const lastOdo = ET.getLatestOdometer(v);
        if (lastOdo) {
          lastOdoHint.textContent = `Previous recorded: ${formatNum(lastOdo, 0)} km`;
        } else {
          lastOdoHint.textContent = '';
        }
      }

      if (vehicleSelect) {
        vehicleSelect.addEventListener('change', () => {
          if (vehicleSelect.value === '__new__') {
            vehicleNewWrap.style.display = '';
            vehicleCustom.required = true;
            vehicleCustom.focus();
          } else {
            vehicleNewWrap.style.display = 'none';
            vehicleCustom.required = false;
          }
          updateOdoHint();
        });
      }

      if (vehicleCustom) {
        vehicleCustom.addEventListener('input', updateOdoHint);
        vehicleCustom.addEventListener('change', updateOdoHint);
      }

      if (vehicleCustomCancel) {
        vehicleCustomCancel.addEventListener('click', () => {
          const currentVehicles = ET.getFuelVehicles();
          if (currentVehicles.length > 0 && vehicleSelect) {
            vehicleSelect.value = currentVehicles[0];
            vehicleNewWrap.style.display = 'none';
            vehicleCustom.value = '';
            vehicleCustom.required = false;
            updateOdoHint();
          }
        });
      }

      // Intelligent 2-way calculation among Amount, Litres, Price/L
      let activeCalcTarget = null;

      amountInput.addEventListener('input', () => {
        const amt = parseFloat(amountInput.value);
        const ltrs = parseFloat(litersInput.value);
        const price = parseFloat(priceInput.value);

        if (!isNaN(amt) && amt > 0) {
          if (!isNaN(price) && price > 0 && activeCalcTarget !== 'liters') {
            litersInput.value = (amt / price).toFixed(2);
          } else if (!isNaN(ltrs) && ltrs > 0) {
            priceInput.value = (amt / ltrs).toFixed(2);
          }
        }
      });

      litersInput.addEventListener('input', () => {
        activeCalcTarget = 'liters';
        const amt = parseFloat(amountInput.value);
        const ltrs = parseFloat(litersInput.value);
        const price = parseFloat(priceInput.value);

        if (!isNaN(ltrs) && ltrs > 0) {
          if (!isNaN(price) && price > 0) {
            amountInput.value = (ltrs * price).toFixed(2);
          } else if (!isNaN(amt) && amt > 0) {
            priceInput.value = (amt / ltrs).toFixed(2);
          }
        }
      });

      priceInput.addEventListener('input', () => {
        activeCalcTarget = 'price';
        const amt = parseFloat(amountInput.value);
        const ltrs = parseFloat(litersInput.value);
        const price = parseFloat(priceInput.value);

        if (!isNaN(price) && price > 0) {
          if (!isNaN(ltrs) && ltrs > 0) {
            amountInput.value = (ltrs * price).toFixed(2);
          } else if (!isNaN(amt) && amt > 0) {
            litersInput.value = (amt / price).toFixed(2);
          }
        }
      });

      // Form submission
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const data = new FormData(form);
        const id = data.get('id');

        let chosenVehicle = getChosenVehicle();
        if (!chosenVehicle) {
          chosenVehicle = 'Car';
        }
        const currentVehicles = ET.getFuelVehicles();
        const existingMatch = currentVehicles.find((v) => v.toLowerCase() === chosenVehicle.toLowerCase());
        if (existingMatch) {
          chosenVehicle = existingMatch;
        }

        const payload = {
          date: data.get('date'),
          vehicle: chosenVehicle,
          fuelType: data.get('fuelType') || 'petrol',
          amount: parseFloat(data.get('amount')) || 0,
          liters: parseFloat(data.get('liters')) || 0,
          pricePerLiter: parseFloat(data.get('pricePerLiter')) || 0,
          odometer: parseFloat(data.get('odometer')) || 0,
          isFullTank: form.querySelector('#fuel-form-fulltank').checked,
          station: data.get('station'),
          notes: data.get('notes'),
          syncExpense: form.querySelector('#fuel-form-sync').checked
        };

        if (id) {
          ET.updateFuelLog(id, payload);
        } else {
          ET.addFuelLog(payload);
        }

        closeModal();
        rerender();
        if (refreshApp) refreshApp();
      });
    }

    function openFuelModal(log = null) {
      const modal = container.querySelector('#fuel-entry-modal');
      const form = container.querySelector('#fuel-entry-form');
      const title = container.querySelector('#fuel-modal-title');
      const lastOdoHint = container.querySelector('#fuel-form-last-odo');
      const vehicleSelectWrap = container.querySelector('#fuel-vehicle-select-wrap');
      const vehicleSelect = container.querySelector('#fuel-form-vehicle-select');
      const vehicleNewWrap = container.querySelector('#fuel-new-vehicle-wrap');
      const vehicleCustom = container.querySelector('#fuel-form-vehicle-custom');

      if (!modal || !form) return;

      const currentVehicles = ET.getFuelVehicles();

      form.reset();

      if (log) {
        title.textContent = 'Edit Fuel Fill-up';
        form.querySelector('input[name="id"]').value = log.id;
        form.querySelector('#fuel-form-date').value = log.date;

        if (currentVehicles.length > 0 && vehicleSelect) {
          vehicleSelectWrap.style.display = '';
          if (currentVehicles.includes(log.vehicle)) {
            vehicleSelect.value = log.vehicle;
            vehicleNewWrap.style.display = 'none';
            vehicleCustom.value = '';
            vehicleCustom.required = false;
          } else {
            vehicleSelect.value = '__new__';
            vehicleNewWrap.style.display = '';
            vehicleCustom.value = log.vehicle || '';
            vehicleCustom.required = true;
          }
        } else {
          if (vehicleSelectWrap) vehicleSelectWrap.style.display = 'none';
          vehicleNewWrap.style.display = '';
          vehicleCustom.value = log.vehicle || '';
          vehicleCustom.required = true;
        }

        const radio = form.querySelector(`input[name="fuelType"][value="${log.fuelType}"]`);
        if (radio) radio.checked = true;

        form.querySelector('#fuel-form-amount').value = log.amount || '';
        form.querySelector('#fuel-form-liters').value = log.liters || '';
        form.querySelector('#fuel-form-price').value = log.pricePerLiter || '';
        form.querySelector('#fuel-form-odometer').value = log.odometer || '';
        form.querySelector('#fuel-form-fulltank').checked = log.isFullTank !== false;
        form.querySelector('#fuel-form-station').value = log.station || '';
        form.querySelector('#fuel-form-notes').value = log.notes || '';
        form.querySelector('#fuel-form-sync').checked = !!log.syncExpense;

        const currentVehicle = log.vehicle;
        const lastOdo = ET.getLatestOdometer(currentVehicle);
        if (lastOdo && lastOdoHint) {
          lastOdoHint.textContent = `Previous recorded: ${formatNum(lastOdo, 0)} km`;
        } else if (lastOdoHint) {
          lastOdoHint.textContent = '';
        }
      } else {
        title.textContent = 'Log Fuel Fill-up';
        form.querySelector('input[name="id"]').value = '';
        form.querySelector('#fuel-form-date').value = new Date().toISOString().slice(0, 10);

        let initialVehicle = '';
        if (currentVehicles.length > 0 && vehicleSelect) {
          vehicleSelectWrap.style.display = '';
          let defaultVehicle = currentVehicles[0];
          if (state.vehicle !== 'all' && currentVehicles.includes(state.vehicle)) {
            defaultVehicle = state.vehicle;
          }
          vehicleSelect.value = defaultVehicle;
          initialVehicle = defaultVehicle;
          vehicleNewWrap.style.display = 'none';
          vehicleCustom.value = '';
          vehicleCustom.required = false;
        } else {
          if (vehicleSelectWrap) vehicleSelectWrap.style.display = 'none';
          vehicleNewWrap.style.display = '';
          vehicleCustom.value = '';
          vehicleCustom.required = true;
        }

        form.querySelector('#fuel-form-fulltank').checked = true;
        form.querySelector('#fuel-form-sync').checked = false;

        const lastOdo = initialVehicle ? ET.getLatestOdometer(initialVehicle) : null;
        if (lastOdo && lastOdoHint) {
          lastOdoHint.textContent = `Previous recorded: ${formatNum(lastOdo, 0)} km`;
        } else if (lastOdoHint) {
          lastOdoHint.textContent = '';
        }
      }

      modal.hidden = false;
    }

    function closeModal() {
      const modal = container.querySelector('#fuel-entry-modal');
      if (modal) modal.hidden = true;
    }

    // Initial render
    rerender();
  };
})();
