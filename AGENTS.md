# Project Agent Instructions

## Project purpose and repository

- This project builds the ontology and agentic system for Outrise.
- The designated repository is https://github.com/Outrise-development/outrise-ontology.git.
- Commit and push all code deliverables to this repository, together with related models, documentation, and non-secret configuration.
- Before committing, review the changes and run checks appropriate to the change. Preserve unrelated work.
- Verify that a push succeeded before reporting that work is synchronized. If it fails, report the blocker and retain the local work.
- Derive business concepts and system behavior from confirmed requirements and sources. Clearly label assumptions and unresolved questions.
- Never commit credentials, access tokens, or secrets.

## Skill 检索与安装

- 技能唯一源码为 `skills/<skill-id>/`；总索引见 [SKILLS.md](SKILLS.md)，操作说明见 [README.md](README.md)。不要在启动时加载完整索引或全部技能。
- 用户指定技能 ID 时直接读取对应 `SKILL.md`；其他任务先按用途或分类搜索总索引，再读取命中技能及必要参考文件。
- 只导入用户明确要求安装的技能，不自动收集个人技能或插件缓存。安装时保留来源、版本、许可证和完整依赖资源，更新总索引及当前工作区启用清单，校验后提交并推送。
- `skills.enabled.json` 记录当前工作区明确启用的 ID；以后新安装技能默认加入该工作区。生成的原生技能副本只通过同步脚本更新，不作为维护源。
- 子工作区使用各自清单；根目录只启用共用技能，注意 Agent 对父目录技能的继承。具体命令见 README，凭据及个人环境配置不得入库。

# Global Agent Instructions

## Feishu China CLI

- Use the Feishu China profile `codex-feishu-cn` (`brand=feishu`, `open.feishu.cn`) for this user's Feishu work. Never mix it with a Lark International profile, OAuth URL, scope, or credential.
- Keep the App Secret and user tokens in Windows Credential Manager. Never copy them into repositories, plaintext files, terminal output, or environment variables.
- Any `lark-cli` command that needs an App Secret, user token, or network access must run with host credential access / the appropriate Codex sandbox approval.
- A sandbox-only result such as `no token in keychain`, `user identity: missing`, or `bot secret missing` is expected when Windows Credential Manager is isolated. It is not authoritative and must never trigger OAuth; re-run with host credential access.
- Before any `lark-cli auth login`, run `lark-cli auth status --json --verify --profile codex-feishu-cn` with host credential access. Reuse a ready/valid or refreshable user login. Only create a new OAuth URL/QR when host-level status confirms missing/expired/revoked credentials, or an exact `auth check --scope` confirms a missing scope.
- Never use `auth login` as a connectivity test. For user resources, use `--as user`; for app-owned resources, use `--as bot`.
- Let lark-cli auto-refresh an expired access token while the refresh token remains valid by running the intended command with host credential access; do not ask the user to re-authorize solely because the two-hour access-token window elapsed.
