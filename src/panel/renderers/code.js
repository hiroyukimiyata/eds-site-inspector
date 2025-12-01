/**
 * Scriptsタブのレンダラー
 */
import { highlightCode } from '../utils.js';
import { createCopyButton, createSearchUI, createFullscreenViewer } from '../utils/file-utils.js';

/**
 * Scriptsタブをレンダリング
 */
export function renderScripts(state) {
  const root = document.querySelector('[data-tab-panel="code"]');
  
  // Scriptsタブが表示されていない場合は更新しない
  if (root.hidden) {
    return;
  }

  // 現在の開閉状態を保存
  const expandedUrls = new Set();
  const loadedUrls = new Set();
  const existingItems = root.querySelectorAll('.eds-file-item');
  existingItems.forEach(item => {
    const url = item.dataset.scriptUrl;
    const content = item.querySelector('.eds-file-content');
    if (url && content && content.style.display !== 'none') {
      expandedUrls.add(url);
    }
    if (url && content && content.querySelector('.eds-code')) {
      loadedUrls.add(url);
    }
  });

  root.innerHTML = '';

  // scriptFilesが配列かMapかを確認
  let scriptFilesArray = [];
  if (state.scriptFiles) {
    if (Array.isArray(state.scriptFiles)) {
      scriptFilesArray = state.scriptFiles;
    } else if (state.scriptFiles instanceof Map) {
      scriptFilesArray = Array.from(state.scriptFiles.values());
    } else if (typeof state.scriptFiles === 'object') {
      scriptFilesArray = Object.values(state.scriptFiles);
    }
  }

  console.log('[EDS Inspector Panel] renderScripts - scriptFiles:', state.scriptFiles, 'array:', scriptFilesArray);

  if (!scriptFilesArray || scriptFilesArray.length === 0) {
    root.innerHTML = '<p class="eds-empty">No script files detected.</p>';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'eds-file-list';
  list.style.cssText = 'list-style: none; padding: 0; margin: 0;';
  
  scriptFilesArray.forEach((scriptFile) => {
    const li = document.createElement('li');
    li.className = 'eds-file-item';
    li.dataset.scriptUrl = scriptFile.url;
    li.style.cssText = 'margin-bottom: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;';

    const header = document.createElement('div');
    header.className = 'eds-file-header';
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-muted); cursor: pointer;';
    
    const title = document.createElement('div');
    title.className = 'eds-file-title';
    title.textContent = scriptFile.filename;
    title.style.cssText = 'font-weight: 600; color: var(--text); flex: 1;';
    
    const url = document.createElement('div');
    url.className = 'eds-file-url';
    // クエリパラメータを含むパスを表示
    try {
      const urlObj = new URL(scriptFile.url);
      url.textContent = urlObj.pathname + urlObj.search;
    } catch (e) {
      url.textContent = scriptFile.pathname;
    }
    url.style.cssText = 'font-size: 11px; color: var(--muted); margin-left: 12px; font-family: monospace;';
    
    const toggle = document.createElement('span');
    toggle.className = 'eds-file-toggle';
    toggle.textContent = '▶';
    toggle.style.cssText = 'font-size: 10px; color: var(--muted); transition: transform 0.2s; flex-shrink: 0;';
    
    const rightSection = document.createElement('div');
    rightSection.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 12px;';
    
    const leftSection = document.createElement('div');
    leftSection.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;';
    leftSection.appendChild(toggle);
    leftSection.appendChild(title);
    leftSection.appendChild(url);
    
    header.appendChild(leftSection);
    header.appendChild(rightSection);

    const content = document.createElement('div');
    content.className = 'eds-file-content';
    
    // 保存された開閉状態を復元
    const wasExpanded = expandedUrls.has(scriptFile.url);
    const wasLoaded = loadedUrls.has(scriptFile.url);
    
    if (wasExpanded) {
      content.style.cssText = 'display: block; padding: 0; background: var(--bg); max-height: 400px; overflow-y: auto; position: relative;';
      toggle.textContent = '▼';
    } else {
      content.style.cssText = 'display: none; padding: 0; background: var(--bg); max-height: 400px; overflow-y: auto; position: relative;';
      toggle.textContent = '▶';
    }

    // 既に読み込まれている場合はコードを表示
    if (wasLoaded && wasExpanded) {
      (async () => {
        try {
          const response = await fetch(scriptFile.url);
          if (!response.ok) {
            throw new Error(`Failed to load script: ${response.status} ${response.statusText}`);
          }
          const codeText = await response.text();
          
          const pre = document.createElement('pre');
          pre.className = 'eds-code';
          pre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;';
          
          const code = document.createElement('code');
          code.innerHTML = highlightCode(codeText, 'javascript');
          code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
          
          pre.appendChild(code);
          content.innerHTML = '';
          
          // 検索キーを生成（URLをキーにする）
          const searchKey = `script-${scriptFile.url}`;
          
          // コピーボタンと検索UIを追加（既に存在しない場合のみ）
          if (!rightSection.querySelector('.eds-copy-button')) {
            const copyBtn = createCopyButton(codeText, null, null);
            copyBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s;';
            rightSection.appendChild(copyBtn);
            
            // 全画面表示ボタンを追加
            const fullscreenBtn = document.createElement('button');
            fullscreenBtn.innerHTML = '⛶';
            fullscreenBtn.title = 'Fullscreen view';
            fullscreenBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; opacity: 0.7;';
            fullscreenBtn.addEventListener('mouseenter', () => {
              fullscreenBtn.style.opacity = '1';
              fullscreenBtn.style.background = 'var(--bg)';
            });
            fullscreenBtn.addEventListener('mouseleave', () => {
              fullscreenBtn.style.opacity = '0.7';
              fullscreenBtn.style.background = 'transparent';
            });
            fullscreenBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              createFullscreenViewer(codeText, code.innerHTML, scriptFile.pathname || scriptFile.url, searchKey);
            });
            rightSection.appendChild(fullscreenBtn);
          }
          
          const searchUI = createSearchUI(content, codeText, searchKey);
          
          const codeContainer = document.createElement('div');
          codeContainer.style.cssText = 'padding: 16px;';
          codeContainer.appendChild(pre);
          
          content.appendChild(searchUI);
          content.appendChild(codeContainer);
        } catch (err) {
          console.error('[EDS Inspector Panel] Error loading script:', err);
          content.innerHTML = `<p class="eds-empty" style="color: #ef4444;">Error loading script: ${err.message}</p>`;
        }
      })();
    } else {
      // ローディング表示
      const loading = document.createElement('div');
      loading.textContent = 'Loading...';
      loading.style.cssText = 'color: var(--muted);';
      content.appendChild(loading);
    }

    const handleToggle = async () => {
      const isExpanded = content.style.display !== 'none';
      const newExpanded = !isExpanded;
      content.style.display = newExpanded ? 'block' : 'none';
      toggle.textContent = newExpanded ? '▼' : '▶';

      // 初回展開時にコードを読み込む
      if (newExpanded && !wasLoaded) {
        try {
          content.innerHTML = '<div style="color: var(--muted);">Loading...</div>';
          const response = await fetch(scriptFile.url);
          if (!response.ok) {
            throw new Error(`Failed to load script: ${response.status} ${response.statusText}`);
          }
          const codeText = await response.text();
          
          content.innerHTML = '';
          const pre = document.createElement('pre');
          pre.className = 'eds-code';
          pre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;';
          
          const code = document.createElement('code');
          code.innerHTML = highlightCode(codeText, 'javascript');
          code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
          
          pre.appendChild(code);
          
          // コピーボタンと検索UIを追加（既に存在しない場合のみ）
          if (!rightSection.querySelector('.eds-copy-button')) {
            const copyBtn = createCopyButton(codeText, null, null);
            copyBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s;';
            rightSection.appendChild(copyBtn);
            
            // 全画面表示ボタンを追加
            const fullscreenBtn = document.createElement('button');
            fullscreenBtn.innerHTML = '⛶';
            fullscreenBtn.title = 'Fullscreen view';
            fullscreenBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; opacity: 0.7;';
            fullscreenBtn.addEventListener('mouseenter', () => {
              fullscreenBtn.style.opacity = '1';
              fullscreenBtn.style.background = 'var(--bg)';
            });
            fullscreenBtn.addEventListener('mouseleave', () => {
              fullscreenBtn.style.opacity = '0.7';
              fullscreenBtn.style.background = 'transparent';
            });
            fullscreenBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const searchKey = `script-${scriptFile.url}`;
              createFullscreenViewer(codeText, code.innerHTML, scriptFile.pathname || scriptFile.url, searchKey);
            });
            rightSection.appendChild(fullscreenBtn);
          }
          
          // 検索キーを生成（URLをキーにする）
          const searchKey = `script-${scriptFile.url}`;
          const searchUI = createSearchUI(content, codeText, searchKey);
          
          const codeContainer = document.createElement('div');
          codeContainer.style.cssText = 'padding: 16px;';
          codeContainer.appendChild(pre);
          
          content.appendChild(searchUI);
          content.appendChild(codeContainer);
        } catch (err) {
          console.error('[EDS Inspector Panel] Error loading script:', err);
          content.innerHTML = `<p class="eds-empty" style="color: #ef4444;">Error loading script: ${err.message}</p>`;
        }
      }
    };

    header.addEventListener('click', handleToggle);

    li.appendChild(header);
    li.appendChild(content);
    list.appendChild(li);
  });

  root.appendChild(list);
}

// 後方互換性のため、renderCodeもエクスポート
export function renderCode(state) {
  renderScripts(state);
}

