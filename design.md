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
| Data tabs | `TabBar` + `DataArea`; labels never wrap, padding 20 px (16 px with 7 tabs, 12 px with 8); tabs with no data area yet are `muted` | `drawer/PanelParts.tsx` |
| Footer buttons | `PanelFooter`, `FooterButton` (`primary` / `ai` / `plain`), `DraftWithAiButton`, `SendMessageButton` | `drawer/PanelParts.tsx` |
| AI Assessment | `AiAssessment` (sparkle + gradient label, quote line, summary + ≤3 facts, Tell me more) | `drawer/AiAssessment.tsx` |
| Label / value rows | `Row` (210 px label column) | `drawer/TrainingTab.tsx` |
| Session log, program | `TrainingTab`, `ProgramCard` (shared by Check-in, Build, Remind, Acknowledge) | `drawer/TrainingTab.tsx` |
| Nutrition | `NutritionTab` (calorie ring + macros, Meal Log) | `drawer/NutritionTab.tsx` |
| The data tabs | `ClientTabs` / `ClientTabContent` (Check-in panel, client detail page; Booking only for clients with sessions or credits; Transcript on the client detail page only, `withTranscript`) | `drawer/ClientTabs.tsx` |
| Sessions / Session credits cards | `SessionsCard` (`onRemind` adds a per-session Draft a reminder + green "N completed"), `CreditsCard` (`onIssue` adds Issue Credits beside the balance and starts collapsed) | `drawer/SessionsBodies.tsx` |
| 28 px session buttons | `DraftReminderButton`, `IssueCreditsButton` | `drawer/SessionsBodies.tsx` |
| Task & Habit | `TaskHabitTab` (tasks card, habits card with 7 day circles) | `drawer/TaskHabitTab.tsx` |
| Program Ending | `CurrentProgramCard` (180 px labels, end date with year) | `drawer/TrainingTab.tsx` |
| Notes | `NotesTab` (search, day groups, sort, New note) | `drawer/NotesTab.tsx` |
| Form | `FormStatus` (Form Status table) | `drawer/AssessedBodies.tsx` |
| Client detail page | `ClientDetailsPanel`, `ClientDrawer` | `drawer/ClientDetails.tsx` |
| Panel shell | `DrawerAside`, `useDrawerPresence`, `useCloseOnOutside` | `drawer/DrawerShell.tsx` |
| Tooltip | `Tooltip`; the trigger needs `group/tip relative` | `Tooltip.tsx` |
| Confirm | `ConfirmDialog` (400 px, ink primary) | `ConfirmDialog.tsx` |
| Popup (forms, viewers) | `Modal` (500 px, rounded 16, × on the corner, 20 px title, footer right-aligned) | `Modal.tsx` |
| Transcript tab, Add a meeting, transcript viewer | `TranscriptTab`, `AddMeetingDialog`, `TranscriptDialog` | `drawer/` |
| Feedback | `Toast` via `showToast` (ink pill, bottom centre) | `Toast.tsx` |
| Status | `StatusChip` (21 px pill) | `StatusChip.tsx` |
| Avatar | `Avatar` (photo or initials) | `Avatar.tsx` |
| Quick actions (AI draft · message · ✓ · more) | `ClientActions` (`where="panel"` one-way ✓, `"list"` toggles) | `ClientActions.tsx` |
| Exported vector with inset/bleed | `Glyph` (inline-block, so it sizes inside text too) | `Glyph.tsx` |
| Client list rows / sections | `rowProps`, `ClientCell`, `SectionHeader` | `ClientListParts.tsx` |
| Session swatch, Low credits badge | `Swatch`, `LowCreditsBadge` | `drawer/SessionsBodies.tsx` |

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
- **Today's date** (Meal Log and Training session log, the same style): the number in brand blue, semibold, on a
  20 px `brand-subtle` (#e3ecff) circle. Nothing else in the column changes, and the legend has no Today item (the
  user's call). Today is the day after the summary window.
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
- **Booking tab** (Figma `5689:514998`): same shell as the list (metric row, tabs, search; no Status dropdown).
  Columns Client 280 · Activity 460 (shrinks to 360 first) · Session credits (fills, at least 420) · Action 100.
  No text breaks mid-phrase (`whitespace-nowrap` on every label, badge and button). When any row's line no longer
  fits its column, that whole column stacks (button under the text) in every row, so buttons stay aligned
  (`useStackedColumns` in `BookingTable.tsx`, measured on resize). At 1280 the Activity column stacks; at 1440
  nothing does. Activity: "Next session:" 13 px
  semibold `#4d4d4d` + 14 px swatch + type 14 px semibold `#1a1a1a`; then clock 14 px, date "Tue, Sep 1" 13 px
  semibold black · time "2:00 - 3:00pm" `#4d4d4d`, and a 28 px "Draft a reminder" button (`#f9f9f9`, border
  `#e0e0e0`, rounded 8, alarm 13 px). Credits: "Balance: N", then swatch + type · "N credits expiring in N days"
  (`#ca410a`) or the "Low credits" badge (`LowCreditsBadge`, `#ffebb0` / `#71381d`), and a white 28 px "Issue
  Credits" button with a 12 px +. Action: Send message only. Sections: Upcoming sessions · No sessions booked.
- **Transcript tab** (Figma `5731:517688`, client detail page only, last tab): one card, `border-ink/10`,
  `bg-elevated`, `shadow-[0_1px_3px_rgba(24,78,255,0.07)]`. Header "Meetings with {first}" 15 px semibold + "+ Add
  meeting" 14 px semibold brand. `#f9fafa` well `px-3 pb-3`; rows `px-1 pt-4 pb-[17px]`, bottom border `ink/10` on
  every row. Date tile 56 px (`rounded-[9px]`, day 20 px, weekday 12 px, full date on hover), title 14 px semibold,
  then 12 px `#484848`: clock 14 · time · `#d9d9d9` 4 px dot · video icon + platform (underlined) · "View
  transcript" (semibold ink, underlined). Time always reads "2:00 - 3:00pm (60 min)". Only the selected week's
  meetings, newest first; empty: "No meetings with {first} this week yet." / "… in Aug 24 – 30." (the card title's
  hover gives the range). With eight tabs the tab padding drops to 12 px.
- **Popup** (`Modal`, Figma `5726:511926`): backdrop `black/50` fades in, the card rises in (220 ms). 500 px, white,
  rounded 16, header `px-[30px] py-5` + bottom border, body `px-[30px] pt-5 pb-[30px]` with `gap-4` between
  fields, footer `px-[30px] py-5` + top border. The × is the design's 18 px black disc centred on the top-right
  corner. Forms don't close on a backdrop click (viewers do).
- **Form fields** (Add a meeting): label 13 px semibold ink (Transcript 12 px, as drawn), `(Optional)` 12 px
  `ink-secondary`; input 40 px, `rounded-lg`, `#e0e0e0` border (brand on focus), 14 px / 22 px, placeholder
  `ink-muted`; read-only field `#f7f7f7`. Date and time are native pickers under the design's text ("Aug 31, 2026",
  "7:00 AM"); the time zone is a select behind "UTC-7 ⌄" (11 px semibold `#8c8c8c`, 18 px divider). Errors show on
  submit: `danger` border + 12 px `danger` line under the field, cleared as the coach types. Under date and time a
  second row (no frame): Duration (select, "60 min" + the design's chevron) and End time (read-only `#f7f7f7`,
  "–" until a start time is set). The date picker is bounded to the selected week. Upload file / Paste
  text: two 36 px buttons, active `border-brand bg-brand/[0.03]` brand text and icon (Upload's label semibold,
  Paste's regular, as drawn). Drop zone and paste box 120 px, `border-[1.5px]` (dashed for the drop zone, brand
  while dragging). Buttons: Cancel 36 px white `#e0e0e0` rounded 6, primary 36 px brand rounded 8, both `px-[30px]`
  14 px semibold.
