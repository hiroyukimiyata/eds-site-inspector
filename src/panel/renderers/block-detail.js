/**
 * ブロック詳細のレンダラー
 */
import { sendToContent } from '../utils.js';
import { processCode } from '../utils/code-processor.js';
import { createCopyButton as createCopyButtonUtil, createSearchUI } from '../utils/file-utils.js';

/**
 * ブロック詳細をレンダリング（開閉状態を保持）
 */
async function renderBlockDetailWithExpandedPaths(state, detail, refresh, tabId, preservedExpandedPaths) {
  const root = document.querySelector('[data-tab-panel="blocks"]');
  if (!detail || !detail.block) {
    return;
  }
  
  // スクロール位置を保存
  const scrollContainer = root.closest('main') || root.parentElement;
  const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
  
  // 保存された開閉状態を使用（なければ空のSet）
  const expandedPaths = preservedExpandedPaths || new Set();
  
  // 一覧に戻るボタンを作成
  const backButton = document.createElement('button');
  backButton.className = 'eds-back-button';
  backButton.textContent = '← Back to Blocks List';
  backButton.addEventListener('click', async () => {
    await sendToContent(tabId, 'select-block', { id: null });
    if (refresh) {
      refresh();
    }
  });
  
  // 既存の内容をクリア
  root.innerHTML = '';
  root.appendChild(backButton);
  
  // ブロック名を大きく表示
  const blockNameHeader = document.createElement('div');
  blockNameHeader.className = 'eds-block-name-header';
  blockNameHeader.textContent = detail.block.name;
  blockNameHeader.style.cssText = 'font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--border);';

  root.appendChild(blockNameHeader);

  // 同じ名前のブロックを取得（content scriptからすべて取得）
  const blocksWithSameName = await sendToContent(tabId, 'get-blocks-by-name', { name: detail.block.name });
  const currentBlockIndex = blocksWithSameName.findIndex(b => b.id === detail.block.id);
  const hasMultipleBlocks = blocksWithSameName.length > 1;


  // Markupセクション（SSRとCSRをセットで表示）
  const markupSection = document.createElement('div');
  markupSection.className = 'eds-markup-section';
  markupSection.style.cssText = 'margin-bottom: 24px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;';
  
  const markupHeader = document.createElement('div');
  markupHeader.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-muted); cursor: pointer;';
  
  const markupTitleWrapper = document.createElement('div');
  markupTitleWrapper.style.cssText = 'display: flex; align-items: center; gap: 12px;';
  
  const markupTitle = document.createElement('div');
  markupTitle.textContent = 'Markup';
  markupTitle.style.cssText = 'font-weight: 600; color: var(--text); font-size: 14px;';
  
  // インスタンス切り替えUI（複数インスタンスがある場合、検索UIスタイルで表示）
  if (hasMultipleBlocks) {
    const instanceNav = document.createElement('div');
    instanceNav.style.cssText = 'display: flex; align-items: center; gap: 4px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 2px;';
    
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '◀';
    prevBtn.disabled = currentBlockIndex === 0;
    prevBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s; display: flex; align-items: center; justify-content: center;';
    prevBtn.disabled && (prevBtn.style.opacity = '0.5');
    prevBtn.disabled && (prevBtn.style.cursor = 'not-allowed');
    prevBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (currentBlockIndex > 0 && !prevBtn.disabled) {
        const currentExpandedPaths = new Set();
        const markupContent = root.querySelector('.eds-markup-content');
        if (markupContent && markupContent.style.display !== 'none') {
          currentExpandedPaths.add('markup-section');
        }
        
        const prevBlock = blocksWithSameName[currentBlockIndex - 1];
        await sendToContent(tabId, 'select-block', { id: prevBlock.id });
        await sendToContent(tabId, 'scroll-to-block', { id: prevBlock.id });
        await sendToContent(tabId, 'highlight', { id: prevBlock.id });
        const prevDetail = await sendToContent(tabId, 'get-block-detail', { id: prevBlock.id });
        await renderBlockDetailWithExpandedPaths(state, prevDetail, refresh, tabId, currentExpandedPaths);
      }
    });
    
    const navInfo = document.createElement('span');
    navInfo.textContent = `${currentBlockIndex + 1} / ${blocksWithSameName.length}`;
    navInfo.style.cssText = 'font-size: 12px; color: var(--text); padding: 0 8px; min-width: 50px; text-align: center; font-weight: 500;';
    
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '▶';
    nextBtn.disabled = currentBlockIndex === blocksWithSameName.length - 1;
    nextBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s; display: flex; align-items: center; justify-content: center;';
    nextBtn.disabled && (nextBtn.style.opacity = '0.5');
    nextBtn.disabled && (nextBtn.style.cursor = 'not-allowed');
    nextBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (currentBlockIndex < blocksWithSameName.length - 1 && !nextBtn.disabled) {
        const currentExpandedPaths = new Set();
        const markupContent = root.querySelector('.eds-markup-content');
        if (markupContent && markupContent.style.display !== 'none') {
          currentExpandedPaths.add('markup-section');
        }
        
        const nextBlock = blocksWithSameName[currentBlockIndex + 1];
        await sendToContent(tabId, 'select-block', { id: nextBlock.id });
        await sendToContent(tabId, 'scroll-to-block', { id: nextBlock.id });
        await sendToContent(tabId, 'highlight', { id: nextBlock.id });
        const nextDetail = await sendToContent(tabId, 'get-block-detail', { id: nextBlock.id });
        await renderBlockDetailWithExpandedPaths(state, nextDetail, refresh, tabId, currentExpandedPaths);
      }
    });
    
    instanceNav.appendChild(prevBtn);
    instanceNav.appendChild(navInfo);
    instanceNav.appendChild(nextBtn);
    markupTitleWrapper.appendChild(markupTitle);
    markupTitleWrapper.appendChild(instanceNav);
  } else {
    markupTitleWrapper.appendChild(markupTitle);
  }
  
  const markupToggle = document.createElement('span');
  markupToggle.className = 'eds-markup-toggle';
  markupToggle.textContent = '▼';
  markupToggle.style.cssText = 'font-size: 10px; color: var(--muted); transition: transform 0.2s;';
  
  markupHeader.appendChild(markupTitleWrapper);
  markupHeader.appendChild(markupToggle);
  
  const markupContent = document.createElement('div');
  markupContent.className = 'eds-markup-content';
  markupContent.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; background: var(--bg);';
  
  // SSRマークアップ
  const ssrMarkupContent = detail.ssrMarkup || null;
  const ssrContainer = document.createElement('div');
  ssrContainer.style.cssText = 'border: 1px solid var(--border); border-radius: 8px; overflow: hidden;';
  
  const ssrHeader = document.createElement('div');
  ssrHeader.style.cssText = 'padding: 8px 12px; background: var(--bg-muted); border-bottom: 1px solid var(--border);';
  
  const ssrTitle = document.createElement('div');
  ssrTitle.textContent = 'Markup (SSR)';
  ssrTitle.style.cssText = 'font-weight: 600; color: var(--text); font-size: 12px; margin-bottom: 4px;';
  
  const ssrDocInfo = document.createElement('div');
  if (detail.block.sourceDocumentUrl) {
    try {
      const urlObj = new URL(detail.block.sourceDocumentUrl);
      const isMain = detail.block.sourceDocumentUrl === window.location.href.split('?')[0];
      ssrDocInfo.textContent = `Source: ${urlObj.pathname}${isMain ? ' (Main)' : ''}`;
    } catch (e) {
      ssrDocInfo.textContent = `Source: ${detail.block.sourceDocumentUrl}`;
    }
  } else {
    ssrDocInfo.textContent = 'Source: Unknown';
  }
  ssrDocInfo.style.cssText = 'font-size: 10px; color: var(--text-muted);';
  
  ssrHeader.appendChild(ssrTitle);
  ssrHeader.appendChild(ssrDocInfo);
  
  const ssrCodeContainer = document.createElement('div');
  ssrCodeContainer.style.cssText = 'position: relative;';
  
  if (ssrMarkupContent) {
    // 検索UIを追加
    const searchKey = `markup-ssr-${detail.block.id}`;
    const searchUI = createSearchUI(ssrCodeContainer, ssrMarkupContent, searchKey);
    
    const codeWrapper = document.createElement('div');
    codeWrapper.style.cssText = 'padding: 12px; max-height: 400px; overflow-y: auto;';
    
    const processedCode = processCode(ssrMarkupContent, 'html', 'Markup (SSR)');
    const pre = document.createElement('pre');
    pre.className = 'eds-code';
    pre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 4px; padding: 12px; overflow-x: auto; margin: 0;';
    const code = document.createElement('code');
    code.innerHTML = processedCode;
    code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 11px; line-height: 1.5; display: block;';
    pre.appendChild(code);
    codeWrapper.appendChild(pre);
    
    ssrCodeContainer.appendChild(searchUI);
    ssrCodeContainer.appendChild(codeWrapper);
  } else {
    ssrCodeContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; margin: 0; padding: 12px;">No SSR markup available</p>';
  }
  
  ssrContainer.appendChild(ssrHeader);
  ssrContainer.appendChild(ssrCodeContainer);
  
  // CSRマークアップ
  const csrMarkupContent = detail.markup || 'No markup captured for this block.';
  const csrContainer = document.createElement('div');
  csrContainer.style.cssText = 'border: 1px solid var(--border); border-radius: 8px; overflow: hidden;';
  
  const csrHeader = document.createElement('div');
  csrHeader.style.cssText = 'padding: 8px 12px; background: var(--bg-muted); border-bottom: 1px solid var(--border);';
  
  const csrTitle = document.createElement('div');
  csrTitle.textContent = 'Markup (CSR)';
  csrTitle.style.cssText = 'font-weight: 600; color: var(--text); font-size: 12px; margin-bottom: 4px;';
  
  // SSR側と同じ高さにするためのスペーサー
  const csrSpacer = document.createElement('div');
  csrSpacer.style.cssText = 'font-size: 10px; height: 14px;'; // ssrDocInfoと同じ高さ
  
  csrHeader.appendChild(csrTitle);
  csrHeader.appendChild(csrSpacer);
  
  const csrCodeContainer = document.createElement('div');
  csrCodeContainer.style.cssText = 'position: relative;';
  
  if (csrMarkupContent !== 'No markup captured for this block.') {
    // 検索UIを追加
    const searchKey = `markup-csr-${detail.block.id}`;
    const searchUI = createSearchUI(csrCodeContainer, csrMarkupContent, searchKey);
    
    const codeWrapper = document.createElement('div');
    codeWrapper.style.cssText = 'padding: 12px; max-height: 400px; overflow-y: auto;';
    
    const processedCode = processCode(csrMarkupContent, 'html', 'Markup (CSR)');
    const pre = document.createElement('pre');
    pre.className = 'eds-code';
    pre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 4px; padding: 12px; overflow-x: auto; margin: 0;';
    const code = document.createElement('code');
    code.innerHTML = processedCode;
    code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 11px; line-height: 1.5; display: block;';
    pre.appendChild(code);
    codeWrapper.appendChild(pre);
    
    csrCodeContainer.appendChild(searchUI);
    csrCodeContainer.appendChild(codeWrapper);
  } else {
    csrCodeContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; margin: 0; padding: 12px;">No CSR markup available</p>';
  }
  
  csrContainer.appendChild(csrHeader);
  csrContainer.appendChild(csrCodeContainer);
  
  markupContent.appendChild(ssrContainer);
  markupContent.appendChild(csrContainer);
  
  // 開閉状態を管理（デフォルトで開いた状態）
  const wasMarkupExpanded = expandedPaths.has('markup-section');
  // デフォルトで開いた状態にする（expandedPathsにない場合は開く）
  if (!expandedPaths.has('markup-section')) {
    expandedPaths.add('markup-section');
  }
  markupContent.style.display = 'grid';
  markupToggle.textContent = '▼';
  
  markupHeader.addEventListener('click', () => {
    const isExpanded = markupContent.style.display !== 'none';
    if (isExpanded) {
      markupContent.style.display = 'none';
      markupToggle.textContent = '▶';
      expandedPaths.delete('markup-section');
    } else {
      markupContent.style.display = 'grid';
      markupToggle.textContent = '▼';
      expandedPaths.add('markup-section');
    }
  });
  
  markupSection.appendChild(markupHeader);
  markupSection.appendChild(markupContent);
  root.appendChild(markupSection);

  // その他のアセット（JS、CSSなど）
  const allAssets = [];
  if (detail.assets && detail.assets.length) {
    allAssets.push(...detail.assets);
  }

  if (allAssets.length > 0) {
    // Codeセクションのタイトル
    const codeTitle = document.createElement('h3');
    codeTitle.textContent = 'Code';
    codeTitle.style.cssText = 'font-size: 14px; font-weight: 600; color: var(--text); margin: 24px 0 12px 0;';
    root.appendChild(codeTitle);
    
    // 全て開く/閉じるボタン
    const controls = document.createElement('div');
    controls.className = 'eds-asset-controls';
    controls.style.cssText = 'display: flex; gap: 4px; margin-bottom: 8px;';
    
    const expandAllBtn = document.createElement('button');
    expandAllBtn.className = 'eds-button';
    expandAllBtn.textContent = 'Expand All';
    expandAllBtn.style.cssText = 'padding: 4px 8px; font-size: 11px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-muted); color: var(--text); cursor: pointer;';
    expandAllBtn.addEventListener('click', () => {
      root.querySelectorAll('.eds-asset-item').forEach(item => {
        const content = item.querySelector('.eds-asset-content');
        const toggle = item.querySelector('.eds-asset-toggle');
        if (content && toggle) {
          content.style.display = 'block';
          toggle.textContent = '▼';
        }
      });
    });
    
    const collapseAllBtn = document.createElement('button');
    collapseAllBtn.className = 'eds-button';
    collapseAllBtn.textContent = 'Collapse All';
    collapseAllBtn.style.cssText = 'padding: 4px 8px; font-size: 11px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-muted); color: var(--text); cursor: pointer;';
    collapseAllBtn.addEventListener('click', () => {
      root.querySelectorAll('.eds-asset-item').forEach(item => {
        const content = item.querySelector('.eds-asset-content');
        const toggle = item.querySelector('.eds-asset-toggle');
        if (content && toggle) {
          content.style.display = 'none';
          toggle.textContent = '▶';
        }
      });
    });
    
    controls.appendChild(expandAllBtn);
    controls.appendChild(collapseAllBtn);
    root.appendChild(controls);
    
    const list = document.createElement('ul');
    list.className = 'eds-file-list';
    allAssets.forEach((asset) => {
      const li = createAssetItem(asset, expandedPaths, null, null, false, state, refresh, tabId);
      list.appendChild(li);
    });
    root.appendChild(list);
  }
  
  // スクロール位置を復元（DOM更新を待つ）
  if (scrollContainer && savedScrollTop > 0) {
    // requestAnimationFrameを2回呼んで、DOMの更新を確実に待つ
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = savedScrollTop;
      });
    });
  }
}

