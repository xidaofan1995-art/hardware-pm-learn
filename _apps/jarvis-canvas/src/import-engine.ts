/** File-only ingestion. Nothing here contacts a model, reads a cloud account, or executes HTML. */
import type { PreviewPage } from './preview-types';

export type Artifact = {
  id: string;
  title: string;
  project: string;
  producer: string;
  type: "report" | "table" | "html" | "note" | "link" | "image" | "pdf";
  summary: string;
  createdAt: string;
  content?: string;
  url?: string;
  metrics?: { label: string; value: string }[];
  items?: { title: string; detail?: string; url?: string; score?: number }[];
  sourceLabel?: string;
  previewPages?: PreviewPage[];
};

export type ImportOptions = { producer: string; project: string; title?: string };
type JsonObject = Record<string, unknown>;

const MAX_BYTES = 1024 * 1024;
const MAX_ROWS = 1000;
const MAX_ARTIFACTS = 100;

function record(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function clean(value: unknown, max = 2000): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

/** Only absolute HTTP(S) links may leave the app. Credentials and executable URLs are rejected. */
export function safeUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length > 4096) return undefined;
  try {
    const url = new URL(raw.trim());
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

function digest(text: string): string {
  // Deterministic non-security hash: stable local identity, not a cryptographic guarantee.
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x85ebca6b);
  }
  return `import-${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}`;
}

function canonicalId(artifact: Artifact): string {
  const identity: unknown[] = [
    artifact.producer,
    artifact.project,
    artifact.type,
    artifact.title,
    artifact.summary,
    artifact.content ?? "",
    artifact.url ?? "",
    artifact.metrics ?? [],
    artifact.items ?? [],
  ];
  // Preserve existing IDs when a legacy artifact has no preview pages.
  if (artifact.previewPages?.length) identity.push(artifact.previewPages);
  return digest(JSON.stringify(identity));
}

/** Preview assets never contact arbitrary third-party hosts. SVG/executable data is excluded. */
export function safePreviewImage(value: unknown, allowData = true): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (/^\.\/content\/[A-Za-z0-9][A-Za-z0-9_-]*\.(?:jpe?g|png|webp)$/i.test(value)) return value;
  if (!allowData || value.length > 1400000) return undefined;
  const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 !== 0) return undefined;
  const padding = match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0;
  if ((match[2].length / 4) * 3 - padding > MAX_BYTES) return undefined;
  try {
    const bytes = atob(match[2].slice(0, 32));
    const mime = match[1];
    if (mime === 'png' && !bytes.startsWith('\x89PNG\r\n\x1a\n')) return undefined;
    if (mime === 'jpeg' && !(bytes.charCodeAt(0) === 255 && bytes.charCodeAt(1) === 216 && bytes.charCodeAt(2) === 255)) return undefined;
    if (mime === 'webp' && !(bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP')) return undefined;
    return value;
  } catch { return undefined; }
}

function previewPages(value: unknown): PreviewPage[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.length || value.length > 20) throw new Error('每份资料需有 1–20 个预览页。');
  const ids = new Set<string>();
  return value.map((raw, index) => {
    const item = record(raw);
    if (!item || !['text', 'table', 'image'].includes(String(item.kind))) throw new Error(`预览页 ${index + 1} 的类型有误。`);
    const id = clean(item.id, 100) || `page-${index + 1}`;
    if (ids.has(id)) throw new Error('同一份资料的预览页 ID 不能重复。');
    ids.add(id);
    const title = clean(item.title, 180);
    if (!title) throw new Error(`预览页 ${index + 1} 缺少标题。`);
    const page: PreviewPage = { id, kind: item.kind as PreviewPage['kind'], title };
    const subtitle = clean(item.subtitle, 300);
    if (subtitle) page.subtitle = subtitle;
    if (Number.isInteger(item.sourcePage) && Number(item.sourcePage) > 0 && Number(item.sourcePage) <= 100000) page.sourcePage = Number(item.sourcePage);
    if (page.kind === 'text') {
      if (!Array.isArray(item.sections) || !item.sections.length || item.sections.length > 5) throw new Error('文字预览需有 1–5 段要点。');
      page.sections = item.sections.map(rawSection => {
        const section = record(rawSection);
        const heading = clean(section?.heading, 100), body = clean(section?.body, 500);
        if (!heading || !body) throw new Error('文字预览的每段需有标题和正文。');
        return { heading, body };
      });
    }
    if (page.kind === 'table') {
      if (!Array.isArray(item.columns) || !item.columns.length || item.columns.length > 6 || !Array.isArray(item.rows) || !item.rows.length || item.rows.length > 10) throw new Error('表格预览最多支持 6 列、10 行。');
      page.columns = item.columns.map(value => clean(value, 80));
      if (page.columns.some(value => !value)) throw new Error('表格预览列名不能为空。');
      page.rows = item.rows.map(row => {
        if (!Array.isArray(row) || row.length !== page.columns!.length) throw new Error('表格预览每行的列数须一致。');
        return row.map(cell => clean(cell, 160));
      });
    }
    if (page.kind === 'image') {
      const image = record(item.image);
      const src = safePreviewImage(image?.src), alt = clean(image?.alt, 300);
      if (!src || !alt) throw new Error('图片预览需提供本应用图片路径或有效本机 JPEG/PNG/WebP 图片，以及图片说明。');
      page.image = { src, alt };
      const caption = clean(image?.caption, 300);
      if (caption) page.image.caption = caption;
    }
    return page;
  });
}