- **Past week** (Figma `4780:125157`, `4798:172414`): Back, Next and Today all enabled (Today white with a
  `line-nav` border; disabled it is `surface-secondary` with muted text). A banner sits under the header: `#f3f6ff`,
  border top and bottom, `px-5 py-2`, history icon 16 px, 13 px `#484848` text, then "Back to this week" 13 px
  semibold ink, underlined. Brief: no hero or to-dos; the 2 × 2 group cards and Client highlights span the width
  (descriptions drop their two-line min height). Upcoming bookings labels always give the date on a past week.
- **Middle column** (Olly / Inbox, Figma `5699:137932`, `5124:499989`, `5699:137775`, `5699:138912`): 360 px,
  fixed left of the 720 px panel (or at the right edge on its own, when opened from a list row with no panel;
  it glides to `right-[720px]` if the client's panel then opens), full height, `shadow-[-4px_0_60px_rgba(0,0,0,0.2)]`. It slides out from behind
  the panel, right to left (`animate-side-in`, 320 ms), and back under it on close (`animate-side-out`, 220 ms). One at a time it has a 56 px header (Olly 16 px bold `black/70` + BETA tag; Inbox the
  client's name 16 px bold), pop-out and ×. Both open: one 44 px tab bar, the inbox tab (name 14 px bold + ×) then
  Olly (14 px semibold + AI pill, pop-out, ×); active tab `#fefefe`, inactive `#f0f0f2`. Olly's background is the
  frame's white → `#f6f8fa` → `#fff9fe` gradient. Coach bubbles (Olly prompts, inbox) are brand; client bubbles
  `#f3f3f4`. Olly answer: "Quick Summary" 18 px bold, 14 px bullets, 4 px `#e6e6e6` quote bar in italics, chart
  card with a 180 px donut (`#0e9cff` / `#ff7657`). Draft card: 2 px pink → blue gradient stroke, "Message to"
  + client tag, editable draft (13 px semibold), 30 px brand Send. Composer: 140 px white card, Ctrl key hint, mic,
  32 px send (grey until there is text).
- **Olly working states** (the user's screen recording; `OllyTask`): after each prompt, "Sending this to the right
  place…" (three pulsing dots in Olly gradient colours + a shimmer sweeping the 13 px semibold text, 0.9 s), then
  the task title over its steps, each a blue spinner that turns into a ✓ (0.75 s each), then one line with a filled
  blue check ("Checked 3 sources", "Drafted 1 message", "Message delivered") and a chevron that unfolds the steps;
  the result fades in under it. While Olly works the composer's send turns into Stop (blue gradient disc, white
  square); stopping leaves "Stopped. Ask again whenever you're ready." Reduced motion skips straight to the result.
- **View switch** (Today's Brief ⇄ Dashboard, `ViewLayer` in `App.tsx`): everything below the header slides as one
  track, 420 ms `cubic-bezier(0.65, 0, 0.35, 1)`. To the Dashboard the brief leaves left and the list comes in from
  the right; back to the brief the reverse. Both views stay mounted, so each keeps its scroll, tab and search.
- **Review from the list** (✓ in a row): the row slides 24 % left and fades (first 55 % of 520 ms), its gap closes,
  then the review lands and the row opens its space in the other section and fades in from 24 px right (420 ms).
  The section's count chip bumps (scale 1.35, 320 ms). Undoing a review moves the row back the same way.
- Motion respects `prefers-reduced-motion` (global rule in `index.css`; the WAAPI row moves check it and skip).

## 8. Copy

- Sentence case for buttons, tabs and tooltips ("Mark form as reviewed", "Complete this task").
- AI-written copy (assessments, reason lines): dates as "27 Aug" or "Thu 27 Aug"; no ISO dates, codes or field
  names; never quote a client message (summarise and give the date); no diagnosis; no hedging; avoid client
  pronouns (use the first name).
- Row ages and data-area dates keep the design's "Aug 27".
- Numbers use thousands separators ("2,900 kcal").
