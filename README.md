# 硬件 PM 知识花园 🌿

一个**纯前端、零依赖**的个人学习网页应用，用于系统学习智能硬件产品经理知识体系、备战面试。数据全部存在浏览器 localStorage，无需服务器。

## 六大版块

- **🏡 花园**：22 个知识域以"花圃"形式展示，学习进度决定植物成长阶段（🟫 → 🌱 → 🌳）；底部附 12 周学习热力图和各知识域覆盖度
- **💧 浇水（复习）**：基于 SM-2 简化算法的间隔复习，按遗忘曲线自动安排今天该复习的题
- **🌱 播种（刷题）**：按知识域选题刷题，自评掌握度（模糊 / 基本会 / 熟练）；每题附**参考答案 / 答题思路**（题目精确答案 → 本章考点要点 + 题型答题框架三级兜底）
- **📚 学堂**：8 大知识域的系统化框架内容——市场调研与选品、需求管理、开发流程与项目管理（IPD/EVT/DVT/PVT）、团队管理与跨部门协作、供应链管理、测试验证与质量、安规认证与法规（CCC/CE/FCC/RoHS/UN38.3 等）、商业化与上市
- **🗂 案例**：内置 8 个经典案例（三星 Note7 召回、特斯拉 OTA、Anker、大疆、Juicero、云鲸、Insta360、Nest），每个含背景 / 机制分析 / PM 启示；另有**我的收藏**——保存文章链接、标签和摘要
- **💭 笔记**：
  - **思绪**：自由记录疑问 / 想法 / 复盘，支持编辑、删除、搜索
  - **答题笔记**：答题时写下的要点自动沉淀，可搜索
  - 全部内容可一键导出 Markdown；支持 JSON 备份 / 恢复

## 使用

直接双击打开 `index.html` 即可（无需安装任何东西）。

## 部署到 GitHub Pages（推荐，随处可访问 + 手机装成 App）

一次性设置（在本目录打开 PowerShell 执行）：

```powershell
git add -A
git commit -m "init: 知识花园 v2（PWA）"
git branch -M main
# 先在 github.com 上新建一个名为 hardware-pm-learn 的仓库（公开），然后：
git remote add origin https://github.com/<你的用户名>/hardware-pm-learn.git
git push -u origin main
```

然后在 GitHub 仓库页面：**Settings → Pages → Build and deployment → Source 选 "Deploy from a branch"，Branch 选 `main` / `(root)`，保存**。约 1 分钟后访问：

```
https://<你的用户名>.github.io/hardware-pm-learn/
```

以后每次内容更新，只需 `git add -A && git commit -m "update" && git push`，网页自动更新。

> 注意：免费版 GitHub Pages 要求仓库公开，意味着题库和知识内容是公开可见的；但你的**学习进度、笔记、收藏都只存在浏览器本地（localStorage），不会上传**，无隐私风险。

## 安卓手机安装为 App（PWA）

本项目已内置 PWA 支持（manifest + Service Worker + 图标），部署到 GitHub Pages 后：

1. 手机 Chrome 打开上面的网址
2. 右上角菜单 ⋮ → **「添加到主屏幕」/「安装应用」**
3. 桌面出现「知识花园」图标，点开即全屏运行，**断网也能用**（Service Worker 离线缓存）

数据说明：电脑端和手机端的 localStorage 相互独立。两端同步的方法——在一端「笔记 → 备份数据」导出 JSON，传到另一端（微信/网盘），再「恢复备份」导入。

## 题库与内容

- 题库来自《硬件产品经理面试题库（四级难度）》，共 22 个知识域、约 590 题，位于 `js/data.js`（结构：chapters → topics → questions）
- 参考答案位于 `js/answers.js`：`byQuestion`（逐题精确答案，可持续补充）、`byChapter`（各章考点与答题要点）、`generic`（四类题型通用框架）
- 学堂内容位于 `js/knowledge.js`，案例库位于 `js/cases.js`，均可直接编辑扩充

## 目录结构

```
index.html            入口页面
manifest.webmanifest  PWA 应用清单（名称 / 图标 / 独立窗口）
sw.js                 Service Worker（离线缓存，联网优先策略）
icons/                应用图标（SVG）
css/style.css         花园主题样式（含移动端适配）
js/data.js            题库种子数据
js/answers.js         参考答案（逐题答案 + 章节要点 + 题型框架）
js/knowledge.js       学堂知识框架内容
js/cases.js           内置经典案例库
js/app.js             应用逻辑（刷题 / 复习 / 学堂 / 案例收藏 / 笔记 / 统计）
```
