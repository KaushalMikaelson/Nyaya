"""Unit tests for Constitution of India PDF parsing and section isolation.

Ensures that:
1. Table of Contents entries do not get captured as articles.
2. Trailing Schedules (e.g. Sixth Schedule paragraph 21 "Amendment of the Schedule")
   do not overwrite genuine Part III Fundamental Rights (Article 21 "Protection of life and personal liberty").
3. Footnotes separated by underscores (e.g. "1. Cl. (1) omitted...") do not overwrite real articles.
"""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from ingest_legal_pdfs import parse_constitution


class MockPage:
    def __init__(self, text: str):
        self.text = text

    def extract_text(self):
        return self.text


class MockPdfReader:
    def __init__(self, pages: list[str]):
        self.pages = [MockPage(p) for p in pages]


class TestConstitutionParser(unittest.TestCase):
    def test_schedule_and_toc_do_not_overwrite_article_21(self):
        pages = [
            # Page 1: TOC
            (
                "THE CONSTITUTION OF INDIA\n"
                "CONTENTS\n"
                "PART I THE UNION AND ITS TERRITORY\n"
                "ARTICLES 1. Name and territory of the Union.\n"
                "21. Protection of life and personal liberty.\n"
            ),
            # Page 2: Body start
            (
                "PART I\n"
                "THE UNION AND ITS TERRITORY\n"
                "1. Name and territory of the Union.—(1) India, that is Bharat, shall be a Union of States.\n"
                "(2) The States and the territories thereof shall be as specified in the First Schedule.\n"
                "________________________________________\n"
                "1. Subs. by the Constitution (Seventh Amendment) Act, 1956, s. 2.\n"
            ),
            # Page 3: Fundamental rights (Articles 14, 21)
            (
                "Right to Equality14. Equality before law.—The State shall not deny to any person equality "
                "before the law or the equal protection of the laws within the territory of India.\n"
                "21. Protection of life and personal liberty.—No person shall be deprived of his life or "
                "personal liberty except according to procedure established by law.\n"
                "21A. Right to education.—The State shall provide free and compulsory education to all children.\n"
                "________________________________________\n"
                "1. Ins. by the Constitution (Eighty-sixth Amendment) Act, 2002, s. 2.\n"
                "2. Cl. (1) omitted by the Constitution (Forty-fourth Amendment) Act, 1978.\n"
            ),
            # Page 4: Schedule
            (
                "FIRST SCHEDULE [Articles 1 and 4]\n"
                "I. THE STATES\n"
                "21. Amendment of the Schedule.—(1) Parliament may from time to time by law amend this Schedule.\n"
                "This schedule text is very long and has lots of administrative words.\n"
            ),
        ]

        reader = MockPdfReader(pages)
        articles = parse_constitution(reader)
        articles_by_num = {a["number"]: a for a in articles}

        self.assertIn("1", articles_by_num)
        self.assertIn("14", articles_by_num)
        self.assertIn("21", articles_by_num)
        self.assertIn("21A", articles_by_num)

        # Article 21 must be the genuine Fundamental Right, NOT the Schedule amendment
        art21 = articles_by_num["21"]
        self.assertEqual(art21["title"], "Protection of life and personal liberty")
        self.assertIn("deprived of his life or personal liberty", art21["content"])
        self.assertNotIn("Amendment of the Schedule", art21["content"])

        # Article 14 must be present and accurate
        art14 = articles_by_num["14"]
        self.assertEqual(art14["title"], "Equality before law")
        self.assertIn("equal protection of the laws", art14["content"])

        # Footnote "2. Cl. (1) omitted..." must NOT have overwritten Article 2
        if "2" in articles_by_num:
            self.assertNotIn("omitted", articles_by_num["2"]["title"])


if __name__ == "__main__":
    unittest.main()
