# Design System & Decisions (`DESIGN.md`)

The **Pennywise** (*Every Penny Counts*) UI is inspired by modern, minimalist fintech dashboard aesthetics found in `uiux-example/`.

The redesign establishes a clean, high-contrast, card-based interface centered around a **deep forest emerald & sage green** palette with warm neutral backgrounds, refined typography, and lightweight visual data representations (bars and progress meters) built entirely with pure CSS and SVG without any external dependencies.

---

## 2. Core Design Principles

1. **Content First & Immediate Scannability**: Key financial metrics (Income, Spent, Remaining, Saved %) are immediately prominent, using clear numerical hierarchy and tabular figures.
2. **Restrained Color Palette**: A signature deep emerald (`#0f3e36`) and sage green (`#2d6a4f`) theme brings a calm, premium financial feel. Accent colors (subtle amber, coral, sky) are strictly functional.
3. **No Decorative Clutter & Zero Emojis**: In adherence to stack constraints, no emojis or heavy icon libraries are used. Clear typography and simple CSS geometric shapes/pills communicate status and categories.
4. **Lightweight Visual Insights**: Built-in CSS progress meters and annual mini-bar charts give intuitive context on spending velocity and savings rate without bloat.
5. **Generous Whitespace & Soft Geometry**: Large 16px corner radii on cards, balanced padding, and subtle ambient shadows create a soft, modern desktop and mobile experience.

---

## 3. Color Palette

```css
:root {
  /* Canvas & Surface */
  --bg: #f4f6f8;
  --surface: #ffffff;
  --surface-subtle: #f8fafc;
  --surface-hover: #f1f5f9;

  /* Brand / Deep Forest & Sage */
  --brand-primary: #0f3e36;
  --brand-primary-hover: #0a2e28;
  --brand-secondary: #2d6a4f;
  --brand-light: #e8f5e9;
  --brand-accent: #52b788;

  /* Text & Neutral Scale */
  --text: #0f172a;
  --text-muted: #64748b;
  --text-subtle: #94a3b8;
  --border: #e2e8f0;
  --border-light: #edf2f7;

  /* Status Colors */
  --positive: #0f766e;
  --positive-bg: #e6fffa;
  --negative: #dc2626;
  --negative-bg: #fef2f2;
  --warning: #d97706;
  --warning-bg: #fffbeb;

  /* Expense Type Badges */
  --badge-emi-bg: #ede9fe;
  --badge-emi-text: #6d28d9;
  --badge-sub-bg: #e0f2fe;
  --badge-sub-text: #0369a1;
  --badge-sip-bg: #dcfce7;
  --badge-sip-text: #15803d;
  --badge-one-bg: #fef3c7;
  --badge-one-text: #b45309;
  --badge-adhoc-bg: #f1f5f9;
  --badge-adhoc-text: #475569;
}
```

---

## 4. Typography

- **Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- **Numbers & Currencies**: `font-variant-numeric: tabular-nums` for precise alignment of amounts in tables and cards.
- **Hierarchy**:
  - App Header: `1.15rem`, weight `700`, letter-spacing `-0.02em`.
  - Month Navigator: `1.25rem`, weight `600`, letter-spacing `-0.01em`.
  - Section Headings: `1.05rem`, weight `600`, letter-spacing `-0.01em`.
  - Hero Card Value: `1.85rem`, weight `700`.
  - Metric Card Value: `1.4rem`, weight `600`.
  - Labels & Headers: `0.72rem` - `0.78rem`, uppercase, weight `600`, letter-spacing `0.05em`.
  - Body & Table Data: `0.875rem`, weight `400` / `500`.

---

## 5. Components & Layout Decisions

### 5.1 Topbar & Segmented Navigation
- Top navigation bar styled with a subtle border and crisp white background.
- Pill-shaped segmented navigation control with active state pill background (`--brand-primary`), providing a tactile toggle between **Dashboard**, **Expenses**, and **Settings**.

### 5.2 Month Selector
- Centered or aligned with clean left/right navigation arrows enclosed in subtle pill buttons.
- Contextual override indicator displayed as a discreet banner badge when income is customized for that specific month.

### 5.3 KPI & Metric Cards
- **Hero Card (Remaining / Net Balance)**:
  - High-contrast card using the signature deep emerald (`--brand-primary`) theme.
  - Displays remaining funds or overspent status prominently with an integrated visual savings percentage bar.
- **Secondary Metric Cards**:
  - Crisp white surface cards for **Monthly Income**, **Spent**, and **Saved %**.
  - Each metric card features a small color-coded dot indicator and uppercase tracking labels.
  - Income card integrates an inline override input with subtle border on hover/focus.

### 5.4 Visual Indicators (Charts & Meters)
- **Spending Breakdown (Multi-Segmented Bar & Category Legend)**:
  - Multi-colored horizontal segmented bar showing proportional expenditure by category (`(categorySpend / totalSpend) * 100%`).
  - Categorized breakdown grid featuring vertical color accent strips, category names, formatted monetary totals, and pill percentage badges.
  - Automatically scales from 1 column on compact mobile devices to a 2-column grid on desktop screens.
