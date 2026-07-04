/* 硬件 PM 知识花园 —— 纯前端 + localStorage */
"use strict";

/* ── 数据层 ─────────────────────────────── */
const STORE_KEY = "hpm-garden-v1";

// 展平题库：每题一个稳定 id = "章-节序-题序"
const QUESTIONS = [];
SEED_DATA.chapters.forEach(ch => {
  ch.topics.forEach((tp, ti) => {
    tp.questions.forEach((q, qi) => {
      QUESTIONS.push({ id: `${ch.id}-${ti}-${qi}`, ch: ch.id, chTitle: ch.title, topic: tp.title, text: q });
    });
  });
});
const QMAP = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
const state = Object.assign({ progress: {}, log: {}, thoughts: [], collection: [] }, loadState());
if (!Array.isArray(state.thoughts)) state.thoughts = [];
if (!Array.isArray(state.collection)) state.collection = [];
// progress[qid] = { ef, interval, reps, due, note, last, rating }
// log[date] = 学习次数
// thoughts[] = { id, type, text, created, updated }
// collection[] = { id, title, url, tags[], note, created }
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// 轻量富文本：**加粗**，"- " 开头的行渲染为列表项
function rich(text) {
  const lines = String(text).split("\n");
  let html = "", inList = false;
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  lines.forEach(line => {
    if (line.startsWith("- ")) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(line.slice(2))}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      if (line.trim()) html += `<p>${inline(line)}</p>`;
    }
  });
  if (inList) html += "</ul>";
  return html;
}