function plainHtml(html: string): { title: string; text: string } {
  // Discard markup BEFORE parsing, so even detached-document resource loads cannot occur.
  // Keeping character references lets DOMParser decode entities without creating resource elements.
  const textOnly = (value: string) => value
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const titleSource = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]
    || html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1]
    || "";
  const doc = new DOMParser().parseFromString(`<title>${textOnly(titleSource)}</title><body>${textOnly(html)}</body>`, "text/html");
  return {
    title: clean(doc.title || doc.querySelector("h1")?.textContent, 180),
    text: clean(doc.body.textContent?.replace(/\s+/g, " "), 800),
  };
}

function summarize(content: string): string {
  return clean(content.replace(/^#{1,6}\s+/gm, "").replace(/\s+/g, " "), 240);
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let endedQuote = false;
  const pushRow = () => {
    row.push(cell);
    if (row.length > 100) throw new Error("CSV 最多支持 100 列。");
    if (row.some((value) => value.trim())) rows.push(row);
    if (rows.length > MAX_ROWS + 1) throw new Error(`CSV 最多支持 ${MAX_ROWS} 条数据，请拆分后导入。`);
    row = [];
    cell = "";
    endedQuote = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; endedQuote = true; }
      } else cell += c;
    } else if (c === '"') {
      if (cell.length || endedQuote) throw new Error("CSV 引号格式有误，请检查单元格是否用双引号完整包裹。");
      quoted = true;
    } else if (c === ",") {
      row.push(cell); cell = ""; endedQuote = false;
      if (row.length > 100) throw new Error("CSV 最多支持 100 列。");
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else {
      if (endedQuote && !/\s/.test(c)) throw new Error("CSV 结束引号后存在多余内容。");
      if (!endedQuote) cell += c;
    }
  }
  if (quoted) throw new Error("CSV 存在未闭合的双引号。");
  pushRow();
  return rows;
}

function base(options: ImportOptions, title: string, content: string, type: Artifact["type"]): Artifact {
  const producer = clean(options.producer, 80) || "手动导入";
  const project = clean(options.project, 100) || "未分类";
  return {
    id: digest(JSON.stringify([producer, project, type, title, content])),
    title: clean(options.title, 180) || clean(title, 180) || "未命名产出",
    producer,
    project,
    type,
    summary: summarize(content),
    createdAt: new Date().toISOString(),
    content,
    sourceLabel: "用户导入 · 尚未核验",
  };
}

