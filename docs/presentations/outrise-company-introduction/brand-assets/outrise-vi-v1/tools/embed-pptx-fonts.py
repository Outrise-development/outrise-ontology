"""Add the six approved full fonts to an artifact-authored PPTX, without rebuilding slides.

EOT layout: https://www.w3.org/submissions/EOT/
PowerPoint font parts: https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/1663dabc-5d98-463f-889e-bcd9b77c3d34
Windows TTEmbedFontFromFileA writes full uncompressed EOT, not bare TTF or
Word/XPS obfuscation. Each EOT payload is decoded and hash-checked against the
approved static source, so all characters and exact weights are preserved.
Only presentation.xml, its relationships and content types are changed. On
Windows, TTGetEmbeddedFontInfo checks payloads without installing any font.
"""
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import struct
import tempfile
from xml.dom import minidom
import zipfile

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG = "http://schemas.openxmlformats.org/package/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
FONT_REL = R + "/font"
CONTENT_TYPE = "application/x-fontdata"
MODIFIED = {"ppt/presentation.xml", "ppt/_rels/presentation.xml.rels", "[Content_Types].xml"}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sfnt_tables(data: bytes) -> dict[str, bytes]:
    if data[:4] != b"\x00\x01\x00\x00":
        raise ValueError("Only the approved static TrueType outlines are supported")
    count = struct.unpack_from(">H", data, 4)[0]
    tables = {}
    for i in range(count):
        tag, _, offset, length = struct.unpack_from(">4sIII", data, 12 + i * 16)
        if offset + length > len(data):
            raise ValueError("Truncated TrueType table")
        tables[tag.decode("ascii")] = data[offset:offset + length]
    if "fvar" in tables:
        raise ValueError("Embed official static faces, not variable fonts")
    return tables


def english_name(table: bytes, name_id: int) -> str:
    _, count, offset = struct.unpack_from(">HHH", table)
    candidates = []
    for i in range(count):
        platform, encoding, language, ident, length, location = struct.unpack_from(">6H", table, 6 + i * 12)
        if ident != name_id:
            continue
        raw = table[offset + location:offset + location + length]
        if platform == 3 and encoding in (1, 10):
            candidates.append((0 if language == 0x409 else 2, raw.decode("utf-16-be")))
        elif platform == 0:
            candidates.append((1, raw.decode("utf-16-be")))
        elif platform == 1 and language == 0:
            candidates.append((3, raw.decode("mac-roman")))
    if not candidates:
        raise ValueError(f"Required font name {name_id} missing")
    return sorted(candidates)[0][1]


