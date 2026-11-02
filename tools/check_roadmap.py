#!/usr/bin/env python3
"""Check that ROADMAP.md (the card register) is consistent with its card files.

Standard library only. Adapted from the TWENTY-ONE SUNS checker. Run from the repository root:

    python3 tools/check_roadmap.py            # checks ./ROADMAP.md
    python3 tools/check_roadmap.py --root DIR

Checks:
  * the "## Card table" exists and has the agreed columns, in order;
  * rows are numbered 1..N in order in the "#" column;
  * card ids are unique and each row links to an existing card file;
  * Sprint, Priority, Size and Status use the allowed values;
  * every "Depends on" id is a known card (or "none") and there is no cycle;
  * every card file has the required sections;
  * a "done" card does not depend on a card that is not done.

Exit code 0 when clean, 1 when any problem is found.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

COLUMNS = ["#", "Card", "Title", "Sprint", "Lane", "Priority", "Who", "Size",
           "Depends on", "Status"]
PRIORITIES = {"P0", "P1", "P2", "P3"}
SIZES = {"S", "M", "L"}
STATUSES = {"todo", "in_progress", "review", "done", "blocked", "needs owner scope"}
REQUIRED_SECTIONS = [
    "## Goal",
    "## Why",
    "## Files",
    "## Reuse/Borrow",
    "## Steps",
    "## Done means",
    "## Checks",
    "## Risks",
]
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
ID_RE = re.compile(r"[A-Z0-9]+-[A-Z0-9-]*\d")


def split_row(line: str) -> list[str]:
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [cell.strip() for cell in line.split("|")]


def parse_table(text: str) -> tuple[list[str], list[list[str]]]:
    lines = text.splitlines()
    try:
        start = next(i for i, ln in enumerate(lines) if ln.strip() == "## Card table")
    except StopIteration:
        return [], []
    header: list[str] = []
    rows: list[list[str]] = []
    for ln in lines[start + 1:]:
        if ln.startswith("## "):
            break
        if not ln.strip().startswith("|"):
            if header:
                break
            continue
        cells = split_row(ln)
        if not header:
            header = cells
        elif set("".join(cells)) <= set("-: "):
            continue
        else:
            rows.append(cells)
    return header, rows


def find_cycle(deps: dict[str, list[str]]) -> list[str] | None:
    state: dict[str, int] = {}
    stack: list[str] = []

    def visit(node: str) -> list[str] | None:
        state[node] = 1
        stack.append(node)
        for nxt in deps.get(node, []):
            if state.get(nxt) == 1:
                return stack[stack.index(nxt):] + [nxt]
            if state.get(nxt) is None:
                found = visit(nxt)
                if found:
                    return found
        stack.pop()
        state[node] = 2
        return None

    for node in deps:
        if state.get(node) is None:
            found = visit(node)
            if found:
                return found
    return None


def check(root: Path) -> list[str]:
    problems: list[str] = []
    roadmap = root / "ROADMAP.md"
    if not roadmap.is_file():
        return [f"missing {roadmap}"]
    header, rows = parse_table(roadmap.read_text(encoding="utf-8"))
    if not header:
        return ["ROADMAP.md has no '## Card table' section with a table"]
    if header != COLUMNS:
        problems.append(f"card table columns are {header}, expected {COLUMNS}")
        return problems
    col = {name: i for i, name in enumerate(COLUMNS)}
    ids: dict[str, list[str]] = {}
    status: dict[str, str] = {}
    deps: dict[str, list[str]] = {}
    for n, row in enumerate(rows, 1):
        where = f"row {n}"
        if len(row) != len(COLUMNS):
            problems.append(f"{where}: {len(row)} cells, expected {len(COLUMNS)}")
            continue
        if row[col["#"]] != str(n):
            problems.append(f"{where}: '#' is '{row[col['#']]}', expected {n} (rows must run 1..N)")
        link = LINK_RE.search(row[col["Card"]])
        if not link:
            problems.append(f"{where}: Card cell has no link to a card file")
            continue
        card_id, target = link.group(1), link.group(2)
        where = f"{card_id}"
        if card_id in ids:
            problems.append(f"{where}: duplicate card id")
        path = (root / target).resolve()
        if not path.is_file():
            problems.append(f"{where}: card file {target} does not exist")
        else:
            body = path.read_text(encoding="utf-8")
            first_line = body.splitlines()[0] if body else ""
            if card_id not in first_line:
                problems.append(f"{where}: first line of {target} does not name the card id")
            headings = {ln.strip() for ln in body.splitlines() if ln.startswith("## ")}
            for section in REQUIRED_SECTIONS:
                if section not in headings:
                    problems.append(f"{where}: {target} lacks section '{section}'")
        if row[col["Priority"]] not in PRIORITIES:
            problems.append(f"{where}: priority '{row[col['Priority']]}' not in {sorted(PRIORITIES)}")
        if row[col["Size"]] not in SIZES:
            problems.append(f"{where}: size '{row[col['Size']]}' not in {sorted(SIZES)}")
        st = row[col["Status"]].strip("` ")
        if st not in STATUSES:
            problems.append(f"{where}: status '{st}' not in {sorted(STATUSES)}")
        if not row[col["Sprint"]]:
            problems.append(f"{where}: empty Sprint")
        dep_cell = row[col["Depends on"]]
        dep_ids = [] if dep_cell.lower() in {"none", "-", ""} else ID_RE.findall(dep_cell)
        ids[card_id] = dep_ids
        status[card_id] = st
        deps[card_id] = dep_ids
    for card_id, dep_ids in deps.items():
        for dep in dep_ids:
            if dep not in ids:
                problems.append(f"{card_id}: depends on unknown card {dep}")
            elif status[card_id] == "done" and status[dep] != "done":
                problems.append(f"{card_id}: is done but depends on {dep} ({status[dep]})")
    cycle = find_cycle(deps)
    if cycle:
        problems.append("dependency cycle: " + " -> ".join(cycle))
    if not rows:
        problems.append("card table has no rows")
    return problems


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", default=".", help="repository root (default: .)")
    args = parser.parse_args(argv)
    root = Path(args.root)
    problems = check(root)
    _, rows = parse_table((root / "ROADMAP.md").read_text(encoding="utf-8")) if (root / "ROADMAP.md").is_file() else ([], [])
    if problems:
        for p in problems:
            print(f"FAIL {p}")
        print(f"check_roadmap: {len(problems)} problem(s) in {len(rows)} card(s)")
        return 1
    print(f"check_roadmap: OK, {len(rows)} card(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
