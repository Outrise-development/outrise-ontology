"""Normalize approved static font faces in a Canva PPTX without rebuilding slides.

Changes only approved typeface aliases, corresponding b flags, and removal of
old embedded-font package data. The separate embed-pptx-fonts.py tool must then
add the verified complete fonts. Text, geometry and unrelated attributes are
checked with an XML semantic whitelist; untouched package parts remain exact.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import posixpath
import tempfile
from xml.dom import Node, minidom
import zipfile

A = "http://schemas.openxmlformats.org/drawingml/2006/main"
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
FONT_REL = R + "/font"
PROPS = {"rPr", "defRPr", "endParaRPr"}
FACES = {f"{family}{suffix}" for family in ("Instrument Sans", "Noto Sans SC")
         for suffix in ("", " Medium", " SemiBold")}
ALIASES = {**{name: name for name in FACES},
           "Instrument Sans Semi-Bold": "Instrument Sans SemiBold",
           "Noto Sans SC Semi-Bold": "Noto Sans SC SemiBold"}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def elements(node):
    return [n for n in node.childNodes if n.nodeType == Node.ELEMENT_NODE]


def direct_face(prop):
    values = [n.getAttribute("typeface") for n in elements(prop)
              if n.namespaceURI == A and n.localName in {"latin", "ea", "cs"} and n.hasAttribute("typeface")]
    if not values or any(v not in ALIASES for v in values):
        return None
    canonical = {ALIASES[v] for v in values}
    return next(iter(canonical)) if len(canonical) == 1 else None


def effective_face(prop):
    if prop.namespaceURI != A or prop.localName not in PROPS:
        return None
    face = direct_face(prop)
    if face:
        return face
    # Canva fragment paragraphs have one explicit face. Its end/default run
    # properties must not inherit the former b=1 from a layout or master.
    ancestor = prop.parentNode
    while ancestor and ancestor.nodeType == Node.ELEMENT_NODE:
        if ancestor.namespaceURI == A and ancestor.localName == "p":
            values = set()
            for run in elements(ancestor):
                if run.namespaceURI == A and run.localName in {"r", "fld"}:
                    properties = [n for n in elements(run) if n.namespaceURI == A and n.localName == "rPr"]
                    if len(properties) != 1 or not direct_face(properties[0]):
                        return None
                    values.add(direct_face(properties[0]))
            return next(iter(values)) if len(values) == 1 else None
        ancestor = ancestor.parentNode
    return None


def signature(node, *, skip=None):
    """All text, geometry, namespaces and non-whitelisted properties remain exact."""
    if node.nodeType == Node.ELEMENT_NODE:
        if skip and skip(node):
            return None
        attributes = []
        for key, value in node.attributes.items():
            if key == "typeface" and value in ALIASES:
                value = ALIASES[value]
            if key == "b" and effective_face(node):
                continue
            if node.namespaceURI == P and node.localName == "presentation" and key in {"embedTrueTypeFonts", "saveSubsetFonts"}:
                continue
            attributes.append((key, value))
        children = [signature(c, skip=skip) for c in node.childNodes]
        return ("element", node.tagName, tuple(sorted(attributes)), tuple(c for c in children if c is not None))
    if node.nodeType == Node.DOCUMENT_NODE:
        return ("document", tuple(signature(c, skip=skip) for c in node.childNodes))
    return (node.nodeType, node.nodeName, node.nodeValue)


def text_and_geometry(doc):
    text = [n.toxml() for n in doc.getElementsByTagNameNS(A, "t")]
    geometry_names = {"xfrm", "off", "ext", "chOff", "chExt", "prstGeom", "custGeom", "bodyPr", "pPr"}
    # pPr can contain defRPr, so include its own attributes only; the full tree
    # outside font/b changes is checked independently by signature().
    geometry = [(n.namespaceURI, n.localName, tuple(sorted(n.attributes.items())))
                for n in doc.getElementsByTagName("*") if n.localName in geometry_names]
    return {"text": sha(json.dumps(text, ensure_ascii=False).encode()),
            "geometry": sha(json.dumps(geometry, ensure_ascii=False).encode())}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True, help="Intermediate unembedded normalized PPTX")
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    if args.source.resolve() in {args.output.resolve(), args.report.resolve()}:
        parser.error("Source must remain unchanged; use separate output and report paths")
    with zipfile.ZipFile(args.source) as archive:
        infos = archive.infolist()
        original = {info.filename: archive.read(info) for info in infos}
    if len(original) != len(infos) or any(n.startswith("_xmlsignatures/") for n in original):
        raise ValueError("Duplicate or signed packages are not supported")
    docs = {name: minidom.parseString(data) for name, data in original.items() if name.endswith((".xml", ".rels"))}
    rel_name = "ppt/_rels/presentation.xml.rels"
    font_rels = [n for n in docs[rel_name].getElementsByTagNameNS(PKG, "Relationship") if n.getAttribute("Type") == FONT_REL]
    removed_parts = set()
    removed_ids = set()
    for rel in font_rels:
        if rel.getAttribute("TargetMode") == "External":
            raise ValueError("Unexpected external embedded-font relationship")
        target = rel.getAttribute("Target")
        part = posixpath.normpath(target.lstrip("/") if target.startswith("/") else posixpath.join("ppt", target))
        if not part.startswith("ppt/fonts/") or part not in original:
            raise ValueError("Unexpected or missing embedded-font target")
        removed_parts.add(part)
        removed_ids.add(rel.getAttribute("Id"))
    lists = docs["ppt/presentation.xml"].getElementsByTagNameNS(P, "embeddedFontLst")
    embedded_entries = [entry for listing in lists for entry in elements(listing)]
    for entry in embedded_entries:
        names = entry.getElementsByTagNameNS(P, "font")
        if len(names) != 1 or names[0].getAttribute("typeface") not in ALIASES:
            raise ValueError("Refusing to remove an unapproved embedded font")
        for child in elements(entry):
            if child.hasAttributeNS(R, "id") and child.getAttributeNS(R, "id") not in removed_ids:
                raise ValueError("Embedded font has a dangling relationship")
    all_font_parts = {n for n in original if n.startswith("ppt/fonts/") and not n.endswith("/")}
    if all_font_parts != removed_parts:
        raise ValueError("Unexpected orphan or shared font package data")
    for name, doc in docs.items():
        if name != rel_name and any(n.getAttribute("Type") == FONT_REL for n in doc.getElementsByTagNameNS(PKG, "Relationship")):
            raise ValueError("Font relationships outside presentation.xml require separate review")
    removed_overrides = {"/" + n for n in removed_parts}
    remove_font_default = bool(removed_parts) and not any(n.endswith(".fntdata") and n not in removed_parts for n in original)

    def skip_font_data(node):
        return (node.namespaceURI == P and node.localName == "embeddedFontLst"
                or node.namespaceURI == PKG and node.localName == "Relationship" and node.getAttribute("Id") in removed_ids and node.getAttribute("Type") == FONT_REL
                or node.namespaceURI == CT and node.localName == "Override" and node.getAttribute("PartName") in removed_overrides
                or node.namespaceURI == CT and node.localName == "Default" and node.getAttribute("Extension").lower() == "fntdata" and remove_font_default)

    before = {name: signature(doc, skip=skip_font_data) for name, doc in docs.items()}
    geometry_before = {name: text_and_geometry(doc) for name, doc in docs.items() if name.startswith("ppt/slides/") and name.endswith(".xml")}
    edits, untouched_bold = [], []
    for name, doc in docs.items():
        for node in list(doc.getElementsByTagName("*")):
            if node.hasAttribute("typeface"):
                value = node.getAttribute("typeface")
                canonical = ALIASES.get(value)
                if canonical and canonical != value:
                    node.setAttribute("typeface", canonical)
                    edits.append({"part": name, "element": node.tagName, "attribute": "typeface", "from": value, "to": canonical})
            if node.namespaceURI == A and node.localName in PROPS:
                face = effective_face(node)
                if face and node.getAttribute("b") != "0":
                    previous = node.getAttribute("b") if node.hasAttribute("b") else None
                    node.setAttribute("b", "0")
                    edits.append({"part": name, "element": node.tagName, "attribute": "b", "from": previous, "to": "0", "effectiveFace": face})
                elif not face and node.getAttribute("b") in {"1", "true"}:
                    untouched_bold.append({"part": name, "element": node.tagName})
        for node in list(doc.getElementsByTagName("*")):
            if skip_font_data(node) and node.parentNode:
                node.parentNode.removeChild(node)
        if name == "ppt/presentation.xml":
            doc.documentElement.setAttribute("embedTrueTypeFonts", "0")
            doc.documentElement.setAttribute("saveSubsetFonts", "0")
        if signature(doc, skip=skip_font_data) != before[name]:
            raise ValueError(f"Non-whitelisted XML change: {name}")
    for name, expected in geometry_before.items():
        if text_and_geometry(docs[name]) != expected:
            raise ValueError(f"Text or geometry changed: {name}")
    visible_runs = []
    for name, doc in docs.items():
        if name.startswith("ppt/slides/") and name.endswith(".xml"):
            for run in doc.getElementsByTagNameNS(A, "r"):
                properties = [n for n in elements(run) if n.namespaceURI == A and n.localName == "rPr"]
                if len(properties) != 1 or not direct_face(properties[0]) or properties[0].getAttribute("b") != "0":
                    raise ValueError(f"Visible run lacks an exact approved static face/b=0: {name}")
                visible_runs.append(direct_face(properties[0]))
    if not visible_runs:
        raise ValueError("No visible text runs found")
    changed_xml = {edit["part"] for edit in edits} | {"ppt/presentation.xml", rel_name, "[Content_Types].xml"}
    parts = {name: data for name, data in original.items() if name not in removed_parts}
    for name in changed_xml:
        parts[name] = docs[name].toxml(encoding="UTF-8")
        # Reparse the actual serialized bytes to verify namespace preservation.
        if signature(minidom.parseString(parts[name]), skip=skip_font_data) != before[name]:
            raise ValueError(f"Serialized XML failed the whitelist: {name}")
    unchanged_parts = set(parts) - changed_xml
    if any(parts[name] != original[name] for name in unchanged_parts):
        raise ValueError("An unrelated package part changed")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".canva-fonts-", suffix=".pptx", dir=args.output.parent)
    os.close(fd)
    temp = Path(temp)
    try:
        with zipfile.ZipFile(temp, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for info in infos:
                if info.filename in parts:
                    archive.writestr(info, parts[info.filename])
        with zipfile.ZipFile(temp) as archive:
            if archive.testzip() is not None or any(archive.read(n) != original[n] for n in unchanged_parts):
                raise ValueError("Post-write ZIP or preservation check failed")
        os.replace(temp, args.output)
    finally:
        if temp.exists():
            temp.unlink()
    receipt = {"schemaVersion": "outrise.canva-font-normalization.v1", "source": str(args.source.resolve()),
               "sourceSha256": sha(args.source.read_bytes()), "output": str(args.output.resolve()),
               "outputSha256": sha(args.output.read_bytes()), "outputRequiresFontEmbedding": True,
               "slideCount": len(geometry_before), "visibleRunCount": len(visible_runs),
               "visibleFontCounts": dict(sorted(Counter(visible_runs).items())),
               "allVisibleRunsHaveExplicitBoldFalse": True, "textAndGeometryUnchanged": True,
               "xmlWhitelistPassed": True, "byteIdenticalUnrelatedPartCount": len(unchanged_parts),
               "removedFontParts": sorted(removed_parts), "removedFontRelationshipIds": sorted(removed_ids),
               "changes": edits, "unresolvedBoldPropertiesLeftUnchanged": untouched_bold,
               "powerPointApplicationTested": False}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: receipt[k] for k in ("slideCount", "visibleRunCount", "visibleFontCounts", "xmlWhitelistPassed", "textAndGeometryUnchanged", "byteIdenticalUnrelatedPartCount")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
