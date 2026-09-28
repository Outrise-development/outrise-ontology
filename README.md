# Outrise Ontology

本项目用于构建 Outrise 公司的 ontology（本体）与 agentic system（智能体系统）。

## 代码仓库

[Outrise-development/outrise-ontology](https://github.com/Outrise-development/outrise-ontology.git)

所有代码产出统一提交并推送到此仓库，相关模型、文档与配置一并进行版本管理。密钥、令牌和其他凭据不得提交到仓库。

## 项目约定

- 以已确认的业务需求和资料为依据，逐步定义 Outrise 的业务概念、实体、关系及智能体工作流程。
- 具体业务范围、数据模型与技术架构随后续需求确定；尚未确认的信息须明确标注。
- 在本项目中工作的智能体遵循 [AGENTS.md](AGENTS.md)。

## 可复用技能

- [领星 ERP 浏览器技能](skills/lingxing-chrome-erp/SKILL.md)：在 Chrome 中导出领星报表、准备周报素材和处理相关业务操作。
- [下载完整 ZIP 包](packages/lingxing-chrome-erp.zip)：解压后将 `lingxing-chrome-erp` 文件夹放入 Codex 技能目录 `~/.codex/skills/`。
