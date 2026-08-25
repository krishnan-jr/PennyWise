# Pennywise • Every Penny Counts

A minimalist, privacy-first personal finance tracker and program budgeting Progressive Web App (PWA). Built with plain HTML, modern CSS, and vanilla JavaScript—zero frameworks, zero build steps, zero trackers, and 100% offline-ready.

---

## Highlights & Features

- **Dashboard & Monthly Financial Health**:
  - Net remaining balance, monthly income, total spent, and savings rate KPIs.
  - Interactive 12-month expense trend curve with SVG touch/hover tooltips and month-over-month trend indicators.
  - Dynamic category breakdown meter and itemized transaction ledger.
  - Single-month income override with baseline budget support.

- **Expense Management & Automated Price Revisions**:
  - Support for **Recurring EMIs**, **Subscriptions**, **SIPs**, **One-Off**, and **Miscellaneous** expenses.
  - **Automated Price Revision**: When a recurring cost changes (e.g. Netflix price increase), Pennywise automatically splits tenures so historical logs remain untouched while new rates apply from the effective month onwards.
  - **Month Exclusions & Restore**: Exclude any recurring expense for a specific month with a single tap, with the ability to restore it anytime without modifying master records.

- **Events & Programs Budget Tracker**:
  - Track one-time trips, weddings, functions, and events with dedicated budget caps.
  - Itemized vendor cost tracking with advance payments, pending balance, payment due dates, and status tags (`Unpaid`, `Partial`, `Paid`).

- **High-Res Graphic & Data Exports**:
  - **Visual PNG Graphic Reports**: Generate and export high-resolution 2x retina financial summary report cards rendered dynamically via HTML5 Canvas 2D.
  - **Excel Workbook (.xlsx)**: Export structured multi-sheet workbooks (Monthly Summary & Itemized Ledger) formatted with native SpreadsheetML.
  - **CSV Ledger**: Download clean tabular transaction files.

- **Privacy-First & Schema Versioning**:
  - 100% local: all data lives in browser `localStorage`. No server communication, no third-party telemetry.
  - Full JSON backup export and restore with schema versioning (`CURRENT_DB_SCHEMA = "V1"`) and automatic data migration pipelines.

- **Progressive Web App (PWA)**:
  - Installable on iOS, Android, macOS, Windows, and Linux directly from your browser.
  - Offline-first caching with Service Worker (`sw.js`).
  - Mobile-first responsive UI with slide-over drawer navigation and touch targets (>= 44px).

---

## Tech Stack & Architecture

- **Frontend**: Vanilla HTML5, Modern CSS (CSS Grid, Flexbox, CSS Custom Properties), Vanilla JavaScript (ES6+).
- **Typography**: [DM Sans](https://fonts.google.com/specimen/DM+Sans) by Colophon Foundry.
- **Storage**: Browser `localStorage` with namespace isolation (`window.ET`).
- **PWA**: Web App Manifest (`manifest.json`) + Service Worker Cache-First Engine (`sw.js`).

### Project Structure

```text
├── index.html          # Single-page shell with hash-routed views
├── manifest.json       # PWA metadata & installation manifest
├── sw.js               # Offline cache-first Service Worker
├── README.md           # Project overview and documentation
├── css/
│   └── styles.css      # Design system, themes, and responsive layouts
├── js/
│   ├── storage.js      # LocalStorage engine, schema migration, exports (PNG, Excel, CSV)
│   ├── settings.js     # Currency config, default income, JSON backup & restore UI
│   ├── income.js       # Per-month income override calculations
│   ├── expenses.js     # Expense CRUD, recurrence logic, price revision split
│   ├── events.js       # Events & programs tracker with vendor quotes & advances
│   ├── dashboard.js    # Dashboard view, KPIs, 12-month trend chart, expense view
│   └── app.js          # Hash routing, hamburger drawer, and app initialization
├── icons/
│   └── icon.svg        # Scalable application icon badge
├── AGENTS.md           # Engineering constraints and domain model specifications
└── DESIGN.md           # Design system guidelines, tokens, and component blueprints
```

---

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/krishnan-jr/PennyWise.git
   cd PennyWise
   ```

2. **Open in browser**:
   - Simply double-click `index.html` or open it with any web browser (`file://`).
   - Or serve with any static local server:
     ```bash
     python3 -m http.server 8000
     # Open http://localhost:8000 in your browser
     ```

3. **Install as App**:
   - In Chrome / Edge / Brave / Safari: Click the install icon in the URL bar or select **Add to Home Screen** on mobile.

---

## License

MIT License. Designed and built with privacy in mind.
