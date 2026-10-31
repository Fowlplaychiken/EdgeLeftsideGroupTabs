# GR-004 — Run and record a WCAG 2.2 AA pass in real Edge

Sprint S2 · Lane a11y · Priority P2 · Size M · Who agent with Edge on Windows · Depends on GR-001, GR-002, GR-003

## Goal

A dated record of keyboard, Narrator, zoom/reflow and target-size results for the side panel and the group dialog.

## Why

The 2026-10-31 review was source-only. README claims visual checks but no accessibility record exists.

## Files

- `docs/accessibility.md` (new)
- `README.md` (link to it)

## Reuse/Borrow

Use the W3C WCAG 2.2 quick reference as the checklist. Optionally run axe-core (MPL-2.0) through its browser extension; do not add it as a dependency.

## Steps

1. Load the unpacked extension in a clean Edge profile with a 20-tab, 4-group fixture.
2. Check keyboard-only use: every control reachable, visible focus, no trap, Escape closes the dialog and menus.
3. Check Narrator names and states for folders (`aria-expanded`), menus, the color picker and the status notice.
4. Check 200% zoom and a 280 px wide panel: no lost content or two-way scrolling.
5. Check target sizes (2.5.8) and dragging alternatives (2.5.7).
6. Write results as pass/fail per criterion with date and Edge version. File each failure as a new card.

## Done means

- `docs/accessibility.md` lists every checked criterion with a result.
- Each failure has its own new card.

## Checks

- `python3 tools/check_roadmap.py` passes after new cards are added.

## Risks

Needs a real Windows Edge session; a headless Chromium run does not count as this check.
