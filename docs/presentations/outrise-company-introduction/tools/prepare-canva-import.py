"""Prepare Canva font transport from single-script, single-family fragments only.

The earlier mixed-run native deck is rejected. Canva tests confirmed Medium
and the Bold bridge for weight 600 when replacing the imported family with
the uploaded brand family. SemiBold family names alone did not preserve 600.
Each source text box must have exactly one explicit brand family and one
writing script. Only the 600 boxes receive b=true on their text properties.

This remains an import intermediate, not a finished client deck. After Canva
replacement, check fonts, weights and layout on every page. Local checks
verify only allowed typeface/bold-600/font-metadata changes, preserving text,
all other XML bytes, images, slide size and the source file. Standard library only.
"""

import argparse
from collections import Counter
from hashlib import sha256
import json
from pathlib import Path
import posixpath
import re
import unicodedata
from urllib.parse import unquote
import xml.etree.ElementTree as ET
import zipfile


DECK_ROOT = Path(__file__).resolve().parents[1]
FONT_MAPPING = {
    "Noto Sans SC": "Noto Sans",
    "Noto Sans SC Medium": "Montserrat Medium",
    "Noto Sans SC SemiBold": "Roboto Bold",
    "Instrument Sans": "Arimo",
    "Instrument Sans Medium": "Source Sans 3 Medium",
    "Instrument Sans SemiBold": "Inter Bold",
}
SOURCE_600 = {"Noto Sans SC SemiBold", "Instrument Sans SemiBold"}
TARGET_BOLD = {FONT_MAPPING[family] for family in SOURCE_600}
TYPEFACE = re.compile(rb"\btypeface\s*=\s*([\"'])(.*?)\1")
SHAPE = re.compile(rb"<(?:[\w.-]+:)?sp\b[^>]*>.*?</(?:[\w.-]+:)?sp\s*>", re.DOTALL)
TEXT_PROPERTIES = re.compile(rb"<(?:[\w.-]+:)?(?:rPr|defRPr|endParaRPr)\b[^>]*>")
BOLD_ATTRIBUTE = re.compile(rb"[ \t\r\n]b\s*=\s*([\"'])(.*?)\1")
FONT_LIST = re.compile(
    rb"<(?:[\w.-]+:)?embeddedFontLst\b[^>]*(?:/>|>.*?</(?:[\w.-]+:)?embeddedFontLst\s*>)",
    re.DOTALL,
)
REL_TAG = re.compile(rb"<(?:[\w.-]+:)?Relationship\b[^>]*/>")
CONTENT_TYPE_TAG = re.compile(rb"<(?:[\w.-]+:)?(?:Default|Override)\b[^>]*/>")
DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
PRESENTATION_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"


def digest(data):
    return sha256(data).hexdigest()


def attributes(tag):
    return {
        match.group(1).decode(): match.group(3).decode()
        for match in re.finditer(rb"([\w:.-]+)\s*=\s*([\"'])(.*?)\2", tag)
    }


def target_part(rels_name, target):
    target = unquote(target.split("#", 1)[0])
    if target.startswith("/"):
        return target.lstrip("/")
    folder = "" if rels_name == "_rels/.rels" else posixpath.dirname(posixpath.dirname(rels_name))
    return posixpath.normpath(posixpath.join(folder, target))


def validate_fragments(parts):
    counts = Counter()
    for name, data in parts.items():
        if not re.fullmatch(r"ppt/slides/slide\d+\.xml", name):
            continue
        root = ET.fromstring(data)
        for shape in root.iter(f"{{{PRESENTATION_NS}}}sp"):
            text = "".join(node.text or "" for node in shape.iter(f"{{{DRAWING_NS}}}t"))
            if not text.strip():
                continue
            faces = {node.attrib["typeface"] for node in shape.iter() if "typeface" in node.attrib}
            if len(faces) != 1 or not faces.issubset(FONT_MAPPING):
                raise ValueError(f"Mixed/inherited/unknown font source rejected in {name}: {sorted(faces)}")
            ascii_letters = any(char.isascii() and char.isalpha() for char in text)
            other_letters = any(not char.isascii() and unicodedata.category(char).startswith("L") for char in text)
            if ascii_letters and other_letters:
                raise ValueError(f"Mixed-script source rejected in {name}: {text[:80]!r}")
            family = next(iter(faces))
            if any(node.get("b") not in {None, "0", "false"} for node in shape.iter()):
                raise ValueError(f"Source must encode weights as brand families with b=false in {name}")
            counts[family] += 1
    return counts


