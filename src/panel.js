const tabId = chrome.devtools.inspectedWindow.tabId;
console.log('[EDS Inspector Panel] Tab ID:', tabId);

async function sendToContent(type, payload = {}) {
  console.log('[EDS Inspector Panel] Sending message to content:', type, payload);
  try {
    const response = await chrome.tabs.sendMessage(tabId, { target: 'eds-content', type, payload });
    console.log('[EDS Inspector Panel] Received response:', response);
    return response;
  } catch (err) {
    console.error('[EDS Inspector Panel] Failed to send message:', err);
    throw err;
  }
}

async function ensureContentInjected() {
  console.log('[EDS Inspector Panel] Requesting content script injection...');
  console.log('[EDS Inspector Panel] Tab ID:', tabId);
  
  try {
    // タイムアウトを設定してメッセージを送信
    const response = await Promise.race([
      chrome.runtime.sendMessage({ type: 'eds-init-devtools', tabId }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Could not establish connection. Receiving end does not exist.')), 3000)
      )
    ]);
    console.log('[EDS Inspector Panel] Content script injection response:', response);
    
    if (response && response.ok === false) {
      throw new Error(response.error || 'Content script injection failed');
    }
    
    if (!response) {
      throw new Error('No response from service worker');
    }
    
    return response;
  } catch (err) {
    console.error('[EDS Inspector Panel] Failed to request content script injection:', err);
    
    // エラーメッセージを改善
    const errorMessage = err.message || 'Unknown error';
    if (errorMessage.includes('Could not establish connection') || 
        errorMessage.includes('Receiving end does not exist')) {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    }
    
    throw err;
  }
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

  // カテゴリごとにグループ化
  const blocksByCategory = {};
  state.blocks.forEach((block) => {
    const category = block.category || 'block';
    if (!blocksByCategory[category]) {
      blocksByCategory[category] = [];
    }
    blocksByCategory[category].push(block);
  });

  // カテゴリの順序を定義
  const categoryOrder = ['block', 'heading', 'text', 'image', 'list', 'code', 'table', 'quote', 'media', 'button'];
  
  categoryOrder.forEach((category) => {
    if (!blocksByCategory[category] || blocksByCategory[category].length === 0) return;
    
    const categoryTitle = document.createElement('h3');
    categoryTitle.className = 'eds-category-title';
    categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    root.appendChild(categoryTitle);
    
    const list = document.createElement('ul');
    list.className = 'eds-block-list';
    
    blocksByCategory[category].forEach((block) => {
      const li = document.createElement('li');
      li.className = 'eds-block-item';
      if (state.selectedBlock === block.id) {
        li.classList.add('is-selected');
      }
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = block.name;
      nameSpan.className = 'eds-block-name';
      
      const tagSpan = document.createElement('span');
      tagSpan.textContent = block.tagName;
      tagSpan.className = 'eds-block-list__tag';
      
      li.appendChild(nameSpan);
      li.appendChild(tagSpan);
      
      li.addEventListener('mouseenter', () => sendToContent('highlight', { id: block.id }));
      li.addEventListener('mouseleave', () => sendToContent('highlight', { id: null }));
      li.addEventListener('click', async () => {
        // 他の選択を解除
        document.querySelectorAll('.eds-block-item').forEach((item) => {
          item.classList.remove('is-selected');
        });
        // 選択状態を追加
        li.classList.add('is-selected');
        
        await sendToContent('select-block', { id: block.id });
        const detail = await sendToContent('get-block-detail', { id: block.id });
        renderSource(state, detail);
        switchTab('source');
      });
      
      list.appendChild(li);
    });
    
    root.appendChild(list);
  });
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
  try {
    console.log('[EDS Inspector Panel] Fetching state from content script...');
    const state = await sendToContent('state');
    console.log('[EDS Inspector Panel] State received:', state);
    if (!state) {
      throw new Error('No state received from content script');
    }
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
  } catch (err) {
    console.error('[EDS Inspector Panel] Error hydrating panels:', err);
    // エラーメッセージを表示
    const controlPanel = document.querySelector('[data-tab-panel="control"]');
    if (controlPanel) {
      controlPanel.innerHTML = `
        <div class="eds-error" style="padding: 20px; color: #d32f2f;">
          <h3>Error: Failed to communicate with content script</h3>
          <p>${err.message}</p>
          <p>Please make sure:</p>
          <ul>
            <li>The page is fully loaded</li>
            <li>You're on a valid web page (not chrome:// or extension://)</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      `;
    }
    throw err;
  }
}

