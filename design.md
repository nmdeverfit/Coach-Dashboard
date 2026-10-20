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
  height of 10 one-line rows (560 px) and scrolls inside. The white card opens on two view tabs, Need attention
  | History (no counts; the category tabs carry them), underlined like the panel's `TabBar` (13 px semibold, brand + 2 px brand line when active,
  `border-b border-line`; the two split the width evenly, labels centred), then the category tabs and list as before; the header chip counts Need attention.
  A hovered Need attention row turns `bg-surface-secondary` and shows its actions (Figma `5795:175100`) over its
  right end: a white bar, rounded 8, `p-1`, `drop-shadow 0 4px 10px rgba(0,0,0,0.06)`, `right-1`, centred; 32 px
  buttons rounded 10 (👍 emoji 20 px, hidden for now · Draft with AI with `.ai-btn`, pencil-ai 18 px, the Olly
  gradient and white icon on hover · chat bubbles 18 px · close stroke 18 px), each with the dark tooltip above (below
  on the first row, which the list would clip). A reacted 👍 sits on `bg-brand/10`. History rows have two lines
  (`gap-3`). Completed (Figma `4341:459184`): row `bg-[rgba(244,246,251,0.8)]`, then a "Message sent" tag (116 px,
  `bg-[rgba(227,236,255,0.8)]`, rounded 8, `px-6 py-2`, 12 px check-one + 12 px semibold brand) and Open chat (chat
  bubbles 18 px + 12 px semibold ink, `gap-1`), `gap-3`, `pr-[18px]`. Dismissed (no frame): white row, avatar at
  50 % in greyscale, text `ink-secondary`, a "Dismissed" tag hugging its words with the same ~10 px side padding (`px-2.5`, no fixed width) on `bg-surface-secondary` (12 px close
  stroke + 12 px semibold `ink-secondary`) and Restore (14 px rotate icon + 12 px semibold ink). History's list opens on a note, 12 px
  `ink-secondary`, `px-3 pb-2.5` (with the category tabs stacked above, `pb-2.5` only and no list top padding, so it
  starts right under the tabs, flush with the first tab's left edge): "Moments older than 30 days are cleared automatically." + Clear all (12 px semibold
  ink, underlined, brand on hover; only when History has rows), which asks in the `ConfirmDialog`. Empty (Figma `5809:544623`): `EmptyArt` (160 × 140 drawing of a window, two client cards and a
  blue check) then one 13 px `ink-secondary` line, centred, `gap-5`, `py-10`. The line follows the view and category
  tab: "All caught up! No {client moments / milestones / birthdays / anniversaries} need you right now." in Need
  attention; "No history yet. Moments you message or dismiss show up here." / "No {birthdays} in History yet." in
  History (the frame's own line was for style only, the user's call).
  Every highlight row shows when the moment happened (`on`) at its right edge, outside the sentence (the user's
  call): 11 px `ink-muted`, "Today", "Tomorrow" (a birthday still to come), "1d ago" … "6d ago", else "Aug 21"; the
  hover bar covers it.
  Upcoming bookings is a session list (the user's call, on both branches): one row per booked session, soonest
  first, rows `py-2.5`, `gap-1.5` between lines. Line 1: 14 px `Swatch` in the type's colour + session name 14 px
  semibold ink. Line 2 (12 px, left-aligned with line 1): date • time `ink-secondary` ("Today • 6:30 - 7:30pm",
  "Sep 1 • 8:00 - 9:00am", no weekday), a 2 px dot, 16 px avatar, client name medium (500) ink. Empty state "No
  sessions booked right now."; the count chip counts sessions. A row opens its client on the Booking tab, and the
  panel scrolls (smooth, after its slide-in) so the Sessions card is in view.
  Its description reads "Sessions booked for the next few days, 1:1 and group." (the user's call: the rows are
  sessions, not clients).
  A group session (Small group HIIT, the user's call) keeps line 1 and the date • time; after the dot comes a stack
  of the first three clients' 16 px avatars (`-ml-1`, white ring) and a link button "17 clients" (12 px semibold
  `brand`, underline on hover). Hovering or focusing it shows the roster: a 240 px white popover (border `line`,
  rounded 8, shadow `0 4px 16px rgba(0,0,0,0.12)`), "ENROLLED · 17" 11 px caps, then 20 px avatar + name rows,
  scrolling past ~8; below the link, or above when it does not fit. A click on the row opens **Session details**
  (Figma `5825:544656`): a 540 px panel from the right with the drawer shadow, "SESSION DETAILS" + ×; body
  sections 20 px left and right, the same as the title block's top (the user's call); swatch
  16.8 px + name 18 px bold `#1a1a1a`; "Tue, Sep 1 · 5:30 - 6:30pm (60min)" 14 px; View calendar (outline, 32 px,
  toasts); info lines with 16 px icons (location + directions with a grey bar, credits per spot, description,
  Trainer: You with the coach avatar); a top border, then pill tabs Enrolled 17/23 | Canceled 1 (active = `#1a1a1a`
  border) and 28 px avatar + 14 px name rows, which open that client on the Booking tab.
