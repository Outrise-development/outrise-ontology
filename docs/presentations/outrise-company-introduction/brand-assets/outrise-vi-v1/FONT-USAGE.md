# Outrise VI 1.0 assets

Source: approved `Design/output/outrise-logo/manual-v1`, dated 2026-10-24. `source-manifest.json` records original asset SHA256 checksums. `static-font-manifest.json` records every derived font and its original source checksum.

The PNG wordmarks are 2400 × 635 and icons are 1024 × 1024. Preserve their aspect ratios and allow at least 0.20 times the image canvas height as clearspace on every side. Use at least 180 display pixels for the wordmark and 32 for the icon. Do not redraw the wordmark using text.

## Fonts

Latin letters and digits use Instrument Sans; Chinese uses Noto Sans SC. The source tokens specify body 400, headings/labels 500, and display 600. Full original variable fonts and their OFL 1.1 licenses remain in `fonts/`. Static 400/500/600 TTFs are in `fonts/static/`; no glyphs or Unicode mappings were subset. Noto Sans SC retains 31,036 glyphs and 30,890 Unicode mappings. All source and static files declare `OS/2.fsType=0`.

| Weight | Latin face | Chinese face |
| --- | --- | --- |
| 400 | Instrument Sans | Noto Sans SC |
| 500 | Instrument Sans Medium | Noto Sans SC Medium |
| 600 | Instrument Sans SemiBold | Noto Sans SC SemiBold |

The Medium and SemiBold names are the fonts' official legacy face names, produced from their existing named instances. Their typographic family names remain Instrument Sans and Noto Sans SC. Use these exact faces with `bold: false` in artifact-tool: its public TextStyle exposes only a bold boolean, which cannot express numeric weights 500/600. Do not replace Medium/SemiBold with a base-family `bold: true`.

## Local loading

```js
import {registerOutriseFonts, fontFace} from './brand-assets/outrise-vi-v1/tools/register-fonts.mjs';
const {Canvas, registered} = registerOutriseFonts(nodeModules);
const textStyle = {typeface: fontFace('chinese', 600), bold: false};
```

Pass the bundled `node_modules` directory discovered by `load_workspace_dependencies`. Register before measuring or exporting text. The helper loads artifact-tool's own nested skia-canvas module, checks each face and weight, and fails on missing fonts. Registration affects the current process only; it does not install a system font or modify bundled dependencies.

The presence of a typeface name in OOXML alone is not proof of embedded fonts. Local editable exports use the embedding step below. Canva requires the separate verified workflow described after that step; directly importing the custom-font native deck did not preserve all fonts.

## Embed fonts in the editable PPTX

Run this **after artifact-tool export and before finalization**, using the bundled Python on Windows:

```text
python brand-assets/outrise-vi-v1/tools/embed-pptx-fonts.py --input build/v7/candidate.raw.pptx --output build/v7/candidate.pptx --receipt build/v7/font-embedding.json --require-windows-parser
```

The helper adds six EOT font parts and their package relationships, sets `embedTrueTypeFonts=1` and `saveSubsetFonts=0`, and preserves every other original package part byte for byte. It refuses already-embedded inputs and signed packages. It uses only Python's standard library and Windows APIs; fontTools is only needed to regenerate the static instances.

Windows `TTEmbedFontFromFileA` creates the EOT 2.2 payloads. Exact fonts are temporarily loaded into private process memory to supply the correct EOT names, then released. No font is installed persistently or made available to other applications. The helper verifies source checksums, EOT names/weights/permissions, and decoded font-data checksums; all characters remain available. Each native writer call must succeed without font simulation.

`TTGetEmbeddedFontInfo` provides an additional read-only header/permission check. It can report `E_FONTALREADYEXISTS` or `E_FONTNAMEALREADYEXISTS` when the host already has that family. These documented name conflicts are retained in the receipt and are not presented as a PowerPoint application test. On this host, Noto Sans SC Regular and Medium report the second status; the other four faces return `E_NONE`. All six native writer calls succeed and all six decoded full-font checksums match.

The portable delivery embeds all six complete fonts, so no system-font installation is part of the normal delivery workflow. Applications must support PowerPoint embedded fonts to use them; an application that ignores embedded fonts may substitute a font. For that specific case, the six static TTFs and licenses are available as an optional separately installed font package. This repository never installs fonts persistently. Keep both OFL files with any separately distributed fonts. Structural and rendering checks are not a claim that this file was opened in the native PowerPoint application.

