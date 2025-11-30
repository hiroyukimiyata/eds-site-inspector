/**
 * JSONタブのレンダラー
 */
import { highlightCode } from '../utils.js';

/**
 * JSONタブをレンダリング
 */
export function renderJson(state) {
  const root = document.querySelector('[data-tab-panel="json"]');
  
  // JSONタブが表示されていない場合は更新しない
  if (root.hidden) {
    return;
  }

  // 現在の開閉状態を保存
  const expandedUrls = new Set();
  const loadedUrls = new Set();
  const existingItems = root.querySelectorAll('.eds-file-item');
  existingItems.forEach(item => {
    const url = item.dataset.jsonUrl;
    const content = item.querySelector('.eds-file-content');
    if (url && content && content.style.display !== 'none') {
      expandedUrls.add(url);
    }
    if (url && content && content.querySelector('.eds-code')) {
      loadedUrls.add(url);
    }
  });

  root.innerHTML = '';

  // jsonFilesが配列かMapかを確認
  let jsonFilesArray = [];
  if (state.jsonFiles) {
    if (Array.isArray(state.jsonFiles)) {
      jsonFilesArray = state.jsonFiles;
    } else if (state.jsonFiles instanceof Map) {
      jsonFilesArray = Array.from(state.jsonFiles.values());
    } else if (typeof state.jsonFiles === 'object') {
      // オブジェクトの場合は、valuesを取得
      jsonFilesArray = Object.values(state.jsonFiles);
    }
  }

  console.log('[EDS Inspector Panel] renderJson - jsonFiles:', state.jsonFiles, 'array:', jsonFilesArray);

  if (!jsonFilesArray || jsonFilesArray.length === 0) {
    root.innerHTML = '<p class="eds-empty">No JSON files detected.</p>';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'eds-file-list';
  list.style.cssText = 'list-style: none; padding: 0; margin: 0;';
  
  jsonFilesArray.forEach((jsonFile) => {
    const li = document.createElement('li');
    li.className = 'eds-file-item';
    li.dataset.jsonUrl = jsonFile.url; // URLを保存（開閉状態の復元用）
    li.style.cssText = 'margin-bottom: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;';

    const header = document.createElement('div');
    header.className = 'eds-file-header';
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-muted); cursor: pointer;';
    
    const title = document.createElement('div');
    title.className = 'eds-file-title';
    title.textContent = jsonFile.filename;
    title.style.cssText = 'font-weight: 600; color: var(--text); flex: 1;';
    
    const url = document.createElement('div');
    url.className = 'eds-file-url';
    // クエリパラメータを含むパスを表示
    try {
      const urlObj = new URL(jsonFile.url);
      url.textContent = urlObj.pathname + urlObj.search;
    } catch (e) {
      url.textContent = jsonFile.pathname;
    }
    url.style.cssText = 'font-size: 11px; color: var(--muted); margin-left: 12px; font-family: monospace;';
    
    const toggle = document.createElement('span');
    toggle.className = 'eds-file-toggle';
    toggle.textContent = '▶';
    toggle.style.cssText = 'font-size: 10px; color: var(--muted); margin-left: 12px; transition: transform 0.2s;';
    
    header.appendChild(title);
    header.appendChild(url);
    header.appendChild(toggle);

    const content = document.createElement('div');
    content.className = 'eds-file-content';
    
    // 保存された開閉状態を復元
    const wasExpanded = expandedUrls.has(jsonFile.url);
    const wasLoaded = loadedUrls.has(jsonFile.url);
    
    if (wasExpanded) {
      content.style.cssText = 'display: block; padding: 16px; background: var(--bg); max-height: 400px; overflow-y: auto;';
      toggle.textContent = '▼';
    } else {
      content.style.cssText = 'display: none; padding: 16px; background: var(--bg); max-height: 400px; overflow-y: auto;';
      toggle.textContent = '▶';
    }

    // 既に読み込まれている場合はJSONを表示、そうでなければローディング表示
    if (wasLoaded && wasExpanded) {
      // 既に読み込まれている場合は、JSONを再読み込み
      (async () => {
        try {
          const response = await fetch(jsonFile.url);
          if (!response.ok) {
            throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
          }
          const jsonData = await response.json();
          const jsonString = JSON.stringify(jsonData, null, 2);
          
          const pre = document.createElement('pre');
          pre.className = 'eds-code';
          pre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;';
          
          const code = document.createElement('code');
          code.innerHTML = highlightCode(jsonString, 'json');
          code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
          
          pre.appendChild(code);
          content.innerHTML = '';
          content.appendChild(pre);
        } catch (err) {
          console.error('[EDS Inspector Panel] Error loading JSON:', err);
          content.innerHTML = `<p class="eds-empty" style="color: #ef4444;">Error loading JSON: ${err.message}</p>`;
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

      // 初回展開時にJSONを読み込む
      if (newExpanded && !wasLoaded) {
        try {
          content.innerHTML = '<div style="color: var(--muted);">Loading...</div>';
          const response = await fetch(jsonFile.url);
          if (!response.ok) {
            throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
          }
          const jsonData = await response.json();
          const jsonString = JSON.stringify(jsonData, null, 2);
          
          // ローディングを削除してJSONを表示
          content.innerHTML = '';
          const pre = document.createElement('pre');
          pre.className = 'eds-code';
          pre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;';
          
          const code = document.createElement('code');
          code.innerHTML = highlightCode(jsonString, 'json');
          code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
          
          pre.appendChild(code);
          content.appendChild(pre);
        } catch (err) {
          console.error('[EDS Inspector Panel] Error loading JSON:', err);
          content.innerHTML = `<p class="eds-empty" style="color: #ef4444;">Error loading JSON: ${err.message}</p>`;
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

