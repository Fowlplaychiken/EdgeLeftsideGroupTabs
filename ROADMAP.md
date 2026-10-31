# GroupRail roadmap

GroupRail is a Manifest V3 Microsoft Edge extension (version 1.0.3) that shows native tab groups as folders in the side panel. It works today: `npm test` passes 15 Node tests, and releases v1.0.0 to v1.0.3 exist on GitHub. The open work is accessibility fixes found in a 2026-10-31 review, release tooling, and the store-listing decision.

This file is the only work list for this repository. `STORE_LISTING.md` is the store copy and manual certification checklist, not a to-do list.

## How to pick a card

1. Read [AGENTS.md](AGENTS.md) first.
2. Take the lowest-numbered card whose Status is `todo` and whose **Depends on** cards are all `done`. Prefer the lowest Sprint, then the highest Priority (P0 is highest).
3. Skip cards marked `needs owner scope`. They wait for the owner's creative or scope decision.
4. One card per branch and pull request. Follow the card's Steps, run its Checks, and report only checks you ran.
5. When you finish, update the card's Status here, add any new problem as a new row and card file, and run `python3 tools/check_roadmap.py`. The [working-the-roadmap skill](.agents/skills/working-the-roadmap/SKILL.md) has the full routine.

Statuses: `todo`, `in_progress`, `review`, `done`, `blocked`, `needs owner scope`. Sizes: `S` (under 2 hours), `M` (half a day), `L` (more than a day; split it if you can). "Who" says which kind of agent fits: `any` means a low-judgement sprint agent can do it; `owner` means Nick must decide or act first.

## Card table

| # | Card | Title | Sprint | Lane | Priority | Who | Size | Depends on | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [GR-001](docs/roadmap/cards/GR-001-contrast-fixes.md) | Fix failing color contrast in both themes | S1 | a11y | P1 | any | S | none | todo |
| 2 | [GR-002](docs/roadmap/cards/GR-002-tab-organizer-menu.md) | Replace the auto-acting tab organizer select with a menu button | S1 | a11y | P1 | any | M | none | todo |
| 3 | [GR-003](docs/roadmap/cards/GR-003-drag-handle-nesting.md) | Move group drag handles out of the folder toggle button | S1 | a11y | P2 | any | S | none | todo |
| 4 | [GR-004](docs/roadmap/cards/GR-004-wcag-manual-pass.md) | Run and record a WCAG 2.2 AA pass in real Edge | S2 | a11y | P2 | agent with Edge on Windows | M | GR-001, GR-002, GR-003 | todo |
| 5 | [GR-005](docs/roadmap/cards/GR-005-release-packaging.md) | Add a reproducible release packaging script | S2 | release | P2 | any | S | none | todo |
| 6 | [GR-006](docs/roadmap/cards/GR-006-docs-drift.md) | Correct stale test counts and point docs at the roadmap | S1 | docs | P3 | any | S | none | todo |
| 7 | [GR-007](docs/roadmap/cards/GR-007-store-submission.md) | Decide whether and when to submit to Edge Add-ons | S3 | release | P2 | owner | S | GR-004, GR-005 | needs owner scope |

## Notes from the 2026-10-31 review

- Contrast was computed from the CSS tokens in `sidepanel.css` with the WCAG 2.x relative-luminance formula. Failing pairs: dark-mode primary button (white on `#7fa4ff`, 2.43:1), light-mode focus ring (`#86a9ff` on `#f6f7fb`, 2.15:1), dark-mode danger text (`#d13b4b` on `#1d212a`, 3.41:1), light-mode muted text on hover (`#657083` on `#edf1fa`, 4.42:1).
- No real Edge session was run in this review. Keyboard, screen-reader and on-screen checks remain unverified (card GR-004).