def set_bold_600(data, changes):
    def update_shape(match):
        raw = match.group()
        faces = {font.group(2).decode() for font in TYPEFACE.finditer(raw)}
        if not faces.intersection(SOURCE_600):
            return raw
        if len(faces) != 1:
            raise AssertionError("Mixed-font shape escaped source validation")
        changes["weight_600_textboxes"] += 1
        def update_properties(prop):
            tag = prop.group()
            changes["bold_text_properties"] += 1
            if BOLD_ATTRIBUTE.search(tag):
                return BOLD_ATTRIBUTE.sub(b' b="1"', tag)
            end = b"/>" if tag.endswith(b"/>") else b">"
            return tag[:-len(end)] + b' b="1"' + end
        return TEXT_PROPERTIES.sub(update_properties, raw)
    return SHAPE.sub(update_shape, data)


def mask_allowed_font_changes(data, slide=False):
    if slide:
        def mask_shape(match):
            raw = match.group()
            faces = {font.group(2).decode() for font in TYPEFACE.finditer(raw)}
            if faces.intersection(SOURCE_600 | TARGET_BOLD):
                raw = TEXT_PROPERTIES.sub(lambda prop: BOLD_ATTRIBUTE.sub(b"", prop.group()), raw)
            return raw
        data = SHAPE.sub(mask_shape, data)
    return TYPEFACE.sub(b"", data)


