"""Pin the approved variable fonts to their official 400/500/600 named instances.

Uses a project-private fontTools installation. Does not install fonts, subset
glyphs, modify the source fonts, or change any system/runtime packages.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fonttools-path", type=Path, required=True)
    args = parser.parse_args()
    sys.path.insert(0, str(args.fonttools_path.resolve()))
    import fontTools
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont

    bundle = Path(__file__).resolve().parent.parent
    fonts = bundle / "fonts"
    target = fonts / "static"
    target.mkdir(exist_ok=True)
    generated = []
    for stem, family in (("InstrumentSans", "Instrument Sans"), ("NotoSansSC", "Noto Sans SC")):
        source = fonts / f"{stem}-Variable.ttf"
        for weight, style in ((400, "Regular"), (500, "Medium"), (600, "SemiBold")):
            font = TTFont(source, recalcTimestamp=False)
            axes = {axis.axisTag: (weight if axis.axisTag == "wght" else axis.defaultValue) for axis in font["fvar"].axes}
            instance = instantiateVariableFont(font, axes, inplace=False, optimize=True, updateFontNames=True)
            instance.recalcTimestamp = False
            if "fvar" in instance or instance["OS/2"].usWeightClass != weight:
                raise RuntimeError(f"Incorrect pinned instance for {family} {weight}")
            output = target / f"{stem}-{style}.ttf"
            instance.save(output)
            check = TTFont(output, recalcTimestamp=False)
            name = check["name"]
            entry = {
                "path": output.relative_to(bundle).as_posix(),
                "family": family,
                "style": style,
                "weight": weight,
                "legacyFamily": name.getDebugName(1),
                "legacySubfamily": name.getDebugName(2),
                "typographicFamily": name.getDebugName(16),
                "typographicSubfamily": name.getDebugName(17),
                "fullName": name.getDebugName(4),
                "postscriptName": name.getDebugName(6),
                "axesPinned": axes,
                "glyphCount": check["maxp"].numGlyphs,
                "unicodeMappings": len(check.getBestCmap()),
                "fsType": check["OS/2"].fsType,
                "bytes": output.stat().st_size,
                "sha256": sha256(output),
                "sourcePath": source.relative_to(bundle).as_posix(),
                "sourceSha256": sha256(source),
                "license": f"fonts/{stem}-OFL.txt",
                "subset": False,
            }
            generated.append(entry)
            print(json.dumps(entry, ensure_ascii=False), flush=True)
    manifest = {
        "brand": "Outrise",
        "sourceVersion": "Outrise VI 1.0 / 2026-10-24",
        "operation": "Fully pin official variable-font axes to named weight instances; no subsetting or glyph editing",
        "tool": "fontTools.varLib.instancer",
        "toolVersion": fontTools.__version__,
        "toolSource": "https://pypi.org/project/fonttools/",
        "files": generated,
    }
    (bundle / "static-font-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
