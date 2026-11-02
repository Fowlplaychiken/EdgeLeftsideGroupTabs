# GR-005 — Add a reproducible release packaging script

Sprint S2 · Lane release · Priority P2 · Size S · Who any · Depends on none

## Goal

One command builds `GroupRail-v<version>.zip` with only runtime files and prints its SHA-256.

## Why

README tells users to download `GroupRail-v*.zip` from Releases, but the repository has no script that builds it, so the contents depend on who packed it.

## Files

- `tools/package.mjs` (new)
- `package.json` (`package` script)
- `.gitignore` (`dist/`)
- `README.md` (Development section)

## Reuse/Borrow

Node's built-in `node:zlib` and `node:crypto` only; no new dependency. Read the file list from `manifest.json` references plus `assets/icons/` and `LICENSE`.

## Steps

1. Write `tools/package.mjs` that collects `manifest.json`, `model.js`, `service-worker.js`, `sidepanel.*`, `assets/icons/*`, `LICENSE` and `PRIVACY.md`.
2. Check the manifest version equals `package.json` version; fail if not.
3. Write a stored (or deflated) ZIP to `dist/` with fixed timestamps so the output is byte-reproducible.
4. Print the SHA-256 and byte size.
5. Add a test that runs the script twice and compares hashes.

## Done means

- `npm run package` produces the same hash twice.
- The ZIP excludes `tests/`, store art and docs other than PRIVACY and LICENSE.

## Checks

- `npm test` passes.
- `python3 tools/check_roadmap.py` passes.
- `npm run package` twice; hashes match.

## Risks

Writing a ZIP by hand is fiddly; keep it to the stored method if deflate adds complexity.