def prepare(source, output, report_path):
    source, output, report_path = (path.resolve() for path in (source, output, report_path))
    if len({source, output, report_path}) != 3:
        raise ValueError("Source, transport output, and report must be separate files")
    source_digest = digest(source.read_bytes())
    with zipfile.ZipFile(source) as archive:
        infos = archive.infolist()
        original = {info.filename: archive.read(info.filename) for info in infos}
        zip_comment = archive.comment
    if len(infos) != len(original):
        raise ValueError("Source ZIP has duplicate part names")
    fragment_counts = validate_fragments(original)

    removed_parts = {name for name in original if name.startswith("ppt/fonts/")}
    removed_relationship_ids = {}
    for name, data in original.items():
        if not name.endswith(".rels"):
            continue
        for tag in REL_TAG.findall(data):
            attrs = attributes(tag)
            if attrs.get("Type", "").endswith("/font"):
                removed_relationship_ids.setdefault(name, set()).add(attrs["Id"])
                removed_parts.add(target_part(name, attrs["Target"]))

    counts = Counter({name: 0 for name in FONT_MAPPING})
    metadata_removed = Counter()
    bold_changes = Counter()
    result = {}
    modified_parts = []
    for name, data in original.items():
        if name in removed_parts:
            continue
        new = data
        if re.fullmatch(r"ppt/slides/slide\d+\.xml", name):
            new = set_bold_600(new, bold_changes)
        if name == "ppt/presentation.xml":
            new, count = FONT_LIST.subn(b"", new)
            metadata_removed["embeddedFontLst"] += count
            new, count = re.subn(
                rb"\s+(?:embedTrueTypeFonts|saveSubsetFonts)\s*=\s*([\"']).*?\1", b"", new
            )
            metadata_removed["embedding_attributes"] += count
        if name.endswith(".rels"):
            def remove_font_relationship(match):
                attrs = attributes(match.group())
                if attrs.get("Id") in removed_relationship_ids.get(name, set()) or (
                    attrs.get("TargetMode") != "External"
                    and target_part(name, attrs.get("Target", "")) in removed_parts
                ):
                    metadata_removed["relationships"] += 1
                    return b""
                return match.group()
            new = REL_TAG.sub(remove_font_relationship, new)
        if name == "[Content_Types].xml":
            def remove_font_content_type(match):
                attrs = attributes(match.group())
                part = attrs.get("PartName", "").lstrip("/")
                extension = attrs.get("Extension")
                unused_font_default = (
                    extension and "font" in attrs.get("ContentType", "").lower()
                    and not any(
                        item.lower().endswith("." + extension.lower())
                        for item in original if item not in removed_parts
                    )
                )
                if part in removed_parts or unused_font_default:
                    metadata_removed["content_type_declarations"] += 1
                    return b""
                return match.group()
            new = CONTENT_TYPE_TAG.sub(remove_font_content_type, new)
        if name.endswith(".xml"):
            def replace_typeface(match):
                old = match.group(2).decode("utf-8")
                if old not in FONT_MAPPING:
                    return match.group()
                counts[old] += 1
                return match.group().replace(match.group(2), FONT_MAPPING[old].encode("utf-8"), 1)
            new = TYPEFACE.sub(replace_typeface, new)
        if new != data:
            modified_parts.append(name)
        result[name] = new

    # Reject missing families: one unmapped weight would make UI replacement ambiguous.
    if missing := [name for name, count in counts.items() if count == 0]:
        raise ValueError(f"Source is missing required explicit font families: {missing}")
    for name, data in result.items():
        if name.endswith((".xml", ".rels")):
            ET.fromstring(data)
        if name not in {"ppt/presentation.xml", "[Content_Types].xml"} and not name.endswith(".rels"):
            if name.endswith(".xml"):
                is_slide = bool(re.fullmatch(r"ppt/slides/slide\d+\.xml", name))
                if mask_allowed_font_changes(original[name], is_slide) != mask_allowed_font_changes(data, is_slide):
                    raise AssertionError(f"Non-font XML bytes changed: {name}")
            elif original[name] != data:
                raise AssertionError(f"Non-font binary part changed: {name}")
        if name.endswith(".rels"):
            for rel in ET.fromstring(data):
                if rel.get("TargetMode") == "External":
                    continue
                target = target_part(name, rel.get("Target", ""))
                if target not in result:
                    raise AssertionError(f"Dangling relationship in {name}: {target}")
                if rel.get("Type", "").endswith("/font"):
                    raise AssertionError(f"Embedded-font relationship remains in {name}")
        if name.endswith(".xml") and any(
            match.group(2).decode() in FONT_MAPPING for match in TYPEFACE.finditer(data)
        ):
            raise AssertionError(f"Source typeface name remains in {name}")

    slide_parts = sorted(name for name in result if re.fullmatch(r"ppt/slides/slide\d+\.xml", name))
    if not slide_parts:
        raise ValueError("Source contains no slides")
    # Only typefaces and b on source-600 fragment properties may differ.
    # Everything else, including non-600 bold attributes, remains byte-identical.
    for name in slide_parts:
        if mask_allowed_font_changes(original[name], True) != mask_allowed_font_changes(result[name], True):
            raise AssertionError(f"Non-font slide XML changed: {name}")
        before = [node.text for node in ET.fromstring(original[name]).iter(f"{{{DRAWING_NS}}}t")]
        after = [node.text for node in ET.fromstring(result[name]).iter(f"{{{DRAWING_NS}}}t")]
        if before != after:
            raise AssertionError(f"Text changed: {name}")
    before = ET.fromstring(original["ppt/presentation.xml"])
    after = ET.fromstring(result["ppt/presentation.xml"])
    size_tag = f"{{{PRESENTATION_NS}}}sldSz"
    if before.find(size_tag).attrib != after.find(size_tag).attrib:
        raise AssertionError("Slide size changed")
    if b"embeddedFontLst" in result["ppt/presentation.xml"]:
        raise AssertionError("Embedded-font list remains")

    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w") as archive:
        archive.comment = zip_comment
        for info in infos:
            if info.filename in result:
                archive.writestr(info, result[info.filename])
    with zipfile.ZipFile(output) as archive:
        if archive.testzip() is not None:
            raise AssertionError("ZIP CRC validation failed")
    if source_digest != digest(source.read_bytes()):
        raise AssertionError("Source file was modified")

    report = {
        "purpose": "Canva import bridge restricted to single-script, single-brand-family text fragments. Weight 600 uses Roboto Bold/Inter Bold plus b=true, following the isolated UI probe. This is an import intermediate, not a finished deck. Check fonts, weights and layout on every page after Canva replacement.",
        "source": str(source), "output": str(output),
        "source_sha256": source_digest, "output_sha256": digest(output.read_bytes()),
        "mapping": [
            {"source": family, "bridge": bridge, "replaced_typeface_attributes": counts[family]}
            for family, bridge in FONT_MAPPING.items()
        ],
        "modified_parts": modified_parts,
        "removed_parts": sorted(removed_parts),
        "removed_font_metadata": dict(metadata_removed),
        "source_fragment_counts": dict(fragment_counts),
        "allowed_bold_changes": dict(bold_changes),
        "checks": {
            "source_unchanged": True, "slide_count": len(slide_parts),
            "single_script_single_family_fragments_only": True,
            "slide_text_unchanged": True, "all_other_slide_xml_bytes_unchanged": True,
            "all_nonfont_xml_and_binary_parts_preserved": True,
            "only_source_600_bold_properties_changed": True, "slide_size_unchanged": True,
            "unmapped_typefaces_unchanged": True, "no_source_typeface_names_remain": True,
            "no_embedded_font_parts_or_references": True,
            "all_internal_relationship_targets_resolve": True, "zip_crc_valid": True,
        },
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DECK_ROOT / "build/v7-canva-fragments/candidate.raw.pptx")
    parser.add_argument("--output", type=Path, default=DECK_ROOT / "build/v7-canva-fragments/canva-import.pptx")
    parser.add_argument("--report", type=Path, help="Defaults to <output>.report.json")
    args = parser.parse_args()
    report_path = args.report or args.output.with_suffix(".report.json")
    print(json.dumps(prepare(args.source, args.output, report_path), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
