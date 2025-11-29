import { parseMarkdown, parseMarkdownAST } from '../../utils/markdown.js';
import { getMarkdownUrl } from '../../utils/url.js';

// Markdownのキャッシュ
let markdownCache = {
  url: null,
  content: null,
  timestamp: null
};

/**
 * ASTツリーをレンダリング
 */
function renderASTTree(ast, parent) {
  ast.forEach((node) => {
    const li = document.createElement('li');
    
    switch (node.type) {
      case 'heading':
        li.textContent = `${'#'.repeat(node.level)} ${node.text}`;
        li.classList.add('eds-ast-heading');
        li.style.fontWeight = '600';
        li.style.marginTop = '8px';
        break;
      case 'paragraph':
        li.textContent = `📄 ${node.text}`;
        li.classList.add('eds-ast-paragraph');
        break;
      case 'list':
        li.textContent = `📋 List (${node.items.length} items)`;
        li.classList.add('eds-ast-list');
        li.classList.add('has-children');
        const ul = document.createElement('ul');
        node.items.forEach((item) => {
          const itemLi = document.createElement('li');
          itemLi.textContent = `• ${item}`;
          ul.appendChild(itemLi);
        });
        li.appendChild(ul);
        break;
      case 'code':
        li.textContent = `💻 Code block (${node.language || 'plain'})`;
        li.classList.add('eds-ast-code');
        li.title = node.content.substring(0, 100) + (node.content.length > 100 ? '...' : '');
        break;
      case 'link':
        li.innerHTML = `🔗 <a href="${node.url}" target="_blank">${node.text}</a>`;
        li.classList.add('eds-ast-link');
        break;
      case 'image':
        li.innerHTML = `🖼️ <span>${node.alt || node.url}</span>`;
        li.classList.add('eds-ast-image');
        break;
      case 'table':
        li.textContent = `📊 Table (${node.header.length} columns, ${node.rows.length} rows)`;
        li.classList.add('eds-ast-table');
        break;
      default:
        li.textContent = `❓ ${node.type}`;
    }
    
    parent.appendChild(li);
  });
}

/**
 * Docsコンテンツをレンダリング
 */
function renderDocsContent(container, markdown, mode) {
  container.innerHTML = '';
  
  switch (mode) {
    case 'source':
      // ソースコード表示
      const sourcePre = document.createElement('pre');
      sourcePre.className = 'eds-code';
      sourcePre.textContent = markdown;
      container.appendChild(sourcePre);
      break;
      
    case 'preview':
      // プレビュー表示（marked.jsを使用）
      const html = parseMarkdown(markdown);
      const previewDiv = document.createElement('div');
      previewDiv.className = 'eds-docs-content';
      previewDiv.innerHTML = html;
      container.appendChild(previewDiv);
      break;
      
    case 'structure':
      // AST構造表示
      const ast = parseMarkdownAST(markdown);
      const treeUl = document.createElement('ul');
      treeUl.className = 'eds-tree eds-ast-tree';
      renderASTTree(ast, treeUl);
      container.appendChild(treeUl);
      break;
  }
}

/**
 * Docsタブをレンダリング
 */
export async function renderDocs(tabId) {
  const root = document.querySelector('[data-tab-panel="docs"]');
  
  // モード切り替えUIが既に存在する場合は、コンテンツエリアのみ更新
  const existingModeSelector = root.querySelector('.eds-docs-mode-selector');
  const existingContentArea = root.querySelector('.eds-docs-content-area');
  
  if (existingModeSelector && existingContentArea && markdownCache.content) {
    // 既存のモードセレクターとコンテンツエリアがある場合は、コンテンツのみ更新
    const currentMode = root.dataset.docsMode || 'preview';
    renderDocsContent(existingContentArea, markdownCache.content, currentMode);
    return;
  }
  
  // 初回読み込み時のみローディング表示
  if (!existingModeSelector) {
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
    
    // モード切り替えUI（既に存在する場合はスキップ）
    let modeSelector = existingModeSelector;
    if (!modeSelector) {
      modeSelector = document.createElement('div');
      modeSelector.className = 'eds-docs-mode-selector';
      modeSelector.style.cssText = 'display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 12px;';
      
      const modes = ['source', 'preview', 'structure'];
      const modeLabels = { source: 'Source', preview: 'Preview', structure: 'Structure' };
      let currentMode = root.dataset.docsMode || 'preview';
      
      modes.forEach((mode) => {
        const btn = document.createElement('button');
        btn.className = 'eds-docs-mode-btn';
        btn.textContent = modeLabels[mode];
        btn.dataset.mode = mode;
        btn.style.cssText = `
          padding: 8px 16px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: ${currentMode === mode ? 'var(--accent)' : 'var(--bg-muted)'};
          color: ${currentMode === mode ? '#0b1220' : 'var(--text)'};
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        `;
        btn.addEventListener('click', () => {
          root.dataset.docsMode = mode;
          const contentArea = root.querySelector('.eds-docs-content-area');
          if (contentArea && markdownCache.content) {
            renderDocsContent(contentArea, markdownCache.content, mode);
          }
          // ボタンのスタイルを更新
          modeSelector.querySelectorAll('.eds-docs-mode-btn').forEach((b) => {
            const isActive = b.dataset.mode === mode;
            b.style.background = isActive ? 'var(--accent)' : 'var(--bg-muted)';
            b.style.color = isActive ? '#0b1220' : 'var(--text)';
          });
        });
        modeSelector.appendChild(btn);
      });
    }
    
    const contentArea = existingContentArea || document.createElement('div');
    contentArea.className = 'eds-docs-content-area';
    
    // 初回のみDOMに追加
    if (!existingModeSelector) {
      root.innerHTML = '';
      root.appendChild(modeSelector);
      root.appendChild(contentArea);
    }
    
    // コンテンツをレンダリング
    const currentMode = root.dataset.docsMode || 'preview';
    renderDocsContent(contentArea, markdown, currentMode);
  } catch (err) {
    console.error('[EDS Inspector Panel] Error loading docs:', err);
    root.innerHTML = `<p class="eds-empty">Error loading documentation: ${err.message}</p>`;
  }
}