async function initializePanel() {
  console.log('[EDS Inspector Panel] Initializing panel...');
  const controlPanel = document.querySelector('[data-tab-panel="control"]');
  
  try {
    // ローディングメッセージを表示
    if (controlPanel) {
      controlPanel.innerHTML = '<div class="eds-loading" style="padding: 20px;">Initializing EDS Site Inspector...</div>';
    }
    
    bindTabs();
    switchTab('control');
    console.log('[EDS Inspector Panel] Ensuring content script is injected...');
    
    try {
      await ensureContentInjected();
      console.log('[EDS Inspector Panel] Content script injection ensured');
    } catch (injectErr) {
      console.error('[EDS Inspector Panel] Failed to inject content script:', injectErr);
      if (controlPanel) {
        const errorMessage = injectErr.message || 'Unknown error';
        const isConnectionError = errorMessage.includes('Could not establish connection') || 
                                  errorMessage.includes('Receiving end does not exist');
        
        controlPanel.innerHTML = `
          <div class="eds-error" style="padding: 20px; color: #d32f2f; line-height: 1.6;">
            <h3 style="margin-top: 0;">Error: Failed to inject content script</h3>
            <p><strong>${errorMessage}</strong></p>
            ${isConnectionError ? `
              <p>This error usually means the extension's service worker is not running.</p>
              <h4>Please try the following steps:</h4>
              <ol style="margin-left: 20px;">
                <li>Go to <code>chrome://extensions/</code></li>
                <li>Find "EDS Site Inspector" extension</li>
                <li>Click the <strong>"Reload"</strong> button (🔄) to restart the service worker</li>
                <li>Click the <strong>"Service worker"</strong> link to verify it's running</li>
                <li>Refresh this page (F5)</li>
                <li>Reopen this DevTools panel</li>
              </ol>
            ` : `
              <p>Please try:</p>
              <ul style="margin-left: 20px;">
                <li>Refreshing the page (F5)</li>
                <li>Reloading the extension from chrome://extensions/</li>
              </ul>
            `}
          </div>
        `;
      }
      // エラーを再スローして、後続の処理を停止
      throw injectErr;
    }
    
    // コンテンツスクリプトがロードされるまで少し待つ
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    try {
      console.log('[EDS Inspector Panel] Sending init message to content script...');
      await sendToContent('init');
      console.log('[EDS Inspector Panel] Init message sent successfully');
    } catch (e) {
      console.warn('[EDS Inspector Panel] Init message failed, retrying...', e);
      // if content not ready yet, retry once
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        await sendToContent('init');
        console.log('[EDS Inspector Panel] Init message sent successfully after retry');
      } catch (retryErr) {
        console.error('[EDS Inspector Panel] Init message failed after retry:', retryErr);
        if (controlPanel) {
          controlPanel.innerHTML = `
            <div class="eds-error" style="padding: 20px; color: #d32f2f;">
              <h3>Error: Failed to initialize content script</h3>
              <p>${retryErr.message}</p>
              <p>The content script may not be loaded. Please try:</p>
              <ul>
                <li>Refreshing the page</li>
                <li>Checking the page console for errors</li>
              </ul>
            </div>
          `;
        }
        throw retryErr;
      }
    }
    
    console.log('[EDS Inspector Panel] Hydrating panels...');
    await hydratePanels();
    console.log('[EDS Inspector Panel] Panel initialization complete');
  } catch (err) {
    console.error('[EDS Inspector Panel] Error initializing panel:', err);
    if (controlPanel && !controlPanel.querySelector('.eds-error')) {
      controlPanel.innerHTML = `
        <div class="eds-error" style="padding: 20px; color: #d32f2f;">
          <h3>Error: Failed to initialize panel</h3>
          <p>${err.message}</p>
          <p>Check the console for more details.</p>
        </div>
      `;
    }
  }
}

console.log('[EDS Inspector Panel] Panel script loaded');
window.initializePanel = initializePanel;