def make_eot(source: Path, expected: dict) -> tuple[bytes, dict]:
    if os.name != "nt":
        raise RuntimeError("This embedding writer requires Windows T2embed.dll; it never installs fonts")
    data = source.read_bytes()
    tables = sfnt_tables(data)
    os2, head, name = tables["OS/2"], tables["head"], tables["name"]
    os2_version, weight, fs_type = struct.unpack_from(">H", os2)[0], struct.unpack_from(">H", os2, 4)[0], struct.unpack_from(">H", os2, 8)[0]
    if fs_type != 0 or weight != expected["weight"]:
        raise ValueError("Unexpected license bits or weight; refusing font embedding")
    names = [english_name(name, n) for n in (1, 2, 5, 4)]
    if names[0] != expected["legacyFamily"]:
        raise ValueError("Font family does not match the audited manifest")
    if digest(data) != expected["sha256"]:
        raise ValueError("Font checksum does not match the audited manifest")
    callback_type = ctypes.CFUNCTYPE(ctypes.c_uint32, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint32)
    chunks = []

    @callback_type
    def write(_stream, buffer, length):
        chunks.append(ctypes.string_at(buffer, length))
        return length

    gdi = ctypes.WinDLL("gdi32.dll")
    gdi.CreateCompatibleDC.argtypes = [ctypes.c_void_p]
    gdi.CreateCompatibleDC.restype = ctypes.c_void_p
    gdi.DeleteDC.argtypes = [ctypes.c_void_p]
    gdi.AddFontMemResourceEx.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint32)]
    gdi.AddFontMemResourceEx.restype = ctypes.c_void_p
    gdi.RemoveFontMemResourceEx.argtypes = [ctypes.c_void_p]
    gdi.CreateFontW.argtypes = [ctypes.c_int32] * 5 + [ctypes.c_uint32] * 8 + [ctypes.c_wchar_p]
    gdi.CreateFontW.restype = ctypes.c_void_p
    gdi.SelectObject.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
    gdi.SelectObject.restype = ctypes.c_void_p
    gdi.DeleteObject.argtypes = [ctypes.c_void_p]
    gdi.GetTextFaceW.argtypes = [ctypes.c_void_p, ctypes.c_int32, ctypes.c_wchar_p]
    context = gdi.CreateCompatibleDC(None)
    if not context:
        raise RuntimeError("Could not create a memory device context for the font writer")
    function = ctypes.WinDLL("t2embed.dll").TTEmbedFontFromFileA
    function.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint16, ctypes.c_uint32, ctypes.c_uint32,
                         ctypes.POINTER(ctypes.c_uint32), ctypes.POINTER(ctypes.c_uint32), callback_type,
                         ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint16, ctypes.c_uint16, ctypes.c_void_p]
    function.restype = ctypes.c_int32
    privilege, status = ctypes.c_uint32(), ctypes.c_uint32()
    resource, logical_font, old_font = None, None, None
    try:
        # Memory-only GDI resource is private to this process and explicitly released.
        # The selected DC font supplies EOT names; without it Windows writes "System".
        buffer, count = ctypes.create_string_buffer(data), ctypes.c_uint32()
        resource = gdi.AddFontMemResourceEx(buffer, len(data), None, ctypes.byref(count))
        if not resource:
            raise RuntimeError("Could not load the font into this process's private GDI memory")
        logical_font = gdi.CreateFontW(-32, 0, 0, 0, weight, 0, 0, 0, 1, 0, 0, 0, 0, names[0])
        if not logical_font:
            raise RuntimeError("Could not select the exact private GDI font")
        old_font = gdi.SelectObject(context, logical_font)
        actual = ctypes.create_unicode_buffer(64)
        if not gdi.GetTextFaceW(context, len(actual), actual) or actual.value != names[0]:
            raise RuntimeError(f"GDI substituted the requested face: {actual.value!r}")
        # TTEMBED_RAW=0, CHARSET_UNICODE=1; no subset and no language removal.
        result = function(context, str(source.resolve()).encode("mbcs"), 0, 0, 1,
                          ctypes.byref(privilege), ctypes.byref(status), write, None, None, 0, 0, None)
    finally:
        if old_font:
            gdi.SelectObject(context, old_font)
        if logical_font:
            gdi.DeleteObject(logical_font)
        if resource:
            gdi.RemoveFontMemResourceEx(resource)
        gdi.DeleteDC(context)
    if result != 0 or privilege.value != 3 or status.value != 0:
        raise RuntimeError(f"Windows EOT writer failed or simulated a face: result={result:#x}, privilege={privilege.value}, status={status.value}")
    payload = b"".join(chunks)
    info = verify_eot(payload, expected)
    info["windowsWriter"] = {"api": "TTEmbedFontFromFileA", "result": result, "status": status.value,
                             "sourceFontByteIdentical": True, "systemFontInstallation": False,
                             "privateMemoryFontReleased": True}
    return payload, info


def verify_eot(payload: bytes, expected: dict) -> dict:
    total, font_size, version, flags = struct.unpack_from("<4I", payload)
    if total != len(payload) or version != 0x00020002 or flags not in (0, 0x10000000):
        raise ValueError("Invalid full uncompressed EOT header")
    if struct.unpack_from("<H", payload, 34)[0] != 0x504C:
        raise ValueError("Invalid EOT magic")
    offset, names = 80, []
    for _ in range(4):
        pad, size = struct.unpack_from("<HH", payload, offset)
        if pad != 0:
            raise ValueError("Invalid EOT name padding")
        offset += 4
        names.append(payload[offset:offset + size].decode("utf-16-le").rstrip("\x00"))
        offset += size
    if struct.unpack_from("<HH", payload, offset) != (0, 0):
        raise ValueError("Only unrestricted OFL EOT payloads are supported")
    offset += 4
    root_checksum, eudc_codepage, pad6, signature_size = struct.unpack_from("<IIHH", payload, offset)
    if root_checksum != 0x50475342 or pad6 != 0 or signature_size != 0:
        raise ValueError("Unexpected EOT v2.2 security fields")
    offset += 12
    eudc_flags, eudc_size = struct.unpack_from("<II", payload, offset)
    if eudc_size != 0:
        raise ValueError("Unexpected EUDC font data")
    offset += 8
    stored_font = payload[offset:]
    font = bytes(b ^ 0x50 for b in stored_font) if flags & 0x10000000 else stored_font
    if len(font) != font_size or digest(font) != expected["sha256"] or names[0] != expected["legacyFamily"]:
        raise ValueError("Embedded font is not a byte-exact full copy of the approved static font")
    if struct.unpack_from("<IH", payload, 28) != (expected["weight"], 0):
        raise ValueError("EOT weight or embedding permission changed")
    return {"format": "EOT 0x00020002", "flags": flags, "subset": False, "family": names[0], "style": names[1],
            "fontDataBytes": font_size, "fontDataSha256": digest(font), "payloadBytes": total, "payloadSha256": digest(payload)}


