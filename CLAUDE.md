# CLAUDE.md

Demo UI for Everfit's **AI Check-in Dashboard v2 (CID v2)**. The goal is a clickable demo built from the
Figma design, to which the product owner adds features and use cases step by step.
The product brief below is the source of truth for behaviour. When the design and the brief disagree,
follow the design for visuals and **raise the conflict with the user** instead of resolving it silently.

**Always read [`design.md`](design.md) before designing or changing any UI** (layout, tokens, typography, components to
reuse, AI elements, states, copy rules). Keep it up to date: when a design decision is settled, record it there in
the same change.

## Project

- Stack: React 18 + TypeScript + Vite + Tailwind CSS 3. Icons and images are Figma exports in `src/assets/figma/`
  (`lucide-react` only for the few icons the design does not draw, e.g. the row dismiss ✕). Mock data only, no backend.
- Commands: `npm run dev`, `npm run typecheck`, `npm run build`,
  `npm run build:artifact` (single-file page in `dist-single/coach-dashboard.html`, published as a claude.ai Artifact).
  Keep the page small: the artifact service rejected the page once it passed about 3.5 MB (it read it as a
  "review page, too large"). Photos go in as JPEG (the banner `hero-2.jpg` is 177 KB), and `mock.ts` globs every
  PNG in `src/assets/figma/`, so a large PNG there is embedded even when nothing imports it.
- Layout: web-only, designed at **1440 × 900**. Below 1280px the shell scrolls sideways. No mobile layout (out of scope per brief).
- Demo "today" is **Mon 2026-08-31** (`DEMO_TODAY` in `src/data/mock.ts`). Coach name: Long. Brief generated at 06:00 AM.

### Structure

