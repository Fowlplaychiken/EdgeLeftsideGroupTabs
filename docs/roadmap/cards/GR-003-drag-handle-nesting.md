# GR-003 — Move group drag handles out of the folder toggle button

Sprint S1 · Lane a11y · Priority P2 · Size S · Who any · Depends on none

## Goal

No interactive element sits inside another, and the drag handles expose a correct accessible role or are hidden from assistive technology.

## Why

In `sidepanel.html` the `span.group-drag[draggable]` is inside `button.folder-toggle`. Nested interactive content is invalid HTML and confuses screen readers (WCAG 4.1.2). `aria-label` on a plain span is also ignored.

## Files

- `sidepanel.html` (folder and tab templates)
- `sidepanel.js` (drag wiring)
- `sidepanel.css`

## Reuse/Borrow

Keep the existing drag-and-drop code; only the DOM placement changes. The keyboard alternative already exists in the `⋯` menus (WCAG 2.5.7).

## Steps

1. Move `span.group-drag` out of `button.folder-toggle` so it is a sibling inside `div.folder-header`.
2. Mark both drag handles `aria-hidden="true"` and remove their `aria-label`; the menu actions are the accessible path.
3. Check the drag event selectors still find the handle.
4. Adjust CSS so the header layout looks the same.

## Done means

- No interactive element nested in a button.
- Group and tab drag still reorder in Edge.

## Checks

- `npm test` passes.
- `python3 tools/check_roadmap.py` passes.
- Manual in Edge: drag one group and one tab; both still move.

## Risks

Drag targets may shift by a few pixels; compare before and after screenshots.
