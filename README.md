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

从 [SKILLS.md](SKILLS.md) 按分类、名称或用途检索。源码平铺在 `skills/<skill-id>/`，每个目录包含标准 `SKILL.md` 及所需参考资料、脚本和资源。总索引是唯一手工维护的目录，不维护第二份分类数据库。

Agent 按“搜索索引 → 读取命中技能 → 按需读取参考文件”工作；指定技能 ID 时直接定位。`AGENTS.md` 和 `CLAUDE.md` 只提供检索入口，减少启动时的上下文占用。

已有 [领星 ERP 技能](skills/lingxing-chrome-erp/SKILL.md) 和 [历史 ZIP 包](packages/lingxing-chrome-erp.zip) 保留原样。后续仅安装明确要求的新技能，不自动导入个人技能或插件缓存；不新增 ZIP 分发流程。

## 工作区启用

管理脚本需要 Python 3.10+，本身无第三方运行依赖；具体技能可能有独立依赖。在仓库根目录运行：

```sh
python scripts/skills.py list
python scripts/skills.py list --query 领星
python scripts/skills.py list --category 业务运营
python scripts/skills.py select --skill lingxing-chrome-erp
python scripts/skills.py sync --dry-run
python scripts/skills.py sync
python scripts/skills.py check --installed
python scripts/skills.py sync --global-codex
python scripts/skills.py check --installed --global-codex
```

`skills.enabled.json` 只记录明确选中的 ID，初始为空。`select` 默认追加，可重复使用 `--skill` 或 `--category`；按分类选择会展开为当时的 ID 清单，以后新增的技能不会自动启用。

```sh
python scripts/skills.py select --category 开发 --category 营销
python scripts/skills.py select --remove --skill lingxing-chrome-erp
python scripts/skills.py select --clear
```

选择变更后运行 `sync`。它将选中技能复制到 `.agents/skills/`（Codex）和 `.claude/skills/`（Claude Code），并用本地 `.skills-state.json` 记录托管状态；这些生成文件不提交 Git。再次同步会更新源码变更、移除已取消选择且未被修改的托管副本。遇到同名未托管技能或本地修改时报告冲突，先保留和处理这些改动再同步，不覆盖其他技能。

### Codex 全局安装

在本对话中明确安装的新 Skill，完成当前工作区同步后还必须显式运行 `python scripts/skills.py sync --global-codex`，使其在本机其他 Codex 工作区可发现。普通 `sync` 只处理当前工作区，不会隐式修改全局环境；全局安装检查使用 `python scripts/skills.py check --installed --global-codex`。

全局同步只展开当前工作区 `skills.enabled.json` 中明确选择的 ID，因此中央库存新增不会自动进入全局环境。全局目录、托管状态和生成副本都是本机运行数据，不提交 Git，也不写入个人路径、账号或凭据；遇到同名未托管 Skill 或本地修改时会保留现场并停止，不覆盖其他全局 Skill。

中断或回滚失败后，如报告保留的恢复目录，先恢复原文件，再清理该目录；不要提前删除恢复副本。

克隆仓库后无需同步即可通过索引读取技能。原生发现需要先同步；Agent 未即时发现时，重新加载或重启对应会话。技能目录可被两种 Agent 发现，不代表所需工具已配置；工具、CLI、浏览器连接和账号需各自准备，实际兼容情况见索引。

已通过临时技能在 Codex CLI `0.163.0-alpha.11.2` 中验证原生发现与显式调用，成功返回仅存在于技能正文中的标记。此验证未操作领星业务会话；Claude Code 尚未完成运行验证。

## 子工作区与独立仓库

每个子命令都接受 `--source` 和 `--workspace`：源码默认取脚本所在仓库，目标工作区默认取源码根目录。子工作区显式指定目标路径，维护自己的启用清单：

```sh
python scripts/skills.py select --workspace workspaces/marketing --category 营销
python scripts/skills.py sync --workspace workspaces/marketing
python scripts/skills.py check --workspace workspaces/marketing --installed
```

子工作区清单不是隔离边界：Agent 可能继承父目录已启用的技能。根工作区只启用真正共用的技能，开发、营销等专用技能放到对应子工作区选择；不要在根目录一次启用全部库存。

拆成独立仓库后，先检出中央仓库的明确提交或标签，再以该检出目录作为 `--source`；本工具不下载或自动更新远程来源。例如在已检出的中央仓库目录运行：

```sh
python scripts/skills.py select --source . --workspace ../outrise-marketing --skill lingxing-chrome-erp
python scripts/skills.py sync --source . --workspace ../outrise-marketing
```

工作区启用清单可提交到其所属仓库；外部工作区须将 `.agents/skills/`、`.claude/skills/` 和 `.skills-state.json` 加入自己的 Git 忽略规则。本仓库的忽略规则已覆盖仓库内子工作区。

## 新技能搜索来源

[skills.sh](https://www.skills.sh/) 是 Outrise 搜索新 Skill 的第一主要来源。用户要求寻找或推荐某类技能时，先在该站按需求关键词检索，再查看候选详情及其链接的上游源码；无合适结果或站点不可用时，说明情况后补充官方仓库、GitHub 等来源。

推荐时提供来源链接、用途和必要依赖；来自 skills.sh 的候选附上条目链接。确定安装后，在总索引的“来源与版本”列记录发现来源及实际源码版本，继续使用本仓库的收录与同步流程。搜索或推荐本身不触发安装；已有技能的调用继续通过本地索引定位。

## 安装与维护流程

1. 获取用户明确指定的完整技能，检查名称冲突、相对路径、工具依赖和适用许可证；保留来源与版本，账号和凭据自行配置。
2. 将唯一源码保存到 `skills/<skill-id>/`，更新 `SKILLS.md`；新技能默认加入当前工作区启用清单，再同步工作区原生副本，并显式运行 `python scripts/skills.py sync --global-codex`。不要直接维护生成副本。
3. 运行 `python scripts/skills.py check`；同步后运行 `python scripts/skills.py check --installed` 和 `python scripts/skills.py check --installed --global-codex`。涉及脚本变更时运行 `python -m unittest discover -s tests`，并在可用 Agent 环境中验证发现和代表性调用，明确标注未完成的验证。
4. 检查改动仅含本次授权内容，不包含凭据、个人路径或插件缓存；提交并推送到指定 GitHub 仓库，核实远端提交后再报告同步完成。

### 技能运行环境

`ppt-master` 的 Python 依赖在首次实际使用时安装，本次收录不安装依赖。准备好 `uv`，进入当前 Agent 的生成副本 `.agents/skills/ppt-master/` 或 `.claude/skills/ppt-master/` 后执行：

```sh
uv venv .venv
uv pip install -r requirements.txt
```

后续脚本使用该环境的 Python，Windows 路径为 `.venv/Scripts/python.exe`。同步校验仅将生成副本中的 `.venv` 和 Python `__pycache__` 视为可忽略的本地运行状态；源码更新或取消启用可能替换或移除它，需要时重新安装。中央技能源码不得包含这些运行时目录，密钥不得写入技能源码或仓库内的 `.env`。

PDF 源文件转换使用可选依赖 PyMuPDF。上游 [requirements.txt](skills/ppt-master/requirements.txt) 标注其为 AGPL-3.0，并提供商业许可选项；不转换 PDF 源时可跳过该依赖，连同依赖再分发前需核对相应条款。`ppt-master` 自身为 MIT，来源与固定版本见总索引。