- **Customize cards** (Figma `5749:521640` + a tab, a trial on both branches; extra cards keep the 2 × 2 grid, so six
  make three rows): each card's header ends in a chevron (collapse
  toggle) and a 28 px ⋯ button (`icon-more`) opening a 190 px menu (white, `#e0e0e0` border, rounded 8, shadow
  `0 8px 24px rgba(0,0,0,0.12)`; Remove in `danger`; last item "Customize cards…"). Collapsed card = header only,
  `py-3`, with View all at the right (text only, no arrow); in the two-column (past week) grid it spans both columns.
  Dashboard Settings' item reads "Customize cards" on both views (the user's call), so the menu item, the ⋯ menu
  and the popup share one name.
  The popup is the shared `Modal` at 800 px, title "Customize cards", then the header's view toggle (32 px, 13 px) as
  tabs Today's Brief | Dashboard, then two columns: shown (449 px, `bg-surface-secondary`, rounded 8, `p-4`, tall
  enough for eight rows so tabs never change the height; heading 12 px semibold uppercase `ink-tertiary` + "(Drag to
  reorder)" 13 px, count "4/6" at the right) and the library (275 px, hint "Click ⊕ or drag to left column to add
  card / metric", or "Up to 8 cards. Remove one to add another." when full; both tabs list the same nine cards). Rows as drawn: white, `border-line`,
  rounded 8, `py-3 pl-2 pr-3`, drag dots 16 + icon 20 + name 14 px semibold, ⊖ / ⊕ 16 px at the right on every row
  (no locks, no "Also on …" line; both tabs look the same).
  Dragging (the user's reference): the browser's drag image is the card, its slot stays as an empty
  `bg-surface-secondary` box, and a 3 px brand line sits in the gap closest to the pointer (none in the card's own
  two gaps, where nothing would move). A shown card dragged over the library (still held) lights it up: a 2 px
  dashed brand border, rounded 12, 8 px outside the column, `bg-brand/5` behind the rows, and the hint turns brand
  semibold "Release to remove {card}". Footer: "Reset to default"
  (13 px semibold underlined) · Cancel (44 px, rounded 5) · Save and Continue (44 px brand). Toast "Cards updated".
  **Dashboard Settings** (`5749:521870`): open = `bg-brand/10`, `border-black/15`, brand text and gear; the menu
  hangs 4 px under it, right-aligned, 252 px, white, rounded 4, `0 0 2px #b0bac8, 0 4px 16px rgba(37,40,48,0.1)`,
  an 8 px arrow, `py-3`, items 34 px, `px-5`, 16 px icon + 13 px `#333`.
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
| `status-*-bg/fg` | see config | Status chips only (At risk, Needs attention, On track, No activities). Needs attention = `#ffebb0` / `#71381d` (Figma `4617:126745`) |
| `meal-*`, `macro-*` | see config | Meal Log cells, macro bars |

Rules: no raw hex in components when a token exists. Add a token (with a comment naming the Figma variable or
usage) before using a new colour twice. One-off colours from a frame (credit swatches, `#f9fafa` card wells) may stay
inline with a comment.

## 4. Typography

Open Sans everywhere (weights 400, 500, 600, 700 loaded; Inter Bold for the greeting, Newsreader italic as the banner's serif stand-in).

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
| Notes | `NotesTab` (search, day groups, sort, New note; every note has a bottom line, title 14 px, date 11 px; list capped at 580 px) | `drawer/NotesTab.tsx` |
| Form | `FormStatus` (Form Status table) | `drawer/AssessedBodies.tsx` |
| Client detail page | `ClientDetailsPanel`, `ClientDrawer` | `drawer/ClientDetails.tsx` |
| Panel shell | `DrawerAside`, `useDrawerPresence`, `useCloseOnOutside` | `drawer/DrawerShell.tsx` |
| Tooltip | `Tooltip`; the trigger needs `group/tip relative` | `Tooltip.tsx` |
| Confirm | `ConfirmDialog` (400 px, ink primary) | `ConfirmDialog.tsx` |
| File chip icon | `FileTypeIcon` (tile tinted by extension) | `FileTypeIcon.tsx` |
| Popup (forms, viewers) | `Modal` (500 px, rounded 16, × on the corner, 20 px title, footer right-aligned) | `Modal.tsx` |
| Transcript tab, Add a meeting, transcript viewer | `TranscriptTab`, `AddMeetingDialog`, `TranscriptDialog` | `drawer/` |
| Feedback | `Toast` via `showToast` (Figma `4805:185601`: `#151619`, rounded 5, `p-5`, 13 px semibold white, 12 px ✕ `gap-[90px]` after the text, text wraps at 360 px; fixed top-right, 16 px from the top and right, above every panel and popup, slides in 240 ms, 3 s or ✕) | `Toast.tsx` |
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
  Label "AI Assessment" 14 px semibold with the Olly gradient as text fill. Summary 14 px semibold; facts 14 px
  `ink-tertiary` bullets (one px up from the frames' 13, the user's call). A status-derived type tags its `main_signal` in the summary (blue tint pill); Build,
  Remind and Acknowledge do not tag. Tell me more sits bottom-right inside the card.
- **Pinned AI Assessment** (Figma `5747:520276` collapsed, `5747:520431` View more hover, `5747:520587` expanded):
  once less than 100 px of the card shows in the panel's scroll area, a copy pins under the 56 px header, over the
  data area (it never moves it): a white strip, `p-2.5`, `0 5px 18px rgba(0,0,0,0.09)`, fading down in (180 ms),
  around the same card (`pt-3 px-4`, `pb-3` collapsed / `pb-4` open). Collapsed: label + summary, 3 lines at most,
  its full stop replaced by "… View more" (semibold `ink-tertiary`, underlined, brand on hover). View more
  adds the facts, "Show less" after the last one, and the Add context · Tell me more row. Add context or Edit from
  the pinned card scrolls back to the card and opens the questionnaire there. Scrolling back unpins and folds it.
  Every panel with an assessment has it (Check-in, Build, Remind, Acknowledge, client details).
- **Add context** (Figma `5746:520123` button, `5744:519377` open, `5746:519756` saved; `drawer/AiContext.tsx`): the
  card's bottom row is `justify-between`, Add context left, Tell me more right. Button 36 px, white, `border-line-light`,
  rounded 4, list-plus icon 20 px + "Add context" 13 px semibold `ink-tertiary`. Hover (no frame): the dark
  `Tooltip`, `wide start` (wraps at 240 px, left edge on the button's, arrow over the icon): "Tell the AI how you coach {first}, so the assessment matches your
  approach." It opens the questionnaire below the
  row (the button hides while open): `bg-surface-secondary`, `border-line-light`, rounded 8; header "Add context for
  AI Assessment" 16 px semibold with Cancel (white, 88 × 32, rounded 5) and Save (brand, 88 × 32, disabled until
  something is filled in). Questions are numbered 14 px semibold, split by `border-line-light`: 1. How do you coach
  {first}? (High touch · Low touch · Self-guided, single choice, a 13 px `ink-tertiary` hint under the choice);
  2. What doesn't {first} track? (Nutrition · Tasks & Habit, multi) + Additional note; 3. Note for the next
  [2 weeks ⌄] (1, 2, 4, 8; a native select under the design's field) + note. Choice chips: pill, 36 px, `px-5`,
  13 px; on = `border-brand bg-brand/5` semibold brand, off = `#e0e0e0` + `black/60`. Note box: `#fafbfc`,
  `#d4d7d9` border (brand on focus), 80 px, 0/255 counter 12 px `ink/50`. Saved: a `bg-brand/5` chip, 36 px,
  brand check-circle 16 px + "Context added" 12 px semibold, a 16 px divider, underlined "Edit" 12 px (reopens the form
  with the answers); hover shows the summary. Saving with every answer cleared removes the context.
- **AI buttons** (Draft with AI, Tell me more, and any new AI action): add the `ai-btn` class (`src/index.css`).
  Rest: white with an inset pink glow. Hover (Figma `5654:528490`): the Olly gradient fills the button, text and
  icon turn white, shadow `0 4px 10px rgba(181,45,223,.2)`, and a blurred white band (opacity 0.5) sweeps once from
  left to right in 0.9 s.
- Olly gradient stops: `#f2617d → #c159aa → #8f51d6 → #6c59e0 → #4861e9 → #2469f3 → #126df8 → #0071fd`.

## 7. States and interaction

- **To-do row** (`TodoRow`, Figma `3925:6908`): Default · Hover (white, `shadow-row`) · Selected (4 px brand left
  border) · Completed (opacity 60%, line-through, filled check). Past rows show the age at the right. A ticked row
  shows its tick for 150 ms, slides 24 % left and fades out (320 ms, ease-in), then drops to the bottom of its
  section while the others close up (each row eases from its old place, 380 ms, `cubic-bezier(0.22,1,0.36,1)`) and
  fades in there from 24 px right (320 ms). Under reduced motion it shows the tick for 450 ms and moves without
  animation. Unticking puts it back
  in its ranked place. The user's call; the brief keeps a completed row in place.
- **Client detail page** (Figma `5671:141948`): the Check-in panel's layout with "CLIENT DETAILS" in the header, no
  ✓ / Dismiss. Opened from a to-do's name link, the header starts with a 24 px back chevron (`icon-chevron-left`,
  `ink-secondary`). Title block: name 18 px bold, "Status:" + chip, then four 32 px icon buttons (Draft
  with AI uses `ai-btn`; its tooltip hangs off a wrapper because `ai-btn` clips). Opened from a group-card row or
  the drawer's name link (‹ back). No footer while the icons show; once they scroll up out of view the same four
  actions rise in as the to-do panel's footer (no frame, the user's call; 220 ms slide up), right-aligned: "Mark as reviewed" (primary,
  "Reviewed" and disabled once done) · "Draft with AI" · "Send message", labelled, then More as a 40 px square icon
  button (`border-line-light`, rounded 8, tooltip "More"), last. Scrolling back to the top removes it.
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
  sits 39 px from the top on every state; the "3/3" count (workouts done / assigned) hangs below the label.
  A day with workouts lifts 2 px with a soft shadow (`0 6px 14px rgba(32,35,83,0.14)`, 150 ms) on hover or focus.
  Hover (Figma `4899:687161`): white card, rounded 8, `px-3 pt-2 pb-2.5`, shadow `0 4px 24px rgba(0,0,0,0.12)`,
  a 10 × 5 arrow under it; "Mon, Aug 24" 11 px `ink-tertiary`; "Completed" / "Partial" / "Missed" 12 px semibold
  ink + "(5/5 workouts)" regular; then one row per workout: 14 px ✓ (`#059669`) or × (`#f03358`) + the name 12 px
  `ink-tertiary`, 180 px wide. Today and upcoming days read "Assigned (3 workouts)" with a grey dot per workout.
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
- A finished action confirms with a toast in the past tense: "To-do has been completed" / "To-do has been reopened",
  "To-do has been dismissed", "{First} marked as reviewed", "Context saved
  for {First}", "Meeting added", "Cards updated", the highlight toasts. Sending a message has none (Olly and the Inbox show it).
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
  meeting" 14 px semibold brand. `#f9fafa` well `px-3 pb-3`. Every meeting, newest first, under a week header:
  12 px semibold uppercase `ink-muted`, `pt-3 pb-1`, the week selector's label ("AUG 24 - AUG 30"). Rows `px-1 pt-3
  pb-[13px]`, bottom border `ink/10`: date tile 56 px (`rounded-[9px]`, day 20 px, weekday 12 px, full date on
  hover), title 14 px semibold, then 13 px: clock 14 + "5:30 PM - Aug 27" (`#484848`) · `#d9d9d9` 4 px dot · video
  icon 14 + platform (ink, plain text). Hover (or focus): the row sits on a white card, rounded 4,
  `0 0 10px rgba(0,0,0,0.05)`, 5 px wider than the list on each side, its border hidden, and "View summary"
  (13 px semibold, brand on hover; "View transcript" for a meeting the coach added) shows at the right; a click anywhere on the row opens the popup. The well is
  capped at 580 px like the Notes list and scrolls inside, each week header pinned (`sticky`, `#f9fafa`). Empty: "No meetings
  with {first} yet." With eight tabs the tab padding drops to 12 px.
- **Latest call** (the user's mock): on top of the Transcript tab's well, above the scrolling list (which keeps its
  580 px cap): "LATEST CALL" 12 px semibold uppercase `ink-muted`, then a white card (`border-line`, rounded 8, `p-4`,
  `gap-4`): the 56 px date tile + title 15 px semibold + "2:00 PM · 45 min · Microsoft Teams" 13 px `ink-tertiary`;
  the Call Summary's overview 14 px semibold ink; "Discuss" 13 px semibold `ink-secondary` over up to three 14 px
  `#484848` bullets (muted markers); a top border, then "View full summary" (brand, opens the popup on Summary) and
  "Transcript" (`ink-secondary`, opens it on Transcript), 14 px semibold. The mock's top-right element and its pink
  callout were struck out, so neither is built.
- **Meeting popup** (Figma `5759:161235`): 620 px `Modal` with no rule under its header; title 20 px semibold, then
  14 px / 22 px: 20 px avatar + client name (semibold ink) · 4 px `#d9d9d9` dot · "Tue, Aug 4, 2026 · 12:30 PM ·
  Google Meet" (`ink-tertiary`). Then a full-width tab bar (`border-b border-line`, `px-5`; tabs `px-5`, 13 px
  semibold; active brand with a 2 px brand underline, `pt-1.5 pb-2`; inactive `ink/40`), pinned with the search on
  Transcript. Body `px-5`, at least 640 px so both tabs keep one height. Summary (default for recorded calls):
  "Call summary" card drawn exactly as the AI Assessment (`AiCard`) without its bottom row, then `gap-6` and
  "Discuss" and "Your Follow Up", each under a `border-line` top rule, `px-2 py-4 gap-2`: 16 px semibold title
  (`-0.32px`), 13 px / 1.5 ink bullets (`ms-[19.5px]`, no gap), a leading "Topic:" in bold. The frame's footer
  (Cancel · Add meeting) is left out: it is the Add a meeting form's and has no job in a viewer. Meetings the coach
  added have no summary: Transcript opens first and Summary reads "No summary for this meeting yet…".
- **Transcript tab of the popup**: the lines sit at `px-[30px]`, so speaker names line up with the title and avatar
  (the user's call); the Notes search field (38 px, `#dbdce3`, brand
  on focus) is pinned on top of the scrolling body, focused on open; with a query it shows "2 of 8" (12 px
  `ink-secondary`) and ↑ / ↓ buttons (24 px, the chevron icon). Matches `#fff1b8`, the current one `#ffd666`,
  scrolled to the centre. Lines: speaker 13 px bold + time 12 px `ink-muted`, text 13 px `#484848`, `gap-4`. In
  pasted or uploaded text, a line opening with the coach's or client's name ("Long (04:12):") has the name in bold.
- **Change Client Status** (Figma `5829:551881` / `551995` / `552126`, `ChangeStatusDialog`): 480 px `Modal`, no
  rules, subtitle 20 px avatar + name 12 px; labels 12 px semibold `#1a1a1a`; Current status pill (border
  `line-light`, rounded 4, 6 px status dot); New status select 40 px, `#fafbfc`, rounded 5, `line-light` border
  (brand while open), menu under it (border `#dadfea`, rounded 4, rows `px-3 py-2.5` 12 px, hover/selected
  `surface-secondary` + brand semibold); Reason textarea 108 px, border `#e0e0e0`, rounded 8, 14 px; the note 12 px
  `ink-tertiary`; Cancel (white, `#e0e0e0`, 30 px) · Update Status (brand; disabled `#eeedec` + `ink-muted` until a
  status is picked). After it: the feedback strip reads "Status changed to '{status}'. We'll use your correction to
  improve the status."; the list's Activity column reads "~~At risk~~ → **Needs attention**" (old in
  `ink-secondary`, struck) and "Reason: …" ("Reason:" `ink-secondary`); hovering the row's status dot shows a white
  rounded-12 card above it: "Status changed:" 13 px semibold `ink-secondary`, then `StatusChip` → `StatusChip`.
