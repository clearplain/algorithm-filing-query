from __future__ import annotations

"""
Financial information service data is now kept in committed files under public/data.

This script is intentionally conservative: it validates that the committed data files
exist and contain valid JSON, then exits successfully. It no longer rebuilds data from
an embedded base64 payload, because that payload was fragile in GitHub Actions and is
not needed for Pages deployment.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
REQUIRED_JSON_FILES = [
    "financial-records.json",
    "financial-facets.json",
    "financial-stats.json",
    "financial-sources.json",
    "financial-laws.json",
    "financial-fourth-batch.json",
]


def validate_json(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Missing committed data file: {path}")
    with path.open("r", encoding="utf-8") as file:
        json.load(file)


def build() -> None:
    for filename in REQUIRED_JSON_FILES:
        validate_json(DATA_DIR / filename)
    print(json.dumps({"status": "ok", "validated": REQUIRED_JSON_FILES}, ensure_ascii=False))


if __name__ == "__main__":
    build()
