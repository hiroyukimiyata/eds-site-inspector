import { getMarkdownUrl } from '../../utils/url.js';
import { createSearchUI } from '../utils/file-utils.js';
import { sendToContent } from '../utils.js';

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

// 現在選択されているドキュメントURLを保持
let currentSelectedDocUrl = null;

/**
 * Docsコンテンツをレンダリング
 */
function renderDocsContent(container, content, mode, tabId) {
  container.innerHTML = '';
  
  // 単一ドキュメントの表示
  const contentText = typeof content === 'object' ? content.documents || content : content;
  renderSingleDoc(container, contentText, mode, tabId);
}

/**
 * 単一のドキュメントをレンダリング
 */
function renderSingleDoc(container, content, mode, tabId, isNested = false) {
  // 既存のコンテンツエリアを削除（ネストされていない場合）
  if (!isNested) {
    const existing = container.querySelector('.eds-docs-content');
    if (existing) existing.remove();
  }
  
  // コンテンツエリアを作成
  const contentArea = document.createElement('div');
  contentArea.className = 'eds-docs-content';
  contentArea.style.cssText = 'padding: 0; background: var(--bg); max-height: 100vh; overflow-y: auto; position: relative;';
  
  // 検索キーを生成（モードを含める）
  const searchKey = `docs-${mode}-${Date.now()}`;
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
 * SSRされたHTMLを取得（複数のHTMLドキュメントに対応）
 */
async function getSSRMarkup(tabId) {
  try {
    // Fetchで取得されたHTMLドキュメントのリストを取得
    const fetchedDocs = await sendToContent(tabId, 'get-fetched-html-documents');
    console.log('[EDS Inspector Panel] Fetched docs:', fetchedDocs);
    
    // 現在のタブのURLを取得
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      throw new Error('Could not determine current page URL');
    }
    
    const currentUrl = tab.url.split('?')[0]; // クエリパラメータを除去
    
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
    
    // fetchedDocsが存在し、複数のドキュメントがある場合のみ複数ドキュメントUIを表示
    const hasMultipleDocs = fetchedDocs && fetchedDocs.length > 0;
    
    // キャッシュに保存
    markupCache = {
      url: currentUrl,
      content: { documents: html, fetchedDocs: hasMultipleDocs ? fetchedDocs : [], mainUrl: currentUrl },
      timestamp: now
    };
    
    return { documents: html, fetchedDocs: hasMultipleDocs ? fetchedDocs : [], mainUrl: currentUrl };
  } catch (err) {
    console.error('[EDS Inspector Panel] Error fetching SSR markup:', err);
    throw err;
  }
}

/**
 * ファイル切り替えタブを作成
 */
function createDocTabs(root, tabId, allDocs, mainUrl) {
  // 既存のファイル切り替えタブを削除
  const existing = root.querySelector('.eds-doc-tabs-container');
  if (existing) {
    existing.remove();
  }
  
  // デフォルトでメインドキュメントを選択
  if (!currentSelectedDocUrl) {
    currentSelectedDocUrl = mainUrl;
  }
  
  const docTabsContainer = document.createElement('div');
  docTabsContainer.className = 'eds-doc-tabs-container';
  docTabsContainer.style.cssText = 'display: flex; gap: 4px; padding: 8px 12px; border-bottom: 1px solid var(--border); background: var(--bg-muted); overflow-x: auto;';
  
  allDocs.forEach((doc) => {
    const tab = document.createElement('button');
    tab.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;';
    
    try {
      const urlObj = new URL(doc.url);
      let pathname = urlObj.pathname;
      // パス名が / または空の場合は / と表示
      if (pathname === '/' || pathname === '') {
        pathname = '/';
      }
      const displayName = doc.isMain ? `Main: ${pathname}` : pathname;
      tab.textContent = displayName;
    } catch (e) {
      tab.textContent = doc.url;
    }
    
    // 選択状態のスタイル
    if (doc.url === currentSelectedDocUrl) {
      tab.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: #6366f1; color: white; cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;';
    }
    
    tab.addEventListener('click', async () => {
      currentSelectedDocUrl = doc.url;
      
      // すべてのタブのスタイルをリセット
      docTabsContainer.querySelectorAll('button').forEach(btn => {
        btn.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;';
      });
      
      // 選択されたタブのスタイルを更新
      tab.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: #6366f1; color: white; cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;';
      
      // 現在のモードに応じてコンテンツを取得・表示
      await loadAndRenderDoc(doc.url, tabId);
    });
    
    docTabsContainer.appendChild(tab);
  });
  
  // モード切り替えボタンの下に挿入
  const toggleContainer = root.querySelector('.eds-mode-toggle-container');
  if (toggleContainer && toggleContainer.nextSibling) {
    root.insertBefore(docTabsContainer, toggleContainer.nextSibling);
  } else {
    root.appendChild(docTabsContainer);
  }
  
  return docTabsContainer;
}

