# GR-007 — Decide whether and when to submit to Edge Add-ons

Sprint S3 · Lane release · Priority P2 · Size S · Who owner · Depends on GR-004, GR-005

## Goal

Nick decides whether GroupRail goes to the Microsoft Edge Add-ons store, under which account, and when.

## Why

`STORE_LISTING.md` has a full draft and assets, but submission publishes to outsiders under Nick's name. That is an owner decision.

## Files

- `STORE_LISTING.md`

## Reuse/Borrow

Use `STORE_LISTING.md` as the submission text and its certification steps as the test script.

## Steps

1. Owner: decide go or no-go and the publisher account.
2. If go: an agent runs the 15 certification steps in STORE_LISTING.md on the packaged ZIP from GR-005 and records results.
3. Owner submits, or approves the submission step.

## Done means

- Decision recorded in this card. If submitted, the store URL is in README.

## Checks

- `python3 tools/check_roadmap.py` passes.

## Risks

Store review may question the `tabs` permission; the disclosure text already explains it.