- `src/data/types.ts`: domain types (`ClientStatus`, `TodoType`, `Todo`, `Highlight`, `GroupKey`).
- `src/data/details.ts`: raw panel inputs by to-do id, one `TodoDetail` per Phase 1 type: `t3` Check-in (Clint,
  nutrition focus), `t2` / `p3` Respond (form answers), `t4` Build (Glen's training log; program ended Thu 27 Aug),
  `t8` Remind (Leo's assigned forms + training + nutrition), `t5` Unblock (credit batches), `t6` Prepare (bookings).
  `t7` Acknowledge (Darrell's nutrition log + training), a Phase 2 type trialled at the user's request. Kudos (Cody)
  and Aima's carried Check-in have none and open a placeholder panel.
- `src/data/profiles.ts`: `getProfile(clientId)` gives every client a `ClientProfile` (focus, nutrition, training,
  forms, tasks, habits, notes, messages) for the client detail page and all six data tabs. Clients with to-do data reuse it
  (Clint t3, Glen t4, Leo t8, Darrell t7, the Respond forms; Aima goes silent for 15 days to match her row); the rest
  are generated from a seed of their id and shaped by status (At risk logs and trains least). Program ending clients'
  programs end exactly on their card's countdown.
- `src/lib/client.ts`: derives the client detail assessment (Clint's is his Check-in panel's, word for word), the
  Task & Habit rows (log meals / workouts / check-in form tasks come from the logs and forms), habit streaks, Form
  Status rows and grouped notes.
- `src/lib/todos.ts`: the same for the five other types (`build*View`, `rowReasonFor`). Every row reason in `mock.ts`
  that has panel data comes from these builders. `LOW_CREDIT_THRESHOLD = 2`; expiry window 7 days.
- `src/lib/dashboard.ts`: the client list (`DashboardTab`, `inTab`, `statusLine` = the detail page's assessment
  headline minus "Current", `activityLine` from `Client.lastWeekStatus` and the message thread's timing, never its
  text, `lastActive` from every log, `hasFormToReview`).
- `src/data/sessions.ts`: 1:1 bookings and session credits by client (Malcom's are his Prepare panel's, Wendy's
  credits her Unblock panel's). The Upcoming bookings card and the Booking tab
  (`bookingRow` in `lib/dashboard.ts`, credit figures from `buildUnblockView`) are computed from it. The card lists
  sessions, not clients (`sessionsInWeek` in `lib/week.ts`, same bookings and window as `Client.nextSession`): line 1
  type swatch · session name, line 2 "Today" or "Sep 1" • time span · a 16 px avatar · client name; the count is
  the sessions'; a row opens its client on the Booking tab. `groupSessions` (Small group HIIT, every Tuesday 5:30 PM,
  17 of 23 enrolled, 1 canceled, all dashboard clients) adds one row per week in the same window (`CardSession` in
  `lib/week.ts`), shown by `GroupSessionRow` (`components/GroupSession.tsx`: avatar stack + a "17 clients" link
  whose hover lists the roster); a click opens `SessionDrawer` (`drawer/SessionDetails.tsx`, Figma `5825:544656`,
  `selectedSessionId` / `selectSession` in the store, one panel at a time).
- `src/lib/week.ts`: the week selector. A week's figures are read as of its Monday 06:00 (`weekAsOf`), so a past week
  reuses every builder with an earlier "today". `clientsInWeek` gives that week's status (last week =
  `lastWeekStatus`, older weeks back-filled with the current status), program countdown and next session;
  `groupsInWeek` feeds the group cards. `MIN_WEEK_OFFSET = -3` (logs start 3 Aug). Past reviews come from
  `seededReview` (about 75 % reviewed) plus the coach's changes (`pastReviewed` in the store).
- `src/data/meetings.ts` + `src/lib/meetings.ts`: the Transcript tab's meetings. Up to two calls a week per client
  in the last three weeks and up to one in the three before, each 30, 45 or 60 minutes (none yet this week, since
  today is Monday 06:00),
  generated from a seed of the id (Aima's stop when she went quiet), each with stand-in transcript lines;
  `meetingsFor(id, added)` adds the coach's (`meetings` in the store, `addMeeting`) and sorts newest first;
  `meetingWeeks` splits them by week, labelled like the week selector ("Aug 24 - Aug 30"). Platform
  comes from the link (Zoom, Google Meet, Microsoft Teams). Nothing reads a transcript (Olly and the assessment
  stay on the stored status).
- `src/data/transcripts.ts`: the transcripts' stand-in wording, sections of a coaching call (opener, recap by
  status, training, nutrition, recovery, habits, schedule, goals, mindset, plan, questions, wrap-up) taken in turn
  at about two lines a minute, so a 60-minute call has about 120 lines. No figures from the logs, no injuries.
  `samples/transcript-30min.txt` and `-60min.txt` are the same text as plain files, to try Upload file with.
- `src/lib/olly.ts`: the middle column's content. `tellPrompt` (Spec 4's one fixed prompt), `tellAnswer` (the
  assessment's own facts + where they come from + a donut in the assessment's units: days logged for nutrition,
  sections done for training), `draftFor` (a draft per to-do type from the panel's data; client page and list rows
  get a check-in), `threadFor` (stand-in wording for the profile's message thread; Olly never reads it).
- `src/lib/checkin.ts`: computes every figure and sentence from those inputs (row reason, status line, assessment,
  Macro AVG, Meal Log, summary rows), so they cannot disagree (AC4). **Never hard-code a derived number in copy**;
  add raw data and derive it. Calories come from macros (4/9/4 kcal/g); averages are over logged days in the 7 days
  before today; days from today on are "Upcoming".
- `src/data/mock.ts`: clients, to-dos, highlights. Client photos are the user's set in `src/assets/avatars/`
  (`f01`–`f20` female, `m01`–`m20` male, 96 px JPEG). `FEMALE` / `MALE` list people most visible first and take
  photos in order; `*_REUSE` gives the few people beyond 20, who only show when a card is scrolled, a highlight
  person's photo. The coach avatar stays the Figma export.
- `src/state/store.tsx`: `useReducer` store and selectors. Group membership derives from client status (single source of truth).
- `src/components/`: `Sidebar`, `Header`, `TodayBrief`, `TodoRow`, `ConfirmDialog`, `RightRail`, `CategoryGroup`,
  `groups.ts` (group card metadata), `ClientHighlights` (20 highlights in two views, the user's call: Need attention | History, each with the
  category tabs; the list is fixed at the height of 10 one-line rows and scrolls past that. A Need attention row
  shows `HighlightActions` on hover, Figma `5795:175100`: React 👍 (hidden for now, `SHOW_REACTION`) · Draft with
  AI (Olly with `highlightDraft` in `lib/olly.ts`: a congratulation, birthday wish or anniversary note from the
  highlight's sentence) · Send message · Dismiss. A message sent from that highlight's Olly or Inbox
  (`side.highlightId`) completes it; completed and dismissed ones move to History (`highlightLog` in the store,
  session only, newest first). `HistoryRow`: completed = Figma `4341:459184` ("Message sent" + Open chat);
  dismissed = greyed, "Dismissed" + Restore (back to Need attention). History opens on "Moments older than 30 days are cleared
  automatically." + Clear all (confirm dialog; `clearHighlightHistory` marks them `cleared`, gone from both views). Every highlight carries `on` (the moment's day) and shows "Today" / "Tomorrow" / "1d ago" … "6d ago" / "Aug 21" muted at the row's right edge (`When`). Empty lists show `EmptyArt` + a line per view and category (`emptyLine`, Figma `5809:544623`). The header count is Need attention's. Nine
  highlight people are not dashboard clients: `highlightOnlyClients` / `findPerson` in `mock.ts` give them a
  profile and a thread without counting them anywhere), `DashboardView` (client list, Figma `5676:145292`), `BookingTable` (its Booking tab, `5689:514998`),
  `ClientListParts` (row shell, client cell, section header shared by both tables), `ClientActions` (the
  four 32 px quick actions, shared by the detail page and list rows), `Glyph` (Figma vector with inset/bleed), `StatusChip`, `Toast` (Figma `4805:185601`, top-right, ✕ = `hideToast`; every
  finished action shows one), `Avatar`, `CountChip`,
  `Tooltip` (the design's dark tooltip; used on the row and panel Dismiss icons and on the row checkbox and
  the panel's ✓, "Complete this task", while the to-do is open), `Modal` (the design's 500 px popup, rendered
  into `<body>`; Esc closes it, and the panel behind ignores Esc and clicks while any `aria-modal` is up).
- `src/components/side/`: the middle column, 360 px, fixed left of the 720 px panel (Figma Olly `5699:137932`,
  Draft `5124:499989`, Inbox `5699:137775`, both tabbed `5699:138912`). `SidePanel` (header or tabs),
  `OllyConversation` (turns of prompt → `OllyTask` working state → result: Tell me more answer, Draft card →
  Send → "Message sent" + Open Inbox; composer with Stop while busy; steps come from `tellTask` / `draftTask` /
  `sendTask` in `lib/olly.ts`),
  `InboxConversation` (thread by day + composer). State is `side` / `sent` in the store: `openOlly`,
  `openInbox`, `closeSideTab`, `sendMessage`. The column docks left of the client's open panel and closes with it
  or when another client opens. From a list row (no panel open) it opens on its own at the right edge, without the
  client detail page (the user's call), and closes on ×, Esc or a click outside; opening that client's row then
  docks it beside the panel. Opened from a Client highlight on the brief, or from the client list (Dashboard view, list and Booking
  rows), it is a sidebar instead (`sideIsSidebar` in the store, the user's call); on the list both tables switch to
  compact columns (`COMPACT_COLS`: Client 220 px, Status / Activity or Activity / Session credits share the rest).
  On the brief: the shell pads 360 px on the right so Today's Brief and the rail
  reflow beside it (the rail narrows to 360 px, the AI panel's width; the brief takes the rest), the group cards stack in one column (`RightRail`), Client highlights switch to their stacked-tabs
  layout, and only × or Esc close it. Sending never completes
  a to-do (AC2.2).
- `src/components/drawer/`: `TodoDrawer` (720px drawer, slides in from the right), `AiAssessment`, `StatusFeedback`,
  `NutritionTab` (inline-SVG calorie ring + macros, Meal Log with cell tooltips; one shared meal-label column for both
  weeks; with nothing logged it shows the same cards in their empty state, per the user), `TrainingTab` (Session log: last week + this week in 7 states, Last workout, 2-week adherence, 4-week trend
  columns; `ProgramCard`), `PanelParts` (`TabBar`, `DataArea`, footer buttons), `RespondBody` (form Q&A),
  `SessionsBodies` (`UnblockBody` credits card, `PrepareBody` Sessions card), `ChangeStatusDialog` (Not quite in
  `StatusFeedback` opens it: current status, a New status select of the other classified statuses, an optional
  reason; Update Status calls the store's `changeStatus`, which sets the client's effective status through
  `setEffectiveStatus` in `mock.ts` and records `statusChanges` (from = `generatedStatus`, the 06:00 one); the list
  shows "~~From~~ → To" + "Reason:" in the Activity column and a "Status changed:" hover on the row's dot), `AssessedBodies` (`BuildBody`, whose
  Training tab is Check-in's `TrainingTab`, per the user; `RemindBody` with the Form Status table). In the session
  log a date with no calendar entry reads "Not assigned" (grey `#eaeef1`, from the Build frame) and adds a legend item.
- `src/lib/training.ts`: computes every Training figure from `TrainingLog` (each training day lists its assigned
  workouts, each done or not, names from `dayWorkouts` in `data/workouts.ts`; plus the program's start and length).
  Adherence = completed ÷ assigned workouts on finished days. A session-log cell's hover (Figma `4899:687161`) gives
  the date, the state with "(3/4 workouts)" and each workout with ✓ or ×. The program end also
  feeds Clint's `programEndsInDays`, so the Program ending card and the panel agree.
- `src/components/drawer/ClientDetails.tsx`: the client detail page (Figma `5671:141948`): CLIENT DETAILS title,
  avatar + name + "Status:" chip, four quick actions (Draft with AI, Send message, Mark as reviewed, More), assessment +
  feedback, the six tabs (`ClientTabs`); once the title row's icons scroll away, `ClientFooter` pins them labelled
  at the bottom (Mark as reviewed · Draft with AI · Send message, then More as a square icon). `ClientDrawer` opens it from a group-card row (`data-client-row`);
  the to-do panel's name link shows it with ‹ back. Shell hooks in `DrawerShell.tsx`. Mark as reviewed here completes
  the client's Check-in to-dos and keeps the panel open; ticking a Check-in row marks the client reviewed (one action).
- Tabs: `ClientTabs` (Training · Nutrition · Task & Habit · Program Ending · Form · Booking · Notes · Transcript,
  first tab = focus) is shared by the Check-in panel and the client detail page. Transcript (Figma `5731:517688`)
  shows on the client detail page only, for every client: `TranscriptTab` ("Meetings with {first}", + Add meeting,
  every meeting, newest first, under a header per week; rows of date tile · title · "5:30 PM - Aug 27" · platform,
  lifting onto a white card with View summary in brand on hover (View transcript for a meeting the coach added); the list is capped at 580 px like Notes and
  scrolls inside, week headers pinned), `AddMeetingDialog` (`5726:141326` Upload file, `5729:516037` Paste text; Duration and a
  read-only End time are built but hidden for now, `SHOW_DURATION`; title, time and a transcript are required and checked on submit,
  the date can be any day up to today, the meeting must start before 06:00 today, files .txt / .docx / .srt /
  .pdf up to 10 MB, .txt and .srt are read for the preview) `Pickers` (the form's date calendar and 15-minute time list, drawn in the page because the
  artifact's iframe blocks the browser's pickers) and `TranscriptDialog` (View transcript; Figma `5759:161235`: client avatar + name · date · start · platform, speaker names in bold, a search box pinned on top that
  highlights matches and steps through them with ↑ / ↓ / Enter; tabs Summary | Transcript, Summary from
  `meeting.summary`: a Call Summary card (`AiCard` in `AiAssessment.tsx`), Discuss and Your Follow Up, written by
  `callSummary` in `data/transcripts.ts` from the sections the call got all the way through, so it never names a
  point the transcript cut off). On top of the list, `LatestCall` shows the newest meeting: overview, "Discuss" with
  the summary's `highlights` (up to three short takeaways), View full summary and Transcript. Booking (Spec 4 BL2's `booking` tab) shows only for a
  client in `sessions.ts`: the Prepare panel's `SessionsCard`, then the Unblock panel's `CreditsCard`, each with an
  empty state ("No upcoming sessions booked.", Balance 0 + "No credits on any session type."). In the tab, as in
  the user's reference, every upcoming session has its own Draft a reminder, sessions completed this week read
  green, Issue Credits sits beside the balance and credit rows start collapsed (the panels keep theirs in the
  footer). Opening a client from the list's Booking tab or an Upcoming bookings row lands on this tab (`selectClient(id, 'booking')`)
  and, once the panel has slid in, scrolls the tabs up under the pinned assessment so the Sessions card shows.
  On the client detail page only (`withTabActions`), a tab can carry its own buttons under its cards
  (`TabActions`): Training's Deep analysis (AI button, tooltip "AI analyzes client's training progress") opens Olly
  in `mode: 'training'` (`trainingAnalysis` / `trainingTask` in `lib/olly.ts`: 4 weeks of the log, week by week,
  the most-missed workout, program week, a Weekly Completion bar chart; follow-ups get the same read); Nutrition's
  Adjust meal plan toasts (the meal plan page is not in the demo). `TaskHabitTab` (`5671:141271`), `CurrentProgramCard` in
  `TrainingTab.tsx` (`5671:141541`), `NotesTab` (`5671:141582`, search, day groups, sort toggle), `FormStatus`.
- `src/components/drawer/TodoDrawer.tsx` follows Spec 4: title row with ✓ (Mark as reviewed on Check-in) and Dismiss,
  reason line verbatim from the row, Completed tag on reopen, client-name link → ‹ CLIENT DETAILS (not on Check-in),
  close on ×, Esc or click outside.
- `src/components/drawer/AiContext.tsx`: Add context (Figma `5746:520123`, `5744:519377`, `5746:519756`), inside
  every AI Assessment card (`AiAssessment` takes `client`): `AddContextButton`, `ContextForm` (coaching style ·
  what the client doesn't track + note · a note for the next N weeks), `ContextAddedChip` ("Context added | Edit").
  Stored per client in `aiContext` (`setAiContext`, session only, not persisted), shared by the panel and the
  client detail page. `AiAssessment` also pins a copy under the panel header once scrolled past (Figma
  `5747:520276` / `520431` / `520587`): it finds the nearest `[data-panel-scroll]` and draws into its parent
  (`relative`), collapsed to the summary + View more, expanded with the facts and both buttons.
- Customize cards (trial, Figma `5749:521640` with a Today's Brief tab added, the user's call; also on branch
  `claude/layout-3-columns`): `CustomizeCards` is one popup for the rail's group cards and the client list's metric
  cards, tabs Today's Brief | Dashboard, both drawn the same. It opens on the tab of the view it comes from: Dashboard
  Settings (`5749:521870`, `SettingsMenu` in `Header`; the item reads "Customize cards" on both views, the
  popup's title, the user's call) or a group card's ⋯ menu (`CardMenu` in `CategoryGroup`: Collapse / Expand,
  Remove group, Customize cards…). Shown cards on the left (drag or Alt + ↑ / ↓, ⊖, a count "4/6"), the library on
  the right (⊕ or drag in; no "Also on …" line, the user's call). Dragging leaves a grey slot and draws a brand line
  in the closest gap (`gapAt`); a shown card dragged over the library lights it up (`overLibrary`), since dropping
  it there removes it. Any card can go as long as one stays. Both tabs
  offer the same nine cards (`METRIC_ORDER`: the brief's four + `EXTRA_GROUPS` Form to review, On track, Review
  completed, No activities, Paused; members from `cardMembers` in `lib/groups.ts`, Paused is empty in the demo) and
  the same limit, `MAX_CARDS` = 8 (the user's call). Defaults stay the brief's four and the list's seven. Save and Continue saves both; Cancel / × / Esc drop both; Reset resets the open tab.
  State: `rail` (order + collapsed) and `metrics` in the store, kept in localStorage; `customize` opens the popup.
- `tailwind.config.js`: tokens mirror the Figma variables (see below). Use the tokens instead of raw hex values.

### Design source (Figma)

- File: `https://www.figma.com/design/idT7h4wCHAIWQ9XQ5VrCvE/AI-Coach-Dashboard` (fileKey `idT7h4wCHAIWQ9XQ5VrCvE`).
- Spec 4's reference page is node `3489:376721` ("↪ CID New Concept", the whole canvas: 13.8 MB of metadata, so search
  the saved file rather than reading it). Drawer title row with ✓ / Dismiss: node `4982:524901`. Per-type drawer
  flows live under `CID New Concept - Phase 1` (`4341:442468`): To-do #1 Check-in Nutrition `4341:459200`,
  #2 Check-in Training `4341:462995`, #3 Review Client's Form `4341:468029`, #4 Issue Credit `4341:471360`.
- Current per-type drawers: Review form `5647:132342`, Issue credit `5647:132546`, Booking `5647:132813`,
  Assign program `5647:133017`, Remind to submit form `5647:133214`.
- Calorie ring: node `5645:520167`. Training tab: node `5645:520935`.
- AI button hover (Draft with AI, Tell me more): node `5654:528490`. Shared `.ai-btn` class in `src/index.css`: the
  Olly gradient fills the button, text and icon turn white, and a blurred white band sweeps across once. Put it on
  every new AI button.
- To-do item component (variants State × Time): node `3925:6908`. Check-in drawer, nutrition focus: node `5633:140550`.
  The drawer node is a large instance: `get_design_context` on it is truncated at 100KB and its children return empty
  shells, so read the saved output file in parts.
- Today's Brief frame: node `5625:135627`. Header `5625:135652`, Main sidebar `5625:135628`, left column `5625:135654`,
  group cards `5625:135846`, client highlights `5625:135851`.
- Figma variables: Text/Primary `#202353`, Text/Secondary `#838d9f`, Text/Tertiary `#6b7280`, Text/Muted `#9ca3af`,
  Background/Secondary `#f4f6fb`, Border/Default `#e9e9ee`, Border/Light `#dfe0e5`, Icon/Brand `#184eff`,
  Icon/Orange `#ff6b16`, Icon/Warning `#f59e0b`, Icon/Muted `#d9d9d9`, Sidebar gradient `#d9e9ff → #ffe6d9 → #ffd9d9`.
- Fonts: Open Sans (UI), Inter Bold (greeting), Victor Serif Medium Italic (banner; Newsreader italic is the Google Fonts stand-in).
- **Assets:** download with `curl -L` from the asset URLs that `get_design_context` returns (they expire after 7 days) into
  `src/assets/figma/`, named by role (`nav-*.svg`, `icon-*.svg`, `group-*.svg`, `badge-*`, `av-*.png`, `hl-*.png`).
  Keep Figma's inset/bleed wrappers when placing exported vectors (see `groups.ts`, `TodoRow.tsx`, `ClientHighlights.tsx`).
  `www.figma.com` must be in the environment's allowed domains for downloads to work.

### Known gaps between the demo and the brief (open with the user)

- The design's to-do rows include Phase 2 titles (Congratulate, Kudos). The brief says only the six Phase 1 types render.
  The Adjust row (Wilma) was removed at the user's request.
- In the design, Wilma Flintstone appears in both Suggested and Previous, which the brief forbids. The demo moves the
  carried-over Check-in to Aima Ansari.
- The design's Check-in numbers were placeholders that disagreed with each other; the demo replaces them with one
  consistent data set (2 of 7 days logged, 7 meals, 1,101 of 2,000 kcal on logged days) and avoids client pronouns
  in generated copy. On Monday morning "This week" in Meal Log is all Upcoming.
- Spec 4 BL9 says Phase 1's Nutrition tab is CID v1 unchanged (macro card, 7 day-ticks, Avg Calories), but the design
  draws the new two-week Meal Log grid. The demo follows the design; ask before switching.
- Spec 4 BL9 lists "total load" in v1's Training tab; the Training design omits it, so the demo does too.
- Brief and Spec 4 date format is "{D MMM}" ("27 Aug"); the design's row ages read "Aug 27". Model-written copy uses
  D MMM, the rows keep the design.
- Middle column (Tell me more, Draft with AI, Send message): the Olly frame asks "Show me the training progression
  of Clint Jacobi over the last 8 weeks" and answers about nutrition with a prescriptive quote ("Clint should
  continue…"); Spec 4 AC2.3 fixes the prompt ("Tell me more about {first_name}'s status on {date}") and says Olly
  explains, never prescribes. The demo sends the fixed prompt, answers with the assessment's facts, a quote saying
  which stored status it reads, and a chart in the assessment's units. Follow-up questions get the same record
  (Phase 1 reads only the stored status). The frame's placeholder thread (Apr dates, Malcolm's reminder in Glen's
  inbox) is replaced by each client's own thread. The draft card's stroke is drawn as a pink-to-blue gradient.
  The pop-out icon only toasts.
- Respond: the design's footer is Mark form as reviewed · Draft with AI · Send message; Spec 4 AC3.3 / AC3.7 ask for
  Comments (onto the form's comment thread) instead of Draft with AI. The demo follows the design.
- Prepare: the design's footer is Draft a reminder · Draft with AI (no Send message). BL1 retires per-purpose draft
  buttons and AC7.3 has Draft with AI fill the reminder template. The demo follows the design.
- Unblock: AC8.3 also asks for "how fast" (this week's completed sessions); the design has no such line.
- Build and Remind: the design's assessment copy quoted a client message and showed ISO dates and status codes
  (BL4 forbids all three); the demo writes it from the data. The card stroke is `ai-line` (#fc6969) on every type,
  as drawn (settled with the user), so it does not signal a verdict.
- Remind: the design uses Glen, who already has today's Build to-do (one per client per day), so the demo's Remind
  is Leo Midgett (`t8`). The design's overdue form had been submitted 3 days earlier and one form was submitted but
  unreviewed (that raises Respond, which outranks Remind); the demo's data avoids both.
- Design data fixed for consistency: credits "in 5 days" now expire Sep 5 (not Aug 31); booking tiles' weekdays
  match their dates; Glen's last workout is the program's last day; Respond's reason names the client and form
  instead of "Her". Build's Training tab uses Check-in's two-week session log instead of the frame's one-week
  strip of day circles (the user's call).
- Acknowledge (trial, no Figma frame, not in Spec 4): the brief makes it Phase 2 with "one trigger". The demo's
  trigger is a turnaround (back on the calorie goal N days running after weeks under it), kept apart from Catch-up
  milestones, which OQ21 keeps in Client highlights. Panel = assessed layout: assessment card with the
  nutrition tag + Tell me more, tabs Nutrition (first) · Training · Notes, footer Draft with AI · Send message, ✓
  completes. Row title stays the design's "Congratulate". Revert this if the user drops it.
- Task & Habit: the frame titles the card "Task This Week", but the demo's today is Monday 06:00 when nothing this
  week is due, so the cards read last week ("Tasks last week", range on hover). The tasks card's link reads "View
  tasks" (the frame's "View program" looks like a copy slip). Streaks read "5-day streak" / "0-day streak" in
  sentence case. "Complete N workouts" counts every workout assigned that week and the ones done.
- Client details: the drawer covers the right rail, as every panel does, so another client opens after closing it.
  Generated clients' numbers are consistent but invented; only to-do clients carry hand-written data.
- Client list (Dashboard tab, `5676:145292`): the frame draws an eighth metric card, Paused, cut off at 1440; the
  brief says seven cards and Paused keeps its tab only, so the demo shows seven. The tab "No activites" is spelled
  "No activities". The design's names, dates (Jan 15, Apr 1 – Apr 8) and counts are placeholders; the demo's come
  from the profiles. On Monday 06:00 nobody is reviewed yet, so Review Completed starts empty; the list's ✓
  toggles (the detail page's is one-way, as drawn) and animates the row out and into the other section; switching
  views slides the body (both trialled at the user's request, no Figma motion spec). Search filters by name; the coach, group, status and column
  dropdowns, + and All Views only toast. Booking shows no count, as drawn.
- Booking tab (`5689:514998`): sections Upcoming sessions (soonest first) and No sessions booked; columns Client ·
  Activity (next session + Draft a reminder) · Session credits (Balance, then the pool that needs the coach:
  credits expiring within 7 days first, else a balance ≤ `LOW_CREDIT_THRESHOLD` with the "Low credits" badge, plus
  Issue Credits) · Action (Send message). "Low credits" stays: Spec 4 AC8.2 is the low-balance case (threshold 2,
  in review, OQ15; AC8.3 warns the badge hard-codes a threshold still in review). The frame puts Naomi's Low
  credits tag in the Activity column with no balance and shows Winona's balance of 2 without it; the demo puts the
  badge in the credits column whenever a pool is low. Booking clients now drive the Upcoming bookings card too.
- Past weeks (Figma `4780:125157` brief, `4798:172414` list): a banner under the header ("Looking back at Aug 24 –
  30." + "To-dos are only shown for today." or "Current client status may differ." + Back to this week); the brief
  drops its left column and the group cards and highlights take the full width; the list shows that week's
  statuses, summaries, activity and reviews. Highlights do not follow the week selector (their timestamps read from today), so a past week shows the same 20. Form to
  review is today's queue (0 on past weeks); the Booking tab and the client detail page stay point-in-time (BL6).
  The design's past-week numbers (Today 6:30 PM on a past week, 25 clients) are placeholders.
- Transcript tab (`5731:517688`, trialled at the user's request): the brief puts meeting transcription into the
  AI assessment in Phase 2 (Loom integration), so in the demo transcripts are only stored and shown; Olly and the
  assessment never read them. The tab is on the client detail page only (Spec 4 BL1 fixes the Check-in panel's
  tabs). Duration and End time (no frame) are hidden for now at the user's request; the list row shows the start
  time and date, as drawn. The transcript search has no frame. The tab
  lists every meeting whatever the week selector shows, like the rest of the client detail page.
  The frame's rows are placeholders (one title
  four times, all on day 3); View transcript has no frame and opens a popup with the lines. The Summary tab (the
  user's brief, no frame) is stand-in wording per call section; in the product it would be AI-written from the
  transcript, which the brief puts in Phase 2 (Loom). Meetings the coach adds get no summary. Time zone choices
  (UTC-7, -5, +0, +7) are the demo's.
- Add context (trialled at the user's request, not in the brief or Spec 4): the context is only stored and shown;
  the assessment, Tell me more and drafts do not change with it (it would apply from the next daily generation).
  Coaching style per client is close to what the brief puts out: coach-facing signal settings (Phase 3),
  low-touch / on-demand workflows and tone personalisation (Out). The design's "Jordan" is the client's first name;
  the Low touch and Self-guided hints are the demo's wording (only High touch's is drawn).
- Customize cards goes past Phase 1 on both surfaces: the metric row is fixed (Customize Metrics is Phase 3), the rail
  has "no fifth card", and removing one of the brief's four cards takes away that to-do type's full-list surface on
  the brief (AC5; the client list's tabs still have it). The user dropped the lock that kept them. No activities and
  Paused can be group cards, which the brief rules out ("no group card"). Session credits was dropped as a card at
  the user's request. "Save and Continue" is the design's copy ("Save" was suggested).
- Upcoming bookings lists sessions (the user's call): the brief's cards show "four clients", and its count counts
  sessions, so a client with three bookings fills three rows. AC5 still holds (sessions ≥ clients ≥ Prepare to-dos).
- Group sessions (the user's call, Figma `5825:544656`): Phase 1 bookings and Prepare are 1:1 only. The HIIT class
  sits on the Upcoming bookings card (its count counts it) but adds no client to the card's members, raises no
  Prepare to-do and is not on its clients' Booking tab or `nextSession`. The frame's description ("In this 1-on-1
  strength session…") reads as a copy slip for a group class; the demo writes its own. The frame is a 540 px side
  panel, so "popup" is drawn as one. View calendar only toasts.
- Client highlight actions (Figma `5795:175100`): the brief puts "Reactions on client highlights" in Phase 2, but the
  row's 👍 is drawn. The demo built it (toggles, toasts "Reaction sent to {first}") and hides it for now
  (`SHOW_REACTION`, the user's call).
  The frame's Send message button is 28 px beside three 32 px ones; the demo makes all four 32 px. Need attention |
  History, dismiss, Restore and the dismissed row's look have no frame or spec (the user's call; Dismiss is the
  demo's). The 30-day auto-clear is copy only: the highlights' dates (`on`) are invented to match their sentences;
  nothing in the logs backs them, and nothing ages out. Only a message sent from the highlight's own Draft with AI or Send message completes it; messages to
  that client from elsewhere do not.
- Completed to-dos drop to the bottom of their section (the user's call; `useDoneLast` in `TodayBrief`). The brief
  says "A completed row stays in place, de-emphasised". With more than seven suggestions a completed row can sink
  under "Show N more".
- Change Client Status (Figma `5829:551881` / `551995` / `552126`, the user's call): Not quite under the assessment
  (Check-in panel and client detail page) opens it instead of v1.13's modal, which the demo does not have. The new
  status is the client's status for this week everywhere (cards, list, chips, tabs: AC3); the assessment, status
  line, profile and today's to-dos stay as the 06:00 generation made them (`generatedStatus`), so an at-risk
  assessment can sit under a Needs attention chip, and a Check-in to-do stays for a client moved to On track. The
  reason box is free text, which AC9.5 rules out for the feedback control (it is the modal's, as drawn); it is
  optional. The design's option reads "Need attention"; the demo keeps "Needs attention". No activities is not
  offered (deterministic). Past weeks keep their statuses, as the note says.
- Deep analysis (the user's call, no frame): Phase 1's Olly answers only from the stored status, and the brief puts
  Olly reading program data in Phase 2; Deep analysis reads the training log and the program's week directly. It
  describes, never prescribes. Adjust meal plan has no page to land on, so it toasts.
- The vertical row expand (rows open the client detail
  drawer instead), the settings screens (the Dashboard Settings menu only toasts, except Customize), tour and What's New
  are not built yet.

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

---

# Spec 4: To-do Detail Panel (V3.4, 28 Sep 2026)

Source: Confluence "Check-in Dashboard v2_Spec 4. To-do Detail Panel" (EV 3854434874), exported 15 Oct 2026.
APM Linh Pham · Designer Duc Nguyen · Eng Viet Mai, Kiet Hoang · BA/QA Mui Dao, Lam Nguyen. Status: In review.
Event names are owned by S7; status logic by S1; generation and ranking by S2; lifecycle by S3; layout by S5.

## BL1: one panel component, six configurations (by `todo_type`)

Parts: **A** title bar (TO-DO DETAILS + ×; avatar + title; name is a blue link on every type except Check-in;
✓ and Dismiss icons at the right) · **B** the row's reason line, verbatim · **C** assessment card (one summary line
with `main_signal` tagged inside, ≤3 one-line facts; Tell me more sits inside the card) · **D** data tabs · **E** data
area · **G** completion. No separate action bar: one footer pinned to the bottom with a primary action plus ≤2
secondary controls. A and B paint immediately and never wait on inference.

| | Check-in | Respond (Form) | Remind | Build | Prepare | Unblock |
|---|---|---|---|---|---|---|
| C. Assessment | yes | no | yes | full, no risk verdict | no | no |
| Tell me more | yes | no | yes | yes | no | no |
| D. Tabs | Training · Nutrition · Task & Habit · Program Ending · Form · Notes | Form only | Training · Nutrition · Form · Notes (Form active) | Training + Notes (Program card inside Training) | none: one Sessions card | none |
| E. Data area | yes | form Q&A | Form Status table | yes | Sessions card | credits |
| Status chip + feedback | yes | — | **no** | — | — | — |
| Completion | row ✓ or panel ✓ = Mark as reviewed | ✓ = Mark form as reviewed | ✓ | ✓ (assigning does not complete) | ✓ | ✓ |

- Name link (AC1.11): hover underlines, tooltip "Open client details"; click swaps the panel for "‹ CLIENT DETAILS ×";
  ‹ returns with the same tab and scroll. Rows never link the name; a click anywhere on the row opens the panel.
- Drafting controls: only "Draft with AI" (Olly Voice, with a draft) and "Send message" (empty composer).
  Per-signal variants ("Draft Nutrition message") are retired. Both open as a middle column; the panel stays open.

## BL2–BL3: type contract and one row per client per day

- `todo_type` picks the configuration; `main_signal` picks the first tab (status-derived types only) and the tagged term.
  Tabs: training · nutrition · checkin_form (Form) · tasks_habits · program_ending · booking. Any other signal opens
  Training. Fixed defaults: Build → Training, Prepare → Sessions card, Remind → Form.
- **Type priority: respond → check_in → build → remind → unblock → prepare.** Remind must rank below Check-in.
  The highest reason takes the row; the others ride along inside the panel (their tabs present). No "+K more".

## BL4: what the assessment may say

One signal tagged · one computed payload per client-day (reason, assessment, data area, client-list line, Olly answer;
a numeric disagreement is a P0 bug, and it must cover the v1 tabs) · reason line verbatim · no hedging (below
CONF_THRESHOLD serve plain facts) · no diagnosis ("reports knee pain", never "has tendinitis") · never quote a client
message (summarise and cite the date) · safety first: pain/injury/illness/medical notes render before any progression,
on every type · no field names, codes or ISO timestamps; dates read "27 Aug" · labelled "AI Assessment" · length:
1 summary line, ≤3 facts, one line each.

## BL5–BL9

- BL5: a partial week (resumed from pause, started mid-week) is never a signal: say so and give the date, no percentage.
- BL6: training, nutrition, habits, forms and program follow the week selector; bookings and credits are point-in-time.
- BL7 triggers: Check-in = effective_status At risk / Needs attention · Respond = submitted check-in form not reviewed
  (messages raise none) · Build = program ends within 7 calendar days or ended ≤14 days ago, suppressed when a next
  program exists or any workout is dated after the end; never for "no program ever" · Remind = check-in form overdue
  and unsubmitted, raised at the first morning generation after the due date (that form only) · Prepare = 1:1 session
  today or tomorrow · Unblock = credits expiring within 7 days, or a balance ≤ LOW_CREDIT_THRESHOLD (2, in review).
  No to-do for `no_activities` or paused clients.
- BL8: reopening a ticked to-do shows a **Completed** tag; nothing is undone. A second reason still true tomorrow
  becomes tomorrow's to-do.
- BL9: Phase 1 data tabs are CID v1 unchanged. Nutrition = macro card · 7 day-ticks for the selected week · Avg
  Calories row. Training = session log · 2-week adherence · 4-week trend · total load. Do not ship "new mock minus chart".

## Acceptance criteria by user story

- **US1 open/close/complete:** AC1.1 open on row click · AC1.2 default tab per BL2 · AC1.3 switch tab · AC1.4 ×, Esc or
  click outside closes, nothing changes · AC1.5 reopen completed → same content + Completed tag, no events · AC1.6 /
  AC10.1 inference failed or low confidence → card absent, no error copy, no spinner · AC1.9 panel ✓ = row checkbox,
  panel closes, row greys in place · AC1.10 Dismiss (icon beside ✓, tooltip "Dismiss") → dialog → dismissed, panel
  closes, row leaves, headline count drops, toast **"To-do has been dismissed"** · AC1.11 name link (above).
- **US2 assessment types (Check-in, Build, Remind):** AC2.1 summary + ≤3 facts from effective_status · AC2.2 Draft with
  AI / Send message as a middle column; sending never completes · AC2.3 Tell me more = Olly BI with the fixed prompt
  **"Tell me more about {first_name}'s status on {date}"** plus context (todo_type, main_signal, reason; Build adds
  program name + end date; Remind adds form name + due date); explains, never prescribes · AC2.4 Nutrition = v1;
  nothing logged reads "nothing logged" · AC2.5 Mark as reviewed (button, panel ✓ or row checkbox on Check-in) →
  client reviewed for that week, to-do completed, panel closes; syncs Need review → Review completed; completes every
  coach's Check-in to-do for the client, and Dashboard review completes it too · AC2.6 other reasons ride along.
- **Build:** AC4.1 "{first_name}'s program ends in {X} days" (calendar days) · AC4.2 "{first_name} has had nothing
  assigned for {X} days" · AC4.3 no to-do when a next program exists · AC4.4 Training active with the Current Program
  card (name · duration in weeks with start/end · Week X of Y · end date with badge · Next program or Not assigned),
  Notes alongside; assessment full, 3 facts, no verdict · AC4.5 primary "Assign new program" · "Draft with AI" ·
  "Send message"; "View program" link in the card; no Program Copilot hand-off · AC4.6 assigning does not complete.
- **Remind:** AC12.1 reason "{first_name} has a check-in form overdue." · AC12.2 one row; the Form Status table lists each
  period · AC12.3 no status chip, no feedback; Form Status table: form name · response status · last submitted · coach
  action · action · AC12.4 "Draft with AI" (names the form and how long, does not scold) · "Send message" · AC12.5
  sending does not complete; client submitting first → auto_resolved, no completion event · AC12.6 suppression
  `(todo_type, client_id)` for 7 days.
- **US3 routing types:** Respond: AC3.3 questions and answers render directly, Form is the only tab, buttons "Comments"
  · "Send message" · "Compare response" (only with 2+ responses, new tab) · primary "Mark form as reviewed" · AC3.5
  reviewing clears only that client's Respond to-do and never counts as a check-in review · AC3.7 Comments opens the
  form-response thread (client sees it in the mobile app); commenting does not complete. Prepare: AC7.2 Sessions card
  (upcoming soonest-first: date, time, type, location, duration · "Last session: {MMM D}" or a dash · "{X} completed ·
  {Y} late cancel · {Z} early cancel" this week) · AC7.3 "Draft with AI" fills v1.11's reminder template per location
  (in person / phone / video) · AC7.4 "View all sessions" → Client Sessions › Upcoming in a new tab · AC7.5 sending does
  not complete. Unblock: AC8.1 "{first_name} has {X} {session_type} credits expiring in {Y} days." · AC8.3 what is
  running out (type, balance) · when (expiry, count expiring soonest) · how fast (this week's completed sessions);
  no assessment, no tabs · AC8.4 "Issue credits" → Client Sessions › Credits in a new tab with the popup pre-filled;
  the dashboard never issues credits · AC8.5 issuing does not complete · AC8.6 no Unblock when Session Credits is off.
- **US4 feedback (Check-in only):** AC9.1 at the bottom of the assessment card: "Does '{status}' look right for
  {first_name}?" (the design's "looks" is a copy defect) · AC9.2 Yes logs agreement in one tap · AC9.3 Not quite opens
  v1.13's Change client status modal unchanged · AC9.4 record shown · yes · not_quite · dismissed · AC9.5 no free text.
- **US5 abnormal states:** AC10.2 assessment fills in within LATENCY_P95_FULL · AC10.3 changed since generation → a short
  "updated" line · AC10.4 paused or removed → explain and offer to open the client · AC10.5 empty tab names what is
  missing · AC10.6 past weeks have no to-do list · AC10.7 Tell me more refused → plain-facts state · AC11.1 Trainers see
  only their clients · AC11.3 no AI flag → no card, no Olly buttons.

## Thresholds

LATENCY_P95_FIRST 1,200 ms · LATENCY_P95_FULL 3,000 ms · CONF_THRESHOLD TBC (OQ7) · FALLBACK_MAX 8% of panel opens ·
REFUSAL_MAX 2% of Tell me more calls · KILL_THUMBS_DOWN 15% Not quite over 7 days · LOW_CREDIT_THRESHOLD 2 (in review,
OQ15) · TODO_CAP = 20 lives in S1+S2. Open: OQ2 model and version, OQ7 CONF_THRESHOLD, OQ15 credit threshold.
