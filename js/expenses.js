(function () {
  'use strict';

  const ET = (window.ET = window.ET || {});

  ET.EXPENSE_TYPES = [
    { id: 'household', label: 'Household', recurring: true },
    { id: 'emi', label: 'EMI', recurring: true },
    { id: 'subscription', label: 'Subscription', recurring: true },
    { id: 'sip', label: 'SIP', recurring: true },
    { id: 'one_time', label: 'One-Off', recurring: false },
    { id: 'adhoc', label: 'Miscellaneous', recurring: false }
  ];

  ET.getExpenses = function () {
    return ET.load(ET.KEYS.expenses, []);
  };

  ET.addExpense = function (expense) {
    const list = ET.getExpenses();
    const item = {
      id: (crypto.randomUUID && crypto.randomUUID()) || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: expense.type,
      name: expense.name.trim(),
      amount: Number(expense.amount) || 0,
      category: (expense.category || '').trim(),
      startDate: expense.startDate,
      endDate: expense.endDate || null
    };
    list.push(item);
    ET.save(ET.KEYS.expenses, list);
    return item;
  };

  ET.getExpenseById = function (id) {
    return ET.getExpenses().find((e) => e.id === id) || null;
  };

  ET.updateExpense = function (id, updated) {
    const list = ET.getExpenses();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    list[idx] = {
      ...list[idx],
      type: updated.type,
      name: updated.name.trim(),
      amount: Number(updated.amount) || 0,
      category: (updated.category || '').trim(),
      startDate: updated.startDate,
      endDate: updated.endDate || null
    };

    ET.save(ET.KEYS.expenses, list);
    return list[idx];
  };

  ET.updateExpenseWithEffectiveDate = function (id, updated, effectiveDate) {
    const list = ET.getExpenses();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const existing = list[idx];
    const effectiveYM = (effectiveDate || '').slice(0, 7);
    const existingStartYM = (existing.startDate || '').slice(0, 7);

    // If no effective date provided or effective date is not after start date, do a normal update
    if (!effectiveYM || !existingStartYM || effectiveYM <= existingStartYM) {
      return { expense: ET.updateExpense(id, updated), split: false };
    }

    // Calculate previous month for existing record's new end date
    const parts = effectiveYM.split('-').map(Number);
    const prevDate = new Date(parts[0], parts[1] - 2, 1);
    const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Check if original start date was in YYYY-MM-DD format
    let prevEndDate = prevYM;
    if (existing.startDate && existing.startDate.length === 10) {
      const lastDay = new Date(parts[0], parts[1] - 1, 0).getDate();
      prevEndDate = `${prevYM}-${String(lastDay).padStart(2, '0')}`;
    }

    // Update existing expense record to end on prevEndDate while keeping original amount
    list[idx] = {
      ...existing,
      name: updated.name ? updated.name.trim() : existing.name,
      category: updated.category !== undefined ? updated.category.trim() : existing.category,
      type: updated.type || existing.type,
      endDate: prevEndDate
    };

    // Format new start date (match YYYY-MM-DD if effectiveDate is full or YYYY-MM-01)
    let newStartDate = effectiveDate;
    if (existing.startDate && existing.startDate.length === 10 && effectiveDate.length === 7) {
      newStartDate = `${effectiveDate}-01`;
    }

    // Create the new continuation expense starting from effectiveDate with new amount
    const newExpense = {
      id: (crypto.randomUUID && crypto.randomUUID()) || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: updated.type || existing.type,
      name: updated.name ? updated.name.trim() : existing.name,
      amount: Number(updated.amount) || 0,
      category: updated.category !== undefined ? updated.category.trim() : existing.category,
      startDate: newStartDate,
      endDate: updated.endDate || null
    };

    list.push(newExpense);
    ET.save(ET.KEYS.expenses, list);

    return { original: list[idx], next: newExpense, split: true };
  };

  ET.getExcludedExpenses = function () {
    return ET.load(ET.KEYS.excludedExpenses, {});
  };

  ET.saveExcludedExpenses = function (map) {
    ET.save(ET.KEYS.excludedExpenses, map);
  };

  ET.excludeExpenseFromMonth = function (expenseId, ym) {
    const map = ET.getExcludedExpenses();
    map[ym] = map[ym] || [];
    if (!map[ym].includes(expenseId)) {
      map[ym].push(expenseId);
    }
    ET.saveExcludedExpenses(map);
  };

  ET.restoreExpenseToMonth = function (expenseId, ym) {
    const map = ET.getExcludedExpenses();
    if (map[ym]) {
      map[ym] = map[ym].filter((id) => id !== expenseId);
      if (map[ym].length === 0) {
        delete map[ym];
      }
      ET.saveExcludedExpenses(map);
    }
  };

  ET.getExcludedExpensesForMonth = function (ym) {
    const map = ET.getExcludedExpenses();
    const excludedIds = map[ym] || [];
    if (excludedIds.length === 0) return [];
    const allExpenses = ET.getExpenses();
    return allExpenses.filter((e) => excludedIds.includes(e.id) && monthInRange(e, ym));
  };

  ET.deleteExpense = function (id) {
    ET.save(ET.KEYS.expenses, ET.getExpenses().filter((e) => e.id !== id));
    const map = ET.getExcludedExpenses();
    let changed = false;
    Object.keys(map).forEach((ym) => {
      if (map[ym].includes(id)) {
        map[ym] = map[ym].filter((itemId) => itemId !== id);
        if (map[ym].length === 0) delete map[ym];
        changed = true;
      }
    });
    if (changed) ET.saveExcludedExpenses(map);
  };

  ET.isRecurring = function (type) {
    const t = ET.EXPENSE_TYPES.find((t) => t.id === type);
    return t ? t.recurring : false;
  };

  ET.typeLabel = function (type) {
    const t = ET.EXPENSE_TYPES.find((t) => t.id === type);
    return t ? t.label : type;
  };

  // ym format: "YYYY-MM"
  function monthInRange(expense, ym) {
    const start = (expense.startDate || '').slice(0, 7);
    const end = (expense.endDate || '').slice(0, 7);

    if (!start && !end) return false;

    if (start && end) {
      return ym >= start && ym <= end;
    }

    if (start && !end) {
      if (ET.isRecurring(expense.type)) {
        return ym >= start;
      }
      return ym === start;
    }

    return ym <= end;
  }

  ET.monthInRange = monthInRange;

  ET.expensesForMonth = function (ym) {
    const map = ET.getExcludedExpenses();
    const excludedIds = map[ym] || [];
    return ET.getExpenses().filter((e) => monthInRange(e, ym) && !excludedIds.includes(e.id));
  };

  ET.totalForMonth = function (ym) {
    return ET.expensesForMonth(ym).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  ET.yearSummary = function (year) {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, '0')}`;
      months.push({ ym: ym, total: ET.totalForMonth(ym) });
    }
    return months;
  };

  ET.expenseBreakdown = function (ym) {
    const items = ET.expensesForMonth(ym);
    const total = ET.totalForMonth(ym);
    if (total <= 0 || items.length === 0) return [];

    const sorted = items.slice().sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));

    return sorted.map((e) => {
      const amt = Number(e.amount) || 0;
      const pct = (amt / total) * 100;
      return {
        id: e.id,
        name: e.name,
        type: e.type,
        category: e.category,
        amount: amt,
        pct: Math.round(pct * 10) / 10,
        pctRaw: pct
      };
    });
  };
})();
