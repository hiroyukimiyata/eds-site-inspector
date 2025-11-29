import { getMarkdownUrl } from '../../utils/url.js';

// Markdownのキャッシュ
let markdownCache = {
  url: null,
  content: null,
  timestamp: null
};

/**
 * Docsコンテンツをレンダリング（Sourceのみ）
 */
function renderDocsContent(container, markdown) {
  container.innerHTML = '';
  const sourcePre = document.createElement('pre');
  sourcePre.className = 'eds-code';
  sourcePre.textContent = markdown;
  container.appendChild(sourcePre);
}

/**
 * Docsタブをレンダリング
 */
export async function renderDocs(tabId) {
  const root = document.querySelector('[data-tab-panel="docs"]');
  
  // コンテンツエリアが既に存在する場合は、コンテンツのみ更新
  const existingContentArea = root.querySelector('.eds-docs-content-area');
  
  if (existingContentArea && markdownCache.content) {
    renderDocsContent(existingContentArea, markdownCache.content);
    return;
  }
  
  // 初回読み込み時のみローディング表示
  if (!existingContentArea) {
    root.innerHTML = '<p class="eds-loading">Loading documentation…</p>';
  }
  
  try {
    // 現在のタブのURLを取得
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      root.innerHTML = '<p class="eds-empty">Could not determine current page URL.</p>';
      return;
    }
    
    const currentUrl = tab.url;
    const markdownUrl = getMarkdownUrl(currentUrl);
    
    if (!markdownUrl) {
      root.innerHTML = '<p class="eds-empty">Could not construct markdown URL.</p>';
      return;
    }
    
    // キャッシュをチェック（同じURLで5分以内ならキャッシュを使用）
    const now = Date.now();
    const cacheAge = markdownCache.timestamp ? (now - markdownCache.timestamp) : Infinity;
    const useCache = markdownCache.url === markdownUrl && cacheAge < 5 * 60 * 1000;
    
    let markdown;
    if (useCache && markdownCache.content) {
      markdown = markdownCache.content;
      console.log('[EDS Inspector Panel] Using cached markdown');
    } else {
      // Markdownを取得
      const response = await fetch(markdownUrl);
      if (!response.ok) {
        if (response.status === 404) {
          root.innerHTML = `<p class="eds-empty">Markdown file not found at:<br><code style="word-break: break-all; background: var(--bg-muted); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">${markdownUrl}</code></p>`;
        } else {
          root.innerHTML = `<p class="eds-empty">Failed to load markdown: ${response.status} ${response.statusText}</p>`;
        }
        return;
      }
      
      markdown = await response.text();
      // キャッシュに保存
      markdownCache = {
        url: markdownUrl,
        content: markdown,
        timestamp: now
      };
    }
    
    const contentArea = existingContentArea || document.createElement('div');
    contentArea.className = 'eds-docs-content-area';
    
    // 初回のみDOMに追加
    if (!existingContentArea) {
      root.innerHTML = '';
      root.appendChild(contentArea);
    }
    
    // コンテンツをレンダリング（Sourceのみ）
    renderDocsContent(contentArea, markdown);
  } catch (err) {
    console.error('[EDS Inspector Panel] Error loading docs:', err);
    root.innerHTML = `<p class="eds-empty">Error loading documentation: ${err.message}</p>`;
  }
}

