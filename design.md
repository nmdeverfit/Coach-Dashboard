# design.md

Design rules for the CID v2 demo. **Read this before building or changing any UI.** It records what the Figma file
and the user have settled, so new screens match the ones already built. When Figma and this file disagree, Figma
wins for visuals; update this file in the same change.

Figma file: `idT7h4wCHAIWQ9XQ5VrCvE` (AI Coach Dashboard). Node ids for each surface are listed in `CLAUDE.md`.

## 1. Workflow

1. Get the frame with Figma MCP `get_design_context` (load the `figma-design-to-code` skill first). Treat its code as a
   reference: rebuild it with the project's tokens and components, never paste it.
2. Download every asset with `curl -L` into `src/assets/figma/`, named by role (`icon-*`, `nav-*`, `group-*`,
   `badge-*`, `dot-*`). The URLs expire after 7 days. Keep Figma's inset/bleed wrappers when placing an exported
   vector (`Glyph` in `SessionsBodies.tsx`, `groups.ts`, `TodoRow.tsx`).
3. Use the design's numbers (sizes, paddings, radii) as written, but use tokens for colours.
4. Replace the design's placeholder data with consistent mock data: raw inputs in `src/data/details.ts`, every figure
   and sentence computed in `src/lib/*` (AC4). Never type a derived number into copy.
5. Verify with a Playwright screenshot at 1440 × 900 before publishing.

## 2. Layout

