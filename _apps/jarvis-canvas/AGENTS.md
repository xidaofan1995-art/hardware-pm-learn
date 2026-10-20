# Jarvis Canvas 项目协作约定

本文件约束本目录中的协作方式，不是安装技能。用户最新指令优先。不同 AI 在编辑前先读本文件、`README.zh-CN.md`、`content/schema.json`；涉及资料集时还须读取 `content/collections.schema.json` 和相关现有代码。

## 存储与真实状态

- Google Drive 保存 AI 产出原件；GitHub 保存代码、模板、schema 与适合公开的轻量索引。
- 不将完整报告、客户敏感资料、账号凭据、密钥、访问令牌、带令牌的下载 URL 或完整聊天记录提交 GitHub。轻量摘要也须检查是否可公开。
- 预览页、封面和缩略图同样属于内容。私有 Drive 原件不能配套提交可泄露内容的公开预览；不要为获得缩略图而改变原件权限。公开索引不接受私有文件的下载链接或带凭据地址。
- 不能因为有文件链接就将 Drive 文件改为公开；保持其既有访问范围，权限变化需有明确授权。
- 未获工具与授权的 AI 只交付待导入包，不模拟上传、归档确认、仓库提交或 PR。候选条目不得进入正式 entries。
- 本地个人导入与收藏不自动上传到 Drive 或仓库；不要在没有实现时声称云端同步、模型连接或在线核验。

## 内容更新的最小路径

1. 先读取 schema 和相关项目条目，确认稳定 `id`、项目、生成工具、时间与来源。
2. 用已授权的 Drive 工具上传原件，或读取已存在的目标文件；核对成功返回的真实文件 ID、`webViewLink` 与项目归属。
3. 只新增或修改 `content/entries/<id>.json`。每份产物一个独立文件，后续修订保持稳定 ID，避免多人共改巨型 JSON。
4. 正式成果使用 `status: "ready"`、`demoContent: false`、`archiveConfirmed: true`，并提供嵌套 `drive: { fileId, webViewLink, mimeType, archivedAt }`。归档确认由执行者负责，不能从用户给的未经核查链接推定。
5. 演示条目明确标记 `status: "demo"`、`demoContent: true`、`archiveConfirmed: false`、`drive: null`，不编造 Drive ID。
6. 运行 `node scripts/build-index.mjs`，修正校验错误；`public/data/index.json` 只能由构建脚本生成。按实际变更运行必要检查，保留结果。
7. 创建聚焦的 PR，说明新增/修订的产物、原件归档、核验状态、验证命令和仍存在的限制。内容 PR 不捎带 UI 重构。除非用户另有授权，不自行合并或修改仓库发布设置。

如果没有 Drive 访问能力，交付原文件、`entry.proposed.json` 和导入说明，明确“待归档”；由有权限的执行方补齐真实 Drive 信息，再移入 entries 并提交 PR。

## 数据契约