- **12-Month Spending Trend (Smooth SVG Spline & Gradient Area)**:
  - Rolling 12-month sequence plotting monthly expenditure with smooth cubic Bézier curves.
  - Emerald area gradient fill (`#0f766e` with downward opacity fade) and crisp top stroke line.
  - Horizontal Y-axis benchmark guides with formatted currency intervals and X-axis month ticks.
  - Interactive hover/touch tracking with vertical guide line, glowing halo focus vertex, and floating backdrop-blurred tooltip card displaying the exact month and spent total.
  - Direct tap-to-select interaction to jump directly to any inspected month.
- **Monthly Savings Meter**: Visual progress track displaying percentage saved vs monthly budget.
- **Year Overview Visual Bars**:
  - The Year Overview table incorporates pure CSS proportional mini-bars next to monthly spending totals to allow immediate scanning of peak expense months throughout the year.
- **Interactive Row Selection**:
  - Clicking any month row in the Year Overview smoothly navigates the dashboard to that month, highlighting the active row with a subtle sage accent.

### 5.5 Tables & Expense Lists
- Generous row padding (`0.75rem`), clear column alignment (amounts right-aligned, text left-aligned).
- Type tags rendered as distinct rounded pills with pastel background tints.
- Subtle row hover transitions (`background: #f8fafc`).
- Clean inline "Delete" action buttons with restrained color.

### 5.6 Form Controls & Input Groups
- Modern rounded inputs (`border-radius: 8px`) with soft borders and an emerald focus ring (`box-shadow: 0 0 0 3px rgba(15, 62, 54, 0.12)`).
- Clear field labels with secondary hints for recurring dates.
- Solid primary action buttons (`background: var(--brand-primary)`) with hover brightness transitions.

### 5.7 Empty States
- Reassuring, minimalist empty state boxes with dashed borders and polite text guidance, without any emojis or clutter.

### 5.8 Events & Programs Tracker Blueprint
- **Event Overview Cards**:
  - Displays event name, category type, start/end dates, total quoted/budget, paid/advance total, remaining due balance, and payment progress bar.
- **Advance & Settlement Tracking**:
  - Itemized vendor quotes and bookings with advance payment logging.
  - Three distinct status badges: `Paid` (Full settlement), `Advance Paid` (Pending balance), and `Unpaid`.
- **Hierarchical Navigation**:
  - Seamless navigation between the high-level Programs overview and specific Event item management panels.

### 5.9 Custom Confirmation Dialogs & Exclusion Controls
- **Custom Confirmation Modal (`ET.showConfirm`)**:
  - Elegant modal with backdrop blur, structured title, clear descriptive message, secondary cancel button, and red/emerald primary action button.
  - Completely replaces native browser `alert()` and `confirm()` dialogs.
- **Month-Level Exclusion Box**:
  - Dashed card section showing items skipped for the active month with strikethrough styling and 1-tap "Restore" button.

---

## 6. Mobile-First Architecture & Ergonomics

The application is engineered **mobile-first**, prioritizing thumb navigation, viewport safety, and touch ergonomics on smaller handheld devices before progressively enhancing for tablet and desktop viewports.

### 6.1 Viewport & Safe Area Handling
- Meta viewport configured with `width=device-width, initial-scale=1.0, viewport-fit=cover`.
- Safe area insets (`env(safe-area-inset-bottom)`) applied to fixed bottom bars and floating controls for notched screens and gesture home bars.

### 6.2 Touch Targets & Form Ergonomics
- All interactive controls (buttons, navigation tabs, month switchers, selects, inputs) meet or exceed the **44x44px** minimum touch target standard.
- Form inputs default to a `16px` font size on mobile to prevent unwanted browser zoom in iOS Safari and mobile Chrome.
- Full-width call-to-action buttons on mobile for effortless thumb tap reach.

### 6.3 Navigation Architecture (Drawer on Mobile, Pills on Desktop)
- On mobile viewports (`< 640px`), navigation is housed in a topbar **Hamburger Button (`☰`)** and slide-out **Drawer Panel** with backdrop blur and active link highlights.
- On tablet and desktop viewports (`>= 640px`), navigation smoothly elevates into the topbar header as horizontal pill buttons.

### 6.4 Responsive Content Presentation
- **KPI Metrics**: Stacked or 2x2 grid on mobile with hero balance spanning full width, transitioning to a 4-column balanced grid on desktop.
- **Transaction Lists**: Rendered with touch-friendly spacing and clear hierarchy (primary title and badge on the left, amount and action trigger on the right).
- **Annual Overview**: Responsive cards/table displaying monthly expenditure velocity and mini progress bars cleanly across all screen sizes without horizontal overflow.

---

## 7. Stack & Constraint Compliance

- **No Frameworks or Bundlers**: Built entirely with standard CSS3 and native DOM APIs.
- **No External Network Calls or Fonts**: Uses system font stack and self-contained SVGs/CSS.
- **Zero Emojis**: Strictly uses text labels, glyph arrows (`←`, `→`), and CSS badges.
- **LocalStorage Compatibility**: Retains 100% backward and forward compatibility with existing `et.settings`, `et.expenses`, and `et.incomeOverrides` schemas.

