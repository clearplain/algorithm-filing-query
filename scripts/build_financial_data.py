from __future__ import annotations

import base64
import csv
import gzip
import json
import re
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
LEGACY_BUILDER_URL = "https://raw.githubusercontent.com/clearplain/algorithm-filing-query/6bd94d42eba4aaa6f0c15db0e2fe53bf33d2eb29/scripts/build_financial_data.py"

CSV_FIELDS = [
    "regime", "regionType", "batch", "announcementDate", "sequence", "institutionName", "englishName",
    "serviceContent", "serviceChannel", "recordNumber", "province", "city", "serviceTypes", "year",
    "sourceTitle", "sourceUrl", "sourceFile", "note",
]


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_legacy_payload() -> dict[str, Any]:
    with urllib.request.urlopen(LEGACY_BUILDER_URL, timeout=30) as response:
        script = response.read().decode("utf-8")
    match = re.search(r'PAYLOAD_B64\s*=\s*"""([\s\S]*?)"""', script)
    if not match:
        raise RuntimeError("Cannot find legacy financial payload")
    encoded = "".join(match.group(1).split())
    encoded += "=" * (-len(encoded) % 4)
    return json.loads(gzip.decompress(base64.b64decode(encoded)).decode("utf-8"))


def record_key(record: dict[str, Any]) -> str:
    return "|".join(str(record.get(field, "")) for field in ["regime", "recordNumber", "institutionName", "serviceChannel"])


def merge_records(base_records: list[dict[str, Any]], extra_records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []
    for record in [*base_records, *extra_records]:
        key = record_key(record)
        if key in seen:
            continue
        seen.add(key)
        merged.append(record)
    return merged


def unique_sorted(values: list[str]) -> list[str]:
    return sorted({value for value in values if value})


def build_facets(records: list[dict[str, Any]]) -> dict[str, list[str]]:
    return {
        "regimes": unique_sorted([record.get("regime", "") for record in records]),
        "regionTypes": unique_sorted([record.get("regionType", "") for record in records]),
        "batches": unique_sorted([record.get("batch", "") for record in records]),
        "provinces": unique_sorted([record.get("province", "") for record in records]),
        "cities": unique_sorted([record.get("city", "") for record in records]),
        "serviceTypes": unique_sorted([tag for record in records for tag in record.get("serviceTypes", [])]),
        "years": unique_sorted([record.get("year", "") for record in records]),
    }


def build_stats(records: list[dict[str, Any]], source_count: int, generated_at: str) -> dict[str, Any]:
    return {
        "recordCount": len(records),
        "domesticCount": sum(1 for record in records if record.get("regime") == "境内机构报备"),
        "overseasDirectCount": sum(1 for record in records if record.get("regionType") == "境外机构"),
        "overseasInvestedCount": sum(1 for record in records if record.get("regionType") == "境外投资设立企业"),
        "sourceCount": source_count,
        "loadedSourceCount": source_count,
        "announcementOnlySourceCount": 0,
        "generatedAt": generated_at,
        "note": "服务内容、服务渠道、机构名称、编号保留原始表格文本；省份、年份、服务类型仅用于检索统计。",
    }


def merge_sources(base_sources: list[dict[str, Any]], fourth_source: dict[str, Any] | None) -> list[dict[str, Any]]:
    sources = [source for source in base_sources if source.get("batch") != "第四批"]
    if fourth_source:
        sources.append(fourth_source)
    return sources


def write_csv(path: Path, records: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for record in records:
            row = {field: record.get(field, "") for field in CSV_FIELDS}
            row["serviceTypes"] = "、".join(record.get("serviceTypes", []))
            writer.writerow(row)


def build() -> None:
    fourth_payload = read_json(DATA_DIR / "financial-fourth-batch.json")
    legacy_payload = load_legacy_payload()

    merged_records = merge_records(legacy_payload["records"], fourth_payload.get("records", []))
    merged_sources = merge_sources(legacy_payload["sources"], fourth_payload.get("source"))
    stats = build_stats(merged_records, len(merged_sources), legacy_payload.get("stats", {}).get("generatedAt", ""))

    write_json(DATA_DIR / "financial-records.json", merged_records)
    write_json(DATA_DIR / "financial-facets.json", build_facets(merged_records))
    write_json(DATA_DIR / "financial-stats.json", stats)
    write_json(DATA_DIR / "financial-sources.json", merged_sources)
    write_json(DATA_DIR / "financial-laws.json", legacy_payload["laws"])
    write_csv(DATA_DIR / "financial-records.csv", merged_records)

    print(json.dumps({"recordCount": stats["recordCount"], "domesticCount": stats["domesticCount"]}, ensure_ascii=False))


if __name__ == "__main__":
    build()
