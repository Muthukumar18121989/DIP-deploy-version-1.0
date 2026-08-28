# Digital Analyzer — UI

Front-end recreation of the Digital Analyzer product screens, built from the
reference screenshots. The goal each time is the same:

> **Same structure, same content hierarchy, same interaction intent — better
> visual execution.**

Open `index.html` directly in a browser; there is no build step.

## Screens

| Screen | File | Notes |
| --- | --- | --- |
| Analyzer Packets (landing after sign-in) | `js/pages/analyzerPacketsPage.js` | Scope switch, search, primary action, 9-column table |
| Customer Details (New Analyzer Packet, step 1) | `js/pages/customerDetailsPage.js` | Reached from **New Analyzer Packet**; customer lookup, shipping profile, optional PLD upload |
| Create Scenarios and Analyzer Packet (step 2) | `js/pages/createScenariosPage.js` | Reached from **Source Data**, arriving with the sourcing-in-progress dialog open; the scenario row expands to its sourced bids |
| Account Association | `js/pages/accountAssociationPage.js` | Reached from **Accounts** on a bid in an editable scenario; parent > subparent > account tree |
| Analyzer Packet | `js/pages/analyzerPacketPage.js` | Reached from **Proceed to Analyzer Packet**; scenario comparison band over two levels of report tabs |

Screens swap below the header via `navigate()` in `js/main.js` — the single
seam to replace when real routing arrives. The header re-renders per screen, so
a view can add its own return path; Account Association uses that for
**Back to My Analyzers**. The packet under construction is held across
navigation, so leaving a screen and returning keeps its state.

## Structure

```
.
  index.html                  page shell + script/style manifest
  styles/
    tokens.css                design tokens — the single source of truth
    base.css                  reset, document defaults, utilities
    components.css            component library
    layout.css                page shell + responsive rules
  js/
    core/dom.js               tiny element factory used by every component
    core/icons.js             inline SVG icon set
    components/               reusable UI components (one file each)
    data/                     demo data — replace with API responses
    pages/                    screen composition
    main.js                   entry point
```

Components are plain factory functions returning real DOM nodes, so the output
stays semantic HTML (`<table>`, `<th scope="col">`, real `<button>`s) with no
build tooling. Each is framework-agnostic and can be ported to React/Angular
later without changing the design system.

### Component library

`AppHeader` · `Panel` · `Button` / `IconButton` · `Avatar` ·
`SegmentedControl` · `SearchField` · `StatusBadge` · `DataTable` /
`RecordLink` · `EmptyState` · `Field` / `SelectField` / `HelpButton` ·
`ChipInput` · `Toggle` · `Accordion` · `FileDropzone` / `FileItem` ·
`Modal` (dialog, wide dialog, or right-anchored drawer) · `Alert` ·
`SummaryPanel` / `Detail` · `Checkbox` · `ScenarioBlock` · `Tabs` ·
`StatRow` · `Breadcrumb` · `Dropdown` · `FilterChips`

Composed dialogs live in `js/dialogs/`.

### Fields

`Field` uses the placeholder to carry the label while empty and floats the
label to the border once the field holds a value, so a filled field is never
left unlabelled. `ChipInput` commits entries on space or enter (and splits a
pasted list); with `multiple: false` it holds a single value, which is how the
parent/child customer lookup behaves.

## Design system

All colour, type, spacing, radius, elevation and component dimensions live as
tokens in `styles/tokens.css`. Screens and components consume tokens only — no
repeated hard-coded values.

- **Type scale**: 11 / 12 / 13 / 14 / 16 / 18 / 22 px, weights 400–700.
- **Spacing**: 4 px base scale (`--space-1` … `--space-8`).
- **Radius**: the 2 / 4 / 6 / 8 / pill scale, consumed through three *role*
  tokens rather than picked per component — `--radius-surface` (outermost
  surfaces: panel, form card, dialog), `--radius-container` (anything nested
  inside one: card, accordion, tree, alert, search bar) and `--radius-control`
  (inputs, buttons, badges, checkboxes). Pills opt out explicitly. Components
  reference the role, so a radius decision is made once.
- **Colour**: semantic tokens (`--color-text-primary`, `--color-info`,
  `--color-error`, …) over the product's existing character — UPS gold for the
  primary action, teal for the selected scope, charcoal table header,
  blue record links. Teal reaches only 4.1:1 as *type* on the grey page, so
  text uses `--color-primary-text` — the palette's own darker teal, not a new
  hue. Fills, borders and states still use `--color-primary` itself.

## UX/UI refinement pass

