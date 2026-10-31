"""Unit tests for tools/check_roadmap.py (standard library only).

Run: python3 -m unittest discover -s tools -p "test_check_roadmap.py"
"""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_roadmap  # noqa: E402

SECTIONS = "\n".join(s + "\nx\n" for s in check_roadmap.REQUIRED_SECTIONS)
HEADER = "| " + " | ".join(check_roadmap.COLUMNS) + " |\n|" + "---|" * len(check_roadmap.COLUMNS) + "\n"


def row(n, cid, deps="none", status="todo", size="S", prio="P1"):
    return (f"| {n} | [{cid}](docs/roadmap/cards/{cid}.md) | T | S1 | lane | {prio} | any | "
            f"{size} | {deps} | {status} |\n")


class CheckRoadmapTest(unittest.TestCase):
    def make(self, rows, cards=None, sections=SECTIONS):
        tmp = Path(tempfile.mkdtemp())
        (tmp / "docs/roadmap/cards").mkdir(parents=True)
        (tmp / "ROADMAP.md").write_text("# R\n\n## Card table\n\n" + HEADER + "".join(rows) + "\n## Change log\n")
        for cid in cards if cards is not None else []:
            (tmp / f"docs/roadmap/cards/{cid}.md").write_text(f"# {cid} — t\n\n{sections}")
        return tmp

    def test_clean_register_passes(self):
        root = self.make([row(1, "AB-001"), row(2, "AB-002", deps="AB-001")], ["AB-001", "AB-002"])
        self.assertEqual(check_roadmap.check(root), [])

    def test_missing_card_file_fails(self):
        root = self.make([row(1, "AB-001")], [])
        self.assertTrue(any("does not exist" in p for p in check_roadmap.check(root)))

    def test_unknown_dependency_and_bad_values_fail(self):
        root = self.make([row(1, "AB-001", deps="AB-009", size="XL", status="maybe")], ["AB-001"])
        problems = check_roadmap.check(root)
        self.assertTrue(any("unknown card AB-009" in p for p in problems))
        self.assertTrue(any("size 'XL'" in p for p in problems))
        self.assertTrue(any("status 'maybe'" in p for p in problems))

    def test_cycle_is_reported(self):
        root = self.make([row(1, "AB-001", deps="AB-002"), row(2, "AB-002", deps="AB-001")],
                         ["AB-001", "AB-002"])
        self.assertTrue(any("cycle" in p for p in check_roadmap.check(root)))

    def test_done_card_cannot_depend_on_open_card(self):
        root = self.make([row(1, "AB-001"), row(2, "AB-002", deps="AB-001", status="done")],
                         ["AB-001", "AB-002"])
        self.assertTrue(any("is done but depends" in p for p in check_roadmap.check(root)))

    def test_missing_section_fails(self):
        root = self.make([row(1, "AB-001")], ["AB-001"], sections="## Goal\nx\n")
        self.assertTrue(any("lacks section '## Risks'" in p for p in check_roadmap.check(root)))

    def test_rows_must_be_numbered_in_order(self):
        root = self.make([row(1, "AB-001"), row(3, "AB-002")], ["AB-001", "AB-002"])
        self.assertTrue(any("expected 2" in p for p in check_roadmap.check(root)))

    def test_missing_card_table_fails(self):
        tmp = Path(tempfile.mkdtemp())
        (tmp / "ROADMAP.md").write_text("# R\n")
        self.assertTrue(any("Card table" in p for p in check_roadmap.check(tmp)))

    def test_duplicate_id_fails(self):
        root = self.make([row(1, "AB-001"), row(2, "AB-001")], ["AB-001"])
        self.assertTrue(any("duplicate" in p for p in check_roadmap.check(root)))


if __name__ == "__main__":
    unittest.main()