/**
 * ブロック詳細をレンダリング
 */
export async function renderBlockDetail(state, detail, refresh, tabId) {
  await renderBlockDetailWithExpandedPaths(state, detail, refresh, tabId, null);
}

/**
 * アセットアイテムを作成
 */
function createAssetItem(asset, expandedPaths, blocksWithSameName, currentBlockIndex, hasMultipleBlocks, state, refresh, tabId) {
  const li = document.createElement('li');
  li.className = 'eds-asset-item';
  li.style.cssText = 'margin-bottom: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;';
  
  const header = document.createElement('div');
  header.className = 'eds-asset-header';
  header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-muted); cursor: pointer; overflow: hidden;';
  
  const leftSection = document.createElement('div');
  leftSection.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden;';
  
  const toggle = document.createElement('span');
  toggle.className = 'eds-asset-toggle';
  toggle.textContent = '▶';
  toggle.style.cssText = 'font-size: 10px; color: var(--muted); transition: transform 0.2s; flex-shrink: 0;';
  
  const title = document.createElement('div');
  title.className = 'eds-file-title';
  title.textContent = asset.path;
  title.style.cssText = 'font-weight: 600; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
  
    leftSection.appendChild(toggle);
    leftSection.appendChild(title);
  
  const rightSection = document.createElement('div');
  rightSection.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 12px;';
  
  const pill = document.createElement('span');
  pill.className = 'eds-pill';
  pill.textContent = asset.type;
  pill.style.cssText = 'flex-shrink: 0;';
  
  // コピーボタンを追加（既に存在しない場合のみ）
  const rawContent = asset.content || '(empty file)';
  let copyBtn = null;
  if (!rightSection.querySelector('.eds-copy-button')) {
    copyBtn = createCopyButtonUtil(rawContent, null, null);
    copyBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s; flex-shrink: 0;';
    rightSection.appendChild(pill);
    rightSection.appendChild(copyBtn);
  } else {
    copyBtn = rightSection.querySelector('.eds-copy-button');
    rightSection.appendChild(pill);
  }
  
  const content = document.createElement('div');
  content.className = 'eds-asset-content';
  
  // ファイルタイプに応じてシンタックスハイライトとインデント処理
  const processedCode = processCode(rawContent, asset.type, asset.path);
  
  const pre = document.createElement('pre');
  pre.className = 'eds-code';
  pre.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;';
  
  const code = document.createElement('code');
  code.innerHTML = processedCode;
  code.style.cssText = 'font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace; font-size: 12px; line-height: 1.6; display: block;';
  
  pre.appendChild(code);
  
  // 保存された開閉状態を復元
  const wasExpanded = expandedPaths.has(asset.path);
  if (wasExpanded) {
    content.style.cssText = 'display: block; padding: 0; background: var(--bg); max-height: 400px; overflow-y: auto; position: relative;';
    toggle.textContent = '▼';
  } else {
    content.style.cssText = 'display: none; padding: 0; background: var(--bg); max-height: 400px; overflow-y: auto; position: relative;';
    toggle.textContent = '▶';
  }
  
  // 検索キーを生成（asset.pathをキーにする）
  const searchKey = `block-${asset.path}`;
  // 検索UIを追加（content要素がスクロール可能なコンテナとして機能する）
  const searchUI = createSearchUI(content, rawContent, searchKey);
  
  const codeContainer = document.createElement('div');
  codeContainer.style.cssText = 'padding: 16px;';
  codeContainer.appendChild(pre);
  
  content.appendChild(searchUI);
  content.appendChild(codeContainer);
  
  // ヘッダーのクリックで開閉
  const handleToggle = () => {
    const isExpanded = content.style.display !== 'none';
    const newExpanded = !isExpanded;
    content.style.display = newExpanded ? 'block' : 'none';
    toggle.textContent = newExpanded ? '▼' : '▶';
  };
  
  header.addEventListener('click', (e) => {
    // コピーボタンやナビゲーションボタン、検索UIのクリックは無視
    if (e.target === copyBtn || 
        e.target.closest('.eds-nav-button') || 
        e.target.closest('.eds-copy-button') ||
        e.target.closest('.eds-search-container') ||
        e.target.closest('.eds-search-input') ||
        e.target.closest('.eds-search-nav') ||
        e.target.closest('button')) {
      return;
    }
    handleToggle();
  });
  
  header.appendChild(leftSection);
  header.appendChild(rightSection);
  
  li.appendChild(header);
  li.appendChild(content);
  
  return li;
}

