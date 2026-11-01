# Product Console agent guide

- Read `README.md`, then `docs/markdown-protocol.md` and the relevant schema/template in the selected workspace. Business text, UI messages, schemas and block definitions are maintained in MD, not React literals or a parallel JSON database.
- `demo/` is a fictional, versioned fixture. The default live workspace is `.local/workspace/`, excluded from Git. Do not treat demo facts as verified real product information.
- Use `npm run --silent agent -- read <id>` and `context <listing-id>` to obtain current Markdown, raw revisions and input evidence. Preserve IDs and unknown content.
- Use CLI `patch` for controlled changes or `write <id> --file changed.md --revision <revision>` for an existing raw document. These acquire the same workspace lease and compare-and-swap check as the API. Do not overwrite live files with an unchecked shell write while the Console is editing them.
- A missing SKU field inherits its SPU value. Restore inheritance with `unset`; do not use null as an inheritance marker. Only override fields allowed by the schema.
- Return generated Listing content as a proposal. Carry `inputs` and `base_listing_revision` from the context; do not self-confirm, invent unsupported facts, set unknown prices/inventory to zero, or bypass source/region policies.
- Shared templates are live. Keep region IDs stable; removed or incompatible local blocks must survive in the unplaced area. UI/schema/policy editing is through MD/CLI, not a visual schema designer.
- Run `npm test`, `npm run build` and the relevant browser acceptance tests after behavior changes. `npm run test:e2e` uses installed Edge by default; `PLAYWRIGHT_CHANNEL=chromium` selects a separately installed Playwright Chromium.
- Platform connectors are extension contracts only. Internal MD/JSON exports are not official API publication payloads. No credentials or real external publication belong in this MVP.
