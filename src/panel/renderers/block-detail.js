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
  
  // Source表示の内容を追加
  const meta = document.createElement('div');
  meta.className = 'eds-meta';
  meta.innerHTML = `
    <div><strong>Name:</strong> ${detail.block.name}</div>
    <div><strong>Tag:</strong> ${detail.block.tagName}</div>
    <div><strong>Classes:</strong> ${detail.block.classes || '(none)'}</div>
    <div><strong>Detected via:</strong> <span class="eds-inline-code">/blocks/${detail.block.name}</span></div>
  `;

  root.appendChild(meta);

  // 同じ名前のブロックを取得（content scriptからすべて取得）
  const blocksWithSameName = await sendToContent(tabId, 'get-blocks-by-name', { name: detail.block.name });
  const currentBlockIndex = blocksWithSameName.findIndex(b => b.id === detail.block.id);
  const hasMultipleBlocks = blocksWithSameName.length > 1;

  // Markupをassetsリストの先頭に追加
  const allAssets = [];
  const markupContent = detail.markup || 'No markup captured for this block.';
  if (markupContent !== 'No markup captured for this block.') {
    allAssets.push({
      path: 'Markup (CSR)',
      type: 'html',
      content: markupContent,
      isMarkup: true
    });
  }
  
  if (detail.assets && detail.assets.length) {
    allAssets.push(...detail.assets);
  }

  if (allAssets.length > 0) {
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
      const li = createAssetItem(asset, expandedPaths, blocksWithSameName, currentBlockIndex, hasMultipleBlocks, state, refresh, tabId);
      list.appendChild(li);
    });
    root.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'eds-empty';
    empty.textContent = 'No block assets found in network responses.';
    root.appendChild(empty);
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
  
  // Markupの場合のみ、前/次のブロック切り替えボタンを追加
  if (asset.isMarkup) {
    const navWrapper = createMarkupNavigation(blocksWithSameName, currentBlockIndex, hasMultipleBlocks, state, refresh, tabId);
    leftSection.appendChild(toggle);
    leftSection.appendChild(title);
    leftSection.appendChild(navWrapper);
  } else {
    leftSection.appendChild(toggle);
    leftSection.appendChild(title);
  }
  
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


