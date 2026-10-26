"""Audit actual text fonts in a rendered Outrise PDF without modifying it.

Uses the bundled pdfplumber/pdfminer parser. Meaningful Chinese characters must
use Noto Sans SC; ASCII letters and digits must use Instrument Sans. Punctuation,
symbols and whitespace do not produce script-mismatch findings. Static Regular,
Medium and SemiBold face names identify 400/500/600; this does not compare each
span with its intended source weight. Exit 0: pass, 1: font findings, 2: error.

Example:
  python tools/review-pdf-fonts.py --source preview.pdf --report build/fonts.json
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import importlib.metadata
import json
import logging
from pathlib import Path
import re
import sys

APPROVED = {
    "chinese": {"family": "Noto Sans SC", "prefix": "notosanssc"},
    "ascii": {"family": "Instrument Sans", "prefix": "instrumentsans"},
}
WEIGHTS = {"regular": 400, "medium": 500, "semibold": 600}
OTHER_WEIGHTS = {"thin": 100, "extralight": 200, "light": 300, "bold": 700, "extrabold": 800, "black": 900}
SUBSET_PREFIX = re.compile(r"^[A-Za-z]{6}\+")


def normalized_font(name: str) -> str:
    return SUBSET_PREFIX.sub("", name.lstrip("/"))


def face_info(name: str) -> dict:
    normalized = normalized_font(name)
    compact = re.sub(r"[^a-z0-9]", "", normalized.lower())
    for script, expected in APPROVED.items():
        if compact.startswith(expected["prefix"]):
            suffix = compact[len(expected["prefix"]):]
            weight = WEIGHTS.get(suffix, OTHER_WEIGHTS.get(suffix))
            return {"font": normalized, "brandFamily": expected["family"], "script": script,
                    "weightFromName": weight, "approvedNamedFace": suffix in WEIGHTS}
    return {"font": normalized, "brandFamily": None, "script": None,
            "weightFromName": None, "approvedNamedFace": False}


def chinese_character(char: str) -> bool:
    code = ord(char)
    # Include radicals because some PDF ToUnicode maps emit them for Chinese text.
    # Exclude CJK punctuation; U+3007 is the meaningful ideographic zero.
    return (0x2E80 <= code <= 0x2EFF or 0x2F00 <= code <= 0x2FDF or code == 0x3007
            or 0x3400 <= code <= 0x4DBF or 0x4E00 <= code <= 0x9FFF
            or 0xF900 <= code <= 0xFAFF or 0x20000 <= code <= 0x323AF)


def script_characters(text: str) -> dict[str, str]:
    return {
        "chinese": "".join(c for c in text if chinese_character(c)),
        "ascii": "".join(c for c in text if "A" <= c <= "Z" or "a" <= c <= "z" or "0" <= c <= "9"),
    }


def text_spans(chars: list[dict]) -> list[dict]:
    """Group contiguous extracted chars by font, size and baseline for readable evidence."""
    spans = []
    for char in chars:
        key = (char.get("fontname", ""), round(float(char.get("size", 0)), 3), round(float(char.get("top", 0)), 2))
        if spans and spans[-1]["_key"] == key:
            spans[-1]["text"] += char.get("text", "")
            spans[-1]["bbox"][2] = max(spans[-1]["bbox"][2], float(char["x1"]))
            spans[-1]["bbox"][3] = max(spans[-1]["bbox"][3], float(char["bottom"]))
        else:
            spans.append({"_key": key, "text": char.get("text", ""), "fontRaw": key[0],
                          "font": normalized_font(key[0]), "size": key[1],
                          "bbox": [float(char["x0"]), float(char["top"]), float(char["x1"]), float(char["bottom"])]})
    for span in spans:
        del span["_key"]
        span["bbox"] = [round(v, 3) for v in span["bbox"]]
    return spans


def audit(source: Path) -> dict:
    import pdfplumber
    # Type 3 fallback fonts can omit FontBBox; font names/text remain extractable.
    logging.getLogger("pdfminer").setLevel(logging.ERROR)
    findings, pages = [], []
    inventory: dict[str, dict] = {}
    meaningful_count = 0
    with pdfplumber.open(source) as document:
        for number, page in enumerate(document.pages, 1):
            page_fonts: dict[str, Counter] = {}
            page_findings = 0
            page_meaningful = 0
            spans = text_spans(page.chars)
            for span in spans:
                name = span["font"]
                info = face_info(name)
                scripts = script_characters(span["text"])
                if name not in inventory:
                    inventory[name] = {**info, "rawNames": set(), "pages": set(), "spanCount": 0,
                                       "meaningfulChineseCharacters": 0, "meaningfulAsciiCharacters": 0}
                record = inventory[name]
                record["rawNames"].add(span["fontRaw"])
                record["pages"].add(number)
                record["spanCount"] += 1
                record["meaningfulChineseCharacters"] += len(scripts["chinese"])
                record["meaningfulAsciiCharacters"] += len(scripts["ascii"])
                page_fonts.setdefault(name, Counter()).update({script: len(text) for script, text in scripts.items()})
                for script, text in scripts.items():
                    meaningful_count += len(text)
                    page_meaningful += len(text)
                    if not text:
                        continue
                    if info["script"] != script:
                        code = f"unexpected_{script}_font"
                    elif not info["approvedNamedFace"]:
                        code = "unapproved_or_unresolved_named_weight"
                    else:
                        continue
                    findings.append({"page": number, "code": code, "script": script,
                                     "text": span["text"], "relevantText": text, "font": name,
                                     "fontRaw": span["fontRaw"], "size": span["size"], "bbox": span["bbox"],
                                     "expectedFamily": APPROVED[script]["family"], "weightFromName": info["weightFromName"]})
                    page_findings += 1
            if page_meaningful == 0:
                findings.append({"page": number, "code": "no_meaningful_extractable_text", "text": "", "font": None,
                                 "reason": "Cannot confirm font usage on a page without extractable Chinese/ASCII text."})
                page_findings += 1
            pages.append({"page": number, "spanCount": len(spans), "meaningfulCharacters": page_meaningful,
                          "findingCount": page_findings, "fonts": [{"font": name, **dict(counts)} for name, counts in sorted(page_fonts.items())]})
    font_inventory = []
    for _, record in sorted(inventory.items()):
        record["rawNames"] = sorted(record["rawNames"])
        record["pages"] = sorted(record["pages"])
        font_inventory.append(record)
    named_weights = {}
    warnings = []
    for expected in APPROVED.values():
        family = expected["family"]
        relevant = [f for f in font_inventory if f["brandFamily"] == family and f["approvedNamedFace"]]
        observed = sorted({f["weightFromName"] for f in relevant})
        missing = sorted(set(WEIGHTS.values()) - set(observed))
        named_weights[family] = {"observed": observed, "missing": missing,
                                 "faces": [{"font": f["font"], "weight": f["weightFromName"]} for f in relevant]}
        if missing:
            warnings.append({"code": "named_weights_not_observed", "family": family, "weights": missing,
                             "reason": "Presence summary only; this does not infer the intended weight of any source span."})
    return {"schemaVersion": "outrise.pdf-font-review.v1", "source": str(source.resolve()),
            "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "sourceBytes": source.stat().st_size,
            "backend": {"name": "pdfplumber", "version": importlib.metadata.version("pdfplumber")},
            "status": "fail" if findings else "pass", "pageCount": len(pages),
            "meaningfulCharacterCount": meaningful_count, "findingCount": len(findings),
            "affectedPages": sorted({f["page"] for f in findings}), "namedWeights": named_weights,
            "fontInventory": font_inventory, "pages": pages, "findings": findings, "warnings": warnings,
            "limitations": ["Does not compare per-span intended weight with the source PPTX.",
                            "Punctuation, symbols and whitespace do not cause script mismatch failures.",
                            "No original file changes or font installation."]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="PDF to inspect; never modified")
    parser.add_argument("--report", type=Path, help="Write full JSON to this separate file; otherwise print it")
    args = parser.parse_args()
    if args.report and args.report.resolve() == args.source.resolve():
        parser.error("--report must not overwrite the source PDF")
    try:
        report = audit(args.source)
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(json.dumps({key: report[key] for key in ("status", "pageCount", "findingCount", "affectedPages", "namedWeights", "backend")}, ensure_ascii=False))
        else:
            print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1 if report["findings"] else 0
    except Exception as error:
        print(json.dumps({"status": "error", "error": str(error), "source": str(args.source)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
