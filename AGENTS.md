# AGENTS.md

## Stack constraints (hard rules)

- Plain HTML/CSS/JS only: no frameworks, bundlers, package managers, or build steps.
- Fully local app: no servers, no network calls; data persists in `localStorage`.
- File extensions are limited to `.html`, `.js`, `.css`.
- No ES modules: `file://` blocks them via CORS. All scripts are plain `<script>` tags sharing a single `window.ET` namespace, loaded in order (see index.html).
- Always version control imports: Always append a version query parameter (e.g. `?v=1.0.1` or `?v=<version>`) to all `<script>`, `<link>` stylesheets, `manifest.json`, and icon asset imports in `index.html`, `manifest.json`, and `sw.js` so browser and PWA updates bypass stale caches and fetch the latest files immediately.

## Structure

- Multiple files grouped by logical feature; load order matters (storage first, app last):
  - `js/storage.js` - localStorage keys, load/save helpers, JSON backup export/import
  - `js/settings.js` - currency config, default income, backup & restore UI, amount formatting
  - `js/income.js` - per-month income overrides on top of the default
  - `js/expenses.js` - expense CRUD, recurrence logic, month/year totals
  - `js/events.js` - trips, weddings, functions, and program expense tracking with quotes & advance payments
  - `js/dashboard.js` - dashboard rendering (KPIs, month list, year overview) and the expense manager view
  - `js/app.js` - view switching / init
- Views (Dashboard, Expenses, Events, Settings) are hash-routed (`#dashboard`, `#expenses`, `#events`, `#events/:id`, `#settings`) tab-switched divs inside a single `index.html`.
- PWA: Offline-ready with `manifest.json` and `sw.js` cache-first service worker.

## Domain model

- Settings: `{ currency, defaultIncome }` under key `et.settings`. Currencies: INR, USD, AED, EUR, GBP.
- Income: default applies to all months; per-month overrides stored in `et.incomeOverrides` as `{ "YYYY-MM": amount }`.
- Expenses (`et.expenses`): `{ id, type, name, amount, category, startDate, endDate }`.
  - Types: `household` (Household & Living; recurring monthly), `emi`, `subscription`, `sip` (recurring monthly, optional end date; open-ended if none), `one_time` (One-Off), `adhoc` (Miscellaneous; single month or date range with optional `endDate`).
  - Recurring expenses count toward every month from `startDate` to `endDate` (YYYY-MM string comparison). If `endDate` is given for one-off or adhoc, it applies across that month range.
- Events & Programs (`et.events`): `{ id, name, type, budget, startDate, endDate, status, notes, items: [{ id, name, category, quotedAmount, paidAmount, status, dueDate, notes }] }`.
  - Statuses for items: `unpaid` (0 paid), `partial` (advance paid, balance pending), `paid` (fully settled).
- Month Exclusions (`et.excludedExpenses`): `{ "YYYY-MM": [ "expenseId1", "expenseId2" ] }`.
  - Deleting an expense from a monthly view excludes it *only for that month* without touching master records.
  - Excluded expenses can be restored with a single tap in the "Excluded This Month" panel.
  - Permanent master deletions are performed only in the Expenses tab.
- Price Revisions (`ET.updateExpenseWithEffectiveDate`):
  - Editing the amount of a recurring expense supports choosing an effective date (e.g. Netflix price increase from 199 to 299).
- Schema Versioning & Migrations (`CURRENT_DB_SCHEMA = "V1"`):
  - Application maintains a constant `const CURRENT_DB_SCHEMA = "V1"` stored in code and persisted to `localStorage` under `et.schemaVersion`.
  - JSON data backups include `schemaVersion: "V1"` in their metadata envelope.
  - Future schema changes utilize `ET.migrateData(source, fromVersion, toVersion)` and `ET.initSchema()` to transform datasets across schema iterations on app initialization, backup export, and backup import.
- Month keys are `YYYY-MM` everywhere; year overview compares months as strings.

## Design conventions

- See [DESIGN.md](DESIGN.md) for the complete design system specification, color palette, typography scale, component blueprints, and visual design decisions.
- Mobile-first design: structured from mobile viewports up with hamburger drawer navigation on small screens, >=44px touch targets, 16px inputs, and card-based transaction layouts.
- Minimalist design style: clean card layout, restrained deep forest emerald and sage palette, generous whitespace, no decorative clutter.
- Confirmation modals: never use native browser `alert()` or `confirm()`. All confirmations use the styled backdrop-blurred `#confirm-modal` (`ET.showConfirm`).
- Never use emojis anywhere in the UI (including labels, buttons, empty states, and messages).
- Prefer text labels and simple CSS shapes over icon libraries.
- Pure CSS/SVG for visual progress bars and data comparison meters without external charting libraries.


## Verification

- No test/lint tooling exists or should be added. Verify changes by opening `index.html` in a browser and exercising the affected flows manually.
- Check the browser console for errors after any JS change.

## Roadmap / phase status

- Phase 1 (done): optional monthly income (default + per-month override), EMI/subscription/one-time/ad-hoc expenses with tenure support, dashboard KPIs (income, spent, remaining, saved %), month navigation and year overview, configurable currency in Settings, backup/restore.
- Phase 2 (done): category breakdown, 12-month spending trend SVG curve graph with interactive hover/touch tooltips, month-over-month trend KPIs, edit support for expenses with automated tenure-split price revisions, events & programs tracker, month exclusions & restore, high-res PNG graphic report generator, and Excel (.xlsx)/CSV export.