A polish pass over the built screens: alignment, typography hierarchy, spacing,
component consistency, interaction states and accessibility. **No layout, no
information architecture and no brand colour changed** — the DOM structure of
every screen was fingerprinted before and after and is identical, apart from
two deliberate semantic changes noted below.

**Alignment**

- Every field in `.form-grid` reserves the help-button gutter, with or without
  a `?` in it. Previously a field with help was 28px narrower than one without,
  so the full-width stack had two different right edges and the icons never
  shared an axis. All inputs now share one right edge; all `?` icons share one
  vertical axis.
- The help button's vertical offset was a hard-coded `11px` tied to a 42px
  control; it is now derived from `--field-height`.
- The Reset action in `.report-filters` was 34px in a row of 42px fields. It
  matches the fields it sits beside, so the row has one top and one bottom edge.
- `.record-header` aligns its title and metadata on a shared **baseline**. The
  title's brand rule was dragging the metadata 11px below the title's own text.
- A scenario row's cells shifted 4px sideways on every expand, because the
  collapsed row reserved `--space-3` where the expanded row's gap is
  `--space-4`.
- The leading `Back` link is pulled flush by its own horizontal padding, so it
  sits on the same left edge as the breadcrumb and content beneath it.
- `--key` and `--date` scenario cells have a width floor, so the fixed-shape
  columns line up between stacked scenario cards.

**Typography**

- `.page-title` was 13px bold — smaller than the section headings beneath it,
  and a different size from the identical-level titles on the other two
  screens. All three page titles now share one treatment.
- `.page-heading__subtitle` was bold and outweighed the `.section-title` below
  it. Supporting text now reads as supporting text; the section heading carries
  the weight of its level.
- `.detail__value` was lighter than its own bold label, so a record summary
  read its labels first. Values are primary text, labels secondary.
- Table column headers are semibold, holding them apart from the figures below.

**Interaction and states**

- Every button variant has a pressed state; only `--primary` had one.
- Disabled controls are legible (`#757575` on `#f0f0f0`, up from `#9e9e9e`) and
  keep their treatment on hover, and carry a visible border.
- Table rows grow a leading marker on hover, so a hovered row stays findable
  while reading the far right of a table that scrolls horizontally.
- Tree rows and matrix rows gained hover feedback; the `is-rowhead` label
  column now responds to its row's hover instead of sitting it out.
- The whole `.chip-input` box is a click target; the entry line inside it is
  21px of a 42px control.

**Accessibility**

- **Keyboard focus was invisible on every text input and select.** The global
  focus rule lived in `:where()` at zero specificity and lost to each
  component's own `outline: none`, leaving a 15–18% opacity glow as the only
  indicator. The global rule is declared at real specificity and each affected
  control has an explicit `:focus-visible` ring.
- Every **enabled** control and every piece of body text clears WCAG AA (4.5:1)
  on the surface it actually sits on. `--color-text-muted`,
  `--color-field-label` and teal type each failed against the grey page
  background; each was darkened within its own hue. The one text colour that
  does not reach 4.5:1 is the **disabled** label, at 4.04:1 — WCAG 1.4.3
  exempts inactive controls, and darkening it further would stop a disabled
  button reading as disabled. That is a deliberate limit, not an oversight.
- `Expand To Find Bid Details` was a `<span>` with a click handler — the only
  way into a collapsed scenario, and unreachable by keyboard. It is a real
  button, and focus now follows the disclosure to whichever control replaces it.
- Icon-only controls under 24px extend to the WCAG 2.2 minimum target through
  `.u-tap-target`, which puts the extra hit area on a pseudo-element so nothing
  around it moves. It covers the help button, the table row expander, the
  scenario disclosure and status menu, the account tree expander, the chip
  remove `x` (12px), the pricing-terms row actions (13px) and the
  `Expand To Find Bid Details` disclosure (20px tall). The checkbox reaches the
  same minimum a different way: its input is the hit target and is absolutely
  positioned over an 18px box, so it cannot take a utility that sets
  `position: relative` — it is centred and grown to 24px on its own, leaving
  the visible box at 18px.
- A field whose label ends in `*` carries `aria-required`. The rule lives on
  `DA.components.isRequiredLabel` and is applied by `Field`, `SelectField` and
  `ChipInput` alike, so a required chip field (`Enter Parent*`) announces
  itself like every other required field.
- Empty cells no longer carry an empty `title` tooltip.

**Responsive**

- Below 720px `.form-grid` and the summary panel stack to one column; two 42px
  fields sharing that width left ~150px each and clipped their labels. Desktop
  is untouched.
- An empty table drops its fixed column widths, so the empty state centres in
  what the reader can see rather than in 1180px of empty grid. It was
  previously pushed off to the right and clipped.