- One layout, **1440 × 900**, web only. Below 1280 px the shell scrolls sideways; no responsive ladder.
- Shell: main sidebar · header (2 rows) · body split in two equal columns (Today's Brief | right rail).
- Right rail: 2 × 2 group cards (`gap-5`, `px-5 pt-5`), then Client highlights. The highlights list is fixed at the
  height of 10 one-line rows (560 px) and scrolls inside.
- **To-do details drawer:** 720 px wide, fixed to the right, full height, `shadow-drawer`. Slides in
  (`animate-drawer-in`, 280 ms) and out (`animate-drawer-out`, 220 ms). Closes on ×, Esc or a click outside.
  - Header bar: 56 px, `px-5`, bottom border, "TO-DO DETAILS" 13 px semibold `ink-secondary`, × 20 px.
  - Content gutter: `px-[30px]`. Title block `py-5`: avatar 44, title 18 px bold, reason 13 px `ink-tertiary`,
    then ✓ (24 px circle) and Dismiss (28 px) at the right.
  - Footer pinned to the bottom: `border-t`, `px-[30px] pb-5 pt-4`, `shadow-footer`, buttons right-aligned, `gap-2`.

## 3. Colour tokens (`tailwind.config.js`)

| Token | Value | Use |
|---|---|---|
| `ink` | `#202353` | Text/Primary: titles, body, values |
| `ink-secondary` | `#838d9f` | Labels, links in card headers, inactive tabs |
| `ink-tertiary` | `#6b7280` | Reason lines, assessment facts, dialog body |
| `ink-muted` | `#9ca3af` | Table headers, empty values |
| `surface-secondary` | `#f4f6fb` | Hover fills, feedback bar |
| `elevated` | `#fcfcfc` | Data cards' body |
| `line` / `line-light` | `#e9e9ee` / `#dfe0e5` | Dividers / button borders |
| `brand` | `#184eff` | Primary buttons, active tab, links, client-name link |
| `checked` | `#0071fd` | Completed check, "Submitted" |
| `ai-line` | `#fc6969` | **AI Assessment card stroke, on every to-do type** (never tinted by status) |
| `status-*-bg/fg` | see config | Status chips only (At risk, Needs attention, On track, No activities) |
| `meal-*`, `macro-*` | see config | Meal Log cells, macro bars |

Rules: no raw hex in components when a token exists. Add a token (with a comment naming the Figma variable or
usage) before using a new colour twice. One-off colours from a frame (credit swatches, `#f9fafa` card wells) may stay
inline with a comment.

## 4. Typography

Open Sans everywhere (Inter Bold for the greeting, Newsreader italic as the banner's serif stand-in).

| Role | Style |
|---|---|
| Greeting | 32 px bold white, `tracking-[-0.64px]` |
| Page / section title | 20 px bold, `tracking-[-0.4px]` |
| Drawer title | 18 px bold, leading 1.5 |
| Card title | 15 px semibold, leading 18 px |
| Group / highlights heading | 14 px bold |
| Body, rows, buttons | 13–14 px; buttons 14 px semibold `tracking-[-0.28px]` |
| Meta, captions, legends | 12 px |
| Chart labels | 9–11 px |

## 5. Components (reuse before building new)

| Need | Use | File |
|---|---|---|
| Card with title + "View …" link | `CardHeader` (44 px, white, bottom border) | `drawer/NutritionTab.tsx` |
| Data tabs | `TabBar` + `DataArea`; tabs with no data area yet are `muted` | `drawer/PanelParts.tsx` |
| Footer buttons | `PanelFooter`, `FooterButton` (`primary` / `ai` / `plain`), `DraftWithAiButton`, `SendMessageButton` | `drawer/PanelParts.tsx` |
| AI Assessment | `AiAssessment` (sparkle + gradient label, quote line, summary + ≤3 facts, Tell me more) | `drawer/AiAssessment.tsx` |
| Label / value rows | `Row` (210 px label column) | `drawer/TrainingTab.tsx` |
| Session log, program | `TrainingTab`, `ProgramCard` (shared by Check-in, Build, Remind, Acknowledge) | `drawer/TrainingTab.tsx` |
| Nutrition | `NutritionTab` (calorie ring + macros, Meal Log) | `drawer/NutritionTab.tsx` |
| The six data tabs | `ClientTabs` / `ClientTabContent` (Check-in panel, client detail page) | `drawer/ClientTabs.tsx` |
| Task & Habit | `TaskHabitTab` (tasks card, habits card with 7 day circles) | `drawer/TaskHabitTab.tsx` |
| Program Ending | `CurrentProgramCard` (180 px labels, end date with year) | `drawer/TrainingTab.tsx` |
| Notes | `NotesTab` (search, day groups, sort, New note) | `drawer/NotesTab.tsx` |
| Form | `FormStatus` (Form Status table) | `drawer/AssessedBodies.tsx` |
| Client detail page | `ClientDetailsPanel`, `ClientDrawer` | `drawer/ClientDetails.tsx` |
| Panel shell | `DrawerAside`, `useDrawerPresence`, `useCloseOnOutside` | `drawer/DrawerShell.tsx` |
| Tooltip | `Tooltip`; the trigger needs `group/tip relative` | `Tooltip.tsx` |
| Confirm | `ConfirmDialog` (400 px, ink primary) | `ConfirmDialog.tsx` |
| Feedback | `Toast` via `showToast` (ink pill, bottom centre) | `Toast.tsx` |
| Status | `StatusChip` (21 px pill) | `StatusChip.tsx` |
| Avatar | `Avatar` (photo or initials) | `Avatar.tsx` |
| Quick actions (AI draft · message · ✓ · more) | `ClientActions` (`where="panel"` one-way ✓, `"list"` toggles) | `ClientActions.tsx` |
| Exported vector with inset/bleed | `Glyph` | `Glyph.tsx` |

Card anatomy: `rounded-lg border border-ink/15 bg-elevated p-px`, `CardHeader` on top, body `p-3`. Credits and
Sessions cards use `border-ink/10` with a `#f9fafa` well, as drawn.

## 6. AI elements

- **AI Assessment card:** white, `rounded-lg`, 1 px `border-ai-line`, `shadow-ai-card` (inset pink glow), `p-4`.
  Label "AI Assessment" 14 px semibold with the Olly gradient as text fill. Summary 13 px semibold; facts 13 px
  `ink-tertiary` bullets. A status-derived type tags its `main_signal` in the summary (blue tint pill); Build,
  Remind and Acknowledge do not tag. Tell me more sits bottom-right inside the card.
- **AI buttons** (Draft with AI, Tell me more, and any new AI action): add the `ai-btn` class (`src/index.css`).
  Rest: white with an inset pink glow. Hover (Figma `5654:528490`): the Olly gradient fills the button, text and
  icon turn white, shadow `0 4px 10px rgba(181,45,223,.2)`, and a blurred white band (opacity 0.5) sweeps once from
  left to right in 0.9 s.
- Olly gradient stops: `#f2617d → #c159aa → #8f51d6 → #6c59e0 → #4861e9 → #2469f3 → #126df8 → #0071fd`.

## 7. States and interaction

- **To-do row** (`TodoRow`, Figma `3925:6908`): Default · Hover (white, `shadow-row`) · Selected (4 px brand left
  border) · Completed (opacity 60%, line-through, filled check). Past rows show the age at the right.
- **Client detail page** (Figma `5671:141948`): the Check-in panel's layout with "CLIENT DETAILS" in the header, no
  ✓ / Dismiss and no footer. Title block: name 18 px bold, "Status:" + chip, then four 32 px icon buttons (Draft
  with AI uses `ai-btn`; its tooltip hangs off a wrapper because `ai-btn` clips). Opened from a group-card row or
  the drawer's name link (‹ back).
- **Client list** (Dashboard tab, Figma `5676:145292`): page `bg-surface-secondary`; metric row `p-3 gap-2`, seven
  equal white cards (`px-3 py-4`, 20 px icon + 14 px semibold label, 20 px semibold number); clicking a card opens
  its tab. Then one white block `p-4 gap-4`: tab row (37 px, 14 px semibold, active = brand text + 2 px underline +
  `bg-brand/10` count; others `ink-secondary` + `bg-ink/5` count; scrolls sideways with no bar), search 376 px and
  dropdowns 38 px tall with a `line-input` border, table header (40 px, sticky, 13 px semibold `ink/50`; Status
  in the Olly gradient with an "AI" pill). Columns: Client 280 · Status (fills) · Activity 440 · Last active 111 ·
  Action 164. Sections Need Review and Review Completed: 48 px `bg-surface-secondary` header, 16 px semibold title,
  white count chip, chevron that collapses. Rows: 8 px status dot (`status-*-dot`), 40 px avatar, name 14 px bold,
  "Program ends Nd" 12 px semibold `ink-secondary`; status chip over the summary (13 px); Activity rich text with
  semibold facts, a "Follow Up" link (bold brand, underlined) or a "Draft a reach out" AI button (28 px); Last
  active 13 px `ink/60`. Hover `bg-elevated`, selected `bg-surface-secondary`; click opens the client detail drawer.
- **Session log cells** (Training tab): 76 px tall, `pt-1.5 pb-2.5`. Date row (20 px) then the state label, which
  sits 39 px from the top on every state; the "3/3" count hangs below the label.
- **Habit day circles** (28 px): done = green tint + check, missed (daily habits) = `#fef2f2` + red ×, not ticked on
  a weekly habit = white with "–". Labels 9 px uppercase in the matching colour.
- **No data:** charts never hide. With nothing logged, Nutrition keeps the ring (empty track, "–" in the centre),
  empty macro bars ("– / 240g"), a Meal Log of "Not logged" cells and summary rows reading "0 meals" / "Nothing
  logged". Training keeps the session log (Missed or Not assigned cells), "No workout yet", "—" adherence and empty
  trend columns.
- **Task status colours:** Done `#059669` · partial / Overdue `status-risk-fg` · nothing yet `ink-muted`.
- Hover reveals Dismiss on rows. Tooltips: Dismiss → "Dismiss"; the row checkbox and the panel ✓ →
  "Complete this task" (hidden once completed).
- The drawer's reason line is never truncated: it flows inline after the status chip and dot, and wraps under the
  chip (13 px, 21 px line height).
- The client name is a blue link only on the drawer title, never on Check-in, never on rows.
- Actions without a built destination show a toast that says where they would go ("… opens in a new tab").
- Motion respects `prefers-reduced-motion` (global rule in `index.css`).

## 8. Copy

- Sentence case for buttons, tabs and tooltips ("Mark form as reviewed", "Complete this task").
- AI-written copy (assessments, reason lines): dates as "27 Aug" or "Thu 27 Aug"; no ISO dates, codes or field
  names; never quote a client message (summarise and give the date); no diagnosis; no hedging; avoid client
  pronouns (use the first name).
- Row ages and data-area dates keep the design's "Aug 27".
- Numbers use thousands separators ("2,900 kcal").
