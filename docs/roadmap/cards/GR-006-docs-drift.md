# GR-006 — Correct stale test counts and point docs at the roadmap

Sprint S1 · Lane docs · Priority P3 · Size S · Who any · Depends on none

## Goal

README's test evidence matches what `npm test` actually runs.

## Why

README says "Unit/model suite: 11 passing tests"; `npm test` ran 15 passing tests on 2026-10-31.

## Files

- `README.md`

## Reuse/Borrow

None needed.

## Steps

1. Run `npm test` and copy the real count into the Test evidence section, with the date.
2. Add a one-line Contributing note linking AGENTS.md and ROADMAP.md.

## Done means

- README count equals the current `npm test` result.

## Checks

- `npm test` passes.
- `python3 tools/check_roadmap.py` passes.

## Risks

None.
