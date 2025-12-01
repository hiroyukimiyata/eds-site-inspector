import { getMarkdownUrl } from '../../utils/url.js';
import { createSearchUI, createFullscreenViewer, createFullscreenEnterIcon } from '../utils/file-utils.js';
import { sendToContent, highlightCode } from '../utils.js';
import { processCode } from '../utils/code-processor.js';

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
let currentMode = 'markup';

// 現在選択されているドキュメントURLを保持
let currentSelectedDocUrl = null;

/**
 * Docsコンテンツをレンダリング
 */
function renderDocsContent(container, content, mode, tabId, docUrl = null) {
  container.innerHTML = '';
  
  // 単一ドキュメントの表示
  const contentText = typeof content === 'object' ? content.documents || content : content;
  renderSingleDoc(container, contentText, mode, tabId, false, docUrl);
}

/**
 * 単一のドキュメントをレンダリング
 */
function renderSingleDoc(container, content, mode, tabId, isNested = false, docUrl = null) {
  // 既存のコンテンツエリアを削除（ネストされていない場合）
  if (!isNested) {
    const existing = container.querySelector('.eds-docs-content');
    if (existing) existing.remove();
  }
  
  // 現在表示されているコンテンツのURLを確実に取得（loadAndRenderDocから渡されたdocUrlを優先）
  // docUrlが存在する場合のみ使用し、それ以外はcurrentSelectedDocUrlを使用
  const actualDocUrl = (docUrl !== null && docUrl !== undefined) ? docUrl : (currentSelectedDocUrl || null);
  
  // デバッグ用：URLが正しく渡されているか確認
  if (process.env.NODE_ENV === 'development') {
    console.log('[EDS Inspector Panel] renderSingleDoc - docUrl:', docUrl, 'actualDocUrl:', actualDocUrl, 'currentSelectedDocUrl:', currentSelectedDocUrl);
  }
  
  // コンテンツエリアを作成
  const contentArea = document.createElement('div');
  contentArea.className = 'eds-docs-content';
  contentArea.style.cssText = 'padding: 0; background: var(--bg); max-height: 100vh; overflow-y: auto; position: relative;';
  
  // 検索キーを生成（モードを含める）
  const searchKey = `docs-${mode}-${Date.now()}`;
  // 検索UIを追加
  const searchUI = createSearchUI(contentArea, content, searchKey);
  
  // 全画面表示ボタンを検索UIの右側に追加
  const searchBar = searchUI.querySelector('.eds-search-container > div:first-child');
  if (searchBar) {
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.innerHTML = createFullscreenEnterIcon();
    fullscreenBtn.title = 'Fullscreen view';
    fullscreenBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; color: var(--text); cursor: pointer; padding: 4px 8px; font-size: 14px; transition: all 0.2s; opacity: 0.7; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; flex-shrink: 0;';
    fullscreenBtn.addEventListener('mouseenter', () => {
      fullscreenBtn.style.opacity = '1';
      fullscreenBtn.style.background = 'var(--bg)';
    });
    fullscreenBtn.addEventListener('mouseleave', () => {
      fullscreenBtn.style.opacity = '0.7';
      fullscreenBtn.style.background = 'transparent';
    });
    fullscreenBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      // 現在表示されているコンテンツのURLを取得
      const currentUrl = actualDocUrl || currentSelectedDocUrl;
      
      if (!currentUrl) {
        console.error('[EDS Inspector Panel] No URL available for fullscreen view');
        return;
      }
      
      // loadAndRenderDocと全く同じロジックでコンテンツを取得
      // これにより、表示されているコンテンツと全画面表示のコンテンツが確実に一致する
      let fullscreenContent;
      try {
        if (currentMode === 'markdown') {
          const markdownUrl = getMarkdownUrl(currentUrl);
          
          if (!markdownUrl) {
            console.error('[EDS Inspector Panel] Could not construct markdown URL for fullscreen');
            return;
          }
          
          // キャッシュをチェック（同じURLで5分以内ならキャッシュを使用）
          const now = Date.now();
          const cacheAge = markdownCache.timestamp ? (now - markdownCache.timestamp) : Infinity;
          const useCache = markdownCache.url === markdownUrl && cacheAge < 5 * 60 * 1000;
          
          if (useCache && markdownCache.content) {
            fullscreenContent = markdownCache.content;
            console.log('[EDS Inspector Panel] Using cached markdown for fullscreen');
          } else {
            // Markdownを取得
            const response = await fetch(markdownUrl);
            if (!response.ok) {
              console.error('[EDS Inspector Panel] Failed to load markdown for fullscreen:', response.status, response.statusText);
              return;
            }
            
            fullscreenContent = await response.text();
            // キャッシュに保存
            markdownCache = {
              url: markdownUrl,
              content: fullscreenContent,
              timestamp: now
            };
          }
        } else {
          // Markupモード: loadAndRenderDocと全く同じロジック
          // まず、キャッシュされたHTMLを取得を試みる
          const html = await sendToContent(tabId, 'get-fetched-html-content', { url: currentUrl });
          
          if (html) {
            fullscreenContent = html;
          } else {
            // キャッシュにない場合は、URLをそのまま使ってfetch（拡張子に応じた内容を取得）
            const response = await fetch(currentUrl);
            if (!response.ok) {
              console.error('[EDS Inspector Panel] Failed to load markup for fullscreen:', response.status, response.statusText);
              return;
            }
            fullscreenContent = await response.text();
          }
        }
      } catch (err) {
        console.error('[EDS Inspector Panel] Failed to fetch content for fullscreen:', err);
        return;
      }
      
      if (!fullscreenContent) {
        console.error('[EDS Inspector Panel] Could not fetch content for fullscreen');
        return;
      }
      
      // デバッグ用：取得したコンテンツを確認
      if (process.env.NODE_ENV === 'development') {
        console.log('[EDS Inspector Panel] Fullscreen - currentUrl:', currentUrl);
        console.log('[EDS Inspector Panel] Fullscreen - fullscreenContent length:', fullscreenContent ? fullscreenContent.length : 0);
        console.log('[EDS Inspector Panel] Fullscreen - fullscreenContent preview (first 500 chars):', fullscreenContent ? fullscreenContent.substring(0, 500) : 'null');
        console.log('[EDS Inspector Panel] Fullscreen - content parameter length:', content ? content.length : 0);
        console.log('[EDS Inspector Panel] Fullscreen - content parameter preview (first 500 chars):', content ? content.substring(0, 500) : 'null');
      }
      
      const fileType = currentMode === 'markdown' ? 'markdown' : 'html';
      const processedCode = processCode(fullscreenContent, fileType, currentMode === 'markdown' ? 'Markdown' : 'Markup');
      
      // タイトルにURL情報を追加
      let title = currentMode === 'markdown' ? 'Markdown' : 'Markup';
      if (currentUrl) {
        try {
          const urlObj = new URL(currentUrl);
          let pathname = urlObj.pathname;
          if (pathname === '/' || pathname === '') {
            pathname = '/';
          }
          title = `${pathname} - ${title}`;
        } catch (e) {
          // URL解析に失敗した場合はそのまま使用
          title = `${currentUrl} - ${title}`;
        }
      }
      
      // URLベースの検索キーを使用（同じファイルは同じキーになるように）
      const fullscreenSearchKey = `docs-${currentMode}-fullscreen-${currentUrl}`;
      
      // Markdownの場合はプレーンテキストを使用（カラーを適用しない）
      const codeForFullscreen = currentMode === 'markdown' ? fullscreenContent : processedCode;
      createFullscreenViewer(fullscreenContent, codeForFullscreen, title, fullscreenSearchKey);
    });
    searchBar.appendChild(fullscreenBtn);
  }
  
  // コードコンテナを作成
  const codeContainer = document.createElement('div');
  codeContainer.style.cssText = 'padding: 16px;';
  
  const sourcePre = document.createElement('pre');
  sourcePre.className = 'eds-code';
  sourcePre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;';
  
  const sourceCode = document.createElement('code');
  // シンタックスハイライトを適用（Markdownはカラーなし）
  if (mode === 'markdown') {
    sourceCode.textContent = content;
  } else {
    sourceCode.innerHTML = highlightCode(content, 'html');
  }
  sourceCode.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
  
  sourcePre.appendChild(sourceCode);
  codeContainer.appendChild(sourcePre);
  contentArea.appendChild(searchUI);
  contentArea.appendChild(codeContainer);
  container.appendChild(contentArea);
}