**Deliberately not changed**

- The description column between stacked scenario cards still sizes to its
  content, so its dividers do not line up card to card. Forcing it would mean
  truncating `13 WEEKS UPS SHIPPING PROFILE` on the baseline scenario, and
  hiding content to win an alignment is the wrong trade.
- The breadcrumb separator is `/` on the analyzer packet screen and `>` on
  account association. Both come from their own reference screens, so unifying
  them is a call for the design owner, not a defect to fix silently.

## Tables stay tables

`DataTable` renders a real table with a sticky header inside a scrollable
viewport. On narrow screens the table scrolls **horizontally** — it is never
converted into cards, tiles or stacked lists — so column alignment and row
comparison survive at every size.

## Accessibility

- Semantic landmarks (`banner`, `main`), one `<h1>` for the product name, a
  visually hidden `<h2>` naming the screen, and a skip link.
- Table uses `<th scope="col">` plus a visually hidden `<caption>`; the scroll
  container is a keyboard-focusable labelled region.
- Segmented control is a real `radiogroup` with arrow-key navigation.
- Search input has a real (visually hidden) `<label>`.
- Row-count changes are announced through an `aria-live="polite"` region rather
  than adding visible chrome.
- Visible focus ring on every interactive element; `prefers-reduced-motion`
  disables transitions.

## Deliberate deviations from the reference screenshot

Everything else is a faithful recreation. These three changes were made on
purpose and are each a one-line revert:

1. **`ERROR OCCURRED` badges are red** (`--color-error`). In the reference every
   status shares one light-blue treatment, so a failed packet reads exactly like
   a healthy one. Revert by mapping `'Error Occurred'` to `'info'` in
   `js/components/StatusBadge.js`.
2. **Row height 36 px** (reference ≈ 26 px) for a comfortable click target and
   legible vertical rhythm. Revert via `--table-row-height`.
3. **Search field is slightly wider** so the full placeholder is visible instead
   of being clipped mid-word. Revert via `.search-field { max-width }`.
4. **`Add Duration* (In Weeks)` and the drawer's `Scenario Name` are white**,
   like every other filled field. The reference tints them, which reads as a
   different kind of control than the identical fields around them.
5. **The OPP hint wraps to two lines.** The reference fits it on one at roughly
   8.5px, which is below a legible size; it is set at 10px here.
6. **The scenario name truncates on one line** rather than wrapping to two
   before truncating, as the reference does.
7. **The source dialog's filters use the product's own field style** — label
   inside the box — rather than the notched outline the reference draws there,
   so every select in the app looks the same.

8. **The count tiles use line icons** from the product's own icon set rather
   than the reference's 3D isometric illustrations.
9. **Numeric column headers are right-aligned** over their right-aligned
   figures; the reference centres them.
10. **Drill-down figures are not underlined**, so number columns stay quiet.
    Record links — shipping profiles, accounts — still are.

Only the Accessorial view is documented by a screenshot. The Services view
mirrors it, naming its first column `Service` and dropping the accessorial
filter; both show `No data available.` until source data is wired up.

The bid table's header is a warmer dark than the packet list's, matching the
reference. Point `--color-surface-inverse-warm` at `--color-surface-inverse`
to make every table header identical.

## Flow

```
Analyzer Packets ──New Analyzer Packet──▶ Customer Details ──Source Data──▶ Create Scenarios
       ◀───────────────Back───────────────       ◀──────────Back───────────
```

`Source Data` builds the packet record through `js/data/newPacket.js` — a demo
stand-in for the create-packet endpoint. It continues the packet ID sequence
from the existing list (so the first new packet is 112002, as in the
reference), stamps the clock for created/modified, and names the signed-in user
as owner. Any field left blank on the form falls back to the reference customer
so the walkthrough still reads correctly.

## Derived values

`Duration : N Weeks` is computed from the shipping profile window as whole
weeks covering both end dates — `ceil((days between + 1) / 7)`. This reproduces
both reference examples: 05/23/2026–08/15/2026 is 13 weeks and
05/17/2025–04/04/2026 is 47 weeks. It is the only calculation in the UI; no
other business logic is assumed.

## Account association

The counts above the tree are derived from the accounts in it, using each
account's `type` and `associated` flags — the tiles cannot drift from the rows.
Checkboxes cascade: the parent and subparent rows select every account beneath
them.

## Analyzer packet

**Comparison View** is a multi-select dropdown, not a plain select: it lists the
packet's scenarios as checkboxes with an Apply action, so the report can cover
one scenario or several. Applying redraws the comparison band — one row per
chosen scenario, padded to two, then their difference. The charge chips beneath
the filter row are each removable.

