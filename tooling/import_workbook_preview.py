#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

NS = {
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
}

TABLE_ROW = f"{{{NS['table']}}}table-row"
TABLE_CELL = f"{{{NS['table']}}}table-cell"
COVERED_TABLE_CELL = f"{{{NS['table']}}}covered-table-cell"
TABLE_NAME = f"{{{NS['table']}}}name"
ROW_REPEAT = f"{{{NS['table']}}}number-rows-repeated"
COL_REPEAT = f"{{{NS['table']}}}number-columns-repeated"
VALUE_TYPE = f"{{{NS['office']}}}value-type"
VALUE_ATTR = f"{{{NS['office']}}}value"
DATE_VALUE = f"{{{NS['office']}}}date-value"
TEXT_SPACE_COUNT = f"{{{NS['text']}}}c"

RELEVANT_PREFIX = re.compile(r"^dette[_\s-]?", re.IGNORECASE)
PERIOD_KEY_PATTERN = re.compile(r"^\d{4}-\d{2}$")
ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def to_slug(value: str) -> str:
    normalized = normalize_whitespace(value)
    without_marks = "".join(
        char for char in unicodedata.normalize("NFD", normalized) if unicodedata.category(char) != "Mn"
    )
    lowered = without_marks.lower()
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", lowered))


def title_from_token(value: str) -> str:
    chunks = [chunk for chunk in re.split(r"[\s_-]+", normalize_whitespace(value)) if chunk]
    return " ".join(chunk[:1].upper() + chunk[1:].lower() for chunk in chunks)


def cents_from_cell(value: Any) -> int | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return round(float(value) * 100)

    if not isinstance(value, str):
        return None

    cleaned = value.replace("\u00a0", "").replace("€", "").replace(" ", "")
    cleaned = re.sub(r"\.(?=\d{3}\b)", "", cleaned).replace(",", ".")

    if not cleaned or cleaned == "/" or cleaned.lower() == "nan":
        return None

    try:
        return round(float(cleaned) * 100)
    except ValueError:
        return None


def parse_import_date(value: str) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized or "XX" in normalized or normalized == "/":
        return None

    direct = re.match(r"^(\d{4})-(\d{2})-(\d{2})", normalized)
    if direct:
        return f"{direct.group(1)}-{direct.group(2)}-{direct.group(3)}"

    match = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", normalized)
    if not match:
        return None

    day_raw, month_raw, year_raw = match.groups()
    year = f"20{year_raw}" if len(year_raw) == 2 else year_raw
    return f"{year}-{month_raw.zfill(2)}-{day_raw.zfill(2)}"


def period_key_from_date(value: str | None) -> str | None:
    return value[:7] if value else None


def period_key_from_loose_text(value: str) -> str | None:
    normalized = normalize_whitespace(value)
    if not normalized or normalized == "/" or re.match(r"^\d{4}$", normalized):
        return None

    four_digit = re.search(r"(\d{4})$", normalized)
    short_year = re.search(r"(\d{2})$", normalized)
    month_match = re.search(r"/(\d{1,2})/", normalized) or re.search(r"/(\d{1,2})$", normalized)
    if not month_match:
        return None

    month = month_match.group(1).zfill(2)
    year = four_digit.group(1) if four_digit else f"20{short_year.group(1)}" if short_year else None
    return f"{year}-{month}" if year else None


def is_valid_period_key(value: str) -> bool:
    if not PERIOD_KEY_PATTERN.match(value):
        return False

    month = int(value[5:7])
    return 1 <= month <= 12


def is_valid_iso_date(value: str) -> bool:
    if not ISO_DATE_PATTERN.match(value):
        return False

    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return False
    return True


def fingerprint_bytes(raw_bytes: bytes) -> str:
    return hashlib.sha256(raw_bytes).hexdigest()


def extract_text_content(node: ET.Element) -> str:
    pieces: list[str] = []
    if node.text:
        pieces.append(node.text)

    for child in list(node):
        if child.tag == f"{{{NS['text']}}}s":
            pieces.append(" " * int(child.attrib.get(TEXT_SPACE_COUNT, "1")))
        else:
            pieces.append(extract_text_content(child))
        if child.tail:
            pieces.append(child.tail)

    return "".join(pieces)


