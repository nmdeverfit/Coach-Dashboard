# CLAUDE.md

Demo UI for Everfit's **AI Check-in Dashboard v2 (CID v2)**. The goal is a clickable demo built from the
Figma design, to which the product owner adds features and use cases step by step.
The product brief below is the source of truth for behaviour. When the design and the brief disagree,
follow the design for visuals and **raise the conflict with the user** instead of resolving it silently.

## Project

- Stack: React 18 + TypeScript + Vite + Tailwind CSS 3, icons from `lucide-react`. Mock data only, no backend.
- Commands: `npm run dev`, `npm run typecheck`, `npm run build`,
  `npm run build:artifact` (single-file page in `dist-single/coach-dashboard.html`, published as a claude.ai Artifact).
- Layout: web-only, designed at **1440 × 900**. Below 1280px the shell scrolls sideways. No mobile layout (out of scope per brief).
- Demo "today" is **Mon 2026-08-31** (`DEMO_TODAY` in `src/data/mock.ts`). Coach name: Long. Brief generated at 06:00 AM.

### Structure

- `src/data/types.ts`: domain types (`ClientStatus`, `TodoType`, `Todo`, `Highlight`, `GroupKey`).
- `src/data/mock.ts`: clients, to-dos, highlights. Avatars load from `src/assets/avatars/<slug>.png` via `import.meta.glob`.
- `src/state/store.tsx`: `useReducer` store and selectors. Group membership derives from client status (single source of truth).
- `src/components/`: `Sidebar`, `Header`, `TodayBrief`, `TodoRow`, `ConfirmDialog`, `RightRail`, `CategoryGroup`,
  `groups.ts` (group card metadata), `ClientHighlights`, `DashboardView` (placeholder), `StatusChip`, `Toast`, `Avatar`, `CountChip`.
- `tailwind.config.js`: tokens mirror the Figma variables (see below). Use the tokens instead of raw hex values.

### Design source (Figma)

- File: `https://www.figma.com/design/idT7h4wCHAIWQ9XQ5VrCvE/AI-Coach-Dashboard` (fileKey `idT7h4wCHAIWQ9XQ5VrCvE`).
- Today's Brief frame: node `5625:135627`. Header `5625:135652`, Main sidebar `5625:135628`, left column `5625:135654`,
  group cards `5625:135846`, client highlights `5625:135851`.
- Figma variables: Text/Primary `#202353`, Text/Secondary `#838d9f`, Text/Tertiary `#6b7280`, Text/Muted `#9ca3af`,
  Background/Secondary `#f4f6fb`, Border/Default `#e9e9ee`, Border/Light `#dfe0e5`, Icon/Brand `#184eff`,
  Icon/Orange `#ff6b16`, Icon/Warning `#f59e0b`, Icon/Muted `#d9d9d9`, Sidebar gradient `#d9e9ff → #ffe6d9 → #ffd9d9`.
- Fonts: Open Sans (UI), Inter Bold (greeting), Victor Serif Medium Italic (banner; Newsreader italic is the Google Fonts stand-in).
- **Asset limitation:** the cloud environment's network policy blocks `www.figma.com`, so Figma MCP asset URLs cannot be
  downloaded. Icons are lucide stand-ins, avatars were cropped from a 1x Figma render, and the banner photo is a CSS gradient
  (`.brief-hero`). Replace them with real exports once `www.figma.com` is allowed or the SVG/PNG files are provided
  (put icons in `src/assets/icons/`).

### Known gaps between the demo and the brief (open with the user)

- The design's to-do rows include Phase 2 titles (Adjust, Congratulate, Kudos). The brief says only the six Phase 1 types render.
- In the design, Wilma Flintstone appears in both Suggested and Previous. The brief says a client is never in both sections.
- Dashboard view, to-do detail panel, Tell me more, feedback control, settings, tour and What's New are not built yet.

---

# Product brief: AI Check-in Dashboard v2

Source: Confluence "AI Check-in Dashboard v2 | Product Brief" (EV space, page 3849847107), exported 15 Oct 2026.