Differences come from `scenarioDifferences` rather than being recomputed in the
UI. The figures above them are rounded for display, so subtracting those lands a
unit off on Total Disc and Profit; `DA.figures.difference` derives one only for
a scenario pair with nothing recorded.

Tabs: **Summary**, Rate Charts, **Shipping Profiles**, **Pricing terms**, Other
terms. Shipping Profiles splits again into Cost, Zone, Weight, Account,
Accessorial and Service — built so far: **Cost** (27 columns), **Zone** (15),
**Accessorial** and **Service**. Weight, Account, Rate Charts, Pricing terms
and Other terms render the product's own `No data available.` state rather
than invented content.

Every shipping profile view opens with the same five lane keys (Movement, Mode,
Core Service, Zone, Lane), so those live once in `PROFILE_KEYS` and each view
supplies only its own figures. Accessorial instead groups a parent charge over
its detail lines, with the label columns held on the header's dark bar.

**Pricing terms** (`js/views/pricingTerms.js`) splits into Tier Incentives,
Services, Accessorials and Modifiers. Tier Incentives and the service incentive
plan are matrices rather than record lists — rows are labels, columns are
revenue bands or zones — so they use a `.matrix` table with editable cells
instead of `DataTable`. Services is a three-level tree (region > mode >
service); each branch and plan is built the first time it opens, so a collapsed
tree costs nothing. Modifiers has no reference screen yet.

Summary shows one panel per scenario side by side, each a collapsible
hierarchical table — total, account, sub-total, then service codes. Row labels
carry the packet's customer, so `{customer} MAIN` resolves to the record you
are actually looking at.

`DataTable` grew four variants for this screen: a `plain` header for the
comparison band (weight instead of a dark bar), `dividers` for its column
rules, `tinted` for report table bodies, and an `is-rowhead` column class that
holds label columns visually apart from the figures beside them.

## Expandable rows

`DataTable` owns row expansion: give it `expandKey` (the column whose cell
carries the toggle) and `getChildren(row)`, and children appear beneath their
parent, indented, until it is closed. A row flagged `expanded` starts open.

Where the references break a row out, those children are recorded. Everywhere
else they are derived in `js/data/breakdowns.js` — additive figures split by
share, rates carried down unchanged — so a breakdown always adds back up to the
row above it. Expanding a lane shows the zones it shipped in; expanding an
accessorial shows the services that incurred it.

## Not yet wired

On the account screen, `Search`, `Attach Account` and `Review Changes` are
inert, and `Review Changes` renders disabled as in the reference.

The form does no validation, and on the scenarios screen `Download Scenario
Summary`, `Create New Scenario`, `Update Description` and `Proceed to Analyzer
Packet` do nothing yet — all wait on the workflow rules. `Proceed to Analyzer
Packet` renders disabled, as in the reference. The help (`?`) buttons carry
placeholder text.

Bid selection is live: each bid's checkbox and the header select-all toggle
real state on the scenario record. Non-incented revenue has no checkbox — it is
always included.

## Scenarios

`Create New Scenario` opens a drawer that copies an existing scenario. On save
the new scenario is appended, opens, and folds the others away.

The two kinds of scenario differ, following the reference:

| | Baseline (`Scenario 0`, named *Current*) | User-created |
| --- | --- | --- |
| Status | `Current` | `Analysis In Progress` |
| Bid table | 5 columns | adds **Account Association** |
| Shipping profile | plain text, `S0-` | links, `S1-` and up |
| Extras | — | Simulate New Bid, Save |

A shipping profile link in an editable scenario opens the **source data
dialog** (`js/dialogs/shippingProfileDialog.js`): the bid's reference source and
report window over Services and Accessorial views, each with account and
service filters. Reference Source is the bid number, and the report window is
the packet's shipping profile in `YYYY-MM-DD`.

Copying rewrites the shipping-profile prefix to the new scenario's index
(`S0-UPS-PLD-1` becomes `S1-UPS-PLD-1`); profiles without an index prefix, like
non-incented revenue's `UPS-PLD`, are left alone. The summary row shows the
scenario's **name** then its **description** — the drawer captures both.

## Demo data

`js/data/analyzerPackets.js` transcribes the 15 rows from the reference screen
in the same order. `js/data/session.js` holds the signed-in user (initials
`AA`); **My Analyzers** scopes the list to packets that user owns, which is why
it shows the empty state against this demo data — none of the visible packets
belong to `AA`. Swap both files for API responses when the endpoints land.

## Known placeholder

`js/core/icons.js` draws a **simplified UPS shield** in code. Replace it with the
official brand asset before any external release.