def windows_parser_check(payload: bytes) -> dict:
    if os.name != "nt":
        return {"checked": False, "reason": "Windows T2embed.dll unavailable"}
    # TTGetEmbeddedFontInfo does not allocate font data structures or install fonts.
    callback_type = ctypes.CFUNCTYPE(ctypes.c_uint32, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_uint32)
    position = 0

    @callback_type
    def read(_stream, buffer, length):
        nonlocal position
        chunk = payload[position:position + length]
        ctypes.memmove(buffer, chunk, len(chunk))
        position += len(chunk)
        return len(chunk)

    lib = ctypes.WinDLL("t2embed.dll")
    function = lib.TTGetEmbeddedFontInfo
    function.argtypes = [ctypes.c_uint32, ctypes.POINTER(ctypes.c_uint32), ctypes.c_uint32,
                         ctypes.POINTER(ctypes.c_uint32), callback_type, ctypes.c_void_p, ctypes.c_void_p]
    function.restype = ctypes.c_int32
    privilege, status = ctypes.c_uint32(), ctypes.c_uint32()
    result = function(0, ctypes.byref(privilege), 0, ctypes.byref(status), read, None, None)
    # The API checks installed font names too. The documented 0x10E/0x10F results
    # are local-name collisions, not malformed EOT. Preserve them in the receipt;
    # do not rename approved fonts or claim a PowerPoint application test.
    if result not in (0, 0x10E, 0x10F) or privilege.value != 3 or status.value & 1:
        raise RuntimeError(f"Windows EOT validation failed: result={result:#x}, privilege={privilege.value}, status={status.value}")
    return {"checked": True, "api": "TTGetEmbeddedFontInfo", "result": result,
            "resultName": {0: "E_NONE", 0x10E: "E_FONTALREADYEXISTS", 0x10F: "E_FONTNAMEALREADYEXISTS"}[result],
            "localFontNameCollision": result != 0,
            "privilege": "EMBED_INSTALLABLE", "subset": False, "fontInstalled": False}


def direct_elements(node, namespace: str, local: str):
    return [c for c in node.childNodes if c.nodeType == c.ELEMENT_NODE and c.namespaceURI == namespace and c.localName == local]