/* SM-2 简化版：自评 1=模糊 / 2=基本会 / 3=熟练 */
function schedule(p, rating) {
  const grade = { 1: 2, 2: 4, 3: 5 }[rating];
  p.ef = Math.max(1.3, (p.ef || 2.5) + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  if (rating === 1) { p.reps = 0; p.interval = 1; }
  else {
    p.reps = (p.reps || 0) + 1;
    p.interval = p.reps === 1 ? 1 : p.reps === 2 ? 3 : Math.round((p.interval || 1) * p.ef);
  }
  const due = new Date(); due.setDate(due.getDate() + p.interval);
  p.due = todayStr(due);
  p.last = todayStr();
  p.rating = rating;
  return p;
}

function rate(qid, rating, noteText) {
  const p = state.progress[qid] || {};
  schedule(p, rating);
  if (noteText && noteText.trim()) p.note = noteText.trim();
  state.progress[qid] = p;
  state.log[todayStr()] = (state.log[todayStr()] || 0) + 1;
  save();
}

function dueList() {
  const t = todayStr();
  return Object.entries(state.progress)
    .filter(([, p]) => p.due && p.due <= t)
    .map(([qid]) => QMAP[qid]).filter(Boolean);
}

function streak() {
  let n = 0; const d = new Date();
  if (!state.log[todayStr(d)]) d.setDate(d.getDate() - 1); // 今天没学不打断昨天为止的连续
  while (state.log[todayStr(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ── 参考答案解析：题目精确答案 → 本章要点 + 题型思路 ── */
function pickGenericFramework(text) {
  if (/请(描述|分享|举例说明你|谈谈你)(一次|一个|你)|你曾|你如何在.*项目/.test(text)) return ANSWER_DATA.generic.star;
  if (/权衡|平衡.{0,6}(与|和)|取舍/.test(text)) return ANSWER_DATA.generic.tradeoff;
  if (/假设|如果你|你会如何|你将如何|该如何应对|如何处理/.test(text)) return ANSWER_DATA.generic.scenario;
  return ANSWER_DATA.generic.concept;
}
function getAnswer(q) {
  const exact = ANSWER_DATA.byQuestion[q.id];
  if (exact) return { label: "📗 参考答案", text: exact, exact: true };
  const chapter = ANSWER_DATA.byChapter[q.ch] || "";
  return { label: "🧭 答题思路（本章要点 + 题型框架）", text: chapter + "\n\n" + pickGenericFramework(q.text), exact: false };
}

/* ── 视图切换 ─────────────────────────────── */
const views = document.querySelectorAll(".view");
const navBtns = document.querySelectorAll(".nav-btn");
navBtns.forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
function showView(name) {
  views.forEach(v => v.classList.toggle("active", v.id === "view-" + name));
  navBtns.forEach(b => b.classList.toggle("active", b.dataset.view === name));
  ({ garden: renderGarden, review: renderReview, practice: renderPracticePicker,
     knowledge: renderKnowledge, cases: renderCases, notes: renderNotes })[name]();
  window.scrollTo({ top: 0 });
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), 1800);
}

function refreshBadges() {
  document.getElementById("streak-badge").textContent = `🔥 ${streak()} 天`;
  const n = dueList().length;
  const pill = document.getElementById("due-count");
  pill.hidden = n === 0; pill.textContent = n > 99 ? "99+" : n;
}

/* ── 花园总览（含成长统计）───────────────────── */
const PLANT_STAGES = ["🟫", "🌱", "🌿", "🌾", "🌸", "🌳"]; // 按成长度取
function chapterStats(chId) {
  const qs = QUESTIONS.filter(q => q.ch === chId);
  let learned = 0, mastered = 0, due = 0;
  const t = todayStr();
  qs.forEach(q => {
    const p = state.progress[q.id];
    if (p && p.last) {
      learned++;
      if ((p.reps || 0) >= 3 && p.rating === 3) mastered++;
      if (p.due && p.due <= t) due++;
    }
  });
  return { total: qs.length, learned, mastered, due };
}

function renderGarden() {
  const totalLearned = Object.values(state.progress).filter(p => p.last).length;
  const totalMastered = Object.values(state.progress).filter(p => (p.reps || 0) >= 3 && p.rating === 3).length;
  const due = dueList().length;
  const tips = due > 0
    ? `有 ${due} 株植物等着浇水（到期复习）。先去「浇水」页，再开新地。`
    : totalLearned === 0
      ? "花园还是一片空地。去「播种」页选一块地，回答第一道题吧。"
      : "今日无到期复习。可以去「播种」页开垦新知识域，或去「学堂」补理论。";
  document.getElementById("garden-summary").innerHTML = `
    <div class="gs-item"><div class="gs-num">${totalLearned}</div><div class="gs-label">已播种</div></div>
    <div class="gs-item"><div class="gs-num">${totalMastered}</div><div class="gs-label">已开花</div></div>
    <div class="gs-item"><div class="gs-num">${QUESTIONS.length}</div><div class="gs-label">总种子</div></div>
    <div class="gs-item"><div class="gs-num" style="color:${due ? "var(--rose)" : "var(--green-deep)"}">${due}</div><div class="gs-label">待浇水</div></div>
    <div class="gs-tip">${tips}</div>`;

  const grid = document.getElementById("plot-grid");
  grid.innerHTML = "";
  SEED_DATA.chapters.forEach(ch => {
    const s = chapterStats(ch.id);
    const ratio = s.total ? s.learned / s.total : 0;
    const stage = PLANT_STAGES[Math.min(5, Math.floor(ratio * 5) + (s.learned > 0 ? 1 : 0))] || "🟫";
    const div = document.createElement("div");
    div.className = "plot";
    div.innerHTML = `
      <div class="plot-head"><span class="plot-emoji">${s.learned === 0 ? "🟫" : stage}</span>
        <span class="plot-title">${ch.id}. ${ch.title}</span></div>
      <div class="growbar"><i style="width:${Math.round(ratio * 100)}%"></i></div>
      <div class="plot-meta"><span>${s.learned}/${s.total} · 开花 ${s.mastered}</span>
        ${s.due ? `<span class="plot-due">💧 ${s.due} 待浇</span>` : "<span>✓</span>"}</div>`;
    div.addEventListener("click", () => {
      selectedChapters.clear(); selectedChapters.add(ch.id);
      showView("practice");
      startPractice();
    });
    grid.appendChild(div);
  });

  renderStats();
  refreshBadges();
}

function renderStats() {
  // 12 周热力图
  const hm = document.getElementById("heatmap");
  hm.innerHTML = "";
  const end = new Date();
  const start = new Date(); start.setDate(end.getDate() - 7 * 12 + 1);
  while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
  const d = new Date(start);
  while (d <= end) {
    const n = state.log[todayStr(d)] || 0;
    const lv = n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 12 ? 3 : 4;
    const cell = document.createElement("div");
    cell.className = "hm-cell" + (lv ? " hm-" + lv : "");
    cell.title = `${todayStr(d)}：${n} 次`;
    hm.appendChild(cell);
    d.setDate(d.getDate() + 1);
  }
  // 各章成长条
  const bars = document.getElementById("chapter-bars");
  bars.innerHTML = "";
  SEED_DATA.chapters.forEach(ch => {
    const s = chapterStats(ch.id);
    const pct = s.total ? Math.round((s.learned / s.total) * 100) : 0;
    const row = document.createElement("div");
    row.className = "cbar-row";
    row.innerHTML = `<div class="cbar-label">${ch.id}. ${ch.title}</div>
      <div class="cbar-track"><i style="width:${pct}%"></i></div>
      <div class="cbar-num">${s.learned}/${s.total}</div>`;
    bars.appendChild(row);
  });
}

/* ── 通用答题卡 ─────────────────────────────── */
function questionCard(q, { index, total, onRated, onSkip }) {
  const p = state.progress[q.id] || {};
  const ans = getAnswer(q);
  const wrap = document.createElement("div");
  wrap.className = "card qcard";
  wrap.innerHTML = `
    <div class="qcard-top">
      <span class="qcard-chapter">${q.ch}. ${q.chTitle}</span>
      <span>${index + 1} / ${total}</span>
    </div>
    <div class="qtopic">🏷 ${q.topic}${p.reps ? ` · 已复习 ${p.reps} 次` : ""}</div>
    <div class="qtext">${esc(q.text)}</div>
    <textarea class="answer-box" placeholder="先在心里（或这里）作答，再看参考答案对照。写下的要点会存为笔记。">${p.note ? esc(p.note) : ""}</textarea>
    ${p.note ? `<div class="saved-note"><b>上次的笔记</b>${esc(p.note)}</div>` : ""}
    <button class="ans-toggle" type="button">${ans.label}<i class="ans-arrow">▾</i></button>
    <div class="ans-panel" hidden>${rich(ans.text)}${ans.exact ? "" : `<p class="ans-hint">这题暂无逐题答案，以上是本章考点与通用答题框架。对照后把你的答案要点写进笔记，就是你的专属答案。</p>`}</div>
    <div class="rate-row">
      <button class="rate-btn r1"><b>🌧 模糊</b><small>明天再见</small></button>
      <button class="rate-btn r2"><b>⛅ 基本会</b><small>几天后复习</small></button>
      <button class="rate-btn r3"><b>☀️ 熟练</b><small>拉长间隔</small></button>
    </div>
    <div class="qcard-actions">
      <button class="btn ghost skip">跳过 →</button>
    </div>`;
  const ta = wrap.querySelector(".answer-box");
  const tg = wrap.querySelector(".ans-toggle");
  const panel = wrap.querySelector(".ans-panel");
  tg.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    tg.querySelector(".ans-arrow").textContent = panel.hidden ? "▾" : "▴";
  });
  wrap.querySelectorAll(".rate-btn").forEach((btn, i) => {
    btn.addEventListener("click", () => { rate(q.id, i + 1, ta.value); onRated(i + 1); });
  });
  wrap.querySelector(".skip").addEventListener("click", onSkip);
  return wrap;
}

function doneCard(title, sub, actions = []) {
  const div = document.createElement("div");
  div.className = "card empty";
  div.innerHTML = `<div class="big">🌼</div><h3>${title}</h3><p class="muted">${sub}</p>`;
  const row = document.createElement("div");
  row.style.marginTop = "18px";
  actions.forEach(([label, fn, primary]) => {
    const b = document.createElement("button");
    b.className = "btn" + (primary ? " primary" : "");
    b.style.margin = "0 6px";
    b.textContent = label;
    b.addEventListener("click", fn);
    row.appendChild(b);
  });
  div.appendChild(row);
  return div;
}

/* ── 浇水（到期复习）─────────────────────────── */
let reviewQueue = [];
function renderReview() {
  reviewQueue = dueList();
  stepReview(0);
  refreshBadges();
}
function stepReview(i) {
  const area = document.getElementById("review-area");
  area.innerHTML = "";
  if (i >= reviewQueue.length) {
    area.appendChild(doneCard(
      reviewQueue.length ? "浇水完成！" : "今天没有到期的植物",
      reviewQueue.length ? `完成了 ${reviewQueue.length} 题复习，花园更精神了。` : "去播种页学点新的，或者明天再来。",
      [["去播种 🌱", () => showView("practice"), true], ["回花园", () => showView("garden")]]
    ));
    refreshBadges();
    return;
  }
  area.appendChild(questionCard(reviewQueue[i], {
    index: i, total: reviewQueue.length,
    onRated: () => { stepReview(i + 1); refreshBadges(); },
    onSkip: () => stepReview(i + 1),
  }));
}

/* ── 播种（刷题）─────────────────────────── */
const selectedChapters = new Set();
function renderPracticePicker() {
  document.getElementById("practice-area").hidden = true;
  document.getElementById("practice-picker").hidden = false;
  const row = document.getElementById("chapter-chips");
  row.innerHTML = "";
  SEED_DATA.chapters.forEach(ch => {
    const s = chapterStats(ch.id);
    const chip = document.createElement("button");
    chip.className = "chip" + (selectedChapters.has(ch.id) ? " on" : "");
    chip.textContent = `${ch.id}. ${ch.title} (${s.learned}/${s.total})`;
    chip.addEventListener("click", () => {
      selectedChapters.has(ch.id) ? selectedChapters.delete(ch.id) : selectedChapters.add(ch.id);
      chip.classList.toggle("on");
    });
    row.appendChild(chip);
  });
}
document.getElementById("btn-start-practice").addEventListener("click", startPractice);

let practiceQueue = [];
function startPractice() {
  const chosen = selectedChapters.size ? [...selectedChapters] : SEED_DATA.chapters.map(c => c.id);
  let qs = QUESTIONS.filter(q => chosen.includes(q.ch));
  if (document.getElementById("opt-unseen").checked) qs = qs.filter(q => !state.progress[q.id]?.last);
  if (document.getElementById("opt-shuffle").checked) qs = qs.slice().sort(() => Math.random() - 0.5);
  practiceQueue = qs.slice(0, 20); // 每轮最多 20 题，避免无限刷
  document.getElementById("practice-picker").hidden = true;
  const area = document.getElementById("practice-area");
  area.hidden = false;
  if (!practiceQueue.length) {
    area.innerHTML = "";
    area.appendChild(doneCard("这块地已经种满了", "所选范围内没有未学的题目。取消勾选「只看未学过的」可以重刷。", [["返回选择", renderPracticePicker, true]]));
    return;
  }
  stepPractice(0);
}
function stepPractice(i) {
  const area = document.getElementById("practice-area");
  area.innerHTML = "";
  if (i >= practiceQueue.length) {
    area.appendChild(doneCard("本轮播种完成 🌱", `学习了 ${practiceQueue.length} 题，它们已进入复习计划。`,
      [["再来一轮", startPractice, true], ["回花园", () => showView("garden")]]));
    refreshBadges();
    return;
  }
  area.appendChild(questionCard(practiceQueue[i], {
    index: i, total: practiceQueue.length,
    onRated: () => { stepPractice(i + 1); refreshBadges(); },
    onSkip: () => stepPractice(i + 1),
  }));
}

/* ── 学堂（知识框架）───────────────────────── */
let kbSelected = KNOWLEDGE[0]?.id;
function renderKnowledge() {
  const chips = document.getElementById("kb-chips");
  chips.innerHTML = "";
  KNOWLEDGE.forEach(dom => {
    const chip = document.createElement("button");
    chip.className = "chip" + (dom.id === kbSelected ? " on" : "");
    chip.textContent = `${dom.icon} ${dom.title}`;
    chip.addEventListener("click", () => { kbSelected = dom.id; renderKnowledge(); });
    chips.appendChild(chip);
  });
  const box = document.getElementById("kb-content");
  box.innerHTML = "";
  const dom = KNOWLEDGE.find(d => d.id === kbSelected) || KNOWLEDGE[0];
  if (!dom) return;
  const head = document.createElement("div");
  head.className = "card kb-head";
  head.innerHTML = `<h2>${dom.icon} ${dom.title}</h2><p class="muted">${esc(dom.intro)}</p>`;
  box.appendChild(head);
  dom.sections.forEach((sec, i) => {
    const item = document.createElement("div");
    item.className = "card acc-item" + (i === 0 ? " open" : "");
    item.innerHTML = `
      <button class="acc-head" type="button"><span>${esc(sec.h)}</span><i>${i === 0 ? "▴" : "▾"}</i></button>
      <div class="acc-body" ${i === 0 ? "" : "hidden"}>${sec.b.map(rich).join("")}</div>`;
    const headBtn = item.querySelector(".acc-head");
    const body = item.querySelector(".acc-body");
    headBtn.addEventListener("click", () => {
      body.hidden = !body.hidden;
      item.classList.toggle("open", !body.hidden);
      headBtn.querySelector("i").textContent = body.hidden ? "▾" : "▴";
    });
    box.appendChild(item);
  });
}

/* ── 案例 · 收藏 ─────────────────────────── */
let casesTab = "builtin";
document.querySelectorAll("#view-cases .tab-btn").forEach(b => {
  b.addEventListener("click", () => { casesTab = b.dataset.tab; renderCases(); });
});
function renderCases() {
  document.querySelectorAll("#view-cases .tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === casesTab));
  document.getElementById("cases-builtin").hidden = casesTab !== "builtin";
  document.getElementById("cases-mine").hidden = casesTab !== "mine";
  if (casesTab === "builtin") renderBuiltinCases();
  else renderCollection();
}
function renderBuiltinCases() {
  const box = document.getElementById("cases-builtin");
  box.innerHTML = "";
  CASES.forEach(cs => {
    const item = document.createElement("div");
    item.className = "card acc-item";
    item.innerHTML = `
      <button class="acc-head" type="button">
        <span>${esc(cs.title)}<span class="tag-row">${cs.tags.map(t => `<em class="tag">${esc(t)}</em>`).join("")}</span></span><i>▾</i>
      </button>
      <div class="acc-body" hidden>
        ${cs.sections.map(s => `<h4 class="case-h">${esc(s.h)}</h4>${rich(s.b)}`).join("")}
      </div>`;
    const headBtn = item.querySelector(".acc-head");
    const body = item.querySelector(".acc-body");
    headBtn.addEventListener("click", () => {
      body.hidden = !body.hidden;
      item.classList.toggle("open", !body.hidden);
      headBtn.querySelector("i").textContent = body.hidden ? "▾" : "▴";
    });
    box.appendChild(item);
  });
}
document.getElementById("btn-add-collection").addEventListener("click", () => {
  const title = document.getElementById("col-title").value.trim();
  if (!title) { toast("标题不能为空"); return; }
  const url = document.getElementById("col-url").value.trim();
  const tags = document.getElementById("col-tags").value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  const note = document.getElementById("col-note").value.trim();
  state.collection.unshift({ id: Date.now(), title, url, tags, note, created: todayStr() });
  save();
  ["col-title", "col-url", "col-tags", "col-note"].forEach(id => document.getElementById(id).value = "");
  toast("已收藏 ⭐");
  renderCollection();
});
function renderCollection() {
  const box = document.getElementById("collection-list");
  box.innerHTML = "";
  if (!state.collection.length) {
    box.appendChild(doneCard("收藏夹还是空的", "看到好文章、好拆解、好案例，把标题和链接存进来，配一句「为什么值得收藏」。", []));
    return;
  }
  state.collection.forEach(item => {
    const div = document.createElement("div");
    div.className = "note-item";
    const titleHtml = item.url
      ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)} ↗</a>`
      : esc(item.title);
    div.innerHTML = `
      <div class="note-q">${titleHtml}</div>
      ${item.note ? `<div class="note-body">${esc(item.note)}</div>` : ""}
      <div class="note-meta">
        <span>${item.tags.map(t => `<em class="tag">${esc(t)}</em>`).join("")}</span>
        <span>🕐 ${item.created} <button class="mini-btn del" data-id="${item.id}">删除</button></span>
      </div>`;
    div.querySelector(".del").addEventListener("click", () => {
      if (!confirm("删除这条收藏？")) return;
      state.collection = state.collection.filter(c => c.id !== item.id);
      save(); renderCollection();
    });
    box.appendChild(div);
  });
}

/* ── 笔记：思绪 + 答题笔记 ─────────────────── */
let notesTab = "thoughts";
let thoughtType = "疑问";
document.querySelectorAll("#view-notes .tab-btn").forEach(b => {
  b.addEventListener("click", () => { notesTab = b.dataset.ntab; renderNotes(); });
});
document.querySelectorAll("#thought-type-row .chip").forEach(c => {
  c.addEventListener("click", () => {
    thoughtType = c.dataset.ttype;
    document.querySelectorAll("#thought-type-row .chip").forEach(x => x.classList.toggle("on", x === c));
  });
});
document.getElementById("btn-add-thought").addEventListener("click", () => {
  const ta = document.getElementById("thought-input");
  const text = ta.value.trim();
  if (!text) { toast("先写点什么吧"); return; }
  state.thoughts.unshift({ id: Date.now(), type: thoughtType, text, created: todayStr() });
  save();
  ta.value = "";
  toast("已记录 💭");
  renderThoughts();
});

const THOUGHT_ICONS = { "疑问": "❓", "想法": "💡", "复盘": "🔄" };
function renderNotes() {
  document.querySelectorAll("#view-notes .tab-btn").forEach(b => b.classList.toggle("active", b.dataset.ntab === notesTab));
  document.getElementById("notes-thoughts").hidden = notesTab !== "thoughts";
  document.getElementById("notes-answers").hidden = notesTab !== "answers";
  if (notesTab === "thoughts") renderThoughts();
  else renderAnswerNotes();
}

function renderThoughts() {
  const kw = document.getElementById("note-search").value.trim().toLowerCase();
  const box = document.getElementById("thoughts-list");
  box.innerHTML = "";
  const items = state.thoughts.filter(t => !kw || t.text.toLowerCase().includes(kw) || t.type.includes(kw));
  if (!items.length) {
    box.appendChild(doneCard(kw ? "没有匹配的记录" : "还没有思绪记录",
      kw ? "换个关键词试试。" : "学习中的疑问、灵光一闪的想法、项目复盘——想到就记，别让它溜走。", []));
    return;
  }
  items.forEach(t => {
    const div = document.createElement("div");
    div.className = "note-item thought-item";
    div.innerHTML = `
      <div class="note-meta thought-top">
        <span class="tag t-${esc(t.type)}">${THOUGHT_ICONS[t.type] || "💭"} ${esc(t.type)}</span>
        <span>🕐 ${t.created}${t.updated ? ` · 改于 ${t.updated}` : ""}
          <button class="mini-btn edit">编辑</button>
          <button class="mini-btn del">删除</button></span>
      </div>
      <div class="note-body thought-text">${esc(t.text)}</div>`;
    div.querySelector(".del").addEventListener("click", () => {
      if (!confirm("删除这条记录？")) return;
      state.thoughts = state.thoughts.filter(x => x.id !== t.id);
      save(); renderThoughts();
    });
    div.querySelector(".edit").addEventListener("click", () => {
      const body = div.querySelector(".thought-text");
      if (div.querySelector(".edit-ta")) return;
      body.innerHTML = `<textarea class="input ta edit-ta">${esc(t.text)}</textarea>
        <div class="edit-actions"><button class="btn primary sm save-edit">保存</button>
        <button class="btn ghost sm cancel-edit">取消</button></div>`;
      div.querySelector(".save-edit").addEventListener("click", () => {
        const v = div.querySelector(".edit-ta").value.trim();
        if (!v) { toast("内容不能为空"); return; }
        t.text = v; t.updated = todayStr();
        save(); renderThoughts();
      });
      div.querySelector(".cancel-edit").addEventListener("click", renderThoughts);
    });
    box.appendChild(div);
  });
}

function renderAnswerNotes() {
  const list = document.getElementById("notes-list");
  const kw = document.getElementById("note-search").value.trim().toLowerCase();
  const items = Object.entries(state.progress)
    .filter(([, p]) => p.note)
    .map(([qid, p]) => ({ q: QMAP[qid], p }))
    .filter(x => x.q)
    .filter(x => !kw || x.q.text.toLowerCase().includes(kw) || x.p.note.toLowerCase().includes(kw))
    .sort((a, b) => (b.p.last || "").localeCompare(a.p.last || ""));
  list.innerHTML = "";
  if (!items.length) {
    list.appendChild(doneCard("还没有答题笔记", "答题时在输入框里写下的要点，会自动沉淀到这里。", [["去播种 🌱", () => showView("practice"), true]]));
    return;
  }
  items.forEach(({ q, p }) => {
    const div = document.createElement("div");
    div.className = "note-item";
    div.innerHTML = `
      <div class="note-q">${esc(q.text)}</div>
      <div class="note-body">${esc(p.note)}</div>
      <div class="note-meta"><span>🏷 ${q.chTitle} / ${q.topic}</span><span>🕐 ${p.last || ""}</span></div>`;
    list.appendChild(div);
  });
}
document.getElementById("note-search").addEventListener("input", renderNotes);

/* ── 导出 / 备份 ─────────────────────────── */
document.getElementById("btn-export-notes").addEventListener("click", () => {
  let md = `# 硬件 PM 知识花园 · 笔记导出\n\n> 导出时间：${todayStr()}\n\n`;
  if (state.thoughts.length) {
    md += `## 💭 思绪（疑问 / 想法 / 复盘）\n\n`;
    state.thoughts.forEach(t => { md += `### [${t.type}] ${t.created}\n\n${t.text}\n\n`; });
  }
  const byCh = {};
  Object.entries(state.progress).forEach(([qid, p]) => {
    if (!p.note || !QMAP[qid]) return;
    const q = QMAP[qid];
    (byCh[q.chTitle] = byCh[q.chTitle] || []).push(`### ${q.text}\n\n${p.note}\n`);
  });
  if (Object.keys(byCh).length) {
    md += `## ✍️ 答题笔记\n\n`;
    Object.entries(byCh).forEach(([ch, notes]) => { md += `### ${ch}\n\n${notes.join("\n")}\n`; });
  }
  if (state.collection.length) {
    md += `## ⭐ 收藏\n\n`;
    state.collection.forEach(c => {
      md += `- **${c.title}**${c.url ? ` — ${c.url}` : ""}${c.tags.length ? `（${c.tags.join(", ")}）` : ""}${c.note ? `\n  ${c.note}` : ""}\n`;
    });
  }
  download(`硬件PM笔记-${todayStr()}.md`, md, "text/markdown");
  toast("笔记已导出");
});

document.getElementById("btn-export-data").addEventListener("click", () => {
  download(`garden-backup-${todayStr()}.json`, JSON.stringify(state), "application/json");
  toast("备份已下载");
});
document.getElementById("import-file").addEventListener("change", e => {
  const f = e.target.files[0]; if (!f) return;
  f.text().then(txt => {
    const data = JSON.parse(txt);
    if (!data.progress) throw new Error("bad file");
    Object.assign(state, data);
    if (!Array.isArray(state.thoughts)) state.thoughts = [];
    if (!Array.isArray(state.collection)) state.collection = [];
    save();
    toast("备份已恢复"); renderNotes(); refreshBadges();
  }).catch(() => toast("文件格式不对"));
  e.target.value = "";
});

function download(name, content, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}

/* ── 启动 ─────────────────────────────── */
renderGarden();
refreshBadges();
if (dueList().length) toast(`💧 有 ${dueList().length} 题到期待复习`);
