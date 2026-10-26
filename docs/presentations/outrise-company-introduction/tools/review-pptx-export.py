#!/usr/bin/env python3
"""Read-only structural and copy review of a Canva-exported Outrise PPTX.

Reads ZIP/XML directly, uses presentation relationship order, and never modifies
either PPTX. JSON goes to stdout. No Office application or third-party package is
required. Font results describe encoded attributes, not rendered font fidelity.

Examples:
  python tools/review-pptx-export.py output/Canva-export.pptx --summary
  python tools/review-pptx-export.py output/Canva-export.pptx > build/review.json
  python tools/review-pptx-export.py output/Canva-export.pptx --strict-copy

Default reference: output/Outrise-Company-Introduction-zh-CN-v7.pptx.
Exit 0: count/CMO/email requirements pass; exit 1: a requirement fails.
With --strict-copy, a per-page normalized text-object multiset mismatch also
fails. Exit 2 reports an unreadable/malformed input. Layout order differences
are reported separately and do not by themselves prove missing copy.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import posixpath
import re
import sys
from typing import Any
import xml.etree.ElementTree as ET
import zipfile

NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "c": "http://schemas.openxmlformats.org/drawingml/2006/chart",
}
EMAIL = "hello@outrisetech.com"
ROOT = Path(__file__).resolve().parents[1]


def normal(text: str) -> str:
    """Ignore whitespace only; preserve characters, punctuation, case and order."""
    return re.sub(r"\s+", "", text)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def target_part(owner: str, target: str) -> str:
    if target.startswith("/"):
        return posixpath.normpath(target.lstrip("/"))
    return posixpath.normpath(posixpath.join(posixpath.dirname(owner), target))


def font_attributes(pr: ET.Element | None) -> dict[str, str | None]:
    result: dict[str, str | None] = {
        "latin": None, "eastAsian": None, "complexScript": None,
        "b": None, "sizeHundredthsPt": None,
    }
    if pr is None:
        return result
    for name, tag in (("latin", "latin"), ("eastAsian", "ea"), ("complexScript", "cs")):
        face = pr.find(f"a:{tag}", NS)
        if face is not None:
            result[name] = face.get("typeface")
    result["b"] = pr.get("b")
    result["sizeHundredthsPt"] = pr.get("sz")
    return result


def paragraph_review(paragraph: ET.Element) -> dict[str, Any]:
    default = font_attributes(paragraph.find("a:pPr/a:defRPr", NS))
    runs: list[dict[str, Any]] = []
    pieces: list[str] = []
    for child in paragraph:
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "br":
            pieces.append("\n")
            continue
        if tag not in {"r", "fld"}:
            continue
        text = "".join(n.text or "" for n in child.findall("a:t", NS))
        pieces.append(text)
        explicit = font_attributes(child.find("a:rPr", NS))
        # Resolve only the local paragraph fallback. An omitted face may still
        # inherit from a text style, layout, master or theme; do not guess it.
        local_effective = {
            key: value if value is not None else default[key]
            for key, value in explicit.items()
        }
        runs.append({
            "text": text,
            "encoded": explicit,
            "localEffective": local_effective,
            "inheritanceUnresolved": any(local_effective[k] is None for k in ("latin", "eastAsian", "b")),
        })
    return {"text": "".join(pieces), "paragraphDefault": default, "runs": runs}


def shape_identity(shape: ET.Element) -> dict[str, str | None]:
    props = shape.find("p:nvSpPr/p:cNvPr", NS)
    if props is None:
        props = shape.find("p:nvGraphicFramePr/p:cNvPr", NS)
    return {
        "id": props.get("id") if props is not None else None,
        "name": props.get("name") if props is not None else None,
    }


def read_slide(xml: bytes, page: int, part: str) -> dict[str, Any]:
    root = ET.fromstring(xml)
    shapes = root.findall(".//p:sp", NS)
    objects: list[dict[str, Any]] = []
    font_counts: Counter[tuple[str, str, str, str]] = Counter()
    geometry_counts: Counter[str] = Counter()
    native_text_shapes = 0
    for shape in root.iter():
        if shape.tag == f"{{{NS['p']}}}sp":
            geometry = shape.find("p:spPr/a:prstGeom", NS)
            custom = shape.find("p:spPr/a:custGeom", NS)
            geometry_counts[geometry.get("prst", "unknown") if geometry is not None else "custom" if custom is not None else "unspecified"] += 1
            body = shape.find("p:txBody", NS)
            if body is None:
                continue
            paragraphs = [paragraph_review(p) for p in body.findall("a:p", NS)]
            if not normal("".join(p["text"] for p in paragraphs)):
                continue
            native_text_shapes += 1
            obj = {**shape_identity(shape), "kind": "shape", "paragraphs": paragraphs}
        elif shape.tag == f"{{{NS['a']}}}tc":
            body = shape.find("a:txBody", NS)
            if body is None:
                continue
            paragraphs = [paragraph_review(p) for p in body.findall("a:p", NS)]
            if not normal("".join(p["text"] for p in paragraphs)):
                continue
            obj = {"id": None, "name": None, "kind": "tableCell", "paragraphs": paragraphs}
        else:
            continue
        obj["text"] = "\n".join(p["text"] for p in paragraphs)
        obj["normalizedText"] = normal(obj["text"])
        for paragraph in paragraphs:
            for run in paragraph["runs"]:
                if not normal(run["text"]):
                    continue
                f = run["localEffective"]
                font_counts[(f["latin"] or "<inherited>", f["eastAsian"] or "<inherited>", f["complexScript"] or "<inherited>", f["b"] if f["b"] is not None else "<inherited>")] += 1
        objects.append(obj)
    strings = [o["normalizedText"] for o in objects]
    page_text = "".join(strings)
    return {
        "page": page,
        "part": part,
        "counts": {
            "nativeShapes": len(shapes),
            "textShapes": native_text_shapes,
            "textObjectsIncludingTableCells": len(objects),
            "images": len(root.findall(".//p:pic", NS)),
            "nativeConnectors": len(root.findall(".//p:cxnSp", NS)),
            "groups": len(root.findall(".//p:grpSp", NS)),
            "tables": len(root.findall(".//a:tbl", NS)),
            "charts": len(root.findall(".//c:chart", NS)),
            "paragraphs": sum(len(o["paragraphs"]) for o in objects),
            "textRuns": sum(len(p["runs"]) for o in objects for p in o["paragraphs"]),
            "normalizedCharacters": len(page_text),
            "CMO": page_text.count("CMO"),
            "email": page_text.count(EMAIL),
        },
        "shapeGeometries": dict(sorted(geometry_counts.items())),
        "fontUse": [
            {"latin": key[0], "eastAsian": key[1], "complexScript": key[2], "b": key[3], "textRunCount": count}
            for key, count in sorted(font_counts.items())
        ],
        "textObjects": objects,
        "normalizedTextSequence": strings,
    }


def read_deck(path: Path) -> dict[str, Any]:
    with zipfile.ZipFile(path) as archive:
        presentation_part = "ppt/presentation.xml"
        presentation = ET.fromstring(archive.read(presentation_part))
        rels = ET.fromstring(archive.read("ppt/_rels/presentation.xml.rels"))
        relationships = {
            r.get("Id"): r for r in rels.findall("rel:Relationship", NS)
        }
        pages = []
        for number, slide_id in enumerate(presentation.findall("p:sldIdLst/p:sldId", NS), 1):
            rid = slide_id.get(f"{{{NS['r']}}}id")
            relation = relationships[rid]
            if relation.get("TargetMode") == "External":
                raise ValueError(f"Slide {number} is an external relationship")
            part = target_part(presentation_part, relation.attrib["Target"])
            pages.append(read_slide(archive.read(part), number, part))
        size = presentation.find("p:sldSz", NS)
        totals: Counter[str] = Counter()
        for page in pages:
            totals.update(page["counts"])
        return {
            "path": str(path.resolve()), "bytes": path.stat().st_size,
            "sha256": digest(path), "slideCount": len(pages),
            "slideSizeEmu": {k: size.get(k) for k in ("cx", "cy")} if size is not None else None,
            "embeddedFontCount": len(presentation.findall("p:embeddedFontLst/p:embeddedFont", NS)),
            "totals": dict(totals), "pages": pages,
        }


def counter_difference(counter: Counter[str]) -> list[dict[str, Any]]:
    return [{"text": text, "count": count} for text, count in sorted(counter.items())]


def compare_page(actual: dict[str, Any], reference: dict[str, Any]) -> dict[str, Any]:
    a = actual["normalizedTextSequence"]
    b = reference["normalizedTextSequence"]
    ac, bc = Counter(a), Counter(b)
    joined_a, joined_b = "".join(a), "".join(b)
    # Character inventory is diagnostic only: equality does not establish that
    # wording or order is correct. Text-object equality is the stronger check.
    chars_a, chars_b = Counter(joined_a), Counter(joined_b)
    return {
        "page": actual["page"],
        "textObjectSequenceEqual": a == b,
        "joinedCharacterSequenceEqual": joined_a == joined_b,
        "textObjectSetEqual": set(a) == set(b),
        "textObjectMultisetEqual": ac == bc,
        "characterInventoryEqual": chars_a == chars_b,
        "missingTextObjects": counter_difference(bc - ac),
        "extraTextObjects": counter_difference(ac - bc),
        "missingCharacterCounts": dict(sorted((chars_b - chars_a).items())),
        "extraCharacterCounts": dict(sorted((chars_a - chars_b).items())),
    }


def without_text(deck: dict[str, Any]) -> dict[str, Any]:
    return {**deck, "pages": [
        {k: value for k, value in p.items() if k not in {"textObjects", "normalizedTextSequence"}}
        for p in deck["pages"]
    ]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", type=Path)
    parser.add_argument("--reference", type=Path, default=ROOT / "output/Outrise-Company-Introduction-zh-CN-v7.pptx")
    parser.add_argument("--expected-slides", type=int, default=17)
    parser.add_argument("--cmo-page", type=int, default=15)
    parser.add_argument("--email-page", type=int, default=17)
    parser.add_argument("--summary", action="store_true", help="Omit the per-run and text-object transcript")
    parser.add_argument("--strict-copy", action="store_true", help="Fail on a per-page text-object multiset difference")
    args = parser.parse_args()
    actual = read_deck(args.input)
    reference = read_deck(args.reference)
    cmo = [{"page": p["page"], "count": p["counts"]["CMO"]} for p in actual["pages"] if p["counts"]["CMO"]]
    email = [{"page": p["page"], "count": p["counts"]["email"]} for p in actual["pages"] if p["counts"]["email"]]
    comparisons = [compare_page(a, b) for a, b in zip(actual["pages"], reference["pages"])]
    checks = {
        "slideCount": actual["slideCount"] == args.expected_slides,
        "cmoOnceOnExpectedPage": cmo == [{"page": args.cmo_page, "count": 1}],
        "emailOnceOnExpectedPage": email == [{"page": args.email_page, "count": 1}],
        "referencePageCountMatches": actual["slideCount"] == reference["slideCount"],
        "allPageTextObjectMultisetsEqual": actual["slideCount"] == reference["slideCount"] and all(p["textObjectMultisetEqual"] for p in comparisons),
    }
    passed = all(checks[k] for k in ("slideCount", "cmoOnceOnExpectedPage", "emailOnceOnExpectedPage", "referencePageCountMatches"))
    if args.strict_copy:
        passed = passed and checks["allPageTextObjectMultisetsEqual"]
    report = {
        "schema": "outrise-pptx-export-review.v1", "passed": passed,
        "readOnly": True,
        "limitations": [
            "Encoded font names and b attributes do not prove the target app rendered those fonts.",
            "Text-object differences may be caused by regrouping or splitting. Review missing/extra objects before concluding copy changed.",
            "Character-inventory equality alone cannot prove wording or reading order.",
            "Object counts do not prove visual quality; exported pages still need visual inspection.",
        ],
        "checks": checks, "CMOOccurrences": cmo, "emailOccurrences": email,
        "input": without_text(actual) if args.summary else actual,
        "reference": {k: reference[k] for k in ("path", "bytes", "sha256", "slideCount", "slideSizeEmu", "totals")},
        "pageComparisons": comparisons,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, ET.ParseError, zipfile.BadZipFile) as error:
        print(json.dumps({"schema": "outrise-pptx-export-review.v1", "passed": False, "error": str(error)}, ensure_ascii=False))
        sys.exit(2)
