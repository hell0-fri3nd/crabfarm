# 03 — Design System & UI/UX Guidelines

Follow this file whenever you design, build or review a page, a component or a `custom-` component.

- **Source designs:** `docs/ui/components/` (*Plan · audit, tokens, component map*, *Component library*, *Navigation (shared component)*) and the page mockups in `docs/ui/desktop/`, `docs/ui/tablet/` and `docs/ui/phone/` (every screen, plus the navigation at 1440, 1280, 834 and 390 px). If this file and the designs disagree, the designs win, so update this file.
- **Laws are heuristics, not specifications.** Use them to find likely problems and to explain decisions. Real user evidence and this design system win when they disagree with a heuristic.
- **Breaking a law on purpose?** Say which law and why in the PR description, or in a one-line *why* comment (02 §8).

---

## 1. Workflow (every screen or component)

1. **User and goal.** Who is using it (farm staff on a phone outdoors, or an admin at a desk)? What task are they finishing? What is the **single primary action**? What do they expect from similar apps (Jakob's)?
2. **Structure.** Apply the decision rules (§4) and the components-per-page list (§13).
3. **Every state.** Design default, hover, focus, active, disabled, loading, empty, error, partial, success, long text, and slow/offline network (§16), in **light and dark**.
4. **Validate.** Run the review checklist (§18).
5. **Document.** Note which law drove each non-obvious decision, and any intentional violation and what it traded away.

## 2. Crabfarm Principles

1. **shadcn/ui first.** A `custom-` component exists **only** where shadcn has nothing that fits, and it's **built from shadcn parts**.
2. **lucide-react only** for icons. A status icon always sits next to a word, never alone.
3. **Light and dark are both first-class.** Light is for daytime outdoors, dark (the default) is for the office.
4. **Color is never the only cue.** Severity uses shape + icon + word, with color third.
5. **One primary action per view.** Alerts above data, and data above settings.
6. **Nothing floats over data.** The Assistant lives in the sidebar and top bar. Decorative bubbles sit behind content.
7. **The system absorbs complexity.** Scanning, the scale, the forecast and the assistant do the work, and the user confirms.

## 3. UX Laws, Applied to Crabfarm

### Choice and memory

| Law | Crabfarm rule |
|---|---|
| **Hick's Law**: decision time grows with the number and complexity of choices | One primary action per view. Filters default to 24 h / 7 days / 30 days in a ToggleGroup, with advanced filters in a Popover. Onboarding and Scan are steps (`custom-stepper`), not one long form. |
| **Miller's Law**: a few chunks fit in working memory | Treat 5–7 as the starting point for groups and visible options. The sidebar's 8 items sit in 4 divider-separated groups. The Dashboard shows 5 sensor tiles. Logs and Activity rows are grouped by day. |
| **Tesler's Law**: complexity can only be moved | The QR scan fills batch, group and crab and **locks** them. The scale fills the weight. The forecast runs in the background. The assistant explains *why* a sensor dropped. Power users can still edit before saving. |
| **Cognitive load** | Show only what the task needs. Metadata goes in a details view. Use smart defaults (today, last-used batch) and familiar patterns. |

### Targeting and timing

| Law | Crabfarm rule |
|---|---|
| **Fitts' Law**: time to hit depends on size and distance | Primary actions are **44 px** tall. On phones, **Scan** is the raised center tab and primary buttons sit at the bottom within thumb reach. Extend hit areas with padding. Keep **Stop system** / **Deactivate** away from **Feed now** / **Save**. |
| **Doherty Threshold**: productivity drops past ~400 ms | Acknowledge every interaction within **100 ms** (pressed state). Show a skeleton for anything over **400 ms**, and determinate progress (with cancel where possible) for anything over **3 s**. See §4 Response time. |

### Behavior and memory

| Law | Crabfarm rule |
|---|---|
| **Jakob's Law**: users expect familiar patterns | Left sidebar on desktop, bottom tabs on phones. The logo goes home (Dashboard). Account and sign-out are in the profile row / More sheet. Search sits at the top of tables. Esc/✕ closes dialogs and sheets. Use plain labels and keep standard shadcn behavior. |
| **Serial Position Effect**: first and last are remembered | Dashboard is first in the nav and Activity last. In tables, the identifying column (crab, batch, user) is first and row actions are last. |
| **Von Restorff Effect**: the different item is remembered | Only the primary CTA uses the solid accent (10% green); never more than two accent buttons in a view. Destructive actions use destructive styling, never the accent. Only High severity is a solid red badge. Alerts are the only cards with a colored border. |
| **Goal Gradient Effect**: motivation rises near completion | Onboarding and Scan show "Step X of Y" with `custom-stepper`. |
| **Zeigarnik Effect**: unfinished tasks stick | Unfinished onboarding blocks the portal with a clear resume point. A scan in progress shows where to continue. |
| **Peak-End Rule**: judged by the peak and the end | Success states feel finished ("Cage A1 fed · 9:42 PM", "Log saved · scanner ready for the next crab"). Error recovery always offers a next action. |
| **Aesthetic-Usability Effect**: polish feels easier, and can hide problems | Tokens, type scale and spacing scale only. Polish never replaces function, so still run §18. |
| **Postel's Law**: liberal in, strict out | Trim whitespace, accept `0.62` or `.62`, case-insensitive emails, and pasted QR codes with spaces. Output consistent formats (units, 12-hour times, `B3-B-02` codes). |

### Gestalt (visual grouping)

| Principle | Crabfarm rule |
|---|---|
| **Proximity** | Spacing between groups is about 2–3× the spacing within a group: **8–16 within**, **24–32 between** (§8). |
| **Similarity** | The same kind of action or status always looks the same (§11). A style is never reused for a different meaning. |
| **Common Region** | Cards group related readings and controls. Don't nest cards inside cards. |
| **Uniform Connectedness** | Steppers and timelines use connecting lines (`custom-stepper`, growth chart). |
| **Continuity and Closure** | Align on shared edges. Skeletons show the content's shape before it loads. |
| **Figure/Ground** | Dialogs, sheets and popovers use a scrim and elevation (shadcn defaults). |

### Nielsen's 10 heuristics

| # | Heuristic | Crabfarm rule |
|---|---|---|
| 1 | Visibility of system status | Feeding status is always in the sidebar footer. Live tiles show "now" or the last-seen time. Every save shows pending → success or error. |
| 2 | Match the real world | Use farm words: cage, batch, crab, feed. There are no ponds, so never say pond. No internal jargon (`logs_enum`, `prediction`). |
| 3 | User control and freedom | Reversible actions offer **Undo**. Every flow has Cancel/Back. Wrong crab in Scan → **Rescan**. |
| 4 | Consistency and standards | Same thing, same name, same look, same place (§3, §11, §17). |
| 5 | Error prevention | QR locks IDs. Correct input types and bounds (weight > 0). AlertDialog before anything physical or anything that locks someone out (§15). |
| 6 | Recognition over recall | Selects show names, not IDs. Recent batches come first. Context (batch, cage) stays visible in headers. |
| 7 | Flexibility and efficiency | Bulk feed by group, saved filters in the URL, keyboard submit (Enter), CSV export. None of it clutters the default view. |
| 8 | Aesthetic and minimalist design | Remove anything that doesn't serve the task (no Value column that always reads 0.00). |
| 9 | Recover from errors | Plain cause + fix + action ("Couldn't reach dispenser C4 · Check its power and try again. Nothing was dispensed."). Raw codes go in details or logs only. |
| 10 | Help and documentation | Inline hints at the point of need. The Assistant answers "why" questions in context. |

## 4. Decision Rules

**Navigation**
- Primary nav has about 5–7 items. Past 7, group with dividers. The sidebar has 8 items in 4 groups (§14).
- **Phone bottom tabs: 5** (Home, Feeding, **Scan** raised, Logs, More). Everything else goes in the **More** sheet.
- In-page navigation uses Tabs for 3–5 views (Logs: Crab / Sensor).

**Forms**
- Up to ~5 fields: one page. 6–12: one page with labeled sections of up to 5–7. 13 or more, or fields that depend on earlier answers: **multi-step** with progress, keeping earlier input when going back.
- Every input has a **visible label**; a placeholder is not a label. Mark the optional fields when most are required.
- Validate on **blur or submit**, then re-validate on change once a field has an error: `useForm({ mode: 'onTouched', reValidateMode: 'onChange' })`.
- Use the correct `type`, `inputMode` and `autocomplete` (`email`, `current-password`, `new-password`, `one-time-code` for the PIN, `inputMode="decimal"` for weight and width).
- The submit button shows a pending state and is disabled against double submit.

**Response time**

| Operation | Target | Pattern |
|---|---|---|
| Click/tap acknowledgement | < 100 ms | Pressed/active state, optimistic update |
| Navigation or data fetch | < 400 ms, or show a placeholder | Server prefetch, `loading.tsx` skeleton |
| Submit | < 1 s | Button pending + disabled, label says what's happening ("Saving…") |
| > 3 s or bulk work (sticker PDF, CSV export) | n/a | Determinate progress, time estimate, cancel |

Use optimistic UI only when the action almost always succeeds **and** can be rolled back (toggle a schedule, save a log). On failure, revert and say so. **Never show "Saved" or "Fed" before the server confirms.** Feeding is never optimistic.

**Data display**
- Tables show **5–7 default columns** and **7 rows per page** (Miller's), with the rest of the columns in column settings. The identifying column is on the left and row actions on the right. The primary row action is visible; the rest go in a keyboard-reachable overflow menu.
- The Dashboard defaults to **6–8 widgets** grouped by theme (briefing, alerts, sensor tiles, growth).
- Tables of 5+ columns show as **cards below 1024 px** (one column on phones, two beside the tablet rail) and as the table from `lg`. Only tables that must stay tabular (QR download history) scroll horizontally, with the **first column frozen**.
- **No horizontal page scroll, ever.** Every grid declares its columns (`grid-cols-1` / `grid-cols-[minmax(0,1fr)]`, never a bare `grid`), flex children that hold long rows get `min-w-0`, rows that scroll sideways fade their right edge, and off-screen helpers (canvases) live in a `fixed` 1 px `overflow-hidden` box.
- **Action hierarchy inside a list** (Hick's, Von Restorff): the group's action is the visible one (outline, card heading); per-row actions are quiet (ghost); an exception row (jammed, failed) gets a tinted band and its fix is an outline button. Every column of controls has a visible header (e.g. **Scheduled** above switches). An alert about a row offers **Go to <row>**, which scrolls to and focuses it.

**Mobile**
- Frequent actions sit within thumb reach (bottom bar, bottom sheets).
- Use full-width primary buttons, stacked forms, and **16 px inputs** (`text-base md:text-sm`) so iOS doesn't zoom.

## 5. Accessibility Baseline (WCAG 2.2 AA) & Target Sizes

**Target sizes**
- **Floor (WCAG 2.5.8 AA):** **24×24 px** hit area, or enough spacing that a 24 px circle doesn't overlap a neighbor.
- **Touch-primary (phones, Scan, Feeding):** **44×44 px**, with at least **8 px** between tappable elements.
- **Dense desktop** (table actions, top bar): visually smaller icons are allowed when the hit area is at least 24×24 and a larger alternative exists.

**Baseline**
- Contrast: text **4.5:1**, large text / UI components / focus rings **3:1**, in **both themes**. The light accent `#0A7652` is darkened for 4.5:1 on mint.
- **Keyboard:** everything works by keyboard, in a logical order, with a visible focus ring (`--ring`) that the sticky top bar never hides (2.4.11).
- Semantic HTML before ARIA. Every input has a `<Label>`. Errors link with `aria-describedby` and are announced (shadcn `FormMessage`).
- Status always has text or an icon, not only color.
- Tooltips work on hover **and** focus, can be dismissed, and never hold essential information.
- Respect `prefers-reduced-motion`: bubbles go static and transitions shorten or stop.
- Add a **skip link** to the main content in the portal layout.
- No drag-only interactions (2.5.7). Every drag has a click/tap alternative.
- Live regions: error toasts are assertive, others polite. Live sensor tiles **don't** announce every tick, only severity changes.

## 6. Color: 60 / 30 / 10

- **60%** is the ground, **30%** is surfaces and the sidebar, and **10%** is the logo green (primary actions, the active page, key numbers).
- Severity colors sit **outside** the ratio and never stand in for the brand.
- Light mode stays green: a mint ground and a forest sidebar, **no white**.

| Role | Light (daytime, outdoors) | Dark (default, office) |
|---|---|---|
| 60 · ground `--background` | `#DFEDE4` | `#050A07` |
| 30 · surface `--card` | `#EEF6F1` | `#0C1410` |
| 30 · sidebar `--sidebar` | `#0C2A1E` (forest) | `#0C1410` |
| text `--foreground` | `#0A1F15` | `#E6EFE9` |
| 10 · accent `--primary` | `#0A7652` | `#1EC895` (logo green) |
| on accent `--primary-foreground` | `#F1F8F4` | `#03140D` |
| High `--destructive` | `#B42318` | `#D63A3F` |
| Medium `--warning` (new) | `#8A5100` on `#E8E5CF` tint | `#D6A243` on a dark amber tint |
| Low `--info` (new) | `#1B5E9E` | `#7DB8F0` |

*Severity values are sampled from the mockups. Verify AA contrast when you set them.* There's also a dimmed variant: text `#B9C7BE`, desaturated accent, slower bubbles and a dimmed logo, still AA.

```
60 → --background
30 → --card · --muted · --sidebar · --border
10 → --primary · --ring · --chart-1
High → --destructive   Medium → --warning   Low → --info
```

- Light theme lives in `:root`, dark in `.dark`, switched by `next-themes` with `attribute="class"`.
- Derive the unlisted tokens **in `globals.css` only** (`--popover` = `--card`; `--border` / `--input` = foreground at low alpha).
- Components use semantic classes only (`bg-primary`, `text-muted-foreground`), never raw hex or palette classes.

## 7. Typography

**Inter** for sans and **JetBrains Mono** for code, loaded once with `next/font` and pointed at shadcn's `--font-sans` / `--font-mono`.

```tsx
const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const fontMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`} suppressHydrationWarning>
    <body className="font-sans antialiased">{children}</body>
  </html>
);

export default RootLayout;
```

```css
@theme inline {
  --font-sans: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-mono), ui-monospace, monospace;
}
@layer base {
  body { @apply bg-background text-foreground; font-optical-sizing: auto; }
  h1, h2, h3 { @apply tracking-tight text-balance; }
}
```

| Role | Example | Tailwind classes |
|---|---|---|
| Greeting | Good evening, Art. | `text-4xl font-bold tracking-tight` |
| Page title | Feeding, Logs, Users | `text-3xl font-bold tracking-tight` |
| Section title | Each sensor over time | `text-lg font-semibold tracking-tight` |
| Reading text | Ammonia crossed the limit at 8:12 PM. | `text-lg leading-relaxed max-w-prose` |
| Body | Fed 6:00 PM | `text-sm` (inputs `text-base md:text-sm`) |
| Label | Crab weight (g) | `text-sm font-medium` |
| Muted | Last 24 hours | `text-sm text-muted-foreground` |
| Small | Invited | `text-xs font-medium` |
| Reading value | 0.62 | `text-4xl font-semibold tracking-tight tabular-nums` |
| Unit | mg/L, °C | `text-sm font-medium text-muted-foreground` |
| Code (developer views) | B3-B-02 | `font-mono text-sm` |

- Sizes are Tailwind steps only: 12 · 14 · 16 · 18 · 20 · 24 · 30 · 36. **No arbitrary sizes**, except printed stickers.
- Readings use `tabular-nums`. Assistant Markdown uses shadcn's `typeset` class.
- *Intentional deviation:* desktop body is 14 px (`text-sm`) for density. Phones use 16 px inputs (§4 Mobile).

## 8. Space, Shape, Motion

| Concern | Rule |
|---|---|
| Space scale | `4 · 8 · 12 · 16 · 20 · 24 · 32 · 48` px |
| Grouping (Proximity) | within a group 8–16, between groups 24–32 |
| Control height | **36** compact (top bar, filters, table actions; hit area ≥ 24), **44** default (forms, primary, all touch-primary) |
| Layout | panels pad **24**, grids gap **20**, sections **32** apart, gutters **32** (**16** on phones) |
| Radius | **8** inputs-in-groups · **10** controls · **14** cards · **18** dialogs. **Nested shapes are concentric:** inner radius = outer radius − inset, with an even inset on every side (e.g. composer `rounded-2xl` 18 → Send `rounded-xl` 14 at a 4 px inset; override shadcn's negative addon margins) |
| Motion | **160–240 ms**, on `transform` / `opacity` only, `prefers-reduced-motion` respected |
| Applied (responsive) | Top bars `h-16`, gutters `px-4 md:px-8`. Cards `py-5 px-4` on phones, `sm:py-6 sm:px-6`. Tiles and alerts `p-4`, `sm:p-5` / `sm:px-6`. Form fields `FieldGroup gap-6` (label→input 12 inside a field). Sidebar: header block (logo 24 → profile) and nav are separate regions, only the nav scrolls (thin scrollbar), groups 32 apart (`hr my-4`), items 4 apart. Card header controls drop under the title on phones. Primary buttons are full width on phones. |

## 9. Brand Logo: `custom-brand-logo`

- One `height` prop sets everything. The gap is **0.3×** the height and the wordmark **0.62×** the height.
- Sizes: **20** (stickers, footers), **28** (sidebar, sign-in), **40** (plan board), **64** (splash, print).
- A mark-only variant is used for the collapsed sidebar and the app icon. Built with `next/image` + SVG.
- The logo links to the Dashboard (Jakob's) and has `alt="CrabFarm"`.

## 10. Icons: lucide-react

- **62 icons**, **2 px stroke**, **18 px** in controls and **15 px** in small buttons. Import by name.
- One icon per meaning (Similarity). Icon-only buttons need an `aria-label` and a tooltip.

| Group | Icon → meaning / where |
|---|---|
| Navigation & shell | `LayoutDashboard` Dashboard · `ScrollText` Logs, chat sources · `CalendarClock` Feeding, schedules empty · `QrCode` QR stickers · `ScanLine` Scan, start camera · `Bot` Ask AI, Assistant · `Users` Users · `History` Activity · `UserRound` My profile · `Menu` More · `PanelLeftClose` / `PanelLeftOpen` sidebar collapse/expand · `ChevronRight` profile row · `LogOut` sign out · `Sun` / `Moon` theme · `Bell` alerts · `X` close |
| Status & feedback | `OctagonAlert` High · `TriangleAlert` Medium, warning toast · `Info` Low, info toast · `CircleCheck` success · `CircleX` error toast · `CircleAlert` field error · `Check` done / rule met |
| Sensors | `Thermometer` temperature · `Droplet` pH · `Waves` salinity · `FlaskConical` ammonia · `Wind` oxygen |
| Actions | `Play` start/resume · `Pause` pause · `Square` stop · `Plus` add/new · `Trash` delete · `Download` PNG/PDF · `Camera` / `CameraOff` camera on/off · `Scale` scale connected · `RotateCcw` rescan · `Search` search · `Calendar` date range · `FileDown` export CSV · `Send` send · `ThumbsUp` / `ThumbsDown` feedback |
| Forms & account | `Mail` email · `Lock` password, PIN locked · `Eye` show password · `KeyRound` reset · `UserPlus` invite · `Pencil` edit |
| Buttons | `Utensils` feed now · `Save` save · `LogIn` sign in · `ArrowLeft` back · `UserX` deactivate · `UserCheck` reactivate, change role · `ChartLine` see trend · `ChevronDown` load older · `ChevronLeft` previous |

## 11. Shared Components (component map)

| Component | Built from | Used on | States to design |
|---|---|---|---|
| Navigation | `custom-app-sidebar`, `Sheet` + `custom-tab-bar` | all app screens | ≥ 1024 (laptop and desktop alike): **256** expanded or **72** icon rail (collapse, Ctrl+B, remembered) · 768–1023: **88** rail with labels under icons (wrap, never truncate) · < 768: 5 bottom tabs (raised Scan) + More sheet · active, hover, focus, alert count |
| Button | `Button` | everywhere | default · secondary · ghost · destructive · outline-destructive · sm · loading (keeps width) · disabled · focus |
| Card | `Card` | everywhere | default, header actions, alert border |
| Form fields | `Form`, `Input`, `Label`, `Select`, `Textarea`, `Checkbox` | Auth, Onboarding, Feeding, Scan, Users, Profile | empty, focus, filled, error + message, disabled, read-only (locked from QR), long text |
| Switch, ToggleGroup, Tabs | `Switch`, `ToggleGroup`, `Tabs` | Feeding, Logs, Activity, Dashboard | on, off, focus, disabled |
| Table + Pagination | `Table`, `Pagination` | Logs, Activity, Users, QR stickers | loading rows, empty, no results, day groups, phone: cards or frozen first column |
| Confirm | `AlertDialog` | Feeding, Users, Profile, Assistant | names the object, says what can't be undone, destructive or primary confirm; focus starts on **Cancel** |
| Toast | `Sonner` | every action | success · info · warning · error · with Undo |
| PIN entry | `InputOTP` | PIN login, Onboarding, Profile | numeric keyboard, `autocomplete="one-time-code"`; empty, partial, wrong (shake + tries left), locked |
| `custom-severity-badge` | `Badge` + `OctagonAlert` / `TriangleAlert` / `Info` | Dashboard, Logs, Feeding, Scan | High **solid** · Medium **tinted** · Low **outline**, icon + word |
| `custom-severity-alert` | `Alert` + `custom-severity-badge` | Dashboard, Scan | high, medium, low, success; optional action |
| `custom-status-pill` | `Badge` | Feeding, Users, top bar | running, paused, stopped, offline, invited, deactivated |
| `custom-sensor-tile` + `custom-range-meter` | `Card` | Dashboard | in range, watch, out of range, **no reading** (with last-seen time, never "0"), loading. The meter shows the safe band + a marker, not a fill. |
| `custom-sensor-sparkline`, `custom-growth-chart` | Recharts | Dashboard | safe band, predicted dashed vs actual solid, tooltip per point, empty |
| `custom-theme-toggle` | `Button` + `Sun` / `Moon` | top bar | round 36 px (hit area ≥ 24); icon shows the current mode; the label says the action |
| `custom-ask-ai-button` | `Button` + `Bot` | top bar except Assistant | inverse pill, hover ring, focus ring |
| `custom-bubbles` | Web Animations API | every screen | behind content at 8–9% opacity; rise from the bottom with a random sway, speed and column, respawning at a new spot; a click on a bubble (not on a control) pops it (swell + fade + splash ring, ~0.4 s) and a new one rises; static (mockup layout) with reduced motion, where a pop is a plain fade out and back; `aria-hidden`, never blocks clicks on content |
| `custom-footer` | plain `footer` | every screen | one line; `centered` (auth screens, default "CrabFarm v<major.minor> · Built by Art Lisboa" from `package.json`, or a page hint as children) or `split` (portal: version left, credit right, top border) |
| `custom-page-header` | `h1` + status line + actions | every portal page | title (`text-3xl`), a status line that reports state (never a page description), actions; **column on phones** (actions full width), row from `sm` |
| `custom-card-heading` | `CardHeader` + `CardTitle`/`CardDescription` | every card with a heading | title (`h2`, `text-lg`), description, actions; **column on phones**, row from `sm` (controls right). Never hand-roll a `CardHeader` with `CardAction` |
| `custom-search-input` | `Input` + `Search` + sr-only `Label` | Logs, Activity, Users | 44 px, `type="search"`, trims, drives a URL param; one component for every search field |
| `custom-password-input` | `Input` + `Lock` / `Eye` / `EyeOff` | Login, Onboarding (later Profile) | 44 px, optional lock icon, show/hide toggle with `aria-pressed` |
| `custom-app-sidebar` | `aside` + `Avatar`, `Tooltip`, `Button` + `custom-feeding-status` | portal shell | three CSS modes via the `sidebar-full` / `sidebar-icons` variants (`globals.css`) and `data-sidebar-collapsed` from `custom-app-shell` (zustand `stores/ui-store.ts`, persisted): full (logo + wordmark, profile row, labels, count pill, feeding card), icon rail (48 px targets, count bubble on the icon, tooltips, feeding dot), tablet rail (labels under icons, no collapse) |
| `custom-top-bar` | `custom-theme-toggle` + `custom-ask-ai-button` | portal shell | sticky; Live pill ("updated 12 s ago"), mark-only logo on phones |
| `custom-tab-bar` | `Sheet` | portal shell, phones only | Home (alert dot), Feeding, raised Scan (rounded square), Logs, More; the More sheet has a handle, a 44 px close, QR stickers, Assistant, Users, Activity, My profile, then Sign out below a divider |
| `custom-auth-shell` | `custom-bubbles` + `custom-brand-logo` | Login, PIN login, Onboarding | logo top-left, a `headerEnd` slot top-right (theme toggle), full-height column; the page renders its `main` and `custom-footer` |
| `custom-stepper` | `Check` + connecting line | Onboarding, Scan | done, current (`aria-current="step"`), upcoming; "Step X of Y"; sub-text hidden on phones |
| `custom-brand-logo` | `next/image` + SVG | sidebar, sign-in, stickers | see §9 |
| `custom-empty-state` | icon + `Button` | Logs, Activity, Feeding, Users | no data yet, no results for filters (with **Clear filters**) |

## 12. Charts: Recharts

| Chart | Recharts parts | Component |
|---|---|---|
| Predicted vs actual growth | `LineChart`, 2× `Line` (actual solid, predicted dashed), `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend` | `custom-growth-chart` |
| Feed per day | `BarChart`, `Bar`, `ReferenceLine` (plan), axes, `Tooltip`; days under plan are **striped** (not color alone) | `custom-feed-bar-chart` |
| Each sensor over time | `LineChart`, `Line`, `ReferenceArea` (safe band), hidden fixed-domain `YAxis`, `Tooltip` | `custom-sensor-sparkline` |
| Range meter | plain CSS bar, renders before Recharts | `custom-range-meter` |

- Chart files are `'use client'`. Data comes from a Server Component or TanStack Query with live `events/` (01 §5).
- **One axis per chart.** Weight and width are separate views.
- Colors come from `--chart-*`, `--primary` and the severity tokens only. Patterns or dashes always accompany color.
- Every chart has a text summary nearby (latest value + trend) for screen readers and quick reading.

## 13. Components per Page

A feature's own `custom-` components live in its domain `components/` until a second domain needs them (01 §3).

| Screen | Primary action | shadcn | custom- | lucide |
|---|---|---|---|---|
| **Shell** | — | Sidebar, Sheet, Sonner, AlertDialog | `custom-top-bar`, `custom-tab-bar`, `custom-theme-toggle`, `custom-ask-ai-button`, `custom-feeding-status`, `custom-bubbles` | LayoutDashboard, ScrollText, CalendarClock, QrCode, ScanLine, Bot, Users, History, UserRound, Menu, PanelLeftClose, PanelLeftOpen, ChevronRight, LogOut, Sun, Moon, X, CircleCheck, CircleX |
| **Login** | Sign in | Input, Label, Button, Checkbox, Alert, Sonner | `custom-bubbles`, `custom-theme-switch` | Sun, Moon, Mail, Lock, Eye, CircleCheck |
| **PIN login** | Unlock | Avatar, InputOTP, Button, Alert | — | Sun, Moon, Lock (device keyboard only) |
| **Onboarding** | Continue / Finish | Form, Input, InputOTP, ToggleGroup, Button | `custom-stepper`, `custom-password-rules` | Check, CircleAlert, ArrowLeft |
| **Dashboard** | See trend (on the top alert) | Card, ToggleGroup, Select, Tooltip | `custom-briefing`, `custom-severity-alert`, `custom-sensor-tile`, `custom-range-meter`, `custom-sensor-sparkline`, `custom-growth-chart` | Thermometer, Droplet, Waves, FlaskConical, Wind, OctagonAlert, TriangleAlert, Info, CircleCheck, Bot, ChartLine |
| **Feeding** | Feed now | Card, Switch, Button, AlertDialog, ToggleGroup, Input, Sonner | `custom-status-pill`, `custom-feeder-row`, `custom-schedule-form`, `custom-feed-bar-chart` | Utensils, Play, Pause, Square, TriangleAlert, Plus, Trash, CalendarClock, CircleCheck |
| **QR stickers** | Download stickers | Select, ToggleGroup, Button, Table, Sonner | `custom-qr-sticker`, `custom-sticker-sheet`, `custom-print-bar` | Plus, Download, QrCode |
| **Scan** | Save log | Card, Input, Button, Alert, Sonner | `custom-stepper`, `custom-scan-viewport`, `custom-severity-alert` | Scale, Camera, CameraOff, ScanLine, RotateCcw, Check, TriangleAlert, CircleCheck |
| **Logs** | Export CSV | Tabs, Input, Select, Popover, Calendar, Table, Pagination | `custom-severity-badge`, `custom-empty-state` | Search, Calendar, FileDown, OctagonAlert, TriangleAlert, Info |
| **Activity** | — (read-only) | ToggleGroup, Input, Table, Badge | `custom-empty-state` | Search, History, ChevronDown |
| **Users** | Invite user | Table, Avatar, Select, Dialog, AlertDialog, Sonner | `custom-status-pill` | UserPlus, Search, KeyRound, UserX, UserCheck |
| **My profile** | Save | Card, Avatar, Form, Input, InputOTP, AlertDialog, Sonner | `custom-password-rules`, `custom-theme-switch` | Pencil, Mail, LogOut, Sun, Moon, Check, Save |
| **Assistant** | Send | ScrollArea, Textarea, Button, Card, Alert, AlertDialog | `custom-chat-message`, `custom-source-chip`, `custom-action-proposal` | Bot, Plus, Info, ScrollText, ThumbsUp, ThumbsDown, Send, Square |

## 14. Navigation (shared)

- **Sidebar (8 items, 4 groups):**
  - Dashboard (alert count) · Logs
  - Feeding · QR stickers · Scan crab
  - Assistant
  - Users · Activity
- **Top:** logo (links to Dashboard) + collapse button, then the profile row (initials, name, role, `ChevronRight`).
- **Bottom:** `custom-feeding-status` ("Feeding on · Next feed 6:00 AM"), always visible (Nielsen #1).
- **Active item:** accent text + tinted background + `aria-current="page"`. Counts use a destructive badge with an accessible label ("1 alert").
- **Sticky sidebar** with its own scroll area. Only the content column scrolls.
- **Phone:** 5 bottom tabs (Home, Feeding, **Scan** raised center, Logs, More). The More sheet holds QR stickers, Assistant, Users, Activity, My profile, Sign out.
- The top bar shows the **page name**, not breadcrumbs (flat nav). The footer is one line (version + credit).
- **App-screen pages** (Assistant; later Scan if needed) put `data-fullscreen` on their root: on phones the footer hides and the page reclaims the tab-bar padding, so only the inner list scrolls and the input sits just above the tabs. On wider screens the footer sits below the fold.

## 15. Feedback & Confirmation

**The cost of being wrong decides the pattern.** Reversible actions run at once and offer Undo. Anything physical, or anything that locks someone out, asks first (Nielsen #3, #5).

| Action | Undoable? | Before | After |
|---|---|---|---|
| Save a form (profile, schedule) | Yes, edit again | Validate on blur and submit | Toast · success |
| Turn a feeder off, delete a schedule | Yes | Nothing | Toast with **Undo**, 6 s |
| Save a crab log | Yes | IDs locked from the QR, values prefilled | Toast with Undo, scanner ready for the next crab |
| Feed a cage or group now | **No** | `AlertDialog` naming the cages | Toast · success after the device confirms; the row shows "Fed 9:42 PM" |
| Stop the feeding system | Restart only | `AlertDialog`, destructive confirm | Status pill changes, toast · warning |
| Deactivate a user, reset credentials, change a role | Partly | `AlertDialog` naming the person | Toast; deactivate offers Undo |
| Apply an assistant suggestion | Depends | Preview card, then the **same** `AlertDialog` as the manual action | Toast + Activity entry tagged Assistant |

**Toasts (Sonner)**
- Fire toasts **only** through `notify` (`lib/notify.ts`): `notify.success | info | warning | error | undo(title, { description, onUndo })`. Importing `sonner` directly is a lint error. `custom-toaster` (root layout) renders them: muted surface, 14 px radius, border, status icon (`CircleCheck` primary · `Info` info · `TriangleAlert` warning · `CircleX` destructive), bold title, muted description.
- Success and info close after **5 s**, warnings after **8 s**, and errors **stay until dismissed**.
- At most **3 visible**, newest at the bottom. **Bottom-right** on desktop, **top** on phones.
- Errors are announced assertively; everything else politely.
- The title names what happened, and the description gives the detail or the next step.

**Severity**

| Level | Means | Look |
|---|---|---|
| High | act now: outside the safe range, a feeder failed | solid badge + `OctagonAlert` + "High" |
| Medium | act today: trending toward a limit, a missed feed | tinted badge + `TriangleAlert` + "Medium" |
| Low | note it: calibration due, slow drift | outline badge + `Info` + "Low" |

**AlertDialog copy:** the title names the object ("Deactivate Maria Santos?"). The body says what happens and what stays. The confirm button repeats the verb ("Deactivate"). Initial focus goes on **Cancel**.

## 16. States (design all of them)

| State | Rule |
|---|---|
| Default / hover / focus / active | Visible focus ring (`--ring`, 3:1). Pressed state within 100 ms. |
| Disabled | Faded, still visible, with the reason nearby ("Connect the scale to save"). Never hide an unavailable control. |
| Loading | Skeletons keep the page's shape (Closure). Buttons keep their width and change the label ("Saving…"). Inline text for one part of a page ("Loading the ammonia readings…"). |
| Long work (> 3 s) | Determinate progress, estimate, cancel (sticker PDF, CSV export). |
| Empty | `custom-empty-state`: icon, one-line title, a hint for how to fill it, one action. |
| No results | Same component, with **Clear filters**. |
| Error | Plain cause + fix + action. Field errors sit under the field, linked by `aria-describedby`. |
| Partial | Show what loaded and mark what failed (one sensor offline ≠ the whole dashboard failing). |
| Success | A clear end state (Peak-End) and the next step ready. |
| Long text | Truncate with a tooltip or wrap; never break the layout. Test long names and emails. |
| Slow / offline | Live tiles show the "last seen" time. Device actions show offline status and are disabled with a reason. |

## 17. Copy

- **Titles name the thing:** Feeding, not *Configuration*.
- **The line under a title reports state** ("Running · next feed 6:00 AM"), never a description of the page.
- **Buttons are verb + object, naming the outcome:** "Feed A1 now", "Send invite", "Export CSV".
- **Use farm vocabulary** (Nielsen #2). Hints are short and specific. Errors say what to do ("Weight can't be negative. Re-zero the scale.").

## 18. Review Checklist

Mark each item pass or fail and cite the element. **Report** findings ranked by user impact, each with the element, the law violated, the consequence and the fix.

**Critical (blocks release)**
- [ ] Targets are ≥ 24×24 everywhere, and 44 px for touch-primary (Scan, Feeding, phone nav, forms)
- [ ] Keyboard access and a visible, unobscured focus ring everywhere
- [ ] Contrast meets AA in light **and** dark; color is never the only signal
- [ ] Anything over 400 ms has a loading state, and anything over 3 s has progress
- [ ] Errors say what happened and how to fix it, with an action
- [ ] Physical or lock-out actions confirm; reversible actions offer Undo
- [ ] Every input has a visible label

**Structure**
- [ ] One primary action per view, and at most two accent buttons (Von Restorff)
- [ ] Nav and menus grouped past ~7 items (Hick's, Miller's)
- [ ] Forms follow the field-count rules; steps show progress (Goal Gradient)
- [ ] Conventions followed, or the deviation is justified (Jakob's)
- [ ] Grouping is clear from the 2–3× spacing ratio, regions and consistent styling (Gestalt)
- [ ] All §16 states designed, in light and dark
- [ ] Plain farm vocabulary; buttons are verbs naming the outcome

**Crabfarm**
- [ ] Built from its §13 row; any new `custom-` component is justified and built from shadcn parts
- [ ] Tokens only: no hex, no palette classes, no arbitrary sizes
- [ ] Icons from the §10 map, next to a word or with an `aria-label`
- [ ] New shared components are added to §11 and their screen row in §13

## Don't

- Apply a law blindly when the context or user evidence says otherwise.
- Polish low-traffic screens before Dashboard, Scan and Feeding (Pareto).
- Trade usability for aesthetics.
- Add options "just in case" (Occam's Razor).
