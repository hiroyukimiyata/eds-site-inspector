import { getMarkdownUrl } from '../../utils/url.js';
import { createSearchUI } from '../utils/file-utils.js';

// Markdownのキャッシュ
let markdownCache = {
  url: null,
  content: null,
  timestamp: null
};

// Markupのキャッシュ
let markupCache = {
  url: null,
  content: null,
  timestamp: null
};

// 現在のモード（'markdown' または 'markup'）
let currentMode = 'markdown';

/**
 * Docsコンテンツをレンダリング
 */
function renderDocsContent(container, content, mode) {
  container.innerHTML = '';
  
  // コンテンツエリアを作成
  const contentArea = document.createElement('div');
  contentArea.className = 'eds-docs-content';
  contentArea.style.cssText = 'padding: 0; background: var(--bg); max-height: 100vh; overflow-y: auto; position: relative;';
  
  // 検索キーを生成（モードを含める）
  const searchKey = `docs-${mode}`;
  // 検索UIを追加
  const searchUI = createSearchUI(contentArea, content, searchKey);
  
  // コードコンテナを作成
  const codeContainer = document.createElement('div');
  codeContainer.style.cssText = 'padding: 16px;';
  
      const sourcePre = document.createElement('pre');
      sourcePre.className = 'eds-code';
  sourcePre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;';
  
  const sourceCode = document.createElement('code');
  sourceCode.textContent = content;
  sourceCode.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
  
  sourcePre.appendChild(sourceCode);
  codeContainer.appendChild(sourcePre);
  contentArea.appendChild(searchUI);
  contentArea.appendChild(codeContainer);
  container.appendChild(contentArea);
}

/**
 * モード切り替えボタンを作成
 */
function createModeToggle(root, tabId) {
  const toggleContainer = document.createElement('div');
  toggleContainer.style.cssText = 'display: flex; gap: 8px; padding: 12px; background: var(--bg-muted); border-bottom: 1px solid var(--border);';
  
  const markdownBtn = document.createElement('button');
  markdownBtn.textContent = 'Markdown';
  markdownBtn.className = 'eds-mode-toggle';
  markdownBtn.style.cssText = 'padding: 6px 16px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); cursor: pointer; font-size: 12px; transition: all 0.2s;';
  
  const markupBtn = document.createElement('button');
  markupBtn.textContent = 'Markup';
  markupBtn.className = 'eds-mode-toggle';
  markupBtn.style.cssText = 'padding: 6px 16px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); cursor: pointer; font-size: 12px; transition: all 0.2s;';
  
  const updateButtons = () => {
    if (currentMode === 'markdown') {
      markdownBtn.style.cssText = 'padding: 6px 16px; border: 1px solid var(--border); border-radius: 4px; background: #6366f1; color: white; cursor: pointer; font-size: 12px; transition: all 0.2s;';
      markupBtn.style.cssText = 'padding: 6px 16px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); cursor: pointer; font-size: 12px; transition: all 0.2s;';
    } else {
      markdownBtn.style.cssText = 'padding: 6px 16px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); cursor: pointer; font-size: 12px; transition: all 0.2s;';
      markupBtn.style.cssText = 'padding: 6px 16px; border: 1px solid var(--border); border-radius: 4px; background: #6366f1; color: white; cursor: pointer; font-size: 12px; transition: all 0.2s;';
    }
  };
  
  markdownBtn.addEventListener('click', async () => {
    currentMode = 'markdown';
    updateButtons();
    await renderDocs(tabId);
  });
  
  markupBtn.addEventListener('click', async () => {
    currentMode = 'markup';
    updateButtons();
    await renderDocs(tabId);
  });
  
  updateButtons();
  
  toggleContainer.appendChild(markdownBtn);
  toggleContainer.appendChild(markupBtn);
  
  return toggleContainer;
}

/**
 * SSRされたHTMLを取得
 */