| Field | Value |
|---|---|
| Feature | Check-in Dashboard v2: new client-status model, Today's Brief as the default view |
| APM | Linh Pham |
| Engineers | Viet Mai (signals & client status), Kiet Hoang (Today's Brief) |
| Status | In review |
| Release target | 7 Oct 2026, Wave 1 of the pilot (S12) |
| Date | Aug 31, 2026, reconciled 28 Sep 2026 |
| Design | AI Coach Dashboard (Figma) |

The brief fixes the problem, the shape of the product and the boundaries. The Spec Checklist is the control surface:
every spec is listed there with what it must close and who owns it. Nothing is built from the brief alone.

## Problem

Between sessions, a coach's job is to notice who needs them before the client drifts. Everfit holds the raw material
(workouts, meals, messages, forms, body metrics, notes) but the noticing is manual. v2 fixes two problems of v1:

1. **The at-risk list is too broad, and coaches say so in-product.** v1 computes status from training and nutrition only,
   against fixed internal thresholds. A client who misses training for a benign reason lands in at-risk.
   - 28 coaches (1.6%) ever changed the defaults: 25 turned Nutrition off vs 5 who turned Training off.
   - 16 of 31 saved rulesets put the training at-risk threshold below the 60% default.
   - 5 of the 6 other defaults match the customisers' median exactly.
   - The other 98.4% never open settings.
   - "A coach cannot act on a list they do not believe."
2. **Even with a correct list, the dashboard says who, not what.** v1 opens on a metric row, then a client table,
   then a separate Catch Up tab and per-row alerts. Forms to Review is the most-used filter: 2,230 of 9,101 clicks (24.5%).

**Usage today:** 1,773 coaches enabled across 373 workspaces; 614 opened it (34.6%). Across 744 ever-active coaches:
5.7 active days and 3.1 active weeks out of 17; 37% used it on exactly one day. 74% of W16 reviewers returned in W17;
review depth went from 26.9% to 30.9%.

## Hypotheses

- **H1, Status:** a three-layer model (deterministic facts, then judgement over those facts reading engagement, messages,
  notes, form answers and program state as well as training and nutrition) narrows the at-risk set to a population
  coaches recognise. Prior: customisers move thresholds toward fewer flags and disable nutrition 5× more than training.
- **H2, Guidance:** opening on a short ranked list of what to do first, grounded in a believable status, makes more coaches
  finish their review routine and return after the first visit. **H2 cannot be tested in the pilot** (all pilot waves
  already adopted); Wave 4 tests it.

## Product summary

CID v2 opens on **Today's Brief** instead of the client table. The client list is one click away on the view toggle.
Both ship in Phase 1.

### Left column: the brief

- Greeting, the day's count and exactly one generated-at line per page:
  "Updated at 06:00 AM · {date} · Refreshes daily". No tooltip (S5 BL2.4).
- **Suggested to-dos:** flat ranked list. Each row: checkbox, a one-line action naming the client, one greyed sentence of why.
  `INITIAL_ROWS = 7`, then "Show N more".
- **One to-do per client per day.** The highest-priority reason sets the to-do and its panel; the others ride inside it
  and are named on the row.
- **Unfinished work carries forward** into a dated **Previous to-dos** section.
- **Completion is an explicit click:** the row checkbox, or the ✓ on the to-do panel's title row beside Dismiss.
  Nothing is auto-ticked. A completed row stays in place, de-emphasised.
- **A Check-in review is one action on both views.** *Mark as reviewed* on a Check-in to-do marks the client reviewed on the
  Dashboard (Need review → Review completed, status unchanged, still on its status card). A review on the Dashboard completes
  the Check-in to-do. Review is per client, so it completes every coach's Check-in to-do for that client (S3 BL5, S5 AC6.10).
- **Dismiss is "not now".** The icon on row hover, or beside the ✓ in the to-do panel, asks in a dialog, then sets the to-do
  to `dismissed`; it never renders again. Dismiss all on the Previous header does the same to every carried-over row.
  For 7 days (counted in daily generations from the dismissal) no new to-do of the same type is raised for that client.
  Completion suppresses the same way; a completed Check-in until the weekly reset (S3 BL4).
- **Observations are removed.**
- **The week selector always opens on the current week.** The to-do list exists only on the current week.

### Right rail: groups and context

- **Four group cards, 2×2**, each with a count, a description, four clients and a link to its tab:
  At risk · Needs attention · Program ending · Upcoming bookings. **No fifth card** (not for `respond`, not for `no_activities`).
- Only the two lifecycle cards carry row meta (a session time, a countdown). **The risk cards carry none**: a per-row risk
  figure is a second fact source, which AC4 makes a P0 bug.
- No search and no "View all clients" in the rail. Search is in the header; the client list is one click on the toggle.
- The cards are the **overflow surface**: a card's count is always ≥ its to-dos and opens the full list. `respond` has no card;
  its surface is the **Form to review** tab. The guarantee is per to-do type, not per card (AC5), verified on return to the list.
- **Client highlights:** the Catch-up tab moved here. Phase 1 adds **pin a category**.

### Client-list view (Phase 1)

v1's table with three changes, the largest single surface in this release.

- **The Status column becomes the AI assessment:** a status chip plus a one-line summary. It no longer labels individual signals.
- **Four statuses: At risk · Needs attention · On track · No activities.** No activities is deterministic: with every data source
  empty the classifier does not run; those clients get a fixed line ("No activity logged this week."), no assessment, no to-do,
  no feedback control. About 500 of 7,000 clients. Metric card and filter tab; no group card.
- **Rows expand vertically into a client detail page:** status → AI assessment → feedback control → data area.
- **The data area is CID v1's, unchanged.** New Training and Nutrition charts land in Phase 2.
- **The metric row is seven cards:** the four statuses, then Program ending, Form to review, Review completed.
  Workflow cards are not statuses. Paused keeps its filter tab only.

**Feedback control** (same as on a Check-in panel): "Does '{status}' look right for {first_name}?" **Yes** in one tap,
**Not quite** opens v1.13's Change client status modal. Two surfaces, one modal, one event.

**Client name link:** a blue link to the client detail page **on the to-do panel's title bar only**. On a Check-in panel it is
plain text (that panel already shows what the detail page would). The link opens client details in the panel's place, with a
back arrow to the to-do. On a to-do row the name is never blue and never a link.

**Tell me more (Olly BI)** appears on the to-do panel for Check-in, Build and Remind (the types with an assessment) and on the
client detail page for every client with a classified status. It opens as a column beside the panel; the panel stays open.
Phase 1 answers from the client's stored status only.

### Underneath

Client status comes from the three-layer model and is the **single source of truth** for the group cards, the to-do selection
and the client table. Generated once per coach per day, rolling 5–7am coach-local, asynchronously; dashboard load never waits
on inference.

### Where unfinished to-dos go (settled)

- They carry forward into a dated "Previous to-dos" section. **No expiry; the coach clears the backlog.**
- A to-do leaves for exactly three reasons: completed, dismissed, or the reason stopped being true (`auto_resolved`).
  Age alone never removes a row.
- Why not a daily reset: 37% of active coaches use the dashboard on exactly one day. `auto_resolved` stops pile-up.
- **A client is never in both sections.** Section follows whether the to-do changed identity: a row that became a different job
  (type escalated, or topic instance changed) moves to Suggested carrying its `todo_id` and original raised date. Never two rows.
- A carried row reads: the to-do's own title, age right-aligned ("Yesterday" or "{D MMM}"). Newest first.

## Scope

**In:**
- Client status from the three-layer model, single source of truth across the brief, the table and the detail page.
- Today's Brief as the default landing view; the client list on the header toggle.
- Suggested to-dos (ranked, checkbox, one-line why, one per client per day) plus dated Previous to-dos, per-to-do dismiss and Dismiss all.
- Four group cards on the right rail as the overflow surface.
- Client highlights with category pinning.
- Client-list view: AI assessment column, vertical client-detail expand, v1 data area unchanged.
- Daily async generation with a visible generated-at line.
- Event tracking and the feedback mechanism.
- Pilot in three waves (~5 interviewed workspaces, then the other ~15 of the 20 highest-usage v1 workspaces, then Liz's
  vocal-coach list) with revert-to-v1 and a per-workspace kill switch (S12).
- Read-only "About Client status & data" screen in Dashboard Settings: what the AI reads, and the privacy line.

**Out (this release):** Observations · Push/email/SMS digest · Coach-facing signal settings (Phase 3) · Customize Metrics and
saved views (drawn, not in Phase 1; the metric row is fixed) · Regenerate button · Mobile and any responsive ladder (web-only,
one layout at 1440 × 900) · Wave 4 / any test of H2 · Group / low-touch / on-demand coaching workflows · Per-workspace tone
personalisation from coach notes.

## Phases

### Phase 1: Wave 1 on 7 Oct 2026, pilot in three waves, supervised

| When | Gate |
|---|---|
| Before release | To-do distribution benchmark: validates `TODO_CAP = 20`. Overdue. Kiet. |
| Before release | 7-day continuous generation run: day-over-day churn (new, carried, auto-resolved, changed type). Kiet + Viet. |
| Before release | Prior-week status back-fill, so clicking ‹ on day one is not an empty week. Kiet + Viet. |
| Before release | Eval passes before the first external coach sees output; the denominator excludes `no_activities`. Viet + Kiet. |
| Before release | Event tracking P0 live: `cid_version` on every event, review tripwire instrumented. Vinh. |
| Before release | Per-workspace kill switch live and tested. Kiet + Viet. |
| 7 Oct | Wave 1: ~5 workspaces. Linh. |
| 14 Oct | Wave 2: the other ~15 of the 20. Linh. |
| 28 Oct | First readout; Wave 3 (vocal-coach list) follows. Linh. |
| 4 Nov | Phase 2 go/no-go and Wave 4 go/no-go (full beta, v1 retired). Linh + Long. |

### To-do types: exactly the set with a drawn panel

| Type | Phase 1 | Assessment? | Notes |
|---|---|---|---|
| Check-in | In | Yes | One type, two `main_signal` variants. The core status-derived to-do. |
| Respond — Form | In | No | 24.5% of v1 filter clicks. Form review has a **Comments** button onto the form's comment thread; the client sees it in the mobile app (S4 AC3.7). |
| Remind to submit check-in form | In | Yes | Overdue check-in form only (no tasks, no other forms). High volume. Promoted from a Respond topic to a type in Adjust's place. |
| Build — assign program | In | Yes | E.g. a client asking for a new program. |
| Prepare — booking | In | No | 1:1 only. v1's booking tab and reminder templates carried over. |
| Unblock — issue credit | In | No | Routes to Client Sessions → Credits; it does not resolve. |
| Adjust | Phase 2 | — | No panel drawn. First trigger: return-from-pause on v1.7's structured pause reason. |
| Acknowledge | Phase 2 | — | One trigger, 20% skip rate on the closest Catch-up moment. |
| Respond — Message | Phase 2 | — | No panel drawn. Gated at SELECT-1 by variant (variant is a property of `respond`, not an enum value). |

Also Phase 2, not drawn now: *Congratulate*, *Kudos to*, *Adjust the plan for*. **The design's to-do rows are mock data,
for reference only (S5 BL8.3); only the six Phase 1 types render.**

**Also in Phase 1:** data tabs (CID v1 unchanged) · client-list view (AI assessment column, vertical detail expand, feedback
control, card click-through, toggle back to the brief) · three-layer model with daily async generation 5–7am coach-local and a
visible generated-at line · lifecycle (two sections, carry-forward, `auto_resolved`, explicit completion, dismiss, suppression
by `(todo_type, client_id)`, `TODO_CAP = 20`) · a type allowlist and fail-safe (types the team cannot vouch for are never created
and go to a review backlog; the allowlist filters `todo_type` only, so a variant boundary needs its own gate at SELECT-1) ·
feedback (Yes / Not quite on Check-in panels and the client detail page, into v1.13's modal) · instrumentation and revert
(full event set, per-workspace kill switch, coach-facing revert).

### Phase 2: post-pilot, depth in the panel and the data area

Client status model enhancement · Loom integration (check-in recordings and meeting transcription into the AI assessment) ·
Adjust returns (return-from-pause first) · Acknowledge, Respond–Message and the three Phase 2 to-do titles · Olly BI reads
program and check-in form data · Reactions on client highlights · New Nutrition data area (two-week meal grid, cell states,
pattern line) · New Training data area (six cell states, four-week chart) · New tabs: `gone_quiet` and body metrics ·
Previous refinements (collapsed state and undo) · Same-topic grouping · Forms to Review as a fifth group card (wait age,
in-panel form comparison). Entry gate: the missed-at-risk golden set exists and the gate has been measured.

### Phase 3: after the readout

Client-list enhancements (surviving filters, Forms to Review's place, Customize Metrics and saved views) · Coach-facing signal
settings · Digest delivery (push/email/SMS) · Program Copilot hand-off from Build · Regenerate brief · Wave 4, v1 retired (first
point at which H2 can be tested).

## Spec checklist (Phase 1, all P0, release 7 Oct)

Ready to build when every Phase 1 row is Approved. Design/UI specs are merged into S5; the agent spec is S1 + S2.

| # | Spec | Key decisions | Owner · status |
|---|---|---|---|
| S1 | Client status & signal model (agent spec, part 1) | Three layers and weights; thresholds; safety rule; counter-signals; at-risk prevalence vs v1; signal priority order setting `main_signal`; one-line status explanation for every client; pre-classifier gate for `no_activities` | Viet · In review |
| S2 | To-do generation & ranking (agent spec, part 2) | Topic taxonomy; selection rules; ordering; type allowlist; SELECT-1 variant gate for Respond–Message; re-tag Adjust topics; move form-overdue from Respond to Remind; counts by `todo_type` with Remind broken out | Kiet · In review |
| S3 | To-do lifecycle | Accumulate vs daily reset; Previous section; dismiss, suppression, auto-resolution; what "done" means. Settled 28 Sep: `TODO_CAP = 20`; suppression key `(todo_type, client_id)`; the day boundary is the daily generation; a Check-in review completes every coach's Check-in to-do for the client | Linh · In review |
| S4 | To-do detail panel | Panel content per type; assessment format; default tab and fallback; actions and completion per type; Comments on form review; client-name link on the title bar only. Completion is the row checkbox or the panel's ✓; doing the work in the panel never completes it | Linh + Duc · In review |
| S5 | UI & layout | (a) Today's Brief home: header, week selector, left/right split, empty and loading states; one layout at 1440 × 900. (b) The four group cards. (c) Client-list view: four-status assessment column, vertical detail expand, feedback control, seven-card metric row. (d) Client highlights plus pinning. Also owns the About Client status & data screen and its privacy line | Duc + Linh · In review |
| S7 | Event tracking | Single event register; naming `dashboard_*`; `cid_version` on every event; reconciles v1.14's eleven `todays_brief_*` events (four survive, five superseded, two dead); owns the `todo_type` value set (drops `adjust`, adds `remind`); `dashboard_mark_checkin_done` fires on all three completion paths; one completion event `dashboard_todays_brief_mark_complete`; `dashboard_form_comment_submit` for Comments; Phase 0 instruments 20 events | Linh · In review |
| S8 | Eval plan | Shared golden set with multiple labels; human-label seed; judge calibration; pass bars; missed-at-risk gate; cross-model conflict is blocking. Remind is deterministic (its eval is the prose). 7-day run measured per client-day; `no_activities` excluded | Viet + Kiet · In review |
| S9 | Generation & infrastructure | Batch timing and time zones; async guarantees; fallback on failure; cost model; model selection; Foundry migration; snapshot cron to include messages; prior-week back-fill. Cost scales with roster minus the ~7% `no_activities` | Kiet · Not started |
| S12 | Pilot & rollout | Four waves and gates; feedback capture; per-wave comms | Linh · In review |
| S13 | Per-workspace kill switch | Gates AC8: disables v2 per workspace back to v1 without a deploy. Distinct from S14's coach-facing revert | Viet · In review |
| S14 | Onboarding, settings and revert | Welcome screen; Dashboard Tour (7 steps, not the 8 drawn); Dashboard Settings with three items: *Home screen settings · About Client status & data · Switch back to old dashboard*; What's New, whose v2 stream carries exactly one entry in Phase 1. Revert restores the v1 stream. The What's New panel is designed | Linh + Duc · In review |
| S15 | Test-data strategy (gating) | No usable test data; it gates the demo, QA and the eval. Production data cannot be pushed to dev (ID mismatch); the QA account lacks forms and messages; cloning message data may be a policy question. Options: an independent production snapshot, or clone one workspace and extend it synthetically | Viet · Open, research |

## Acceptance criteria

1. The new status set is narrower than v1's, and coaches agree with it (prevalence delta and coach-label agreement reported before rollout).
2. Zero missed at-risk. Blocking, not reported. Measured on classified clients only (`no_activities` excluded). Unmet on the current plan: either add a dated labelling task with an owner, or report the gate UNMEASURED and call 7 Oct a supervised soak. Owner Linh + Alex, by 30 Sep.
3. One status source: a client's status is identical everywhere (group cards, client-list table, client detail page, to-do selection), verified automatically.
4. No self-contradicting to-do: reason line, assessment, data area and any Olly answer render from one computed payload per client-day; a numeric disagreement is a P0 bug.
5. The to-do list never hides a client: every to-do type has a full-list surface one click away. Status and lifecycle groups are covered by their card (count ≥ its to-dos); `respond` by the Form to review tab. Verified on the list view, on return.
6. Generation is async: dashboard load time is unchanged from v1.
7. Eval passes before the first external coach sees output, and the 7-day generation run has been read.
8. Kill switch: v2 disables per workspace, back to v1, without a deploy (S13). The coach-facing Switch back does not satisfy this.
9. No to-do type ships that the team cannot vouch for: the allowlist is enforced at generation; it filters by type; a deferred variant needs its own gate.
10. Every Phase 1 row in the checklist is approved.

## Success metrics

Pre-release gates (not metrics): to-do distribution benchmark (overdue), 7-day generation run, new to-do type frequency check, prior-week back-fill.

**H1, status quality (Viet):**

| Metric | Baseline | Target |
|---|---|---|
| At-risk prevalence vs v1 | v1's at-risk + needs-attention population | materially narrower, delta reported |
| Status agreement with coach labels | none (the human-label set establishes it) | per the eval spec |
| Missed at-risk | — | zero, blocking |
| Coaches disabling a signal | 25 nutrition / 5 training among 28 customisers | ↓ |

**H2, guidance (Linh; tested at Wave 4, not in the pilot):**

| Metric | Baseline | Target |
|---|---|---|
| Active coaches using it on only one day | 37.2% (277 of 744) | ↓ |
| Coaches returning the week after first use | not currently reported | ↑ |
| Reviews completed per active coach | measured in Phase 0 | ↑ |

**Pilot non-regression:** review volume, reviewer retention (74% W16→W17) and review depth (30.9%) must not drop. The tripwire is
`dashboard_mark_checkin_done`, which must keep its name and payload. Not a metric: matching what coaches do on v1 (behaviour
comparison is for recall only).

## Risks

- A narrower at-risk set is the goal and also the risk; the missed-at-risk gate must block rather than report.
- Message-derived assessments are covered by the existing Beta Agreement. Constraints: the assessment **summarises** a message and never quotes it (the designed Build assessment that quotes a client must be redrawn); an admin can read an assessment derived from a conversation with a different coach (confirm intended); cloning message data into test is open with S15.
- No usable test data; it gates the demo, QA and the eval (S15).
- Group cards are defined by status, but the highest-volume to-do type (Forms to Review) is not a status. Settled: no fifth card in Phase 1; AC5 is per type.
- Remind may dominate the list (cap is 20; same-topic grouping was cut with Observations). A capped-out `respond` client is reachable only via a tab. The dismiss rate tells within a fortnight, so dismiss is not optional for the pilot.
- The pilot cannot test H2.
- Program Ending is a triage lens, not a reading surface (766 filter clicks vs 84 tab opens); its to-do may deep-link to the program builder.
- Booking looks dead but is gated: 38 of 44 coaches who touched it hovered a disabled tab, 152 times. Latent demand.
- Deferring Adjust removes the only safety-relevant type; mitigated by generalising the safety-ordering rule.
- Day-over-day instability is the biggest engineering unknown; the 7-day run will tell.
- Timeline risk is the benchmark and quality scoring, the Foundry migration and the prior-week back-fill.

## Rollout order

Internal testing and evaluation → dev demo → Wave 1, ~5 workspaces, with event tracking and revert-to-v1 (7 Oct) → Wave 2,
the other ~15 (14 Oct) → first readout (28 Oct) → Wave 3, vocal coaches → go/no-go (4 Nov) → Wave 4, full beta list, v1 retired.
A numeric gate between each.

## Open questions

- **#5 (Linh + Alex, needed by 30 Sep):** who produces the golden-set labels (missed-at-risk first), who signs them off coach-side, and by when? AC2 blocks on a golden set no task currently produces; the S4 assessment eval reads the same set.

**Closed 28 Sep:** (1) Adjust is Phase 2; no panel is drawn. (3) Tell me more is on the Check-in, Build and Remind panels and on
the client detail page for every classified client; Phase 1 reads only the stored status; program and form tooling is Phase 2
(S4 OQ5 closed 29 Sep). (4) The cap is 20; the distribution benchmark validates it.
**Closed:** can one client appear in both Suggested and Previous? No, never both.
