const tabId = chrome.devtools.inspectedWindow.tabId;

async function sendToContent(type, payload = {}) {
  return await chrome.tabs.sendMessage(tabId, { target: 'eds-content', type, payload });
}

async function ensureContentInjected() {
  await chrome.runtime.sendMessage({ type: 'eds-init-devtools', tabId });
}

function switchTab(tab) {
  document.querySelectorAll('.eds-tabs button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('[data-tab-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== tab;
  });
}

function bindTabs() {
  document.querySelectorAll('.eds-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function renderControl(state, refresh) {
  const root = document.querySelector('[data-tab-panel="control"]');
  root.innerHTML = '';

  const status = document.createElement('div');
  status.className = 'eds-status';
  status.innerHTML = `<span class="eds-status__dot"></span> ${state.sections.length} sections · ${state.blocks.length} blocks`;
  root.appendChild(status);

  const toggleSections = document.createElement('label');
  toggleSections.className = 'eds-toggle';
  toggleSections.innerHTML = `<input type="checkbox" ${state.overlaysEnabled.sections ? 'checked' : ''}/> Sections overlay`;
  toggleSections.querySelector('input').addEventListener('change', async (evt) => {
    try {
      await sendToContent('toggle-overlay', { key: 'sections', value: evt.target.checked });
    } finally {
      refresh();
    }
  });

  const toggleBlocks = document.createElement('label');
  toggleBlocks.className = 'eds-toggle';
  toggleBlocks.innerHTML = `<input type="checkbox" ${state.overlaysEnabled.blocks ? 'checked' : ''}/> Blocks overlay`;
  toggleBlocks.querySelector('input').addEventListener('change', async (evt) => {
    try {
      await sendToContent('toggle-overlay', { key: 'blocks', value: evt.target.checked });
    } finally {
      refresh();
    }
  });

  const actions = document.createElement('div');
  actions.className = 'eds-actions';
  const reanalyze = document.createElement('button');
  reanalyze.className = 'eds-button eds-button--primary';
  reanalyze.textContent = 'Re-run analysis';
  reanalyze.addEventListener('click', async () => {
    reanalyze.disabled = true;
    try {
      await sendToContent('reanalyze');
      await refresh();
    } finally {
      reanalyze.disabled = false;
    }
  });

  const hide = document.createElement('button');
  hide.className = 'eds-button';
  hide.textContent = 'Remove overlays';
  hide.addEventListener('click', async () => {
    try {
      await sendToContent('destroy');
    } finally {
      await refresh();
    }
  });

  actions.append(reanalyze, hide);
  root.append(toggleSections, toggleBlocks, actions);

  const hint = document.createElement('p');
  hint.className = 'eds-hint';
  hint.textContent = 'Detection relies on SSR markup; overlays follow live DOM updates on scroll/resize.';
  root.appendChild(hint);
}

function renderBlocks(state, refresh) {
  const root = document.querySelector('[data-tab-panel="blocks"]');
  root.innerHTML = '';
  if (!state.blocks.length) {
    root.innerHTML = '<p class="eds-empty">No blocks detected inside <main>.</p>';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'eds-block-list';
  state.blocks.forEach((block) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${block.name}</span><span class="eds-block-list__tag">${block.tagName}</span>`;
    li.addEventListener('mouseenter', () => sendToContent('highlight', { id: block.id }));
    li.addEventListener('mouseleave', () => sendToContent('highlight', { id: null }));
    li.addEventListener('click', async () => {
      await sendToContent('select-block', { id: block.id });
      const detail = await sendToContent('get-block-detail', { id: block.id });
      renderSource(state, detail);
      switchTab('source');
    });
    list.appendChild(li);
  });
  root.appendChild(list);
}

function renderCodeTree(node, parent, basePath) {
  const li = document.createElement('li');
  li.textContent = node.name;
  if (node.children && node.children.length) {
    li.classList.add('has-children');
    const ul = document.createElement('ul');
    node.children.forEach((child) => renderCodeTree(child, ul, basePath));
    li.appendChild(ul);
  }
  if (node.path) {
    li.title = node.path;
    li.addEventListener('click', (evt) => {
      evt.stopPropagation();
      window.open(`${basePath}${node.path}`, '_blank');
    });
  }
  parent.appendChild(li);
}

function renderCode(state) {
  const root = document.querySelector('[data-tab-panel="code"]');
  root.innerHTML = '';
  if (!state.codeBasePath) {
    root.innerHTML = '<p class="eds-empty">Code Bus path could not be determined.</p>';
    return;
  }
  if (!state.codeTree) {
    root.innerHTML = '<p class="eds-loading">Loading Code Bus…</p>';
    return;
  }
  const tree = document.createElement('ul');
  tree.className = 'eds-tree';
  renderCodeTree(state.codeTree, tree, state.codeBasePath);
  root.appendChild(tree);
}

function renderMedia(state) {
  const root = document.querySelector('[data-tab-panel="media"]');
  root.innerHTML = '';
  if (!state.mediaBasePath) {
    root.innerHTML = '<p class="eds-empty">Media Bus path could not be determined.</p>';
    return;
  }
  if (!state.mediaFiles) {
    root.innerHTML = '<p class="eds-loading">Loading Media Bus…</p>';
    return;
  }
  if (!state.mediaFiles.length) {
    root.innerHTML = '<p class="eds-empty">No media_ files found.</p>';
    return;
  }
  const list = document.createElement('ul');
  list.className = 'eds-file-list';
  state.mediaFiles.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'eds-file-card';
    li.innerHTML = `<div class="eds-file-card__path">${item.path}</div><div class="eds-hint">Click to open</div>`;
    li.addEventListener('click', () => window.open(`${state.mediaBasePath}${item.path}`, '_blank'));
    list.appendChild(li);
  });
  root.appendChild(list);
}

function renderSource(state, detail) {
  const root = document.querySelector('[data-tab-panel="source"]');
  root.innerHTML = '';
  if (!detail || !detail.block) {
    root.innerHTML = '<p class="eds-empty">Select a block from the list or overlay to inspect its source.</p>';
    return;
  }
  const meta = document.createElement('div');
  meta.className = 'eds-meta';
  meta.innerHTML = `
    <div><strong>Name:</strong> ${detail.block.name}</div>
    <div><strong>Tag:</strong> ${detail.block.tagName}</div>
    <div><strong>Classes:</strong> ${detail.block.classes || '(none)'}</div>
    <div><strong>Detected via:</strong> <span class="eds-inline-code">/blocks/${detail.block.name}</span></div>
  `;

  const markup = document.createElement('pre');
  markup.className = 'eds-code';
  markup.textContent = detail.markup || 'No markup captured for this block.';

  root.append(meta, markup);

  if (detail.assets && detail.assets.length) {
    const list = document.createElement('ul');
    list.className = 'eds-file-list';
    detail.assets.forEach((asset) => {
      const li = document.createElement('li');
      li.className = 'eds-file-card';
      const title = document.createElement('div');
      title.className = 'eds-file-card__path';
      title.textContent = asset.path;
      const pill = document.createElement('span');
      pill.className = 'eds-pill';
      pill.textContent = asset.type;
      const header = document.createElement('div');
      header.className = 'eds-flex';
      header.append(title, pill);
      const code = document.createElement('pre');
      code.className = 'eds-code';
      code.textContent = asset.content || '(empty file)';
      li.append(header, code);
      list.appendChild(li);
    });
    root.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'eds-empty';
    empty.textContent = 'No block assets found in network responses.';
    root.appendChild(empty);
  }
}

async function hydratePanels() {
  const state = await sendToContent('state');
  renderControl(state, hydratePanels);
  renderBlocks(state, hydratePanels);
  renderCode(state);
  renderMedia(state);
  if (state.selectedBlock) {
    const detail = await sendToContent('get-block-detail', { id: state.selectedBlock });
    renderSource(state, detail);
  } else {
    renderSource(state, null);
  }
}

async function initializePanel() {
  bindTabs();
  switchTab('control');
  await ensureContentInjected();
  try {
    await sendToContent('init');
  } catch (e) {
    // if content not ready yet, retry once
    await new Promise((resolve) => setTimeout(resolve, 300));
    await sendToContent('init');
  }
  await hydratePanels();
}

window.initializePanel = initializePanel;