async function getSSRMarkup(tabId) {
  try {
    // 現在のタブのURLを取得
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      throw new Error('Could not determine current page URL');
    }
    
    const currentUrl = tab.url;
    
    // キャッシュをチェック（同じURLで5分以内ならキャッシュを使用）
    const now = Date.now();
    const cacheAge = markupCache.timestamp ? (now - markupCache.timestamp) : Infinity;
    const useCache = markupCache.url === currentUrl && cacheAge < 5 * 60 * 1000;
    
    if (useCache && markupCache.content) {
      console.log('[EDS Inspector Panel] Using cached markup');
      return markupCache.content;
    }
    
    // SSRされたHTMLを取得
    const response = await fetch(currentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch SSR markup: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // キャッシュに保存
    markupCache = {
      url: currentUrl,
      content: html,
      timestamp: now
    };
    
    return html;
  } catch (err) {
    console.error('[EDS Inspector Panel] Error fetching SSR markup:', err);
    throw err;
  }
}

/**
 * Docsタブをレンダリング
 */
export async function renderDocs(tabId) {
  const root = document.querySelector('[data-tab-panel="docs"]');
  
  // モード切り替えボタンが存在しない場合は作成
  let toggleContainer = root.querySelector('.eds-mode-toggle-container');
  if (!toggleContainer) {
    toggleContainer = createModeToggle(root, tabId);
    toggleContainer.className = 'eds-mode-toggle-container';
    root.innerHTML = '';
    root.appendChild(toggleContainer);
  }
  
  // コンテンツエリアを取得または作成
  let contentArea = root.querySelector('.eds-docs-content-area');
  if (!contentArea) {
    contentArea = document.createElement('div');
    contentArea.className = 'eds-docs-content-area';
    root.appendChild(contentArea);
  }
  
  // ローディング表示
  contentArea.innerHTML = '<p class="eds-loading">Loading documentation…</p>';
  
  try {
    let content;
    
    if (currentMode === 'markdown') {
    // 現在のタブのURLを取得
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
        contentArea.innerHTML = '<p class="eds-empty">Could not determine current page URL.</p>';
      return;
    }
    
    const currentUrl = tab.url;
    const markdownUrl = getMarkdownUrl(currentUrl);
    
    if (!markdownUrl) {
        contentArea.innerHTML = '<p class="eds-empty">Could not construct markdown URL.</p>';
      return;
    }
    
    // キャッシュをチェック（同じURLで5分以内ならキャッシュを使用）
    const now = Date.now();
    const cacheAge = markdownCache.timestamp ? (now - markdownCache.timestamp) : Infinity;
    const useCache = markdownCache.url === markdownUrl && cacheAge < 5 * 60 * 1000;
    
    if (useCache && markdownCache.content) {
        content = markdownCache.content;
      console.log('[EDS Inspector Panel] Using cached markdown');
    } else {
      // Markdownを取得
      const response = await fetch(markdownUrl);
      if (!response.ok) {
        if (response.status === 404) {
            contentArea.innerHTML = `<p class="eds-empty">Markdown file not found at:<br><code style="word-break: break-all; background: var(--bg-muted); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">${markdownUrl}</code></p>`;
        } else {
            contentArea.innerHTML = `<p class="eds-empty">Failed to load markdown: ${response.status} ${response.statusText}</p>`;
        }
        return;
      }
      
        content = await response.text();
      // キャッシュに保存
      markdownCache = {
        url: markdownUrl,
          content: content,
        timestamp: now
      };
    }
    } else {
      // Markupモード: SSRされたHTMLを取得
      content = await getSSRMarkup(tabId);
    }
    
    // コンテンツをレンダリング
    renderDocsContent(contentArea, content, currentMode);
  } catch (err) {
    console.error('[EDS Inspector Panel] Error loading docs:', err);
    contentArea.innerHTML = `<p class="eds-empty">Error loading documentation: ${err.message}</p>`;
  }
}

