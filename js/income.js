(function () {
  'use strict';

  const ET = (window.ET = window.ET || {});

  ET.getOverrides = function () {
    return ET.load(ET.KEYS.incomeOverrides, {});
  };

  ET.setOverride = function (ym, amount) {
    const overrides = ET.getOverrides();
    const n = Number(amount);
    if (amount === null || amount === undefined || amount === '' || Number.isNaN(n) || n <= 0) {
      delete overrides[ym];
    } else {
      overrides[ym] = n;
    }
    ET.save(ET.KEYS.incomeOverrides, overrides);
  };

  ET.incomeForMonth = function (ym) {
    const overrides = ET.getOverrides();
    if (Object.prototype.hasOwnProperty.call(overrides, ym)) return overrides[ym];
    return Number(ET.getSettings().defaultIncome) || 0;
  };

  ET.isOverridden = function (ym) {
    return Object.prototype.hasOwnProperty.call(ET.getOverrides(), ym);
  };
})();
