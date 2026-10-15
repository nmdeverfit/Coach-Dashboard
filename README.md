# Check-in Dashboard v2 — demo UI

Interactive demo of Everfit's AI Check-in Dashboard v2 (Today's Brief), built from the
[AI Coach Dashboard Figma file](https://www.figma.com/design/idT7h4wCHAIWQ9XQ5VrCvE/AI-Coach-Dashboard?node-id=5625-135627)
and the *AI Check-in Dashboard v2 | Product Brief*.

Stack: React 18, TypeScript, Vite, Tailwind CSS (tokens in `tailwind.config.js` mirror the Figma variables).
Icons, photos and the banner are exported from Figma into `src/assets/figma/`.
All data is mock data in `src/data/mock.ts`; the demo "today" is Mon Aug 31, 2026.

```bash
npm install
npm run dev            # local dev server
npm run build:artifact # single-file page in dist-single/ for sharing
```

## What works

- Today's Brief: greeting banner, generated-at line, ranked **Suggested to-dos** (7 rows, then "Show N more")
  and dated **Previous to-dos**.
- Completing a to-do is an explicit click on its checkbox; the row stays in place, de-emphasised.
- Dismiss (hover icon) and Dismiss all ask for confirmation, then remove the rows.
- Week selector opens on the current week; earlier weeks explain that the brief covers the current week only.
- Today's Brief / Dashboard toggle. The Dashboard view is a placeholder list that honours group-card "View all".
- Right rail: four group cards derived from client status, Client highlights with category tabs.

## Notes

- The to-do rows follow the design's mock content, which includes Phase 2 titles (Adjust, Congratulate, Kudos).
