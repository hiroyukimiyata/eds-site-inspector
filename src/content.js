(() => {
  if (window.__edsInspectorInitialized) {
    console.warn('EDS Site Inspector is already running.');
    return;
  }
  window.__edsInspectorInitialized = true;

  const UI_IDS = {
    overlayRoot: 'eds-inspector-overlay-root',
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
    ssrDocument: null,
  };

  function createOverlayRoot() {
    let root = document.getElementById(UI_IDS.overlayRoot);
    if (root) return root;
    root = document.createElement('div');
    root.id = UI_IDS.overlayRoot;
    root.style.position = 'absolute';
    root.style.top = '0';
    root.style.left = '0';
    root.style.width = '100%';
    root.style.height = `${document.documentElement.scrollHeight}px`;
    root.style.pointerEvents = 'none';
    root.style.zIndex = '2147483646';
    document.body.appendChild(root);
    return root;
  }

  function ensureOverlayRootSizing(root) {
    if (!root) return;
    const doc = document.documentElement;
    const body = document.body || { scrollHeight: 0, scrollWidth: 0 };
    const height = Math.max(doc.scrollHeight, doc.clientHeight, body.scrollHeight, body.clientHeight || 0);
    const width = Math.max(doc.scrollWidth, doc.clientWidth, body.scrollWidth, body.clientWidth || 0);
    root.style.height = `${height}px`;
    root.style.width = `${width}px`;
  }

  function computeElementPath(el, root) {
    const path = [];
    let current = el;
    while (current && current !== root) {
      const parent = current.parentElement;
      if (!parent) break;
      const idx = Array.from(parent.children).indexOf(current);
      path.unshift(idx);
      current = parent;
    }
    return path;
  }

  function findElementByPath(root, path) {
    let current = root;
    for (const idx of path) {
      if (!current || !current.children || !current.children[idx]) return null;
      current = current.children[idx];
    }
    return current;
  }

  function inferBlockName(el) {
    if (el.dataset.blockName) return el.dataset.blockName;
    const blockClass = Array.from(el.classList).find((cls) => cls !== 'block' && !cls.startsWith('section-'));
    if (blockClass) return blockClass;
    const defaultContent = DEFAULT_CONTENT_MAP.find((entry) => el.matches(entry.selector));
    if (defaultContent) return defaultContent.name;
    return el.tagName.toLowerCase();
  }

  function formatHtmlSnippet(el) {
    const clone = el.cloneNode(true);
    const lines = clone.outerHTML.split('\n');
    return lines.map((line) => line.trim()).join('\n');
  }

  function collectBlockResourceNames() {
    const blockNames = new Set();
    const addFromUrl = (urlString) => {
      try {
        const { pathname } = new URL(urlString, window.location.href);
        const match = pathname.match(/\/blocks\/([^/]+)\//);
        if (match && match[1]) blockNames.add(match[1]);
      } catch (e) {
        /* noop */
      }
    };

    performance.getEntriesByType('resource').forEach((entry) => addFromUrl(entry.name));
    document.querySelectorAll('link[href*="/blocks/"], script[src*="/blocks/"]').forEach((el) => {
      const url = el.getAttribute('href') || el.getAttribute('src');
      if (url) addFromUrl(url);
    });
    return blockNames;
  }

  function detectSections(mainSSR, mainLive) {
    const sections = [];
    const candidates = Array.from(mainSSR.children);
    candidates.forEach((el, index) => {
      if (!(el instanceof HTMLElement)) return;
      const path = computeElementPath(el, mainSSR);
      const liveElement = findElementByPath(mainLive, path);
      if (!liveElement) return;
      const label = el.getAttribute('data-section-id') || el.className || `section-${index + 1}`;
      sections.push({ id: `section-${index}`, element: liveElement, label });
    });
    return sections;
  }

  function detectBlocks(mainSSR, mainLive, blockResources) {
    const blocks = [];
    const seen = new Set();
    const selectors = ['[data-block-name]', '.block'];
    DEFAULT_CONTENT_MAP.forEach((entry) => selectors.push(entry.selector));
    const candidates = mainSSR.querySelectorAll(selectors.join(','));
    candidates.forEach((el, index) => {
      if (!(el instanceof HTMLElement)) return;
      const path = computeElementPath(el, mainSSR);
      const liveElement = findElementByPath(mainLive, path);
      if (!liveElement) return;
      const key = el.dataset.blockName || el.className || `${el.tagName}-${index}`;
      if (seen.has(key)) return;
      const name = inferBlockName(el);
      if (!blockResources.has(name)) return; // not backed by /blocks/{name}
      seen.add(key);
      blocks.push({
        id: `block-${index}`,
        element: liveElement,
        name,
        tagName: el.tagName.toLowerCase(),
        classes: liveElement.className || '',
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
      }
    });
    return el;
  }

  function refreshOverlayPositions() {
    const root = document.getElementById(UI_IDS.overlayRoot);
    if (!root) return;
    ensureOverlayRootSizing(root);
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

  function serializeState() {
    return {
      sections: state.sections.map((section) => ({ id: section.id, label: section.label })),
      blocks: state.blocks.map((block) => ({ id: block.id, name: block.name, tagName: block.tagName, classes: block.classes })),
      overlaysEnabled: { ...state.overlaysEnabled },
      selectedBlock: state.selectedBlockId,
      codeBasePath: state.codeBasePath,
      mediaBasePath: state.mediaBasePath,
      codeTree: state.codeTree,
      mediaFiles: state.mediaFiles,
    };
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
        }
      } catch (err) {
        console.warn('Code Bus listing failed', err);
      }
    }
    if (state.mediaBasePath) {
      try {
        const mediaPaths = await fetchAdminListing(state.mediaBasePath, (entry) => entry.type === 'file' && entry.path.includes('media_'));
        if (mediaPaths) {
          state.mediaFiles = mediaPaths.map((path) => ({ path }));
        }
      } catch (err) {
        console.warn('Media Bus listing failed', err);
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
    state.overlays = [];
  }

  async function parseSSRDocument() {
    try {
      const res = await fetch(window.location.href, { credentials: 'include' });
      const html = await res.text();
      const parser = new DOMParser();
      return parser.parseFromString(html, 'text/html');
    } catch (err) {
      console.warn('Failed to fetch SSR markup', err);
      return null;
    }
  }

  async function analyzePage() {
    const mainLive = document.querySelector('main');
    if (!mainLive) {
      throw new Error('EDS Inspector: <main> element not found.');
    }
    const ssrDoc = (state.ssrDocument = (await parseSSRDocument()) || document);
    const mainSSR = ssrDoc.querySelector('main') || document.querySelector('main');
    const blockResources = collectBlockResourceNames();

    state.sections = detectSections(mainSSR, mainLive);
    state.blocks = detectBlocks(mainSSR, mainLive, blockResources);
    buildOverlays();
    refreshOverlayPositions();
  }

  async function getBlockAssets(blockName) {
    const assets = [];
    const seen = new Set();
    const addAsset = (urlString) => {
      try {
        const url = new URL(urlString, window.location.href);
        if (!url.pathname.includes(`/blocks/${blockName}/`)) return;
        if (seen.has(url.pathname)) return;
        seen.add(url.pathname);
        assets.push({ url: url.toString(), path: url.pathname });
      } catch (e) {
        /* noop */
      }
    };

    performance.getEntriesByType('resource').forEach((entry) => addAsset(entry.name));
    document.querySelectorAll('link[href*="/blocks/"], script[src*="/blocks/"]').forEach((el) => {
      const url = el.getAttribute('href') || el.getAttribute('src');
      if (url) addAsset(url);
    });

    const enriched = [];
    for (const asset of assets) {
      try {
        const res = await fetch(asset.url);
        const text = await res.text();
        const type = asset.path.split('.').pop() || 'file';
        enriched.push({ ...asset, type, content: text });
      } catch (err) {
        enriched.push({ ...asset, type: 'error', content: `Failed to load asset: ${err.message}` });
      }
    }
    return enriched;
  }

  async function getBlockDetail(blockId) {
    const block = state.blocks.find((b) => b.id === blockId);
    if (!block) return null;
    const markup = formatHtmlSnippet(block.element);
    const assets = await getBlockAssets(block.name);
    return { block, markup, assets };
  }

  function attachGlobalListeners() {
    window.addEventListener('scroll', refreshOverlayPositions, true);
    window.addEventListener('resize', refreshOverlayPositions, true);
    const resizeObserver = new ResizeObserver(() => refreshOverlayPositions());
    resizeObserver.observe(document.documentElement);
  }

  async function init() {
    attachGlobalListeners();
    await resolveConfig();
    await analyzePage();
    await loadCodeAndMedia();
    return serializeState();
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.target !== 'eds-content') return;
    (async () => {
      try {
        switch (message.type) {
          case 'init': {
            const snapshot = await init();
            sendResponse(snapshot);
            break;
          }
          case 'reanalyze': {
            const snapshot = await analyzePage();
            sendResponse(serializeState());
            break;
          }
          case 'toggle-overlay': {
            state.overlaysEnabled[message.payload.key] = message.payload.value;
            state.overlays.forEach((overlay) => {
              if (message.payload.key === 'sections' && overlay.item.id.startsWith('section-')) overlay.visible = message.payload.value;
              if (message.payload.key === 'blocks' && overlay.item.id.startsWith('block-')) overlay.visible = message.payload.value;
            });
            refreshOverlayPositions();
            sendResponse(serializeState());
            break;
          }
          case 'destroy': {
            destroy();
            sendResponse(serializeState());
            break;
          }
          case 'highlight': {
            setHighlight(message.payload.id);
            sendResponse({ ok: true });
            break;
          }
          case 'select-block': {
            state.selectedBlockId = message.payload.id;
            sendResponse({ ok: true });
            break;
          }
          case 'state': {
            sendResponse(serializeState());
            break;
          }
          case 'get-block-detail': {
            const detail = await getBlockDetail(message.payload.id);
            sendResponse(detail);
            break;
          }
          default:
            sendResponse({ ok: false, reason: 'unknown-message' });
        }
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  });
})();