/**
 * Markupナビゲーションを作成
 */
function createMarkupNavigation(blocksWithSameName, currentBlockIndex, hasMultipleBlocks, state, refresh, tabId) {
  const navWrapper = document.createElement('div');
  navWrapper.className = 'eds-markup-nav';
  navWrapper.style.cssText = 'display: flex; align-items: center; gap: 4px;';
  
  const root = document.querySelector('[data-tab-panel="blocks"]');
  
  const prevBtn = document.createElement('button');
  prevBtn.className = 'eds-nav-button';
  prevBtn.innerHTML = '◀';
  prevBtn.title = 'Previous block';
  prevBtn.disabled = !hasMultipleBlocks || currentBlockIndex === 0;
  prevBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s;';
  prevBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (currentBlockIndex > 0) {
      // 現在の開閉状態を保存
      const currentExpandedPaths = new Set();
      const currentItems = root.querySelectorAll('.eds-asset-item');
      currentItems.forEach(item => {
        const content = item.querySelector('.eds-asset-content');
        if (content && content.style.display !== 'none') {
          const path = item.querySelector('.eds-file-title')?.textContent;
          if (path) {
            currentExpandedPaths.add(path);
          }
        }
      });
      
      const prevBlock = blocksWithSameName[currentBlockIndex - 1];
      await sendToContent(tabId, 'select-block', { id: prevBlock.id });
      await sendToContent(tabId, 'scroll-to-block', { id: prevBlock.id });
      await sendToContent(tabId, 'highlight', { id: prevBlock.id });
      const prevDetail = await sendToContent(tabId, 'get-block-detail', { id: prevBlock.id });
      
      // 開閉状態を保持してレンダリング
      await renderBlockDetailWithExpandedPaths(state, prevDetail, refresh, tabId, currentExpandedPaths);
    }
  });
  
  const navInfo = document.createElement('span');
  navInfo.className = 'eds-nav-info';
  navInfo.textContent = `${currentBlockIndex + 1} / ${blocksWithSameName.length}`;
  navInfo.style.cssText = 'font-size: 11px; color: var(--muted); padding: 0 4px;';
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'eds-nav-button';
  nextBtn.innerHTML = '▶';
  nextBtn.title = 'Next block';
  nextBtn.disabled = !hasMultipleBlocks || currentBlockIndex === blocksWithSameName.length - 1;
  nextBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s;';
  nextBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (currentBlockIndex < blocksWithSameName.length - 1) {
      // 現在の開閉状態を保存
      const currentExpandedPaths = new Set();
      const currentItems = root.querySelectorAll('.eds-asset-item');
      currentItems.forEach(item => {
        const content = item.querySelector('.eds-asset-content');
        if (content && content.style.display !== 'none') {
          const path = item.querySelector('.eds-file-title')?.textContent;
          if (path) {
            currentExpandedPaths.add(path);
          }
        }
      });
      
      const nextBlock = blocksWithSameName[currentBlockIndex + 1];
      await sendToContent(tabId, 'select-block', { id: nextBlock.id });
      await sendToContent(tabId, 'scroll-to-block', { id: nextBlock.id });
      await sendToContent(tabId, 'highlight', { id: nextBlock.id });
      const nextDetail = await sendToContent(tabId, 'get-block-detail', { id: nextBlock.id });
      
      // 開閉状態を保持してレンダリング
      await renderBlockDetailWithExpandedPaths(state, nextDetail, refresh, tabId, currentExpandedPaths);
    }
  });
  
  navWrapper.appendChild(prevBtn);
  navWrapper.appendChild(navInfo);
  navWrapper.appendChild(nextBtn);
  
  return navWrapper;
}