def extract_cell_value(cell: ET.Element) -> str:
    paragraphs = [normalize_whitespace(extract_text_content(node)) for node in cell.findall(".//text:p", NS)]
    rendered = " ".join(part for part in paragraphs if part)
    if rendered:
        return rendered

    value_type = cell.attrib.get(VALUE_TYPE)
    if value_type == "date" and DATE_VALUE in cell.attrib:
        return cell.attrib[DATE_VALUE]
    if VALUE_ATTR in cell.attrib:
        return cell.attrib[VALUE_ATTR]
    return ""


def trim_row(row: list[str]) -> list[str]:
    trimmed = list(row)
    while trimmed and trimmed[-1] == "":
        trimmed.pop()
    return trimmed


def load_workbook_rows(path: Path) -> tuple[bytes, dict[str, list[list[str]]]]:
    raw_bytes = path.read_bytes()
    with zipfile.ZipFile(path) as archive:
        content_xml = archive.read("content.xml")

    root = ET.fromstring(content_xml)
    spreadsheet = root.find("office:body/office:spreadsheet", NS)
    if spreadsheet is None:
        raise ValueError("Impossible de trouver office:spreadsheet dans ce classeur ODS.")

    sheets: dict[str, list[list[str]]] = {}
    for table in spreadsheet.findall("table:table", NS):
        sheet_name = table.attrib.get(TABLE_NAME, "Feuille")
        rows: list[list[str]] = []

        for row_node in table.iterfind(".//table:table-row", NS):
            repeated_rows = int(row_node.attrib.get(ROW_REPEAT, "1"))
            row_values: list[str] = []

            for cell in list(row_node):
                if cell.tag not in (TABLE_CELL, COVERED_TABLE_CELL):
                    continue

                repeated_cells = int(cell.attrib.get(COL_REPEAT, "1"))
                value = "" if cell.tag == COVERED_TABLE_CELL else extract_cell_value(cell)
                row_values.extend([value] * repeated_cells)

            trimmed = trim_row(row_values)
            if not trimmed:
                continue

            for _ in range(repeated_rows):
                rows.append(list(trimmed))

        sheets[sheet_name] = rows

    return raw_bytes, sheets


def parse_borrower_and_debt(sheet_name: str) -> tuple[str, str, str]:
    stem = RELEVANT_PREFIX.sub("", sheet_name)
    tokens = [token for token in re.split(r"[_\s-]+", stem) if token]
    if not tokens:
        return ("import-inconnu", "import-inconnu:dette-principale", "Dette principale")

    borrower_token = tokens[0]
    borrower_source_key = to_slug(borrower_token)
    tail = tokens[1:]
    if not tail:
        debt_label = "Dette principale"
    else:
        joined_tail = " ".join(tail)
        debt_label = f"Dette {joined_tail}" if re.match(r"^\d+$", joined_tail) else title_from_token(joined_tail)

    return (borrower_source_key, f"{borrower_source_key}:{to_slug(debt_label)}", debt_label)


def guess_borrower_name(sheet_name: str, rows: list[list[str]]) -> str:
    names: dict[str, int] = {}

    for row in rows:
        detail = row[7] if len(row) > 7 else ""
        normalized = normalize_whitespace(detail)
        if not normalized:
            continue

        match = re.search(r"POUR:\s*([^:]+?)(?:REF|MOTIF|CHEZ|CAIXA|PROVENANCE|$)", normalized, re.IGNORECASE)
        if not match:
            match = re.search(r"DE:\s*([^:]+?)(?:REF|DATE|PROVENANCE|$)", normalized, re.IGNORECASE)
        if not match:
            continue

        name = title_from_token(match.group(1))
        names[name] = names.get(name, 0) + 1

    if names:
        return sorted(names.items(), key=lambda item: item[1], reverse=True)[0][0]

    fallback = re.split(r"[_-]+", RELEVANT_PREFIX.sub("", sheet_name))[0] or sheet_name
    return title_from_token(fallback)


