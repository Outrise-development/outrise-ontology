---
format: outrise/1
id: ui_zh_cn
kind: ui
name: 简体中文界面文案
locale: zh-CN
messages:
  dialogs.conflict_title: 比较文件更新与本次修改
  dialogs.conflict_body: 左侧是磁盘上的最新资料，右侧是仅应用本次字段修改后的结果。检查差异后可保存；取消会保留尚未保存的内容。
  actions.save_compared: 按比较结果保存
  history.latest: 磁盘最新版本
  history.proposed: 应用本次修改后
  errors.INVALID_ASSET_REFERENCE: 图库引用的素材不存在、已归档或类型不正确。
  errors.DUPLICATE_ASSET_REFERENCE: 图库中不能重复引用同一份素材。
  fields.unit: 单位
  proposals.base_revision: 生成时的 Listing 版本
  proposals.inputs: 生成时的输入依据
  proposals.provenance_hint: 请填写 Agent 生成时的基准版本和输入依据，避免使用当前版本冒充生成依据。
  proposals.base_missing: 建议缺少生成时的基准版本。请从原始上下文补充，或重新生成。
  blocks.no_assets: 暂无可展示的关联素材
  listing.channel_summary: 平台草稿概览
  platforms.amazon: Amazon
  platforms.shopify: Shopify
  platforms.tiktok: TikTok Shop
  fields.vendor: 品牌／供应方
  fields.product_type: 商品类型
  fields.category: 类目意向
  diagnostics.unknown_block: 未识别的块类型
  diagnostics.region_missing: 模板中没有对应区域
  diagnostics.block_type_disallowed: 此区域不允许该块类型
  diagnostics.region_capacity: 超出区域容量
  diagnostics.NO_TEMPLATE: 未指定页面模板
  diagnostics.unknown_content: 普通或未识别的源内容
  errors.NOT_FOUND: 记录或文件不存在。
  errors.INVALID_PARENT: 上级记录类型不正确。
  errors.PARENT_CYCLE: 产品层级存在循环引用。
  errors.INVALID_REFERENCE: 关联的记录无效。
  errors.DUPLICATE_LISTING: 此销售目标与 SPU 已有活动 Listing。
  errors.SKU_OUTSIDE_SPU: 所选 SKU 不属于当前 SPU。
  errors.LISTING_SKUS_REQUIRED: 至少选择一个 SKU。
  errors.INVALID_TARGET: 销售目标与平台不匹配。
  errors.DUPLICATE_SKU: SKU 选择不能重复。
  errors.NAME_REQUIRED: 请填写名称。
  errors.UNKNOWN_FIELD: 字段未在当前定义中登记。
  errors.FIELD_NOT_OVERRIDABLE: 此属性不能由 SKU 覆盖。
  errors.FIELD_READONLY: 此字段为只读。
  errors.SOURCE_READONLY: 来源策略不允许此操作。
  errors.SYSTEM_DOCUMENT_READONLY: 系统定义由 Markdown 源维护。
  errors.FIELD_NOT_NULLABLE: 此字段不能设为空值。
  errors.INVALID_FIELD_TYPE: 字段值的类型不正确。
  errors.SPU_FIELD_ONLY: 此字段只能维护在 SPU。
  errors.SKU_FIELD_ONLY: 此字段只能维护在 SKU。
  errors.REQUIRED_FIELD: 确认前请补齐必填字段。
  errors.INVALID_SCHEMA: 字段定义引用无效。
  errors.INVALID_TEMPLATE: 模板或其父级配置无效。
  errors.INVALID_POLICY: 来源策略引用无效。
  errors.INVALID_PLATFORM: 不支持此平台。
  errors.INVALID_ID: 记录 ID 格式不正确。
  errors.DUPLICATE_DOCUMENT_ID: 存在重复的记录 ID。
  errors.SOURCE_INVALID: 源文件存在错误，请先修正源内容。
  errors.REGION_ADD_DENIED: 此区域不允许添加内容块。
  errors.REGION_DELETE_DENIED: 此区域不允许删除内容块。
  errors.REGION_MOVE_DENIED: 此区域不允许移动内容块。
  errors.BLOCK_TYPE_NOT_ALLOWED: 此区域不允许该块类型。
  errors.FIXED_BLOCK: 固定模块不能删除或移动。
  errors.BLOCK_NOT_FOUND: 内容块不存在。
  errors.BLOCK_CONTENT_READONLY: 此块正文不允许修改。
  errors.DUPLICATE_BLOCK_ID: 内容块 ID 重复。
  errors.INVALID_MOVE_TARGET: 内容块移动目标无效。
  errors.NO_TEMPLATE: 记录尚未指定模板。
  errors.STALE_LISTING: 生成依据已变化，请先更新并复核。
  errors.UNCONFIRMED_SOURCE: 请先人工确认所用事实和策略。
  errors.AGENT_CANNOT_CONFIRM: Agent 不能代替人工确认。
  errors.AGENT_CANNOT_ADOPT: 建议须由人工审阅采纳。
  errors.PROPOSAL_TARGET_MISMATCH: 建议不属于当前 Listing。
  errors.PROPOSAL_BASE_CHANGED: 建议基准版本已变化，请重新生成。
  errors.INVALID_PROPOSAL: 建议格式无效。
  errors.MEDIA_MISSING: 素材文件不存在。
  errors.ASSET_MEDIA_REQUIRED: 素材记录缺少文件引用。
  errors.INVALID_PATH: 文件路径超出允许范围。
  errors.SYMLINK_DENIED: 不允许通过符号链接访问文件。
  errors.WORKSPACE_LOCKED: 工作区正在写入，请稍后重试。
  errors.NOT_A_LISTING: 此操作只适用于 Listing。
  errors.METADATA_READONLY: 此元数据不能通过业务界面修改。
  errors.UNKNOWN_OPERATION: 不支持此操作。
  errors.INVALID_EXPORT_FORMAT: 不支持此导出格式。
  errors.FILE_REQUIRED: 请选择文件。
  errors.EMPTY_FILE: 文件内容为空。
  errors.LIMIT_FILE_SIZE: 文件超过本地上传大小限制。
  errors.INVALID_SCOPES: 素材关联范围格式不正确。
  errors.INVALID_JSON: 请求不是有效的 JSON。
  errors.JSON_REQUIRED: 此请求需要 JSON 格式。
  errors.INTERNAL_ERROR: 本地服务暂时无法完成操作。
  errors.ORIGIN_DENIED: 此页面来源不允许访问本地服务。
  errors.LOOPBACK_ONLY: 此服务仅允许本机访问。
  errors.INVALID_HOST: 不允许此主机地址。
  errors.INPUTS_NOT_CAPTURED: 尚未记录生成依据。
  errors.SOURCE_CHANGED: 生成依据中的内容已变化。
  errors.MEDIA_CHANGED: 生成依据中的素材文件已变化。
  errors.LISTING_SCOPE_CHANGED: Listing 的产品范围或目标已变化。
  errors.SOURCE_SELECTION_CHANGED: Listing 选择的依据已变化。
  agent.context.title: Listing generation context
  agent.context.current_listing: Current listing
  agent.context.working_agreement: Working agreement
  agent.context.effective_fields: Effective SKU fields and sources
  agent.context.instructions: Create a local content draft only. Use the supplied facts, selected strategies, and media. Omit unsupported claims and identify missing information. Do not confirm or overwrite the current listing. Return canonical outrise/1 Markdown for the same listing ID and preserve the supplied inputs manifest. Submit it as a proposal for human review. Local validation is not official marketplace publication approval.
  agent.context.source: Source
  agent.context.platform: Platform
  agent.context.target: Sales target
  agent.context.review: Human review state
  agent.context.business_hash: Business content hash
  export.warning: Outrise internal content draft. Official platform publication validation has not been performed. No store synchronization has occurred.
  states.awaiting: 待确认
  fields.description: 说明
  app.name: Outrise 产品工作台
  app.subtitle: 产品事实、营销策略、素材与平台草稿
  app.local: 本地运行
  app.workspace: 工作区
  app.connection_live: 已连接本地服务
  app.connection_offline: 本地服务未连接
  app.loading: 正在加载工作区
  app.no_selection: 选择一条记录开始管理
  app.empty_catalog: 暂无产品，先创建品牌
  app.unsaved: 有未保存的修改
  app.remote_changed: 源文件已更新，请重新加载后编辑
  app.saved: 已保存
  app.confirmed: 已确认当前版本
  app.archived: 已归档
  app.created: 已创建
  app.uploaded: 已上传
  app.copied: 已复制
  app.adopted: 已采纳建议
  navigation.catalog: 产品目录
  navigation.search: 搜索名称或编码
  navigation.show_archived: 显示归档记录
  navigation.products: 产品
  navigation.parent: 所属上级
  navigation.breadcrumb: 当前位置
  navigation.open: 打开
  navigation.settings: 工作区设置
  navigation.overview: 概览
  kinds.brand: 品牌
  kinds.line: 产品线
  kinds.product_line: 产品线
  kinds.spu: SPU
  kinds.sku: SKU
  kinds.strategy: 营销策略
  kinds.asset: 素材
  kinds.listing: 平台 Listing
  actions.create: 新建
  actions.new_product: 新建产品记录
  actions.new_strategy: 新建策略
  actions.new_listing: 新建 Listing 草稿
  actions.save: 保存
  actions.cancel: 取消
  actions.close: 关闭
  actions.confirm: 确认当前版本
  actions.archive: 归档
  actions.edit: 编辑
  actions.reload: 重新加载
  actions.discard: 放弃修改
  actions.copy: 复制
  actions.download: 下载
  actions.upload: 上传素材
  actions.delete: 删除
  actions.move_up: 上移
  actions.move_down: 下移
  actions.add_block: 添加内容块
  actions.override: 设置单独属性
  actions.restore: 恢复继承
  actions.jump_source: 打开来源
  actions.prepare_context: 准备 Agent 上下文
  actions.import_proposal: 导入 Agent 建议
  actions.adopt: 采纳建议
  actions.export_md: 导出 Markdown
  actions.export_json: 导出 JSON 快照
  actions.capture_inputs: 记录输入版本
  actions.inspect: 查看来源与版本
  actions.retry: 重试
  actions.clear: 清空
  actions.apply: 应用
  tabs.facts: 产品事实
  tabs.strategies: 营销策略
  tabs.assets: 素材
  tabs.listings: Listing
  tabs.content: 内容
  tabs.inputs: 生成依据
  tabs.variants: SKU 内容
  tabs.media: 媒体排序
  tabs.context: Agent 上下文
  tabs.proposals: Agent 建议
  fields.name: 名称
  fields.kind: 记录类型
  fields.parent: 上级记录
  fields.scopes: 关联范围
  fields.value: 值
  fields.inherited: 继承自 SPU
  fields.local: 本记录属性
  fields.override: SKU 覆盖值
  fields.pending_restore: 保存后恢复继承
  fields.required: 必填
  fields.no_fields: 暂无可显示字段
  fields.source: 来源
  fields.entity_id: 记录 ID
  fields.template: 页面模板
  fields.schema: 字段定义
  fields.tags: 标签
  fields.unspecified: 未填写
  fields.json_invalid: 请输入有效的 JSON 值
  fields.attributes: 产品属性
  fields.additional: 其他字段
  blocks.notes: 补充内容
  blocks.empty: 暂无内容块
  blocks.readonly: 只读内容
  blocks.unplaced: 暂未放置的内容
  blocks.unplaced_description: 模板或区域变化后保留在这里的内容，原始数据不会丢失。
  blocks.unknown: 未识别的内容块
  blocks.title: 块标题
  blocks.type: 块类型
  blocks.region: 内容区域
  blocks.richtext: 富文本
  blocks.gallery: 图片集
  blocks.body: 内容正文
  blocks.delete_confirm: 删除此内容块？
  blocks.add_title: 添加内容块
  blocks.source: 块来源
  strategies.title: 适用的营销策略
  strategies.empty: 暂无关联策略
  strategies.select: 选择策略
  strategies.scope_hint: 策略可关联品牌、产品线、SPU 或 SKU；Listing 使用显式选择的策略。
  strategies.body: 策略正文
  assets.title: 产品素材
  assets.empty: 暂无关联素材
  assets.upload_hint: 选择图片、视频或文件并填写适用范围。
  assets.file: 素材文件
  assets.associations: 关联产品
  assets.metadata: 素材信息
  assets.original_name: 原始文件名
  assets.size: 文件大小
  assets.mime: 文件类型
  assets.hash: 内容校验值
  assets.preview: 预览
  assets.no_preview: 此文件暂不支持内嵌预览，可下载查看。
  assets.upload_title: 上传与关联素材
  listing.title: 平台 Listing 草稿
  listing.empty: 暂无 Listing 草稿
  listing.platform: 平台
  listing.target: 销售目标
  listing.spu: 所属 SPU
  listing.skus: 包含的 SKU
  listing.strategies: 采用的策略
  listing.assets: 采用的素材
  listing.inputs_hint: 生成依据记录事实、策略与素材的版本；输入变化后会提醒复核。
  listing.stale: 生成依据已变化，需要复核
  listing.current: 生成依据与当前记录一致
  listing.prepared_context: 已准备的 Agent 上下文
  listing.context_hint: 将上下文交给 Codex 或 Claude，生成 Markdown 建议后导入此处审阅。
  listing.proposal_hint: 建议导入后只显示差异；采纳前不会覆盖当前草稿。
  listing.variant: SKU 内容覆盖
  listing.override_hint: 只填写此 SKU 与共享 Listing 不同的内容。
  listing.media_hint: 此顺序用于草稿展示与导出，可上下调整。
  listing.no_variant: 暂无 SKU 内容覆盖
  listing.pending_validation: 尚未执行官方发布校验
  listing.internal_draft: 内部内容草稿
  listing.generate_context_first: 先准备上下文，再让 Agent 生成建议。
  listing.input_versions: 输入版本
  inspector.title: 来源与版本
  inspector.source: 内容来源
  inspector.history: 版本历史
  inspector.diagnostics: 检查结果
  inspector.references: 关联引用
  inspector.version: 当前版本
  inspector.raw: Markdown 源文件
  inspector.no_diagnostics: 未发现阻塞问题
  inspector.no_history: 暂无历史快照
  inspector.current: 当前内容
  inspector.confirmed_at: 确认时间
  inspector.confirmation: 确认记录
  inspector.last_confirmed: 最近确认的版本
  inspector.status: 状态
  inspector.layout: 页面组成
  inspector.unknown_source: 来源暂不可用
  history.compare: 比较版本
  history.before: 修改前
  history.after: 修改后
  history.select: 选择历史版本
  history.no_changes: 内容没有变化
  history.snapshot: 历史快照
  history.diff: 内容差异
  proposals.empty: 暂无待审阅建议
  proposals.raw: 建议 Markdown
  proposals.before: 当前内容
  proposals.after: 建议内容
  proposals.base_changed: 建议的基准版本已变化，请重新生成。
  proposals.ready: 可以审阅采纳
  proposals.review: 审阅建议
  proposals.import_title: 导入 Agent Markdown 建议
  states.waiting: 等待处理
  states.pending: 待确认
  states.draft: 草稿
  states.confirmed: 已确认
  states.archived: 已归档
  states.valid: 检查通过
  states.invalid: 检查未通过
  states.changed: 已修改
  states.stale: 需要复核
  dialogs.unsaved_title: 离开前处理未保存的修改
  dialogs.unsaved_body: 当前记录有未保存内容。继续离开将放弃这些修改。
  dialogs.archive_title: 归档这条记录？
  dialogs.archive_body: 归档记录会从默认目录隐藏，历史内容仍保留。
  dialogs.confirm_title: 确认当前内容？
  dialogs.confirm_body: 确认表示你已审阅当前版本。后续修改会重新进入待确认状态。
  dialogs.create_title: 新建记录
  dialogs.edit_title: 编辑记录
  dialogs.required: 请填写此项
  dialogs.delete_title: 删除内容块？
  dialogs.confirmation_note: 确认由人工操作完成，Agent 不能代替你确认。
  errors.NETWORK_ERROR: 无法连接本地服务。
  errors.CONFLICT: 源文件已变化，请刷新后重试。
  errors.REVISION_CONFLICT: 当前版本已过期，请重新加载。
  errors.REQUIRED: 请填写必填内容。
  errors.SAVE_FAILED: 保存失败，请检查提示后重试。
  errors.PARSE_ERROR: Markdown 格式无法解析，请检查源文件。
  errors.INVALID_FIELDS: 字段格式不符合定义。
  errors.UNKNOWN_ERROR: 操作未完成，请查看检查结果。
  errors.clipboard: 无法访问剪贴板，可手动复制。
  errors.read_file: 无法读取所选文件。
  errors.no_file: 请先选择一个文件。
  ui.select: 请选择
  ui.search: 搜索
  ui.empty: 暂无数据
  ui.yes: 是
  ui.no: 否
  ui.ok: 确定
  ui.items: 项
  ui.optional: 选填
  ui.expand: 展开
  ui.collapse: 收起
  ui.pagination_previous: 上一页
  ui.pagination_next: 下一页
  ui.pagination_page: 页
  ui.pagination_jump: 跳至
  ui.upload_remove: 移除文件
  ui.upload_preview: 预览文件
  ui.upload_download: 下载文件
  blocks.content: 正文
  blocks.description: 商品描述
  tabs.history: 版本历史
  navigation.strategies: 营销策略
  navigation.assets: 素材库
  navigation.listings: 平台 Listing
  fields.brand: 品牌
  fields.model: 型号
  fields.material: 材质
  fields.weight: 重量
  fields.volume: 容量
  fields.dimensions: 尺寸
  fields.water_resistant: 防泼水
  fields.features: 特性
  fields.sku_code: SKU 编码
  fields.color: 颜色
  fields.objective: 目标
  fields.audience: 目标受众
  fields.positioning: 定位
  fields.key_messages: 核心表达
  fields.channels: 渠道
  fields.alt: 替代文本
  fields.role: 用途
  fields.rights: 素材来源与权利说明
  fields.synthetic: 合成演示素材
  fields.title: 标题
  fields.bullet_points: 卖点
  fields.search_terms: 搜索词
  fields.seo_title: SEO 标题
  fields.seo_description: SEO 描述
  workbench.overview: 总览
  workbench.facts: 产品资料
  workbench.strategies: 卖点与定位
  workbench.assets: 素材与制作
  workbench.listings: 平台方案
  workbench.edit_section: 编辑本节
  workbench.no_sections: 此模板尚未配置可用页面分区
  workbench.brand_selector: 当前品牌
  workbench.all_brands: 所有品牌
  workbench.visible: 显示
  workbench.order: 显示顺序
  workbench.adjust_page: 调整页面
  workbench.page_settings: 页面结构与公共模板
  workbench.this_page: 调整本页
  workbench.shared_template: 维护公共模板
  workbench.layout_hint: 仅调整本页获准的显示与顺序。未覆盖的部分继续跟随公共模板；锁定项需要到授权的上游模板维护。
  workbench.sections: 页面分区
  workbench.slots: 页面模块
  workbench.reset_layout: 恢复模板布局
  workbench.template_live: 公共模板校验通过后立即作用于关联页面。产品事实与确认记录不会因此改变。
  workbench.template_layer: 选择维护的模板层级
  workbench.template_scope_hint: 编辑的是选中的公共模板。保存前可以查看影响范围；服务端也会在保存时重新校验。
  workbench.can_add: 允许新增内容块
  workbench.can_delete: 允许删除内容块
  workbench.can_move: 允许移动内容块
  workbench.edit_template_md: 高级：编辑模板 Markdown
  workbench.preview_impact: 预览影响范围
  workbench.save_template: 保存并立即生效
  workbench.affected_pages: 受影响页面
  workbench.suppressed: 未应用的局部调整
  workbench.template_history: 模板修订记录
  workbench.restore_template: 恢复为新修订
  workbench.no_template_history: 暂无模板修订记录
  workbench.source_changed: 依据已变化
  workbench.pending_proposals: 待审核候选
  workbench.no_product_image: 尚未关联产品图片
  workbench.positioning_missing: 尚未整理核心表达，可在卖点与定位中维护。
  workbench.view_details: 查看详情
  workbench.attention: 待处理事项
  workbench.sku_matrix: SKU 规格对比
  workbench.product_lines: 产品系列
  workbench.products: 系列产品
  workbench.core_points: 核心卖点
  workbench.core_points_missing: 尚未整理结构化核心卖点；已有策略原文仍可在卖点与定位中查阅。
  workbench.channel_status: 平台内容状态
  workbench.no_channels: 尚未建立平台草稿
  workbench.sku_details: 当前 SKU
  workbench.sku_matrix_hint: 共享值随 SPU 更新；独立值与覆盖值分别维护。点击 SKU 查看和编辑。
  workbench.new_sku: 新建 SKU
  workbench.no_skus: 尚未建立 SKU
  workbench.open_record: 打开来源记录
  workbench.advanced: 高级信息
  workbench.record_id: 记录 ID
  references.title: 依据与引用
  references.hint: 把事实、卖点、正文与素材关联起来；内部说明不会进入消费者文案。
  references.none: 尚未关联具体依据
  references.unavailable: 依据不可用
  references.document: 来源文档
  references.target: 引用位置
  references.field: 具体字段
  references.block: 内容块
  references.used_by: 用于本页的
  references.note: 内部依据说明
  references.add: 关联依据
  references.edit: 编辑依据关联
  references.internal_note: 关联只记录来源，不代表该来源已经人工确认。
  selling.title: 核心卖点与 FABE
  selling.hint: 从产品特点、优势和用户利益出发，明确每项表达的依据与优先顺序。
  selling.add: 新增卖点
  selling.empty: 尚未整理结构化卖点；原有策略正文仍保留在下方。
  selling.priority: 优先级
  selling.feature: 产品特点 · Feature
  selling.advantage: 特点优势 · Advantage
  selling.benefit: 用户利益 · Benefit
  selling.evidence: 证明依据 · Evidence
  selling.actions: 操作
  selling.details: 关联详细正文
  selling.edit: 编辑卖点
  selling.evidence_hint: 先在“依据与引用”中关联具体字段、照片或正文，再为卖点选择依据。长篇说明可写入关联正文块。
  briefs.title: 图片与内容制作方案
  briefs.hint: 说明要表达什么、使用哪些素材以及表达边界；成品文件在素材库维护。
  briefs.add: 新增制作方案
  briefs.empty: 暂无制作方案
  briefs.headline: 标题文案
  briefs.supporting: 辅助文案
  briefs.visual: 画面与动作
  briefs.materials: 素材与制作要求
  briefs.evidence: 事实依据
  briefs.boundaries: 执行与表达边界
  strategies.applicability: 策略适用范围
  assets.classification: 用途与制作分类
  assets.stage: 素材阶段
  assets.stage_all: 全部素材
  assets.stage_source: 原始素材
  assets.stage_plans: 制作方案
  assets.stage_final: 交付成品
  assets.stage_unclassified: 待分类
  assets.unclassified: 尚未分类
  assets.source_assets: 来源素材
  assets.description: 素材说明
  assets.used_in: 使用此素材的内容
  assets.unused: 尚未记录使用关系
  assets.file_details: 文件技术信息
  assets.workflow_hint: 管理原始素材、制作方案和交付成品，并保留每份素材的用途与来源。
  listing.stage_preparation: 平台准备
  listing.stage_content: 商品文案
  listing.stage_creative: 图片与详情
  listing.stage_review: 审核与交付
  listing.recorded_version: 记录的来源版本
  listing.recorded_confirmation: 确认记录
  listing.confirmation_recorded: 已记录确认版本
  listing.confirmation_unrecorded: 尚未记录确认版本
  listing.no_recorded_inputs: 尚未记录输入版本，请在审核与交付中记录当前依据。
  listing.raw_manifest: 查看原始输入清单
  listing.copy_title: 平台商品文案
  listing.copy_hint: 左侧查看字段与计数，中间维护面向消费者的内容，右侧核对来源和内部说明。
  listing.field_count: 字段与计数
  listing.current_copy: 当前内容
  listing.evidence_notes: 依据与内部说明
  listing.bytes: 字节
  listing.characters: 字符
  listing.one_per_line: 每行保存为一条内容。
  listing.not_written: 待填写
  listing.stale_action: 请核对来源变化，更新内容后重新记录依据并确认。
  listing.refs: 依据关联
  listing.variant_fields: SKU 变体内容
  proposals.changed_part: 变化位置
  proposals.current: 当前人工内容
  proposals.candidate: 候选内容
  proposals.diff_unavailable: 无法生成结构化比较，请查看原始 Markdown 差异。
  proposals.no_business_diff: 字段与正文没有变化，请查看原始差异核对其他属性。
  proposals.raw_diff: 查看完整 Markdown 差异
  workbench.create_child_template: 创建当前页面的子模板
  workbench.apply_child_template: 应用子模板到当前页面
  workbench.create_child_hint: 子模板继承当前页面的完整模板链。创建后可单独维护；点击应用才会绑定到当前页面，其他页面保持原模板。
  errors.TEMPLATE_CYCLE: 模板继承存在循环。
  diagnostics.TEMPLATE_CYCLE: 模板继承存在循环。
  errors.TEMPLATE_PERMISSION_DENIED: 子模板不能放宽上游规则。
  diagnostics.TEMPLATE_PERMISSION_DENIED: 子模板不能放宽上游规则。
  errors.TEMPLATE_EXTENSION_DENIED: 上游模板未允许扩展这些模块。
  diagnostics.TEMPLATE_EXTENSION_DENIED: 上游模板未允许扩展这些模块。
  errors.TEMPLATE_EXPLICIT_OVERRIDE_REQUIRED: 覆盖继承块需要声明明确的覆盖目标。
  diagnostics.TEMPLATE_EXPLICIT_OVERRIDE_REQUIRED: 覆盖继承块需要声明明确的覆盖目标。
  errors.TEMPLATE_KIND_MISMATCH: 此模板不适用于当前记录类型。
  diagnostics.TEMPLATE_KIND_MISMATCH: 此模板不适用于当前记录类型。
  errors.TEMPLATE_OVERRIDE_TARGET_MISSING: 模板覆盖目标不存在。
  diagnostics.TEMPLATE_OVERRIDE_TARGET_MISSING: 模板覆盖目标不存在。
  errors.INVALID_TEMPLATE_BINDING: 模板绑定了不可用的字段、区域或组件。
  diagnostics.INVALID_TEMPLATE_BINDING: 模板绑定了不可用的字段、区域或组件。
  errors.LAYOUT_TARGET_MISSING: 页面调整的目标已不存在。
  diagnostics.LAYOUT_TARGET_MISSING: 页面调整的目标已不存在。
  errors.LAYOUT_PERMISSION_DENIED: 模板不允许这项页面调整。
  diagnostics.LAYOUT_PERMISSION_DENIED: 模板不允许这项页面调整。
  errors.INVALID_LAYOUT_OVERRIDES: 页面局部调整格式无效。
  diagnostics.INVALID_LAYOUT_OVERRIDES: 页面局部调整格式无效。
  errors.TEMPLATE_ROOT_CHANGE_DENIED: 不能通过更换模板绕过页面标准。
  diagnostics.TEMPLATE_ROOT_CHANGE_DENIED: 不能通过更换模板绕过页面标准。
  errors.INVALID_INTERNAL_REFERENCE: 内部引用格式无效。
  diagnostics.INVALID_INTERNAL_REFERENCE: 内部引用格式无效。
  errors.REFERENCE_TARGET_MISSING: 引用的记录不存在。
  diagnostics.REFERENCE_TARGET_MISSING: 引用的记录不存在。
  errors.REFERENCE_TARGET_ARCHIVED: 引用的记录已经归档。
  diagnostics.REFERENCE_TARGET_ARCHIVED: 引用的记录已经归档。
  errors.REFERENCE_FIELD_MISSING: 引用的字段不存在。
  diagnostics.REFERENCE_FIELD_MISSING: 引用的字段不存在。
  errors.REFERENCE_BLOCK_MISSING: 引用的内容块不存在。
  diagnostics.REFERENCE_BLOCK_MISSING: 引用的内容块不存在。
  errors.REFERENCE_CYCLE: 业务引用存在循环。
  diagnostics.REFERENCE_CYCLE: 业务引用存在循环。
  errors.OPEN_BUSINESS_ISSUES: 请先处理当前记录中未解决的业务问题。
  diagnostics.OPEN_BUSINESS_ISSUES: 请先处理当前记录中未解决的业务问题。
  errors.INVALID_SEMANTIC_DATA: 业务模块数据格式无效。
  diagnostics.INVALID_SEMANTIC_DATA: 业务模块数据格式无效。
  errors.INVALID_SEMANTIC_EVIDENCE: 卖点关联的证据引用不存在。
  diagnostics.INVALID_SEMANTIC_EVIDENCE: 卖点关联的证据引用不存在。
  errors.SEMANTIC_BLOCK_MISSING: 卖点引用的正文块不存在。
  diagnostics.SEMANTIC_BLOCK_MISSING: 卖点引用的正文块不存在。
  errors.INVALID_ASSET_STAGE: 素材阶段无效。
  diagnostics.INVALID_ASSET_STAGE: 素材阶段无效。
  errors.INVALID_ASSET_SOURCES: 来源素材关联无效。
  diagnostics.INVALID_ASSET_SOURCES: 来源素材关联无效。
  errors.REFERENCE_USAGE_MISSING: 引用的使用位置不存在。
  diagnostics.REFERENCE_USAGE_MISSING: 引用的使用位置不存在。
  errors.DOCUMENT_RULE_CHANGE_DENIED: 普通内容修改不能改变文档规则。
  diagnostics.DOCUMENT_RULE_CHANGE_DENIED: 普通内容修改不能改变文档规则。
  errors.SOURCE_CONFLICT: 来源资料存在差异，需人工核实。
  diagnostics.SOURCE_CONFLICT: 来源资料存在差异，需人工核实。
  diagnostics.INVALID_TEMPLATE: 模板或其父级配置无效。
  blocks.fabe: FABE 卖点
  blocks.positioning: 定位与场景
  blocks.brief: 制作方案
  blocks.fields: 产品资料
  blocks.notice: 提示
  blocks.listing: 平台信息
  blocks.relations: 关联记录
  blocks.asset: 素材信息
  blocks.overview: 产品总览
  blocks.sku_matrix: SKU 对比
  blocks.selling_points: 核心卖点
  blocks.production: 素材制作
  issues.title: 待核实事项
  issues.hint: 核对来源并修正产品资料后，再明确标记已处理。处理问题不会自动确认产品。
  issues.open: 待核实
  issues.resolved: 已处理
  issues.resolve: 标记已处理
  issues.reopen: 重新打开
  blocks.issues: 待核实事项
  errors.INVALID_TEMPLATE_SECTION_COMPONENT: 页面分区使用了未注册的组件。
  diagnostics.INVALID_TEMPLATE_SECTION_COMPONENT: 页面分区使用了未注册的组件。
  errors.INVALID_LAYOUT_PERMISSION: 布局权限格式无效。
  errors.INVALID_TEMPLATE_APPLICABILITY: 模板适用类型格式无效。
  errors.INVALID_TEMPLATE_SECTIONS: 模板分区配置无效。
  errors.INVALID_TEMPLATE_OVERRIDES: 模板覆盖配置无效。
  errors.INVALID_TEMPLATE_OVERRIDE: 模板覆盖操作无效。
  errors.INVALID_INTERNAL_DOCUMENT: 内部历史记录格式无效。
  errors.WORKSPACE_REQUIRED: 请指定工作区。
  errors.INVALID_ACTOR: 协作身份无效。
  errors.INVALID_FIELD_OPTION: 字段值不在允许选项中。
  errors.INVALID_TEMPLATE_PARENT: 父模板引用无效。
  errors.INVALID_TEMPLATE_EXTENSION: 模板继承定义无效。
  errors.INVALID_TEMPLATE_REGIONS: 模板区域定义无效。
  errors.INVALID_TEMPLATE_REGION: 区域规则无效。
  errors.INVALID_SCHEMA_FIELDS: 字段定义集合无效。
  errors.INVALID_SCHEMA_FIELD: 字段定义无效。
  errors.INVALID_SCHEMA_SCOPE: 字段适用范围无效。
  errors.INVALID_POLICY_ACTOR: 来源策略中的协作身份无效。
  errors.INVALID_UI_MESSAGES: 界面文案格式无效。
  errors.INVALID_TARGETS: 销售目标配置无效。
  errors.INVALID_FORMAT: 文档格式无效。
  errors.INVALID_ENTITY_KIND: 业务记录类型无效。
  errors.INVALID_REFERENCE_LIST: 关联记录清单无效。
  errors.INVALID_LISTING_SPU: 平台草稿所关联的 SPU 无效。
  errors.INCOMPLETE_SALES_TARGET: 销售目标配置不完整。
  errors.INVALID_VARIANT_FIELDS: SKU 平台属性格式无效。
  errors.VARIANT_OUTSIDE_SELECTION: 变体不在当前选定的 SKU 中。
  errors.UNKNOWN_CONTENT_READONLY: 未识别内容只能读取，原文会保留。
  errors.PROPOSAL_BLOCK_DEFINITION_CHANGE: 候选不能改变既有块的规则定义。
  errors.REGION_CAPACITY: 此区域已达到允许的块数量。
  errors.ARCHIVED_READONLY: 归档记录不能修改。
  errors.IDENTITY_CHANGE_DENIED: 不能修改记录的稳定身份。
  errors.PROPOSAL_BASE_REQUIRED: 候选缺少生成时的基准版本。
  errors.PROPOSAL_BASE_MISMATCH: 候选的基准版本不一致。
  errors.PROPOSAL_INPUTS_REQUIRED: 候选缺少生成时的输入依据。
  errors.PROPOSAL_INPUTS_MISMATCH: 候选输入依据不一致。
  errors.PROPOSAL_POLICY_CHANGE: 候选不能改变来源策略。
  errors.PROPOSAL_BASE_CONFLICT: 当前版本与候选基准发生冲突。
---

# 界面文案

业务界面标签和提示从此 Markdown 文件动态读取。
