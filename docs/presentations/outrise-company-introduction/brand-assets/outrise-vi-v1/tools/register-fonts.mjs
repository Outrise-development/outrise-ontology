/** Register approved full-character fonts only in the current Node/Skia process. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const bundleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FONT_FACES = Object.freeze({
  latin: Object.freeze({400: 'Instrument Sans', 500: 'Instrument Sans Medium', 600: 'Instrument Sans SemiBold'}),
  chinese: Object.freeze({400: 'Noto Sans SC', 500: 'Noto Sans SC Medium', 600: 'Noto Sans SC SemiBold'}),
});

/** Public artifact TextStyle has bold, not numeric weight. Select the named face. */
export function fontFace(script, weight = 400) {
  const face = FONT_FACES[script]?.[weight];
  if (!face) throw new Error(`Unsupported Outrise font selection: ${script} ${weight}`);
  return face;
}

export function registerOutriseFonts(nodeModules = process.env.CODEX_PRESENTATION_NODE_MODULES || process.env.RUNTIME_NODE_MODULES) {
  if (!nodeModules) throw new Error('Supply the bundled Node node_modules directory when registering Outrise fonts.');
  const skia = require(path.join(nodeModules, '@oai/artifact-tool/node_modules/skia-canvas'));
  const styles = {400: 'Regular', 500: 'Medium', 600: 'SemiBold'};
  const registered = [];
  for (const [script, stem] of [['latin', 'InstrumentSans'], ['chinese', 'NotoSansSC']]) {
    for (const weight of [400, 500, 600]) {
      const family = fontFace(script, weight);
      const file = path.join(bundleDir, 'fonts', 'static', `${stem}-${styles[weight]}.ttf`);
      if (!fs.existsSync(file)) throw new Error(`Missing approved font file: ${file}`);
      skia.FontLibrary.use(family, file);
      const details = skia.FontLibrary.family(family);
      if (!skia.FontLibrary.has(family) || !details?.weights?.includes(weight)) {
        throw new Error(`Approved font did not register with its exact weight: ${family} ${weight}`);
      }
      registered.push({script, weight, family, file, details});
    }
  }
  return {Canvas: skia.Canvas, FontLibrary: skia.FontLibrary, registered};
}
