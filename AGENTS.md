# Project Agent Instructions

## Project purpose and repository

- This project builds the ontology and agentic system for Outrise.
- The designated repository is https://github.com/Outrise-development/outrise-ontology.git.
- Commit and push all code deliverables to this repository, together with related models, documentation, and non-secret configuration.
- Before committing, review the changes and run checks appropriate to the change. Preserve unrelated work.
- Verify that a push succeeded before reporting that work is synchronized. If it fails, report the blocker and retain the local work.
- Derive business concepts and system behavior from confirmed requirements and sources. Clearly label assumptions and unresolved questions.
- Never commit credentials, access tokens, or secrets.

# Global Agent Instructions

## Feishu China CLI

- Use the Feishu China profile `codex-feishu-cn` (`brand=feishu`, `open.feishu.cn`) for this user's Feishu work. Never mix it with a Lark International profile, OAuth URL, scope, or credential.
- Keep the App Secret and user tokens in Windows Credential Manager. Never copy them into repositories, plaintext files, terminal output, or environment variables.
- Any `lark-cli` command that needs an App Secret, user token, or network access must run with host credential access / the appropriate Codex sandbox approval.
- A sandbox-only result such as `no token in keychain`, `user identity: missing`, or `bot secret missing` is expected when Windows Credential Manager is isolated. It is not authoritative and must never trigger OAuth; re-run with host credential access.
- Before any `lark-cli auth login`, run `lark-cli auth status --json --verify --profile codex-feishu-cn` with host credential access. Reuse a ready/valid or refreshable user login. Only create a new OAuth URL/QR when host-level status confirms missing/expired/revoked credentials, or an exact `auth check --scope` confirms a missing scope.
- Never use `auth login` as a connectivity test. For user resources, use `--as user`; for app-owned resources, use `--as bot`.
- Let lark-cli auto-refresh an expired access token while the refresh token remains valid by running the intended command with host credential access; do not ask the user to re-authorize solely because the two-hour access-token window elapsed.
