# MVP validation — 2026-11-01

Validated locally on Windows with Node.js 22.12 and Microsoft Edge. Browser tests use isolated temporary workspaces, not the live `.local/workspace`.

| Check | Result |
| --- | --- |
| `npm test` | 20 passed, zero failures |
| `npm run build` | Production build passed |
| `npm run test:e2e` | 8 browser scenarios passed, zero failures |
| `node cli/index.js validate --workspace demo` | 34 canonical MD documents, zero diagnostics |

The regression suite covers source-preserving Markdown edits, BOM/CRLF/emoji, unknown content, inheritance/overrides/reset, live templates and unplaced blocks, gallery references, CAS conflicts, source policies, immutable confirmations, source freshness, stale proposals, policy changes after generation, uploads, loopback restrictions and concurrent API/CLI stores.

The browser suite verifies field persistence and unsaved navigation, comparison before conflict retry, all three channel editors and explicitly unvalidated exports, attachment upload, immediate Milkdown save and block ordering/deletion, candidate comparison/adoption/confirmation followed by source changes, new product/Listing creation, and live MD template/UI copy reloads.

An independent review found stale-candidate adoption and candidate-policy bypasses; both are fixed server-side with regression cases. Approval fingerprints exclude positional IDs of preserved ordinary Markdown. Immediate text save reads the live editor state rather than waiting for the debounced Markdown notification.

The API tests require loopback access; a sandbox-only run can report `EACCES`. The recorded passing run used host localhost access. The production build emits an advisory for large editor/UI chunks; the editor is loaded only when a prose block is edited.

No real model calls, platform publication, cloud deployment or production product data were used. CI runs the file/API suite, build and the same browser suite with Playwright Chromium; this local validation does not assert that a remote CI run has completed.
