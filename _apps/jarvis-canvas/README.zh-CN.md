# Jarvis Canvas · 多 AI 产出看板

以所提供 Hark 截图为视觉参考，建设一个独立 PWA：不同 AI 负责研究与生成，应用统一展示成果。原文件归档到 **Google Drive**，**GitHub** 保存应用代码、模板、数据契约和可公开的轻量索引。

本目录是独立 PWA 源码。通过草稿 PR 将源码保存在旧仓 `_apps/jarvis-canvas/`，可部署静态文件放在 `apps/jarvis-canvas/`，保留旧知识花园；草稿 PR 和计划路径不等于已经发布的网站。安装、离线及发布状态应以实际验收结果为准。

## 文件怎样分工

| 位置 | 保存内容 |
| --- | --- |
| Google Drive | HTML、PDF、文档、表格、图片等原始成果，以及需受权限保护的业务资料 |
| `content/entries/<id>.json` | 一份产物一个轻量索引：标题、项目、摘要、指标、来源、Drive 原件引用 |
| `content/schema.json` | 索引的字段、类型与校验规则，所有 AI 共用这一契约 |
| `scripts/build-index.mjs` | 校验独立条目，并生成汇总索引 |
| `public/data/index.json` | 构建生成的应用读取入口，不手工修改 |
| GitHub 中的代码与模板 | 应用 UI、卡片组件、导入器、研究模板与协作说明 |
| 浏览器本地数据 | 个人导入或收藏等本机状态；不因此自动进入 Drive 或 GitHub |

不要将完整报告、客户敏感资料、密钥或访问令牌放进 GitHub。轻量索引的标题、摘要和指标也须先检查是否适合公开。Drive 文件的访问权限单独管理，建立索引不等于把原文件改为公开。

## 不同 AI 如何更新同一个看板

1. 读取本文件、`AGENTS.md`、现有 schema 和所属项目的相邻条目，确认内容范围；内容更新通常只需要新增或修改一份条目。
2. 通过已获授权的 Drive 工具归档原文件。工具成功后，核对返回的 `file_id`、`webViewLink` 和目标项目；保留工具返回的真实值。
3. 在 `content/entries/<id>.json` 写入简洁索引。正式成果使用 `status: "ready"`、`demoContent: false`、`archiveConfirmed: true`，并填写 `drive`；不得伪造归档确认。
4. 执行 `node scripts/build-index.mjs`。若校验失败，修正条目，不放宽 schema 来绕过错误；`public/data/index.json` 由脚本生成。
5. 检查变更范围与敏感内容，创建 PR，说明新增成果、来源日期、原件位置及验证结果。尽量一份产物一个文件，减少不同 AI 同时编辑的冲突；合并后按已配置的发布流程更新应用。

`archiveConfirmed: true` 仅表示**提交者已通过工具确认归档**；本地构建校验不等于在线访问 Drive 验证文件存在、权限或正文真实性。不同 AI 仍需分别具备仓库与 Drive 的访问工具及授权。

**没有工具或授权时**，只交付待导入包：原始文件、轻量索引建议和导入说明。不要声称已上传、已同步或已提交 PR，不把未确认的候选条目写入正式 `content/entries/`。由具备权限的执行方完成归档，补齐真实 Drive 引用，再走校验与 PR。

## 索引示例

下面仅为演示条目示意，真实字段约束以 `content/schema.json` 为准。演示使用 `drive: null`，不能拿虚构文件 ID 冒充真实归档。

```json
{
  "id": "example-market-summary-20261020",
  "title": "示例项目 · 市场研究摘要",
  "project": "示例项目",
  "producer": "ChatGPT",
  "type": "report",
  "summary": "仅用于演示结构，以下内容不是已核验的研究结论。",
  "createdAt": "2026-10-20T08:00:00+08:00",
  "status": "demo",
  "demoContent": true,
  "archiveConfirmed": false,
  "drive": null,
  "metrics": [
    { "label": "状态", "value": "演示" }
  ],
  "items": [
    { "title": "示例发现", "detail": "真实研究应区分事实、推断和待验证假设。" }
  ]
}
```

正式条目的 `drive` 对象使用 `fileId`、`webViewLink`、`mimeType`、`archivedAt`。不要另加顶层 `driveFileId` 或 `url` 代替；UI 可在适配时将 `drive.webViewLink` 转为卡片的原件链接。此协议保存轻量信息，不将完整报告放入 `content`。

## 数据与能力边界

生成工具标签由提交者标注，不代表系统已认证模型来源；格式校验与归档确认也不是事实核验。金额、市场规模、公司信息和评分应保留来源日期、统计口径与证据，标明事实、推断、演示和待验证内容。

PWA 是浏览器安装到桌面的应用形态，不等于 Android 原生安装包。离线缓存应用外壳或索引，不保证离线打开 Drive 原件。单独连接自动云盘同步、模型调用或跨设备个人数据同步，需要相应实现与授权，不能由“已安装 PWA”推导为已经具备这些能力。

## 旧知识花园：已核验的依据

2026-10-20 通过 GitHub 核验了旧知识花园：

| 仓库 | 代码与部署证据 |
| --- | --- |
| [`hardware-pm-learn`](https://github.com/xidaofan1995-art/hardware-pm-learn) | README 明确名为“硬件 PM 知识花园”；公开仓库，默认分支 `main`，GitHub 返回 `has_pages: true`。根目录 `manifest.webmanifest` 使用 `display: "standalone"`、`scope: "./"`；`index.html` 注册 `./sw.js`；`sw.js` 实现联网优先、离线兜底。 |

`hardware-pm-learn` 最新核查的 [成功 Pages 构建记录](https://github.com/xidaofan1995-art/hardware-pm-learn/actions/runs/38676371112) 使用动态 Pages 工作流，包含 **Build with Jekyll** 和 **Deploy to GitHub Pages**。这些是构建记录链接，不是应用访问地址；本说明不推测未验证的 Pages URL。

旧工作流不执行 npm 构建。仅新增 Vite 源码不会自动变成可运行应用；发布时须选择可部署的静态构建输出，或审查后调整构建工作流。新 PWA 需要独立 scope 和缓存前缀，不能清除旧 `hpm-garden-` 缓存或覆盖旧根入口。

## 官方技术依据

- [Google Drive 变更通知](https://developers.google.com/workspace/drive/api/guides/push)：需要权限、HTTPS 接收端和通知通道；通知不含文件正文、元数据或目录路径，仍需调用 API 读取。自动同步是后续独立管线。
- [MDN：iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe) 与 [srcdoc](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/srcdoc)：HTML 预览需隔离执行与父页面权限，不能把任意 AI HTML 直接注入主应用。
- [OpenAI 计费说明](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform)：展示已有文件不必调用模型；若后续接 OpenAI API，其费用与 ChatGPT 订阅分别管理。

## 本地检查与发布路径

```sh
npm ci
npm run validate
npm run build
npm run dev # 预览构建结果；开发使用 npm run develop
```

`npm run build` 生成 `dist/`。旧知识花园使用 Jekyll，将本目录源码保存在 `_apps/jarvis-canvas/`（Jekyll 默认忽略下划线目录），将 `dist/` 复制到仓库的 `apps/jarvis-canvas/`。提交 PR 时包含两边的对应变化；不修改旧根入口或根 Service Worker。更新 entries 后仍须重新构建并同步静态输出，否则线上索引不会变化。

当前已实现原生浏览器布局、索引读取、原件链接、搜索/筛选/收藏、本机导入、manifest 与独立缓存。已完成编译和浏览器主要交互检查；手机安装及离线行为需要部署到 HTTPS 后做实机验收。