def xml_bytes(doc) -> bytes:
    return doc.toxml(encoding="UTF-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--receipt", type=Path)
    parser.add_argument("--require-windows-parser", action="store_true")
    args = parser.parse_args()
    if args.require_windows_parser and os.name != "nt":
        raise RuntimeError("A Windows validation run was required")
    bundle = Path(__file__).resolve().parent.parent
    fonts = json.loads((bundle / "static-font-manifest.json").read_text(encoding="utf-8"))["files"]
    if len(fonts) != 6:
        raise ValueError("Expected all six audited faces")
    with zipfile.ZipFile(args.input) as archive:
        infos = archive.infolist()
        parts = {i.filename: archive.read(i) for i in infos}
    if len(parts) != len(infos):
        raise ValueError("Duplicate ZIP entries are not supported")
    if any(n.startswith("_xmlsignatures/") for n in parts):
        raise ValueError("Refusing to alter a signed package")
    original = dict(parts)
    presentation = minidom.parseString(parts["ppt/presentation.xml"])
    root = presentation.documentElement
    if root.namespaceURI != P:
        raise ValueError("Expected a transitional PresentationML document")
    prefix = root.prefix or "p"
    if not root.prefix:
        root.setAttribute("xmlns:p", P)
    root.setAttribute("xmlns:r", R)
    root.setAttribute("embedTrueTypeFonts", "1")
    root.setAttribute("saveSubsetFonts", "0")
    existing = direct_elements(root, P, "embeddedFontLst")
    if existing:
        raise ValueError("Input already embeds fonts; rebuild from the unembedded artifact candidate")
    embedded = presentation.createElementNS(P, f"{prefix}:embeddedFontLst")
    after_fonts = {"custShowLst", "photoAlbum", "custDataLst", "kinsoku", "defaultTextStyle", "modifyVerifier", "extLst"}
    following = next((c for c in root.childNodes if c.nodeType == c.ELEMENT_NODE and c.namespaceURI == P and c.localName in after_fonts), None)
    root.insertBefore(embedded, following)
    rels = minidom.parseString(parts["ppt/_rels/presentation.xml.rels"])
    rel_root = rels.documentElement
    used_ids = {e.getAttribute("Id") for e in rels.getElementsByTagNameNS(PKG, "Relationship")}
    content_types = minidom.parseString(parts["[Content_Types].xml"])
    defaults = [e for e in content_types.getElementsByTagNameNS(CT, "Default") if e.getAttribute("Extension").lower() == "fntdata"]
    if defaults and any(e.getAttribute("ContentType") != CONTENT_TYPE for e in defaults):
        raise ValueError("Conflicting font content type")
    if not defaults:
        element = content_types.createElementNS(CT, "Default")
        element.setAttribute("Extension", "fntdata")
        element.setAttribute("ContentType", CONTENT_TYPE)
        content_types.documentElement.appendChild(element)
    audited = []
    for index, font in enumerate(fonts, 1):
        part = f"ppt/fonts/outrise-{index}.fntdata"
        relationship_id = f"rIdOutriseFont{index}"
        if part in parts or relationship_id in used_ids:
            raise ValueError("Font part or relationship collision")
        data, info = make_eot(bundle / font["path"], font)
        info["windowsParser"] = windows_parser_check(data)
        info["part"] = part
        info["relationshipId"] = relationship_id
        parts[part] = data
        entry = presentation.createElementNS(P, f"{prefix}:embeddedFont")
        family = presentation.createElementNS(P, f"{prefix}:font")
        family.setAttribute("typeface", font["legacyFamily"])
        family.setAttribute("charset", "1")
        regular = presentation.createElementNS(P, f"{prefix}:regular")
        regular.setAttributeNS(R, "r:id", relationship_id)
        entry.appendChild(family)
        entry.appendChild(regular)
        embedded.appendChild(entry)
        rel = rels.createElementNS(PKG, "Relationship")
        for name, value in {"Id": relationship_id, "Type": FONT_REL, "Target": f"fonts/outrise-{index}.fntdata"}.items():
            rel.setAttribute(name, value)
        rel_root.appendChild(rel)
        audited.append(info)
    parts["ppt/presentation.xml"] = xml_bytes(presentation)
    parts["ppt/_rels/presentation.xml.rels"] = xml_bytes(rels)
    parts["[Content_Types].xml"] = xml_bytes(content_types)
    slide_parts = [n for n in original if n.startswith("ppt/slides/") and n.endswith(".xml")]
    unchanged = [n for n in original if n not in MODIFIED]
    if any(parts[n] != original[n] for n in unchanged):
        raise ValueError("An unrelated package part changed")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=".font-embedding-", suffix=".pptx", dir=args.output.parent)
    os.close(fd)
    temp_path = Path(temp_name)
    try:
        with zipfile.ZipFile(temp_path, "w", compression=zipfile.ZIP_DEFLATED) as output:
            for info in infos:
                output.writestr(info, parts[info.filename])
            for name in sorted(parts.keys() - original.keys()):
                output.writestr(name, parts[name])
        with zipfile.ZipFile(temp_path) as output:
            if output.testzip() is not None:
                raise ValueError("ZIP integrity check failed")
            if any(output.read(n) != original[n] for n in unchanged):
                raise ValueError("Unrelated part failed post-write byte comparison")
            for audit, font in zip(audited, fonts):
                verify_eot(output.read(audit["part"]), font)
        os.replace(temp_path, args.output)
    finally:
        if temp_path.exists():
            temp_path.unlink()
    receipt = {"input": str(args.input), "output": str(args.output), "outputSha256": digest(args.output.read_bytes()),
               "embeddedFaceCount": len(audited), "embedTrueTypeFonts": True, "saveSubsetFonts": False,
               "unchangedOriginalPartCount": len(unchanged), "unchangedSlideXmlCount": len(slide_parts),
               "fonts": audited, "powerPointApplicationTested": False}
    if args.receipt:
        args.receipt.parent.mkdir(parents=True, exist_ok=True)
        args.receipt.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    main()
