import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_FILE_BYTES = 1024 * 1024;
const entryKeys = new Set(['id', 'title', 'project', 'producer', 'type', 'summary', 'createdAt', 'status', 'demoContent', 'archiveConfirmed', 'sourceLabel', 'metrics', 'items', 'drive']);
const types = new Set(['report', 'table', 'html', 'note', 'link']);
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const secretValue = /(?:-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{24,}|\bAIza[A-Za-z0-9_-]{30,}|\bBearer\s+[A-Za-z0-9._~-]{16,})/;
const secretQueryKey = /^(?:access_token|refresh_token|id_token|token|api_key|apikey|key|password|secret|signature|resourcekey)$/i;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validDate = value => typeof value === 'string' && timestamp.test(value) && Number.isFinite(Date.parse(value));

function webUrl(value) {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if ([...url.searchParams.keys()].some(key => secretQueryKey.test(key))) return null;
    return url;
  } catch { return null; }
}

/** This validates a declared archive reference, not remote access or file existence. */
export function validateEntry(entry, label = 'entry') {
  const errors = [];
  const issue = message => errors.push(`${label}: ${message}`);
  if (!object(entry)) return [`${label}: 条目必须是 JSON 对象。`];
  const onlyKeys = (value, allowed, path) => {
    for (const key of Object.keys(value)) if (!allowed.has(key)) issue(`${path} 不支持字段 ${key}；只保存索引，不保存完整正文、共享权限或凭据。`);
  };
  const text = (value, path, max, required = true) => {
    if (!required && value === undefined) return;
    if (typeof value !== 'string' || (required && !value.trim()) || value.length > max) issue(`${path} 应为${required ? '非空' : ''}字符串，最长 ${max} 字符。`);
    else if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) issue(`${path} 包含不支持的控制字符。`);
  };
  onlyKeys(entry, entryKeys, '条目');
  if (typeof entry.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{2,99}$/.test(entry.id)) issue('id 需为 3–100 位小写字母、数字、连字符或下划线。');
  text(entry.title, 'title', 180);
  text(entry.project, 'project', 100);
  text(entry.producer, 'producer', 80);
  text(entry.summary, 'summary', 500);
  text(entry.sourceLabel, 'sourceLabel', 200, false);
  if (!types.has(entry.type)) issue('type 仅支持 report、table、html、note、link。');
  if (!validDate(entry.createdAt)) issue('createdAt 需为带时区的 ISO 日期时间。');
  if (typeof entry.demoContent !== 'boolean') issue('demoContent 必须明确为 true 或 false。');
  if (!['demo', 'ready'].includes(entry.status)) issue('status 仅支持 demo 或 ready。');

  if (entry.metrics !== undefined) {
    if (!Array.isArray(entry.metrics) || entry.metrics.length > 20) issue('metrics 最多包含 20 个指标。');
    else entry.metrics.forEach((metric, index) => {
      if (!object(metric)) { issue(`metrics[${index}] 必须是对象。`); return; }
      onlyKeys(metric, new Set(['label', 'value']), `metrics[${index}]`);
      text(metric.label, `metrics[${index}].label`, 80);
      text(metric.value, `metrics[${index}].value`, 160);
    });
  }
  if (entry.items !== undefined) {
    if (!Array.isArray(entry.items) || entry.items.length > 1000) issue('items 最多包含 1,000 个条目。');
    else entry.items.forEach((item, index) => {
      if (!object(item)) { issue(`items[${index}] 必须是对象。`); return; }
      onlyKeys(item, new Set(['title', 'detail', 'url', 'score']), `items[${index}]`);
      text(item.title, `items[${index}].title`, 240);
      text(item.detail, `items[${index}].detail`, 1000, false);
      if (item.url !== undefined && !webUrl(item.url)) issue(`items[${index}].url 必须是没有凭据的 HTTPS 链接。`);
      if (item.score !== undefined && (typeof item.score !== 'number' || !Number.isFinite(item.score))) issue(`items[${index}].score 必须是有限数字。`);
    });
  }

  if (entry.demoContent === true) {
    if (entry.status !== 'demo') issue('示例必须明确 status: "demo"。');
    if (entry.drive !== null) issue('示例 drive 必须为 null，不能假造已归档文件或绑定真实原件。');
    if (entry.archiveConfirmed !== undefined && entry.archiveConfirmed !== false) issue('示例不能声称已确认真实归档。');
  } else if (entry.demoContent === false) {
    if (entry.status !== 'ready') issue('真实索引必须 status: "ready"。');
    if (entry.archiveConfirmed !== true) issue('真实索引须由已授权的归档流程确认 archiveConfirmed: true；不要自动推测归档完成。');
    if (!object(entry.drive)) issue('真实索引必须包含 Drive 原件引用。');
  }
  if (entry.drive !== null && entry.drive !== undefined) {
    if (!object(entry.drive)) issue('drive 必须是对象或 null。');
    else {
      onlyKeys(entry.drive, new Set(['fileId', 'webViewLink', 'mimeType', 'archivedAt']), 'drive');
      const { fileId, webViewLink, mimeType, archivedAt } = entry.drive;
      if (typeof fileId !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) issue('drive.fileId 应为归档工具实际返回的文件 ID。');
      const url = webUrl(webViewLink);
      if (!url || !['drive.google.com', 'docs.google.com'].includes(url.hostname)) issue('drive.webViewLink 必须使用 drive.google.com 或 docs.google.com 的 HTTPS 原件链接，且不能携带凭据。');
      else {
        const pathId = url.pathname.match(/\/d\/([^/]+)/)?.[1];
        const queryId = url.pathname === '/open' ? url.searchParams.get('id') : null;
        if ((pathId || queryId) !== fileId) issue('Drive URL 中的文件 ID 必须与 fileId 一致；使用工具返回的原件链接。');
      }
      text(mimeType, 'drive.mimeType', 150);
      if (!validDate(archivedAt)) issue('drive.archivedAt 需为带时区的 ISO 日期时间。');
    }
  }
  if (!Object.hasOwn(entry, 'drive')) issue('必须明确 drive 对象或 null。');
  if (secretValue.test(JSON.stringify(entry))) issue('发现疑似访问凭据或私钥，不能写入 GitHub 索引。');
  return errors;
}