/**
 * モード切り替えスイッチを作成（モダンなトグルUI）
 */
function createModeToggle(root, tabId) {
  const toggleContainer = document.createElement('div');
  toggleContainer.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-muted); border-bottom: 1px solid var(--border);';
  
  // ラベル
  const label = document.createElement('span');
  label.textContent = 'View:';
  label.style.cssText = 'font-size: 12px; color: var(--text-muted); font-weight: 500;';
  
  // スイッチコンテナ
  const switchContainer = document.createElement('div');
  switchContainer.style.cssText = 'position: relative; display: inline-flex; align-items: center; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 2px; cursor: pointer; transition: all 0.2s ease;';
  
  // ボタンコンテナ
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = 'position: relative; display: flex; z-index: 1;';
  
  const markupBtn = document.createElement('button');
  markupBtn.textContent = 'Markup';
  markupBtn.className = 'eds-mode-toggle-btn';
  markupBtn.style.cssText = 'padding: 6px 16px; border: none; background: transparent; color: var(--text); cursor: pointer; font-size: 12px; font-weight: 500; transition: color 0.2s ease; border-radius: 6px; position: relative; z-index: 2; white-space: nowrap;';
  
  const markdownBtn = document.createElement('button');
  markdownBtn.textContent = 'Markdown';
  markdownBtn.className = 'eds-mode-toggle-btn';
  markdownBtn.style.cssText = 'padding: 6px 16px; border: none; background: transparent; color: var(--text); cursor: pointer; font-size: 12px; font-weight: 500; transition: color 0.2s ease; border-radius: 6px; position: relative; z-index: 2; white-space: nowrap;';
  
  // スライダー（背景のハイライト）
  const slider = document.createElement('div');
  slider.style.cssText = 'position: absolute; top: 2px; left: 2px; height: calc(100% - 4px); background: #6366f1; border-radius: 6px; transition: all 0.2s ease; z-index: 0;';
  
  const updateSwitch = () => {
    // ボタンの幅を取得してスライダーの幅と位置を計算
    const markupWidth = markupBtn.offsetWidth;
    const markdownWidth = markdownBtn.offsetWidth;
    
    if (currentMode === 'markup') {
      slider.style.width = `${markupWidth}px`;
      slider.style.transform = 'translateX(0)';
      markupBtn.style.color = 'white';
      markdownBtn.style.color = 'var(--text)';
    } else {
      slider.style.width = `${markdownWidth}px`;
      slider.style.transform = `translateX(${markupWidth}px)`;
      markupBtn.style.color = 'var(--text)';
      markdownBtn.style.color = 'white';
    }
  };
  
  // 初回レンダリング後にスイッチを更新（ボタンの幅が確定してから）
  setTimeout(() => {
    updateSwitch();
  }, 0);
  
  markupBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (currentMode === 'markup') return;
    currentMode = 'markup';
    updateSwitch();
    await renderDocs(tabId);
  });
  
  markdownBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (currentMode === 'markdown') return;
    currentMode = 'markdown';
    updateSwitch();
    await renderDocs(tabId);
  });
  
  // コンテナ全体のクリックでも切り替え可能にする
  switchContainer.addEventListener('click', async (e) => {
    // ボタン自体のクリックは無視（既に処理済み）
    if (e.target === markdownBtn || e.target === markupBtn) return;
    currentMode = currentMode === 'markdown' ? 'markup' : 'markdown';
    updateSwitch();
    await renderDocs(tabId);
  });
  
  buttonsContainer.appendChild(markupBtn);
  buttonsContainer.appendChild(markdownBtn);
  switchContainer.appendChild(slider);
  switchContainer.appendChild(buttonsContainer);
  
  // 初回レンダリング後にスイッチを更新（ボタンの幅が確定してから）
  setTimeout(() => {
    updateSwitch();
  }, 0);
  
  // ウィンドウリサイズ時にも更新
  let resizeTimeout;
  const resizeHandler = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      updateSwitch();
    }, 100);
  };
  window.addEventListener('resize', resizeHandler);
  
  toggleContainer.appendChild(label);
  toggleContainer.appendChild(switchContainer);
  
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
      // Mainの場合は小さなタグ風アイコンを追加
      if (doc.isMain) {
        const icon = document.createElement('span');
        icon.textContent = 'Main';
        icon.style.cssText = 'display: inline-block; margin-right: 6px; padding: 2px 4px; font-size: 9px; font-weight: 600; color: var(--text); background: var(--bg-muted); border: 1px solid var(--border); border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;';
        tab.appendChild(icon);
      }
      const displayName = pathname;
      const textNode = document.createTextNode(displayName);
      tab.appendChild(textNode);
    } catch (e) {
      if (doc.isMain) {
        const icon = document.createElement('span');
        icon.textContent = 'Main';
        icon.style.cssText = 'display: inline-block; margin-right: 6px; padding: 2px 4px; font-size: 9px; font-weight: 600; color: var(--text); background: var(--bg-muted); border: 1px solid var(--border); border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;';
        tab.appendChild(icon);
      }
      const textNode = document.createTextNode(doc.url);
      tab.appendChild(textNode);
    }
    
    // 選択状態のスタイル
    if (doc.url === currentSelectedDocUrl) {
      tab.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: #6366f1; color: white; cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;';
      // 選択状態のMainアイコンのスタイルを更新
      if (doc.isMain) {
        const selectedIcon = tab.querySelector('span');
        if (selectedIcon) {
          selectedIcon.style.cssText = 'display: inline-block; margin-right: 6px; padding: 2px 4px; font-size: 9px; font-weight: 600; color: white; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;';
        }
      }
    }
    
    tab.addEventListener('click', async () => {
      currentSelectedDocUrl = doc.url;
      
      // すべてのタブのスタイルをリセット
      docTabsContainer.querySelectorAll('button').forEach(btn => {
        btn.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;';
        // Mainアイコンのスタイルもリセット
        const icon = btn.querySelector('span');
        if (icon && icon.textContent === 'Main') {
          icon.style.cssText = 'display: inline-block; margin-right: 6px; padding: 2px 4px; font-size: 9px; font-weight: 600; color: var(--text); background: var(--bg-muted); border: 1px solid var(--border); border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;';
        }
      });
      
      // 選択されたタブのスタイルを更新
      tab.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); border-radius: 4px; background: #6366f1; color: white; cursor: pointer; font-size: 12px; white-space: nowrap; transition: all 0.2s;';
      // 選択状態のMainアイコンのスタイルを更新
      if (doc.isMain) {
        const selectedIcon = tab.querySelector('span');
        if (selectedIcon) {
          selectedIcon.style.cssText = 'display: inline-block; margin-right: 6px; padding: 2px 4px; font-size: 9px; font-weight: 600; color: white; background: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 2px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;';
        }
      }
      
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
    renderDocsContent(contentArea, content, currentMode, tabId, url);
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

