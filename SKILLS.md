# Outrise Skill 索引

本文件是唯一手工维护的技能总索引，源码统一位于 `skills/<skill-id>/`。按名称、中文用途或关键词搜索后，只读取命中的 `SKILL.md`，再按需读取其参考文件。安装、启用与同步命令见 [README.md](README.md)。

分类固定为：**通用、开发、营销、业务运营、工作区维护**。每项仅设一个主分类，跨领域用途通过关键词检索，不重复存放源码。当前没有条目的分类保留供后续使用。

<!-- skills-index:start -->
| ID | 分类 | 用途与关键词 | 入口 | 兼容性与前置条件 | 来源与版本 |
| --- | --- | --- | --- | --- | --- |
| lingxing-chrome-erp | 业务运营 | 领星 ERP、Chrome、报表导出、下载、周报素材、广告、商品、采购、库存、财务 | [SKILL.md](skills/lingxing-chrome-erp/SKILL.md) | Codex / Claude Code：需各自可用的 Chrome 浏览器控制工具和本人已登录且有权限的领星账号；Claude Code 尚未完成实际运行验证 | 仓库已有技能，保留原样；[源码版本 2811461](https://github.com/Outrise-development/outrise-ontology/tree/281146112538a49655894cea8429380ff1654ec4/skills/lingxing-chrome-erp)；未附独立许可证，不据此推定第三方再分发许可 |
| ppt-master | 通用 | PPT、PPTX、演示文稿、幻灯片、可编辑 PowerPoint、模板、动画、旁白、品牌样式 | [SKILL.md](skills/ppt-master/SKILL.md) | Codex / Claude Code：首次实际使用需 Python 3 与 uv，在各原生副本中建立本地 `.venv`；PDF 转换可选依赖 PyMuPDF（AGPL-3.0），图像生成和素材搜索按需配置账号或 API Key | 发现：[skills.sh 条目](https://www.skills.sh/xreal1ty/ppt-master/ppt-master)；源码：[XREAL1TY/ppt-master](https://github.com/XREAL1TY/ppt-master/tree/b032c310e7506be9c3bbd198dfbec8f11af18e1a) `b032c310`，版本 6.7.3，MIT；声明上游 [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master) |
<!-- skills-index:end -->

新增或更新条目时，记录可追溯的来源链接和版本／提交号，保留原许可证；如有工具、账号或 Agent 限制，在兼容性列说明。只收录明确要求安装的技能，不自动导入现有个人技能或插件技能。
