# GR-002 — Replace the auto-acting tab organizer select with a menu button

Sprint S1 · Lane a11y · Priority P1 · Size M · Who any · Depends on none

## Goal

The per-tab organizer acts only when the user chooses an action, never on a change of focus or arrow-key movement.

## Why

`sidepanel.js` runs `organizeTab` on the `<select class="tab-organize">` `change` event. On Windows, arrow keys on a closed select fire `change`, so a keyboard user can move a tab by accident (WCAG 3.2.2 On Input).

## Files

- `sidepanel.html` (tab template)
- `sidepanel.js` (around `organize.addEventListener("change"`)
- `sidepanel.css`
- `tests/model.test.mjs` if logic moves into `model.js`

## Reuse/Borrow

Reuse the folder `⋯` pattern already in the folder template: a `<button aria-expanded>` that shows a hidden actions panel of real buttons. Reuse `addMoveOptions` to list the target groups.

## Steps

1. Replace the select with a `button.tab-menu` (`aria-label="Organize tab: <title>"`, `aria-expanded`) and a hidden `div.tab-actions` of buttons: Move earlier, Move later, Move to Loose tabs, Make a new group, and one button per other group.
2. Wire each button to the existing `organizeTab(tab, action)`.
3. Close the panel on Escape and return focus to the menu button.
4. Keep the same visible `⋯` glyph and 44 by 44 CSS pixel minimum target (or at least 24 by 24 for WCAG 2.5.8 AA).
5. Update README and STORE_LISTING step 8 wording if the label changes.

## Done means

- No organize action fires without a click or Enter/Space on an action button.
- All previous actions still work.

## Checks

- `npm test` passes.
- `python3 tools/check_roadmap.py` passes.
- Manual in Edge: Tab to a row, open the menu, move a tab with keyboard only; arrow keys alone move nothing.

## Risks

Many rows with open panels could crowd the rail; allow only one open panel at a time.