/**
 * 指定されたURLのドキュメントを読み込んでレンダリング
 */
async function loadAndRenderDoc(url, tabId) {
  const root = document.querySelector('[data-tab-panel="docs"]');
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
      const markdownUrl = getMarkdownUrl(url);
      
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
      // Markupモード: 拡張子に応じた内容を表示（.plain.html なら .plain.html、.html なら .html）
      // まず、キャッシュされたHTMLを取得を試みる
      const html = await sendToContent(tabId, 'get-fetched-html-content', { url: url });
      
      if (html) {
        content = html;
      } else {
        // キャッシュにない場合は、URLをそのまま使ってfetch（拡張子に応じた内容を取得）
        const response = await fetch(url);
        if (!response.ok) {
          contentArea.innerHTML = `<p class="eds-empty">Failed to load markup: ${response.status} ${response.statusText}</p>`;
          return;
        }
        content = await response.text();
      }
    }
    
    // コンテンツをレンダリング
    renderDocsContent(contentArea, content, currentMode, tabId);
  } catch (err) {
    console.error('[EDS Inspector Panel] Error loading doc:', err);
    contentArea.innerHTML = `<p class="eds-empty">Error loading documentation: ${err.message}</p>`;
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
  
  // 複数のドキュメントがあるかチェック
  const fetchedDocs = await sendToContent(tabId, 'get-fetched-html-documents');
  
  // 現在のタブのURLを取得
  const tab = await chrome.tabs.get(tabId);
  if (!tab || !tab.url) {
    const contentArea = root.querySelector('.eds-docs-content-area') || document.createElement('div');
    contentArea.className = 'eds-docs-content-area';
    if (!root.querySelector('.eds-docs-content-area')) {
      root.appendChild(contentArea);
    }
    contentArea.innerHTML = '<p class="eds-empty">Could not determine current page URL.</p>';
    return;
  }
  
  const mainUrl = tab.url.split('?')[0];
  
  // 複数のドキュメントがある場合、ファイル切り替えタブを作成
  // fetchedDocsにはメインドキュメントは含まれていないので、メインを追加
  if (fetchedDocs && fetchedDocs.length > 0) {
    const allDocs = [
      { url: mainUrl, isMain: true },
      ...fetchedDocs.map(doc => ({ url: doc.url, isMain: false }))
    ];
    createDocTabs(root, tabId, allDocs, mainUrl);
  } else {
    // 単一ドキュメントの場合はファイル切り替えタブを削除
    const existing = root.querySelector('.eds-doc-tabs-container');
    if (existing) {
      existing.remove();
    }
  }
  
  // コンテンツエリアを取得または作成
  let contentArea = root.querySelector('.eds-docs-content-area');
  if (!contentArea) {
    contentArea = document.createElement('div');
    contentArea.className = 'eds-docs-content-area';
    root.appendChild(contentArea);
  }
  
  // 現在選択されているURL（デフォルトはメインURL）でドキュメントを読み込む
  const selectedUrl = currentSelectedDocUrl || mainUrl;
  await loadAndRenderDoc(selectedUrl, tabId);
}

