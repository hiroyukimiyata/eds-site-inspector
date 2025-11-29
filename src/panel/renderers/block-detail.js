/**
 * ブロック詳細のレンダラー
 */
import { sendToContent } from '../utils.js';
import { processCode } from '../utils/code-processor.js';

/**
 * ブロック詳細をレンダリング
 */
export async function renderBlockDetail(state, detail, refresh, tabId) {
  const root = document.querySelector('[data-tab-panel="blocks"]');
  if (!detail || !detail.block) {
    return;
  }
  
  // 現在の開閉状態を保存
  const expandedPaths = new Set();
  const existingItems = root.querySelectorAll('.eds-asset-item.is-expanded');
  existingItems.forEach(item => {
    const path = item.querySelector('.eds-file-card__path')?.textContent;
    if (path) {
      expandedPaths.add(path);
    }
  });
  
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
      path: 'Markup',
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
    controls.style.cssText = 'display: flex; gap: 8px; margin-bottom: 16px;';
    
    const expandAllBtn = document.createElement('button');
    expandAllBtn.className = 'eds-button';
    expandAllBtn.textContent = 'Expand All';
    expandAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.eds-asset-item').forEach(item => {
        item.classList.add('is-expanded');
      });
    });
    
    const collapseAllBtn = document.createElement('button');
    collapseAllBtn.className = 'eds-button';
    collapseAllBtn.textContent = 'Collapse All';
    collapseAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.eds-asset-item').forEach(item => {
        item.classList.remove('is-expanded');
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
}

/**
 * アセットアイテムを作成
 */
function createAssetItem(asset, expandedPaths, blocksWithSameName, currentBlockIndex, hasMultipleBlocks, state, refresh, tabId) {
  const li = document.createElement('li');
  li.className = 'eds-asset-item';
  
  const header = document.createElement('div');
  header.className = 'eds-asset-header';
  header.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px;';
  
  const toggle = document.createElement('span');
  toggle.className = 'eds-asset-toggle';
  toggle.textContent = '▶';
  toggle.style.cssText = 'font-size: 10px; color: var(--muted); transition: transform 0.2s; cursor: pointer;';
  
  const titleWrapper = document.createElement('div');
  titleWrapper.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1;';
  
  const title = document.createElement('div');
  title.className = 'eds-file-card__path';
  title.textContent = asset.path;
  title.style.flex = '1';
  title.style.cursor = 'pointer';
  
  // Markupの場合のみ、前/次のブロック切り替えボタンを追加
  if (asset.isMarkup) {
    const navWrapper = createMarkupNavigation(blocksWithSameName, currentBlockIndex, hasMultipleBlocks, state, refresh, tabId);
    titleWrapper.appendChild(title);
    titleWrapper.appendChild(navWrapper);
  } else {
    titleWrapper.appendChild(title);
  }
  
  const pill = document.createElement('span');
  pill.className = 'eds-pill';
  pill.textContent = asset.type;
  
  // コピーボタンを追加
  const copyBtn = createCopyButton(asset);
  
  const content = document.createElement('div');
  content.className = 'eds-asset-content';
  content.style.cssText = 'display: none; margin-top: 8px;';
  
  const code = document.createElement('pre');
  code.className = 'eds-code';
  
  // ファイルタイプに応じてシンタックスハイライトとインデント処理
  const processedCode = processCode(asset.content || '(empty file)', asset.type, asset.path);
  code.innerHTML = processedCode;
  
  content.appendChild(code);
  
  // ヘッダーのクリックで開閉
  const handleToggle = () => {
    li.classList.toggle('is-expanded');
    const isExpanded = li.classList.contains('is-expanded');
    content.style.display = isExpanded ? 'block' : 'none';
    toggle.textContent = isExpanded ? '▼' : '▶';
  };
  
  toggle.addEventListener('click', handleToggle);
  title.addEventListener('click', handleToggle);
  
  // 保存された開閉状態を復元
  const wasExpanded = expandedPaths.has(asset.path);
  if (wasExpanded) {
    li.classList.add('is-expanded');
    content.style.display = 'block';
    toggle.textContent = '▼';
  }
  
  header.appendChild(toggle);
  header.appendChild(titleWrapper);
  header.appendChild(pill);
  header.appendChild(copyBtn);
  
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
  
  const prevBtn = document.createElement('button');
  prevBtn.className = 'eds-nav-button';
  prevBtn.innerHTML = '◀';
  prevBtn.title = 'Previous block';
  prevBtn.disabled = !hasMultipleBlocks || currentBlockIndex === 0;
  prevBtn.style.cssText = 'background: transparent; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; padding: 4px 8px; font-size: 12px; color: var(--text); transition: all 0.2s;';
  prevBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (currentBlockIndex > 0) {
      const prevBlock = blocksWithSameName[currentBlockIndex - 1];
      await sendToContent(tabId, 'select-block', { id: prevBlock.id });
      await sendToContent(tabId, 'scroll-to-block', { id: prevBlock.id });
      await sendToContent(tabId, 'highlight', { id: prevBlock.id });
      const prevDetail = await sendToContent(tabId, 'get-block-detail', { id: prevBlock.id });
      renderBlockDetail(state, prevDetail, refresh, tabId);
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
      const nextBlock = blocksWithSameName[currentBlockIndex + 1];
      await sendToContent(tabId, 'select-block', { id: nextBlock.id });
      await sendToContent(tabId, 'scroll-to-block', { id: nextBlock.id });
      await sendToContent(tabId, 'highlight', { id: nextBlock.id });
      const nextDetail = await sendToContent(tabId, 'get-block-detail', { id: nextBlock.id });
      renderBlockDetail(state, nextDetail, refresh, tabId);
    }
  });
  
  navWrapper.appendChild(prevBtn);
  navWrapper.appendChild(navInfo);
  navWrapper.appendChild(nextBtn);
  
  return navWrapper;
}

/**
 * コピーボタンを作成
 */
function createCopyButton(asset) {
  const copyBtn = document.createElement('button');
  copyBtn.className = 'eds-copy-button';
  copyBtn.innerHTML = '📋';
  copyBtn.title = 'Copy to clipboard';
  copyBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s;';
  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const rawContent = asset.content || '(empty file)';
    try {
      await navigator.clipboard.writeText(rawContent);
      copyBtn.innerHTML = '✓';
      copyBtn.style.color = '#86efac';
      setTimeout(() => {
        copyBtn.innerHTML = '📋';
        copyBtn.style.color = 'var(--muted)';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      copyBtn.innerHTML = '✗';
      copyBtn.style.color = '#f87171';
      setTimeout(() => {
        copyBtn.innerHTML = '📋';
        copyBtn.style.color = 'var(--muted)';
      }, 2000);
    }
  });
  return copyBtn;
}