function jsonArtifact(value: unknown, options: ImportOptions, filename: string, index: number): Artifact {
  const obj = record(value);
  if (!obj) throw new Error(`第 ${index + 1} 条 JSON 产出应是对象。`);
  const producer = clean(obj.producer, 80) || options.producer;
  const project = clean(obj.project, 100) || options.project;
  const title = clean(obj.title, 180) || clean(options.title, 180) || filename || "未命名产出";
  const types: Artifact["type"][] = ["report", "table", "html", "note", "link", "image", "pdf"];
  const type = types.includes(obj.type as Artifact["type"]) ? obj.type as Artifact["type"] : "report";
  const content = typeof obj.content === "string" ? clean(obj.content, MAX_BYTES) : "";
  const artifact = base({ producer, project }, title, content, type);
  artifact.summary = clean(obj.summary, 1000) || (type === "html" ? plainHtml(content).text : summarize(content)) || "用户导入的结构化产出，数据尚未核验。";
  const url = safeUrl(obj.url);
  if (url) artifact.url = url;
  if (typeof obj.createdAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(obj.createdAt)) {
    const stamp = Date.parse(obj.createdAt);
    if (Number.isFinite(stamp)) artifact.createdAt = new Date(stamp).toISOString();
  }
  if (Array.isArray(obj.metrics)) {
    if (obj.metrics.length > 20) throw new Error("每条产出最多支持 20 个指标。");
    artifact.metrics = obj.metrics.flatMap((entry) => {
      const metric = record(entry);
      const label = clean(metric?.label, 80);
      const value = clean(metric?.value, 160);
      return label && value ? [{ label, value }] : [];
    });
  }
  if (Array.isArray(obj.items)) {
    if (obj.items.length > MAX_ROWS) throw new Error(`每条产出最多支持 ${MAX_ROWS} 行。`);
    artifact.items = obj.items.flatMap((entry) => {
      const item = record(entry);
      const itemTitle = clean(item?.title, 240);
      if (!itemTitle) return [];
      const normalized: NonNullable<Artifact["items"]>[number] = { title: itemTitle };
      const detail = clean(item?.detail, 1000);
      const itemUrl = safeUrl(item?.url);
      if (detail) normalized.detail = detail;
      if (itemUrl) normalized.url = itemUrl;
      if (typeof item?.score === "number" && Number.isFinite(item.score)) normalized.score = item.score;
      return [normalized];
    });
  }
  const pages = previewPages(obj.previewPages);
  if (pages) artifact.previewPages = pages;
  // Never trust supplied IDs or connection/verification claims. Stable IDs ignore field order and time.
  artifact.id = canonicalId(artifact);
  return artifact;
}

