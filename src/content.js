(() => {
  if (window.__edsInspectorInitialized) {
    console.warn('EDS Site Inspector is already running.');
    return;
  }
  window.__edsInspectorInitialized = true;

  const UI_IDS = {
    overlayRoot: 'eds-inspector-overlay-root',
    panel: 'eds-inspector-panel',
  };

  const COLORS = {
    section: '#3b82f6',
    block: '#f59e0b',
    highlight: '#f97316',
  };

  const DEFAULT_CONTENT_MAP = [
    { selector: 'h1', name: 'heading (h1)' },
    { selector: 'h2', name: 'heading (h2)' },
    { selector: 'h3', name: 'heading (h3)' },
    { selector: 'picture', name: 'image' },
    { selector: 'img', name: 'image' },
    { selector: 'table', name: 'table' },
    { selector: 'blockquote', name: 'blockquote' },
    { selector: 'pre', name: 'code' },
    { selector: 'video', name: 'video' },
  ];

  const state = {
    sections: [],
    blocks: [],
    overlays: [],
    overlaysEnabled: { sections: true, blocks: true },
    selectedBlockId: null,
    codeBasePath: null,
    mediaBasePath: null,
    codeTree: null,
    mediaFiles: null,
  };

  function createOverlayRoot() {
    let root = document.getElementById(UI_IDS.overlayRoot);
    if (root) return root;
    root = document.createElement('div');
    root.id = UI_IDS.overlayRoot;
    root.style.position = 'fixed';
    root.style.top = '0';
    root.style.left = '0';
    root.style.width = '100%';
    root.style.height = '100%';
    root.style.pointerEvents = 'none';
    root.style.zIndex = '2147483646';
    document.body.appendChild(root);
    return root;
  }

  function createPanelRoot() {
    let panel = document.getElementById(UI_IDS.panel);
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = UI_IDS.panel;
    panel.className = 'eds-panel';
    panel.innerHTML = `
      <div class="eds-panel__header">
        <div class="eds-panel__title">EDS Site Inspector</div>
        <button class="eds-panel__close" title="Close">×</button>
      </div>
      <div class="eds-panel__tabs">
        <button data-tab="control" class="active">Control</button>
        <button data-tab="blocks">Blocks</button>
        <button data-tab="code">Code Bus</button>
        <button data-tab="media">Media Bus</button>
        <button data-tab="source">Source</button>
      </div>
      <div class="eds-panel__content" data-tab-content="control"></div>
      <div class="eds-panel__content" data-tab-content="blocks" hidden></div>
      <div class="eds-panel__content" data-tab-content="code" hidden></div>
      <div class="eds-panel__content" data-tab-content="media" hidden></div>
      <div class="eds-panel__content" data-tab-content="source" hidden></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('.eds-panel__close')?.addEventListener('click', () => {
      destroy();
    });
    panel.querySelectorAll('.eds-panel__tabs button').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    return panel;
  }

  function switchTab(tab) {
    const panel = document.getElementById(UI_IDS.panel);
    if (!panel) return;
    panel.querySelectorAll('.eds-panel__tabs button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    panel.querySelectorAll('[data-tab-content]').forEach((content) => {
      content.hidden = content.dataset.tabContent !== tab;
    });
  }

  function detectSections(main) {
    const sections = [];
    const candidates = Array.from(main.children);
    candidates.forEach((el, index) => {
      if (!(el instanceof HTMLElement)) return;
      const label = el.getAttribute('data-section-id') || el.className || `section-${index + 1}`;
      sections.push({ id: `section-${index}`, element: el, label });
    });
    return sections;
  }

  function inferBlockName(el) {
    if (el.dataset.blockName) return el.dataset.blockName;
    const blockClass = Array.from(el.classList).find((cls) => cls !== 'block' && !cls.startsWith('section-'));
    if (blockClass) return blockClass;
    const defaultContent = DEFAULT_CONTENT_MAP.find((entry) => el.matches(entry.selector));
    if (defaultContent) return defaultContent.name;
    return el.tagName.toLowerCase();
  }

  function detectBlocks(main) {
    const blocks = [];
    const seen = new Set();
    const blockSelectors = ['[data-block-name]', '.block'];
    DEFAULT_CONTENT_MAP.forEach((entry) => blockSelectors.push(entry.selector));
    const candidates = main.querySelectorAll(blockSelectors.join(','));
    candidates.forEach((el, index) => {
      if (!(el instanceof HTMLElement)) return;
      const key = el.dataset.blockName || el.className || `${el.tagName}-${index}`;
      if (seen.has(key)) return;
      seen.add(key);
      blocks.push({
        id: `block-${index}`,
        element: el,
        name: inferBlockName(el),
        tagName: el.tagName.toLowerCase(),
      });
    });
    return blocks;
  }

  function createOverlayElement(item, type) {
    const el = document.createElement('div');
    el.className = `eds-overlay eds-overlay--${type}`;
    el.dataset.overlayId = item.id;
    const label = document.createElement('div');
    label.className = 'eds-overlay__label';
    label.textContent = type === 'section' ? `Section: ${item.label}` : `Block: ${item.name}`;
    el.appendChild(label);
    el.addEventListener('click', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      if (type === 'block') {
        state.selectedBlockId = item.id;
        renderSourcePanel(item);
        switchTab('source');
      }
    });
    return el;
  }

  function refreshOverlayPositions() {
    const root = document.getElementById(UI_IDS.overlayRoot);
    if (!root) return;
    const viewportOffset = { x: window.scrollX, y: window.scrollY };
    state.overlays.forEach((overlay) => {
      const { element, target } = overlay;
      const rect = target.getBoundingClientRect();
      element.style.transform = `translate(${rect.left + viewportOffset.x}px, ${rect.top + viewportOffset.y}px)`;
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
      element.style.display = overlay.visible ? 'block' : 'none';
    });
  }

  function setHighlight(id) {
    state.overlays.forEach((overlay) => {
      overlay.element.classList.toggle('is-highlighted', overlay.item.id === id);
    });
  }

  function buildOverlays() {
    const root = createOverlayRoot();
    root.innerHTML = '';
    state.overlays = [];
    state.sections.forEach((section) => {
      const el = createOverlayElement(section, 'section');
      root.appendChild(el);
      state.overlays.push({ element: el, target: section.element, item: section, visible: state.overlaysEnabled.sections });
    });
    state.blocks.forEach((block) => {
      const el = createOverlayElement(block, 'block');
      root.appendChild(el);
      state.overlays.push({ element: el, target: block.element, item: block, visible: state.overlaysEnabled.blocks });
    });
    refreshOverlayPositions();
  }

  function renderControlPanel() {
    const panel = document.querySelector('[data-tab-content="control"]');
    if (!panel) return;
    panel.innerHTML = '';
    const overlayToggle = document.createElement('div');
    overlayToggle.className = 'eds-toggle-group';
    overlayToggle.innerHTML = `
      <label><input type="checkbox" data-toggle="sections" ${state.overlaysEnabled.sections ? 'checked' : ''}/> Sections overlay</label>
      <label><input type="checkbox" data-toggle="blocks" ${state.overlaysEnabled.blocks ? 'checked' : ''}/> Blocks overlay</label>
    `;
    overlayToggle.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', () => {
        const key = input.dataset.toggle;
        state.overlaysEnabled[key] = input.checked;
        state.overlays.forEach((overlay) => {
          if (key === 'sections' && overlay.item.id.startsWith('section-')) overlay.visible = input.checked;
          if (key === 'blocks' && overlay.item.id.startsWith('block-')) overlay.visible = input.checked;
        });
        refreshOverlayPositions();
      });
    });

    const actions = document.createElement('div');
    actions.className = 'eds-actions';
    const reanalyze = document.createElement('button');
    reanalyze.textContent = 'Re-run analysis';
    reanalyze.addEventListener('click', analyzePage);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Remove overlays';
    closeBtn.addEventListener('click', destroy);
    actions.append(reanalyze, closeBtn);

    const info = document.createElement('p');
    info.textContent = 'Click the extension icon to re-inject if the page reloads. Overlays highlight sections and blocks detected in the current page.';

    panel.append(overlayToggle, actions, info);
  }

  function renderBlocksPanel() {
    const panel = document.querySelector('[data-tab-content="blocks"]');
    if (!panel) return;
    panel.innerHTML = '';
    if (!state.blocks.length) {
      panel.textContent = 'No blocks detected inside <main>.';
      return;
    }
    const list = document.createElement('ul');
    list.className = 'eds-block-list';
    state.blocks.forEach((block) => {
      const item = document.createElement('li');
      item.innerHTML = `<span class="eds-block-list__name">${block.name}</span><span class="eds-block-list__tag">${block.tagName}</span>`;
      item.addEventListener('mouseenter', () => setHighlight(block.id));
      item.addEventListener('mouseleave', () => setHighlight(null));
      item.addEventListener('click', () => {
        state.selectedBlockId = block.id;
        renderSourcePanel(block);
        switchTab('source');
      });
      list.appendChild(item);
    });
    panel.appendChild(list);
  }

  function formatHtmlSnippet(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('[data-eds-overlay-ignore]');
    const lines = clone.outerHTML.split('\n');
    return lines.map((line) => line.trim()).join('\n');
  }

  function renderSourcePanel(block) {
    const panel = document.querySelector('[data-tab-content="source"]');
    if (!panel) return;
    panel.innerHTML = '';
    if (!block) {
      panel.textContent = 'Click a block overlay or list item to inspect its HTML markup.';
      return;
    }
    const meta = document.createElement('div');
    meta.className = 'eds-meta';
    meta.innerHTML = `
      <div><strong>Name:</strong> ${block.name}</div>
      <div><strong>Tag:</strong> ${block.tagName}</div>
      <div><strong>Classes:</strong> ${(block.element.className || '(none)')}</div>
    `;

    const pre = document.createElement('pre');
    pre.className = 'eds-code';
    pre.textContent = formatHtmlSnippet(block.element);
    panel.append(meta, pre);
  }

  function renderCodeTree(tree, container) {
    container.innerHTML = '';
    if (!tree) {
      container.textContent = 'Code Bus not detected on this page.';
      return;
    }
    const ul = document.createElement('ul');
    ul.className = 'eds-tree';
    function addNode(node, parent) {
      const li = document.createElement('li');
      li.textContent = node.name;
      if (node.children && node.children.length) {
        li.classList.add('has-children');
        const childList = document.createElement('ul');
        node.children.forEach((child) => addNode(child, childList));
        li.appendChild(childList);
      }
      if (node.path) {
        li.title = node.path;
        li.addEventListener('click', (evt) => {
          evt.stopPropagation();
          window.open(`${state.codeBasePath}${node.path}`, '_blank');
        });
      }
      parent.appendChild(li);
    }
    addNode(tree, ul);
    container.appendChild(ul);
  }

  function renderMediaList(list, container) {
    container.innerHTML = '';
    if (!list) {
      container.textContent = 'Media Bus not detected on this page.';
      return;
    }
    if (!list.length) {
      container.textContent = 'No media_ files found.';
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'eds-media-grid';
    list.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'eds-media-card';
      const isImage = /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(item.path);
      if (isImage) {
        const img = document.createElement('img');
        img.src = `${state.mediaBasePath}${item.path}`;
        img.alt = item.path;
        card.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'eds-media-card__placeholder';
        placeholder.textContent = 'media';
        card.appendChild(placeholder);
      }
      const caption = document.createElement('div');
      caption.className = 'eds-media-card__caption';
      caption.textContent = item.path;
      card.appendChild(caption);
      card.addEventListener('click', () => window.open(`${state.mediaBasePath}${item.path}`, '_blank'));
      grid.appendChild(card);
    });
    container.appendChild(grid);
  }

  function renderCodePanel() {
    const panel = document.querySelector('[data-tab-content="code"]');
    if (!panel) return;
    panel.innerHTML = '<div class="eds-loading">Loading Code Bus…</div>';
    if (!state.codeBasePath) {
      panel.textContent = 'Code Bus path could not be determined from this page.';
      return;
    }
    if (state.codeTree) {
      renderCodeTree(state.codeTree, panel);
      return;
    }
  }

  function renderMediaPanel() {
    const panel = document.querySelector('[data-tab-content="media"]');
    if (!panel) return;
    panel.innerHTML = '<div class="eds-loading">Loading Media Bus…</div>';
    if (!state.mediaBasePath) {
      panel.textContent = 'Media Bus path could not be determined from this page.';
      return;
    }
    if (state.mediaFiles) {
      renderMediaList(state.mediaFiles, panel);
      return;
    }
  }

  function buildTreeFromPaths(paths) {
    const root = { name: 'codebus', children: [] };
    paths.forEach((path) => {
      const parts = path.replace(/^\//, '').split('/');
      let current = root;
      parts.forEach((part, index) => {
        let child = current.children.find((c) => c.name === part);
        if (!child) {
          child = { name: part, children: [] };
          current.children.push(child);
        }
        if (index === parts.length - 1) {
          child.path = `/${parts.join('/')}`;
        }
        current = child;
      });
    });
    return root;
  }

  function parseRefRepoOwner(urlString) {
    try {
      const url = new URL(urlString);
      const match = url.hostname.match(/^(?<ref>[^-]+)--(?<repo>[^-]+)--(?<owner>[^.]+)/);
      if (match && match.groups) {
        return match.groups;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  async function fetchAdminListing(basePath, filterFn) {
    const parsed = parseRefRepoOwner(basePath);
    if (!parsed) return null;
    const { owner, repo, ref } = parsed;
    const url = `https://admin.hlx.page/inspect/${owner}/${repo}/${ref}/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load listing: ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json.entries)) return null;
    const filtered = filterFn ? json.entries.filter(filterFn) : json.entries;
    return filtered.map((entry) => entry.path);
  }

  async function loadCodeAndMedia() {
    if (state.codeBasePath) {
      try {
        const paths = await fetchAdminListing(state.codeBasePath, (entry) => entry.type === 'file');
        if (paths && paths.length) {
          state.codeTree = buildTreeFromPaths(paths);
          renderCodePanel();
        }
      } catch (err) {
        const panel = document.querySelector('[data-tab-content="code"]');
        if (panel) panel.textContent = `Code Bus listing failed: ${err.message}`;
      }
    }
    if (state.mediaBasePath) {
      try {
        const mediaPaths = await fetchAdminListing(state.mediaBasePath, (entry) => entry.type === 'file' && entry.path.includes('media_'));
        if (mediaPaths) {
          state.mediaFiles = mediaPaths.map((path) => ({ path }));
          renderMediaPanel();
        }
      } catch (err) {
        const panel = document.querySelector('[data-tab-content="media"]');
        if (panel) panel.textContent = `Media Bus listing failed: ${err.message}`;
      }
    }
  }

  async function resolveConfig() {
    const maybe = window.hlx || window.hlxRUM || {};
    state.codeBasePath = maybe.codeBasePath || null;
    state.mediaBasePath = maybe.mediaBasePath || null;

    if (state.codeBasePath && state.mediaBasePath) return;

    const candidates = ['/.helix/config.json', '/helix-config.json'];
    for (const path of candidates) {
      try {
        const res = await fetch(path);
        if (res.ok) {
          const json = await res.json();
          state.codeBasePath = state.codeBasePath || json.codeBasePath;
          state.mediaBasePath = state.mediaBasePath || json.mediaBasePath;
          break;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  function destroy() {
    const overlay = document.getElementById(UI_IDS.overlayRoot);
    if (overlay) overlay.remove();
    const panel = document.getElementById(UI_IDS.panel);
    if (panel) panel.remove();
    window.__edsInspectorInitialized = false;
  }

  function renderPanels() {
    renderControlPanel();
    renderBlocksPanel();
    renderCodePanel();
    renderMediaPanel();
    renderSourcePanel(null);
  }

  function analyzePage() {
    const main = document.querySelector('main');
    if (!main) {
      alert('EDS Inspector: <main> element not found.');
      return;
    }
    state.sections = detectSections(main);
    state.blocks = detectBlocks(main);
    buildOverlays();
    renderPanels();
    refreshOverlayPositions();
  }

  function attachGlobalListeners() {
    window.addEventListener('scroll', refreshOverlayPositions, true);
    window.addEventListener('resize', refreshOverlayPositions, true);
  }

  async function init() {
    createPanelRoot();
    attachGlobalListeners();
    await resolveConfig();
    analyzePage();
    loadCodeAndMedia();
  }

  init();
})();