def create_signature(candidate: dict[str, Any]) -> str:
    description = normalize_whitespace(str(candidate["description"])).lower()
    return "|".join(
        [
            str(candidate["borrowerSourceKey"]),
            str(candidate["debtSourceKey"]),
            str(candidate["kind"]),
            str(candidate["amountCents"]),
            str(candidate["periodKey"]),
            str(candidate.get("occurredOn") or ""),
            description,
        ]
    )


def create_unresolved_signature(candidate: dict[str, Any]) -> str:
    description = normalize_whitespace(str(candidate["description"])).lower()
    return "|".join(
        [
            str(candidate["borrowerSourceKey"]),
            str(candidate["debtSourceKey"]),
            str(candidate["kind"]),
            str(candidate["amountCents"]),
            str(candidate.get("occurredOn") or ""),
            description,
            str(candidate["sourceRef"]),
        ]
    )


def dedupe_by_signature(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    output: list[dict[str, Any]] = []
    for entry in entries:
        if entry["signature"] in seen:
            continue
        seen.add(entry["signature"])
        output.append(entry)
    return output


def dedupe_unresolved_by_signature(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    output: list[dict[str, Any]] = []
    for entry in entries:
        if entry["signature"] in seen:
            continue
        seen.add(entry["signature"])
        output.append(entry)
    return output


def infer_negative_kind(index: int) -> str:
    return "opening_balance" if index == 0 else "advance"


def load_resolutions(path: Path | None, workbook_fingerprint: str) -> dict[tuple[str, int], dict[str, Any]]:
    if path is None:
        return {}

    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("Resolution file must contain a JSON object.")
    if raw.get("version") != "workbook-import-resolutions-v1":
        raise ValueError("Unsupported resolution file version.")
    if raw.get("targetFingerprint") != workbook_fingerprint:
        raise ValueError("Resolution file fingerprint does not match the workbook being parsed.")

    resolutions = raw.get("resolutions")
    if not isinstance(resolutions, list):
        raise ValueError("Resolution file must contain a resolutions array.")

    mapping: dict[tuple[str, int], dict[str, Any]] = {}
    for index, resolution in enumerate(resolutions, start=1):
        if not isinstance(resolution, dict):
            raise ValueError(f"Resolution #{index} must be an object.")

        sheet_name = resolution.get("sheetName")
        row_number = resolution.get("rowNumber")
        period_key = resolution.get("periodKey")
        occurred_on = resolution.get("occurredOn")

        if not isinstance(sheet_name, str) or not normalize_whitespace(sheet_name):
            raise ValueError(f"Resolution #{index} must include a non-empty sheetName.")
        if not isinstance(row_number, int) or row_number < 1:
            raise ValueError(f"Resolution #{index} must include a positive integer rowNumber.")
        if not isinstance(period_key, str) or not is_valid_period_key(period_key):
            raise ValueError(f"Resolution #{index} must include a valid periodKey in YYYY-MM format.")
        if occurred_on is not None:
            if not isinstance(occurred_on, str) or not is_valid_iso_date(occurred_on):
                raise ValueError(f"Resolution #{index} has an invalid occurredOn date.")
            if not occurred_on.startswith(period_key + "-"):
                raise ValueError(f"Resolution #{index} must keep occurredOn inside the declared periodKey.")

        key = (sheet_name, row_number)
        if key in mapping:
            raise ValueError(f"Duplicate resolution for {sheet_name}:{row_number}.")

        mapping[key] = {
            "sheetName": sheet_name,
            "rowNumber": row_number,
            "periodKey": period_key,
            "occurredOn": occurred_on,
        }

    return mapping


def append_manual_resolution_note(detail_text: str, period_key: str) -> str:
    base = normalize_whitespace(detail_text) or "Import detail"
    return f"{base} [periode resolue manuellement: {period_key}]"


def is_annual_row(row: list[str]) -> bool:
    period = normalize_whitespace(row[1]) if len(row) > 1 else ""
    detail = normalize_whitespace(row[7]).lower() if len(row) > 7 else ""
    return bool(re.match(r"^\d{4}$", period) or "total annuel" in detail)


def is_summary_label_without_operation(left_period: str, detail_amount_cents: int | None, detail_text: str) -> bool:
    normalized = normalize_whitespace(left_period).lower()
    normalized_detail = normalize_whitespace(detail_text).lower()
    has_operation = detail_amount_cents not in (None, 0) or (
        bool(normalized_detail)
        and normalized_detail not in {"détail de l'écriture", "detail de l'ecriture", "montant de l'opération", "montant de l'operation"}
    )
    if has_operation:
        return False
    return normalized.startswith("total ") or normalized.startswith("reste à payer") or normalized.startswith("reste a payer")


def parse_sheet(
    sheet_name: str,
    rows: list[list[str]],
    resolutions: dict[tuple[str, int], dict[str, Any]],
    applied_resolution_keys: set[tuple[str, int]],
) -> tuple[dict[str, Any] | None, list[dict[str, Any]], list[dict[str, Any]]]:
    if not RELEVANT_PREFIX.search(sheet_name):
        return (
            None,
            [
                {
                    "sheetName": sheet_name,
                    "rowNumber": 0,
                    "code": "ignored_sheet",
                    "message": "Feuille ignoree car elle ne suit pas la famille de workbook attendue.",
                }
            ],
            [],
        )

    borrower_source_key, debt_source_key, debt_label = parse_borrower_and_debt(sheet_name)
    borrower_name = guess_borrower_name(sheet_name, rows)
    issues: list[dict[str, Any]] = []
    detail_entries: list[dict[str, Any]] = []
    summary_fallback_entries: list[dict[str, Any]] = []
    unresolved_entries: list[dict[str, Any]] = []
    last_resolved_period_key: str | None = None
    negative_counter = 0

    for index, row in enumerate(rows):
        if is_annual_row(row):
            continue

        left_period = row[1] if len(row) > 1 else ""
        payment_cents = cents_from_cell(row[2] if len(row) > 2 else "")
        lent_cents = cents_from_cell(row[3] if len(row) > 3 else "")
        detail_date = row[6] if len(row) > 6 else ""
        detail_text = row[7] if len(row) > 7 else ""
        detail_amount_cents = cents_from_cell(row[8] if len(row) > 8 else "")
        occurred_on = parse_import_date(detail_date)
        period_key = period_key_from_date(occurred_on) or period_key_from_loose_text(left_period) or period_key_from_loose_text(detail_date)
        summary_period_key = period_key_from_loose_text(left_period)
        row_number = index + 1
        resolution = resolutions.get((sheet_name, row_number))

        if (
            detail_amount_cents not in (None, 0)
            and not period_key
            and not normalize_whitespace(left_period)
            and not normalize_whitespace(detail_date)
            and last_resolved_period_key
        ):
            period_key = last_resolved_period_key

        if detail_amount_cents not in (None, 0) and not period_key and resolution is not None:
            period_key = resolution["periodKey"]
            occurred_on = resolution["occurredOn"]
            detail_text = append_manual_resolution_note(detail_text, period_key)
            applied_resolution_keys.add((sheet_name, row_number))

        if is_summary_label_without_operation(left_period, detail_amount_cents, detail_text):
            continue

        if detail_amount_cents not in (None, 0):
            kind = "payment" if detail_amount_cents > 0 else infer_negative_kind(negative_counter)
            if detail_amount_cents <= 0:
                negative_counter += 1

            if not period_key and resolution is not None:
                period_key = resolution["periodKey"]
                occurred_on = resolution["occurredOn"]
                detail_text = append_manual_resolution_note(detail_text, period_key)
                applied_resolution_keys.add((sheet_name, row_number))

            if not period_key:
                unresolved_entries.append(
                    {
                        "debtSourceKey": debt_source_key,
                        "borrowerSourceKey": borrower_source_key,
                        "borrowerName": borrower_name,
                        "debtLabel": debt_label,
                        "amountCents": abs(detail_amount_cents),
                        "occurredOn": occurred_on,
                        "description": normalize_whitespace(detail_text) or "Import detail",
                        "sourceRef": f"{sheet_name}:{row_number}",
                        "sheetName": sheet_name,
                        "rowNumber": row_number,
                        "kind": kind,
                        "reasonCode": "missing_period",
                        "reasonMessage": "Impossible de deduire la periode de cette ligne detaillee.",
                    }
                )
            else:
                detail_entries.append(
                    {
                        "debtSourceKey": debt_source_key,
                        "borrowerSourceKey": borrower_source_key,
                        "borrowerName": borrower_name,
                        "debtLabel": debt_label,
                        "amountCents": abs(detail_amount_cents),
                        "periodKey": period_key,
                        "occurredOn": occurred_on,
                        "description": normalize_whitespace(detail_text) or "Import detail",
                        "sourceRef": f"{sheet_name}:{row_number}",
                        "sheetName": sheet_name,
                        "rowNumber": row_number,
                        "kind": kind,
                    }
                )
                last_resolved_period_key = period_key
            continue

        if detail_amount_cents in (None, 0) and not summary_period_key:
            if payment_cents is not None and payment_cents > 0:
                unresolved_entries.append(
                    {
                        "debtSourceKey": debt_source_key,
                        "borrowerSourceKey": borrower_source_key,
                        "borrowerName": borrower_name,
                        "debtLabel": debt_label,
                        "amountCents": payment_cents,
                        "occurredOn": occurred_on,
                        "description": normalize_whitespace(detail_text) or "Paiement importe",
                        "sourceRef": f"{sheet_name}:{row_number}:summary-payment",
                        "sheetName": sheet_name,
                        "rowNumber": row_number,
                        "kind": "payment",
                        "reasonCode": "missing_period",
                        "reasonMessage": "Une valeur de resume existe sans periode exploitable.",
                    }
                )
            if lent_cents is not None and lent_cents < 0:
                kind = infer_negative_kind(negative_counter)
                negative_counter += 1
                unresolved_entries.append(
                    {
                        "debtSourceKey": debt_source_key,
                        "borrowerSourceKey": borrower_source_key,
                        "borrowerName": borrower_name,
                        "debtLabel": debt_label,
                        "amountCents": abs(lent_cents),
                        "occurredOn": occurred_on,
                        "description": normalize_whitespace(detail_text) or "Avance importee",
                        "sourceRef": f"{sheet_name}:{row_number}:summary-lent",
                        "sheetName": sheet_name,
                        "rowNumber": row_number,
                        "kind": kind,
                        "reasonCode": "missing_period",
                        "reasonMessage": "Une valeur de resume existe sans periode exploitable.",
                    }
                )
            continue

        if detail_amount_cents in (None, 0) and summary_period_key and payment_cents is not None and payment_cents > 0:
            summary_fallback_entries.append(
                {
                    "debtSourceKey": debt_source_key,
                    "borrowerSourceKey": borrower_source_key,
                    "borrowerName": borrower_name,
                    "debtLabel": debt_label,
                    "amountCents": payment_cents,
                    "periodKey": summary_period_key,
                    "occurredOn": occurred_on,
                    "description": normalize_whitespace(detail_text) or "Paiement importe",
                    "sourceRef": f"{sheet_name}:{row_number}:summary-payment",
                    "sheetName": sheet_name,
                    "rowNumber": row_number,
                    "_fallbackKind": "payment",
                }
            )

        if detail_amount_cents in (None, 0) and summary_period_key and lent_cents is not None and lent_cents < 0:
            summary_fallback_entries.append(
                {
                    "debtSourceKey": debt_source_key,
                    "borrowerSourceKey": borrower_source_key,
                    "borrowerName": borrower_name,
                    "debtLabel": debt_label,
                    "amountCents": abs(lent_cents),
                    "periodKey": summary_period_key,
                    "occurredOn": occurred_on,
                    "description": normalize_whitespace(detail_text) or "Avance importee",
                    "sourceRef": f"{sheet_name}:{row_number}:summary-lent",
                    "sheetName": sheet_name,
                    "rowNumber": row_number,
                    "_fallbackKind": "negative",
                }
            )
            negative_counter += 1
            last_resolved_period_key = summary_period_key

    detail_typed: list[dict[str, Any]] = []
    for entry in detail_entries:
        typed = dict(entry)
        typed["signature"] = create_signature(typed)
        detail_typed.append(typed)

    fallback_typed: list[dict[str, Any]] = []
    for entry in summary_fallback_entries:
        if entry["_fallbackKind"] == "payment":
            kind = "payment"
        else:
            kind = infer_negative_kind(negative_counter)
            negative_counter += 1

        typed = {key: value for key, value in entry.items() if key != "_fallbackKind"}
        typed["kind"] = kind
        typed["signature"] = create_signature(typed)

        duplicate = any(
            detail["kind"] == typed["kind"]
            and detail["amountCents"] == typed["amountCents"]
            and detail["periodKey"] == typed["periodKey"]
            for detail in detail_typed
        )
        if not duplicate:
            fallback_typed.append(typed)

    entries = dedupe_by_signature(detail_typed + fallback_typed)
    unresolved_entries = dedupe_unresolved_by_signature(
        [
            {
                **entry,
                "signature": create_unresolved_signature(entry),
            }
            for entry in unresolved_entries
        ]
    )
    debt = {
        "sourceKey": debt_source_key,
        "borrowerSourceKey": borrower_source_key,
        "borrowerName": borrower_name,
        "label": debt_label,
        "notes": f"Importe depuis {sheet_name}",
        "sheetName": sheet_name,
        "entries": entries,
    }

    return (debt, issues, unresolved_entries)


def build_preview(input_path: Path, resolutions_path: Path | None = None) -> dict[str, Any]:
    raw_bytes, workbook = load_workbook_rows(input_path)
    workbook_fingerprint = fingerprint_bytes(raw_bytes)
    resolutions = load_resolutions(resolutions_path, workbook_fingerprint)
    debts: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    unresolved_entries: list[dict[str, Any]] = []
    applied_resolution_keys: set[tuple[str, int]] = set()

    for sheet_name, rows in workbook.items():
        debt, sheet_issues, sheet_unresolved_entries = parse_sheet(sheet_name, rows, resolutions, applied_resolution_keys)
        if debt is not None:
            debts.append(debt)
        issues.extend(sheet_issues)
        unresolved_entries.extend(sheet_unresolved_entries)

    unused_resolution_keys = sorted(set(resolutions.keys()) - applied_resolution_keys)
    if unused_resolution_keys:
        unresolved = ", ".join(f"{sheet_name}:{row_number}" for sheet_name, row_number in unused_resolution_keys)
        raise ValueError(f"Resolution entries were not applied: {unresolved}")

    entries = [entry for debt in debts for entry in debt["entries"]]
    unresolved_entries = dedupe_unresolved_by_signature(unresolved_entries)
    borrower_count = len({debt["borrowerSourceKey"] for debt in debts})
    summary = {
        "debtCount": len(debts),
        "borrowerCount": borrower_count,
        "entryCount": len(entries),
        "unresolvedCount": len(unresolved_entries),
        "paymentCount": len([entry for entry in entries if entry["kind"] == "payment"]),
        "advanceCount": len([entry for entry in entries if entry["kind"] not in ("payment", "adjustment")]),
        "outstandingImportedCents": sum(
            (-entry["amountCents"] if entry["kind"] == "payment" else entry["amountCents"]) for entry in entries
        ),
    }

    return {
        "fileName": input_path.name,
        "fingerprint": workbook_fingerprint,
        "debts": debts,
        "entries": entries,
        "unresolvedEntries": unresolved_entries,
        "issues": issues,
        "summary": summary,
    }


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a versioned import preview JSON artifact from an ODS workbook.")
    parser.add_argument("--input", required=True, help="Path to the source .ods workbook")
    parser.add_argument("--output", required=True, help="Path to the output preview .json artifact")
    parser.add_argument("--resolutions", help="Optional path to a workbook-import-resolutions-v1 JSON file")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    input_path = Path(args.input).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    resolutions_path = Path(args.resolutions).expanduser().resolve() if args.resolutions else None

    if input_path.suffix.lower() != ".ods":
        print("Only .ods workbooks are supported by this preview generator.", file=sys.stderr)
        return 1

    artifact = {
        "version": "workbook-import-preview-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "preview": build_preview(input_path, resolutions_path),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(artifact, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Preview written to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
