from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
FINANCE_DIR = ROOT / "public" / "finance-data"
DATA_DIR = ROOT / "public" / "data"


def read_json(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(f"Missing required data file: {path}")
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def record_key(row: list[Any]) -> str:
    return "|".join(str(row[index] if index < len(row) else "") for index in [0, 7, 3, 6])


def fourth_key(record: dict[str, Any]) -> str:
    return "|".join([
        "D",
        str(record.get("recordNumber", "")),
        str(record.get("institutionName", "")),
        str(record.get("serviceChannel", "")),
    ])


def build() -> None:
    base_rows = read_json(FINANCE_DIR / "records-lite.json")
    fourth_payload = read_json(DATA_DIR / "financial-fourth-batch.json")
    fourth_records = fourth_payload.get("records", [])

    seen = {record_key(row) for row in base_rows}
    extra_count = sum(1 for record in fourth_records if fourth_key(record) not in seen)
    domestic_count = sum(1 for row in base_rows if row and row[0] == "D") + extra_count
    total_count = len(base_rows) + extra_count

    if total_count != 86 or domestic_count != 45:
        raise RuntimeError(f"Unexpected financial data count: total={total_count}, domestic={domestic_count}")

    print(json.dumps({"recordCount": total_count, "domesticCount": domestic_count}, ensure_ascii=False))


if __name__ == "__main__":
    build()