function parseInternal(text: string, filename: string, options: ImportOptions): Artifact[] {
  const input = text.replace(/^\uFEFF/, "").trim();
  if (!input) throw new Error("内容为空，请先选择文件或粘贴产出内容。");
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const structured = ext === 'json' || input.startsWith('{') || input.startsWith('[');
  // A local 1 MiB image expands under base64; JSON backups need room to restore it.
  const maxBytes = structured ? MAX_BYTES * 8 : MAX_BYTES;
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error(structured ? 'JSON 资料包最多支持 8 MB，请拆分后导入。' : '单次导入最多支持 1 MB 文本，请拆分文件。');
  const fallbackTitle = clean(filename.replace(/\.[^.]+$/, ""), 180);
  if (["pdf", "xlsx", "xls", "docx", "zip", "png", "jpg", "jpeg", "webp"].includes(ext)) {
    throw new Error(ext === 'pdf' ? 'PDF 原件请归档到 Drive；使用 JSON 导入摘要与预览页。当前不会解析 PDF 二进制文件。' : '当前文本导入支持 JSON、CSV、Markdown、TXT 和 HTML；图片请通过文件选择导入。');
  }
  if (ext === "json" || input.startsWith("{") || input.startsWith("[")) {
    let parsed: unknown;
    try { parsed = JSON.parse(input); }
    catch { throw new Error("JSON 格式有误，请检查逗号、双引号和括号。"); }
    const wrapper = record(parsed);
    const entries = Array.isArray(parsed) ? parsed : Array.isArray(wrapper?.artifacts) ? wrapper.artifacts : [parsed];
    if (!entries.length) throw new Error("JSON 中没有可导入的产出。");
    if (entries.length > MAX_ARTIFACTS) throw new Error(`每次最多导入 ${MAX_ARTIFACTS} 条产出。`);
    return entries.map((entry, index) => jsonArtifact(entry, options, fallbackTitle, index));
  }
  if (ext === "csv") {
    const rows = csvRows(input);
    if (rows.length < 2) throw new Error("CSV 需包含一行表头和至少一行数据。");
    const headers = rows[0].map((value, index) => clean(value, 80) || `列 ${index + 1}`);
    const first = headers.findIndex((value) => /^(title|name|company|名称|标题|公司|产品)$/i.test(value));
    const titleIndex = first < 0 ? 0 : first;
    const scoreIndex = headers.findIndex((value) => /^(score|评分|得分)$/i.test(value));
    const urlIndex = headers.findIndex((value) => /^(url|link|website|网址|链接|网站)$/i.test(value));
    const artifact = base(options, fallbackTitle || "导入表格", input, "table");
    artifact.items = rows.slice(1).map((row, index) => {
      const item: NonNullable<Artifact["items"]>[number] = {
        title: clean(row[titleIndex], 240) || `第 ${index + 1} 行`,
        detail: headers.flatMap((header, column) => column === titleIndex || !row[column] ? [] : [`${header}：${clean(row[column], 250)}`]).join(" · ").slice(0, 1000),
      };
      const url = urlIndex >= 0 ? safeUrl(row[urlIndex]) : undefined;
      if (url) item.url = url;
      const scoreText = scoreIndex >= 0 ? row[scoreIndex]?.trim() : "";
      if (scoreText && Number.isFinite(Number(scoreText))) item.score = Number(scoreText);
      return item;
    });
    artifact.metrics = [{ label: "导入行数", value: String(artifact.items.length) }, { label: "字段数", value: String(headers.length) }];
    artifact.summary = `${artifact.items.length} 条数据，${headers.length} 个字段。数据来自用户导入，尚未核验。`;
    return [artifact];
  }
  if (["html", "htm"].includes(ext) || /^<!doctype\s+html|^<html\b/i.test(input)) {
    const parsed = plainHtml(input);
    const artifact = base(options, parsed.title || fallbackTitle || "HTML 报告", input, "html");
    artifact.summary = parsed.text || "HTML 文件已导入，可在隔离预览中查看原文。";
    return [artifact];
  }
  const title = clean(input.match(/^#\s+(.+)$/m)?.[1], 180) || fallbackTitle || clean(input.split("\n")[0], 100);
  return [base(options, title, input, ext === "md" || ext === "markdown" ? "report" : "note")];
}

/** All formats share one identity algorithm so exporting to JSON and restoring is idempotent. */
export function parseImport(text: string, filename: string, options: ImportOptions): Artifact[] {
  const unique = new Map<string, Artifact>();
  for (const artifact of parseInternal(text, filename, options)) {
    artifact.id = canonicalId(artifact);
    if (!unique.has(artifact.id)) unique.set(artifact.id, artifact);
  }
  return [...unique.values()];
}

/** Local image only: no upload, cloud archive, or verification is implied. */
export async function parseImageFile(file: File, options: ImportOptions): Promise<Artifact[]> {
  if (!file.size || file.size > MAX_BYTES) throw new Error('单张图片最多支持 1 MB，请压缩后导入。');
  const declared = file.type.toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(declared)) throw new Error('图片仅支持 JPEG、PNG、WebP。');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  const src = safePreviewImage(`data:${declared};base64,${btoa(binary)}`);
  if (!src) throw new Error('图片内容与文件类型不符，无法导入。');
  const title = clean(options.title, 180) || clean(file.name.replace(/\.[^.]+$/, ''), 180) || '导入图片';
  const artifact = base(options, title, '', 'image');
  artifact.summary = '本机导入的图片，尚未归档到 Drive。';
  artifact.previewPages = [{ id: 'image-1', kind: 'image', title, image: { src, alt: title } }];
  artifact.id = canonicalId(artifact);
  return [artifact];
}

export const demoJson = JSON.stringify({
  title: "示例项目 · 市场研究摘要",
  producer: "ChatGPT",
  project: "示例项目",
  type: "report",
  summary: "以下全部为演示数据，用于体验多 AI 产出的统一呈现。",
  metrics: [{ label: "示例条目", value: "3" }, { label: "状态", value: "待核验" }],
  items: [
    { title: "示例数据 A", detail: "展示来源、摘要和详情的统一结构。", score: 86 },
    { title: "示例数据 B", detail: "同一项目可以汇入不同 AI 的产出。", score: 79 },
    { title: "示例数据 C", detail: "此分数用于界面演示，不代表真实商业判断。", score: 72 },
  ],
  content: "# 示例项目\n\n这是用户导入体验的示例数据。实际使用时，请将内容替换为你的研究结论，并保留来源链接。",
}, null, 2);