export async function readAndValidateContent(root = projectRoot) {
  const folder = join(root, 'content', 'entries');
  const files = (await readdir(folder, { withFileTypes: true })).filter(file => file.isFile() && file.name.endsWith('.json')).map(file => file.name).sort();
  if (files.length > 5000) throw new Error('索引文件超过 5,000 份，请按项目拆分。');
  const entries = [];
  const ids = new Map();
  const errors = [];
  for (const name of files) {
    const raw = await readFile(join(folder, name));
    if (raw.byteLength > MAX_FILE_BYTES) { errors.push(`${name}: 单份索引不得超过 1 MB；完整报告请保存在 Drive。`); continue; }
    let entry;
    try { entry = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, '')); }
    catch { errors.push(`${name}: JSON 格式错误。`); continue; }
    const found = validateEntry(entry, name);
    errors.push(...found);
    if (!found.length) {
      if (ids.has(entry.id)) errors.push(`${name}: id ${entry.id} 与 ${ids.get(entry.id)} 重复。`);
      else { ids.set(entry.id, name); entries.push(entry); }
    }
  }
  if (errors.length) throw new Error(errors.slice(0, 100).join('\n') + (errors.length > 100 ? `\n另有 ${errors.length - 100} 项错误。` : ''));
  return entries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const entries = await readAndValidateContent();
    console.log(`内容索引验证通过：${entries.length} 份条目（${entries.filter(entry => entry.demoContent).length} 份示例）。`);
    console.log('未联网读取或更改 Drive 文件、共享权限。');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