Implementation references: [Microsoft font-part compatibility notes](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/1663dabc-5d98-463f-889e-bcd9b77c3d34), [Microsoft EOT submission](https://www.w3.org/submissions/EOT/), [TTEmbedFontFromFileA](https://learn.microsoft.com/en-us/windows/win32/api/t2embapi/nf-t2embapi-ttembedfontfromfilea), [read-only font information](https://learn.microsoft.com/en-us/windows/win32/api/t2embapi/nf-t2embapi-ttgetembeddedfontinfo), [private memory font loading](https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-addfontmemresourceex), and [Open XML SDK presentation schema](https://github.com/dotnet/Open-XML-SDK/blob/main/data/schemas/schemas_openxmlformats_org_presentationml_2006_main.json).

## Canva import, review, and portable export

The October 2026 Canva import tests discarded custom family names even after the fonts were uploaded. A whole-textbox replacement also flattened Chinese/Latin mixed runs. Use independent text fragments and six distinct built-in transport faces; the transport file is an intermediate, never the customer delivery.

Run these commands from the presentation directory with the bundled Node and Python runtimes:

```text
node build.mjs --canva-fragments --revision=v7-canva-fragments
python tools/prepare-canva-import.py
```

The fragment build contains 430 native textboxes across 17 pages. Each textbox has a single script, face, and weight, with the approved line placement retained. The bridge reads `build/v7-canva-fragments/candidate.raw.pptx` and writes `build/v7-canva-fragments/canva-import.pptx` plus its receipt. It rejects the regular native deck's mixed-font textboxes.

Upload the six static brand fonts to Canva, import the transport PPTX, and apply each of these font-family replacements to the entire design through Canva's font picker:

| Transport family | Uploaded brand face | Brand weight |
| --- | --- | --- |
| Noto Sans | Noto Sans SC | 400 |
| Montserrat Medium | Noto Sans SC Medium | 500 |
| Roboto Bold | Noto Sans SC SemiBold | 600 |
| Arimo | Instrument Sans | 400 |
| Source Sans 3 Medium | Instrument Sans Medium | 500 |
| Inter Bold | Instrument Sans SemiBold | 600 |

Choose the uploaded family itself; Canva may display `Semi-Bold` for the 600 face. Do not substitute a base-family bold style. The bridge deliberately sets bold only for its two 600 transport faces so the Canva mapping remains distinguishable. These bridge style flags are normalized after export.

Export both PDF and PPTX. Run the following checks and visually inspect all 17 PDF pages against the local native renders:

```text
python tools/review-pdf-fonts.py --source <canva-export.pdf> --report <font-audit.json>
python tools/review-pptx-export.py <canva-export.pptx> --reference build/v7-canva-fragments/candidate.pptx --strict-copy --summary
```

The PDF audit uses pdfplumber, verifies meaningful Chinese against Noto Sans SC and ASCII letters/digits against Instrument Sans, and reports named weights 400/500/600. It ignores punctuation and whitespace for script assignment. It cannot establish the intended weight of every string or replace visual review. The final fragmented v7 preview passed this audit on all 17 pages with all six faces present; this is a check of the reviewed export, not a guarantee about future Canva imports.

Canva exports Medium/Semi-Bold with `b=true` and hyphenated face aliases. Normalize those static-face references and replace Canva's embedded font payloads before finalizing the portable PPTX:

```text
python tools/normalize-canva-pptx-fonts.py --source <canva-export.pptx> --output build/v7-canva-fragments/canva-review/canva-normalized.pptx --report build/v7-canva-fragments/canva-review/font-normalization.json
python brand-assets/outrise-vi-v1/tools/embed-pptx-fonts.py --input build/v7-canva-fragments/canva-review/canva-normalized.pptx --output build/v7-canva-fragments/canva-review/canva-portable.pptx --receipt build/v7-canva-fragments/canva-review/font-embedding.json --require-windows-parser
```

The normalizer preserves namespace declarations and verifies a strict XML change whitelist. It changes only the approved `Semi-Bold` aliases, explicit bold flags for the six static faces, and old embedded-font package metadata/data. Visible runs and their resolvable paragraph properties receive `b=0`; unrelated template properties are left unchanged. Text and geometry signatures must match the original export. The intermediate normalized PPTX has no embedded fonts and must not be delivered. The second step embeds the complete approved fonts and preserves all 17 slide XML parts byte for byte. Keep both receipts and perform package/finalizer and rendering checks before promoting the result into `output/`.

## Reproduce the static instances

Use the bundled Python and install the pinned `tools/requirements-fonts.txt` into a private build directory with `pip --target`. Run `tools/prepare-static-fonts.py --fonttools-path <that directory>`. The script pins all variation axes at the official named weights and default widths, preserves the source fonts, and records checksums. Never install into the bundled runtime or the operating system.