- 以 `content/schema.json` 和 `content/collections.schema.json` 为字段权威；改契约时同时修改构建脚本、消费端适配与必要验证，并说明兼容性。
- `createdAt` 沿用当前 UI 字段。真实归档只使用嵌套 `drive` 对象，不另造顶层 `driveFileId`、`url` 等并行契约；消费端可以将 `drive.webViewLink` 映射成内部原件链接。
- `archiveConfirmed` 是提交者的归档确认，不代表构建脚本在线验证文件存在、权限或内容真实性。README、UI 和 PR 不得混淆两者。
- 条目只放适量摘要、指标与条目，不携带完整报告正文、任意 HTML 或执行代码。
- 多文档资料集写入 `content/collections/<id>.json`，以 `artifactIds` 引用独立 entries 的稳定 ID，按数组顺序展示；不复制原件，不使用标题或数组位置作为成员 ID。修改既有资料时保持资料集、成员和预览页 ID 稳定。
- 单份成果可提供 `previewPages`。每页使用稳定 `id` 和 `kind: "text" | "table" | "image"`，另有 `title`、可选 `subtitle` 与 `sourcePage`；`sourcePage` 是原文档页码，不能冒充资料集中文档序号。文字页用 `sections`，表格页用 `columns/rows`，图片页用 `image: { src, alt, caption? }`。预览仅保留适合公开的精选内容；具体字段与数量限制以 schema 为准。
- 公开图片预览仅引用已存在的 `./content/<安全文件名>.jpg|jpeg|png|webp`，不使用外部 URL、临时下载地址、data/blob、SVG 或越级路径。本机导入的内嵌图片不得原样写入公开 entries。资料集成员必须存在且归属同一项目，正式资料集不能引用演示成果。
- `type: "pdf"` 只描述原件类型。当前不解析原始 PDF，PDF 的可翻页预览需先生成符合契约的 JSON 页面；不要声称上传 PDF 后能自动拆页。图片/PDF 原件仍按既有规则归档 Drive。
- AI 自报来源、格式合法、归档成功、事实已核验是不同状态。对数字、评分和结论保留证据与日期；事实、推断、示例和待验证假设应清楚标注。
- 不绕过校验、不伪造文件 ID 或生成时间、不把演示评分替换成貌似真实的商业数据。

## UI 与 PWA

- 常规成果更新通过 entries 完成，不让每个 AI 重写 UI。只有用户请求界面或能力变更时才修改应用代码。
- 保留 Hark 截图参考的简洁卡片和层次；这是独立 PWA，不增加假装已连通的聊天、模型执行或同步状态。
- 资料集按“叠卡预览 → 单份阅读 → 原件”逐层展开，分别显示文档位置与文档内部页码；关闭阅读应保留所选文档、页面及原列表上下文。异构资料保持文字、表格、图片的合适阅读方式，不把所有内容截图化。
- 本机图片导入仅支持单文件不超过 1 MiB 的 JPEG、PNG、WebP，并校验实际文件签名；其他文字文件上限 1 MiB，JSON 导入包上限 8 MiB，以支持本机图片导出后恢复，每张内嵌图片仍受 1 MiB 限制。导入后仅存在当前浏览器，不等于 Drive 归档或可发布索引。JSON 页面预览与原始 PDF 上传是不同能力；修改限制时同步 UI、导入器与说明。
- 源码位于旧仓 `_apps/jarvis-canvas/`、静态发布位于 `apps/jarvis-canvas/` 时，使用子路径兼容资源地址、独立 manifest scope 和 Service Worker。缓存前缀专属于本应用。
- 不覆盖旧知识花园根入口、根 `sw.js`、manifest、学习数据键或缓存；不要批量删除整个同源 Cache Storage/localStorage。
- 旧仓实际 Pages 工作流包含 Jekyll 构建，不会自动执行 npm。发布改动前区分源码与可部署静态输出，不在未经审查的内容 PR 中改变旧仓发布方式。
- 按变更验证：索引构建、生产构建、主要交互；涉及 PWA 时验证 manifest、子路径、SW 更新及离线行为。没有浏览器验收就明确记录限制，不将构建成功写成手机安装或实机验收通过。

## PR 与并行协作

- 编辑前读取最新版本，使用分支和 PR；冲突时保留其他 AI 的有效改动，不强推覆盖。
- 多 AI 优先各自拥有独立 entry。汇总索引冲突时以最新 entries 重新运行构建生成，不手工拼接生成文件。
- 新增或修改模板/schema/组件的 PR 与日常内容 PR 分开，保持差异可审查。
- PR 中只报告实际执行的动作和检查。没有远端工具或权限时，交付本地补丁或待导入包，并说明谁还需完成哪一步。

发布到旧知识花园时，运行 `npm run build` 后将 dist/ 同步至仓库 apps/jarvis-canvas/，并随源码同一个 PR 提交。仅修改源 entries 而未同步发布索引不会更新线上应用。
