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
  
  // スクロール位置を保存
  const scrollContainer = root.closest('main') || root.parentElement;
  const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
  
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
  
  // コピーボタンを追加
  const copyBtn = createCopyButton(asset);
  
  rightSection.appendChild(pill);
  rightSection.appendChild(copyBtn);
  
  const content = document.createElement('div');
  content.className = 'eds-asset-content';
  
  // ファイルタイプに応じてシンタックスハイライトとインデント処理
  const processedCode = processCode(asset.content || '(empty file)', asset.type, asset.path);
  
  const code = document.createElement('pre');
  code.className = 'eds-code';
  code.style.cssText = 'background: var(--bg-muted); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 0;';
  code.innerHTML = processedCode;
  
  content.appendChild(code);
  
  // 保存された開閉状態を復元
  const wasExpanded = expandedPaths.has(asset.path);
  if (wasExpanded) {
    content.style.cssText = 'display: block; padding: 16px; background: var(--bg); max-height: 400px; overflow-y: auto;';
    toggle.textContent = '▼';
  } else {
    content.style.cssText = 'display: none; padding: 16px; background: var(--bg); max-height: 400px; overflow-y: auto;';
    toggle.textContent = '▶';
  }
  
  // ヘッダーのクリックで開閉
  const handleToggle = () => {
    const isExpanded = content.style.display !== 'none';
    const newExpanded = !isExpanded;
    content.style.display = newExpanded ? 'block' : 'none';
    toggle.textContent = newExpanded ? '▼' : '▶';
  };
  
  header.addEventListener('click', (e) => {
    // コピーボタンやナビゲーションボタンのクリックは無視
    if (e.target === copyBtn || e.target.closest('.eds-nav-button') || e.target.closest('.eds-copy-button')) {
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
  copyBtn.style.cssText = 'background: transparent; border: none; cursor: pointer; padding: 4px 8px; font-size: 14px; color: var(--muted); transition: color 0.2s; flex-shrink: 0;';
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const rawContent = asset.content || '(empty file)';
    
    // DevToolsのコンテキストではClipboard APIがブロックされるため、フォールバック方法を使用
    const copyToClipboard = (text) => {
      // テキストエリアを作成してコピー
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful;
      } catch (err) {
        document.body.removeChild(textarea);
        throw err;
      }
    };
    
    try {
      // まずClipboard APIを試す
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rawContent).then(() => {
          showCopySuccess(copyBtn);
        }).catch(() => {
          // Clipboard APIが失敗した場合はフォールバックを使用
          if (copyToClipboard(rawContent)) {
            showCopySuccess(copyBtn);
          } else {
            showCopyError(copyBtn);
          }
        });
      } else {
        // Clipboard APIが利用できない場合はフォールバックを使用
        if (copyToClipboard(rawContent)) {
          showCopySuccess(copyBtn);
        } else {
          showCopyError(copyBtn);
        }
      }
    } catch (err) {
      console.error('[EDS Inspector Panel] Failed to copy:', err);
      showCopyError(copyBtn);
    }
  });
  return copyBtn;
}

/**
 * コピー成功を表示
 */
function showCopySuccess(button) {
  const originalHTML = button.innerHTML;
  const originalColor = button.style.color;
  button.innerHTML = '✓';
  button.style.color = '#86efac';
  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.style.color = originalColor;
  }, 2000);
}

/**
 * コピーエラーを表示
 */
function showCopyError(button) {
  const originalHTML = button.innerHTML;
  const originalColor = button.style.color;
  button.innerHTML = '✗';
  button.style.color = '#f87171';
  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.style.color = originalColor;
  }, 2000);
}