- **Tab buttons** (client detail page, the user's call): a row right-aligned under the tab's last card; 30 px like
  the header's Dashboard Settings, rounded 4, `border-black/15`, white, 12 px semibold ink, `px-5`: a step
  below the quick actions and the footer buttons. Training: Deep analysis with the 14 px AI sparkle and `.ai-btn`, dark tooltip
  above, right-aligned (`Tooltip end`). Nutrition: Adjust meal plan, plain (hover `surface-secondary`), with Figma `5835:570011`'s
  task-edit icon at 16 px and 60 % opacity (`icon-meal-plan-edit`).
- **Popup** (`Modal`, Figma `5726:511926`): backdrop `black/50` fades in, the card rises in (220 ms). 500 px, white,
  rounded 16, header `px-[30px] py-5` + bottom border, body `px-[30px] pt-5 pb-[30px]` with `gap-4` between
  fields, footer `px-[30px] py-5` + top border. The × is the design's 18 px black disc centred on the top-right
  corner. Forms don't close on a backdrop click (viewers do).
- **Form fields** (Add a meeting): label 13 px semibold ink (Transcript 12 px, as drawn), `(Optional)` 12 px
  `ink-secondary`; input 40 px, `rounded-lg`, `#e0e0e0` border (brand on focus), 14 px / 22 px, placeholder
  `ink-muted`; read-only field `#f7f7f7`. Date and time open the page's own dropdowns (`Pickers.tsx`), never the browser's:
  the published page runs in an iframe that blocks `showPicker()`. The fields read "Aug 31, 2026" (+ the design's
  chevron) and "7:00 AM"; the dropdown hangs 4 px under the field (white, `#e0e0e0` border, rounded 8,
  `0 8px 24px rgba(0,0,0,0.12)`, rendered into `<body>`). Date: a 280 px month calendar (‹ month year ›, Su–Sa,
  32 px day circles, selected brand, today brand semibold, days after today greyed). Time: 15-minute steps, 32 px
  rows, selected `brand-subtle`, opens centred on the choice (else 9:00 AM, or on today the latest allowed, 6:00 AM,
  with later times greyed). Esc or a click outside closes only the dropdown. The time zone is a native select
  behind "UTC-7 ⌄" (11 px semibold `#8c8c8c`, 18 px divider). Errors show on
  submit: `danger` border + 12 px `danger` line under the field, cleared as the coach types. Duration (select +
  the design's chevron) and End time (read-only `#f7f7f7`) sit under date and time but are hidden for now
  (`SHOW_DURATION`). The date picker goes up to today. Upload file / Paste
  text: two 36 px buttons, active `border-brand bg-brand/[0.03]` brand text and icon (Upload's label semibold,
  Paste's regular, as drawn). Drop zone and paste box 120 px, `border-[1.5px]` (dashed for the drop zone, brand
  while dragging). A chosen file replaces the drop zone with one left-aligned row (`p-3 gap-3`, solid border):
  `FileTypeIcon` (40 px tinted tile, lucide icon: .pdf red, .docx brand, .srt purple captions, .txt grey), name 13 px
  semibold (truncates) over "5 KB · TXT" 12 px `ink-tertiary`, then Replace (brand) and Remove (`ink-secondary`)
  13 px semibold at the right edge. The transcript popup shows an uploaded file with the same icon and lines. Buttons: Cancel 36 px white `#e0e0e0` rounded 6, primary 36 px brand rounded 8, both `px-[30px]`
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
  From a Client highlight on the brief, or from a client-list row (Dashboard view), the column is a sidebar (the
  user's call). On the list the tables take compact columns (Client 220 px, Last active 108 px, Status and Activity
  share the rest; Booking: Activity and Session credits share it) and the metric labels truncate. On the brief the page shell gets `pr-[360px]`
  (300 ms padding transition) so the brief and rail reflow into the rest: the rail column narrows to 360 px, the
  AI panel's width (`grid-cols-[minmax(0,1fr)_360px]`), and the brief takes what is left, the column drops its overlay shadow for
  `border-l border-line` and a faint `-4px 0 16px rgba(0,0,0,0.04)`, the group cards leave the 2 × 2 grid for one
  column (`flex flex-col gap-4`, lists capped at 186 px as in the three-part layout), Client highlights put their
  category tabs in a row above the list, and a click on the page no longer closes it (× or Esc do).
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
