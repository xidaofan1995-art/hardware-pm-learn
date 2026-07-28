(() => {
  'use strict';

  const DATA = window.HPM_DATA;
  const STORAGE_KEY = 'hardwarePmLabStateV1';
  const DB_NAME = 'hardwarePmLabFiles';
  const DB_VERSION = 1;
  const FILE_STORE = 'files';

  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const nowDate = () => new Date().toISOString().slice(0, 10);
  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  const defaultState = () => ({
    version: 1,
    projects: clone(DATA.sampleProjects),
    currentProjectId: DATA.sampleProjects[0].id,
    competitors: clone(DATA.sampleCompetitors),
    suppliers: clone(DATA.sampleSuppliers),
    traceability: clone(DATA.sampleTraceability),
    documents: [
      { id: 'doc-demo-1', projectId: 'project-smart-lock', name: '智能门锁市场调研摘要.md', type: '市场调研报告', stageId: 'market-user', version: 'V1.0', status: '已通过', owner: 'Simon', createdAt: '2026-07-20', updatedAt: '2026-07-22', size: 18240, source: '示例元数据', excerpt: '示例文档：用于展示交付件归档、搜索与阶段完成度。请上传真实报告替换。', fileStored: false },
      { id: 'doc-demo-2', projectId: 'project-smart-lock', name: '竞品对比矩阵.xlsx', type: '竞品对比矩阵', stageId: 'competition', version: 'V0.8', status: '待评审', owner: 'Simon', createdAt: '2026-07-23', updatedAt: '2026-07-23', size: 24576, source: '示例元数据', excerpt: '示例竞品矩阵。', fileStored: false }
    ],
    stageTasks: {},
    stageSelection: {},
    promptRuns: [],
    decisions: [],
    settings: { firstVisit: nowDate() }
  });

  let state = loadState();
  let currentView = location.hash.replace('#', '') || 'overview';
  let intelligenceTab = 'competitors';
  let selectedPromptId = DATA.prompts[0].id;
  let selectedLearningStageId = DATA.stages[0].id;
  let generatedPrompt = '';
  let deferredInstallPrompt = null;

  const root = document.getElementById('view-root');
  const titleEl = document.getElementById('view-title');
  const eyebrowEl = document.getElementById('view-eyebrow');
  const projectSwitcher = document.getElementById('project-switcher');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');
  const modalTitle = document.getElementById('modal-title');
  const modalEyebrow = document.getElementById('modal-eyebrow');
  const fileInput = document.getElementById('global-file-input');

  const viewMeta = {
    overview: ['Portfolio', '项目组合中心'],
    workspace: ['Stage-Gate', '智能硬件开发沙盘'],
    intelligence: ['Intelligence', '竞品与供应链'],
    traceability: ['Traceability', '需求—规格—测试追溯'],
    deliverables: ['Deliverables', '项目交付件中心'],
    prompts: ['AI Workspace', '专业提示词库'],
    learning: ['Learning', '阶段学习中心'],
    search: ['Knowledge Retrieval', '全局查询与归档'],
    settings: ['Local Data', '数据、备份与PWA设置']
  };

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || !Array.isArray(parsed.projects)) return defaultState();
      return { ...defaultState(), ...parsed };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderProjectSwitcher();
  }

  function currentProject() {
    return state.projects.find(project => project.id === state.currentProjectId) || state.projects[0];
  }

  function currentStage(project = currentProject()) {
    const selected = state.stageSelection[project.id] || project.currentStage || DATA.stages[0].id;
    return DATA.stages.find(stage => stage.id === selected) || DATA.stages[0];
  }

  function projectProgress(project) {
    const done = DATA.stages.filter(stage => project.stageStatus?.[stage.id] === 'done').length;
    return Math.round((done / DATA.stages.length) * 100);
  }

  function statusBadge(status) {
    const map = {
      '正常': 'green', '已完成': 'green', 'done': 'green', '已通过': 'green', '已发布': 'green',
      '关注': 'amber', '待评审': 'amber', 'review': 'amber', '进行中': 'blue', 'active': 'blue', '探索中': 'purple',
      '高风险': 'red', '暂停': 'red', '已作废': 'gray', '草稿': 'gray', '待补充': 'amber', '待测试': 'amber', '设计中': 'blue'
    };
    return `<span class="badge ${map[status] || 'gray'}">${escapeHtml(status)}</span>`;
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function openModal(title, eyebrow, html) {
    modalTitle.textContent = title;
    modalEyebrow.textContent = eyebrow;
    modalBody.innerHTML = html;
    if (!modal.open) modal.showModal();
  }

  function closeModal() {
    if (modal.open) modal.close();
    modalBody.innerHTML = '';
  }

  function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function formatBytes(bytes = 0) {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(FILE_STORE)) db.createObjectStore(FILE_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function putFile(id, file) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readwrite');
      tx.objectStore(FILE_STORE).put(file, id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function getFile(id) {
    const db = await openDb();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readonly');
      const request = tx.objectStore(FILE_STORE).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  }

  async function removeFile(id) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FILE_STORE, 'readwrite');
      tx.objectStore(FILE_STORE).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  function renderProjectSwitcher() {
    projectSwitcher.innerHTML = state.projects.map(project => `<option value="${escapeHtml(project.id)}" ${project.id === state.currentProjectId ? 'selected' : ''}>${escapeHtml(project.name)}</option>`).join('');
  }

  function setView(view, updateHash = true) {
    currentView = viewMeta[view] ? view : 'overview';
    if (updateHash) history.replaceState(null, '', `#${currentView}`);
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === currentView));
    const [eyebrow, title] = viewMeta[currentView];
    eyebrowEl.textContent = eyebrow;
    titleEl.textContent = title;
    document.getElementById('sidebar').classList.remove('open');
    renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderCurrentView() {
    const renderers = {
      overview: renderOverview,
      workspace: renderWorkspace,
      intelligence: renderIntelligence,
      traceability: renderTraceability,
      deliverables: renderDeliverables,
      prompts: renderPrompts,
      learning: renderLearning,
      search: renderSearch,
      settings: renderSettings
    };
    renderers[currentView]();
  }

  function renderOverview() {
    const projects = state.projects;
    const active = projects.filter(project => !['已完成', '暂停'].includes(project.status)).length;
    const highRisk = projects.filter(project => project.health === '高风险').length;
    const formalDocs = state.documents.filter(doc => ['已通过', '已发布'].includes(doc.status)).length;
    const avgProgress = projects.length ? Math.round(projects.reduce((sum, item) => sum + projectProgress(item), 0) / projects.length) : 0;

    root.innerHTML = `
      <div class="page-head">
        <div><h2>多项目产品开发总览</h2><p>从产品机会到上市复盘，统一查看项目健康度、阶段进度、交付件和关键风险。</p></div>
        <div class="page-actions"><button class="btn" id="overview-export">导出组合摘要</button><button class="btn primary" id="overview-new">＋ 新建项目</button></div>
      </div>
      <section class="metrics-grid">
        ${metric('项目总数', projects.length, `${active} 个处于活跃状态`, '◫')}
        ${metric('平均完成度', `${avgProgress}%`, '按Stage-Gate完成阶段计算', '↗')}
        ${metric('正式交付件', formalDocs, `共归档 ${state.documents.length} 份文档`, '▤')}
        ${metric('高风险项目', highRisk, highRisk ? '需要管理层关注' : '当前无高风险项目', '!')}
      </section>
      <section class="grid-2">
        <div class="panel">
          <div class="panel-head"><div><h3>项目组合</h3><p>点击项目进入对应开发沙盘。</p></div><span class="badge blue">${projects.length} Projects</span></div>
          <div class="project-grid">
            ${projects.map(projectCard).join('') || emptyState('暂无项目', '创建第一个智能硬件开发项目。')}
          </div>
        </div>
        <div class="stack">
          <div class="panel">
            <div class="panel-head"><div><h3>组合健康度</h3><p>按进度、成本、质量、技术、供应链和市场综合判断。</p></div></div>
            <div class="health-list">
              ${projects.map(project => `
                <div class="health-row">
                  <span class="row-icon">${project.health === '正常' ? '✓' : project.health === '高风险' ? '!' : '△'}</span>
                  <div class="row-main"><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(currentStage(project).title)} · ${projectProgress(project)}%</small></div>
                  ${statusBadge(project.health)}
                </div>`).join('')}
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><div><h3>最近交付件</h3><p>本机归档的最新项目资料。</p></div><button class="link-btn" data-go="deliverables">查看全部</button></div>
            <div class="activity-list">
              ${state.documents.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5).map(doc => `
                <div class="activity-row">
                  <span class="row-icon">▤</span>
                  <div class="row-main"><strong>${escapeHtml(doc.name)}</strong><small>${escapeHtml(projectName(doc.projectId))} · ${escapeHtml(doc.version)}</small></div>
                  ${statusBadge(doc.status)}
                </div>`).join('') || '<div class="empty">暂无交付件</div>'}
            </div>
          </div>
        </div>
      </section>`;

    document.getElementById('overview-new').addEventListener('click', openNewProjectModal);
    document.getElementById('overview-export').addEventListener('click', exportPortfolioSummary);
    root.querySelectorAll('[data-project-open]').forEach(button => button.addEventListener('click', () => {
      state.currentProjectId = button.dataset.projectOpen;
      saveState();
      setView('workspace');
    }));
    root.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => setView(button.dataset.go)));
  }

  function metric(label, value, note, icon) {
    return `<article class="metric-card"><div class="metric-label"><span>${label}</span><span>${icon}</span></div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></article>`;
  }

  function projectCard(project) {
    const progress = projectProgress(project);
    const stage = currentStage(project);
    return `<article class="project-card ${project.id === state.currentProjectId ? 'current' : ''}">
      <div class="project-top"><div><h3 class="project-name">${escapeHtml(project.name)}</h3><div class="project-code">${escapeHtml(project.code)} · ${escapeHtml(project.category)}</div></div>${statusBadge(project.health)}</div>
      <div class="project-meta">
        <div><span>当前阶段</span><b>${escapeHtml(stage.no)} · ${escapeHtml(stage.title)}</b></div>
        <div><span>计划上市</span><b>${escapeHtml(project.launchDate || '待定')}</b></div>
        <div><span>目标市场</span><b>${escapeHtml(project.market || '待补充')}</b></div>
        <div><span>负责人</span><b>${escapeHtml(project.owner || '待分配')}</b></div>
      </div>
      <div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div>
      <div class="project-foot"><span>${progress}% 已完成</span><button class="link-btn" data-project-open="${project.id}">进入沙盘 →</button></div>
    </article>`;
  }

  function renderWorkspace() {
    const project = currentProject();
    if (!project) return;
    const stage = currentStage(project);
    const stageDocs = state.documents.filter(doc => doc.projectId === project.id && doc.stageId === stage.id);
    const taskState = getStageTaskState(project.id, stage.id);
    const stageTasks = [
      `阅读“${stage.title}”阶段知识`,
      ...stage.required.map(item => `准备并评审《${item}》`),
      '记录本阶段关键决策、风险与待确认项'
    ];
    const requiredStatus = stage.required.map(type => ({ type, docs: stageDocs.filter(doc => doc.type === type) }));

    root.innerHTML = `
      <div class="page-head">
        <div><h2>${escapeHtml(project.name)}</h2><p>${escapeHtml(project.code)} · ${escapeHtml(project.market)} · ${escapeHtml(project.channel)}</p></div>
        <div class="page-actions"><button class="btn" id="edit-project">编辑项目</button><button class="btn primary" id="archive-project">导出项目交付包</button></div>
      </div>
      <section class="panel">
        <div class="panel-head"><div><h3>Stage-Gate开发地图</h3><p>14个阶段与项目管理、成本、供应链、质量、变更和配置管理横向贯穿。</p></div><span class="badge blue">${projectProgress(project)}% 完成</span></div>
        <div class="stage-map">
          ${DATA.stages.map(item => {
            const status = project.stageStatus?.[item.id] || '';
            return `<button class="stage-node ${status} ${item.id === stage.id ? 'active' : ''}" data-stage="${item.id}"><span class="stage-state"></span><span class="stage-no">${item.no} · ${item.phase}</span><span class="stage-name">${item.icon} ${item.title}</span><span class="stage-phase">${status === 'done' ? '已通过' : status === 'review' ? '待评审' : status === 'active' ? '进行中' : '未开始'}</span></button>`;
          }).join('')}
        </div>
      </section>
      <section class="workspace-layout">
        <div class="stack">
          <article class="stage-hero">
            <div class="stage-hero-top"><div><span class="stage-kicker">Stage ${stage.no} · ${stage.phase}</span><h2>${stage.icon} ${stage.title}</h2><p>${escapeHtml(stage.summary)}</p></div>${statusBadge(project.stageStatus?.[stage.id] || '未开始')}</div>
            <div class="stage-hero-actions"><button class="btn white" id="stage-upload">上传阶段资料</button><button class="btn glass" id="stage-prompt">生成AI提示词</button><button class="btn glass" id="stage-gate">发起Gate评审</button></div>
          </article>

          <div class="grid-equal">
            <div class="panel">
              <div class="panel-head"><div><h3>阶段任务</h3><p>采用“学—做—交—评”的项目制学习方式。</p></div></div>
              <div class="task-list">
                ${stageTasks.map((task, index) => `<label class="task-item"><input type="checkbox" data-task-index="${index}" ${taskState[index] ? 'checked' : ''}><span><strong>${escapeHtml(task)}</strong><small>${index === 0 ? '学习' : index === stageTasks.length - 1 ? '评审' : '交付件'}</small></span></label>`).join('')}
              </div>
            </div>
            <div class="panel">
              <div class="panel-head"><div><h3>必需交付件</h3><p>有正式证据后才能通过阶段Gate。</p></div><span class="badge ${requiredStatus.every(item => item.docs.length) ? 'green' : 'amber'}">${requiredStatus.filter(item => item.docs.length).length}/${requiredStatus.length}</span></div>
              <div class="deliverable-list">
                ${requiredStatus.map(item => `<div class="deliverable-item"><div class="deliverable-main"><span class="doc-icon">${item.docs.length ? '✓' : '＋'}</span><div><strong>${escapeHtml(item.type)}</strong><small>${item.docs.length ? `${item.docs.length} 个版本 · ${item.docs[0].status}` : '尚未上传'}</small></div></div><button class="btn small ${item.docs.length ? '' : 'soft'}" data-upload-type="${escapeHtml(item.type)}">${item.docs.length ? '查看' : '上传'}</button></div>`).join('')}
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><div><h3>本阶段资料与产物</h3><p>上传原始报告、AI生成结果、评审记录或正式交付件。</p></div><button class="btn small" id="stage-all-docs">进入交付件中心</button></div>
            ${stageDocs.length ? `<div class="table-wrap"><table><thead><tr><th>文件</th><th>类型</th><th>版本</th><th>状态</th><th>更新日期</th><th></th></tr></thead><tbody>${stageDocs.map(docRow).join('')}</tbody></table></div>` : emptyState('本阶段暂无资料', '上传报告或使用提示词生成文档后回填。')}
          </div>
        </div>

        <aside class="stack">
          <div class="panel">
            <div class="panel-head"><div><h3>阶段知识</h3><p>理解为什么做、谁参与、输入输出和常见错误。</p></div></div>
            <div class="knowledge-grid">
              <div class="knowledge-box full"><h4>为什么重要</h4><p>${escapeHtml(stage.learn.why)}</p></div>
              ${knowledgeList('参与角色', stage.learn.roles)}
              ${knowledgeList('关键输入', stage.learn.inputs)}
              ${knowledgeList('阶段输出', stage.learn.outputs)}
              ${knowledgeList('常用方法', stage.learn.methods)}
              ${knowledgeList('常见错误', stage.learn.pitfalls)}
            </div>
          </div>
          <div class="quiz-card">
            <strong>阶段小测</strong>
            <p>${escapeHtml(stage.learn.quiz.question)}</p>
            <div class="quiz-options">${stage.learn.quiz.options.map((option, index) => `<button class="quiz-option" data-quiz="${index}">${String.fromCharCode(65 + index)}. ${escapeHtml(option)}</button>`).join('')}</div>
          </div>
          <div class="callout warning"><strong>AI边界：</strong>市场数字、报价、测试结果、认证结论、供应商定点和量产放行必须以真实资料及人工评审为准。</div>
        </aside>
      </section>`;

    root.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => {
      state.stageSelection[project.id] = button.dataset.stage;
      saveState(); renderWorkspace();
    }));
    root.querySelectorAll('[data-task-index]').forEach(input => input.addEventListener('change', () => {
      const tasks = getStageTaskState(project.id, stage.id);
      tasks[Number(input.dataset.taskIndex)] = input.checked;
      setStageTaskState(project.id, stage.id, tasks);
    }));
    root.querySelectorAll('[data-upload-type]').forEach(button => button.addEventListener('click', () => {
      const exists = stageDocs.some(doc => doc.type === button.dataset.uploadType);
      if (exists) setView('deliverables'); else openUploadModal(stage.id, button.dataset.uploadType);
    }));
    root.querySelectorAll('[data-doc-download]').forEach(button => button.addEventListener('click', () => downloadStoredDocument(button.dataset.docDownload)));
    root.querySelectorAll('[data-quiz]').forEach(button => button.addEventListener('click', () => handleQuiz(button, stage.learn.quiz.answer)));
    document.getElementById('stage-upload').addEventListener('click', () => openUploadModal(stage.id));
    document.getElementById('stage-prompt').addEventListener('click', () => {
      selectedPromptId = stage.prompts[0] || DATA.prompts[0].id;
      setView('prompts');
    });
    document.getElementById('stage-gate').addEventListener('click', () => openGateReview(project, stage));
    document.getElementById('stage-all-docs').addEventListener('click', () => setView('deliverables'));
    document.getElementById('edit-project').addEventListener('click', () => openEditProjectModal(project));
    document.getElementById('archive-project').addEventListener('click', () => exportProjectArchive(project.id));
  }

  function knowledgeList(title, items) {
    return `<div class="knowledge-box"><h4>${title}</h4><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`;
  }

  function getStageTaskState(projectId, stageId) {
    state.stageTasks[projectId] ||= {};
    state.stageTasks[projectId][stageId] ||= {};
    return state.stageTasks[projectId][stageId];
  }

  function setStageTaskState(projectId, stageId, tasks) {
    state.stageTasks[projectId] ||= {};
    state.stageTasks[projectId][stageId] = tasks;
    saveState();
  }

  function handleQuiz(button, answer) {
    const group = button.parentElement.querySelectorAll('.quiz-option');
    group.forEach((item, index) => {
      item.disabled = true;
      if (index === answer) item.classList.add('correct');
      else if (item === button) item.classList.add('wrong');
    });
    showToast(Number(button.dataset.quiz) === answer ? '回答正确，已掌握关键概念。' : '答案已标出，建议复习本阶段知识。');
  }

  function openGateReview(project, stage) {
    const docs = state.documents.filter(doc => doc.projectId === project.id && doc.stageId === stage.id);
    const missing = stage.required.filter(type => !docs.some(doc => doc.type === type && ['待评审', '评审中', '已通过', '已发布'].includes(doc.status)));
    const blockers = docs.filter(doc => ['待补充', '草稿'].includes(doc.status)).length;
    openModal(`${stage.title} Gate评审`, `Stage ${stage.no}`, `
      <div class="metrics-grid">
        ${metric('必需交付件', stage.required.length, `${stage.required.length - missing.length} 份已具备`, '▤')}
        ${metric('缺失交付件', missing.length, missing.length ? '必须补充后再放行' : '交付件完整', '!')}
        ${metric('草稿/待补充', blockers, blockers ? '需要继续评审' : '无明显阻塞', '△')}
        ${metric('当前状态', project.stageStatus?.[stage.id] || '未开始', '阶段配置状态', '◎')}
      </div>
      ${missing.length ? `<div class="callout danger-callout"><strong>阻塞项：</strong>${missing.map(item => escapeHtml(item)).join('、')}</div>` : '<div class="callout"><strong>交付件检查通过：</strong>可以由负责人确认阶段放行。</div>'}
      <div class="panel" style="margin-top:16px"><h3>评审检查表</h3><div class="task-list">
        ${['结论有真实证据支持', '上游输入与本阶段产物一致', '关键风险已分配责任人与关闭条件', '正式版本和配置基线清晰', '下阶段输入已经准备'].map(item => `<label class="task-item"><input type="checkbox" class="gate-check"><span><strong>${item}</strong></span></label>`).join('')}
      </div></div>
      <div class="form-actions"><button class="btn" id="gate-review-state">标记为待评审</button><button class="btn primary" id="gate-pass" ${missing.length ? 'disabled' : ''}>通过并进入下一阶段</button></div>`);
    document.getElementById('gate-review-state').addEventListener('click', () => {
      project.stageStatus ||= {};
      project.stageStatus[stage.id] = 'review';
      saveState(); closeModal(); renderWorkspace(); showToast('阶段已标记为待评审。');
    });
    const pass = document.getElementById('gate-pass');
    if (pass) pass.addEventListener('click', () => {
      const checks = [...modalBody.querySelectorAll('.gate-check')];
      if (!checks.every(input => input.checked)) return showToast('请先完成全部评审检查项。');
      project.stageStatus ||= {};
      project.stageStatus[stage.id] = 'done';
      const index = DATA.stages.findIndex(item => item.id === stage.id);
      const next = DATA.stages[index + 1];
      if (next) {
        project.stageStatus[next.id] = project.stageStatus[next.id] || 'active';
        project.currentStage = next.id;
        state.stageSelection[project.id] = next.id;
      } else {
        project.status = '已完成';
        project.health = '正常';
      }
      saveState(); closeModal(); renderWorkspace(); showToast('Gate评审通过，已进入下一阶段。');
    });
  }

  function renderIntelligence() {
    const project = currentProject();
    const competitors = state.competitors.filter(item => item.projectId === project.id);
    const suppliers = state.suppliers.filter(item => item.projectId === project.id);
    root.innerHTML = `
      <div class="page-head"><div><h2>竞品情报与供应链资源池</h2><p>围绕当前项目维护持续更新的竞争情报、供应商验证证据和风险状态。</p></div><div class="page-actions"><button class="btn" id="intelligence-import">上传调研资料</button><button class="btn primary" id="intelligence-add">＋ 新增${intelligenceTab === 'competitors' ? '竞品' : '供应商'}</button></div></div>
      <div class="tabs"><button class="tab ${intelligenceTab === 'competitors' ? 'active' : ''}" data-intel-tab="competitors">竞品库 (${competitors.length})</button><button class="tab ${intelligenceTab === 'suppliers' ? 'active' : ''}" data-intel-tab="suppliers">供应商池 (${suppliers.length})</button></div>
      ${intelligenceTab === 'competitors' ? renderCompetitorPanel(competitors) : renderSupplierPanel(suppliers)}`;
    root.querySelectorAll('[data-intel-tab]').forEach(button => button.addEventListener('click', () => { intelligenceTab = button.dataset.intelTab; renderIntelligence(); }));
    document.getElementById('intelligence-add').addEventListener('click', () => intelligenceTab === 'competitors' ? openCompetitorModal() : openSupplierModal());
    document.getElementById('intelligence-import').addEventListener('click', () => openUploadModal(intelligenceTab === 'competitors' ? 'competition' : 'supply-cost', intelligenceTab === 'competitors' ? '竞品分析报告' : '供应链调研报告'));
    root.querySelectorAll('[data-delete-competitor]').forEach(button => button.addEventListener('click', () => {
      state.competitors = state.competitors.filter(item => item.id !== button.dataset.deleteCompetitor); saveState(); renderIntelligence();
    }));
    root.querySelectorAll('[data-delete-supplier]').forEach(button => button.addEventListener('click', () => {
      state.suppliers = state.suppliers.filter(item => item.id !== button.dataset.deleteSupplier); saveState(); renderIntelligence();
    }));
  }

  function renderCompetitorPanel(items) {
    return `<section class="panel"><div class="panel-head"><div><h3>竞品档案</h3><p>公开信息仅作为线索，未知字段不得推定为不支持。</p></div><span class="badge purple">持续更新</span></div>
      ${items.length ? `<div class="table-wrap"><table><thead><tr><th>品牌 / 产品</th><th>价格 / 市场</th><th>定位与渠道</th><th>优势</th><th>弱点</th><th>证据</th><th></th></tr></thead><tbody>${items.map(item => `<tr><td><strong>${escapeHtml(item.brand)}</strong><br><span>${escapeHtml(item.product)}</span></td><td>${escapeHtml(item.price)}<br><span class="badge gray">${escapeHtml(item.market)}</span></td><td>${escapeHtml(item.positioning)}<br><small>${escapeHtml(item.channel)}</small></td><td>${escapeHtml(item.strengths)}</td><td>${escapeHtml(item.weaknesses)}</td><td>${escapeHtml(item.source)}<br>${statusBadge(item.confidence)}</td><td><button class="btn small danger" data-delete-competitor="${item.id}">删除</button></td></tr>`).join('')}</tbody></table></div>` : emptyState('暂无竞品', '添加竞品档案或上传竞品分析报告。')}</section>`;
  }

  function renderSupplierPanel(items) {
    return `<section class="panel"><div class="panel-head"><div><h3>供应商资源池</h3><p>评分不能代替样品、审厂和量产验证，证据状态必须保留。</p></div><span class="badge amber">RFI → RFQ → 样品 → 定点</span></div>
      ${items.length ? `<div class="table-wrap"><table><thead><tr><th>供应商</th><th>类型 / 地区</th><th>技术</th><th>质量</th><th>成本</th><th>交付</th><th>配合</th><th>状态 / 风险</th><th></th></tr></thead><tbody>${items.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.type)}<br><small>${escapeHtml(item.region)}</small></td><td><span class="score">${item.technology}</span></td><td><span class="score">${item.quality}</span></td><td><span class="score">${item.cost}</span></td><td><span class="score">${item.delivery}</span></td><td><span class="score">${item.collaboration}</span></td><td>${statusBadge(item.status)}<br><small>${escapeHtml(item.risk)}</small></td><td><button class="btn small danger" data-delete-supplier="${item.id}">删除</button></td></tr>`).join('')}</tbody></table></div>` : emptyState('暂无供应商', '添加供应商或上传供应链调研资料。')}</section>`;
  }

  function openCompetitorModal() {
    openModal('新增竞品档案', 'Competitive Intelligence', `
      <div class="form-grid">
        ${field('品牌', 'comp-brand', '', true)}${field('产品/型号', 'comp-product', '', true)}
        ${field('价格', 'comp-price', '')}${field('市场', 'comp-market', currentProject().market)}
        ${field('渠道', 'comp-channel', '')}${field('产品定位', 'comp-positioning', '')}
        ${field('主要优势', 'comp-strengths', '', false, true)}${field('主要弱点', 'comp-weaknesses', '', false, true)}
        ${field('信息来源', 'comp-source', '')}${selectField('可信度', 'comp-confidence', ['待验证', '部分验证', '已验证'])}
      </div><div class="form-actions"><button class="btn" id="cancel-comp">取消</button><button class="btn primary" id="save-comp">保存竞品</button></div>`);
    document.getElementById('cancel-comp').addEventListener('click', closeModal);
    document.getElementById('save-comp').addEventListener('click', () => {
      const brand = valueOf('comp-brand'); const product = valueOf('comp-product');
      if (!brand || !product) return showToast('品牌和产品名称为必填项。');
      state.competitors.unshift({ id: uid('comp'), projectId: state.currentProjectId, brand, product, price: valueOf('comp-price'), market: valueOf('comp-market'), channel: valueOf('comp-channel'), positioning: valueOf('comp-positioning'), strengths: valueOf('comp-strengths'), weaknesses: valueOf('comp-weaknesses'), source: valueOf('comp-source') || '用户录入', confidence: valueOf('comp-confidence') });
      saveState(); closeModal(); renderIntelligence(); showToast('竞品档案已保存。');
    });
  }

  function openSupplierModal() {
    openModal('新增供应商', 'Supply Chain', `
      <div class="form-grid">
        ${field('供应商名称', 'sup-name', '', true)}${field('供应商类型', 'sup-type', '', true)}
        ${field('地区', 'sup-region', '')}${selectField('验证状态', 'sup-status', ['线索', '初筛', 'RFI', 'RFQ', '样品评估', '审厂', '已定点'])}
        ${rangeField('技术能力', 'sup-technology', 3)}${rangeField('质量能力', 'sup-quality', 3)}
        ${rangeField('成本竞争力', 'sup-cost', 3)}${rangeField('交付能力', 'sup-delivery', 3)}
        ${rangeField('配合能力', 'sup-collaboration', 3)}${field('证据来源', 'sup-evidence', '')}
        ${field('主要风险', 'sup-risk', '', false, true)}
      </div><div class="form-actions"><button class="btn" id="cancel-sup">取消</button><button class="btn primary" id="save-sup">保存供应商</button></div>`);
    document.getElementById('cancel-sup').addEventListener('click', closeModal);
    document.getElementById('save-sup').addEventListener('click', () => {
      const name = valueOf('sup-name'); const type = valueOf('sup-type');
      if (!name || !type) return showToast('供应商名称和类型为必填项。');
      state.suppliers.unshift({ id: uid('sup'), projectId: state.currentProjectId, name, type, region: valueOf('sup-region'), technology: Number(valueOf('sup-technology')), quality: Number(valueOf('sup-quality')), cost: Number(valueOf('sup-cost')), delivery: Number(valueOf('sup-delivery')), collaboration: Number(valueOf('sup-collaboration')), status: valueOf('sup-status'), risk: valueOf('sup-risk'), evidence: valueOf('sup-evidence') || '用户录入' });
      saveState(); closeModal(); renderIntelligence(); showToast('供应商档案已保存。');
    });
  }

  function renderTraceability() {
    const project = currentProject();
    const rows = state.traceability.filter(item => item.projectId === project.id);
    const linked = rows.filter(item => item.requirementId && item.specId && item.testId).length;
    const passed = rows.filter(item => item.status === '已通过').length;
    const defects = rows.reduce((sum, item) => sum + Number(item.defects || 0), 0);
    root.innerHTML = `
      <div class="page-head"><div><h2>需求—规格—测试追溯</h2><p>确保每项用户与产品需求都被技术规格承接，并由测试用例验证。</p></div><div class="page-actions"><button class="btn" id="trace-import">导入矩阵</button><button class="btn primary" id="trace-add">＋ 新增追溯项</button></div></div>
      <section class="metrics-grid">${metric('需求条目', rows.length, '当前项目追溯项', 'R')}${metric('完整链路', linked, `${rows.length ? Math.round(linked / rows.length * 100) : 0}% 已关联`, '⇄')}${metric('测试通过', passed, '已完成验证的条目', '✓')}${metric('关联缺陷', defects, defects ? '仍需闭环' : '暂无登记缺陷', '!')}</section>
      <section class="panel"><div class="panel-head"><div><h3>追溯矩阵</h3><p>示例仅用于学习。正式规格和测试结果必须来自项目真实资料。</p></div><span class="badge blue">RTM</span></div>
        ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>需求</th><th>技术规格</th><th>测试验证</th><th>状态</th><th>缺陷</th><th></th></tr></thead><tbody>${rows.map(row => `<tr><td><strong>${escapeHtml(row.requirementId)}</strong><br>${escapeHtml(row.requirement)}</td><td><strong>${escapeHtml(row.specId || '待展开')}</strong><br>${escapeHtml(row.specification || '—')}</td><td><strong>${escapeHtml(row.testId || '待设计')}</strong><br>${escapeHtml(row.test || '—')}</td><td>${statusBadge(row.status)}</td><td><span class="score">${Number(row.defects || 0)}</span></td><td><button class="btn small danger" data-trace-delete="${row.id}">删除</button></td></tr>`).join('')}</tbody></table></div>` : emptyState('暂无追溯项', '从PRD、技术规格书和测试计划中建立追溯关系。')}
      </section>`;
    document.getElementById('trace-add').addEventListener('click', openTraceModal);
    document.getElementById('trace-import').addEventListener('click', () => openUploadModal('validation', '需求追溯矩阵'));
    root.querySelectorAll('[data-trace-delete]').forEach(button => button.addEventListener('click', () => {
      state.traceability = state.traceability.filter(item => item.id !== button.dataset.traceDelete); saveState(); renderTraceability();
    }));
  }

  function openTraceModal() {
    openModal('新增追溯项', 'Requirement Traceability', `
      <div class="form-grid">
        ${field('需求编号', 'trace-req-id', '', true)}${field('需求描述', 'trace-req', '', true)}
        ${field('规格编号', 'trace-spec-id', '')}${field('技术规格', 'trace-spec', '')}
        ${field('测试编号', 'trace-test-id', '')}${field('测试方法', 'trace-test', '')}
        ${selectField('验证状态', 'trace-status', ['待展开', '设计中', '待测试', '测试中', '已通过', '未通过'])}${field('缺陷数量', 'trace-defects', '0')}
      </div><div class="form-actions"><button class="btn" id="cancel-trace">取消</button><button class="btn primary" id="save-trace">保存追溯项</button></div>`);
    document.getElementById('cancel-trace').addEventListener('click', closeModal);
    document.getElementById('save-trace').addEventListener('click', () => {
      if (!valueOf('trace-req-id') || !valueOf('trace-req')) return showToast('需求编号和描述为必填项。');
      state.traceability.push({ id: uid('trace'), projectId: state.currentProjectId, requirementId: valueOf('trace-req-id'), requirement: valueOf('trace-req'), specId: valueOf('trace-spec-id'), specification: valueOf('trace-spec'), testId: valueOf('trace-test-id'), test: valueOf('trace-test'), status: valueOf('trace-status'), defects: Number(valueOf('trace-defects') || 0) });
      saveState(); closeModal(); renderTraceability(); showToast('追溯项已保存。');
    });
  }

  function renderDeliverables() {
    const project = currentProject();
    const projectDocs = state.documents.filter(doc => doc.projectId === project.id);
    const formal = projectDocs.filter(doc => ['已通过', '已发布'].includes(doc.status)).length;
    const stagesCovered = new Set(projectDocs.map(doc => doc.stageId)).size;
    root.innerHTML = `
      <div class="page-head"><div><h2>项目交付件中心</h2><p>管理原始资料、AI生成初稿、评审状态、正式版本和最终项目归档。</p></div><div class="page-actions"><button class="btn" id="docs-archive">导出项目交付包</button><button class="btn primary" id="docs-upload">＋ 上传文档</button></div></div>
      <section class="metrics-grid">${metric('文档总数', projectDocs.length, '当前项目本机归档', '▤')}${metric('正式版本', formal, '已通过或已发布', '✓')}${metric('覆盖阶段', `${stagesCovered}/${DATA.stages.length}`, '已有资料的开发阶段', '◎')}${metric('本地文件', projectDocs.filter(doc => doc.fileStored).length, '存储在IndexedDB', '↧')}</section>
      <section class="panel">
        <div class="upload-zone" id="upload-zone"><strong>拖拽文件到这里，或点击选择</strong><p>支持PDF、Office、Markdown、JSON、CSV、文本和图片。纯前端版本只自动读取文本类内容，PDF/Office保留原文件与元数据。</p><button class="btn soft" id="upload-zone-btn">选择文件</button></div>
      </section>
      <section class="panel" style="margin-top:18px">
        <div class="filter-bar"><input class="input" id="doc-search" type="search" placeholder="搜索文件名、类型、摘要…"><select class="select" id="doc-stage"><option value="">全部阶段</option>${DATA.stages.map(stage => `<option value="${stage.id}">${stage.no} ${stage.title}</option>`).join('')}</select><select class="select" id="doc-status"><option value="">全部状态</option>${['草稿','待补充','待评审','评审中','已通过','已发布','已作废','已归档'].map(item => `<option>${item}</option>`).join('')}</select><select class="select" id="doc-type"><option value="">全部类型</option>${DATA.deliverableTypes.map(item => `<option>${escapeHtml(item)}</option>`).join('')}</select><button class="btn" id="doc-clear">重置</button></div>
        <div id="doc-table-host">${renderDocumentsTable(projectDocs)}</div>
      </section>`;
    const zone = document.getElementById('upload-zone');
    ['dragenter', 'dragover'].forEach(eventName => zone.addEventListener(eventName, event => { event.preventDefault(); zone.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(eventName => zone.addEventListener(eventName, event => { event.preventDefault(); zone.classList.remove('drag'); }));
    zone.addEventListener('drop', event => handleFiles(event.dataTransfer.files));
    document.getElementById('upload-zone-btn').addEventListener('click', () => openUploadModal());
    document.getElementById('docs-upload').addEventListener('click', () => openUploadModal());
    document.getElementById('docs-archive').addEventListener('click', () => exportProjectArchive(project.id));
    ['doc-search','doc-stage','doc-status','doc-type'].forEach(id => document.getElementById(id).addEventListener('input', filterDocuments));
    document.getElementById('doc-clear').addEventListener('click', () => { ['doc-search','doc-stage','doc-status','doc-type'].forEach(id => document.getElementById(id).value = ''); filterDocuments(); });
    bindDocumentActions();
  }

  function renderDocumentsTable(docs) {
    if (!docs.length) return emptyState('暂无交付件', '上传真实资料，或使用AI提示词生成初稿后回填。');
    return `<div class="table-wrap"><table><thead><tr><th>文件 / 类型</th><th>阶段</th><th>版本</th><th>状态</th><th>负责人</th><th>更新时间</th><th>大小</th><th></th></tr></thead><tbody>${docs.slice().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map(docRow).join('')}</tbody></table></div>`;
  }

  function docRow(doc) {
    const stage = DATA.stages.find(item => item.id === doc.stageId);
    return `<tr><td><strong>${escapeHtml(doc.name)}</strong><br><small>${escapeHtml(doc.type)}</small></td><td>${stage ? `${stage.no} ${escapeHtml(stage.title)}` : '未分类'}</td><td>${escapeHtml(doc.version)}</td><td>${statusBadge(doc.status)}</td><td>${escapeHtml(doc.owner || '—')}</td><td>${escapeHtml(doc.updatedAt)}</td><td>${formatBytes(doc.size)}</td><td><div class="table-actions"><button class="btn small" data-doc-edit="${doc.id}">编辑</button>${doc.fileStored ? `<button class="btn small" data-doc-download="${doc.id}">下载</button>` : ''}<button class="btn small danger" data-doc-delete="${doc.id}">删除</button></div></td></tr>`;
  }

  function bindDocumentActions() {
    root.querySelectorAll('[data-doc-edit]').forEach(button => button.addEventListener('click', () => openEditDocumentModal(button.dataset.docEdit)));
    root.querySelectorAll('[data-doc-download]').forEach(button => button.addEventListener('click', () => downloadStoredDocument(button.dataset.docDownload)));
    root.querySelectorAll('[data-doc-delete]').forEach(button => button.addEventListener('click', () => deleteDocument(button.dataset.docDelete)));
  }

  function filterDocuments() {
    const query = document.getElementById('doc-search').value.trim().toLowerCase();
    const stage = document.getElementById('doc-stage').value;
    const status = document.getElementById('doc-status').value;
    const type = document.getElementById('doc-type').value;
    const docs = state.documents.filter(doc => doc.projectId === state.currentProjectId)
      .filter(doc => !stage || doc.stageId === stage)
      .filter(doc => !status || doc.status === status)
      .filter(doc => !type || doc.type === type)
      .filter(doc => !query || [doc.name, doc.type, doc.excerpt, doc.owner, doc.version].join(' ').toLowerCase().includes(query));
    document.getElementById('doc-table-host').innerHTML = renderDocumentsTable(docs);
    bindDocumentActions();
  }

  function openUploadModal(stageId = '', suggestedType = '') {
    const project = currentProject();
    openModal('上传项目资料', 'Deliverable Intake', `
      <div class="callout"><strong>处理原则：</strong>纯前端PWA将文件保存在本机IndexedDB。文本、Markdown、JSON和CSV会提取内容用于搜索；PDF与Office文件保存原文件和元数据，不会虚构解析结果。</div>
      <div class="form-grid" style="margin-top:16px">
        ${selectField('所属阶段', 'upload-stage', DATA.stages.map(item => `${item.id}|${item.no} ${item.title}`), stageId, true)}
        ${selectField('交付件类型', 'upload-type', DATA.deliverableTypes, suggestedType)}
        ${field('版本号', 'upload-version', 'V0.1')}
        ${selectField('文档状态', 'upload-status', ['草稿','待补充','待评审','评审中','已通过','已发布','已归档'], '草稿')}
        ${field('负责人', 'upload-owner', project.owner || '')}
        ${field('来源说明', 'upload-source', '用户上传')}
        <div class="form-field full"><label for="upload-excerpt">内容摘要 / AI结果粘贴</label><textarea class="textarea" id="upload-excerpt" placeholder="可粘贴AI生成报告摘要、关键结论或人工说明。文本类文件上传后会自动提取。"></textarea></div>
        <div class="form-field full"><label>选择文件</label><div class="upload-zone"><strong id="upload-file-label">尚未选择文件</strong><p>可一次选择多个文件；将使用相同的阶段、类型和状态。</p><button class="btn soft" id="modal-select-file">选择文件</button></div></div>
      </div><div class="form-actions"><button class="btn" id="cancel-upload">取消</button><button class="btn primary" id="save-upload">保存资料</button></div>`);
    let selectedFiles = [];
    document.getElementById('cancel-upload').addEventListener('click', closeModal);
    document.getElementById('modal-select-file').addEventListener('click', () => fileInput.click());
    fileInput.onchange = () => {
      selectedFiles = [...fileInput.files];
      document.getElementById('upload-file-label').textContent = selectedFiles.length ? `${selectedFiles.length} 个文件：${selectedFiles.map(file => file.name).join('、')}` : '尚未选择文件';
      fileInput.value = '';
    };
    document.getElementById('save-upload').addEventListener('click', async () => {
      const excerpt = valueOf('upload-excerpt');
      if (!selectedFiles.length && !excerpt) return showToast('请选择文件或粘贴AI结果内容。');
      const config = { stageId: parseSelectValue(valueOf('upload-stage')), type: valueOf('upload-type') || '其他资料', version: valueOf('upload-version') || 'V0.1', status: valueOf('upload-status'), owner: valueOf('upload-owner'), source: valueOf('upload-source'), excerpt };
      if (selectedFiles.length) await handleFiles(selectedFiles, config.stageId, config.type, config);
      else addTextDocument(config);
      closeModal();
      if (currentView === 'deliverables') renderDeliverables(); else renderCurrentView();
    });
  }

  async function handleFiles(fileList, stageId = '', suggestedType = '', config = {}) {
    const files = [...fileList];
    for (const file of files) {
      const id = uid('doc');
      let excerpt = config.excerpt || '';
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['txt', 'md', 'json', 'csv'].includes(ext) || file.type.startsWith('text/')) {
        try { excerpt = (await file.text()).slice(0, 50000); } catch { }
      }
      let fileStored = false;
      try { await putFile(id, file); fileStored = true; } catch { showToast(`文件 ${file.name} 本地保存失败，仅记录元数据。`); }
      state.documents.unshift({
        id, projectId: state.currentProjectId, name: file.name,
        type: suggestedType || guessDeliverableType(file.name), stageId: stageId || currentStage().id,
        version: config.version || 'V0.1', status: config.status || '草稿', owner: config.owner || currentProject().owner,
        createdAt: nowDate(), updatedAt: nowDate(), size: file.size, source: config.source || '用户上传', excerpt,
        mime: file.type, fileStored
      });
    }
    saveState(); showToast(`已归档 ${files.length} 个文件。`);
    if (currentView === 'deliverables') renderDeliverables();
  }

  function addTextDocument(config) {
    const id = uid('doc');
    state.documents.unshift({ id, projectId: state.currentProjectId, name: `${config.type}-${nowDate()}.md`, type: config.type, stageId: config.stageId || currentStage().id, version: config.version, status: config.status, owner: config.owner || currentProject().owner, createdAt: nowDate(), updatedAt: nowDate(), size: new Blob([config.excerpt]).size, source: config.source || 'AI结果回填', excerpt: config.excerpt, mime: 'text/markdown', fileStored: false });
    saveState(); showToast('AI结果已作为文本交付件归档。');
  }

  function guessDeliverableType(name) {
    const lower = name.toLowerCase();
    const rules = [
      ['市场', '市场调研报告'], ['竞品', '竞品分析报告'], ['用户', '用户研究报告'], ['mrd', 'MRD'], ['prd', 'PRD'], ['立项', '产品立项书'],
      ['cmf', 'CMF规范'], ['id', 'ID设计任务书'], ['规格', '产品技术规格书'], ['bom', 'BOM成本分析'], ['供应商', '供应商评价'],
      ['测试', '测试计划'], ['evt', '阶段验证报告'], ['dvt', '阶段验证报告'], ['pvt', '阶段验证报告'], ['npi', 'NPI检查表'], ['上市', '上市计划'], ['复盘', '上市复盘报告']
    ];
    return rules.find(([key]) => lower.includes(key))?.[1] || '其他资料';
  }

  async function downloadStoredDocument(id) {
    const doc = state.documents.find(item => item.id === id);
    if (!doc) return;
    if (!doc.fileStored) {
      downloadText(doc.name.endsWith('.md') ? doc.name : `${doc.name}.md`, doc.excerpt || '该记录只包含元数据。');
      return;
    }
    try {
      const file = await getFile(id);
      if (!file) return showToast('本机未找到原文件，可能来自其他设备或浏览器。');
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = doc.name; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { showToast('读取本地文件失败。'); }
  }

  function openEditDocumentModal(id) {
    const doc = state.documents.find(item => item.id === id);
    if (!doc) return;
    openModal('编辑交付件元数据', 'Document Control', `
      <div class="form-grid">
        ${field('文件名称', 'edit-doc-name', doc.name, true)}
        ${selectField('交付件类型', 'edit-doc-type', DATA.deliverableTypes.concat(['其他资料']), doc.type)}
        ${selectField('所属阶段', 'edit-doc-stage', DATA.stages.map(item => `${item.id}|${item.no} ${item.title}`), doc.stageId, true)}
        ${field('版本号', 'edit-doc-version', doc.version)}
        ${selectField('状态', 'edit-doc-status', ['草稿','待补充','待评审','评审中','已通过','已发布','已作废','已归档'], doc.status)}
        ${field('负责人', 'edit-doc-owner', doc.owner)}
        ${field('来源说明', 'edit-doc-source', doc.source)}
        <div class="form-field full"><label for="edit-doc-excerpt">摘要 / 可搜索内容</label><textarea id="edit-doc-excerpt" class="textarea">${escapeHtml(doc.excerpt || '')}</textarea></div>
      </div><div class="form-actions"><button class="btn" id="cancel-doc-edit">取消</button><button class="btn primary" id="save-doc-edit">保存修改</button></div>`);
    document.getElementById('cancel-doc-edit').addEventListener('click', closeModal);
    document.getElementById('save-doc-edit').addEventListener('click', () => {
      doc.name = valueOf('edit-doc-name'); doc.type = valueOf('edit-doc-type'); doc.stageId = parseSelectValue(valueOf('edit-doc-stage')); doc.version = valueOf('edit-doc-version'); doc.status = valueOf('edit-doc-status'); doc.owner = valueOf('edit-doc-owner'); doc.source = valueOf('edit-doc-source'); doc.excerpt = valueOf('edit-doc-excerpt'); doc.updatedAt = nowDate();
      saveState(); closeModal(); renderCurrentView(); showToast('文档元数据已更新。');
    });
  }

  async function deleteDocument(id) {
    if (!confirm('确认删除该文档记录？本机保存的原文件也会删除。')) return;
    state.documents = state.documents.filter(item => item.id !== id);
    try { await removeFile(id); } catch { }
    saveState(); renderCurrentView(); showToast('文档已删除。');
  }

  function renderPrompts() {
    const selected = DATA.prompts.find(item => item.id === selectedPromptId) || DATA.prompts[0];
    selectedPromptId = selected.id;
    const project = currentProject();
    generatedPrompt = buildPrompt(selected, { evidenceMode: 'mixed', extra: '' });
    root.innerHTML = `
      <div class="page-head"><div><h2>专业AI提示词库</h2><p>提示词由统一专业规则、项目上下文、证据边界、文档任务和质量检查动态拼装。</p></div><div class="page-actions"><button class="btn" id="prompt-download">下载提示词</button><button class="btn primary" id="prompt-copy">复制提示词</button></div></div>
      <section class="prompt-layout">
        <div class="panel">
          <div class="filter-bar" style="grid-template-columns:1fr"><input class="input" id="prompt-search" type="search" placeholder="搜索提示词、阶段或类别…"></div>
          <div class="prompt-list" id="prompt-list">${renderPromptList(DATA.prompts, selected.id)}</div>
        </div>
        <div class="stack">
          <div class="panel">
            <div class="panel-head"><div><h3>${escapeHtml(selected.title)}</h3><p>${escapeHtml(selected.objective)}</p></div><span class="badge purple">${escapeHtml(selected.category)}</span></div>
            <div class="prompt-meta"><span class="badge blue">${escapeHtml(stageName(selected.stageId))}</span><span class="badge gray">输入 ${selected.inputs.length} 项</span><span class="badge gray">输出 ${selected.sections.length} 节</span></div>
            <div class="form-grid">
              ${selectField('证据模式', 'prompt-mode', ['mixed|基于上传资料，可补充专业建议', 'evidence|仅基于上传资料，不进行外部补充', 'research|允许联网调研并要求引用来源'], 'mixed', true)}
              ${field('输出语言', 'prompt-language', '简体中文')}
              <div class="form-field full"><label for="prompt-extra">额外要求</label><textarea class="textarea" id="prompt-extra" placeholder="例如：重点关注美国市场、B2B分销渠道、低功耗和FCC认证。"></textarea></div>
            </div>
            <div class="form-actions"><button class="btn soft" id="prompt-regenerate">重新生成</button></div>
          </div>
          <pre class="prompt-preview" id="prompt-preview">${escapeHtml(generatedPrompt)}</pre>
          <div class="callout"><strong>推荐流程：</strong>复制提示词到ChatGPT网页版深度研究或其他AI工具 → 下载Markdown/JSON结果 → 回到“交付件中心”上传并评审。</div>
        </div>
      </section>`;
    bindPromptList();
    document.getElementById('prompt-search').addEventListener('input', event => {
      const query = event.target.value.trim().toLowerCase();
      const filtered = DATA.prompts.filter(item => [item.title, item.category, stageName(item.stageId), item.objective].join(' ').toLowerCase().includes(query));
      document.getElementById('prompt-list').innerHTML = renderPromptList(filtered, selectedPromptId);
      bindPromptList();
    });
    document.getElementById('prompt-regenerate').addEventListener('click', () => {
      const template = DATA.prompts.find(item => item.id === selectedPromptId);
      generatedPrompt = buildPrompt(template, { evidenceMode: parseSelectValue(valueOf('prompt-mode')), language: valueOf('prompt-language'), extra: valueOf('prompt-extra') });
      document.getElementById('prompt-preview').textContent = generatedPrompt;
      showToast('提示词已按当前项目重新生成。');
    });
    document.getElementById('prompt-copy').addEventListener('click', copyGeneratedPrompt);
    document.getElementById('prompt-download').addEventListener('click', () => {
      recordPromptRun(selectedPromptId);
      downloadText(`${project.code}-${selected.title}.txt`, generatedPrompt);
    });
  }

  function renderPromptList(items, activeId) {
    return items.map(item => `<button class="prompt-item ${item.id === activeId ? 'active' : ''}" data-prompt-id="${item.id}"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(stageName(item.stageId))} · ${escapeHtml(item.category)}</small></button>`).join('') || '<div class="empty">没有匹配提示词</div>';
  }

  function bindPromptList() {
    root.querySelectorAll('[data-prompt-id]').forEach(button => button.addEventListener('click', () => { selectedPromptId = button.dataset.promptId; renderPrompts(); }));
  }

  function buildPrompt(template, options = {}) {
    const project = currentProject();
    const stage = DATA.stages.find(item => item.id === template.stageId);
    const docs = state.documents.filter(doc => doc.projectId === project.id);
    const evidenceMode = options.evidenceMode || 'mixed';
    const modeText = {
      evidence: '只能使用用户提供的文件和明确说明作为事实依据，不进行外部搜索或补充事实。',
      research: '允许进行外部研究，但所有关键数字、法规、市场和技术事实必须提供可核验来源及日期。',
      mixed: '以用户上传资料为主要事实依据；可以补充行业方法和专业建议，但必须与事实、推断和假设清晰区分。'
    }[evidenceMode];
    return `# 智能硬件项目专业文档生成任务\n\n你是一名资深智能硬件产品总监、硬件产品经理、项目经理、系统工程师、供应链与NPI顾问，熟悉从产品机会、市场调研、产品定义、ID/CMF、需求、系统规格、硬件结构软件开发、供应链、成本、质量、测试、认证、试产、量产到上市复盘的完整流程。\n\n## 一、任务名称\n生成《${template.title}》。\n\n## 二、任务目标\n${template.objective}\n\n## 三、项目上下文\n- 项目名称：${project.name}\n- 项目编号：${project.code}\n- 产品类别：${project.category || '待补充'}\n- 目标市场：${project.market || '待补充'}\n- 目标渠道：${project.channel || '待补充'}\n- 目标售价：${project.targetPrice || '待补充'}\n- 目标成本：${project.targetCost || '待补充'}\n- 计划上市时间：${project.launchDate || '待补充'}\n- 当前阶段：${stage.no} ${stage.title}\n- 项目负责人：${project.owner || '待分配'}\n- 当前项目状态：${project.status}\n- 当前健康度：${project.health}\n- 已归档资料：${docs.length ? docs.map(doc => `${doc.name}（${doc.type}/${doc.version}/${doc.status}）`).join('；') : '暂无，请将缺失信息标记为待补充'}\n\n## 四、证据边界\n${modeText}\n1. 不得虚构市场规模、销量、报价、供应商能力、测试结果、认证结果、用户反馈或项目结论。\n2. 对关键内容使用【事实】【归纳】【假设】【风险】【待确认】【建议】标签。\n3. 来自上传资料的信息应尽可能标明文件名、页码、章节或数据位置。\n4. 信息不足时使用“待补充”或“需要验证”，不得用看似准确的数字填充。\n5. 市场、成本、技术、供应链、质量、认证、隐私和网络安全之间存在冲突时，必须显式说明取舍。\n\n## 五、建议输入资料\n${template.inputs.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n## 六、输出结构\n${template.sections.map((item, index) => `### ${index + 1}. ${item}\n请给出结构化、可执行的内容；适合时使用表格，并标注证据状态、责任角色、优先级和待确认项。`).join('\n\n')}\n\n## 七、专业质量检查\n${template.checks.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n${options.extra ? `\n## 八、额外要求\n${options.extra}\n` : ''}\n## ${options.extra ? '九' : '八'}、统一输出要求\n1. 输出语言：${options.language || '简体中文'}。\n2. 先给出一页式管理层摘要，再给出完整正文。\n3. 结尾输出：关键结论、主要风险、待补充信息、下一阶段输入、人工评审清单。\n4. 同时给出可保存的Markdown正文，以及一个结构化JSON摘要。\n5. JSON缺失字段使用null；日期采用YYYY-MM-DD；需求、风险、问题、测试和决策使用唯一编号。\n6. 文档状态默认为“AI初稿/待评审”，不得标记为正式发布或项目放行。`;
  }

  async function copyGeneratedPrompt() {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      recordPromptRun(selectedPromptId);
      showToast('完整提示词已复制。');
    } catch {
      downloadText('hardware-pm-prompt.txt', generatedPrompt);
      showToast('浏览器不允许复制，已改为下载文本。');
    }
  }

  function recordPromptRun(promptId) {
    state.promptRuns.unshift({ id: uid('run'), promptId, projectId: state.currentProjectId, createdAt: new Date().toISOString() });
    state.promptRuns = state.promptRuns.slice(0, 100);
    saveState();
  }

  function renderLearning() {
    const stage = DATA.stages.find(item => item.id === selectedLearningStageId) || DATA.stages[0];
    root.innerHTML = `
      <div class="page-head"><div><h2>智能硬件开发学习中心</h2><p>知识内容与项目阶段、交付件和评审任务直接关联，避免脱离实际流程的碎片化学习。</p></div><div class="page-actions"><button class="btn primary" id="learning-open-stage">在沙盘中练习</button></div></div>
      <section class="grid-2">
        <div class="panel"><div class="panel-head"><div><h3>14阶段知识地图</h3><p>选择阶段查看角色、输入输出、方法和错误案例。</p></div></div><div class="stage-map" style="grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible">${DATA.stages.map(item => `<button class="stage-node ${item.id === stage.id ? 'active' : ''}" data-learn-stage="${item.id}"><span class="stage-no">${item.no} · ${item.phase}</span><span class="stage-name">${item.icon} ${item.title}</span><span class="stage-phase">${item.required.length}项核心交付件</span></button>`).join('')}</div></div>
        <div class="stack">
          <div class="stage-hero"><span class="stage-kicker">Stage ${stage.no}</span><h2>${stage.icon} ${stage.title}</h2><p>${escapeHtml(stage.summary)}</p></div>
          <div class="panel"><div class="knowledge-grid"><div class="knowledge-box full"><h4>为什么重要</h4><p>${escapeHtml(stage.learn.why)}</p></div>${knowledgeList('参与角色', stage.learn.roles)}${knowledgeList('关键输入', stage.learn.inputs)}${knowledgeList('阶段输出', stage.learn.outputs)}${knowledgeList('常用方法', stage.learn.methods)}${knowledgeList('常见错误', stage.learn.pitfalls)}</div></div>
          <div class="panel"><div class="panel-head"><div><h3>对应交付件与提示词</h3><p>学习后立刻进入文档生成和项目实践。</p></div></div><div class="deliverable-list">${stage.required.map(item => `<div class="deliverable-item"><div class="deliverable-main"><span class="doc-icon">▤</span><div><strong>${escapeHtml(item)}</strong><small>阶段正式输出</small></div></div></div>`).join('')}</div><div class="prompt-meta" style="margin-top:12px">${stage.prompts.map(id => { const p = DATA.prompts.find(item => item.id === id); return `<button class="btn small soft" data-learning-prompt="${id}">${escapeHtml(p?.title || id)}</button>`; }).join('')}</div></div>
        </div>
      </section>`;
    root.querySelectorAll('[data-learn-stage]').forEach(button => button.addEventListener('click', () => { selectedLearningStageId = button.dataset.learnStage; renderLearning(); }));
    root.querySelectorAll('[data-learning-prompt]').forEach(button => button.addEventListener('click', () => { selectedPromptId = button.dataset.learningPrompt; setView('prompts'); }));
    document.getElementById('learning-open-stage').addEventListener('click', () => { state.stageSelection[state.currentProjectId] = stage.id; saveState(); setView('workspace'); });
  }

  function renderSearch() {
    root.innerHTML = `
      <div class="search-hero"><span class="eyebrow" style="color:#8fb4ff">Unified Search</span><h2 style="margin:0">跨项目搜索产品开发资产</h2><p style="color:#cbd5e1">搜索文档内容、项目、竞品、供应商、需求、规格、测试和提示词。所有数据均来自当前浏览器本地。</p><div class="search-box"><input id="global-search-input" type="search" placeholder="例如：低温开锁、FCC、供应商、PRD…"><button class="btn primary" id="global-search-btn">搜索</button></div></div>
      <div id="search-results-host" class="search-results"><div class="empty"><span class="empty-icon">⌕</span>输入关键词开始查询。</div></div>`;
    const input = document.getElementById('global-search-input');
    document.getElementById('global-search-btn').addEventListener('click', () => executeSearch(input.value));
    input.addEventListener('keydown', event => { if (event.key === 'Enter') executeSearch(input.value); });
  }

  function executeSearch(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    const host = document.getElementById('search-results-host');
    if (!query) return host.innerHTML = '<div class="empty">请输入搜索关键词。</div>';
    const results = [];
    state.projects.forEach(item => pushSearch(results, '项目', item.name, `${item.code} ${item.category} ${item.market} ${item.channel} ${item.status} ${item.health}`, item.id, query));
    state.documents.forEach(item => pushSearch(results, '交付件', item.name, `${item.type} ${item.version} ${item.status} ${item.owner} ${item.excerpt || ''}`, item.projectId, query));
    state.competitors.forEach(item => pushSearch(results, '竞品', `${item.brand} ${item.product}`, `${item.price} ${item.market} ${item.positioning} ${item.strengths} ${item.weaknesses}`, item.projectId, query));
    state.suppliers.forEach(item => pushSearch(results, '供应商', item.name, `${item.type} ${item.region} ${item.status} ${item.risk} ${item.evidence}`, item.projectId, query));
    state.traceability.forEach(item => pushSearch(results, '追溯项', `${item.requirementId} ${item.requirement}`, `${item.specId} ${item.specification} ${item.testId} ${item.test} ${item.status}`, item.projectId, query));
    DATA.prompts.forEach(item => pushSearch(results, '提示词', item.title, `${item.objective} ${item.category} ${item.inputs.join(' ')} ${item.sections.join(' ')}`, state.currentProjectId, query, item.id));
    DATA.stages.forEach(item => pushSearch(results, '阶段知识', item.title, `${item.summary} ${item.learn.why} ${item.learn.roles.join(' ')} ${item.learn.pitfalls.join(' ')}`, state.currentProjectId, query, item.id));
    host.innerHTML = results.length ? results.slice(0, 100).map(result => `<article class="search-result"><div class="project-top"><div><span class="badge ${result.type === '交付件' ? 'blue' : result.type === '供应商' ? 'amber' : 'gray'}">${result.type}</span><h4>${highlight(result.title, query)}</h4></div><small>${escapeHtml(projectName(result.projectId))}</small></div><p>${highlight(result.text.slice(0, 280), query)}</p></article>`).join('') : '<div class="empty"><span class="empty-icon">∅</span>没有找到匹配结果。</div>';
  }

  function pushSearch(results, type, title, text, projectId, query, refId = '') {
    const haystack = `${title} ${text}`.toLowerCase();
    if (haystack.includes(query)) results.push({ type, title, text, projectId, refId });
  }

  function highlight(text, query) {
    const safe = escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safe.replace(new RegExp(escapedQuery, 'ig'), match => `<mark>${match}</mark>`);
  }

  function renderSettings() {
    const totalBytes = new Blob([JSON.stringify(state)]).size;
    root.innerHTML = `
      <div class="page-head"><div><h2>数据、备份与PWA设置</h2><p>本版本不需要服务器。项目数据保存在localStorage，上传原文件保存在IndexedDB。</p></div><div class="page-actions"><button class="btn primary" id="install-app" ${deferredInstallPrompt ? '' : 'disabled'}>安装PWA</button></div></div>
      <section class="grid-equal">
        <div class="panel"><div class="panel-head"><div><h3>本地数据</h3><p>浏览器和设备之间不会自动同步。</p></div><span class="badge green">Local-first</span></div><div class="metrics-grid" style="grid-template-columns:repeat(2,1fr)">${metric('项目', state.projects.length, '本地项目数量', '◫')}${metric('交付件', state.documents.length, '包含文件元数据', '▤')}${metric('状态数据', formatBytes(totalBytes), 'localStorage估算', '↧')}${metric('提示词执行', state.promptRuns.length, '最近100次记录', '✦')}</div><div class="page-actions"><button class="btn" id="export-data">导出完整JSON</button><button class="btn" id="import-data">导入备份</button><button class="btn danger" id="reset-data">恢复示例数据</button></div></div>
        <div class="panel"><div class="panel-head"><div><h3>PWA使用说明</h3><p>部署到GitHub Pages后支持安装和离线访问。</p></div></div><ol><li>用Chrome或Edge打开本页面。</li><li>浏览器出现安装按钮后点击“安装PWA”。</li><li>安卓端也可使用菜单中的“添加到主屏幕”。</li><li>离线状态下可继续学习、编辑项目和查看已缓存页面。</li></ol><div class="callout warning"><strong>跨设备同步：</strong>在旧设备导出JSON，在新设备导入；原始附件需单独保存或重新上传。</div></div>
        <div class="panel"><div class="panel-head"><div><h3>项目归档结构</h3><p>项目关闭时生成机器可读JSON和Markdown索引。</p></div></div><div class="archive-tree">项目交付包\n├── 01 市场与用户\n├── 02 竞品与产品定义\n├── 03 ID与需求规格\n├── 04 项目与供应链\n├── 05 测试与NPI\n├── 06 上市与复盘\n├── project-index.json\n└── project-index.md</div></div>
        <div class="panel"><div class="panel-head"><div><h3>AI与隐私边界</h3><p>本PWA首版不直接调用任何模型API。</p></div></div><ul><li>提示词由本地项目变量自动拼装。</li><li>用户自行复制到AI网页端执行。</li><li>AI结果回填后进入草稿、评审和正式发布流程。</li><li>市场数据、报价、测试、认证和放行必须人工确认。</li></ul></div>
      </section>`;
    document.getElementById('export-data').addEventListener('click', exportAllData);
    document.getElementById('import-data').addEventListener('click', importAllData);
    document.getElementById('reset-data').addEventListener('click', resetData);
    document.getElementById('install-app').addEventListener('click', installPwa);
  }

  function field(label, id, value = '', required = false, textarea = false) {
    return `<div class="form-field ${textarea ? 'full' : ''}"><label for="${id}">${label}${required ? ' *' : ''}</label>${textarea ? `<textarea class="textarea" id="${id}">${escapeHtml(value)}</textarea>` : `<input class="input" id="${id}" value="${escapeHtml(value)}" ${required ? 'required' : ''}>`}</div>`;
  }

  function selectField(label, id, options, selected = '', encoded = false) {
    return `<div class="form-field"><label for="${id}">${label}</label><select class="select" id="${id}">${options.map(option => {
      const [value, text] = encoded && String(option).includes('|') ? String(option).split('|') : [String(option), String(option)];
      return `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(text)}</option>`;
    }).join('')}</select></div>`;
  }

  function rangeField(label, id, value = 3) {
    return `<div class="form-field"><label for="${id}">${label}（1–5）</label><input class="input" id="${id}" type="number" min="1" max="5" value="${value}"></div>`;
  }

  function valueOf(id) { return document.getElementById(id)?.value?.trim() ?? ''; }
  function parseSelectValue(value) { return value.includes('|') ? value.split('|')[0] : value; }
  function projectName(id) { return state.projects.find(item => item.id === id)?.name || '未知项目'; }
  function stageName(id) { const stage = DATA.stages.find(item => item.id === id); return stage ? `${stage.no} ${stage.title}` : '未分类'; }
  function emptyState(title, description) { return `<div class="empty"><span class="empty-icon">◇</span><strong>${escapeHtml(title)}</strong><div>${escapeHtml(description)}</div></div>`; }

  function openNewProjectModal() {
    openModal('新建智能硬件项目', 'Project Intake', `
      <div class="form-grid">
        ${field('项目名称', 'new-name', '', true)}${field('项目编号', 'new-code', `HPM-${new Date().getFullYear()}-${String(state.projects.length + 1).padStart(3, '0')}`, true)}
        ${field('产品类别', 'new-category', '')}${field('负责人', 'new-owner', 'Simon')}
        ${field('目标市场', 'new-market', '')}${field('目标渠道', 'new-channel', '')}
        ${field('目标售价', 'new-price', '')}${field('目标成本', 'new-cost', '')}
        ${field('计划上市日期', 'new-launch', '')}${selectField('优先级', 'new-priority', ['P0','P1','P2','P3'], 'P1')}
      </div><div class="form-actions"><button class="btn" id="cancel-new">取消</button><button class="btn primary" id="save-new">创建项目</button></div>`);
    document.getElementById('cancel-new').addEventListener('click', closeModal);
    document.getElementById('save-new').addEventListener('click', () => {
      const name = valueOf('new-name'); const code = valueOf('new-code');
      if (!name || !code) return showToast('项目名称和编号为必填项。');
      const project = { id: uid('project'), name, code, category: valueOf('new-category') || '智能硬件', owner: valueOf('new-owner'), market: valueOf('new-market'), channel: valueOf('new-channel'), targetPrice: valueOf('new-price'), targetCost: valueOf('new-cost'), launchDate: valueOf('new-launch'), priority: valueOf('new-priority'), status: '探索中', currentStage: 'opportunity', health: '正常', stageStatus: { opportunity: 'active' } };
      state.projects.unshift(project); state.currentProjectId = project.id; saveState(); closeModal(); setView('workspace'); showToast('新项目已创建。');
    });
  }

  function openEditProjectModal(project) {
    openModal('编辑项目基本信息', 'Project Settings', `
      <div class="form-grid">
        ${field('项目名称', 'edit-name', project.name, true)}${field('项目编号', 'edit-code', project.code, true)}
        ${field('产品类别', 'edit-category', project.category)}${field('负责人', 'edit-owner', project.owner)}
        ${field('目标市场', 'edit-market', project.market)}${field('目标渠道', 'edit-channel', project.channel)}
        ${field('目标售价', 'edit-price', project.targetPrice)}${field('目标成本', 'edit-cost', project.targetCost)}
        ${field('计划上市日期', 'edit-launch', project.launchDate)}${selectField('健康度', 'edit-health', ['正常','关注','高风险'], project.health)}
      </div><div class="form-actions"><button class="btn" id="cancel-edit-project">取消</button><button class="btn primary" id="save-edit-project">保存项目</button></div>`);
    document.getElementById('cancel-edit-project').addEventListener('click', closeModal);
    document.getElementById('save-edit-project').addEventListener('click', () => {
      project.name = valueOf('edit-name'); project.code = valueOf('edit-code'); project.category = valueOf('edit-category'); project.owner = valueOf('edit-owner'); project.market = valueOf('edit-market'); project.channel = valueOf('edit-channel'); project.targetPrice = valueOf('edit-price'); project.targetCost = valueOf('edit-cost'); project.launchDate = valueOf('edit-launch'); project.health = valueOf('edit-health');
      saveState(); closeModal(); renderCurrentView(); showToast('项目信息已更新。');
    });
  }

  function exportPortfolioSummary() {
    const summary = { generatedAt: new Date().toISOString(), projects: state.projects.map(project => ({ ...project, progress: projectProgress(project), currentStageName: currentStage(project).title, documentCount: state.documents.filter(doc => doc.projectId === project.id).length, supplierCount: state.suppliers.filter(item => item.projectId === project.id).length, competitorCount: state.competitors.filter(item => item.projectId === project.id).length })) };
    downloadText(`hardware-pm-portfolio-${nowDate()}.json`, JSON.stringify(summary, null, 2), 'application/json');
  }

  function buildProjectArchive(projectId) {
    const project = state.projects.find(item => item.id === projectId);
    const docs = state.documents.filter(item => item.projectId === projectId);
    return {
      schemaVersion: '1.0', generatedAt: new Date().toISOString(), project,
      stageDefinitions: DATA.stages.map(stage => ({ id: stage.id, no: stage.no, title: stage.title, status: project.stageStatus?.[stage.id] || 'not-started', requiredDeliverables: stage.required, availableDocuments: docs.filter(doc => doc.stageId === stage.id).map(doc => ({ id: doc.id, name: doc.name, type: doc.type, version: doc.version, status: doc.status, updatedAt: doc.updatedAt })) })),
      configurationBaseline: docs.filter(doc => ['已通过','已发布'].includes(doc.status)).map(doc => ({ type: doc.type, name: doc.name, version: doc.version, status: doc.status })),
      documents: docs.map(({ excerpt, ...doc }) => ({ ...doc, excerpt: excerpt?.slice(0, 2000) || '' })),
      competitors: state.competitors.filter(item => item.projectId === projectId),
      suppliers: state.suppliers.filter(item => item.projectId === projectId),
      traceability: state.traceability.filter(item => item.projectId === projectId),
      decisions: state.decisions.filter(item => item.projectId === projectId),
      completeness: { progress: projectProgress(project), stagesWithDocuments: new Set(docs.map(doc => doc.stageId)).size, formalDocuments: docs.filter(doc => ['已通过','已发布'].includes(doc.status)).length, missingRequiredDeliverables: DATA.stages.flatMap(stage => stage.required.filter(type => !docs.some(doc => doc.stageId === stage.id && doc.type === type)).map(type => ({ stage: stage.title, type }))) }
    };
  }

  function exportProjectArchive(projectId) {
    const archive = buildProjectArchive(projectId);
    const filename = `${archive.project.code}-${archive.project.name}-project-index`;
    downloadText(`${filename}.json`, JSON.stringify(archive, null, 2), 'application/json');
    const markdown = `# ${archive.project.name} 项目交付件归档索引\n\n- 项目编号：${archive.project.code}\n- 生成时间：${archive.generatedAt}\n- 当前阶段：${currentStage(archive.project).title}\n- 完成度：${archive.completeness.progress}%\n\n## 阶段与交付件\n\n${archive.stageDefinitions.map(stage => `### ${stage.no} ${stage.title}\n- 状态：${stage.status}\n- 已归档：${stage.availableDocuments.length ? stage.availableDocuments.map(doc => `${doc.name}（${doc.version}/${doc.status}）`).join('；') : '无'}\n- 必需交付件：${stage.requiredDeliverables.join('、')}`).join('\n\n')}\n\n## 缺失交付件\n\n${archive.completeness.missingRequiredDeliverables.length ? archive.completeness.missingRequiredDeliverables.map(item => `- ${item.stage}：${item.type}`).join('\n') : '- 无'}\n`;
    setTimeout(() => downloadText(`${filename}.md`, markdown, 'text/markdown;charset=utf-8'), 200);
    showToast('已导出JSON和Markdown项目索引；原始附件请从交付件中心单独下载。');
  }

  function exportAllData() {
    downloadText(`hardware-pm-lab-backup-${nowDate()}.json`, JSON.stringify(state, null, 2), 'application/json');
    showToast('项目结构化数据已导出。');
  }

  function importAllData() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      try {
        const data = JSON.parse(await input.files[0].text());
        if (!Array.isArray(data.projects)) throw new Error('Invalid backup');
        state = { ...defaultState(), ...data };
        saveState(); renderCurrentView(); showToast('备份数据已恢复。');
      } catch { showToast('备份文件格式无效。'); }
    };
    input.click();
  }

  function resetData() {
    if (!confirm('确认恢复示例数据？当前结构化数据会被覆盖，IndexedDB中的原始文件不会自动清空。')) return;
    state = defaultState(); saveState(); renderCurrentView(); showToast('已恢复示例数据。');
  }

  async function installPwa() {
    if (!deferredInstallPrompt) return showToast('当前浏览器尚未提供安装入口，可使用浏览器菜单“添加到主屏幕”。');
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    renderSettings();
  }

  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  document.getElementById('mobile-menu').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  document.getElementById('modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  projectSwitcher.addEventListener('change', event => { state.currentProjectId = event.target.value; saveState(); renderCurrentView(); });
  document.getElementById('quick-new-project').addEventListener('click', openNewProjectModal);
  window.addEventListener('hashchange', () => setView(location.hash.replace('#', '') || 'overview', false));
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; if (currentView === 'settings') renderSettings(); });

  renderProjectSwitcher();
  setView(currentView, false);
})();
