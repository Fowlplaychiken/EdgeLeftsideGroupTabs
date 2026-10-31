---
name: working-the-roadmap
description: Pick, execute and close one card from this repository's ROADMAP.md. Use at the start of any task in this repository, and before opening a pull request.
---

# Working the roadmap

`ROADMAP.md` is the only work list in this repository. Each row in its **Card table** links to a card file in `docs/roadmap/cards/`. Do not keep a second to-do list anywhere else.

## Pick a card

1. Open `ROADMAP.md` and read the Card table.
2. Choose the lowest-numbered card whose Status is `todo` and whose **Depends on** cards are all `done`. Prefer the lowest Sprint, then the highest Priority (P0 is highest).
3. Skip cards marked `needs owner scope`. Those wait for the owner's creative or scope decision. Do not decide them yourself.
4. Read the whole card file. Read every file it lists before you change anything.

## Do the card

1. Make one branch and one pull request for the card. Do not widen the scope.
2. Follow the card's **Steps** in order. Reuse what the **Reuse/Borrow** section names before writing new code. Respect each borrowed project's license.
3. If a step is ambiguous or the code contradicts the card, stop. Write `BLOCKED: <question>` in the pull request and set the card's Status to `blocked`.
4. Run every command in the card's **Checks**. Report only checks you actually ran, with their results.

## Close the card

1. In `ROADMAP.md`, set the card's Status (`review` when the pull request is open, `done` only after it is merged and working).
2. Add each new problem you found as a new row at the end of the table plus a new card file. Number rows 1..N with no gaps.
3. Run the checker and its unit test:

   ```
   python3 tools/check_roadmap.py
   python3 -m unittest discover -s tools -p "test_check_roadmap.py"
   ```

4. Fill in the **Roadmap** section of the pull request template.

## Card file format

Every card file starts with a line naming its id, for example `# AB-001 — Title`, and has these sections: `## Goal`, `## Why`, `## Files`, `## Reuse/Borrow`, `## Steps`, `## Done means`, `## Checks`, `## Risks`.

Allowed values: Priority `P0`–`P3`; Size `S`, `M`, `L`; Status `todo`, `in_progress`, `review`, `done`, `blocked`, `needs owner scope`.
