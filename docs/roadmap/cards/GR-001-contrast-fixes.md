# GR-001 — Fix failing color contrast in both themes

Sprint S1 · Lane a11y · Priority P1 · Size S · Who any · Depends on none

## Goal

Make every text and focus-ring color pair in the side panel meet WCAG 2.2 AA (4.5:1 for text, 3:1 for focus indicators and UI parts).

## Why

Four token pairs fail today (see the review notes in ROADMAP.md). The dark-mode primary button, used for the main compact action, is the worst at 2.43:1.

## Files

- `sidepanel.css`
- `tests/` (new contrast test)

## Reuse/Borrow

Reuse the existing `:root` token block; change values, not structure. The WCAG relative-luminance formula is public (W3C, royalty-free). No new dependency.

## Steps

1. In the dark `@media (prefers-color-scheme: dark)` block, keep `--accent: #7fa4ff` but change `.toolbar button.primary` text to `#11141a` in dark mode (7.6:1; 9.3:1 on hover). Add a dark-mode rule rather than changing the light rule.
2. In the light block, set `--focus: #315dd9` (5.3:1 on the page background).
3. Replace the hard-coded `.folder-actions .danger { color: #d13b4b; }` with a token `--danger`: light `#b42a3a` (5.57:1 on hover surface), dark `#ff8a95` (7.15:1 on panel).
4. Set light `--muted: #5d6779` (5.04:1 on hover surface, 5.33:1 on background).
5. Add `tests/contrast.test.mjs`: parse the two token blocks from `sidepanel.css`, compute contrast with the WCAG formula, and assert the pairs above meet their thresholds. Add it to the `test` script in `package.json`.

## Done means

- All listed pairs meet their thresholds in the new test.
- No other visual change.

## Checks

- `npm test` passes.
- `python3 tools/check_roadmap.py` passes.
- `node --test tests/contrast.test.mjs` passes.

## Risks

Translucent `--panel` backgrounds blend with the page; test against the solid fallback colors. Low risk otherwise.
